/**
 * Order Service
 *
 * Core platform service for fetching and managing orders and related event data.
 * This service is tenant-agnostic and works for all promoters on the platform.
 */

import { getAdminFirestore } from '@/lib/firebase-admin'

// ============================================================================
// Types
// ============================================================================

export interface EventDetails {
  id: string
  name: string
  slug?: string
  bannerImage?: string
  thumbnail?: string
  startDate: Date | null
  startTime?: string
  endTime?: string
  doorsOpenTime?: string
  venue?: {
    name: string
    streetAddress1?: string
    streetAddress2?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  description?: string
  shortDescription?: string
}

export interface OrderTicket {
  id?: string
  ticketId?: string
  tierName?: string
  ticketType?: string
  eventName?: string
  eventId?: string
  section?: string | null
  row?: string | number | null
  seat?: string | number | null
  status?: string
  qrCode?: string
  price?: number
  seatInfo?: {
    sectionId: string
    sectionName: string
    row: string
    seat: string | number
  } | null
}

export interface OrderItem {
  eventId: string
  eventName: string
  eventImage?: string
  ticketType?: string
  quantity: number
  price: number
  section?: string
  row?: string | number
  seat?: string | number
  seatInfo?: {
    sectionId: string
    sectionName: string
    row: string
    seat: string | number
  }
}

export interface OrderData {
  orderId: string
  status: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  eventId?: string
  promoterSlug?: string
  tenantId?: string
  items: OrderItem[]
  tickets?: OrderTicket[]
  subtotal: number
  serviceFee: number
  total: number
  currency: string
  createdAt: Date | null
  paidAt: Date | null
  updatedAt?: Date | null
  qrCode?: string
  // Payment information
  paymentMethod?: string
  paymentBrand?: string
  paymentLast4?: string
  paymentExpMonth?: number
  paymentExpYear?: number
  paymentFunding?: string
  paymentCountry?: string
  // Stripe references
  stripePaymentIntentId?: string
  stripeCustomerId?: string
  stripeReceiptUrl?: string
  // Status details
  paymentStatus?: string
  failureReason?: string
  refundedAmount?: number
  refundedAt?: Date | null
}

// ============================================================================
// Event Functions
// ============================================================================

/**
 * Fetch event details by event ID
 * This is a core platform function that works for all tenants.
 */
export async function getEventDetails(eventId: string): Promise<EventDetails | null> {
  try {
    const db = getAdminFirestore()
    const eventDoc = await db.collection('events').doc(eventId).get()

    if (!eventDoc.exists) {
      return null
    }

    const data = eventDoc.data()
    if (!data) return null

    return {
      id: eventDoc.id,
      name: data.name,
      slug: data.slug,
      bannerImage: data.bannerImage,
      thumbnail: data.thumbnail,
      startDate: data.startDate?.toDate?.() || null,
      startTime: data.startTime,
      endTime: data.endTime,
      doorsOpenTime: data.doorsOpenTime,
      venue: data.venue,
      description: data.description,
      shortDescription: data.shortDescription,
    }
  } catch (error) {
    console.error('Error fetching event:', error)
    return null
  }
}

// ============================================================================
// Order Functions
// ============================================================================

/**
 * Fetch order by order ID
 * This is a core platform function that works for all tenants.
 */
export async function getOrderById(orderId: string): Promise<OrderData | null> {
  try {
    const db = getAdminFirestore()

    // Try to find by document ID first
    let orderDoc = await db.collection('orders').doc(orderId).get()

    if (!orderDoc.exists) {
      // Try to find by orderId field
      const query = await db.collection('orders')
        .where('orderId', '==', orderId)
        .limit(1)
        .get()

      if (!query.empty) {
        orderDoc = query.docs[0]
      }
    }

    if (!orderDoc.exists) {
      return null
    }

    const data = orderDoc.data()
    if (!data) return null

    return {
      orderId: data.orderId || orderDoc.id,
      status: data.status,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      eventId: data.eventId,
      promoterSlug: data.promoterSlug,
      tenantId: data.tenantId,
      items: data.items || [],
      tickets: data.tickets || [],
      subtotal: data.subtotal || 0,
      serviceFee: data.serviceFee || 0,
      total: data.total || 0,
      currency: data.currency || 'usd',
      createdAt: data.createdAt?.toDate?.() || null,
      paidAt: data.paidAt?.toDate?.() || null,
      updatedAt: data.updatedAt?.toDate?.() || null,
      qrCode: data.qrCode,
      // Payment information
      paymentMethod: data.paymentMethod,
      paymentBrand: data.paymentBrand,
      paymentLast4: data.paymentLast4,
      paymentExpMonth: data.paymentExpMonth,
      paymentExpYear: data.paymentExpYear,
      paymentFunding: data.paymentFunding,
      paymentCountry: data.paymentCountry,
      // Stripe references
      stripePaymentIntentId: data.stripePaymentIntentId,
      stripeCustomerId: data.stripeCustomerId,
      stripeReceiptUrl: data.stripeReceiptUrl,
      // Status details
      paymentStatus: data.paymentStatus,
      failureReason: data.failureReason,
      refundedAmount: data.refundedAmount,
      refundedAt: data.refundedAt?.toDate?.() || null,
    }
  } catch (error) {
    console.error('Error fetching order:', error)
    return null
  }
}

/**
 * Fetch order with full event details
 * Convenience function that fetches both order and event data.
 */
export async function getOrderWithEventDetails(orderId: string): Promise<{
  order: OrderData | null
  event: EventDetails | null
}> {
  const order = await getOrderById(orderId)

  if (!order) {
    return { order: null, event: null }
  }

  // Get event ID from order or first item
  const eventId = order.eventId || order.items?.[0]?.eventId
  const event = eventId ? await getEventDetails(eventId) : null

  return { order, event }
}

/**
 * Update order status
 * Used for confirming orders after payment.
 */
export async function updateOrderStatus(
  orderId: string,
  status: string,
  additionalFields?: Record<string, any>
): Promise<boolean> {
  try {
    const db = getAdminFirestore()
    const updateData: Record<string, any> = {
      status,
      updatedAt: new Date(),
    }

    if (status === 'completed' || status === 'confirmed') {
      updateData.paidAt = new Date()
    }

    if (additionalFields) {
      Object.assign(updateData, additionalFields)
    }

    await db.collection('orders').doc(orderId).update(updateData)
    return true
  } catch (error) {
    console.error('Error updating order status:', error)
    return false
  }
}

// ============================================================================
// Display Helpers
// ============================================================================

/**
 * Format time from 24h to 12h format
 */
export function formatTime(time?: string): string | null {
  if (!time) return null
  const [hours, minutes] = time.split(':').map(Number)
  if (isNaN(hours) || isNaN(minutes)) return time
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Format event date for display
 */
export function formatEventDate(date: Date | null, options?: Intl.DateTimeFormatOptions): string | null {
  if (!date) return null
  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }
  return date.toLocaleDateString('en-US', options || defaultOptions)
}

/**
 * Get venue address as a formatted string
 */
export function formatVenueAddress(venue?: EventDetails['venue']): string | null {
  if (!venue) return null
  const parts = [
    venue.streetAddress1,
    venue.streetAddress2,
    venue.city,
    venue.state,
    venue.zipCode,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

/**
 * Get venue location (city, state) as a formatted string
 */
export function formatVenueLocation(venue?: EventDetails['venue']): string {
  if (!venue) return ''
  if (venue.city && venue.state) {
    return `${venue.city}, ${venue.state}`
  }
  return venue.city || venue.state || ''
}

/**
 * Get payment method display string
 */
export function formatPaymentMethod(order: OrderData): string | null {
  const brandNames: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    diners: 'Diners Club',
    jcb: 'JCB',
    unionpay: 'UnionPay',
    'amazon pay': 'Amazon Pay',
  }

  const methodNames: Record<string, string> = {
    amazon_pay: 'Amazon Pay',
    card: 'Card',
    link: 'Link',
    paypal: 'PayPal',
    cashapp: 'Cash App',
    klarna: 'Klarna',
    affirm: 'Affirm',
    afterpay_clearpay: 'Afterpay',
    apple_pay: 'Apple Pay',
    google_pay: 'Google Pay',
  }

  // If we have brand and last4, show card details
  if (order.paymentBrand && order.paymentLast4) {
    const brand = brandNames[order.paymentBrand.toLowerCase()] || order.paymentBrand
    return `${brand} ending in ${order.paymentLast4}`
  }

  // If we have a brand name (like Amazon Pay), show it
  if (order.paymentBrand) {
    return brandNames[order.paymentBrand.toLowerCase()] || order.paymentBrand
  }

  // If we have a payment method type, show friendly name
  if (order.paymentMethod) {
    return methodNames[order.paymentMethod.toLowerCase()] || order.paymentMethod
  }

  return null
}

/**
 * Get the best available event image
 */
export function getEventImage(event: EventDetails | null, orderItem?: OrderItem): string | null {
  return event?.bannerImage || event?.thumbnail || orderItem?.eventImage || null
}
