/**
 * Order Detail Page
 *
 * Displays order details and tickets with full event information.
 * Uses shared orderService for core platform functionality.
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'
import Stripe from 'stripe'
import Layout from '@/components/public/Layout'
import TicketCard from '@/components/shared/TicketCard'
import { getAdminFirestore } from '@/lib/firebase-admin'
import {
  getOrderById,
  getEventDetails,
  formatTime,
  formatEventDate,
  formatVenueAddress,
  formatPaymentMethod,
  getEventImage,
} from '@/lib/services/orderService'

/**
 * Verify and update order status from Stripe if still pending
 * This handles cases where webhook hasn't fired yet
 */
async function verifyAndUpdateOrderStatus(
  order: any,
  promoterSlug: string
): Promise<{ status: string; paymentMethod?: string }> {
  // Only check Stripe if order is pending and has a payment intent
  if (order.status !== 'pending' || !order.stripePaymentIntentId) {
    return { status: order.status }
  }

  try {
    const db = getAdminFirestore()

    // Get promoter's Stripe credentials
    const promoterSnapshot = await db.collection('promoters')
      .where('slug', '==', promoterSlug)
      .limit(1)
      .get()

    if (promoterSnapshot.empty) return { status: order.status }

    const promoterId = promoterSnapshot.docs[0].id
    const gatewaySnapshot = await db.collection('payment_gateways')
      .where('promoterId', '==', promoterId)
      .limit(1)
      .get()

    if (gatewaySnapshot.empty) return { status: order.status }

    const gateway = gatewaySnapshot.docs[0].data()
    if (gateway.provider !== 'stripe' || !gateway.credentials?.secretKey) {
      return { status: order.status }
    }

    const stripe = new Stripe(gateway.credentials.secretKey, { apiVersion: '2023-10-16' })

    // Fetch payment intent status
    const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId)

    if (paymentIntent.status === 'succeeded') {
      // Payment succeeded but order wasn't updated - update it now
      let paymentMethodDetails: Record<string, any> = {}
      let paymentMethodDisplay = ''

      const chargeId = paymentIntent.latest_charge as string
      if (chargeId) {
        const charge = await stripe.charges.retrieve(chargeId)
        const pmDetails = charge.payment_method_details

        if (pmDetails?.card) {
          paymentMethodDetails = {
            paymentMethod: 'card',
            paymentBrand: pmDetails.card.brand || null,
            paymentLast4: pmDetails.card.last4 || null,
          }
          paymentMethodDisplay = `${pmDetails.card.brand} ending in ${pmDetails.card.last4}`
        } else if ((pmDetails as any)?.amazon_pay) {
          paymentMethodDetails = { paymentMethod: 'amazon_pay', paymentBrand: 'Amazon Pay' }
          paymentMethodDisplay = 'Amazon Pay'
        } else if ((pmDetails as any)?.link) {
          paymentMethodDetails = { paymentMethod: 'link', paymentBrand: 'Link' }
          paymentMethodDisplay = 'Link'
        } else if ((pmDetails as any)?.paypal) {
          paymentMethodDetails = { paymentMethod: 'paypal', paymentBrand: 'PayPal' }
          paymentMethodDisplay = 'PayPal'
        } else if ((pmDetails as any)?.cashapp) {
          paymentMethodDetails = { paymentMethod: 'cashapp', paymentBrand: 'Cash App' }
          paymentMethodDisplay = 'Cash App'
        } else if (pmDetails?.type) {
          const typeDisplayNames: Record<string, string> = {
            amazon_pay: 'Amazon Pay',
            link: 'Link',
            paypal: 'PayPal',
            cashapp: 'Cash App',
            afterpay_clearpay: 'Afterpay',
            klarna: 'Klarna',
            affirm: 'Affirm',
          }
          paymentMethodDetails = {
            paymentMethod: pmDetails.type,
            paymentBrand: typeDisplayNames[pmDetails.type] || pmDetails.type,
          }
          paymentMethodDisplay = typeDisplayNames[pmDetails.type] || pmDetails.type
        }
      }

      // Update order in Firestore
      await db.collection('orders').doc(order.id).update({
        status: 'confirmed',
        paymentStatus: 'paid',
        paidAt: new Date(),
        ...paymentMethodDetails,
        updatedAt: new Date(),
      })

      return { status: 'confirmed', paymentMethod: paymentMethodDisplay }
    }

    return { status: order.status }
  } catch (error) {
    console.error('Error verifying order status:', error)
    return { status: order.status }
  }
}

interface PageProps {
  params: { slug: string; orderId: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const order = await getOrderById(params.orderId)

  if (!order) {
    return { title: 'Order Not Found' }
  }

  return {
    title: `Order ${order.orderId}`,
    description: `View order details for ${order.orderId}`,
    robots: { index: false, follow: false },
  }
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { slug, orderId } = params
  const order = await getOrderById(orderId)

  if (!order) {
    notFound()
  }

  // Verify payment status with Stripe if order is still pending
  // This handles cases where webhook hasn't fired yet
  const { status: verifiedStatus, paymentMethod: stripePaymentMethod } =
    await verifyAndUpdateOrderStatus(order, slug)

  // Update order status for display
  if (verifiedStatus !== order.status) {
    order.status = verifiedStatus
  }

  // Format order date
  const orderDate = order.paidAt || order.createdAt || new Date()
  const formattedOrderDate = orderDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const primaryEvent = order.items?.[0]

  // Fetch full event details
  const eventId = order.eventId || primaryEvent?.eventId
  const event = eventId ? await getEventDetails(eventId) : null

  // Format event date using shared utility
  const formattedEventDate = formatEventDate(event?.startDate)

  // Get event image and venue address using shared utilities
  const eventImage = getEventImage(event, primaryEvent)
  const venueAddress = formatVenueAddress(event?.venue)
  // Use Stripe payment method if we just verified, otherwise from order
  const paymentMethod = stripePaymentMethod || formatPaymentMethod(order)

  return (
    <Layout promoterSlug={slug}>
      {/* Breadcrumb */}
      <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <nav aria-label="breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <Link href={`/p/${slug}`} className="text-gray-600 dark:text-gray-300 hover:text-[#6ac045]">
                  Home
                </Link>
              </li>
              <li className="text-gray-400">/</li>
              <li>
                <Link href={`/p/${slug}/account`} className="text-gray-600 dark:text-gray-300 hover:text-[#6ac045]">
                  My Account
                </Link>
              </li>
              <li className="text-gray-400">/</li>
              <li className="text-gray-900 dark:text-white font-medium">Order {order.orderId}</li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Order Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Order #{order.orderId}</h1>
                <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                  order.status === 'confirmed' || order.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                  order.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                  order.status === 'refunded' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                  'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                  {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-300">Ordered on {formattedOrderDate}</p>
            </div>

            {/* Event Info */}
            {(event || primaryEvent) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6">
                {/* Event Image */}
                {eventImage ? (
                  <div className="relative w-full h-48 sm:h-56">
                    <Image
                      src={eventImage}
                      alt={event?.name || primaryEvent?.eventName || 'Event'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 768px"
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 sm:h-56 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}

                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    {event?.name || primaryEvent?.eventName}
                  </h2>

                  <div className="space-y-3">
                    {/* Date & Time */}
                    {(formattedEventDate || event?.startTime) && (
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-[#6ac045] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          {formattedEventDate && (
                            <p className="text-gray-900 dark:text-white font-medium">{formattedEventDate}</p>
                          )}
                          {event?.startTime && (
                            <p className="text-gray-600 dark:text-gray-300 text-sm">
                              {formatTime(event.startTime)}
                              {event.endTime && ` - ${formatTime(event.endTime)}`}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Doors Open */}
                    {event?.doorsOpenTime && (
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-[#6ac045] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-gray-600 dark:text-gray-300 text-sm">
                            Doors open at {formatTime(event.doorsOpenTime)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Venue */}
                    {event?.venue?.name && (
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-[#6ac045] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium">{event.venue.name}</p>
                          {venueAddress && (
                            <p className="text-gray-600 dark:text-gray-300 text-sm">{venueAddress}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* View Event Link */}
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Link
                      href={`/p/${slug}/events/${event?.slug || eventId}`}
                      className="text-[#6ac045] hover:underline text-sm font-medium inline-flex items-center"
                    >
                      View Event Details
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Tickets */}
            {order.tickets && order.tickets.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Tickets</h2>
                <div className="space-y-4">
                  {order.tickets.map((ticket, index) => (
                    <TicketCard
                      key={ticket.ticketId || ticket.id || index}
                      ticket={{
                        id: ticket.ticketId || ticket.id,
                        tierName: ticket.ticketType || ticket.tierName,
                        section: ticket.section,
                        row: ticket.row,
                        seat: ticket.seat,
                        status: ticket.status,
                      }}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h2>
              <div className="space-y-3">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">
                      {item.ticketType || 'Ticket'} x{item.quantity}
                    </span>
                    <span className="text-gray-900 dark:text-white">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Subtotal</span>
                    <span className="text-gray-900 dark:text-white">${order.subtotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-600 dark:text-gray-300">Service Fee</span>
                    <span className="text-gray-900 dark:text-white">${order.serviceFee?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg mt-4 text-gray-900 dark:text-white">
                    <span>Total</span>
                    <span className="text-[#6ac045]">${order.total?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            {paymentMethod && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Method</h2>
                <div className="flex items-center gap-3">
                  {(order.paymentBrand || order.paymentMethod) && (
                    <div className="flex-shrink-0">
                      {order.paymentBrand?.toLowerCase() === 'visa' && (
                        <svg className="w-10 h-6" viewBox="0 0 48 32" fill="none">
                          <rect width="48" height="32" rx="4" fill="#1A1F71"/>
                          <path d="M19.5 21.5L21 10.5H24L22.5 21.5H19.5Z" fill="white"/>
                          <path d="M32 10.7C31.3 10.4 30.3 10.1 29 10.1C26 10.1 24 11.5 24 13.5C24 15 25.5 15.8 26.5 16.3C27.6 16.8 28 17.2 28 17.7C28 18.5 27 18.8 26 18.8C24.5 18.8 23.7 18.6 22.5 18.1L22 17.9L21.5 21C22.5 21.4 24 21.7 25.5 21.7C28.7 21.7 30.5 20.3 30.5 18.2C30.5 16.1 28.7 15.2 27 14.5C25.9 14 25.5 13.6 25.5 13.1C25.5 12.5 26.2 12 27.3 12C28.3 12 29 12.1 29.6 12.4L29.9 12.5L30.4 10.8L32 10.7Z" fill="white"/>
                          <path d="M35.5 10.5C35 10.5 34.5 10.7 34.3 11.2L30 21.5H33L33.5 20H37.5L37.8 21.5H40.5L38 10.5H35.5ZM34.2 17.5L35.5 13.5L36.2 17.5H34.2Z" fill="white"/>
                          <path d="M17 10.5L14 18.5L13.7 17L12.5 11.5C12.3 10.8 11.7 10.5 11 10.5H6.5L6.4 10.8C7.8 11.1 9 11.6 10 12.2L12.5 21.5H15.7L20 10.5H17Z" fill="white"/>
                        </svg>
                      )}
                      {order.paymentBrand?.toLowerCase() === 'mastercard' && (
                        <svg className="w-10 h-6" viewBox="0 0 48 32" fill="none">
                          <rect width="48" height="32" rx="4" fill="#1A1F71"/>
                          <circle cx="19" cy="16" r="8" fill="#EB001B"/>
                          <circle cx="29" cy="16" r="8" fill="#F79E1B"/>
                          <path d="M24 10.8C25.8 12.3 27 14.5 27 17C27 19.5 25.8 21.7 24 23.2C22.2 21.7 21 19.5 21 17C21 14.5 22.2 12.3 24 10.8Z" fill="#FF5F00"/>
                        </svg>
                      )}
                      {order.paymentBrand?.toLowerCase() === 'amex' && (
                        <svg className="w-10 h-6" viewBox="0 0 48 32" fill="none">
                          <rect width="48" height="32" rx="4" fill="#006FCF"/>
                          <path d="M8 16L11 10H15L18 16L21 10H25L20 22H16L13 16L10 22H6L11 10" fill="white"/>
                          <path d="M25 10H40V13H28V15H39V18H28V20H40V22H25V10Z" fill="white"/>
                        </svg>
                      )}
                      {(order.paymentMethod === 'amazon_pay' || order.paymentBrand?.toLowerCase() === 'amazon pay') && (
                        <svg className="w-10 h-6" viewBox="0 0 48 32" fill="none">
                          <rect width="48" height="32" rx="4" fill="#FF9900"/>
                          <path d="M24 8c-4.4 0-8 3.6-8 8s3.6 8 8 8c2.2 0 4.2-.9 5.7-2.3" stroke="#232F3E" strokeWidth="2" fill="none"/>
                          <path d="M14 20c2 2 5.5 4 10 4s8-2 10-4" stroke="#232F3E" strokeWidth="2" fill="none" strokeLinecap="round"/>
                          <path d="M34 18l-2 4 4-1" fill="#232F3E"/>
                        </svg>
                      )}
                      {order.paymentMethod === 'link' && (
                        <div className="w-10 h-6 bg-[#00D66F] rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">Link</span>
                        </div>
                      )}
                      {order.paymentMethod === 'paypal' && (
                        <svg className="w-10 h-6" viewBox="0 0 48 32" fill="none">
                          <rect width="48" height="32" rx="4" fill="#003087"/>
                          <path d="M19 10h6c3 0 5 2 4.5 5s-3 5-6 5h-2l-1 4h-3l2.5-14z" fill="#009CDE"/>
                          <path d="M16 12h6c3 0 5 2 4.5 5s-3 5-6 5h-2l-1 4h-3l2.5-14z" fill="white"/>
                        </svg>
                      )}
                      {!['visa', 'mastercard', 'amex'].includes(order.paymentBrand?.toLowerCase() || '') &&
                       order.paymentMethod !== 'amazon_pay' &&
                       order.paymentBrand?.toLowerCase() !== 'amazon pay' &&
                       order.paymentMethod !== 'link' &&
                       order.paymentMethod !== 'paypal' && (
                        <div className="w-10 h-6 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium">{paymentMethod}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Name</label>
                  <p className="text-gray-900 dark:text-white">{order.customerName}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Email</label>
                  <p className="text-gray-900 dark:text-white">{order.customerEmail}</p>
                </div>
                {order.customerPhone && (
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Phone</label>
                    <p className="text-gray-900 dark:text-white">{order.customerPhone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Back Link */}
            <div className="mt-8 text-center">
              <Link
                href={`/p/${slug}/account`}
                className="text-[#6ac045] hover:underline font-medium inline-flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to My Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
