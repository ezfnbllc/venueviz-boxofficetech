/**
 * Create Stripe Payment Intent
 *
 * POST /api/stripe/create-payment-intent
 *
 * Creates a payment intent for the checkout process.
 * Returns the client secret for Stripe Elements to complete payment.
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getAdminFirestore } from '@/lib/firebase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

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

    await db.collection('orders').doc(orderId).set({
      orderId,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: customerId,
      status: 'pending',
      customerEmail,
      customerName,
      tenantId: tenantId || null,
      promoterSlug: promoterSlug || null,
      items,
      subtotal,
      serviceFee,
      total,
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
