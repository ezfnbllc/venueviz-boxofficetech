import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/services/notificationService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId is required'
      }, { status: 400 })
    }

    // Get stats
    if (action === 'stats') {
      const stats = await NotificationService.getStats(userId)
      return NextResponse.json({
        success: true,
        stats
      })
    }

    // Get preferences
    if (action === 'preferences') {
      const preferences = await NotificationService.getPreferences(userId)
      return NextResponse.json({
        success: true,
        preferences
      })
    }

    // Get notifications
    const limit = parseInt(searchParams.get('limit') || '50')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const types = searchParams.get('types')?.split(',') as any

    const notifications = await NotificationService.getNotifications(userId, {
      limit,
      unreadOnly,
      types
    })

    return NextResponse.json({
      success: true,
      notifications,
      count: notifications.length,
      unreadCount: notifications.filter(n => !n.read).length
    })
  } catch (error: any) {
    console.error('[API] Notifications error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch notifications'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userId, notificationId, ...data } = body

    // Mark as read
    if (action === 'markRead' && notificationId) {
      const result = await NotificationService.markAsRead(notificationId)
      return NextResponse.json({
        success: result
      })
    }

    // Mark all as read
    if (action === 'markAllRead' && userId) {
      const result = await NotificationService.markAllAsRead(userId)
      return NextResponse.json({
        success: result
      })
    }

    // Dismiss
    if (action === 'dismiss' && notificationId) {
      const result = await NotificationService.dismiss(notificationId)
      return NextResponse.json({
        success: result
      })
    }

    // Update preferences
    if (action === 'updatePreferences' && userId) {
      const result = await NotificationService.updatePreferences(userId, data.preferences)
      return NextResponse.json({
        success: result
      })
    }

    // Create notification
    if (data.type && data.title && data.message && data.userId) {
      const notificationId = await NotificationService.create({
        type: data.type,
        priority: data.priority || 'medium',
        title: data.title,
        message: data.message,
        icon: data.icon,
        link: data.link,
        data: data.data,
        userId: data.userId,
        promoterId: data.promoterId,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
      })

      return NextResponse.json({
        success: !!notificationId,
        notificationId
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action or missing required fields'
    }, { status: 400 })
  } catch (error: any) {
    console.error('[API] Notification action error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process notification action'
    }, { status: 500 })
  }
}
