/**
 * Event Availability API for General Admission Events
 *
 * GET /api/events/[eventId]/availability - Get ticket availability for an event
 * POST /api/events/[eventId]/availability - Reserve tickets temporarily
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'

const HOLD_DURATION_MS = 5 * 60 * 1000 // 5 minutes

interface TicketAvailability {
  ticketTypeId: string
  totalCapacity: number
  sold: number
  held: number
  available: number
}

/**
 * GET - Get ticket availability for an event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params
    const db = getAdminFirestore()
    const now = new Date()

    // Get event data for capacity info
    const eventDoc = await db.collection('events').doc(eventId).get()
    if (!eventDoc.exists) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const eventData = eventDoc.data()!
    const ticketTypes = eventData.ticketTypes || []
    const pricingTiers = eventData.pricing?.tiers || []

    // Build ticket capacity map
    const capacityMap: Record<string, number> = {}

    // From ticketTypes
    ticketTypes.forEach((tt: any) => {
      capacityMap[tt.id] = tt.capacity || tt.available || tt.quantity || 999999
    })

    // From pricing tiers
    pricingTiers.forEach((tier: any) => {
      const tierId = tier.id || `tier-${tier.name}`
      if (!capacityMap[tierId]) {
        capacityMap[tierId] = tier.capacity || tier.quantity || tier.available || 999999
      }
    })

    // Also track overall event capacity
    const totalEventCapacity = eventData.totalCapacity || eventData.ticketsAvailable || 999999

    // Count sold tickets from completed orders
    const ordersSnapshot = await db.collection('orders')
      .where('eventId', '==', eventId)
      .where('status', 'in', ['completed', 'confirmed'])
      .get()

    const soldCounts: Record<string, number> = {}
    let totalSold = 0

    ordersSnapshot.docs.forEach(doc => {
      const order = doc.data()
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          // Only count non-reserved seating items (GA tickets)
          if (!item.seatInfo) {
            const ticketTypeId = item.ticketType || 'general'
            soldCounts[ticketTypeId] = (soldCounts[ticketTypeId] || 0) + (item.quantity || 1)
            totalSold += item.quantity || 1
          }
        })
      }
    })

    // Count held tickets (from ticket_holds collection)
    const holdsSnapshot = await db.collection('ticket_holds')
      .where('eventId', '==', eventId)
      .where('heldUntil', '>', now)
      .get()

    const heldCounts: Record<string, number> = {}
    let totalHeld = 0

    holdsSnapshot.docs.forEach(doc => {
      const hold = doc.data()
      const ticketTypeId = hold.ticketTypeId || 'general'
      heldCounts[ticketTypeId] = (heldCounts[ticketTypeId] || 0) + (hold.quantity || 1)
      totalHeld += hold.quantity || 1
    })

    // Clean up expired holds in the background
    cleanupExpiredHolds(db, eventId).catch(console.error)

    // Build availability response
    const availability: TicketAvailability[] = Object.keys(capacityMap).map(ticketTypeId => ({
      ticketTypeId,
      totalCapacity: capacityMap[ticketTypeId],
      sold: soldCounts[ticketTypeId] || 0,
      held: heldCounts[ticketTypeId] || 0,
      available: Math.max(0, capacityMap[ticketTypeId] - (soldCounts[ticketTypeId] || 0) - (heldCounts[ticketTypeId] || 0)),
    }))

    return NextResponse.json({
      eventId,
      totalCapacity: totalEventCapacity,
      totalSold,
      totalHeld,
      totalAvailable: Math.max(0, totalEventCapacity - totalSold - totalHeld),
      ticketTypes: availability,
      holdDurationMs: HOLD_DURATION_MS,
    })

  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    )
  }
}

/**
 * POST - Hold GA tickets for checkout
 * Uses atomic transactions to prevent overselling
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params
    const body = await request.json()
    const { tickets, sessionId } = body

    // tickets: [{ ticketTypeId: string, quantity: number }]

    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return NextResponse.json(
        { error: 'No tickets specified' },
        { status: 400 }
      )
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const db = getAdminFirestore()
    const now = new Date()
    const heldUntil = new Date(now.getTime() + HOLD_DURATION_MS)

    // Get event capacity info
    const eventDoc = await db.collection('events').doc(eventId).get()
    if (!eventDoc.exists) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const eventData = eventDoc.data()!
    const ticketTypes = eventData.ticketTypes || []
    const pricingTiers = eventData.pricing?.tiers || []
    const totalEventCapacity = eventData.totalCapacity || eventData.ticketsAvailable || 999999

    // Build capacity map
    const capacityMap: Record<string, number> = {}
    ticketTypes.forEach((tt: any) => {
      capacityMap[tt.id] = tt.capacity || tt.available || tt.quantity || 999999
    })
    pricingTiers.forEach((tier: any) => {
      const tierId = tier.id || `tier-${tier.name}`
      if (!capacityMap[tierId]) {
        capacityMap[tierId] = tier.capacity || tier.quantity || tier.available || 999999
      }
    })

    // Use transaction to check availability and create holds
    const result = await db.runTransaction(async (transaction) => {
      // Get current sold counts
      const ordersQuery = await db.collection('orders')
        .where('eventId', '==', eventId)
        .where('status', 'in', ['completed', 'confirmed'])
        .get()

      const soldCounts: Record<string, number> = {}
      let totalSold = 0
      ordersQuery.docs.forEach(doc => {
        const order = doc.data()
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            if (!item.seatInfo) {
              const ticketTypeId = item.ticketType || 'general'
              soldCounts[ticketTypeId] = (soldCounts[ticketTypeId] || 0) + (item.quantity || 1)
              totalSold += item.quantity || 1
            }
          })
        }
      })

      // Get current held counts (excluding this session's holds)
      const holdsQuery = await db.collection('ticket_holds')
        .where('eventId', '==', eventId)
        .where('heldUntil', '>', now)
        .get()

      const heldCounts: Record<string, number> = {}
      let totalHeld = 0
      holdsQuery.docs.forEach(doc => {
        const hold = doc.data()
        if (hold.sessionId !== sessionId) {
          const ticketTypeId = hold.ticketTypeId || 'general'
          heldCounts[ticketTypeId] = (heldCounts[ticketTypeId] || 0) + (hold.quantity || 1)
          totalHeld += hold.quantity || 1
        }
      })

      // Check availability for each ticket type
      const conflicts: { ticketTypeId: string; requested: number; available: number }[] = []
      let requestedTotal = 0

      for (const ticket of tickets) {
        const { ticketTypeId, quantity } = ticket
        requestedTotal += quantity

        const capacity = capacityMap[ticketTypeId] || totalEventCapacity
        const sold = soldCounts[ticketTypeId] || 0
        const held = heldCounts[ticketTypeId] || 0
        const available = capacity - sold - held

        if (quantity > available) {
          conflicts.push({ ticketTypeId, requested: quantity, available })
        }
      }

      // Also check total event capacity
      const totalAvailable = totalEventCapacity - totalSold - totalHeld
      if (requestedTotal > totalAvailable) {
        conflicts.push({
          ticketTypeId: '_total',
          requested: requestedTotal,
          available: totalAvailable,
        })
      }

      if (conflicts.length > 0) {
        return { success: false, conflicts }
      }

      // Delete existing holds for this session
      const existingHolds = holdsQuery.docs.filter(doc => doc.data().sessionId === sessionId)
      for (const hold of existingHolds) {
        transaction.delete(hold.ref)
      }

      // Create new holds
      const holdRefs: string[] = []
      for (const ticket of tickets) {
        const holdId = `${eventId}_${sessionId}_${ticket.ticketTypeId}`
        const holdRef = db.collection('ticket_holds').doc(holdId)
        transaction.set(holdRef, {
          eventId,
          sessionId,
          ticketTypeId: ticket.ticketTypeId,
          quantity: ticket.quantity,
          heldUntil,
          createdAt: now,
        })
        holdRefs.push(holdId)
      }

      return {
        success: true,
        holdIds: holdRefs,
        heldUntil,
      }
    })

    if (!result.success) {
      return NextResponse.json({
        error: 'Not enough tickets available',
        conflicts: result.conflicts,
      }, { status: 409 })
    }

    return NextResponse.json({
      success: true,
      holdIds: result.holdIds,
      heldUntil: result.heldUntil,
      holdDurationMs: HOLD_DURATION_MS,
    })

  } catch (error) {
    console.error('Error holding tickets:', error)
    return NextResponse.json(
      { error: 'Failed to hold tickets' },
      { status: 500 }
    )
  }
}

/**
 * Clean up expired ticket holds
 */
async function cleanupExpiredHolds(db: FirebaseFirestore.Firestore, eventId: string) {
  const now = new Date()
  const expiredHolds = await db.collection('ticket_holds')
    .where('eventId', '==', eventId)
    .where('heldUntil', '<=', now)
    .get()

  if (expiredHolds.empty) return

  const batch = db.batch()
  expiredHolds.docs.forEach(doc => batch.delete(doc.ref))
  await batch.commit()

  console.log(`[TicketHolds] Cleaned up ${expiredHolds.size} expired holds for event ${eventId}`)
}
