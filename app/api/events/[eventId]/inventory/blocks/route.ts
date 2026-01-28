/**
 * Event Inventory Blocks API
 *
 * GET /api/events/[eventId]/inventory/blocks - Get all active blocks
 * POST /api/events/[eventId]/inventory/blocks - Create a block (GA or reserved)
 * DELETE /api/events/[eventId]/inventory/blocks - Unblock tickets/seats
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase-admin'
import {
  getInventoryBlocks,
  blockGATickets,
  unblockGATickets,
  blockSeats,
  unblockSeats,
} from '@/lib/services/inventoryService'
import type { BlockGARequest, BlockSeatsRequest } from '@/lib/types/inventory'

/**
 * Verify the request has a valid admin user
 */
async function verifyAdmin(request: NextRequest): Promise<{ userId: string; userName: string } | null> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.split('Bearer ')[1]
    const auth = getAdminAuth()
    const decodedToken = await auth.verifyIdToken(token)

    // Get user details
    const db = getAdminFirestore()
    const userDoc = await db.collection('users').doc(decodedToken.uid).get()
    const userData = userDoc.data()

    // Check if user is admin or has appropriate role
    // Accept: master, admin, superadmin, promoter roles, or isMaster flag
    const validRoles = ['master', 'admin', 'superadmin', 'promoter']
    const hasValidRole = userData && (validRoles.includes(userData.role) || userData.isMaster === true)

    if (!hasValidRole) {
      return null
    }

    return {
      userId: decodedToken.uid,
      userName: userData.name || userData.displayName || userData.email || 'Unknown',
    }
  } catch (error) {
    console.error('[InventoryBlocksAPI] Auth error:', error)
    return null
  }
}

/**
 * GET - Get all active blocks for an event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params
    const blocks = await getInventoryBlocks(eventId)
    return NextResponse.json({ blocks })
  } catch (error) {
    console.error('[InventoryBlocksAPI] Error getting blocks:', error)
    return NextResponse.json(
      { error: 'Failed to get blocks' },
      { status: 500 }
    )
  }
}

/**
 * POST - Create a block
 * For GA: { type: 'ga', tierId, tierName, quantity, reason, notes? }
 * For Reserved: { type: 'reserved', seats: [...], reason, notes? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params

    // Verify admin
    const admin = await verifyAdmin(request)
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type, reason, notes } = body

    if (!type || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: type, reason' },
        { status: 400 }
      )
    }

    let result

    if (type === 'ga') {
      const { tierId, tierName, quantity } = body

      if (!tierId || !quantity || quantity <= 0) {
        return NextResponse.json(
          { error: 'Missing required fields for GA block: tierId, quantity' },
          { status: 400 }
        )
      }

      const gaRequest: BlockGARequest = {
        tierId,
        tierName: tierName || tierId,
        quantity: Number(quantity),
        reason,
        notes,
      }

      result = await blockGATickets(eventId, gaRequest, admin.userId, admin.userName)
    } else if (type === 'reserved') {
      const { seats } = body

      if (!seats || !Array.isArray(seats) || seats.length === 0) {
        return NextResponse.json(
          { error: 'Missing required field for reserved block: seats array' },
          { status: 400 }
        )
      }

      const seatsRequest: BlockSeatsRequest = {
        seats,
        reason,
        notes,
      }

      result = await blockSeats(eventId, seatsRequest, admin.userId, admin.userName)
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "ga" or "reserved"' },
        { status: 400 }
      )
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[InventoryBlocksAPI] Error creating block:', error)
    return NextResponse.json(
      { error: 'Failed to create block' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Unblock tickets/seats
 * Body: { type: 'ga' | 'reserved', blockId?: string, blockIds?: string[] }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params

    // Verify admin
    const admin = await verifyAdmin(request)
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type, blockId, blockIds } = body

    if (!type) {
      return NextResponse.json(
        { error: 'Missing required field: type' },
        { status: 400 }
      )
    }

    const idsToUnblock = blockIds || (blockId ? [blockId] : [])

    if (idsToUnblock.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: blockId or blockIds' },
        { status: 400 }
      )
    }

    let result

    if (type === 'ga') {
      // For GA, we unblock one at a time since each block is a separate quantity
      const results = await Promise.all(
        idsToUnblock.map((id: string) =>
          unblockGATickets(eventId, id, admin.userId, admin.userName)
        )
      )

      const successCount = results.filter(r => r.success).length
      const totalAffected = results.reduce((sum, r) => sum + (r.affectedCount || 0), 0)

      result = {
        success: successCount > 0,
        message: `Unblocked ${totalAffected} tickets from ${successCount} block(s)`,
        affectedCount: totalAffected,
      }
    } else if (type === 'reserved') {
      result = await unblockSeats(eventId, idsToUnblock, admin.userId, admin.userName)
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "ga" or "reserved"' },
        { status: 400 }
      )
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[InventoryBlocksAPI] Error unblocking:', error)
    return NextResponse.json(
      { error: 'Failed to unblock' },
      { status: 500 }
    )
  }
}
