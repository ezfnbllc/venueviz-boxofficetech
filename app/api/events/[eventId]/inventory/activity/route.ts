/**
 * Inventory Activity Log API
 *
 * GET - Get activity logs for an event's inventory
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'

interface ActivityLog {
  id: string
  eventId: string
  action: string
  type: string
  seatIds?: string[]
  tierId?: string
  tierName?: string
  quantity?: number
  reason?: string
  performedBy: string
  performedByName: string
  performedAt: Date
  details?: Record<string, any>
}

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params
    const db = getAdminFirestore()

    // Get URL params
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam) : 50

    // Fetch inventory logs for this event
    const logsSnapshot = await db.collection('inventory_logs')
      .where('eventId', '==', eventId)
      .orderBy('performedAt', 'desc')
      .limit(limit)
      .get()

    const logs: ActivityLog[] = logsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        eventId: data.eventId,
        action: data.action,
        type: data.type,
        seatIds: data.seatIds,
        tierId: data.tierId,
        tierName: data.tierName,
        quantity: data.quantity,
        reason: data.reason,
        performedBy: data.performedBy,
        performedByName: data.performedByName,
        performedAt: data.performedAt?.toDate?.() || data.performedAt,
        details: data.details,
      }
    })

    // Also fetch recent order activity (sales) for reserved seats
    const recentOrdersSnapshot = await db.collection('orders')
      .where('eventId', '==', eventId)
      .where('status', 'in', ['completed', 'confirmed'])
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()

    const salesLogs: ActivityLog[] = []
    recentOrdersSnapshot.docs.forEach(doc => {
      const order = doc.data()
      const seatIds: string[] = []

      // Extract seat IDs from order
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          if (item.seatInfo) {
            const seatId = `${item.seatInfo.sectionId}-${item.seatInfo.row}-${item.seatInfo.seat || item.seatInfo.number}`
            seatIds.push(seatId)
          }
        })
      }
      if (order.tickets && Array.isArray(order.tickets)) {
        order.tickets.forEach((ticket: any) => {
          if (ticket.seatInfo) {
            const seatId = `${ticket.seatInfo.sectionId}-${ticket.seatInfo.row}-${ticket.seatInfo.seat || ticket.seatInfo.number}`
            seatIds.push(seatId)
          }
        })
      }

      // Only add if it's a reserved seating order (has seat info)
      if (seatIds.length > 0) {
        salesLogs.push({
          id: `sale-${doc.id}`,
          eventId,
          action: 'sale',
          type: 'reserved',
          seatIds,
          reason: `Order #${order.orderNumber || doc.id.slice(-6).toUpperCase()}`,
          performedBy: 'customer',
          performedByName: order.customerName || order.customerEmail || 'Customer',
          performedAt: order.createdAt?.toDate?.() || order.createdAt,
          details: {
            orderId: doc.id,
            orderNumber: order.orderNumber,
            total: order.total,
            customerEmail: order.customerEmail,
          },
        })
      } else if (order.items && order.items.length > 0) {
        // GA ticket sale
        const ticketCount = order.items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)
        salesLogs.push({
          id: `sale-${doc.id}`,
          eventId,
          action: 'sale',
          type: 'ga',
          quantity: ticketCount,
          reason: `Order #${order.orderNumber || doc.id.slice(-6).toUpperCase()}`,
          performedBy: 'customer',
          performedByName: order.customerName || order.customerEmail || 'Customer',
          performedAt: order.createdAt?.toDate?.() || order.createdAt,
          details: {
            orderId: doc.id,
            orderNumber: order.orderNumber,
            total: order.total,
            customerEmail: order.customerEmail,
            ticketTypes: order.items.map((item: any) => ({
              name: item.ticketType || item.name,
              quantity: item.quantity || 1,
            })),
          },
        })
      }
    })

    // Combine and sort all logs by date
    const allLogs = [...logs, ...salesLogs].sort((a, b) => {
      const dateA = new Date(a.performedAt).getTime()
      const dateB = new Date(b.performedAt).getTime()
      return dateB - dateA
    }).slice(0, limit)

    return NextResponse.json({
      eventId,
      logs: allLogs,
      total: allLogs.length,
    })

  } catch (error) {
    console.error('Error fetching activity logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    )
  }
}
