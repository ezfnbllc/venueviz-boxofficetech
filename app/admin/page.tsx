'use client'

import { useState, useEffect } from 'react'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import { AdminService } from '@/lib/admin/adminService'
import { useTenantContext } from '@/lib/hooks/useTenantContext'
import {
  generateInsights,
  generateTenantInsights,
  getQuickActions,
  AIInsight,
} from '@/lib/services/aiInsightsService'
import { AIInsightsWidget, QuickActionsWidget } from '@/components/admin/AIInsightsWidget'
import { TenantSummaryWidget, TenantInfoBanner } from '@/components/admin/TenantSummaryWidget'
import Link from 'next/link'

export default function AdminDashboard() {
  const { user, isAdmin } = useFirebaseAuth()
  const {
    scope,
    loading: contextLoading,
    allTenants,
    selectedTenantId,
    setSelectedTenantId,
    currentTenant,
    promoterId,
    isMasterAdmin,
    isPromoter,
    scopeLabel,
  } = useTenantContext()

  const [stats, setStats] = useState({
    totalEvents: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
  })
  const [recentEvents, setRecentEvents] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<AIInsight[]>([])

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true)
      try {
        const [events, orders] = await Promise.all([
          AdminService.getEvents(),
          AdminService.getOrders(),
        ])

        // Apply scope-based filtering
        let filteredEvents = events
        let filteredOrders = orders

        // Determine which promoter to filter by:
        // - For master admin with selection: use selectedTenantId (which is promoter ID)
        // - For promoter users: use their promoterId
        const promoterIdToFilter = selectedTenantId || (isPromoter ? promoterId : null)

        if (promoterIdToFilter) {
          // Filter events by promoter ID
          filteredEvents = events.filter((event: any) => {
            const eventPromoterId = event.promoter?.promoterId || event.promoterId
            return eventPromoterId === promoterIdToFilter
          })

          // Filter orders for those events
          const eventIds = new Set(filteredEvents.map((e: any) => e.id))
          filteredOrders = orders.filter((order: any) => eventIds.has(order.eventId))
        }

        // Calculate stats
        const totalRevenue = filteredOrders.reduce((sum: number, order: any) => {
          return sum + (order.pricing?.total || order.total || 0)
        }, 0)

        // Get unique customers from orders
        const customerEmails = new Set<string>()
        filteredOrders.forEach((order: any) => {
          const email =
            order.customer?.email || order.customerEmail || order.buyerEmail || order.email
          if (email && email !== 'N/A') {
            customerEmails.add(email.toLowerCase())
          }
        })

        setStats({
          totalEvents: filteredEvents.length,
          totalOrders: filteredOrders.length,
          totalRevenue,
          totalCustomers: customerEmails.size,
        })

        // Sort events by date
        const sortedEvents = [...filteredEvents].sort((a: any, b: any) => {
          const aTime = a.createdAt?.toDate?.()?.getTime() || 0
          const bTime = b.createdAt?.toDate?.()?.getTime() || 0
          return bTime - aTime
        })

        setRecentEvents(sortedEvents.slice(0, 5))
        setRecentOrders(filteredOrders.slice(0, 10))

        // Generate AI insights
        const dashboardInsights = generateInsights({
          totalEvents: filteredEvents.length,
          totalOrders: filteredOrders.length,
          totalRevenue,
          totalCustomers: customerEmails.size,
          recentOrders: filteredOrders.slice(0, 20),
          recentEvents: sortedEvents.slice(0, 10),
        })

        // Add tenant insights for master admin
        if (isMasterAdmin && !selectedTenantId) {
          const tenantInsights = generateTenantInsights(allTenants)
          setInsights([...tenantInsights, ...dashboardInsights])
        } else {
          setInsights(dashboardInsights)
        }
      } catch (error) {
        console.error('[Dashboard] Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (!contextLoading) {
      loadDashboardData()
    }
  }, [
    contextLoading,
    selectedTenantId,
    promoterId,
    isMasterAdmin,
    isPromoter,
    allTenants,
  ])

  if (loading || contextLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-accent-500"></div>
      </div>
    )
  }

  const quickActions = getQuickActions(scope === 'master' ? 'master' : scope === 'tenant' ? 'tenant' : 'promoter')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Welcome back, {user?.email}
          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            {scopeLabel}
          </span>
        </p>
      </div>

      {/* Master Admin: Tenant Overview */}
      {isMasterAdmin && (
        <TenantSummaryWidget
          tenants={allTenants}
          selectedTenantId={selectedTenantId}
          onSelectTenant={setSelectedTenantId}
          loading={contextLoading}
        />
      )}

      {/* Promoter: Show their promoter info */}
      {isPromoter && currentTenant && (
        <TenantInfoBanner
          tenant={currentTenant}
          tenantRole="Promoter"
        />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Events"
          value={stats.totalEvents}
          icon="🎭"
          color="blue"
        />
        <StatCard
          label="Total Orders"
          value={stats.totalOrders}
          icon="🎫"
          color="green"
        />
        <StatCard
          label="Total Revenue"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          icon="💰"
          color="purple"
        />
        <StatCard
          label="Total Customers"
          value={stats.totalCustomers}
          icon="👥"
          color="orange"
        />
      </div>

      {/* AI Insights & Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIInsightsWidget insights={insights} loading={loading} />
        <QuickActionsWidget actions={quickActions} />
      </div>

      {/* Recent Events & Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Events</h2>
            <Link
              href="/admin/events"
              className="text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 text-sm"
            >
              View All →
            </Link>
          </div>

          {recentEvents.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-2 block">🎭</span>
              <p className="text-slate-500 dark:text-slate-400">No events found</p>
              <Link
                href="/admin/events/new"
                className="inline-block mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Create your first event →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((event: any) => (
                <Link
                  key={event.id}
                  href={`/admin/events/edit/${event.id}`}
                  className="block p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <p className="font-medium text-slate-900 dark:text-white">{event.name || event.basics?.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {event.venueName || event.basics?.venue?.name || 'No venue'}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Orders</h2>
            <Link
              href="/admin/orders"
              className="text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 text-sm"
            >
              View All →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-2 block">🎫</span>
              <p className="text-slate-500 dark:text-slate-400">No orders yet</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                Orders will appear here when customers purchase tickets
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order: any) => (
                <div
                  key={order.id}
                  className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {order.customer?.name || order.customerName || 'Customer'}
                    </p>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      ${order.pricing?.total || order.total || 0}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {order.eventName}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon: string
  color: 'blue' | 'green' | 'purple' | 'orange'
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-slate-500 dark:text-slate-400 text-sm">{label}</p>
        <div
          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-xl`}
        >
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}
