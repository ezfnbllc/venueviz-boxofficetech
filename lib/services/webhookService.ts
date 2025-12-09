import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AuditService } from './auditService'

const isBrowser = typeof window !== 'undefined'

export type WebhookEvent =
  | 'event.created' | 'event.updated' | 'event.deleted' | 'event.published'
  | 'order.created' | 'order.completed' | 'order.cancelled' | 'order.refunded'
  | 'ticket.issued' | 'ticket.scanned' | 'ticket.transferred'
  | 'customer.created' | 'customer.updated'
  | 'promoter.created' | 'promoter.updated' | 'promoter.commission_paid'
  | 'payment.received' | 'payment.failed' | 'payment.refunded'
  | 'venue.created' | 'venue.updated'

export interface WebhookConfig {
  id?: string
  name: string
  url: string
  events: WebhookEvent[]
  enabled: boolean
  secret?: string
  headers?: Record<string, string>
  retryConfig?: {
    maxRetries: number
    retryDelay: number
    backoffMultiplier: number
  }
  filters?: {
    eventIds?: string[]
    promoterIds?: string[]
    categories?: string[]
  }
  createdAt?: Date
  updatedAt?: Date
  lastTriggered?: Date
  successCount?: number
  failureCount?: number
}

export interface WebhookDelivery {
  id?: string
  webhookId: string
  event: WebhookEvent
  payload: any
  status: 'pending' | 'success' | 'failed' | 'retrying'
  attempts: number
  lastAttemptAt?: Date
  response?: {
    statusCode: number
    body?: string
    headers?: Record<string, string>
  }
  error?: string
  createdAt: Date
  completedAt?: Date
}

export interface WebhookPayload {
  id: string
  event: WebhookEvent
  timestamp: string
  data: any
  metadata?: {
    promoterId?: string
    eventId?: string
    orderId?: string
  }
}

export class WebhookService {

  // ============ WEBHOOK CONFIGURATION ============

  // Get all webhooks
  static async getWebhooks(promoterId?: string): Promise<WebhookConfig[]> {
    if (!isBrowser) return []

    try {
      const webhooksRef = collection(db, 'webhooks')
      let q = query(webhooksRef)

      if (promoterId) {
        q = query(webhooksRef, where('promoterId', '==', promoterId))
      }

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.(),
        updatedAt: doc.data().updatedAt?.toDate?.(),
        lastTriggered: doc.data().lastTriggered?.toDate?.()
      })) as WebhookConfig[]
    } catch (error) {
      console.error('[WebhookService] Error fetching webhooks:', error)
      return []
    }
  }

  // Create a webhook
  static async createWebhook(
    config: Omit<WebhookConfig, 'id' | 'createdAt' | 'updatedAt' | 'successCount' | 'failureCount'>,
    user?: { id: string; email: string }
  ): Promise<string | null> {
    if (!isBrowser) return null

    try {
      // Generate secret if not provided
      const secret = config.secret || this.generateSecret()

      const webhooksRef = collection(db, 'webhooks')
      const docRef = await addDoc(webhooksRef, {
        ...config,
        secret,
        enabled: config.enabled ?? true,
        successCount: 0,
        failureCount: 0,
        retryConfig: config.retryConfig || {
          maxRetries: 3,
          retryDelay: 1000,
          backoffMultiplier: 2
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })

      if (user) {
        await AuditService.logCreate('webhook', docRef.id, config.name, {
          id: user.id,
          email: user.email
        })
      }

      return docRef.id
    } catch (error) {
      console.error('[WebhookService] Error creating webhook:', error)
      return null
    }
  }

  // Update a webhook
  static async updateWebhook(
    webhookId: string,
    updates: Partial<WebhookConfig>,
    user?: { id: string; email: string }
  ): Promise<boolean> {
    if (!isBrowser) return false

    try {
      const webhookRef = doc(db, 'webhooks', webhookId)
      await updateDoc(webhookRef, {
        ...updates,
        updatedAt: Timestamp.now()
      })

      if (user) {
        await AuditService.logUpdate('webhook', webhookId, updates.name || 'Webhook', {
          id: user.id,
          email: user.email
        })
      }

      return true
    } catch (error) {
      console.error('[WebhookService] Error updating webhook:', error)
      return false
    }
  }

  // Delete a webhook
  static async deleteWebhook(
    webhookId: string,
    user?: { id: string; email: string }
  ): Promise<boolean> {
    if (!isBrowser) return false

    try {
      const webhookRef = doc(db, 'webhooks', webhookId)
      await deleteDoc(webhookRef)

      if (user) {
        await AuditService.logDelete('webhook', webhookId, 'Webhook', {
          id: user.id,
          email: user.email
        })
      }

      return true
    } catch (error) {
      console.error('[WebhookService] Error deleting webhook:', error)
      return false
    }
  }

  // Toggle webhook enabled/disabled
  static async toggleWebhook(webhookId: string, enabled: boolean): Promise<boolean> {
    return this.updateWebhook(webhookId, { enabled })
  }

  // ============ WEBHOOK TRIGGERING ============

  // Trigger webhooks for an event
  static async trigger(
    event: WebhookEvent,
    data: any,
    metadata?: { promoterId?: string; eventId?: string; orderId?: string }
  ): Promise<{ triggered: number; succeeded: number; failed: number }> {
    if (!isBrowser) return { triggered: 0, succeeded: 0, failed: 0 }

    try {
      // Get all enabled webhooks that subscribe to this event
      const webhooks = await this.getWebhooks()
      const subscribedWebhooks = webhooks.filter(wh =>
        wh.enabled && wh.events.includes(event) && this.matchesFilters(wh, metadata)
      )

      let succeeded = 0
      let failed = 0

      // Trigger each webhook
      for (const webhook of subscribedWebhooks) {
        const payload = this.buildPayload(event, data, metadata)
        const success = await this.deliverWebhook(webhook, payload)

        if (success) {
          succeeded++
        } else {
          failed++
        }
      }

      return {
        triggered: subscribedWebhooks.length,
        succeeded,
        failed
      }
    } catch (error) {
      console.error('[WebhookService] Error triggering webhooks:', error)
      return { triggered: 0, succeeded: 0, failed: 0 }
    }
  }

  // Deliver a webhook (with retry logic)
  private static async deliverWebhook(
    webhook: WebhookConfig,
    payload: WebhookPayload
  ): Promise<boolean> {
    const delivery: WebhookDelivery = {
      webhookId: webhook.id!,
      event: payload.event,
      payload,
      status: 'pending',
      attempts: 0,
      createdAt: new Date()
    }

    const maxRetries = webhook.retryConfig?.maxRetries || 3
    const retryDelay = webhook.retryConfig?.retryDelay || 1000
    const backoffMultiplier = webhook.retryConfig?.backoffMultiplier || 2

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      delivery.attempts = attempt
      delivery.lastAttemptAt = new Date()

      try {
        const response = await this.sendRequest(webhook, payload)

        if (response.ok) {
          delivery.status = 'success'
          delivery.response = {
            statusCode: response.status,
            body: await response.text()
          }
          delivery.completedAt = new Date()

          // Update webhook stats
          await this.updateWebhookStats(webhook.id!, true)
          await this.saveDelivery(delivery)

          return true
        } else {
          delivery.response = {
            statusCode: response.status,
            body: await response.text()
          }
          throw new Error(`HTTP ${response.status}`)
        }
      } catch (error: any) {
        delivery.error = error.message
        delivery.status = attempt <= maxRetries ? 'retrying' : 'failed'

        if (attempt <= maxRetries) {
          // Wait before retry with exponential backoff
          const delay = retryDelay * Math.pow(backoffMultiplier, attempt - 1)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // All retries failed
    delivery.status = 'failed'
    delivery.completedAt = new Date()
    await this.updateWebhookStats(webhook.id!, false)
    await this.saveDelivery(delivery)

    return false
  }

  // Send HTTP request
  private static async sendRequest(
    webhook: WebhookConfig,
    payload: WebhookPayload
  ): Promise<Response> {
    const signature = this.generateSignature(payload, webhook.secret || '')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': payload.event,
      'X-Webhook-ID': payload.id,
      ...webhook.headers
    }

    return fetch(webhook.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })
  }

  // ============ DELIVERY HISTORY ============

  // Get delivery history for a webhook
  static async getDeliveries(
    webhookId: string,
    options?: { limit?: number; status?: string }
  ): Promise<WebhookDelivery[]> {
    if (!isBrowser) return []

    try {
      const deliveriesRef = collection(db, 'webhook_deliveries')
      let q = query(deliveriesRef, where('webhookId', '==', webhookId))

      if (options?.status) {
        q = query(q, where('status', '==', options.status))
      }

      const snapshot = await getDocs(q)
      let deliveries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        lastAttemptAt: doc.data().lastAttemptAt?.toDate?.(),
        completedAt: doc.data().completedAt?.toDate?.()
      })) as WebhookDelivery[]

      // Sort by createdAt descending
      deliveries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      if (options?.limit) {
        deliveries = deliveries.slice(0, options.limit)
      }

      return deliveries
    } catch (error) {
      console.error('[WebhookService] Error fetching deliveries:', error)
      return []
    }
  }

  // Retry a failed delivery
  static async retryDelivery(deliveryId: string): Promise<boolean> {
    if (!isBrowser) return false

    try {
      const deliveriesRef = collection(db, 'webhook_deliveries')
      const snapshot = await getDocs(query(deliveriesRef, where('__name__', '==', deliveryId)))

      if (snapshot.empty) return false

      const delivery = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as WebhookDelivery

      // Get webhook
      const webhooks = await this.getWebhooks()
      const webhook = webhooks.find(w => w.id === delivery.webhookId)

      if (!webhook) return false

      return this.deliverWebhook(webhook, delivery.payload)
    } catch (error) {
      console.error('[WebhookService] Error retrying delivery:', error)
      return false
    }
  }

  // ============ TEST WEBHOOK ============

  // Send a test webhook
  static async testWebhook(webhookId: string): Promise<{
    success: boolean
    statusCode?: number
    response?: string
    error?: string
  }> {
    if (!isBrowser) return { success: false, error: 'Not in browser' }

    try {
      const webhooks = await this.getWebhooks()
      const webhook = webhooks.find(w => w.id === webhookId)

      if (!webhook) {
        return { success: false, error: 'Webhook not found' }
      }

      const testPayload: WebhookPayload = {
        id: `test_${Date.now()}`,
        event: 'event.created',
        timestamp: new Date().toISOString(),
        data: {
          test: true,
          message: 'This is a test webhook delivery',
          webhookId
        }
      }

      const response = await this.sendRequest(webhook, testPayload)
      const body = await response.text()

      return {
        success: response.ok,
        statusCode: response.status,
        response: body.substring(0, 500)
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // ============ HELPER METHODS ============

  private static buildPayload(
    event: WebhookEvent,
    data: any,
    metadata?: { promoterId?: string; eventId?: string; orderId?: string }
  ): WebhookPayload {
    return {
      id: `whd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      event,
      timestamp: new Date().toISOString(),
      data,
      metadata
    }
  }

  private static matchesFilters(
    webhook: WebhookConfig,
    metadata?: { promoterId?: string; eventId?: string }
  ): boolean {
    if (!webhook.filters) return true

    if (webhook.filters.promoterIds?.length && metadata?.promoterId) {
      if (!webhook.filters.promoterIds.includes(metadata.promoterId)) {
        return false
      }
    }

    if (webhook.filters.eventIds?.length && metadata?.eventId) {
      if (!webhook.filters.eventIds.includes(metadata.eventId)) {
        return false
      }
    }

    return true
  }

  private static generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = 'whsec_'
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  private static generateSignature(payload: any, secret: string): string {
    // Simple HMAC-like signature (in production, use proper crypto)
    const timestamp = Date.now()
    const message = `${timestamp}.${JSON.stringify(payload)}`

    // Simple hash for demo - in production use crypto.subtle.sign with HMAC-SHA256
    let hash = 0
    const combined = message + secret
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }

    return `t=${timestamp},v1=${Math.abs(hash).toString(16)}`
  }

  private static async updateWebhookStats(webhookId: string, success: boolean): Promise<void> {
    try {
      const webhookRef = doc(db, 'webhooks', webhookId)
      const field = success ? 'successCount' : 'failureCount'

      // Get current stats
      const webhooks = await this.getWebhooks()
      const webhook = webhooks.find(w => w.id === webhookId)

      if (webhook) {
        await updateDoc(webhookRef, {
          [field]: (webhook[field as keyof WebhookConfig] as number || 0) + 1,
          lastTriggered: Timestamp.now()
        })
      }
    } catch (error) {
      console.error('[WebhookService] Error updating stats:', error)
    }
  }

  private static async saveDelivery(delivery: WebhookDelivery): Promise<void> {
    try {
      const deliveriesRef = collection(db, 'webhook_deliveries')
      await addDoc(deliveriesRef, {
        ...delivery,
        createdAt: Timestamp.fromDate(delivery.createdAt),
        lastAttemptAt: delivery.lastAttemptAt ? Timestamp.fromDate(delivery.lastAttemptAt) : null,
        completedAt: delivery.completedAt ? Timestamp.fromDate(delivery.completedAt) : null
      })
    } catch (error) {
      console.error('[WebhookService] Error saving delivery:', error)
    }
  }

  // ============ WEBHOOK EVENT HELPERS ============

  // Convenience methods to trigger common events
  static async triggerEventCreated(event: any): Promise<void> {
    await this.trigger('event.created', event, {
      eventId: event.id,
      promoterId: event.promoterId
    })
  }

  static async triggerEventUpdated(event: any): Promise<void> {
    await this.trigger('event.updated', event, {
      eventId: event.id,
      promoterId: event.promoterId
    })
  }

  static async triggerOrderCreated(order: any): Promise<void> {
    await this.trigger('order.created', order, {
      orderId: order.id,
      eventId: order.eventId
    })
  }

  static async triggerOrderCompleted(order: any): Promise<void> {
    await this.trigger('order.completed', order, {
      orderId: order.id,
      eventId: order.eventId
    })
  }

  static async triggerPaymentReceived(payment: any): Promise<void> {
    await this.trigger('payment.received', payment, {
      orderId: payment.orderId
    })
  }
}

export default WebhookService
