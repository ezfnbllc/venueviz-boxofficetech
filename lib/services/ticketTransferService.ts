import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { NotificationService } from './notificationService'
import { AuditService } from './auditService'

const isBrowser = typeof window !== 'undefined'

export interface TicketTransfer {
  id?: string
  ticketId: string
  orderId: string
  eventId: string
  eventName: string
  originalOwner: {
    email: string
    name: string
    userId?: string
  }
  newOwner: {
    email: string
    name: string
    userId?: string
  }
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
  transferType: 'gift' | 'sale' | 'exchange'
  salePrice?: number
  message?: string
  expiresAt: Date
  createdAt?: Date
  completedAt?: Date
  transferCode: string
}

export interface WaitlistEntry {
  id?: string
  eventId: string
  eventName: string
  customer: {
    email: string
    name: string
    phone?: string
    userId?: string
  }
  ticketQuantity: number
  maxPrice?: number
  preferredSections?: string[]
  status: 'waiting' | 'notified' | 'purchased' | 'expired' | 'cancelled'
  position: number
  priority: 'normal' | 'vip' | 'early-bird'
  notificationsSent: number
  lastNotified?: Date
  expiresAt?: Date
  createdAt?: Date
  convertedOrderId?: string
}

export interface WaitlistStats {
  totalWaiting: number
  averageWaitTime: number
  conversionRate: number
  byEvent: { eventId: string; eventName: string; count: number }[]
  estimatedRevenue: number
}

export class TicketTransferService {

  // ============ TICKET TRANSFERS ============

  // Initiate a ticket transfer
  static async initiateTransfer(transfer: Omit<TicketTransfer, 'id' | 'status' | 'createdAt' | 'transferCode'>): Promise<string | null> {
    if (!isBrowser) return null

    try {
      const transferCode = this.generateTransferCode()

      const transfersRef = collection(db, 'ticket_transfers')
      const docRef = await addDoc(transfersRef, {
        ...transfer,
        status: 'pending',
        transferCode,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(transfer.expiresAt)
      })

      // Notify new owner
      await this.notifyTransferRecipient(transfer, transferCode)

      // Log audit
      await AuditService.log({
        action: 'create',
        resource: 'order',
        resourceId: transfer.orderId,
        resourceName: `Ticket Transfer for ${transfer.eventName}`,
        userId: transfer.originalOwner.userId || transfer.originalOwner.email,
        userEmail: transfer.originalOwner.email,
        status: 'success',
        metadata: {
          transferType: transfer.transferType,
          newOwnerEmail: transfer.newOwner.email
        }
      })

      return docRef.id
    } catch (error) {
      console.error('[TicketTransferService] Error initiating transfer:', error)
      return null
    }
  }

  // Accept a transfer
  static async acceptTransfer(transferId: string, transferCode: string): Promise<boolean> {
    if (!isBrowser) return false

    try {
      const transfers = await this.getTransfers()
      const transfer = transfers.find(t => t.id === transferId)

      if (!transfer) return false
      if (transfer.transferCode !== transferCode) return false
      if (transfer.status !== 'pending') return false
      if (new Date() > transfer.expiresAt) {
        await this.updateTransferStatus(transferId, 'expired')
        return false
      }

      // Update transfer status
      await this.updateTransferStatus(transferId, 'accepted')

      // Update ticket ownership in the order
      await this.updateTicketOwnership(transfer)

      // Notify original owner
      await NotificationService.create({
        type: 'order',
        priority: 'medium',
        title: 'Ticket Transfer Accepted',
        message: `${transfer.newOwner.name} has accepted your ticket transfer for ${transfer.eventName}`,
        userId: transfer.originalOwner.userId || transfer.originalOwner.email
      })

      return true
    } catch (error) {
      console.error('[TicketTransferService] Error accepting transfer:', error)
      return false
    }
  }

  // Decline a transfer
  static async declineTransfer(transferId: string, reason?: string): Promise<boolean> {
    if (!isBrowser) return false

    try {
      await this.updateTransferStatus(transferId, 'declined')

      const transfers = await this.getTransfers()
      const transfer = transfers.find(t => t.id === transferId)

      if (transfer) {
        await NotificationService.create({
          type: 'order',
          priority: 'medium',
          title: 'Ticket Transfer Declined',
          message: `${transfer.newOwner.name} has declined your ticket transfer for ${transfer.eventName}${reason ? `: ${reason}` : ''}`,
          userId: transfer.originalOwner.userId || transfer.originalOwner.email
        })
      }

      return true
    } catch (error) {
      console.error('[TicketTransferService] Error declining transfer:', error)
      return false
    }
  }

  // Cancel a transfer
  static async cancelTransfer(transferId: string): Promise<boolean> {
    if (!isBrowser) return false

    try {
      await this.updateTransferStatus(transferId, 'cancelled')
      return true
    } catch (error) {
      console.error('[TicketTransferService] Error cancelling transfer:', error)
      return false
    }
  }

  // Get transfers
  static async getTransfers(options?: {
    email?: string
    eventId?: string
    status?: TicketTransfer['status']
  }): Promise<TicketTransfer[]> {
    if (!isBrowser) return []

    try {
      const transfersRef = collection(db, 'ticket_transfers')
      const snapshot = await getDocs(transfersRef)

      let transfers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        expiresAt: doc.data().expiresAt?.toDate?.() || new Date(),
        createdAt: doc.data().createdAt?.toDate?.(),
        completedAt: doc.data().completedAt?.toDate?.()
      })) as TicketTransfer[]

      if (options?.email) {
        const email = options.email.toLowerCase()
        transfers = transfers.filter(t =>
          t.originalOwner.email.toLowerCase() === email ||
          t.newOwner.email.toLowerCase() === email
        )
      }

      if (options?.eventId) {
        transfers = transfers.filter(t => t.eventId === options.eventId)
      }

      if (options?.status) {
        transfers = transfers.filter(t => t.status === options.status)
      }

      return transfers.sort((a, b) =>
        (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
      )
    } catch (error) {
      console.error('[TicketTransferService] Error fetching transfers:', error)
      return []
    }
  }

  // ============ HELPER METHODS ============

  private static async updateTransferStatus(transferId: string, status: TicketTransfer['status']): Promise<void> {
    const transferRef = doc(db, 'ticket_transfers', transferId)
    await updateDoc(transferRef, {
      status,
      ...(status === 'accepted' ? { completedAt: Timestamp.now() } : {})
    })
  }

  private static async updateTicketOwnership(transfer: TicketTransfer): Promise<void> {
    // This would update the order/ticket to reflect new ownership
    // Implementation depends on order structure
    const ordersRef = collection(db, 'orders')
    const q = query(ordersRef, where('__name__', '==', transfer.orderId))
    const snapshot = await getDocs(q)

    if (!snapshot.empty) {
      const orderDoc = snapshot.docs[0]
      const orderData = orderDoc.data()

      // Update customer info for the transferred ticket
      const updatedTickets = (orderData.tickets || []).map((ticket: any) => {
        if (ticket.id === transfer.ticketId || ticket.ticketId === transfer.ticketId) {
          return {
            ...ticket,
            transferredTo: transfer.newOwner,
            transferredAt: new Date().toISOString(),
            originalOwner: transfer.originalOwner
          }
        }
        return ticket
      })

      await updateDoc(doc(db, 'orders', orderDoc.id), {
        tickets: updatedTickets,
        updatedAt: Timestamp.now()
      })
    }
  }

  private static async notifyTransferRecipient(transfer: Omit<TicketTransfer, 'id' | 'status' | 'createdAt' | 'transferCode'>, code: string): Promise<void> {
    // In a real app, this would send an email
    console.log(`[TicketTransferService] Notify ${transfer.newOwner.email} of transfer with code ${code}`)

    if (transfer.newOwner.userId) {
      await NotificationService.create({
        type: 'order',
        priority: 'high',
        title: 'Ticket Transfer Request',
        message: `${transfer.originalOwner.name} wants to transfer a ticket for ${transfer.eventName} to you`,
        link: `/tickets/transfer/${code}`,
        userId: transfer.newOwner.userId
      })
    }
  }

  private static generateTransferCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }
}

export class WaitlistService {

  // ============ WAITLIST MANAGEMENT ============

  // Add to waitlist
  static async addToWaitlist(entry: Omit<WaitlistEntry, 'id' | 'status' | 'position' | 'notificationsSent' | 'createdAt'>): Promise<string | null> {
    if (!isBrowser) return null

    try {
      // Check if already on waitlist
      const existing = await this.getWaitlistEntries({ eventId: entry.eventId })
      const alreadyOnList = existing.find(e =>
        e.customer.email.toLowerCase() === entry.customer.email.toLowerCase() &&
        e.status === 'waiting'
      )

      if (alreadyOnList) {
        return alreadyOnList.id || null
      }

      // Calculate position
      const position = existing.filter(e => e.status === 'waiting').length + 1

      const waitlistRef = collection(db, 'waitlist')
      const docRef = await addDoc(waitlistRef, {
        ...entry,
        status: 'waiting',
        position,
        notificationsSent: 0,
        createdAt: Timestamp.now(),
        expiresAt: entry.expiresAt ? Timestamp.fromDate(entry.expiresAt) : null
      })

      // Send confirmation
      if (entry.customer.userId) {
        await NotificationService.create({
          type: 'event',
          priority: 'low',
          title: 'Added to Waitlist',
          message: `You've been added to the waitlist for ${entry.eventName}. Position: #${position}`,
          userId: entry.customer.userId
        })
      }

      return docRef.id
    } catch (error) {
      console.error('[WaitlistService] Error adding to waitlist:', error)
      return null
    }
  }

  // Remove from waitlist
  static async removeFromWaitlist(entryId: string): Promise<boolean> {
    if (!isBrowser) return false

    try {
      const entryRef = doc(db, 'waitlist', entryId)
      await updateDoc(entryRef, {
        status: 'cancelled'
      })

      // Recalculate positions
      await this.recalculatePositions(entryId)

      return true
    } catch (error) {
      console.error('[WaitlistService] Error removing from waitlist:', error)
      return false
    }
  }

  // Notify waitlist of available tickets
  static async notifyAvailability(
    eventId: string,
    availableCount: number,
    options?: { maxNotifications?: number }
  ): Promise<number> {
    if (!isBrowser) return 0

    try {
      const entries = await this.getWaitlistEntries({
        eventId,
        status: 'waiting'
      })

      // Sort by position and priority
      const sorted = entries.sort((a, b) => {
        if (a.priority !== b.priority) {
          const priorityOrder = { 'vip': 0, 'early-bird': 1, 'normal': 2 }
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        }
        return a.position - b.position
      })

      const maxToNotify = options?.maxNotifications || availableCount * 2
      const toNotify = sorted.slice(0, maxToNotify)

      let notifiedCount = 0

      for (const entry of toNotify) {
        // Update entry
        const entryRef = doc(db, 'waitlist', entry.id!)
        await updateDoc(entryRef, {
          status: 'notified',
          lastNotified: Timestamp.now(),
          notificationsSent: (entry.notificationsSent || 0) + 1
        })

        // Send notification
        if (entry.customer.userId) {
          await NotificationService.create({
            type: 'event',
            priority: 'high',
            title: 'Tickets Now Available!',
            message: `Good news! Tickets for ${entry.eventName} are now available. Hurry, they won't last long!`,
            link: `/events/${eventId}`,
            userId: entry.customer.userId,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          })
        }

        notifiedCount++
      }

      return notifiedCount
    } catch (error) {
      console.error('[WaitlistService] Error notifying waitlist:', error)
      return 0
    }
  }

  // Mark as purchased
  static async markAsPurchased(entryId: string, orderId: string): Promise<boolean> {
    if (!isBrowser) return false

    try {
      const entryRef = doc(db, 'waitlist', entryId)
      await updateDoc(entryRef, {
        status: 'purchased',
        convertedOrderId: orderId
      })

      await this.recalculatePositions(entryId)

      return true
    } catch (error) {
      console.error('[WaitlistService] Error marking as purchased:', error)
      return false
    }
  }

  // Get waitlist entries
  static async getWaitlistEntries(options?: {
    eventId?: string
    email?: string
    status?: WaitlistEntry['status']
  }): Promise<WaitlistEntry[]> {
    if (!isBrowser) return []

    try {
      const waitlistRef = collection(db, 'waitlist')
      const snapshot = await getDocs(waitlistRef)

      let entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastNotified: doc.data().lastNotified?.toDate?.(),
        expiresAt: doc.data().expiresAt?.toDate?.(),
        createdAt: doc.data().createdAt?.toDate?.()
      })) as WaitlistEntry[]

      if (options?.eventId) {
        entries = entries.filter(e => e.eventId === options.eventId)
      }

      if (options?.email) {
        entries = entries.filter(e =>
          e.customer.email.toLowerCase() === options.email!.toLowerCase()
        )
      }

      if (options?.status) {
        entries = entries.filter(e => e.status === options.status)
      }

      return entries.sort((a, b) => a.position - b.position)
    } catch (error) {
      console.error('[WaitlistService] Error fetching waitlist:', error)
      return []
    }
  }

  // Get waitlist stats
  static async getWaitlistStats(eventId?: string): Promise<WaitlistStats> {
    if (!isBrowser) {
      return {
        totalWaiting: 0,
        averageWaitTime: 0,
        conversionRate: 0,
        byEvent: [],
        estimatedRevenue: 0
      }
    }

    try {
      const entries = await this.getWaitlistEntries(eventId ? { eventId } : undefined)

      const waiting = entries.filter(e => e.status === 'waiting')
      const purchased = entries.filter(e => e.status === 'purchased')

      // Calculate average wait time
      const waitTimes = purchased
        .filter(e => e.createdAt)
        .map(e => {
          const created = e.createdAt!.getTime()
          const now = Date.now()
          return (now - created) / (24 * 60 * 60 * 1000) // days
        })

      const averageWaitTime = waitTimes.length > 0
        ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
        : 0

      // Calculate conversion rate
      const total = entries.filter(e => e.status !== 'waiting').length
      const conversionRate = total > 0 ? (purchased.length / total) * 100 : 0

      // Group by event
      const eventCounts: Record<string, { eventId: string; eventName: string; count: number }> = {}
      waiting.forEach(e => {
        if (!eventCounts[e.eventId]) {
          eventCounts[e.eventId] = {
            eventId: e.eventId,
            eventName: e.eventName,
            count: 0
          }
        }
        eventCounts[e.eventId].count++
      })

      // Estimate revenue (assuming $50 avg ticket)
      const estimatedRevenue = waiting.reduce((sum, e) =>
        sum + (e.ticketQuantity * (e.maxPrice || 50)), 0
      )

      return {
        totalWaiting: waiting.length,
        averageWaitTime: Math.round(averageWaitTime * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10,
        byEvent: Object.values(eventCounts).sort((a, b) => b.count - a.count),
        estimatedRevenue
      }
    } catch (error) {
      console.error('[WaitlistService] Error getting stats:', error)
      return {
        totalWaiting: 0,
        averageWaitTime: 0,
        conversionRate: 0,
        byEvent: [],
        estimatedRevenue: 0
      }
    }
  }

  // Get position in waitlist
  static async getPosition(eventId: string, email: string): Promise<number | null> {
    const entries = await this.getWaitlistEntries({
      eventId,
      email,
      status: 'waiting'
    })

    if (entries.length === 0) return null
    return entries[0].position
  }

  // ============ HELPER METHODS ============

  private static async recalculatePositions(excludeId: string): Promise<void> {
    const entries = await this.getWaitlistEntries()
    const entry = entries.find(e => e.id === excludeId)

    if (!entry) return

    const eventEntries = entries.filter(e =>
      e.eventId === entry.eventId &&
      e.status === 'waiting' &&
      e.id !== excludeId
    ).sort((a, b) => a.position - b.position)

    for (let i = 0; i < eventEntries.length; i++) {
      const entryRef = doc(db, 'waitlist', eventEntries[i].id!)
      await updateDoc(entryRef, { position: i + 1 })
    }
  }
}

export default { TicketTransferService, WaitlistService }
