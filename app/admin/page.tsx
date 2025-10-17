'use client'

import { useState, useEffect } from 'react'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import { AdminService } from '@/lib/admin/adminService'
import { usePromoterFiltering } from '@/lib/hooks/usePromoterFiltering'
import Link from 'next/link'

export default function AdminDashboard() {
  const { user, isAdmin } = useFirebaseAuth()
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0
  })
  const [recentEvents, setRecentEvents] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPromoterId, setCurrentPromoterId] = useState<string>()

  const { activePromoterIds, shouldFilter } = usePromoterFiltering(isAdmin, currentPromoterId)

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true)
      try {
        const [events, orders] = await Promise.all([
          AdminService.getEvents(),
          AdminService.getOrders()
        ])

        console.log('[Dashboard] Total events loaded:', events.length)
        console.log('[Dashboard] Total orders loaded:', orders.length)

        // Apply filtering
        let filteredEvents = events
        let filteredOrders = orders

        if (shouldFilter && activePromoterIds && activePromoterIds.length > 0) {
          filteredEvents = events.filter(event => {
            const eventPromoterId = event.promoter?.promoterId || event.promoterId
            if (!eventPromoterId && isAdmin) return true
            return activePromoterIds.includes(eventPromoterId)
          })

          const eventIds = new Set(filteredEvents.map(e => e.id))
          filteredOrders = orders.filter(order => eventIds.has(order.eventId))
        } else if (shouldFilter && (!activePromoterIds || activePromoterIds.length === 0)) {
          filteredEvents = []
          filteredOrders = []
        }

        // Calculate stats
        const totalRevenue = filteredOrders.reduce((sum, order) => {
          return sum + (order.pricing?.total || order.total || 0)
        }, 0)

        // Get unique customers from orders - check all possible email fields
        const customerEmails = new Set<string>()
        filteredOrders.forEach(order => {
          const email = order.customer?.email || order.customerEmail || order.buyerEmail || order.email
          if (email && email !== 'N/A') {
            customerEmails.add(email.toLowerCase())
          }
        })

        console.log('[Dashboard] Unique customer emails:', customerEmails.size)

        setStats({
          totalEvents: filteredEvents.length,
          totalOrders: filteredOrders.length,
          totalRevenue,
          totalCustomers: customerEmails.size
        })

        // Sort events by date
        const sortedEvents = [...filteredEvents].sort((a, b) => {
          const aTime = a.createdAt?.toDate?.()?.getTime() || 0
          const bTime = b.createdAt?.toDate?.()?.getTime() || 0
          return bTime - aTime
        })

        setRecentEvents(sortedEvents.slice(0, 5))
        setRecentOrders(filteredOrders.slice(0, 10))

      } catch (error) {
        console.error('[Dashboard] Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [activePromoterIds, shouldFilter, isAdmin])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Welcome back, {user?.email}
          {isAdmin && <span className="text-purple-400"> (Master Admin)</span>}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/5 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Total Events</p>
            <span className="text-2xl">🎫</span>
          </div>
          <p className="text-3xl font-bold">{stats.totalEvents}</p>
        </div>

        <div className="bg-white/5 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Total Orders</p>
            <span className="text-2xl">🛒</span>
          </div>
          <p className="text-3xl font-bold">{stats.totalOrders}</p>
        </div>

        <div className="bg-white/5 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Total Revenue</p>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-3xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-white/5 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Total Customers</p>
            <span className="text-2xl">👥</span>
          </div>
          <p className="text-3xl font-bold">{stats.totalCustomers}</p>
        </div>
      </div>

      {/* Recent Events & Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Recent Events</h2>
            <Link href="/admin/events" className="text-purple-400 hover:text-purple-300 text-sm">
              View All →
            </Link>
          </div>
          
          {recentEvents.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No events found</p>
          ) : (
            <div className="space-y-3">
              {recentEvents.map(event => (
                <div key={event.id} className="p-3 bg-white/5 rounded-lg">
                  <p className="font-medium">{event.name}</p>
                  <p className="text-sm text-gray-400">{event.venueName}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/5 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Recent Orders</h2>
            <Link href="/admin/orders" className="text-purple-400 hover:text-purple-300 text-sm">
              View All →
            </Link>
          </div>
          
          {recentOrders.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No orders found</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map(order => (
                <div key={order.id} className="p-3 bg-white/5 rounded-lg">
                  <p className="font-medium">{order.customer?.name || order.customerName}</p>
                  <div className="flex justify-between text-sm text-gray-400 mt-1">
                    <span>{order.eventName}</span>
                    <span>${order.pricing?.total || order.total}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
