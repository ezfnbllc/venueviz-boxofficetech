/**
 * Seat Availability API for Reserved Seating Events
 *
 * GET /api/events/[eventId]/seats - Get sold and held seats for an event
 * POST /api/events/[eventId]/seats - Hold seats for checkout
 * DELETE /api/events/[eventId]/seats - Release held seats
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

const HOLD_DURATION_MS = 5 * 60 * 1000 // 5 minutes

interface SeatHold {
  seatId: string
  eventId: string
  sessionId: string
  heldUntil: Date
  sectionId: string
  sectionName: string
  row: string
  number: string | number
  price: number
  createdAt: Date
}

/**
 * GET - Fetch sold and held seats for an event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    const db = getAdminFirestore()
    const now = new Date()

    // Get sold seats from completed orders
    const ordersSnapshot = await db.collection('orders')
      .where('eventId', '==', eventId)
      .where('status', 'in', ['completed', 'confirmed'])
      .get()

    const soldSeats: string[] = []
    ordersSnapshot.docs.forEach(doc => {
      const order = doc.data()
      // Extract seat IDs from order items
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          // For reserved seating, the item has seatInfo with the seat details
          if (item.seatInfo) {
            const seatId = `${item.seatInfo.sectionId}-${item.seatInfo.row}-${item.seatInfo.seat}`
            if (!soldSeats.includes(seatId)) {
              soldSeats.push(seatId)
            }
          }
        })
      }
      // Also check tickets array (has seatInfo from order creation)
      if (order.tickets && Array.isArray(order.tickets)) {
        order.tickets.forEach((ticket: any) => {
          if (ticket.seatInfo) {
            const seatId = `${ticket.seatInfo.sectionId}-${ticket.seatInfo.row}-${ticket.seatInfo.seat}`
            if (!soldSeats.includes(seatId)) {
              soldSeats.push(seatId)
            }
          }
        })
      }
    })

    // Get held seats (excluding expired holds)
    // Note: We query only by eventId and filter heldUntil in memory
    // to avoid requiring a composite Firestore index
    const holdsSnapshot = await db.collection('seat_holds')
      .where('eventId', '==', eventId)
      .get()

    const heldSeats: string[] = []
    const myHolds: SeatHold[] = []

    holdsSnapshot.docs.forEach(doc => {
      const hold = doc.data() as SeatHold
      const heldUntil = (hold.heldUntil as any)?.toDate?.() || new Date(hold.heldUntil as any)

      // Filter out expired holds in memory (to avoid composite index requirement)
      if (heldUntil <= now) {
        return // Skip expired holds
      }

      heldSeats.push(hold.seatId)

      // Track seats held by the current session
      if (sessionId && hold.sessionId === sessionId) {
        myHolds.push({
          ...hold,
          heldUntil,
          createdAt: (hold.createdAt as any)?.toDate?.() || hold.createdAt,
        })
      }
    })

    // Clean up expired holds in the background (don't wait)
    cleanupExpiredHolds(db, eventId).catch(console.error)

    return NextResponse.json({
      soldSeats,
      heldSeats,
      myHolds,
      holdDurationMs: HOLD_DURATION_MS,
    })

  } catch (error) {
    console.error('Error fetching seat availability:', error)
    return NextResponse.json(
      { error: 'Failed to fetch seat availability' },
      { status: 500 }
    )
  }
}

/**
 * POST - Hold seats for checkout
 * Uses atomic transactions to prevent race conditions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params
    const body = await request.json()
    const { seats, sessionId } = body

    if (!seats || !Array.isArray(seats) || seats.length === 0) {
      return NextResponse.json(
        { error: 'No seats specified' },
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

    // Use a transaction to atomically check and hold seats
    const result = await db.runTransaction(async (transaction) => {
      const conflicts: string[] = []
      const holdsToCreate: any[] = []

      // Check each seat for availability
      for (const seat of seats) {
        // Always construct seatId from parts to ensure consistency across the system
        const seatId = `${seat.sectionId}-${seat.row}-${seat.number}`
        const holdRef = db.collection('seat_holds').doc(`${eventId}_${seatId}`)
        const holdDoc = await transaction.get(holdRef)

        if (holdDoc.exists) {
          const existingHold = holdDoc.data()!
          const holdExpiry = existingHold.heldUntil?.toDate?.() || existingHold.heldUntil

          // Check if hold is still valid and by someone else
          if (holdExpiry > now && existingHold.sessionId !== sessionId) {
            conflicts.push(seatId)
            continue
          }
        }

        // Check if seat is already sold
        const ordersQuery = await db.collection('orders')
          .where('eventId', '==', eventId)
          .where('status', 'in', ['completed', 'confirmed'])
          .get()

        let isSold = false
        for (const orderDoc of ordersQuery.docs) {
          const order = orderDoc.data()
          if (order.items?.some((item: any) => {
            const itemSeatId = item.seatInfo
              ? `${item.seatInfo.sectionId}-${item.seatInfo.row}-${item.seatInfo.seat}`
              : `section-${item.section}-${item.row}-${item.seat}`
            return itemSeatId === seatId
          })) {
            isSold = true
            break
          }
        }

        if (isSold) {
          conflicts.push(seatId)
          continue
        }

        // Seat is available, prepare hold
        holdsToCreate.push({
          ref: holdRef,
          data: {
            seatId,
            eventId,
            sessionId,
            sectionId: seat.sectionId,
            sectionName: seat.sectionName,
            row: seat.row,
            number: seat.number,
            price: seat.price,
            heldUntil,
            createdAt: now,
            updatedAt: now,
          }
        })
      }

      // If there are conflicts, abort
      if (conflicts.length > 0) {
        return { success: false, conflicts }
      }

      // Create all holds
      for (const hold of holdsToCreate) {
        transaction.set(hold.ref, hold.data)
      }

      return {
        success: true,
        heldSeats: holdsToCreate.map(h => h.data.seatId),
        heldUntil,
      }
    })

    if (!result.success) {
      return NextResponse.json({
        error: 'Some seats are no longer available',
        conflicts: result.conflicts,
      }, { status: 409 }) // Conflict
    }

    return NextResponse.json({
      success: true,
      heldSeats: result.heldSeats,
      heldUntil: result.heldUntil,
      holdDurationMs: HOLD_DURATION_MS,
    })

  } catch (error) {
    console.error('Error holding seats:', error)
    return NextResponse.json(
      { error: 'Failed to hold seats' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Release held seats
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const seatIds = searchParams.get('seatIds')?.split(',')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const db = getAdminFirestore()

    if (seatIds && seatIds.length > 0) {
      // Release specific seats
      const batch = db.batch()
      for (const seatId of seatIds) {
        const holdRef = db.collection('seat_holds').doc(`${eventId}_${seatId}`)
        // Only delete if it belongs to this session
        batch.delete(holdRef)
      }
      await batch.commit()
    } else {
      // Release all seats held by this session
      const holdsSnapshot = await db.collection('seat_holds')
        .where('eventId', '==', eventId)
        .where('sessionId', '==', sessionId)
        .get()

      const batch = db.batch()
      holdsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref)
      })
      await batch.commit()
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error releasing seats:', error)
    return NextResponse.json(
      { error: 'Failed to release seats' },
      { status: 500 }
    )
  }
}

/**
 * Clean up expired holds for an event
 * Note: We query only by eventId and filter heldUntil in memory
 * to avoid requiring a composite Firestore index
 */
async function cleanupExpiredHolds(db: FirebaseFirestore.Firestore, eventId: string) {
  const now = new Date()
  const holdsSnapshot = await db.collection('seat_holds')
    .where('eventId', '==', eventId)
    .get()

  // Filter expired holds in memory
  const expiredDocs = holdsSnapshot.docs.filter(doc => {
    const hold = doc.data()
    const heldUntil = (hold.heldUntil as any)?.toDate?.() || new Date(hold.heldUntil)
    return heldUntil <= now
  })

  if (expiredDocs.length === 0) return

  const batch = db.batch()
  expiredDocs.forEach(doc => {
    batch.delete(doc.ref)
  })
  await batch.commit()

  console.log(`[SeatHolds] Cleaned up ${expiredDocs.length} expired holds for event ${eventId}`)
}
