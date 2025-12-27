/**
 * Order Confirmation Page
 *
 * Displays order confirmation after successful payment.
 * Shows order details, tickets, and calendar integration options.
 */

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAdminFirestore } from '@/lib/firebase-admin'
import Layout from '@/components/public/Layout'
import TicketCard from '@/components/shared/TicketCard'

interface PageProps {
  params: Promise<{ slug: string; orderId: string }>
  searchParams: Promise<{ payment_intent?: string; payment_intent_client_secret?: string; redirect_status?: string }>
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
    id: string
    ticketId?: string
    tierName?: string
    ticketType?: string
    eventName?: string
    section?: string | null
    row?: number | null
    seat?: number | null
    status?: string
    qrCode?: string
  }>
}

async function getOrder(orderId: string): Promise<OrderData | null> {
  try {
    const db = getAdminFirestore()
    const orderDoc = await db.collection('orders').doc(orderId).get()

    if (!orderDoc.exists) {
      return null
    }

    const data = orderDoc.data()
    return {
      orderId: orderDoc.id,
      ...data,
    } as OrderData
  } catch (error) {
    console.error('Error fetching order:', error)
    return null
  }
}

async function updateOrderStatus(orderId: string, status: string): Promise<void> {
  try {
    const db = getAdminFirestore()
    await db.collection('orders').doc(orderId).update({
      status,
      paidAt: status === 'completed' ? new Date() : null,
      updatedAt: new Date(),
    })
  } catch (error) {
    console.error('Error updating order status:', error)
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params
  const order = await getOrder(resolvedParams.orderId)

  if (!order) {
    return {
      title: 'Order Not Found',
    }
  }

  return {
    title: `Order Confirmed - ${order.orderId}`,
    description: `Your order ${order.orderId} has been confirmed. View your tickets and order details.`,
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function ConfirmationPage({ params, searchParams }: PageProps) {
  const { slug, orderId } = await params
  const resolvedSearchParams = await searchParams

  const order = await getOrder(orderId)

  if (!order) {
    notFound()
  }

  // Update order status based on Stripe redirect status
  // Only update if order is still pending and payment succeeded
  if (order.status === 'pending' && resolvedSearchParams.redirect_status === 'succeeded') {
    await updateOrderStatus(orderId, 'completed')
    order.status = 'completed' // Update local reference for display
  }

  // Format date
  const orderDate = order.paidAt?.toDate?.() || order.createdAt?.toDate?.() || new Date()
  const formattedDate = orderDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  // Get event info from first item
  const primaryEvent = order.items?.[0]

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
              <li className="text-gray-900 dark:text-white font-medium">Booking Confirmed</li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-12 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            {/* Confirmation Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
              {/* Success Header */}
              <div className="text-center p-8 bg-gradient-to-b from-green-50 dark:from-green-900/20 to-white dark:to-gray-800">
                <div className="w-20 h-20 bg-[#6ac045] rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Booking Confirmed</h1>
                <p className="text-gray-600 dark:text-gray-300 max-w-sm mx-auto">
                  We are pleased to inform you that your reservation request has been received and confirmed.
                </p>

                {/* Add to Calendar */}
                <div className="mt-6">
                  <span className="text-sm text-gray-500 dark:text-gray-400 block mb-3">Add to Calendar</span>
                  <div className="flex justify-center gap-3">
                    <button className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors">
                      <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22 3.5v17c0 .83-.67 1.5-1.5 1.5H3.5c-.83 0-1.5-.67-1.5-1.5v-17C2 2.67 2.67 2 3.5 2H5v2h2V2h10v2h2V2h1.5c.83 0 1.5.67 1.5 1.5zM4 8h16v12.5c0 .28-.22.5-.5.5h-15c-.28 0-.5-.22-.5-.5V8z"/>
                      </svg>
                    </button>
                    <button className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors">
                      <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83"/>
                      </svg>
                    </button>
                    <button className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors">
                      <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </button>
                    <button className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors">
                      <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.999 5.125h-2.499V3.25h-1.25v1.875h-8.75V3.25h-1.25v1.875H3.999c-.69 0-1.25.56-1.25 1.25v12.5c0 .69.56 1.25 1.25 1.25h16c.69 0 1.25-.56 1.25-1.25v-12.5c0-.69-.56-1.25-1.25-1.25zm0 13.75H3.999V10h16v8.875z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Order Details */}
              <div className="p-6 border-t border-gray-100 dark:border-gray-700">
                {/* Event Info */}
                {primaryEvent && (
                  <div className="flex gap-4 mb-6">
                    {primaryEvent.eventImage ? (
                      <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={primaryEvent.eventImage}
                          alt={primaryEvent.eventName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1">
                      <h2 className="font-semibold text-gray-900 dark:text-white mb-1">{primaryEvent.eventName}</h2>
                      <span className="text-sm text-gray-600 dark:text-gray-300 block mb-2">{formattedDate}</span>
                      <div className="text-sm text-gray-600 dark:text-gray-300">{order.customerName}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <svg className="w-4 h-4 text-[#6ac045]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M15.5 13.5l1 1v1H8v-1l1-1h6.5zm-5-5.5v1h3v-1h-3zm-4 0v1h3v-1h-3zm0 3v1h3v-1h-3zm4 0v1h3v-1h-3zm4 0v1h3v-1h-3zm-8-6h12v10H6.5V5zm0-2c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-12z"/>
                        </svg>
                        <span className="text-sm text-gray-900 dark:text-white">
                          <span className="font-medium">{order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1}</span> x Ticket
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="font-semibold text-[#6ac045]">
                          Total: ${order.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* View Ticket Button */}
                <Link
                  href={`/p/${slug}/account/orders/${orderId}`}
                  className="inline-flex items-center justify-center gap-2 w-full h-12 px-6 text-base font-semibold text-white bg-[#6ac045] rounded-lg hover:bg-[#5aa038] transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  View Ticket
                </Link>

                {/* Order Info */}
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Order Number</span>
                      <p className="font-medium text-gray-900 dark:text-white">{order.orderId}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Email</span>
                      <p className="font-medium text-gray-900 dark:text-white">{order.customerEmail}</p>
                    </div>
                  </div>
                </div>

                {/* Tickets with QR Codes */}
                {order.tickets && order.tickets.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Your Tickets</h3>
                    <div className="space-y-3">
                      {order.tickets.map((ticket, index) => (
                        <TicketCard
                          key={ticket.id || ticket.ticketId || index}
                          ticket={{
                            id: ticket.id || ticket.ticketId || `ticket-${index}`,
                            tierName: ticket.tierName || ticket.ticketType,
                            section: ticket.section,
                            row: ticket.row,
                            seat: ticket.seat,
                            eventName: ticket.eventName,
                            status: ticket.status,
                          }}
                          index={index}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Links */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={`/p/${slug}/events`}
                className="text-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Browse More Events
              </Link>
              <Link
                href={`/p/${slug}`}
                className="text-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Back to Home
              </Link>
            </div>

            {/* Confirmation sent notice */}
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
              A confirmation email has been sent to <strong className="text-gray-900 dark:text-white">{order.customerEmail}</strong>
            </p>
          </div>
        </div>
      </div>

    </Layout>
  )
}
