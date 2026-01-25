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

          // Get charge details for fraud assessment and payment method info
          const chargeId = paymentIntent.latest_charge as string
          let riskLevel = 'normal'
          let riskScore: number | null = null
          let fraudDetails: Record<string, any> = {}
          let paymentMethodDetails: Record<string, any> = {}

          if (chargeId) {
            try {
              const charge = await stripe.charges.retrieve(chargeId)

              // Extract payment method details (card brand, last4)
              if (charge.payment_method_details) {
                const pmDetails = charge.payment_method_details
                if (pmDetails.card) {
                  paymentMethodDetails = {
                    paymentMethod: 'card',
                    paymentBrand: pmDetails.card.brand || null,
                    paymentLast4: pmDetails.card.last4 || null,
                    paymentExpMonth: pmDetails.card.exp_month || null,
                    paymentExpYear: pmDetails.card.exp_year || null,
                    paymentFunding: pmDetails.card.funding || null, // credit, debit, prepaid
                    paymentCountry: pmDetails.card.country || null,
                  }
                } else if (pmDetails.type) {
                  // Handle other payment methods (Google Pay, Apple Pay, etc.)
                  paymentMethodDetails = {
                    paymentMethod: pmDetails.type,
                  }
                }
              }

              // Extract Radar outcome for fraud assessment
              if (charge.outcome) {
                riskLevel = charge.outcome.risk_level || 'normal'
                riskScore = charge.outcome.risk_score || null
                fraudDetails = {
                  riskLevel: charge.outcome.risk_level,
                  riskScore: charge.outcome.risk_score,
                  sellerMessage: charge.outcome.seller_message,
                  type: charge.outcome.type,
                  reason: charge.outcome.reason,
                  networkStatus: charge.outcome.network_status,
                  // Card verification checks
                  cvcCheck: charge.payment_method_details?.card?.checks?.cvc_check,
                  addressLine1Check: charge.payment_method_details?.card?.checks?.address_line1_check,
                  addressPostalCodeCheck: charge.payment_method_details?.card?.checks?.address_postal_code_check,
                }
              }
            } catch (err) {
              console.error('Error fetching charge details:', err)
            }
          }

          await orderDoc.ref.update({
            status: 'confirmed',
            paymentStatus: 'paid',
            paidAt: new Date(),
            stripeReceiptUrl: chargeId ? await getReceiptUrl(chargeId) : null,
            // Payment method details for order display
            ...paymentMethodDetails,
            // Fraud prevention: Store risk assessment
            fraudAssessment: {
              riskLevel,
              riskScore,
              ...fraudDetails,
              assessedAt: new Date(),
            },
            updatedAt: new Date(),
          })

          // Generate QR code data
          const qrCode = `QR-${orderDoc.id}-${Date.now()}`

          await orderDoc.ref.update({
            qrCode,
            tickets: await generateTickets(orderDoc.data(), orderDoc.id),
          })

          console.log(`Order ${orderDoc.id} confirmed (Risk: ${riskLevel}, Score: ${riskScore})`)
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

          // Determine if this is a fraud-related failure
          const error = paymentIntent.last_payment_error
          const isFraudRelated = error?.code === 'card_declined' &&
            (error?.decline_code === 'fraudulent' ||
             error?.decline_code === 'stolen_card' ||
             error?.decline_code === 'lost_card' ||
             error?.decline_code === 'pickup_card')

          await orderDoc.ref.update({
            status: 'failed',
            paymentStatus: 'failed',
            failureReason: error?.message || 'Payment failed',
            failureCode: error?.code || null,
            declineCode: error?.decline_code || null,
            isFraudulent: isFraudRelated,
            updatedAt: new Date(),
          })

          console.log(`Order ${orderDoc.id} payment failed: ${error?.code} - ${error?.decline_code}`)
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

      // Fraud prevention: Handle early fraud warnings from Radar
      case 'radar.early_fraud_warning.created': {
        const warning = event.data.object as Stripe.Radar.EarlyFraudWarning

        // Find the order associated with this charge
        const chargeId = warning.charge
        if (chargeId) {
          try {
            const charge = await stripe.charges.retrieve(chargeId as string)
            const paymentIntentId = charge.payment_intent

            if (paymentIntentId) {
              const ordersSnapshot = await db.collection('orders')
                .where('stripePaymentIntentId', '==', paymentIntentId)
                .limit(1)
                .get()

              if (!ordersSnapshot.empty) {
                const orderDoc = ordersSnapshot.docs[0]

                await orderDoc.ref.update({
                  fraudWarning: {
                    id: warning.id,
                    fraudType: warning.fraud_type,
                    actionable: warning.actionable,
                    createdAt: new Date(),
                  },
                  requiresReview: true,
                  updatedAt: new Date(),
                })

                console.log(`Order ${orderDoc.id} flagged with fraud warning: ${warning.fraud_type}`)
              }
            }
          } catch (err) {
            console.error('Error processing fraud warning:', err)
          }
        }
        break
      }

      // Fraud prevention: Handle disputes (chargebacks)
      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute

        const chargeId = dispute.charge
        if (chargeId) {
          try {
            const charge = await stripe.charges.retrieve(chargeId as string)
            const paymentIntentId = charge.payment_intent

            if (paymentIntentId) {
              const ordersSnapshot = await db.collection('orders')
                .where('stripePaymentIntentId', '==', paymentIntentId)
                .limit(1)
                .get()

              if (!ordersSnapshot.empty) {
                const orderDoc = ordersSnapshot.docs[0]

                await orderDoc.ref.update({
                  status: 'disputed',
                  dispute: {
                    id: dispute.id,
                    reason: dispute.reason,
                    status: dispute.status,
                    amount: dispute.amount / 100,
                    currency: dispute.currency,
                    createdAt: new Date(),
                  },
                  updatedAt: new Date(),
                })

                // Cancel tickets for disputed orders
                const orderData = orderDoc.data()
                if (orderData.tickets) {
                  const cancelledTickets = orderData.tickets.map((ticket: any) => ({
                    ...ticket,
                    status: 'cancelled',
                    cancelReason: 'Payment disputed',
                  }))
                  await orderDoc.ref.update({ tickets: cancelledTickets })
                }

                console.log(`Order ${orderDoc.id} disputed: ${dispute.reason}`)
              }
            }
          } catch (err) {
            console.error('Error processing dispute:', err)
          }
        }
        break
      }

      // Fraud prevention: Handle dispute updates
      case 'charge.dispute.closed': {
        const dispute = event.data.object as Stripe.Dispute

        const chargeId = dispute.charge
        if (chargeId) {
          try {
            const charge = await stripe.charges.retrieve(chargeId as string)
            const paymentIntentId = charge.payment_intent

            if (paymentIntentId) {
              const ordersSnapshot = await db.collection('orders')
                .where('stripePaymentIntentId', '==', paymentIntentId)
                .limit(1)
                .get()

              if (!ordersSnapshot.empty) {
                const orderDoc = ordersSnapshot.docs[0]
                const orderData = orderDoc.data()

                // Update dispute status
                const disputeWon = dispute.status === 'won'

                await orderDoc.ref.update({
                  status: disputeWon ? 'confirmed' : 'refunded',
                  'dispute.status': dispute.status,
                  'dispute.closedAt': new Date(),
                  updatedAt: new Date(),
                })

                // If dispute was won, restore tickets
                if (disputeWon && orderData.tickets) {
                  const restoredTickets = orderData.tickets.map((ticket: any) => ({
                    ...ticket,
                    status: 'active',
                    cancelReason: null,
                  }))
                  await orderDoc.ref.update({ tickets: restoredTickets })
                }

                console.log(`Order ${orderDoc.id} dispute closed: ${dispute.status}`)
              }
            }
          } catch (err) {
            console.error('Error processing dispute closure:', err)
          }
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
