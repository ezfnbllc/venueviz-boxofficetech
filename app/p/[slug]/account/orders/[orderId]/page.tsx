/**
 * Order Detail Page
 *
 * Displays order details and tickets with full event information
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'
import { getAdminFirestore } from '@/lib/firebase-admin'
import Layout from '@/components/public/Layout'
import TicketCard from '@/components/shared/TicketCard'

interface PageProps {
  params: { slug: string; orderId: string }
}

interface EventData {
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

interface OrderData {
  orderId: string
  status: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  eventId?: string
  items: Array<{
    eventId: string
    eventName: string
    eventImage?: string
    ticketType?: string
    quantity: number
    price: number
  }>
  subtotal: number
  serviceFee: number
  total: number
  currency: string
  createdAt: any
  paidAt?: any
  qrCode?: string
  tickets?: Array<{
    ticketId: string
    id?: string
    eventName: string
    ticketType?: string
    tierName?: string
    qrCode: string
    status: string
    section?: string
    row?: string | number
    seat?: string | number
  }>
  // Payment information
  paymentMethod?: string
  paymentBrand?: string
  paymentLast4?: string
  stripePaymentIntentId?: string
}

async function getOrder(orderId: string): Promise<OrderData | null> {
  try {
    const db = getAdminFirestore()

    // Try to find by orderId field first
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
    return {
      orderId: data?.orderId || orderDoc.id,
      ...data,
    } as OrderData
  } catch (error) {
    console.error('Error fetching order:', error)
    return null
  }
}

async function getEventDetails(eventId: string): Promise<EventData | null> {
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const order = await getOrder(params.orderId)

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
  const order = await getOrder(orderId)

  if (!order) {
    notFound()
  }

  const orderDate = order.paidAt?.toDate?.() || order.createdAt?.toDate?.() || new Date()
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

  // Format event date
  const eventDate = event?.startDate
  const formattedEventDate = eventDate
    ? eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  // Format time (convert 24h to 12h format)
  const formatTime = (time?: string) => {
    if (!time) return null
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hour12 = hours % 12 || 12
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  // Build venue address
  const getVenueAddress = () => {
    if (!event?.venue) return null
    const parts = [
      event.venue.streetAddress1,
      event.venue.streetAddress2,
      event.venue.city,
      event.venue.state,
      event.venue.zipCode,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : null
  }

  // Get payment method display
  const getPaymentMethodDisplay = () => {
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

  const eventImage = event?.bannerImage || event?.thumbnail || primaryEvent?.eventImage
  const venueAddress = getVenueAddress()
  const paymentMethod = getPaymentMethodDisplay()

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
                  order.status === 'confirmed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
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
