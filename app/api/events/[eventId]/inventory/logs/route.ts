/**
 * Event Inventory Logs API
 *
 * GET /api/events/[eventId]/inventory/logs - Get inventory change logs
 */

import { NextRequest, NextResponse } from 'next/server'
import { getInventoryLogs } from '@/lib/services/inventoryService'
import type { InventoryLogFilter, InventoryLogAction, InventoryLogType } from '@/lib/types/inventory'

/**
 * GET - Get inventory logs for an event
 * Query params:
 * - action: filter by action type
 * - type: filter by inventory type (ga/reserved)
 * - startDate: filter from date (ISO string)
 * - endDate: filter to date (ISO string)
 * - performedBy: filter by user ID
 * - limit: max number of logs (default 50)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params
    const searchParams = request.nextUrl.searchParams

    // Build filter from query params
    const filter: InventoryLogFilter = {}

    const action = searchParams.get('action')
    if (action) {
      filter.action = action as InventoryLogAction
    }

    const type = searchParams.get('type')
    if (type) {
      filter.type = type as InventoryLogType
    }

    const startDate = searchParams.get('startDate')
    if (startDate) {
      filter.startDate = new Date(startDate)
    }

    const endDate = searchParams.get('endDate')
    if (endDate) {
      filter.endDate = new Date(endDate)
    }

    const performedBy = searchParams.get('performedBy')
    if (performedBy) {
      filter.performedBy = performedBy
    }

    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const logs = await getInventoryLogs(eventId, filter, limit)

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('[InventoryLogsAPI] Error getting logs:', error)
    return NextResponse.json(
      { error: 'Failed to get logs' },
      { status: 500 }
    )
  }
}
