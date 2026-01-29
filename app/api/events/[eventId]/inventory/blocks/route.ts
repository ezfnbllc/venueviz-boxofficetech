/**
 * Inventory Blocks API
 *
 * POST /api/events/[eventId]/inventory/blocks - Block tickets
 * DELETE /api/events/[eventId]/inventory/blocks - Unblock tickets
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params
    const body = await request.json()
    const { tierId, quantity, reason } = body

    if (!tierId || !quantity || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: tierId, quantity, reason' },
        { status: 400 }
      )
    }

    if (quantity < 1) {
      return NextResponse.json(
        { error: 'Quantity must be at least 1' },
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

    const eventData = eventDoc.data()!

    // Find tier name
    let tierName = tierId
    const ticketTypes = eventData.ticketTypes || []
    const pricingTiers = eventData.pricing?.tiers || []

    const ticketType = ticketTypes.find((tt: any) => tt.id === tierId)
    if (ticketType) {
      tierName = ticketType.name || tierId
    } else {
      const pricingTier = pricingTiers.find((t: any) => t.id === tierId || `tier-${t.name}` === tierId)
      if (pricingTier) {
        tierName = pricingTier.name || tierId
      }
    }

    // Create the inventory block
    const blockData = {
      eventId,
      type: 'ga',
      tierId,
      tierName,
      quantity,
      reason,
      blockedBy: 'admin', // TODO: Get from auth
      blockedByName: 'Admin User',
      blockedAt: new Date(),
      notes: '',
    }

    const blockRef = await db.collection('inventory_blocks').add(blockData)

    // Log the action
    await db.collection('inventory_logs').add({
      eventId,
      action: 'block',
      type: 'ga',
      tierId,
      tierName,
      quantityChange: quantity,
      reason,
      performedBy: 'admin',
      performedByName: 'Admin User',
      performedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      blockId: blockRef.id,
      message: `Successfully blocked ${quantity} tickets`,
    })

  } catch (error) {
    console.error('Error blocking tickets:', error)
    return NextResponse.json(
      { error: 'Failed to block tickets' },
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
    const { searchParams } = new URL(request.url)
    const blockId = searchParams.get('blockId')

    if (!blockId) {
      return NextResponse.json(
        { error: 'Missing blockId parameter' },
        { status: 400 }
      )
    }

    const db = getAdminFirestore()

    // Get the block to log the unblock
    const blockDoc = await db.collection('inventory_blocks').doc(blockId).get()
    if (!blockDoc.exists) {
      return NextResponse.json(
        { error: 'Block not found' },
        { status: 404 }
      )
    }

    const blockData = blockDoc.data()!

    // Verify it belongs to this event
    if (blockData.eventId !== eventId) {
      return NextResponse.json(
        { error: 'Block does not belong to this event' },
        { status: 403 }
      )
    }

    // Delete the block
    await db.collection('inventory_blocks').doc(blockId).delete()

    // Log the action
    await db.collection('inventory_logs').add({
      eventId,
      action: 'unblock',
      type: 'ga',
      tierId: blockData.tierId,
      tierName: blockData.tierName,
      quantityChange: -(blockData.quantity || 0),
      reason: 'Unblocked by admin',
      performedBy: 'admin',
      performedByName: 'Admin User',
      performedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: `Successfully unblocked ${blockData.quantity} tickets`,
    })

  } catch (error) {
    console.error('Error unblocking tickets:', error)
    return NextResponse.json(
      { error: 'Failed to unblock tickets' },
      { status: 500 }
    )
  }
}
