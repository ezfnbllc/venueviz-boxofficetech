/**
 * Order Detail Page
 *
 * Displays order details and tickets
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { getAdminFirestore } from '@/lib/firebase-admin'
import Layout from '@/components/public/Layout'
import TicketCard from '@/components/shared/TicketCard'

interface PageProps {
  params: { slug: string; orderId: string }
}

interface OrderData {
  orderId: string
  status: string
  customerName: string
  customerEmail: string
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
    eventName: string
    ticketType: string
    qrCode: string
    status: string
  }>
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
  const formattedDate = orderDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const primaryEvent = order.items?.[0]

  return (
    <Layout promoterSlug={slug}>
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <nav aria-label="breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <Link href={`/p/${slug}`} className="text-gray-600 hover:text-[#6ac045]">
                  Home
                </Link>
              </li>
              <li className="text-gray-400">/</li>
              <li>
                <Link href={`/p/${slug}/account`} className="text-gray-600 hover:text-[#6ac045]">
                  My Account
                </Link>
              </li>
              <li className="text-gray-400">/</li>
              <li className="text-gray-900 font-medium">Order {order.orderId}</li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Order Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900">Order #{order.orderId}</h1>
                <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                  order.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  order.status === 'refunded' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                </span>
              </div>
              <p className="text-gray-600">{formattedDate}</p>
            </div>

            {/* Event Info */}
            {primaryEvent && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Event</h2>
                <div className="flex gap-4">
                  {primaryEvent.eventImage ? (
                    <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={primaryEvent.eventImage}
                        alt={primaryEvent.eventName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{primaryEvent.eventName}</h3>
                    <Link
                      href={`/p/${slug}/events/${primaryEvent.eventId}`}
                      className="text-[#6ac045] hover:underline text-sm mt-1 inline-block"
                    >
                      View Event Details
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Tickets */}
            {order.tickets && order.tickets.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Tickets</h2>
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-3">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.ticketType || 'Ticket'} x{item.quantity}
                    </span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-3 mt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>${order.subtotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-600">Service Fee</span>
                    <span>${order.serviceFee?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg mt-4">
                    <span>Total</span>
                    <span className="text-[#6ac045]">${order.total?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Name</label>
                  <p className="text-gray-900">{order.customerName}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Email</label>
                  <p className="text-gray-900">{order.customerEmail}</p>
                </div>
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
