import { collection, getDocs, addDoc, updateDoc, doc, query, where, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AuditService } from './auditService'

const isBrowser = typeof window !== 'undefined'

export interface CheckInRecord {
  id?: string
  eventId: string
  eventName: string
  orderId: string
  ticketId: string
  ticketType: string
  section?: string
  row?: string
  seat?: string
  customer: {
    name: string
    email: string
    phone?: string
  }
  status: 'pending' | 'checked_in' | 'no_show' | 'cancelled'
  checkInMethod: 'scan' | 'manual' | 'will_call'
  checkInTime?: Date
  checkInBy?: {
    userId: string
    name: string
  }
  willCallPickedUp?: boolean
  willCallPickupTime?: Date
  notes?: string
  deviceId?: string
  location?: string
  createdAt?: Date
}

export interface WillCallEntry {
  id?: string
  eventId: string
  eventName: string
  orderId: string
  customer: {
    name: string
    email: string
    phone?: string
  }
  tickets: {
    ticketId: string
    type: string
    section?: string
    row?: string
    seat?: string
  }[]
  status: 'pending' | 'ready' | 'picked_up' | 'cancelled'
  pickupCode: string
  idRequired: boolean
  idType?: string
  authorizedPickupName?: string
  pickedUpBy?: string
  pickedUpAt?: Date
  notes?: string
  createdAt?: Date
}

export interface CheckInStats {
  totalExpected: number
  checkedIn: number
  pending: number
  noShow: number
  checkInRate: number
  willCallPending: number
  willCallPickedUp: number
  hourlyCheckIns: { hour: number; count: number }[]
  byTicketType: { type: string; checkedIn: number; total: number }[]
  bySection: { section: string; checkedIn: number; total: number }[]
}

export interface ScanResult {
  success: boolean
  message: string
  ticket?: {
    id: string
    type: string
    customer: string
    section?: string
    row?: string
    seat?: string
  }
  alreadyCheckedIn?: boolean
  checkInTime?: Date
}

export class CheckInService {

  // ============ CHECK-IN OPERATIONS ============

  // Scan and check in a ticket
  static async scanTicket(
    qrCode: string,
    operator: { userId: string; name: string },
    options?: { deviceId?: string; location?: string }
  ): Promise<ScanResult> {
    if (!isBrowser) {
      return { success: false, message: 'Not available' }
    }

    try {
      // Parse QR code - expected format: eventId:orderId:ticketId or just ticketId
      const parts = qrCode.split(':')
      let eventId: string | undefined
      let orderId: string | undefined
      let ticketId: string

      if (parts.length === 3) {
        [eventId, orderId, ticketId] = parts
      } else {
        ticketId = qrCode
      }

      // Find the ticket
      const records = await this.getCheckInRecords()
      let record = records.find(r => r.ticketId === ticketId)

      // If not found by ticketId, search orders
      if (!record) {
        const orders = await this.fetchOrders()
        for (const order of orders) {
          const ticket = (order.tickets || []).find((t: any) =>
            t.id === ticketId || t.ticketId === ticketId || t.qrCode === qrCode
          )
          if (ticket) {
            // Create check-in record
            record = {
              eventId: order.eventId,
              eventName: order.eventName || 'Unknown Event',
              orderId: order.id,
              ticketId: ticket.id || ticket.ticketId || ticketId,
              ticketType: ticket.tierName || ticket.type || 'General',
              section: ticket.section,
              row: ticket.row,
              seat: ticket.seat,
              customer: {
                name: order.customer?.name || order.customerName || 'Unknown',
                email: order.customer?.email || order.customerEmail || ''
              },
              status: 'pending',
              checkInMethod: 'scan'
            }
            break
          }
        }
      }

      if (!record) {
        return {
          success: false,
          message: 'Ticket not found. Please verify the QR code.'
        }
      }

      // Check if already checked in
      if (record.status === 'checked_in') {
        return {
          success: false,
          message: `Already checked in at ${record.checkInTime?.toLocaleTimeString() || 'unknown time'}`,
          ticket: {
            id: record.ticketId,
            type: record.ticketType,
            customer: record.customer.name,
            section: record.section,
            row: record.row,
            seat: record.seat
          },
          alreadyCheckedIn: true,
          checkInTime: record.checkInTime
        }
      }

      // Check if cancelled
      if (record.status === 'cancelled') {
        return {
          success: false,
          message: 'This ticket has been cancelled'
        }
      }

      // Perform check-in
      const checkInTime = new Date()

      if (record.id) {
        // Update existing record
        await this.updateCheckInRecord(record.id, {
          status: 'checked_in',
          checkInTime,
          checkInBy: operator,
          checkInMethod: 'scan',
          deviceId: options?.deviceId,
          location: options?.location
        })
      } else {
        // Create new record
        await this.createCheckInRecord({
          ...record,
          status: 'checked_in',
          checkInTime,
          checkInBy: operator,
          checkInMethod: 'scan',
          deviceId: options?.deviceId,
          location: options?.location
        })
      }

      // Log audit
      await AuditService.log({
        action: 'update',
        resource: 'order',
        resourceId: record.orderId,
        resourceName: `Check-in: ${record.customer.name}`,
        userId: operator.userId,
        userEmail: operator.name,
        status: 'success',
        metadata: {
          ticketId: record.ticketId,
          eventId: record.eventId,
          checkInMethod: 'scan'
        }
      })

      return {
        success: true,
        message: 'Check-in successful!',
        ticket: {
          id: record.ticketId,
          type: record.ticketType,
          customer: record.customer.name,
          section: record.section,
          row: record.row,
          seat: record.seat
        }
      }
    } catch (error: any) {
      console.error('[CheckInService] Error scanning ticket:', error)
      return {
        success: false,
        message: error.message || 'Check-in failed'
      }
    }
  }

  // Manual check-in by name/email
  static async manualCheckIn(
    searchQuery: string,
    eventId: string,
    operator: { userId: string; name: string }
  ): Promise<{ success: boolean; results: CheckInRecord[] }> {
    if (!isBrowser) {
      return { success: false, results: [] }
    }

    try {
      const query = searchQuery.toLowerCase()
      const orders = await this.fetchOrders()
      const eventOrders = orders.filter(o => o.eventId === eventId)

      const results: CheckInRecord[] = []

      for (const order of eventOrders) {
        const customerName = (order.customer?.name || order.customerName || '').toLowerCase()
        const customerEmail = (order.customer?.email || order.customerEmail || '').toLowerCase()

        if (customerName.includes(query) || customerEmail.includes(query)) {
          for (const ticket of order.tickets || [{ id: order.id, type: 'General' }]) {
            results.push({
              eventId: order.eventId,
              eventName: order.eventName || 'Unknown Event',
              orderId: order.id,
              ticketId: ticket.id || ticket.ticketId || `${order.id}_${results.length}`,
              ticketType: ticket.tierName || ticket.type || 'General',
              section: ticket.section,
              row: ticket.row,
              seat: ticket.seat,
              customer: {
                name: order.customer?.name || order.customerName || 'Unknown',
                email: order.customer?.email || order.customerEmail || '',
                phone: order.customer?.phone
              },
              status: 'pending',
              checkInMethod: 'manual'
            })
          }
        }
      }

      return { success: true, results }
    } catch (error) {
      console.error('[CheckInService] Error in manual check-in:', error)
      return { success: false, results: [] }
    }
  }

  // Bulk check-in
  static async bulkCheckIn(
    ticketIds: string[],
    operator: { userId: string; name: string }
  ): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    for (const ticketId of ticketIds) {
      const result = await this.scanTicket(ticketId, operator)
      if (result.success) {
        success++
      } else {
        failed++
      }
    }

    return { success, failed }
  }

  // Undo check-in
  static async undoCheckIn(
    checkInId: string,
    operator: { userId: string; name: string },
    reason: string
  ): Promise<boolean> {
    if (!isBrowser) return false

    try {
      await this.updateCheckInRecord(checkInId, {
        status: 'pending',
        checkInTime: undefined,
        checkInBy: undefined,
        notes: `Check-in undone by ${operator.name}: ${reason}`
      })

      return true
    } catch (error) {
      console.error('[CheckInService] Error undoing check-in:', error)
      return false
    }
  }

  // ============ WILL-CALL OPERATIONS ============

  // Create will-call entry
  static async createWillCall(entry: Omit<WillCallEntry, 'id' | 'status' | 'pickupCode' | 'createdAt'>): Promise<string | null> {
    if (!isBrowser) return null

    try {
      const pickupCode = this.generatePickupCode()

      const willCallRef = collection(db, 'will_call')
      const docRef = await addDoc(willCallRef, {
        ...entry,
        status: 'ready',
        pickupCode,
        createdAt: Timestamp.now()
      })

      return docRef.id
    } catch (error) {
      console.error('[CheckInService] Error creating will-call:', error)
      return null
    }
  }

  // Lookup will-call by code
  static async lookupWillCall(pickupCode: string): Promise<WillCallEntry | null> {
    if (!isBrowser) return null

    try {
      const entries = await this.getWillCallEntries()
      return entries.find(e =>
        e.pickupCode.toLowerCase() === pickupCode.toLowerCase()
      ) || null
    } catch (error) {
      console.error('[CheckInService] Error looking up will-call:', error)
      return null
    }
  }

  // Process will-call pickup
  static async processWillCallPickup(
    willCallId: string,
    pickedUpBy: string,
    operator: { userId: string; name: string }
  ): Promise<boolean> {
    if (!isBrowser) return false

    try {
      const willCallRef = doc(db, 'will_call', willCallId)
      await updateDoc(willCallRef, {
        status: 'picked_up',
        pickedUpBy,
        pickedUpAt: Timestamp.now()
      })

      // Get entry to check in all tickets
      const entries = await this.getWillCallEntries()
      const entry = entries.find(e => e.id === willCallId)

      if (entry) {
        for (const ticket of entry.tickets) {
          await this.scanTicket(ticket.ticketId, operator)
        }
      }

      return true
    } catch (error) {
      console.error('[CheckInService] Error processing will-call:', error)
      return false
    }
  }

  // Get will-call entries
  static async getWillCallEntries(options?: {
    eventId?: string
    status?: WillCallEntry['status']
  }): Promise<WillCallEntry[]> {
    if (!isBrowser) return []

    try {
      const willCallRef = collection(db, 'will_call')
      const snapshot = await getDocs(willCallRef)

      let entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        pickedUpAt: doc.data().pickedUpAt?.toDate?.(),
        createdAt: doc.data().createdAt?.toDate?.()
      })) as WillCallEntry[]

      if (options?.eventId) {
        entries = entries.filter(e => e.eventId === options.eventId)
      }

      if (options?.status) {
        entries = entries.filter(e => e.status === options.status)
      }

      return entries.sort((a, b) =>
        (a.customer.name || '').localeCompare(b.customer.name || '')
      )
    } catch (error) {
      console.error('[CheckInService] Error fetching will-call:', error)
      return []
    }
  }

  // ============ STATS & REPORTS ============

  // Get check-in stats for an event
  static async getCheckInStats(eventId: string): Promise<CheckInStats> {
    if (!isBrowser) {
      return {
        totalExpected: 0,
        checkedIn: 0,
        pending: 0,
        noShow: 0,
        checkInRate: 0,
        willCallPending: 0,
        willCallPickedUp: 0,
        hourlyCheckIns: [],
        byTicketType: [],
        bySection: []
      }
    }

    try {
      const [records, willCall, orders] = await Promise.all([
        this.getCheckInRecords({ eventId }),
        this.getWillCallEntries({ eventId }),
        this.fetchOrders()
      ])

      const eventOrders = orders.filter(o => o.eventId === eventId)

      // Calculate totals from orders
      let totalExpected = 0
      eventOrders.forEach(order => {
        totalExpected += order.tickets?.length || order.quantity || 1
      })

      const checkedIn = records.filter(r => r.status === 'checked_in').length
      const pending = totalExpected - checkedIn
      const noShow = records.filter(r => r.status === 'no_show').length
      const checkInRate = totalExpected > 0 ? (checkedIn / totalExpected) * 100 : 0

      const willCallPending = willCall.filter(w => w.status === 'ready' || w.status === 'pending').length
      const willCallPickedUp = willCall.filter(w => w.status === 'picked_up').length

      // Hourly check-ins
      const hourlyMap: Record<number, number> = {}
      for (let i = 0; i < 24; i++) hourlyMap[i] = 0

      records
        .filter(r => r.status === 'checked_in' && r.checkInTime)
        .forEach(r => {
          const hour = r.checkInTime!.getHours()
          hourlyMap[hour]++
        })

      const hourlyCheckIns = Object.entries(hourlyMap)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))

      // By ticket type
      const typeMap: Record<string, { checkedIn: number; total: number }> = {}
      records.forEach(r => {
        if (!typeMap[r.ticketType]) {
          typeMap[r.ticketType] = { checkedIn: 0, total: 0 }
        }
        typeMap[r.ticketType].total++
        if (r.status === 'checked_in') {
          typeMap[r.ticketType].checkedIn++
        }
      })

      const byTicketType = Object.entries(typeMap)
        .map(([type, data]) => ({ type, ...data }))

      // By section
      const sectionMap: Record<string, { checkedIn: number; total: number }> = {}
      records.forEach(r => {
        const section = r.section || 'General'
        if (!sectionMap[section]) {
          sectionMap[section] = { checkedIn: 0, total: 0 }
        }
        sectionMap[section].total++
        if (r.status === 'checked_in') {
          sectionMap[section].checkedIn++
        }
      })

      const bySection = Object.entries(sectionMap)
        .map(([section, data]) => ({ section, ...data }))

      return {
        totalExpected,
        checkedIn,
        pending,
        noShow,
        checkInRate: Math.round(checkInRate * 10) / 10,
        willCallPending,
        willCallPickedUp,
        hourlyCheckIns,
        byTicketType,
        bySection
      }
    } catch (error) {
      console.error('[CheckInService] Error getting stats:', error)
      return {
        totalExpected: 0,
        checkedIn: 0,
        pending: 0,
        noShow: 0,
        checkInRate: 0,
        willCallPending: 0,
        willCallPickedUp: 0,
        hourlyCheckIns: [],
        byTicketType: [],
        bySection: []
      }
    }
  }

  // ============ HELPER METHODS ============

  static async getCheckInRecords(options?: {
    eventId?: string
    status?: CheckInRecord['status']
  }): Promise<CheckInRecord[]> {
    if (!isBrowser) return []

    try {
      const recordsRef = collection(db, 'check_ins')
      const snapshot = await getDocs(recordsRef)

      let records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        checkInTime: doc.data().checkInTime?.toDate?.(),
        willCallPickupTime: doc.data().willCallPickupTime?.toDate?.(),
        createdAt: doc.data().createdAt?.toDate?.()
      })) as CheckInRecord[]

      if (options?.eventId) {
        records = records.filter(r => r.eventId === options.eventId)
      }

      if (options?.status) {
        records = records.filter(r => r.status === options.status)
      }

      return records
    } catch (error) {
      console.error('[CheckInService] Error fetching records:', error)
      return []
    }
  }

  private static async createCheckInRecord(record: CheckInRecord): Promise<string> {
    const recordsRef = collection(db, 'check_ins')
    const docRef = await addDoc(recordsRef, {
      ...record,
      checkInTime: record.checkInTime ? Timestamp.fromDate(record.checkInTime) : null,
      createdAt: Timestamp.now()
    })
    return docRef.id
  }

  private static async updateCheckInRecord(recordId: string, updates: Partial<CheckInRecord>): Promise<void> {
    const recordRef = doc(db, 'check_ins', recordId)
    const cleanUpdates: any = { ...updates }

    if (updates.checkInTime) {
      cleanUpdates.checkInTime = Timestamp.fromDate(updates.checkInTime)
    }

    await updateDoc(recordRef, cleanUpdates)
  }

  private static generatePickupCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = 'WC-'
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  private static async fetchOrders(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'orders'))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch { return [] }
  }
}

export default CheckInService
