/**
 * Customer Account Page
 *
 * Shows customer profile, upcoming tickets, and past orders.
 * Uses tenant-scoped authentication - only shows orders for this promoter.
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import Layout from '@/components/public/Layout'

interface OrderData {
  id: string
  orderId: string
  status: string
  eventName: string
  eventDate: string | null
  eventTime: string | null
  eventImage: string | null
  venueName: string | null
  venueLocation: string | null
  items: any[]
  tickets: any[]
  total: number
  currency: string
  qrCode: string | null
  createdAt: string | null
  isPastEvent: boolean
}

export default function AccountPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const { user, tenantCustomer, loading: authLoading, loadTenantCustomer, signOut } = useFirebaseAuth()

  const [orders, setOrders] = useState<OrderData[]>([])
  const [upcomingOrders, setUpcomingOrders] = useState<OrderData[]>([])
  const [pastOrders, setPastOrders] = useState<OrderData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')

  // Check auth and load tenant customer
  useEffect(() => {
    const checkAuth = async () => {
      if (authLoading) return

      if (!user) {
        router.push(`/p/${slug}/login`)
        return
      }

      if (!tenantCustomer) {
        const customer = await loadTenantCustomer(slug)
        if (!customer) {
          // User is logged in but not a customer of this tenant
          router.push(`/p/${slug}/register`)
          return
        }
      }
    }
    checkAuth()
  }, [user, tenantCustomer, authLoading, router, slug, loadTenantCustomer])

  // Fetch orders when customer is loaded
  useEffect(() => {
    const fetchOrders = async () => {
      if (!tenantCustomer?.email) return

      try {
        const res = await fetch(
          `/api/customers/orders?email=${encodeURIComponent(tenantCustomer.email)}&promoterSlug=${encodeURIComponent(slug)}`
        )
        const data = await res.json()

        if (data.success) {
          setOrders(data.orders || [])
          setUpcomingOrders(data.upcomingOrders || [])
          setPastOrders(data.pastOrders || [])
        }
      } catch (error) {
        console.error('Error fetching orders:', error)
      } finally {
        setLoading(false)
      }
    }

    if (tenantCustomer) {
      fetchOrders()
    }
  }, [tenantCustomer, slug])

  const handleSignOut = async () => {
    await signOut()
    router.push(`/p/${slug}`)
  }

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Date TBD'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Format time for display
  const formatTime = (time: string | null) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':').map(Number)
    if (isNaN(hours) || isNaN(minutes)) return time
    const period = hours >= 12 ? 'PM' : 'AM'
    const hour12 = hours % 12 || 12
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  // Show loading while auth is being checked
  if (authLoading || (!user && !tenantCustomer)) {
    return (
      <Layout promoterSlug={slug}>
        <section className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 bg-[#f9fafb]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary,#6ac045)]"></div>
        </section>
      </Layout>
    )
  }

  const displayOrders = activeTab === 'upcoming' ? upcomingOrders : pastOrders

  return (
    <Layout promoterSlug={slug}>
      <section className="min-h-[calc(100vh-140px)] py-12 bg-[#f9fafb]">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Profile Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[var(--color-primary,#6ac045)] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {tenantCustomer?.firstName?.[0]?.toUpperCase() || tenantCustomer?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {tenantCustomer?.firstName
                      ? `${tenantCustomer.firstName}${tenantCustomer.lastName ? ` ${tenantCustomer.lastName}` : ''}`
                      : 'Welcome'}
                  </h1>
                  <p className="text-gray-600">{tenantCustomer?.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                Sign Out
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{orders.length}</div>
                <div className="text-sm text-gray-500">Total Orders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--color-primary,#6ac045)]">{upcomingOrders.length}</div>
                <div className="text-sm text-gray-500">Upcoming Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400">{pastOrders.length}</div>
                <div className="text-sm text-gray-500">Past Events</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'upcoming'
                  ? 'bg-[var(--color-primary,#6ac045)] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Upcoming Tickets ({upcomingOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'past'
                  ? 'bg-[var(--color-primary,#6ac045)] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Past Events ({pastOrders.length})
            </button>
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary,#6ac045)] mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading your tickets...</p>
            </div>
          ) : displayOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {activeTab === 'upcoming' ? 'No Upcoming Events' : 'No Past Events'}
              </h3>
              <p className="text-gray-500 mb-6">
                {activeTab === 'upcoming'
                  ? "You don't have any upcoming tickets. Browse events to find your next experience!"
                  : "You don't have any past event history yet."}
              </p>
              {activeTab === 'upcoming' && (
                <Link
                  href={`/p/${slug}/events`}
                  className="inline-block px-6 py-3 bg-[var(--color-primary,#6ac045)] text-white font-medium rounded-lg hover:bg-[var(--color-primary-dark,#5aa038)] transition-colors"
                >
                  Browse Events
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {displayOrders.map((order) => (
                <div
                  key={order.id}
                  className={`bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden ${
                    order.isPastEvent ? 'opacity-75' : ''
                  }`}
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Event Image */}
                    <div className="md:w-48 h-32 md:h-auto flex-shrink-0">
                      {order.eventImage ? (
                        <img
                          src={order.eventImage}
                          alt={order.eventName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full min-h-[128px] bg-gradient-to-br from-[var(--color-primary,#6ac045)] to-[var(--color-primary-dark,#5aa038)] flex items-center justify-center">
                          <svg className="w-12 h-12 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Event Details */}
                    <div className="flex-1 p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {order.eventName}
                          </h3>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>
                                {formatDate(order.eventDate)}
                                {order.eventTime && ` at ${formatTime(order.eventTime)}`}
                              </span>
                            </div>
                            {order.venueName && (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>
                                  {order.venueName}
                                  {order.venueLocation && `, ${order.venueLocation}`}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Ticket Count */}
                          <div className="mt-3">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--color-primary,#6ac045)]/10 text-[var(--color-primary,#6ac045)]">
                              {order.tickets?.length || order.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 1} {order.tickets?.length === 1 ? 'Ticket' : 'Tickets'}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 md:items-end">
                          {!order.isPastEvent && order.qrCode && (
                            <Link
                              href={`/p/${slug}/tickets/${order.orderId}`}
                              className="inline-flex items-center justify-center px-4 py-2 bg-[var(--color-primary,#6ac045)] text-white font-medium rounded-lg hover:bg-[var(--color-primary-dark,#5aa038)] transition-colors text-sm"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                              </svg>
                              View Tickets
                            </Link>
                          )}
                          <Link
                            href={`/p/${slug}/orders/${order.orderId}`}
                            className="inline-flex items-center justify-center px-4 py-2 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
                          >
                            Order Details
                          </Link>
                          <div className="text-sm text-gray-500">
                            Order #{order.orderId.slice(-8).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  )
}
