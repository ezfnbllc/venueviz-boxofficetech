/**
 * Event Inventory API
 *
 * GET /api/events/[eventId]/inventory - Get inventory summary for an event
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { EventInventory, TierInventory } from '@/lib/types/inventory'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params
    const db = getAdminFirestore()
    const now = new Date()

    // Get event data
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

    // Build tier capacity map
    const tierMap: Map<string, { name: string; capacity: number; price?: number }> = new Map()

    // From ticketTypes
    ticketTypes.forEach((tt: any) => {
      tierMap.set(tt.id, {
        name: tt.name || tt.id,
        capacity: tt.capacity || tt.available || tt.quantity || 0,
        price: tt.price,
      })
    })

    // From pricing tiers (may override or add new)
    pricingTiers.forEach((tier: any) => {
      const tierId = tier.id || `tier-${tier.name}`
      if (!tierMap.has(tierId)) {
        tierMap.set(tierId, {
          name: tier.name || tierId,
          capacity: tier.capacity || tier.quantity || tier.available || 0,
          price: tier.price,
        })
      }
    })

    // If no tiers defined, create a default "General Admission" tier
    if (tierMap.size === 0) {
      const defaultCapacity = eventData.totalCapacity || eventData.ticketsAvailable || 0
      tierMap.set('general', {
        name: 'General Admission',
        capacity: defaultCapacity,
        price: eventData.pricing?.basePrice || eventData.pricing?.minPrice,
      })
    }

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
            const ticketTypeId = item.ticketType || item.tierId || 'general'
            soldCounts[ticketTypeId] = (soldCounts[ticketTypeId] || 0) + (item.quantity || 1)
            totalSold += item.quantity || 1
          }
        })
      }
      // Also handle flat ticket count if items not available
      if (!order.items && order.ticketCount) {
        totalSold += order.ticketCount
        soldCounts['general'] = (soldCounts['general'] || 0) + order.ticketCount
      }
    })

    // Count temporary holds (from checkout process)
    const holdsSnapshot = await db.collection('ticket_holds')
      .where('eventId', '==', eventId)
      .get()

    const heldCounts: Record<string, number> = {}
    let totalHeld = 0

    holdsSnapshot.docs.forEach(doc => {
      const hold = doc.data()
      const heldUntil = (hold.heldUntil as any)?.toDate?.() || new Date(hold.heldUntil)

      // Only count non-expired holds
      if (heldUntil > now) {
        const ticketTypeId = hold.ticketTypeId || 'general'
        heldCounts[ticketTypeId] = (heldCounts[ticketTypeId] || 0) + (hold.quantity || 1)
        totalHeld += hold.quantity || 1
      }
    })

    // Count admin-blocked inventory
    const blocksSnapshot = await db.collection('inventory_blocks')
      .where('eventId', '==', eventId)
      .where('type', '==', 'ga')
      .get()

    const blockedCounts: Record<string, number> = {}
    let totalBlocked = 0

    blocksSnapshot.docs.forEach(doc => {
      const block = doc.data()
      const tierId = block.tierId || 'general'
      const qty = block.quantity || 1
      blockedCounts[tierId] = (blockedCounts[tierId] || 0) + qty
      totalBlocked += qty
    })

    // Build tier inventory response
    const tiers: TierInventory[] = []
    let totalCapacity = 0

    tierMap.forEach((tier, tierId) => {
      const capacity = tier.capacity
      const sold = soldCounts[tierId] || 0
      const blocked = blockedCounts[tierId] || 0
      const held = heldCounts[tierId] || 0
      const available = Math.max(0, capacity - sold - blocked - held)

      totalCapacity += capacity

      tiers.push({
        tierId,
        tierName: tier.name,
        capacity,
        sold,
        blocked,
        held,
        available,
        price: tier.price,
      })
    })

    // Use event's total capacity if specified (may differ from sum of tiers)
    const eventTotalCapacity = eventData.totalCapacity || eventData.ticketsAvailable || totalCapacity

    const inventory: EventInventory = {
      eventId,
      eventName: eventData.name || 'Unnamed Event',
      totalCapacity: eventTotalCapacity,
      totalSold,
      totalBlocked,
      totalHeld,
      totalAvailable: Math.max(0, eventTotalCapacity - totalSold - totalBlocked - totalHeld),
      tiers,
      lastUpdated: now,
    }

    return NextResponse.json(inventory)

  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}
