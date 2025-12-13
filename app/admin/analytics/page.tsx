'use client'

import { useState, useEffect } from 'react'
import { usePromoterAccess } from '@/lib/hooks/usePromoterAccess'
import { AnalyticsService, AnalyticsMetrics } from '@/lib/services/analyticsService'

export default function AdvancedAnalyticsPage() {
  const {
    effectivePromoterId,
    showAll,
    isAdmin,
    loading: accessLoading,
  } = usePromoterAccess()

  const [analytics, setAnalytics] = useState<AnalyticsMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  useEffect(() => {
    loadAnalytics()
  }, [dateRange, effectivePromoterId, showAll])

  const loadAnalytics = async () => {
    if (accessLoading) return

    setLoading(true)
    setError(null)

    try {
      const options: {
        startDate?: Date
        endDate?: Date
        promoterId?: string
      } = {}

      // Apply date range filter
      if (dateRange !== 'all') {
        const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
        options.startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        options.endDate = new Date()
      }

      // Apply promoter filter for non-admins or when admin selects specific promoter
      if (!showAll && effectivePromoterId && effectivePromoterId !== 'all') {
        options.promoterId = effectivePromoterId
      }

      const data = await AnalyticsService.getAnalytics(options)
      setAnalytics(data)
    } catch (err) {
      console.error('[Analytics] Error loading:', err)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  if (loading || accessLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={loadAnalytics}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-white/10 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-white mb-2">No Analytics Data</h3>
        <p className="text-gray-400">
          Analytics data will appear once you have events and orders in the system.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Advanced Analytics</h1>
          <p className="text-gray-400 mt-1">
            {showAll ? 'Platform-wide insights and forecasting' : 'Comprehensive insights and forecasting'}
          </p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === range
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/20'
              }`}
            >
              {range === 'all' ? 'All Time' : range.replace('d', ' Days')}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <p className="text-gray-400 text-sm">Total Revenue</p>
          <p className="text-3xl font-bold text-white mt-1">
            ${analytics.revenue.total.toLocaleString()}
          </p>
          <p className={`text-sm mt-2 ${analytics.revenue.growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {analytics.revenue.growth >= 0 ? '+' : ''}{analytics.revenue.growth.toFixed(1)}% vs last period
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <p className="text-gray-400 text-sm">Total Orders</p>
          <p className="text-3xl font-bold text-white mt-1">
            {analytics.sales.totalOrders.toLocaleString()}
          </p>
          <p className={`text-sm mt-2 ${analytics.sales.orderGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {analytics.sales.orderGrowth >= 0 ? '+' : ''}{analytics.sales.orderGrowth.toFixed(1)}% vs last period
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <p className="text-gray-400 text-sm">Avg Order Value</p>
          <p className="text-3xl font-bold text-white mt-1">
            ${analytics.revenue.averageOrderValue.toFixed(2)}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            {analytics.sales.averageTicketsPerOrder.toFixed(1)} tickets/order
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <p className="text-gray-400 text-sm">Customer LTV</p>
          <p className="text-3xl font-bold text-white mt-1">
            ${analytics.customers.customerLifetimeValue.toFixed(2)}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            {analytics.customers.retentionRate.toFixed(1)}% retention
          </p>
        </div>
      </div>

      {/* Insights */}
      {analytics.insights.length > 0 && (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-bold text-white mb-4">AI Insights</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {analytics.insights.map((insight) => (
              <div
                key={insight.id}
                className={`p-4 rounded-lg border ${
                  insight.type === 'success' ? 'bg-green-500/10 border-green-500/30' :
                  insight.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                  insight.type === 'opportunity' ? 'bg-purple-500/10 border-purple-500/30' :
                  'bg-blue-500/10 border-blue-500/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-white">{insight.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${
                    insight.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                    insight.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {insight.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-2">{insight.description}</p>
                {insight.recommendation && (
                  <p className="text-sm text-purple-400 mt-2 font-medium">
                    {insight.recommendation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forecasts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-bold text-white mb-4">Revenue Forecast</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
              <div>
                <p className="text-sm text-gray-400">Next Month</p>
                <p className="text-xl font-bold text-white">
                  ${analytics.forecasts.nextMonth.revenue.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Confidence</p>
                <p className="text-lg font-semibold text-purple-400">
                  {analytics.forecasts.nextMonth.confidence}%
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
              <div>
                <p className="text-sm text-gray-400">Next Quarter</p>
                <p className="text-xl font-bold text-white">
                  ${analytics.forecasts.nextQuarter.revenue.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Confidence</p>
                <p className="text-lg font-semibold text-purple-400">
                  {analytics.forecasts.nextQuarter.confidence}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-bold text-white mb-4">Event Performance</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Active Events</span>
              <span className="font-semibold text-white">{analytics.events.activeEvents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Upcoming (30 days)</span>
              <span className="font-semibold text-white">{analytics.events.upcomingEvents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Avg Attendance</span>
              <span className="font-semibold text-white">{analytics.events.averageAttendance}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Sellout Rate</span>
              <span className="font-semibold text-green-400">{analytics.events.selloutRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Events */}
      {analytics.events.topPerformingEvents.length > 0 && (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-bold text-white mb-4">Top Performing Events</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                  <th className="pb-3 font-medium">Event</th>
                  <th className="pb-3 font-medium">Revenue</th>
                  <th className="pb-3 font-medium">Tickets</th>
                  <th className="pb-3 font-medium">Fill Rate</th>
                </tr>
              </thead>
              <tbody>
                {analytics.events.topPerformingEvents.slice(0, 5).map((event) => (
                  <tr key={event.id} className="border-b border-white/5">
                    <td className="py-3">
                      <p className="font-medium text-white">{event.name}</p>
                    </td>
                    <td className="py-3 text-gray-400">${event.revenue.toLocaleString()}</td>
                    <td className="py-3 text-gray-400">{event.ticketsSold}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-sm ${
                        event.fillRate >= 90 ? 'bg-green-500/20 text-green-400' :
                        event.fillRate >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {event.fillRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Customers */}
      {analytics.customers.topCustomers.length > 0 && (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-bold text-white mb-4">Top Customers</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Orders</th>
                  <th className="pb-3 font-medium">Total Spent</th>
                </tr>
              </thead>
              <tbody>
                {analytics.customers.topCustomers.slice(0, 5).map((customer) => (
                  <tr key={customer.id} className="border-b border-white/5">
                    <td className="py-3">
                      <p className="font-medium text-white">{customer.name}</p>
                    </td>
                    <td className="py-3 text-gray-400">{customer.email}</td>
                    <td className="py-3 text-gray-400">{customer.orders}</td>
                    <td className="py-3 text-green-400 font-semibold">
                      ${customer.totalSpent.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revenue Trend Chart */}
      {analytics.trends.length > 0 && (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-bold text-white mb-4">Revenue Trend</h2>
          <div className="h-64 flex items-end gap-1">
            {analytics.trends.slice(-30).map((day) => {
              const maxRevenue = Math.max(...analytics.trends.map(t => t.revenue))
              const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0

              return (
                <div
                  key={day.date}
                  className="flex-1 bg-purple-500 rounded-t hover:bg-purple-400 transition-colors cursor-pointer"
                  style={{ height: `${Math.max(2, height)}%` }}
                  title={`${day.date}: $${day.revenue.toLocaleString()}`}
                />
              )
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>{analytics.trends[0]?.date}</span>
            <span>{analytics.trends[analytics.trends.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Customer Metrics */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Customer Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Customers</span>
              <span className="font-semibold text-white">{analytics.customers.totalCustomers.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">New (30 days)</span>
              <span className="font-semibold text-green-400">+{analytics.customers.newCustomers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Returning</span>
              <span className="font-semibold text-white">{analytics.customers.returningCustomers}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Sales Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Tickets Sold</span>
              <span className="font-semibold text-white">{analytics.sales.ticketsSold.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">This Month Orders</span>
              <span className="font-semibold text-white">{analytics.sales.thisMonthOrders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Last Month Orders</span>
              <span className="font-semibold text-gray-400">{analytics.sales.lastMonthOrders}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Events Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Events</span>
              <span className="font-semibold text-white">{analytics.events.totalEvents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Completed</span>
              <span className="font-semibold text-white">{analytics.events.completedEvents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Active</span>
              <span className="font-semibold text-green-400">{analytics.events.activeEvents}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
