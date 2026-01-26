'use client'

import { useState, useEffect } from 'react'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import { AdminService } from '@/lib/admin/adminService'
import { useTenantContext } from '@/lib/hooks/useTenantContext'
import {
  generateInsights,
  generateTenantInsights,
  AIInsight,
} from '@/lib/services/aiInsightsService'
import { QuickActionsBar } from '@/components/admin/QuickActionsBar'
import { ActivityFeed, StatsSummary } from '@/components/admin/ActivityFeed'
import {
  RevenueChart,
  OrdersChart,
  PromoterBreakdown,
  CustomerMap,
} from '@/components/admin/DashboardCharts'
import Link from 'next/link'

export default function AdminDashboard() {
  const { user } = useFirebaseAuth()
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
  const [allEvents, setAllEvents] = useState<any[]>([])
  const [allOrders, setAllOrders] = useState<any[]>([])
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

        // Create event lookup map
        const eventsMap = new Map(events.map((e: any) => [e.id, e]))

        // Enrich orders with event data
        const enrichedOrders = orders.map((order: any) => {
          const event = eventsMap.get(order.eventId)
          return {
            ...order,
            event,
            eventName: order.eventName || event?.name || event?.basics?.name,
            venueName: order.venueName || event?.venueName || event?.basics?.venue?.name,
          }
        })

        // Apply scope-based filtering
        let filteredEvents = events
        let filteredOrders = enrichedOrders

        // Determine which promoter to filter by
        const promoterIdToFilter = selectedTenantId || (isPromoter ? promoterId : null)

        if (promoterIdToFilter) {
          filteredEvents = events.filter((event: any) => {
            const eventPromoterId = event.promoter?.promoterId || event.promoterId
            return eventPromoterId === promoterIdToFilter
          })

          const eventIds = new Set(filteredEvents.map((e: any) => e.id))
          filteredOrders = enrichedOrders.filter((order: any) => eventIds.has(order.eventId))
        }

        // Calculate stats
        const totalRevenue = filteredOrders.reduce((sum: number, order: any) => {
          return sum + (order.pricing?.total || order.total || 0)
        }, 0)

        const customerEmails = new Set<string>()
        filteredOrders.forEach((order: any) => {
          const email = order.customer?.email || order.customerEmail || order.buyerEmail || order.email
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

        setAllEvents(filteredEvents)
        setAllOrders(filteredOrders)

        // Generate AI insights
        const dashboardInsights = generateInsights({
          totalEvents: filteredEvents.length,
          totalOrders: filteredOrders.length,
          totalRevenue,
          totalCustomers: customerEmails.size,
          recentOrders: filteredOrders.slice(0, 20),
          recentEvents: filteredEvents.slice(0, 10),
        })

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
  }, [contextLoading, selectedTenantId, promoterId, isMasterAdmin, isPromoter, allTenants])

  if (loading || contextLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</span>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              {scopeLabel}
            </span>
          </div>
        </div>
        <QuickActionsBar scope={scope === 'master' ? 'master' : 'promoter'} />
      </div>

      {/* Promoter Selector for Master Admin */}
      {isMasterAdmin && (
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏢</span>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Viewing:</span>
          </div>
          <select
            value={selectedTenantId || 'all'}
            onChange={(e) => setSelectedTenantId(e.target.value === 'all' ? null : e.target.value)}
            className="flex-1 max-w-xs px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Promoters ({allTenants.length})</option>
            {allTenants.filter(t => t.active).map(tenant => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
          <Link
            href="/admin/promoters"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Manage →
          </Link>
        </div>
      )}

      {/* Stats Summary */}
      <StatsSummary stats={stats} />

      {/* AI Insights Banner */}
      {insights.length > 0 && (
        <div className="bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 dark:from-purple-500/20 dark:via-blue-500/20 dark:to-purple-500/20 rounded-xl p-4 border border-purple-200/50 dark:border-purple-500/30">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              AI
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {insights[0].title}
                </span>
                {insights[0].metric && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-white dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                    {insights[0].metric}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{insights[0].description}</p>
              {insights[0].actionHref && (
                <Link
                  href={insights[0].actionHref}
                  className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline"
                >
                  {insights[0].actionLabel} →
                </Link>
              )}
            </div>
            {insights.length > 1 && (
              <span className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-1 rounded-full">
                +{insights.length - 1} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Revenue Trend</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Last 30 days</p>
            </div>
            <Link href="/admin/reports" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              View Report
            </Link>
          </div>
          <RevenueChart orders={allOrders} />
        </div>

        {/* Orders by Day */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Orders</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Last 7 days</p>
            </div>
            <Link href="/admin/orders" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              View All
            </Link>
          </div>
          <OrdersChart orders={allOrders} />
        </div>
      </div>

      {/* Bottom Section: Activity + Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
            <div className="flex items-center gap-4">
              <Link href="/admin/events" className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600">
                Events
              </Link>
              <Link href="/admin/orders" className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600">
                Orders
              </Link>
            </div>
          </div>
          <div className="p-2 max-h-[400px] overflow-y-auto">
            <ActivityFeed events={allEvents} orders={allOrders} maxItems={12} />
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Events by Promoter (Master Admin only) */}
          {isMasterAdmin && !selectedTenantId && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">Events by Promoter</h3>
              </div>
              <PromoterBreakdown events={allEvents} promoters={allTenants} />
            </div>
          )}

          {/* Customer Locations */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Customer Locations</h3>
              <Link href="/admin/customers" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                View All
              </Link>
            </div>
            <CustomerMap orders={allOrders} />
          </div>

          {/* More AI Insights */}
          {insights.length > 1 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">More Insights</h3>
              <div className="space-y-3">
                {insights.slice(1, 4).map(insight => (
                  <div
                    key={insight.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"
                  >
                    <span className="text-lg">{insight.icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {insight.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
