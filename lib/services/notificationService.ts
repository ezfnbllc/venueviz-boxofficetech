import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const isBrowser = typeof window !== 'undefined'

export type NotificationType =
  | 'order' | 'event' | 'payment' | 'alert' | 'system'
  | 'promotion' | 'customer' | 'commission' | 'reminder'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Notification {
  id?: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  icon?: string
  link?: string
  data?: Record<string, any>
  userId?: string
  promoterId?: string
  read: boolean
  dismissed: boolean
  expiresAt?: Date
  createdAt: Date
}

export interface NotificationPreferences {
  userId: string
  email: {
    enabled: boolean
    types: NotificationType[]
    frequency: 'instant' | 'hourly' | 'daily' | 'weekly'
  }
  push: {
    enabled: boolean
    types: NotificationType[]
  }
  inApp: {
    enabled: boolean
    types: NotificationType[]
    sound: boolean
  }
}

export interface NotificationStats {
  total: number
  unread: number
  byType: Record<NotificationType, number>
  byPriority: Record<NotificationPriority, number>
}

type UnsubscribeFunction = () => void

export class NotificationService {
  private static listeners: Map<string, UnsubscribeFunction> = new Map()
  private static notificationCallbacks: ((notification: Notification) => void)[] = []

  // ============ NOTIFICATION MANAGEMENT ============

  // Create a new notification
  static async create(notification: Omit<Notification, 'id' | 'createdAt' | 'read' | 'dismissed'>): Promise<string | null> {
    if (!isBrowser) return null

    try {
      const notificationsRef = collection(db, 'notifications')
      const docRef = await addDoc(notificationsRef, {
        ...notification,
        read: false,
        dismissed: false,
        createdAt: Timestamp.now(),
        expiresAt: notification.expiresAt ? Timestamp.fromDate(notification.expiresAt) : null
      })

      // Trigger callbacks for real-time updates
      const newNotification: Notification = {
        id: docRef.id,
        ...notification,
        read: false,
        dismissed: false,
        createdAt: new Date()
      }

      this.notificationCallbacks.forEach(callback => callback(newNotification))

      return docRef.id
    } catch (error) {
      console.error('[NotificationService] Error creating notification:', error)
      return null
    }
  }

  // Get notifications for a user
  static async getNotifications(
    userId: string,
    options?: {
      limit?: number
      unreadOnly?: boolean
      types?: NotificationType[]
    }
  ): Promise<Notification[]> {
    if (!isBrowser) return []

    try {
      const notificationsRef = collection(db, 'notifications')
      let q = query(
        notificationsRef,
        where('userId', '==', userId),
        where('dismissed', '==', false),
        orderBy('createdAt', 'desc')
      )

      if (options?.limit) {
        q = query(q, limit(options.limit))
      }

      const snapshot = await getDocs(q)
      let notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        expiresAt: doc.data().expiresAt?.toDate?.()
      })) as Notification[]

      // Apply additional filters client-side
      if (options?.unreadOnly) {
        notifications = notifications.filter(n => !n.read)
      }

      if (options?.types?.length) {
        notifications = notifications.filter(n => options.types!.includes(n.type))
      }

      // Filter expired notifications
      const now = new Date()
      notifications = notifications.filter(n => !n.expiresAt || n.expiresAt > now)

      return notifications
    } catch (error) {
      console.error('[NotificationService] Error fetching notifications:', error)
      return []
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<boolean> {
    if (!isBrowser) return false

    try {
      const notificationRef = doc(db, 'notifications', notificationId)
      await updateDoc(notificationRef, {
        read: true,
        readAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error('[NotificationService] Error marking as read:', error)
      return false
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(userId: string): Promise<boolean> {
    if (!isBrowser) return false

    try {
      const notifications = await this.getNotifications(userId, { unreadOnly: true })

      await Promise.all(
        notifications.map(n => this.markAsRead(n.id!))
      )

      return true
    } catch (error) {
      console.error('[NotificationService] Error marking all as read:', error)
      return false
    }
  }

  // Dismiss a notification
  static async dismiss(notificationId: string): Promise<boolean> {
    if (!isBrowser) return false

    try {
      const notificationRef = doc(db, 'notifications', notificationId)
      await updateDoc(notificationRef, {
        dismissed: true,
        dismissedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error('[NotificationService] Error dismissing notification:', error)
      return false
    }
  }

  // Get notification stats
  static async getStats(userId: string): Promise<NotificationStats> {
    if (!isBrowser) {
      return {
        total: 0,
        unread: 0,
        byType: {} as Record<NotificationType, number>,
        byPriority: {} as Record<NotificationPriority, number>
      }
    }

    try {
      const notifications = await this.getNotifications(userId, { limit: 500 })

      const stats: NotificationStats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.read).length,
        byType: {} as Record<NotificationType, number>,
        byPriority: {} as Record<NotificationPriority, number>
      }

      notifications.forEach(n => {
        stats.byType[n.type] = (stats.byType[n.type] || 0) + 1
        stats.byPriority[n.priority] = (stats.byPriority[n.priority] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('[NotificationService] Error getting stats:', error)
      return {
        total: 0,
        unread: 0,
        byType: {} as Record<NotificationType, number>,
        byPriority: {} as Record<NotificationPriority, number>
      }
    }
  }

  // ============ REAL-TIME SUBSCRIPTIONS ============

  // Subscribe to real-time notifications
  static subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void
  ): UnsubscribeFunction {
    if (!isBrowser) return () => {}

    const listenerKey = `notifications_${userId}`

    // Unsubscribe existing listener if any
    if (this.listeners.has(listenerKey)) {
      this.listeners.get(listenerKey)!()
    }

    const notificationsRef = collection(db, 'notifications')
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('dismissed', '==', false),
      orderBy('createdAt', 'desc'),
      limit(50)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        expiresAt: doc.data().expiresAt?.toDate?.()
      })) as Notification[]

      callback(notifications)
    }, (error) => {
      console.error('[NotificationService] Subscription error:', error)
    })

    this.listeners.set(listenerKey, unsubscribe)

    return () => {
      unsubscribe()
      this.listeners.delete(listenerKey)
    }
  }

  // Register callback for new notifications
  static onNewNotification(callback: (notification: Notification) => void): () => void {
    this.notificationCallbacks.push(callback)
    return () => {
      const index = this.notificationCallbacks.indexOf(callback)
      if (index > -1) {
        this.notificationCallbacks.splice(index, 1)
      }
    }
  }

  // ============ NOTIFICATION CREATORS ============

  // Order notifications
  static async notifyNewOrder(order: any, userId: string): Promise<void> {
    await this.create({
      type: 'order',
      priority: 'medium',
      title: 'New Order Received',
      message: `Order #${order.id?.substring(0, 8)} - ${order.customer?.name || 'Customer'} purchased ${order.tickets?.length || order.quantity || 1} tickets`,
      icon: 'shopping-cart',
      link: `/admin/orders?id=${order.id}`,
      data: { orderId: order.id, eventId: order.eventId },
      userId
    })
  }

  static async notifyOrderCompleted(order: any, userId: string): Promise<void> {
    await this.create({
      type: 'order',
      priority: 'low',
      title: 'Order Completed',
      message: `Order #${order.id?.substring(0, 8)} has been completed - $${order.pricing?.total || order.total}`,
      icon: 'check-circle',
      link: `/admin/orders?id=${order.id}`,
      data: { orderId: order.id },
      userId
    })
  }

  // Event notifications
  static async notifyEventSoldOut(event: any, userId: string): Promise<void> {
    await this.create({
      type: 'event',
      priority: 'high',
      title: 'Event Sold Out!',
      message: `${event.name} has sold out completely`,
      icon: 'ticket',
      link: `/admin/events?id=${event.id}`,
      data: { eventId: event.id },
      userId
    })
  }

  static async notifyEventReminder(event: any, userId: string, daysUntil: number): Promise<void> {
    await this.create({
      type: 'reminder',
      priority: 'medium',
      title: `Upcoming Event in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
      message: `${event.name} is coming up soon. Review ticket sales and logistics.`,
      icon: 'calendar',
      link: `/admin/events?id=${event.id}`,
      data: { eventId: event.id, daysUntil },
      userId,
      expiresAt: new Date(Date.now() + daysUntil * 24 * 60 * 60 * 1000)
    })
  }

  static async notifyLowTicketInventory(event: any, percentSold: number, userId: string): Promise<void> {
    await this.create({
      type: 'alert',
      priority: 'high',
      title: 'High Ticket Sales',
      message: `${event.name} is ${Math.round(percentSold)}% sold. Consider promotional push!`,
      icon: 'trending-up',
      link: `/admin/events?id=${event.id}`,
      data: { eventId: event.id, percentSold },
      userId
    })
  }

  // Payment notifications
  static async notifyPaymentReceived(payment: any, userId: string): Promise<void> {
    await this.create({
      type: 'payment',
      priority: 'medium',
      title: 'Payment Received',
      message: `$${payment.amount?.toFixed(2)} payment processed successfully`,
      icon: 'credit-card',
      link: `/admin/orders?id=${payment.orderId}`,
      data: { paymentId: payment.id, orderId: payment.orderId },
      userId
    })
  }

  static async notifyPaymentFailed(payment: any, userId: string): Promise<void> {
    await this.create({
      type: 'payment',
      priority: 'urgent',
      title: 'Payment Failed',
      message: `Payment of $${payment.amount?.toFixed(2)} failed: ${payment.error || 'Unknown error'}`,
      icon: 'alert-circle',
      link: `/admin/orders?id=${payment.orderId}`,
      data: { paymentId: payment.id, error: payment.error },
      userId
    })
  }

  // Commission notifications
  static async notifyCommissionEarned(commission: any, promoterId: string): Promise<void> {
    await this.create({
      type: 'commission',
      priority: 'medium',
      title: 'Commission Earned',
      message: `You earned $${commission.amount?.toFixed(2)} commission from ${commission.eventName}`,
      icon: 'dollar-sign',
      link: '/admin/promoters',
      data: { commissionId: commission.id },
      promoterId
    })
  }

  // System notifications
  static async notifySystemAlert(message: string, priority: NotificationPriority, userId: string): Promise<void> {
    await this.create({
      type: 'system',
      priority,
      title: 'System Alert',
      message,
      icon: 'info',
      userId
    })
  }

  // Daily summary notification
  static async notifyDailySummary(summary: {
    ordersToday: number
    revenueToday: number
    newCustomers: number
  }, userId: string): Promise<void> {
    await this.create({
      type: 'system',
      priority: 'low',
      title: 'Daily Summary',
      message: `Today: ${summary.ordersToday} orders, $${summary.revenueToday.toFixed(2)} revenue, ${summary.newCustomers} new customers`,
      icon: 'bar-chart',
      link: '/admin',
      data: summary,
      userId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    })
  }

  // ============ PREFERENCES ============

  // Get user notification preferences
  static async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    if (!isBrowser) return null

    try {
      const prefsRef = collection(db, 'notification_preferences')
      const q = query(prefsRef, where('userId', '==', userId))
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        // Return default preferences
        return {
          userId,
          email: {
            enabled: true,
            types: ['order', 'payment', 'alert'],
            frequency: 'instant'
          },
          push: {
            enabled: true,
            types: ['order', 'payment', 'alert', 'urgent' as any]
          },
          inApp: {
            enabled: true,
            types: ['order', 'event', 'payment', 'alert', 'system', 'promotion', 'customer', 'commission', 'reminder'],
            sound: true
          }
        }
      }

      return snapshot.docs[0].data() as NotificationPreferences
    } catch (error) {
      console.error('[NotificationService] Error getting preferences:', error)
      return null
    }
  }

  // Update user notification preferences
  static async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<boolean> {
    if (!isBrowser) return false

    try {
      const prefsRef = collection(db, 'notification_preferences')
      const q = query(prefsRef, where('userId', '==', userId))
      const snapshot = await getDocs(q)

      const data = {
        ...preferences,
        userId,
        updatedAt: Timestamp.now()
      }

      if (snapshot.empty) {
        await addDoc(prefsRef, {
          ...data,
          createdAt: Timestamp.now()
        })
      } else {
        await updateDoc(doc(db, 'notification_preferences', snapshot.docs[0].id), data)
      }

      return true
    } catch (error) {
      console.error('[NotificationService] Error updating preferences:', error)
      return false
    }
  }

  // ============ CLEANUP ============

  // Clean up expired notifications
  static async cleanupExpired(): Promise<number> {
    if (!isBrowser) return 0

    try {
      const notificationsRef = collection(db, 'notifications')
      const snapshot = await getDocs(notificationsRef)

      const now = new Date()
      let deletedCount = 0

      const deletePromises = snapshot.docs
        .filter(doc => {
          const expiresAt = doc.data().expiresAt?.toDate?.()
          return expiresAt && expiresAt < now
        })
        .map(async (docSnapshot) => {
          await deleteDoc(doc(db, 'notifications', docSnapshot.id))
          deletedCount++
        })

      await Promise.all(deletePromises)

      return deletedCount
    } catch (error) {
      console.error('[NotificationService] Error cleaning up:', error)
      return 0
    }
  }

  // Unsubscribe all listeners
  static unsubscribeAll(): void {
    this.listeners.forEach(unsubscribe => unsubscribe())
    this.listeners.clear()
  }
}

export default NotificationService
