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
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
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
                } else if ((pmDetails as any).amazon_pay) {
                  // Handle Amazon Pay
                  paymentMethodDetails = {
                    paymentMethod: 'amazon_pay',
                    paymentBrand: 'Amazon Pay',
                  }
                } else if ((pmDetails as any).link) {
                  // Handle Stripe Link
                  paymentMethodDetails = {
                    paymentMethod: 'link',
                    paymentBrand: 'Link',
                  }
                } else if ((pmDetails as any).paypal) {
                  // Handle PayPal
                  paymentMethodDetails = {
                    paymentMethod: 'paypal',
                    paymentBrand: 'PayPal',
                  }
                } else if ((pmDetails as any).cashapp) {
                  // Handle Cash App
                  paymentMethodDetails = {
                    paymentMethod: 'cashapp',
                    paymentBrand: 'Cash App',
                  }
                } else if (pmDetails.type) {
                  // Handle other payment methods
                  const typeDisplayNames: Record<string, string> = {
                    amazon_pay: 'Amazon Pay',
                    link: 'Link',
                    paypal: 'PayPal',
                    cashapp: 'Cash App',
                    afterpay_clearpay: 'Afterpay',
                    klarna: 'Klarna',
                    affirm: 'Affirm',
                    apple_pay: 'Apple Pay',
                    google_pay: 'Google Pay',
                  }
                  paymentMethodDetails = {
                    paymentMethod: pmDetails.type,
                    paymentBrand: typeDisplayNames[pmDetails.type] || pmDetails.type,
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

          // Auto-create customer account if guest checkout
          const orderData = orderDoc.data()
          if (orderData.customerEmail && orderData.promoterSlug) {
            await createGuestAccount(
              db,
              orderData.customerEmail,
              orderData.customerName,
              orderData.promoterSlug,
              orderDoc.id,
              orderData.pricing?.total || orderData.total || 0,
              orderData.customerPhone,
              orderData.billingAddress
            )
          }
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

/**
 * Create a guest customer account after successful purchase
 * Creates Firebase Auth user and tenant customer record
 */
async function createGuestAccount(
  db: FirebaseFirestore.Firestore,
  email: string,
  customerName: string,
  promoterSlug: string,
  orderId: string,
  orderTotal: number,
  phone?: string,
  billingAddress?: { street?: string; city?: string; state?: string; zip?: string; country?: string }
): Promise<void> {
  try {
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
      // Customer exists - update their order stats and contact info
      const customerDoc = existingCustomer.docs[0]
      const customerData = customerDoc.data()

      const updateData: Record<string, any> = {
        orderCount: (customerData.orderCount || 0) + 1,
        totalSpent: (customerData.totalSpent || 0) + orderTotal,
        lastOrderId: orderId,
        lastOrderAt: new Date(),
        updatedAt: new Date(),
      }

      // Always update phone if provided (use most recent contact info)
      if (phone) {
        updateData.phone = phone
      }

      // Always update address if provided (use most recent billing address)
      if (billingAddress && (billingAddress.street || billingAddress.city)) {
        updateData.address = {
          street: billingAddress.street || null,
          city: billingAddress.city || null,
          state: billingAddress.state || null,
          zip: billingAddress.zip || null,
          country: billingAddress.country || 'USA',
        }
      }

      await customerDoc.ref.update(updateData)

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
      phone: phone || null,
      address: billingAddress ? {
        street: billingAddress.street || null,
        city: billingAddress.city || null,
        state: billingAddress.state || null,
        zip: billingAddress.zip || null,
        country: billingAddress.country || 'USA',
      } : null,
      emailVerified: false,
      isGuest: true,
      needsPasswordReset: firebaseUid ? true : false, // Flag to prompt password reset on first login
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
          tempPassword, // Will be removed once email is sent
          orderId,
          loginUrl: `https://${promoterSlug}.venueviz.com/login`, // This should use actual domain config
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
