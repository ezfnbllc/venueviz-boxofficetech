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

interface CartItem {
  id: string
  type: 'ticket' | 'seat'
  eventId: string
  eventName: string
  ticketType?: string
  section?: string
  row?: number
  seat?: number
  price: number
  quantity: number
}

interface CreatePaymentIntentRequest {
  items: CartItem[]
  customerEmail: string
  customerName: string
  tenantId?: string
  promoterSlug?: string
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
    const { items, customerEmail, customerName, tenantId, promoterSlug, metadata } = body

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

    // Create the payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      customer: customerId,
      receipt_email: customerEmail,
      metadata: {
        customerName,
        tenantId: tenantId || '',
        promoterSlug: promoterSlug || '',
        itemCount: items.length.toString(),
        subtotal: subtotal.toString(),
        serviceFee: serviceFee.toString(),
        total: total.toString(),
        ...metadata,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    // Store pending order in Firestore
    const db = getAdminFirestore()
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Extract event info from first item (assuming all items are from same event)
    const firstItem = items[0]
    const eventId = firstItem?.eventId || null
    const eventName = firstItem?.eventName || null

    // Calculate total quantity
    const quantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0)

    // Map items to tickets array format for admin display
    const tickets = items.flatMap(item => {
      const ticketCount = item.quantity || 1
      return Array.from({ length: ticketCount }, (_, i) => ({
        id: `${orderId}-${item.id}-${i}`,
        tierName: item.ticketType || 'General Admission',
        section: item.section,
        row: item.row,
        seat: item.seat,
        price: item.price,
        status: 'active',
        eventId: item.eventId,
        eventName: item.eventName,
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
      // Original items
      items,
      // Tickets array for admin display
      tickets,
      quantity,
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
