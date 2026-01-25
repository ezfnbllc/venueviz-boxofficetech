/**
 * Order Service
 *
 * Core platform service for fetching and managing orders and related event data.
 * This service is tenant-agnostic and works for all promoters on the platform.
 */

import { getAdminFirestore, getAdminAuth } from '@/lib/firebase-admin'
import crypto from 'crypto'

/**
 * Generate a random secure password
 */
function generateRandomPassword(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  const bytes = crypto.randomBytes(length)
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length]
  }
  return password
}

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

    // Handle various image field names for backwards compatibility
    // Events can store images in: basics.images.cover (admin), bannerImage, images.cover, coverImage, image
    const bannerImage = data.basics?.images?.cover || data.bannerImage || data.images?.cover || data.coverImage || data.image
    const thumbnail = data.basics?.images?.thumbnail || data.thumbnail || data.basics?.images?.cover || data.images?.cover || data.bannerImage || data.image

    // Handle various date formats
    // Check schedule.performances first, then startDate field
    let startDate: Date | null = null
    const firstPerformance = data.schedule?.performances?.[0]
    if (firstPerformance?.date) {
      const rawDate = firstPerformance.date
      if (rawDate?.toDate) {
        startDate = rawDate.toDate()
      } else if (rawDate?._seconds) {
        startDate = new Date(rawDate._seconds * 1000)
      } else if (rawDate) {
        startDate = new Date(rawDate)
      }
    } else if (data.startDate) {
      const rawDate = data.startDate
      if (rawDate?.toDate) {
        startDate = rawDate.toDate()
      } else if (rawDate?._seconds) {
        startDate = new Date(rawDate._seconds * 1000)
      } else if (rawDate) {
        startDate = new Date(rawDate)
      }
    }

    // Get start time from schedule or direct field
    const startTime = firstPerformance?.startTime || data.startTime
    const endTime = firstPerformance?.endTime || data.endTime
    const doorsOpenTime = firstPerformance?.doorsOpen || data.doorsOpenTime || data.doorsOpen

    return {
      id: eventDoc.id,
      name: data.name || data.basics?.name || data.title || '',
      slug: data.slug || data.communications?.seo?.urlSlug,
      bannerImage,
      thumbnail,
      startDate,
      startTime,
      endTime,
      doorsOpenTime,
      venue: data.venue,
      description: data.description || data.basics?.description,
      shortDescription: data.shortDescription || data.basics?.shortDescription,
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
 * Also creates guest customer account on first successful payment.
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

    // Create guest customer account on successful payment
    if (status === 'completed' || status === 'confirmed') {
      const orderDoc = await db.collection('orders').doc(orderId).get()
      if (orderDoc.exists) {
        const orderData = orderDoc.data()
        if (orderData?.customerEmail && orderData?.promoterSlug) {
          // Run in background - don't block order confirmation
          createGuestAccount(
            orderData.customerEmail,
            orderData.customerName,
            orderData.promoterSlug,
            orderId,
            orderData.pricing?.total || orderData.total || 0
          ).catch(err => console.error('[OrderService] Guest account creation failed:', err))
        }
      }
    }

    return true
  } catch (error) {
    console.error('Error updating order status:', error)
    return false
  }
}

/**
 * Create a guest customer account after successful purchase
 * Creates Firebase Auth user and tenant customer record
 */
async function createGuestAccount(
  email: string,
  customerName: string,
  promoterSlug: string,
  orderId: string,
  orderTotal: number
): Promise<void> {
  try {
    const db = getAdminFirestore()
    const normalizedEmail = email.toLowerCase()

    // Check if customer already exists for this tenant
    const existingCustomer = await db.collection('customers')
      .where('promoterSlug', '==', promoterSlug)
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get()

    // Get promoter ID from slug
    const promoterSnapshot = await db.collection('promoters')
      .where('slug', '==', promoterSlug)
      .limit(1)
      .get()

    if (promoterSnapshot.empty) {
      console.error(`[Guest Account] Promoter not found: ${promoterSlug}`)
      return
    }

    const promoterId = promoterSnapshot.docs[0].id

    if (!existingCustomer.empty) {
      // Customer exists - just update their order stats
      const customerDoc = existingCustomer.docs[0]
      const customerData = customerDoc.data()

      await customerDoc.ref.update({
        orderCount: (customerData.orderCount || 0) + 1,
        totalSpent: (customerData.totalSpent || 0) + orderTotal,
        lastOrderId: orderId,
        lastOrderAt: new Date(),
        updatedAt: new Date(),
      })

      console.log(`[Guest Account] Updated existing customer for ${normalizedEmail} on tenant ${promoterSlug}`)
      return
    }

    // Parse name into firstName and lastName
    const nameParts = (customerName || '').trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    // Generate a random password
    const tempPassword = generateRandomPassword()

    // Try to create or find Firebase Auth user
    let firebaseUid = ''
    const auth = getAdminAuth()

    try {
      // Check if user already exists in Firebase Auth
      const existingUser = await auth.getUserByEmail(normalizedEmail)
      firebaseUid = existingUser.uid
      console.log(`[Guest Account] Firebase user already exists: ${firebaseUid}`)
    } catch (authError: any) {
      // User doesn't exist, create new one
      if (authError.code === 'auth/user-not-found') {
        try {
          const newUser = await auth.createUser({
            email: normalizedEmail,
            password: tempPassword,
            displayName: customerName || email.split('@')[0],
            emailVerified: false,
          })
          firebaseUid = newUser.uid
          console.log(`[Guest Account] Created new Firebase user: ${firebaseUid}`)
        } catch (createError: any) {
          console.error(`[Guest Account] Failed to create Firebase user:`, createError.message)
          // Continue without Firebase Auth - guest checkout still works
        }
      } else {
        console.error(`[Guest Account] Firebase Auth error:`, authError.message)
      }
    }

    // Create tenant customer record
    const now = new Date()
    const customerRef = db.collection('customers').doc()
    await customerRef.set({
      promoterId,
      promoterSlug,
      email: normalizedEmail,
      firebaseUid,
      firstName,
      lastName,
      phone: null,
      emailVerified: false,
      isGuest: true,
      needsPasswordReset: firebaseUid ? true : false,
      createdAt: now,
      updatedAt: now,
      orderCount: 1,
      totalSpent: orderTotal,
      lastOrderId: orderId,
      lastOrderAt: now,
    })

    // Queue welcome email (to be sent when email service is configured)
    if (firebaseUid) {
      await db.collection('email_queue').add({
        type: 'welcome_guest',
        to: normalizedEmail,
        promoterSlug,
        templateData: {
          firstName: firstName || 'Customer',
          email: normalizedEmail,
          tempPassword,
          orderId,
          loginUrl: `https://${promoterSlug}.venueviz.com/login`,
        },
        status: 'pending',
        createdAt: now,
        attempts: 0,
      })
      console.log(`[Guest Account] Queued welcome email for ${normalizedEmail}`)
    }

    console.log(`[Guest Account] Created customer for ${normalizedEmail} on tenant ${promoterSlug}`)
  } catch (error) {
    console.error('[Guest Account] Error creating guest account:', error)
    // Don't throw - payment already succeeded, this is supplementary
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
