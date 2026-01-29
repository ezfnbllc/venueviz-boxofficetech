/**
 * Reserved Seating Inventory API
 *
 * GET - Get sold and blocked seats for an event
 * POST - Block seats
 * DELETE - Unblock seats
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params
    const db = getAdminFirestore()

    // Get sold seats from orders
    const ordersSnapshot = await db.collection('orders')
      .where('eventId', '==', eventId)
      .where('status', 'in', ['completed', 'confirmed', 'pending'])
      .get()

    const soldSeats: string[] = []
    ordersSnapshot.docs.forEach(doc => {
      const order = doc.data()
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          if (item.seatInfo) {
            // Seat info format: sectionId-row-seat (note: orders store as 'seat' not 'number')
            const seatId = `${item.seatInfo.sectionId}-${item.seatInfo.row}-${item.seatInfo.seat || item.seatInfo.number}`
            if (!soldSeats.includes(seatId)) {
              soldSeats.push(seatId)
            }
          }
        })
      }
      // Also check tickets array (another format used in some orders)
      if (order.tickets && Array.isArray(order.tickets)) {
        order.tickets.forEach((ticket: any) => {
          if (ticket.seatInfo) {
            const seatId = `${ticket.seatInfo.sectionId}-${ticket.seatInfo.row}-${ticket.seatInfo.seat || ticket.seatInfo.number}`
            if (!soldSeats.includes(seatId)) {
              soldSeats.push(seatId)
            }
          }
        })
      }
      // Also check seats array
      if (order.seats && Array.isArray(order.seats)) {
        order.seats.forEach((seat: any) => {
          const seatId = seat.id || `${seat.sectionId}-${seat.row}-${seat.seat || seat.number}`
          if (!soldSeats.includes(seatId)) {
            soldSeats.push(seatId)
          }
        })
      }
    })

    // Get held seats (user temporary holds during checkout)
    const now = new Date()
    const holdsSnapshot = await db.collection('seat_holds')
      .where('eventId', '==', eventId)
      .get()

    const heldSeats: string[] = []
    const holdDetails: any[] = []
    holdsSnapshot.docs.forEach(doc => {
      const hold = doc.data()
      const heldUntil = hold.heldUntil?.toDate?.() || new Date(hold.heldUntil)

      // Only include non-expired holds
      if (heldUntil > now) {
        heldSeats.push(hold.seatId)
        holdDetails.push({
          id: doc.id,
          seatId: hold.seatId,
          sessionId: hold.sessionId,
          heldUntil,
          createdAt: hold.createdAt?.toDate?.() || hold.createdAt,
        })
      }
    })

    // Get blocked seats from inventory_blocks
    const blocksSnapshot = await db.collection('inventory_blocks')
      .where('eventId', '==', eventId)
      .where('type', '==', 'reserved')
      .get()

    const blockedSeats: string[] = []
    const blockDetails: any[] = []

    blocksSnapshot.docs.forEach(doc => {
      const block = doc.data()
      if (block.seatId) {
        blockedSeats.push(block.seatId)
        blockDetails.push({
          id: doc.id,
          seatId: block.seatId,
          reason: block.reason,
          blockedBy: block.blockedByName,
          blockedAt: block.blockedAt?.toDate?.() || block.blockedAt,
        })
      }
    })

    return NextResponse.json({
      eventId,
      soldSeats,
      blockedSeats,
      blockDetails,
      heldSeats,
      holdDetails,
    })

  } catch (error) {
    console.error('Error fetching seat inventory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch seat inventory' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params
    const body = await request.json()
    const { seatIds, reason } = body

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing seatIds array' },
        { status: 400 }
      )
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Missing reason' },
        { status: 400 }
      )
    }

    const db = getAdminFirestore()

    // Verify event exists
    const eventDoc = await db.collection('events').doc(eventId).get()
    if (!eventDoc.exists) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const now = new Date()

    // Check for conflicts - seats that are held by users or already sold
    const conflicts: { seatId: string; reason: string }[] = []

    // Check for user holds on these seats
    const holdsSnapshot = await db.collection('seat_holds')
      .where('eventId', '==', eventId)
      .get()

    const activeHolds = new Map<string, any>()
    holdsSnapshot.docs.forEach(doc => {
      const hold = doc.data()
      const heldUntil = hold.heldUntil?.toDate?.() || new Date(hold.heldUntil)
      if (heldUntil > now) {
        activeHolds.set(hold.seatId, hold)
      }
    })

    // Check for sold seats
    const ordersSnapshot = await db.collection('orders')
      .where('eventId', '==', eventId)
      .where('status', 'in', ['completed', 'confirmed', 'pending'])
      .get()

    const soldSeats = new Set<string>()
    ordersSnapshot.docs.forEach(doc => {
      const order = doc.data()
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          if (item.seatInfo) {
            const seatId = `${item.seatInfo.sectionId}-${item.seatInfo.row}-${item.seatInfo.seat || item.seatInfo.number}`
            soldSeats.add(seatId)
          }
        })
      }
      if (order.tickets && Array.isArray(order.tickets)) {
        order.tickets.forEach((ticket: any) => {
          if (ticket.seatInfo) {
            const seatId = `${ticket.seatInfo.sectionId}-${ticket.seatInfo.row}-${ticket.seatInfo.seat || ticket.seatInfo.number}`
            soldSeats.add(seatId)
          }
        })
      }
    })

    // Check for already blocked seats
    const existingBlocksSnapshot = await db.collection('inventory_blocks')
      .where('eventId', '==', eventId)
      .where('type', '==', 'reserved')
      .get()

    const alreadyBlocked = new Set<string>()
    existingBlocksSnapshot.docs.forEach(doc => {
      const block = doc.data()
      if (block.seatId) {
        alreadyBlocked.add(block.seatId)
      }
    })

    // Filter out seats with conflicts
    const seatsToBlock: string[] = []
    for (const seatId of seatIds) {
      if (soldSeats.has(seatId)) {
        conflicts.push({ seatId, reason: 'Seat is already sold' })
      } else if (activeHolds.has(seatId)) {
        conflicts.push({ seatId, reason: 'Seat is currently held by a customer' })
      } else if (alreadyBlocked.has(seatId)) {
        conflicts.push({ seatId, reason: 'Seat is already blocked' })
      } else {
        seatsToBlock.push(seatId)
      }
    }

    // If all seats have conflicts, return error
    if (seatsToBlock.length === 0 && conflicts.length > 0) {
      return NextResponse.json({
        error: 'Cannot block seats due to conflicts',
        conflicts,
      }, { status: 409 })
    }

    const batch = db.batch()
    const blockedAt = now

    for (const seatId of seatsToBlock) {
      // Parse seatId format: sectionId-row-number
      const parts = seatId.split('-')
      const sectionId = parts.slice(0, -2).join('-') // Handle section IDs with dashes
      const row = parts[parts.length - 2]
      const seatNumber = parts[parts.length - 1]

      const blockRef = db.collection('inventory_blocks').doc()
      batch.set(blockRef, {
        eventId,
        type: 'reserved',
        seatId,
        sectionId,
        row,
        seatNumber,
        reason,
        blockedBy: 'admin',
        blockedByName: 'Admin User',
        blockedAt,
      })
    }

    // Log the action (only if we actually blocked some seats)
    if (seatsToBlock.length > 0) {
      const logRef = db.collection('inventory_logs').doc()
      batch.set(logRef, {
        eventId,
        action: 'bulk_block',
        type: 'reserved',
        seatIds: seatsToBlock,
        reason,
        performedBy: 'admin',
        performedByName: 'Admin User',
        performedAt: blockedAt,
      })
    }

    await batch.commit()

    return NextResponse.json({
      success: true,
      blockedCount: seatsToBlock.length,
      blockedSeats: seatsToBlock,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      message: conflicts.length > 0
        ? `Blocked ${seatsToBlock.length} seat(s). ${conflicts.length} seat(s) skipped due to conflicts.`
        : `Successfully blocked ${seatsToBlock.length} seat(s)`,
    })

  } catch (error) {
    console.error('Error blocking seats:', error)
    return NextResponse.json(
      { error: 'Failed to block seats' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params
    const body = await request.json()
    const { seatIds } = body

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing seatIds array' },
        { status: 400 }
      )
    }

    const db = getAdminFirestore()

    // Find and delete blocks for these seats
    const blocksSnapshot = await db.collection('inventory_blocks')
      .where('eventId', '==', eventId)
      .where('type', '==', 'reserved')
      .where('seatId', 'in', seatIds)
      .get()

    if (blocksSnapshot.empty) {
      return NextResponse.json(
        { error: 'No blocked seats found to unblock' },
        { status: 404 }
      )
    }

    const batch = db.batch()
    const unblockedAt = new Date()

    blocksSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    // Log the action
    const logRef = db.collection('inventory_logs').doc()
    batch.set(logRef, {
      eventId,
      action: 'bulk_unblock',
      type: 'reserved',
      seatIds,
      reason: 'Unblocked by admin',
      performedBy: 'admin',
      performedByName: 'Admin User',
      performedAt: unblockedAt,
    })

    await batch.commit()

    return NextResponse.json({
      success: true,
      unblockedCount: blocksSnapshot.size,
      message: `Successfully unblocked ${blocksSnapshot.size} seat(s)`,
    })

  } catch (error) {
    console.error('Error unblocking seats:', error)
    return NextResponse.json(
      { error: 'Failed to unblock seats' },
      { status: 500 }
    )
  }
}
