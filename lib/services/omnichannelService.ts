/**
 * Smart Notifications & Omnichannel Messaging Service
 * Multi-channel communication with intelligent timing
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  increment,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AuditService } from './auditService'

// ==================== TYPES ====================

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'whatsapp' | 'in_app'
  enabled: boolean
  config?: Record<string, any>
}

export interface NotificationTemplate {
  id?: string
  promoterId: string
  name: string
  channel: NotificationChannel['type']
  triggerType: NotificationTrigger['type']
  subject?: string // for email
  content: string
  variables: string[]
  locale: string
  status: 'active' | 'inactive'
  createdAt: Date
  updatedAt: Date
}

export interface NotificationTrigger {
  type: 'order_confirmation' | 'ticket_delivery' | 'event_reminder' | 'abandoned_cart' |
        'check_in_reminder' | 'post_event' | 'waitlist_available' | 'transfer_received' |
        'payment_failed' | 'refund_processed' | 'loyalty_points' | 'birthday' | 'custom'
  config?: {
    delayMinutes?: number
    reminderDays?: number[] // e.g., [7, 1] for 7 days and 1 day before
  }
}

export interface NotificationMessage {
  id?: string
  promoterId: string
  customerId: string
  channel: NotificationChannel['type']
  templateId?: string
  triggerType: NotificationTrigger['type']
  subject?: string
  content: string
  recipient: {
    email?: string
    phone?: string
    deviceToken?: string
    userId?: string
  }
  metadata?: Record<string, any>
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'opened' | 'clicked'
  scheduledFor?: Date
  sentAt?: Date
  deliveredAt?: Date
  openedAt?: Date
  clickedAt?: Date
  failureReason?: string
  retryCount: number
  createdAt: Date
}

export interface CustomerPreferences {
  id?: string
  promoterId: string
  customerId: string
  channels: {
    email: { enabled: boolean; frequency: 'all' | 'important' | 'minimal' }
    sms: { enabled: boolean; frequency: 'all' | 'important' | 'minimal' }
    push: { enabled: boolean; frequency: 'all' | 'important' | 'minimal' }
    whatsapp: { enabled: boolean; frequency: 'all' | 'important' | 'minimal' }
    in_app: { enabled: boolean; frequency: 'all' | 'important' | 'minimal' }
  }
  quietHours: {
    enabled: boolean
    start: string // HH:MM
    end: string
    timezone: string
  }
  marketingOptIn: boolean
  transactionalOptIn: boolean
  preferredLanguage: string
  lastUpdated: Date
}

export interface SendTimeOptimization {
  customerId: string
  optimalSendTimes: {
    channel: NotificationChannel['type']
    dayOfWeek: number // 0-6
    hourOfDay: number // 0-23
    engagementScore: number
  }[]
  calculatedAt: Date
}

export interface PushSubscription {
  id?: string
  promoterId: string
  customerId: string
  platform: 'web' | 'ios' | 'android'
  deviceToken: string
  deviceInfo: {
    model?: string
    os?: string
    osVersion?: string
    appVersion?: string
  }
  active: boolean
  subscribedAt: Date
  lastActiveAt: Date
}

export interface DeliveryReport {
  id?: string
  promoterId: string
  period: { start: Date; end: Date }
  channel: NotificationChannel['type']
  metrics: {
    total: number
    sent: number
    delivered: number
    failed: number
    opened: number
    clicked: number
    unsubscribed: number
  }
  deliveryRate: number
  openRate: number
  clickRate: number
  byTriggerType: {
    triggerType: string
    total: number
    delivered: number
    opened: number
  }[]
}

// ==================== SERVICE ====================

class OmnichannelServiceClass {
  private auditService: AuditService
  private sendTimeCache: Map<string, SendTimeOptimization> = new Map()

  constructor() {
    this.auditService = new AuditService()
  }

  // ==================== TEMPLATE MANAGEMENT ====================

  async createTemplate(
    template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt' | 'variables'>
  ): Promise<NotificationTemplate> {
    const now = new Date()
    const variables = this.extractVariables(template.content)

    const templateData = {
      ...template,
      variables,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    }

    const docRef = await addDoc(collection(db, 'notificationTemplates'), templateData)

    return {
      id: docRef.id,
      ...template,
      variables,
      createdAt: now,
      updatedAt: now,
    }
  }

  private extractVariables(content: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g
    const variables: string[] = []
    let match
    while ((match = regex.exec(content)) !== null) {
      const variable = match[1].trim()
      if (!variables.includes(variable)) {
        variables.push(variable)
      }
    }
    return variables
  }

  async getTemplates(
    promoterId: string,
    filters?: {
      channel?: NotificationChannel['type']
      triggerType?: NotificationTrigger['type']
      status?: 'active' | 'inactive'
    }
  ): Promise<NotificationTemplate[]> {
    let q = query(
      collection(db, 'notificationTemplates'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    let templates = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as NotificationTemplate[]

    if (filters?.channel) {
      templates = templates.filter((t) => t.channel === filters.channel)
    }
    if (filters?.triggerType) {
      templates = templates.filter((t) => t.triggerType === filters.triggerType)
    }
    if (filters?.status) {
      templates = templates.filter((t) => t.status === filters.status)
    }

    return templates
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<NotificationTemplate>
  ): Promise<void> {
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }

    if (updates.content) {
      updateData.variables = this.extractVariables(updates.content)
    }

    await updateDoc(doc(db, 'notificationTemplates', templateId), updateData)
  }

  // ==================== SENDING NOTIFICATIONS ====================

  async sendNotification(
    data: {
      promoterId: string
      customerId: string
      channel: NotificationChannel['type']
      triggerType: NotificationTrigger['type']
      templateId?: string
      recipient: NotificationMessage['recipient']
      variables?: Record<string, any>
      metadata?: Record<string, any>
      scheduledFor?: Date
    }
  ): Promise<NotificationMessage> {
    // Check customer preferences
    const preferences = await this.getCustomerPreferences(data.promoterId, data.customerId)
    if (preferences) {
      const channelPrefs = preferences.channels[data.channel]
      if (!channelPrefs?.enabled) {
        throw new Error(`Customer has disabled ${data.channel} notifications`)
      }

      // Check quiet hours
      if (preferences.quietHours.enabled && !data.scheduledFor) {
        const isQuietHour = this.isWithinQuietHours(preferences.quietHours)
        if (isQuietHour) {
          // Schedule for after quiet hours
          data.scheduledFor = this.getNextSendTime(preferences.quietHours)
        }
      }
    }

    // Get and render template
    let content = ''
    let subject: string | undefined

    if (data.templateId) {
      const templateDoc = await getDoc(doc(db, 'notificationTemplates', data.templateId))
      if (templateDoc.exists()) {
        const template = templateDoc.data() as NotificationTemplate
        content = this.renderTemplate(template.content, data.variables || {})
        subject = template.subject
          ? this.renderTemplate(template.subject, data.variables || {})
          : undefined
      }
    }

    // Get optimal send time if not scheduled
    if (!data.scheduledFor && data.channel !== 'in_app') {
      const optimalTime = await this.getOptimalSendTime(data.customerId, data.channel)
      if (optimalTime) {
        data.scheduledFor = this.getNextOccurrence(optimalTime.dayOfWeek, optimalTime.hourOfDay)
      }
    }

    const now = new Date()
    const messageData: Omit<NotificationMessage, 'id'> = {
      promoterId: data.promoterId,
      customerId: data.customerId,
      channel: data.channel,
      templateId: data.templateId,
      triggerType: data.triggerType,
      subject,
      content,
      recipient: data.recipient,
      metadata: data.metadata,
      status: data.scheduledFor && data.scheduledFor > now ? 'queued' : 'sending',
      scheduledFor: data.scheduledFor,
      retryCount: 0,
      createdAt: now,
    }

    const docRef = await addDoc(collection(db, 'notificationMessages'), {
      ...messageData,
      scheduledFor: data.scheduledFor ? Timestamp.fromDate(data.scheduledFor) : null,
      createdAt: Timestamp.fromDate(now),
    })

    // If not scheduled for future, send immediately
    if (!data.scheduledFor || data.scheduledFor <= now) {
      await this.processMessage(docRef.id, messageData)
    }

    return { id: docRef.id, ...messageData }
  }

  private renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template
    Object.entries(variables).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), String(value))
    })
    return rendered
  }

  private async processMessage(messageId: string, message: NotificationMessage): Promise<void> {
    const messageRef = doc(db, 'notificationMessages', messageId)

    try {
      // Simulate sending based on channel
      await this.sendViaChannel(message)

      await updateDoc(messageRef, {
        status: 'sent',
        sentAt: Timestamp.fromDate(new Date()),
      })
    } catch (error: any) {
      await updateDoc(messageRef, {
        status: 'failed',
        failureReason: error.message,
        retryCount: increment(1),
      })
    }
  }

  private async sendViaChannel(message: NotificationMessage): Promise<void> {
    switch (message.channel) {
      case 'email':
        await this.sendEmail(message)
        break
      case 'sms':
        await this.sendSMS(message)
        break
      case 'push':
        await this.sendPush(message)
        break
      case 'whatsapp':
        await this.sendWhatsApp(message)
        break
      case 'in_app':
        await this.sendInApp(message)
        break
    }
  }

  private async sendEmail(message: NotificationMessage): Promise<void> {
    // In production, integrate with email service (SendGrid, SES, etc.)
    console.log(`Sending email to ${message.recipient.email}: ${message.subject}`)
    // Simulated success
  }

  private async sendSMS(message: NotificationMessage): Promise<void> {
    // In production, integrate with Twilio or similar
    console.log(`Sending SMS to ${message.recipient.phone}: ${message.content}`)
    // Simulated success
  }

  private async sendPush(message: NotificationMessage): Promise<void> {
    // In production, integrate with FCM/APNs
    console.log(`Sending push to device ${message.recipient.deviceToken}: ${message.content}`)
    // Simulated success
  }

  private async sendWhatsApp(message: NotificationMessage): Promise<void> {
    // In production, integrate with WhatsApp Business API
    console.log(`Sending WhatsApp to ${message.recipient.phone}: ${message.content}`)
    // Simulated success
  }

  private async sendInApp(message: NotificationMessage): Promise<void> {
    // Store in-app notification for retrieval by client
    await addDoc(collection(db, 'inAppNotifications'), {
      promoterId: message.promoterId,
      customerId: message.customerId,
      title: message.subject || 'Notification',
      body: message.content,
      read: false,
      metadata: message.metadata,
      createdAt: Timestamp.fromDate(new Date()),
    })
  }

  // ==================== TRIGGERED NOTIFICATIONS ====================

  async triggerNotification(
    trigger: NotificationTrigger['type'],
    data: {
      promoterId: string
      customerId: string
      customerEmail: string
      customerPhone?: string
      variables: Record<string, any>
      metadata?: Record<string, any>
    }
  ): Promise<NotificationMessage[]> {
    // Get all active templates for this trigger
    const templates = await this.getTemplates(data.promoterId, {
      triggerType: trigger,
      status: 'active',
    })

    const sentMessages: NotificationMessage[] = []

    for (const template of templates) {
      const recipient: NotificationMessage['recipient'] = {}

      switch (template.channel) {
        case 'email':
          recipient.email = data.customerEmail
          break
        case 'sms':
        case 'whatsapp':
          if (!data.customerPhone) continue
          recipient.phone = data.customerPhone
          break
        case 'push':
          const subscription = await this.getActiveSubscription(data.promoterId, data.customerId)
          if (!subscription) continue
          recipient.deviceToken = subscription.deviceToken
          break
        case 'in_app':
          recipient.userId = data.customerId
          break
      }

      try {
        const message = await this.sendNotification({
          promoterId: data.promoterId,
          customerId: data.customerId,
          channel: template.channel,
          triggerType: trigger,
          templateId: template.id,
          recipient,
          variables: data.variables,
          metadata: data.metadata,
        })
        sentMessages.push(message)
      } catch (error) {
        console.error(`Failed to send ${template.channel} notification:`, error)
      }
    }

    return sentMessages
  }

  // ==================== CUSTOMER PREFERENCES ====================

  async getCustomerPreferences(
    promoterId: string,
    customerId: string
  ): Promise<CustomerPreferences | null> {
    const q = query(
      collection(db, 'notificationPreferences'),
      where('promoterId', '==', promoterId),
      where('customerId', '==', customerId),
      limit(1)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    return {
      id: doc.id,
      ...doc.data(),
      lastUpdated: doc.data().lastUpdated?.toDate(),
    } as CustomerPreferences
  }

  async updateCustomerPreferences(
    promoterId: string,
    customerId: string,
    updates: Partial<CustomerPreferences>
  ): Promise<CustomerPreferences> {
    const existing = await this.getCustomerPreferences(promoterId, customerId)

    if (existing) {
      await updateDoc(doc(db, 'notificationPreferences', existing.id!), {
        ...updates,
        lastUpdated: Timestamp.fromDate(new Date()),
      })
      return { ...existing, ...updates, lastUpdated: new Date() }
    }

    // Create new preferences
    const defaultPrefs: Omit<CustomerPreferences, 'id'> = {
      promoterId,
      customerId,
      channels: {
        email: { enabled: true, frequency: 'all' },
        sms: { enabled: false, frequency: 'important' },
        push: { enabled: true, frequency: 'all' },
        whatsapp: { enabled: false, frequency: 'important' },
        in_app: { enabled: true, frequency: 'all' },
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'UTC',
      },
      marketingOptIn: true,
      transactionalOptIn: true,
      preferredLanguage: 'en',
      lastUpdated: new Date(),
      ...updates,
    }

    const docRef = await addDoc(collection(db, 'notificationPreferences'), {
      ...defaultPrefs,
      lastUpdated: Timestamp.fromDate(new Date()),
    })

    return { id: docRef.id, ...defaultPrefs }
  }

  async unsubscribe(
    promoterId: string,
    customerId: string,
    channel?: NotificationChannel['type']
  ): Promise<void> {
    const preferences = await this.getCustomerPreferences(promoterId, customerId)

    if (preferences) {
      const updates: any = {}

      if (channel) {
        updates[`channels.${channel}.enabled`] = false
      } else {
        // Unsubscribe from all marketing
        updates.marketingOptIn = false
        Object.keys(preferences.channels).forEach((ch) => {
          updates[`channels.${ch}.enabled`] = false
        })
      }

      await updateDoc(doc(db, 'notificationPreferences', preferences.id!), {
        ...updates,
        lastUpdated: Timestamp.fromDate(new Date()),
      })

      await this.auditService.logActivity({
        userId: customerId,
        action: 'unsubscribe',
        resourceType: 'notification_preferences',
        resourceId: preferences.id!,
        details: { channel: channel || 'all' },
        ipAddress: '',
        userAgent: '',
      })
    }
  }

  // ==================== PUSH SUBSCRIPTIONS ====================

  async registerPushSubscription(
    subscription: Omit<PushSubscription, 'id' | 'subscribedAt' | 'lastActiveAt' | 'active'>
  ): Promise<PushSubscription> {
    const now = new Date()

    // Check for existing subscription with same device token
    const existingQuery = query(
      collection(db, 'pushSubscriptions'),
      where('deviceToken', '==', subscription.deviceToken)
    )
    const existing = await getDocs(existingQuery)

    if (!existing.empty) {
      // Update existing
      const existingDoc = existing.docs[0]
      await updateDoc(doc(db, 'pushSubscriptions', existingDoc.id), {
        active: true,
        lastActiveAt: Timestamp.fromDate(now),
        deviceInfo: subscription.deviceInfo,
      })
      return {
        id: existingDoc.id,
        ...existingDoc.data(),
        active: true,
        lastActiveAt: now,
        subscribedAt: existingDoc.data().subscribedAt?.toDate(),
      } as PushSubscription
    }

    // Create new subscription
    const subData: Omit<PushSubscription, 'id'> = {
      ...subscription,
      active: true,
      subscribedAt: now,
      lastActiveAt: now,
    }

    const docRef = await addDoc(collection(db, 'pushSubscriptions'), {
      ...subData,
      subscribedAt: Timestamp.fromDate(now),
      lastActiveAt: Timestamp.fromDate(now),
    })

    return { id: docRef.id, ...subData }
  }

  async getActiveSubscription(
    promoterId: string,
    customerId: string
  ): Promise<PushSubscription | null> {
    const q = query(
      collection(db, 'pushSubscriptions'),
      where('promoterId', '==', promoterId),
      where('customerId', '==', customerId),
      where('active', '==', true),
      orderBy('lastActiveAt', 'desc'),
      limit(1)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    return {
      id: doc.id,
      ...doc.data(),
      subscribedAt: doc.data().subscribedAt?.toDate(),
      lastActiveAt: doc.data().lastActiveAt?.toDate(),
    } as PushSubscription
  }

  async unregisterPushSubscription(deviceToken: string): Promise<void> {
    const q = query(
      collection(db, 'pushSubscriptions'),
      where('deviceToken', '==', deviceToken)
    )

    const snapshot = await getDocs(q)
    for (const docSnapshot of snapshot.docs) {
      await updateDoc(doc(db, 'pushSubscriptions', docSnapshot.id), {
        active: false,
      })
    }
  }

  // ==================== SEND TIME OPTIMIZATION ====================

  async getOptimalSendTime(
    customerId: string,
    channel: NotificationChannel['type']
  ): Promise<{ dayOfWeek: number; hourOfDay: number } | null> {
    // Check cache
    const cached = this.sendTimeCache.get(customerId)
    if (cached && Date.now() - cached.calculatedAt.getTime() < 7 * 24 * 60 * 60 * 1000) {
      const channelOptimal = cached.optimalSendTimes.find((t) => t.channel === channel)
      if (channelOptimal) {
        return { dayOfWeek: channelOptimal.dayOfWeek, hourOfDay: channelOptimal.hourOfDay }
      }
    }

    // Calculate from engagement history
    const q = query(
      collection(db, 'notificationMessages'),
      where('customerId', '==', customerId),
      where('channel', '==', channel),
      where('status', 'in', ['opened', 'clicked']),
      orderBy('openedAt', 'desc'),
      limit(50)
    )

    const snapshot = await getDocs(q)
    if (snapshot.size < 5) return null // Not enough data

    // Analyze engagement times
    const engagementTimes: { dayOfWeek: number; hourOfDay: number }[] = []
    snapshot.docs.forEach((doc) => {
      const openedAt = doc.data().openedAt?.toDate()
      if (openedAt) {
        engagementTimes.push({
          dayOfWeek: openedAt.getDay(),
          hourOfDay: openedAt.getHours(),
        })
      }
    })

    // Find most common engagement time
    const timeCounts: Record<string, number> = {}
    engagementTimes.forEach((t) => {
      const key = `${t.dayOfWeek}-${t.hourOfDay}`
      timeCounts[key] = (timeCounts[key] || 0) + 1
    })

    const sortedTimes = Object.entries(timeCounts).sort((a, b) => b[1] - a[1])
    if (sortedTimes.length === 0) return null

    const [dayOfWeek, hourOfDay] = sortedTimes[0][0].split('-').map(Number)

    // Update cache
    const optimization: SendTimeOptimization = {
      customerId,
      optimalSendTimes: [{
        channel,
        dayOfWeek,
        hourOfDay,
        engagementScore: sortedTimes[0][1] / engagementTimes.length,
      }],
      calculatedAt: new Date(),
    }
    this.sendTimeCache.set(customerId, optimization)

    return { dayOfWeek, hourOfDay }
  }

  private getNextOccurrence(dayOfWeek: number, hourOfDay: number): Date {
    const now = new Date()
    const result = new Date(now)
    result.setHours(hourOfDay, 0, 0, 0)

    const daysUntil = (dayOfWeek - now.getDay() + 7) % 7
    if (daysUntil === 0 && now.getHours() >= hourOfDay) {
      result.setDate(result.getDate() + 7)
    } else {
      result.setDate(result.getDate() + daysUntil)
    }

    return result
  }

  // ==================== QUIET HOURS ====================

  private isWithinQuietHours(quietHours: CustomerPreferences['quietHours']): boolean {
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()

    const [startHour, startMin] = quietHours.start.split(':').map(Number)
    const [endHour, endMin] = quietHours.end.split(':').map(Number)

    const startTime = startHour * 60 + startMin
    const endTime = endHour * 60 + endMin

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime < endTime
    }
  }

  private getNextSendTime(quietHours: CustomerPreferences['quietHours']): Date {
    const [endHour, endMin] = quietHours.end.split(':').map(Number)
    const result = new Date()
    result.setHours(endHour, endMin, 0, 0)

    if (result <= new Date()) {
      result.setDate(result.getDate() + 1)
    }

    return result
  }

  // ==================== TRACKING ====================

  async trackOpen(messageId: string): Promise<void> {
    await updateDoc(doc(db, 'notificationMessages', messageId), {
      status: 'opened',
      openedAt: Timestamp.fromDate(new Date()),
    })
  }

  async trackClick(messageId: string): Promise<void> {
    await updateDoc(doc(db, 'notificationMessages', messageId), {
      status: 'clicked',
      clickedAt: Timestamp.fromDate(new Date()),
    })
  }

  async trackDelivery(messageId: string): Promise<void> {
    await updateDoc(doc(db, 'notificationMessages', messageId), {
      status: 'delivered',
      deliveredAt: Timestamp.fromDate(new Date()),
    })
  }

  // ==================== DELIVERY REPORTS ====================

  async generateDeliveryReport(
    promoterId: string,
    channel: NotificationChannel['type'],
    dateRange: { start: Date; end: Date }
  ): Promise<DeliveryReport> {
    const q = query(
      collection(db, 'notificationMessages'),
      where('promoterId', '==', promoterId),
      where('channel', '==', channel),
      where('createdAt', '>=', Timestamp.fromDate(dateRange.start)),
      where('createdAt', '<=', Timestamp.fromDate(dateRange.end))
    )

    const snapshot = await getDocs(q)
    const messages = snapshot.docs.map((doc) => doc.data()) as NotificationMessage[]

    const total = messages.length
    const sent = messages.filter((m) => m.sentAt).length
    const delivered = messages.filter((m) => m.status === 'delivered' || m.status === 'opened' || m.status === 'clicked').length
    const failed = messages.filter((m) => m.status === 'failed').length
    const opened = messages.filter((m) => m.status === 'opened' || m.status === 'clicked').length
    const clicked = messages.filter((m) => m.status === 'clicked').length

    // Group by trigger type
    const byTriggerType: Record<string, { total: number; delivered: number; opened: number }> = {}
    messages.forEach((m) => {
      if (!byTriggerType[m.triggerType]) {
        byTriggerType[m.triggerType] = { total: 0, delivered: 0, opened: 0 }
      }
      byTriggerType[m.triggerType].total++
      if (m.status === 'delivered' || m.status === 'opened' || m.status === 'clicked') {
        byTriggerType[m.triggerType].delivered++
      }
      if (m.status === 'opened' || m.status === 'clicked') {
        byTriggerType[m.triggerType].opened++
      }
    })

    const report: Omit<DeliveryReport, 'id'> = {
      promoterId,
      period: dateRange,
      channel,
      metrics: {
        total,
        sent,
        delivered,
        failed,
        opened,
        clicked,
        unsubscribed: 0, // Would need to track separately
      },
      deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      clickRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
      byTriggerType: Object.entries(byTriggerType).map(([triggerType, stats]) => ({
        triggerType,
        ...stats,
      })),
    }

    const docRef = await addDoc(collection(db, 'deliveryReports'), {
      ...report,
      period: {
        start: Timestamp.fromDate(dateRange.start),
        end: Timestamp.fromDate(dateRange.end),
      },
    })

    return { id: docRef.id, ...report }
  }

  // ==================== IN-APP NOTIFICATIONS ====================

  async getInAppNotifications(
    promoterId: string,
    customerId: string,
    unreadOnly: boolean = false
  ): Promise<any[]> {
    let q = query(
      collection(db, 'inAppNotifications'),
      where('promoterId', '==', promoterId),
      where('customerId', '==', customerId),
      orderBy('createdAt', 'desc'),
      limit(50)
    )

    const snapshot = await getDocs(q)
    let notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    }))

    if (unreadOnly) {
      notifications = notifications.filter((n: any) => !n.read)
    }

    return notifications
  }

  async markAsRead(notificationIds: string[]): Promise<void> {
    for (const id of notificationIds) {
      await updateDoc(doc(db, 'inAppNotifications', id), {
        read: true,
        readAt: Timestamp.fromDate(new Date()),
      })
    }
  }

  async getUnreadCount(promoterId: string, customerId: string): Promise<number> {
    const q = query(
      collection(db, 'inAppNotifications'),
      where('promoterId', '==', promoterId),
      where('customerId', '==', customerId),
      where('read', '==', false)
    )

    const snapshot = await getDocs(q)
    return snapshot.size
  }

  // ==================== SCHEDULED MESSAGE PROCESSING ====================

  async processScheduledMessages(): Promise<{ processed: number; failed: number }> {
    const now = new Date()
    const q = query(
      collection(db, 'notificationMessages'),
      where('status', '==', 'queued'),
      where('scheduledFor', '<=', Timestamp.fromDate(now)),
      limit(100)
    )

    const snapshot = await getDocs(q)
    let processed = 0
    let failed = 0

    for (const docSnapshot of snapshot.docs) {
      const message = {
        id: docSnapshot.id,
        ...docSnapshot.data(),
      } as NotificationMessage

      try {
        await this.processMessage(docSnapshot.id, message)
        processed++
      } catch (error) {
        failed++
      }
    }

    return { processed, failed }
  }

  // ==================== UTILITIES ====================

  clearCache(): void {
    this.sendTimeCache.clear()
  }
}

export const OmnichannelService = new OmnichannelServiceClass()
