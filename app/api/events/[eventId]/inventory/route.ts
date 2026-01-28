/**
 * Event Inventory API
 *
 * GET /api/events/[eventId]/inventory - Get inventory summary
 * PATCH /api/events/[eventId]/inventory - Adjust tier capacity
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase-admin'
import {
  getEventInventorySummary,
  adjustTierCapacity,
} from '@/lib/services/inventoryService'
import type { CapacityChangeRequest } from '@/lib/types/inventory'

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
    console.error('[InventoryAPI] Auth error:', error)
    return null
  }
}

/**
 * GET - Get inventory summary for an event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params

    const summary = await getEventInventorySummary(eventId)

    if (!summary) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('[InventoryAPI] Error getting inventory:', error)
    return NextResponse.json(
      { error: 'Failed to get inventory' },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Adjust tier capacity
 * Body: { tierId, tierName, change, reason, notes? }
 */
export async function PATCH(
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
    const { tierId, tierName, change, reason, notes } = body

    if (!tierId || change === undefined || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: tierId, change, reason' },
        { status: 400 }
      )
    }

    const capacityRequest: CapacityChangeRequest = {
      tierId,
      tierName: tierName || tierId,
      change: Number(change),
      reason,
      notes,
    }

    const result = await adjustTierCapacity(
      eventId,
      capacityRequest,
      admin.userId,
      admin.userName
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[InventoryAPI] Error adjusting capacity:', error)
    return NextResponse.json(
      { error: 'Failed to adjust capacity' },
      { status: 500 }
    )
  }
}
