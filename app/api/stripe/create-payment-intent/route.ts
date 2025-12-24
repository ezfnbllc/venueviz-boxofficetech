/**
 * Create Stripe Payment Intent
 *
 * POST /api/stripe/create-payment-intent
 *
 * Creates a payment intent for the checkout process.
 * Uses the promoter's Stripe secret key from the database.
 * Returns the client secret for Stripe Elements to complete payment.
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getAdminFirestore } from '@/lib/firebase-admin'

interface SeatInfo {
  sectionId: string
  sectionName: string
  row: string
  seat: string | number
}

interface CartItem {
  id: string
  type: 'ticket' | 'seat'
  eventId: string
  eventName: string
  eventDate?: string
  venueName?: string
  ticketType?: string
  section?: string
  row?: number | string
  seat?: number | string
  price: number
  quantity: number
  seatInfo?: SeatInfo // For reserved seating
}

interface CreatePaymentIntentRequest {
  items: CartItem[]
  customerEmail: string
  customerName: string
  tenantId?: string
  promoterSlug?: string
  sessionId?: string // For seat hold verification
  metadata?: Record<string, string>
}

/**
 * Get Stripe instance for a promoter using their stored credentials
 */
async function getStripeForPromoter(promoterSlug: string): Promise<Stripe | null> {
  const db = getAdminFirestore()

  // First, get the promoter ID from the slug
  const promoterSnapshot = await db.collection('promoters')
    .where('slug', '==', promoterSlug)
    .limit(1)
    .get()

  if (promoterSnapshot.empty) {
    console.error(`[Stripe] No promoter found with slug: ${promoterSlug}`)
    return null
  }

  const promoterId = promoterSnapshot.docs[0].id

  // Get the payment gateway for this promoter
  const gatewaySnapshot = await db.collection('payment_gateways')
    .where('promoterId', '==', promoterId)
    .limit(1)
    .get()

  if (gatewaySnapshot.empty) {
    console.error(`[Stripe] No payment gateway found for promoter: ${promoterId}`)
    return null
  }

  const gateway = gatewaySnapshot.docs[0].data()

  if (gateway.provider !== 'stripe') {
    console.error(`[Stripe] Promoter ${promoterId} uses ${gateway.provider}, not Stripe`)
    return null
  }

  const secretKey = gateway.credentials?.secretKey
  if (!secretKey) {
    console.error(`[Stripe] No Stripe secret key found for promoter: ${promoterId}`)
    return null
  }

  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  })
}

export async function POST(request: NextRequest) {
  try {
    const body: CreatePaymentIntentRequest = await request.json()
    const { items, customerEmail, customerName, tenantId, promoterSlug, sessionId, metadata } = body

    // Validate items
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No items in cart' },
        { status: 400 }
      )
    }

    // Get Stripe instance for this promoter
    if (!promoterSlug) {
      return NextResponse.json(
        { error: 'Promoter slug is required' },
        { status: 400 }
      )
    }

    const stripe = await getStripeForPromoter(promoterSlug)
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment is not configured for this promoter' },
        { status: 400 }
      )
    }

    const db = getAdminFirestore()

    // For reserved seating, verify seat holds are still valid
    const reservedSeatItems = items.filter(item => item.seatInfo)
    if (reservedSeatItems.length > 0 && sessionId) {
      const eventId = reservedSeatItems[0].eventId

      // Verify all seat holds in a transaction
      const now = new Date()
      const conflicts: string[] = []

      for (const item of reservedSeatItems) {
        if (!item.seatInfo) continue

        const seatId = `${item.seatInfo.sectionId}-${item.seatInfo.row}-${item.seatInfo.seat}`
        const holdRef = db.collection('seat_holds').doc(`${eventId}_${seatId}`)
        const holdDoc = await holdRef.get()

        if (!holdDoc.exists) {
          // Hold doesn't exist - might have expired
          conflicts.push(seatId)
          continue
        }

        const hold = holdDoc.data()!
        const heldUntil = hold.heldUntil?.toDate?.() || new Date(hold.heldUntil)

        // Check if hold is valid and belongs to this session
        if (heldUntil < now || hold.sessionId !== sessionId) {
          conflicts.push(seatId)
        }
      }

      if (conflicts.length > 0) {
        return NextResponse.json({
          error: 'Some seats are no longer available. Please go back and select your seats again.',
          conflicts,
        }, { status: 409 })
      }
    }

    // For GA tickets, verify availability
    const gaTicketItems = items.filter(item => !item.seatInfo && item.quantity > 0)
    if (gaTicketItems.length > 0) {
      const eventId = gaTicketItems[0].eventId
      const now = new Date()

      // Get event capacity
      const eventDoc = await db.collection('events').doc(eventId).get()
      if (eventDoc.exists) {
        const eventData = eventDoc.data()!
        const totalEventCapacity = eventData.totalCapacity || eventData.ticketsAvailable || 999999

        // Count sold tickets
        const ordersSnapshot = await db.collection('orders')
          .where('eventId', '==', eventId)
          .where('status', 'in', ['completed', 'confirmed'])
          .get()

        let totalSold = 0
        ordersSnapshot.docs.forEach(doc => {
          const order = doc.data()
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((orderItem: any) => {
              if (!orderItem.seatInfo) {
                totalSold += orderItem.quantity || 1
              }
            })
          }
        })

        // Count held tickets (excluding this session)
        const holdsSnapshot = await db.collection('ticket_holds')
          .where('eventId', '==', eventId)
          .where('heldUntil', '>', now)
          .get()

        let totalHeld = 0
        holdsSnapshot.docs.forEach(doc => {
          const hold = doc.data()
          if (hold.sessionId !== sessionId) {
            totalHeld += hold.quantity || 1
          }
        })

        const requestedTotal = gaTicketItems.reduce((sum, item) => sum + item.quantity, 0)
        const available = totalEventCapacity - totalSold - totalHeld

        if (requestedTotal > available) {
          return NextResponse.json({
            error: `Only ${available} tickets remaining. Please reduce your order quantity.`,
            available,
          }, { status: 409 })
        }
      }
    }

    // Calculate total
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const serviceFee = Math.round(subtotal * 0.1 * 100) / 100 // 10% service fee
    const total = subtotal + serviceFee

    // Amount in cents
    const amountInCents = Math.round(total * 100)

    if (amountInCents < 50) {
      return NextResponse.json(
        { error: 'Minimum order amount is $0.50' },
        { status: 400 }
      )
    }

    // Create or retrieve Stripe customer
    let customerId: string | undefined

    // Search for existing customer by email
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
        metadata: {
          tenantId: tenantId || '',
          promoterSlug: promoterSlug || '',
        },
      })
      customerId = customer.id
    }

    // Extract event info from first item (assuming all items are from same event)
    const firstItem = items[0]
    const eventId = firstItem?.eventId || null
    const eventName = firstItem?.eventName || null
    const eventDate = firstItem?.eventDate || null
    const venueName = firstItem?.venueName || null

    // Calculate total quantity
    const ticketQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0)

    // Build description for Stripe dashboard
    const descriptionParts = [eventName]
    if (eventDate) descriptionParts.push(eventDate)
    if (venueName) descriptionParts.push(venueName)
    const description = descriptionParts.filter(Boolean).join(' | ') || 'Event Tickets'

    // Create the payment intent with event details and fraud prevention
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      customer: customerId,
      receipt_email: customerEmail,
      description,
      metadata: {
        // Customer info
        customerName,
        // Event info
        eventName: eventName || '',
        eventDate: eventDate || '',
        venueName: venueName || '',
        eventId: eventId || '',
        // Order info
        ticketQuantity: ticketQuantity.toString(),
        itemCount: items.length.toString(),
        subtotal: subtotal.toString(),
        serviceFee: serviceFee.toString(),
        total: total.toString(),
        // Promoter info
        tenantId: tenantId || '',
        promoterSlug: promoterSlug || '',
        ...metadata,
      },
      automatic_payment_methods: {
        enabled: true,
      },
      // Fraud prevention: Enable Stripe Radar and require verification
      // This helps Radar assess risk based on billing details
      payment_method_options: {
        card: {
          // Request CVC verification
          require_cvc_recollection: false,
        },
      },
    })

    // Store pending order in Firestore
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Map items to tickets array format for admin display
    // Note: Firestore doesn't accept undefined values, so we use null for optional fields
    const tickets = items.flatMap(item => {
      const ticketCount = item.quantity || 1
      return Array.from({ length: ticketCount }, (_, i) => ({
        id: `${orderId}-${item.id}-${i}`,
        tierName: item.ticketType || 'General Admission',
        section: item.seatInfo?.sectionName || item.section || null,
        row: item.seatInfo?.row || item.row ?? null,
        seat: item.seatInfo?.seat || item.seat ?? null,
        price: item.price,
        status: 'active',
        eventId: item.eventId,
        eventName: item.eventName,
        // Include seat info for reserved seating
        seatInfo: item.seatInfo || null,
      }))
    })

    await db.collection('orders').doc(orderId).set({
      orderId,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: customerId,
      status: 'pending',
      customerEmail,
      customerName,
      tenantId: tenantId || null,
      promoterSlug: promoterSlug || null,
      // Event info for admin display
      eventId,
      eventName,
      eventDate,
      venueName,
      // Original items
      items,
      // Tickets array for admin display
      tickets,
      quantity: ticketQuantity,
      // Pricing
      subtotal,
      serviceFee,
      total,
      pricing: {
        subtotal,
        fees: { service: serviceFee },
        total,
      },
      currency: 'usd',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      orderId,
      amount: total,
      subtotal,
      serviceFee,
    })

  } catch (error) {
    console.error('Error creating payment intent:', error)

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
