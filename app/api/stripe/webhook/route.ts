/**
 * Stripe Webhook Handler
 *
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events for payment confirmation,
 * refunds, and other payment lifecycle events.
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  const db = getAdminFirestore()

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        // Find and update the order
        const ordersSnapshot = await db.collection('orders')
          .where('stripePaymentIntentId', '==', paymentIntent.id)
          .limit(1)
          .get()

        if (!ordersSnapshot.empty) {
          const orderDoc = ordersSnapshot.docs[0]

          await orderDoc.ref.update({
            status: 'confirmed',
            paymentStatus: 'paid',
            paidAt: new Date(),
            stripeReceiptUrl: paymentIntent.latest_charge
              ? await getReceiptUrl(paymentIntent.latest_charge as string)
              : null,
            updatedAt: new Date(),
          })

          // Generate QR code data
          const qrCode = `QR-${orderDoc.id}-${Date.now()}`

          await orderDoc.ref.update({
            qrCode,
            tickets: await generateTickets(orderDoc.data(), orderDoc.id),
          })

          console.log(`Order ${orderDoc.id} confirmed`)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        const ordersSnapshot = await db.collection('orders')
          .where('stripePaymentIntentId', '==', paymentIntent.id)
          .limit(1)
          .get()

        if (!ordersSnapshot.empty) {
          const orderDoc = ordersSnapshot.docs[0]

          await orderDoc.ref.update({
            status: 'failed',
            paymentStatus: 'failed',
            failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
            updatedAt: new Date(),
          })

          console.log(`Order ${orderDoc.id} payment failed`)
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge

        const ordersSnapshot = await db.collection('orders')
          .where('stripePaymentIntentId', '==', charge.payment_intent)
          .limit(1)
          .get()

        if (!ordersSnapshot.empty) {
          const orderDoc = ordersSnapshot.docs[0]
          const refundAmount = charge.amount_refunded / 100

          await orderDoc.ref.update({
            status: charge.refunded ? 'refunded' : 'partially_refunded',
            paymentStatus: charge.refunded ? 'refunded' : 'partially_refunded',
            refundedAmount: refundAmount,
            refundedAt: new Date(),
            updatedAt: new Date(),
          })

          console.log(`Order ${orderDoc.id} refunded: $${refundAmount}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function getReceiptUrl(chargeId: string): Promise<string | null> {
  try {
    const charge = await stripe.charges.retrieve(chargeId)
    return charge.receipt_url || null
  } catch {
    return null
  }
}

async function generateTickets(
  orderData: FirebaseFirestore.DocumentData,
  orderId: string
): Promise<any[]> {
  const tickets: any[] = []

  for (const item of orderData.items || []) {
    for (let i = 0; i < (item.quantity || 1); i++) {
      tickets.push({
        ticketId: `TKT-${orderId}-${tickets.length + 1}`,
        eventId: item.eventId,
        eventName: item.eventName,
        ticketType: item.ticketType || 'General Admission',
        section: item.section || null,
        row: item.row || null,
        seat: item.seat || null,
        price: item.price,
        status: 'valid',
        qrCode: `TKT-${orderId}-${tickets.length + 1}-${Date.now()}`,
        createdAt: new Date(),
      })
    }
  }

  return tickets
}

// Disable body parser for webhooks (need raw body for signature verification)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
