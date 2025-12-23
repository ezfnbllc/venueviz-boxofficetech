'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import Layout from '@/components/public/Layout'

interface Order {
  id: string
  orderId: string
  createdAt: { toDate?: () => Date } | string
  total: number
  status: string
  items: Array<{
    eventName: string
    quantity: number
  }>
}

export default function AccountPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const { user, userData, loading: authLoading, signOut } = useFirebaseAuth()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile')

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/p/${slug}/login`)
    }
  }, [user, authLoading, router, slug])

  // Fetch user's orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return

      try {
        const response = await fetch(`/api/orders?email=${user.email}`)
        if (response.ok) {
          const data = await response.json()
          setOrders(data.orders || [])
        }
      } catch (error) {
        console.error('Error fetching orders:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchOrders()
    }
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    router.push(`/p/${slug}`)
  }

  const formatDate = (date: Order['createdAt']): string => {
    if (!date) return ''
    const d = typeof date === 'string' ? new Date(date) : date.toDate?.() || new Date()
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (authLoading || !user) {
    return (
      <Layout promoterSlug={slug}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6ac045]"></div>
        </div>
      </Layout>
    )
  }

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
              <li className="text-gray-900 font-medium">My Account</li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#6ac045] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {userData?.firstName?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {userData?.firstName && userData?.lastName
                      ? `${userData.firstName} ${userData.lastName}`
                      : user.email}
                  </h1>
                  <p className="text-gray-600">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                Sign Out
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-8">
              <nav className="flex gap-8">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`pb-4 font-medium border-b-2 transition-colors ${
                    activeTab === 'profile'
                      ? 'border-[#6ac045] text-[#6ac045]'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`pb-4 font-medium border-b-2 transition-colors ${
                    activeTab === 'orders'
                      ? 'border-[#6ac045] text-[#6ac045]'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Orders
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      First Name
                    </label>
                    <p className="text-gray-900">{userData?.firstName || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Last Name
                    </label>
                    <p className="text-gray-900">{userData?.lastName || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Email
                    </label>
                    <p className="text-gray-900">{user.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Phone
                    </label>
                    <p className="text-gray-900">{userData?.phone || '-'}</p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Account Status</h3>
                  <div className="flex items-center gap-2">
                    {user.emailVerified ? (
                      <>
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-green-600 text-sm">Email verified</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                        <span className="text-yellow-600 text-sm">Email not verified</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6ac045]"></div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
                    <p className="text-gray-600 mb-6">You haven&apos;t purchased any tickets yet.</p>
                    <Link
                      href={`/p/${slug}/events`}
                      className="inline-block px-6 py-3 bg-[#6ac045] text-white font-medium rounded-lg hover:bg-[#5aa038] transition-colors"
                    >
                      Browse Events
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <Link
                        key={order.id}
                        href={`/p/${slug}/account/orders/${order.orderId || order.id}`}
                        className="block bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:border-[#6ac045] transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 mb-1">
                              {order.items?.[0]?.eventName || 'Event Tickets'}
                            </p>
                            <p className="text-sm text-gray-600">
                              Order #{order.orderId || order.id}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-[#6ac045] mb-1">
                              ${order.total?.toFixed(2) || '0.00'}
                            </p>
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                              order.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              order.status === 'refunded' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
