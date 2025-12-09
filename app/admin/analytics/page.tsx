'use client'

import { useState, useEffect } from 'react'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import { AnalyticsService, AnalyticsMetrics } from '@/lib/services/analyticsService'
import Link from 'next/link'

export default function AdvancedAnalyticsPage() {
  const { user, isAdmin } = useFirebaseAuth()
  const [analytics, setAnalytics] = useState<AnalyticsMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true)
      try {
        const options: any = {}

        if (dateRange !== 'all') {
          const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
          options.startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          options.endDate = new Date()
        }

        const data = await AnalyticsService.getAnalytics(options)
        setAnalytics(data)
      } catch (error) {
        console.error('[Analytics] Error loading:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [dateRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-accent-500"></div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 dark:text-slate-400">Failed to load analytics</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Advanced Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Comprehensive insights and forecasting
          </p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === range
                  ? 'bg-accent-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {range === 'all' ? 'All Time' : range.replace('d', ' Days')}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Total Revenue</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
            ${analytics.revenue.total.toLocaleString()}
          </p>
          <p className={`text-sm mt-2 ${analytics.revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {analytics.revenue.growth >= 0 ? '+' : ''}{analytics.revenue.growth.toFixed(1)}% vs last period
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Total Orders</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
            {analytics.sales.totalOrders.toLocaleString()}
          </p>
          <p className={`text-sm mt-2 ${analytics.sales.orderGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {analytics.sales.orderGrowth >= 0 ? '+' : ''}{analytics.sales.orderGrowth.toFixed(1)}% vs last period
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Avg Order Value</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
            ${analytics.revenue.averageOrderValue.toFixed(2)}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {analytics.sales.averageTicketsPerOrder.toFixed(1)} tickets/order
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Customer LTV</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
            ${analytics.customers.customerLifetimeValue.toFixed(2)}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {analytics.customers.retentionRate.toFixed(1)}% retention
          </p>
        </div>
      </div>

      {/* Insights */}
      {analytics.insights.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">AI Insights</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {analytics.insights.map((insight) => (
              <div
                key={insight.id}
                className={`p-4 rounded-lg border ${
                  insight.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                  insight.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
                  insight.type === 'opportunity' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' :
                  'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{insight.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${
                    insight.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                    insight.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}>
                    {insight.priority}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{insight.description}</p>
                {insight.recommendation && (
                  <p className="text-sm text-accent-600 dark:text-accent-400 mt-2 font-medium">
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
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Revenue Forecast</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Next Month</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  ${analytics.forecasts.nextMonth.revenue.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500 dark:text-slate-400">Confidence</p>
                <p className="text-lg font-semibold text-accent-600 dark:text-accent-400">
                  {analytics.forecasts.nextMonth.confidence}%
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Next Quarter</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  ${analytics.forecasts.nextQuarter.revenue.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500 dark:text-slate-400">Confidence</p>
                <p className="text-lg font-semibold text-accent-600 dark:text-accent-400">
                  {analytics.forecasts.nextQuarter.confidence}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Event Performance</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Active Events</span>
              <span className="font-semibold text-slate-900 dark:text-white">{analytics.events.activeEvents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Upcoming (30 days)</span>
              <span className="font-semibold text-slate-900 dark:text-white">{analytics.events.upcomingEvents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Avg Attendance</span>
              <span className="font-semibold text-slate-900 dark:text-white">{analytics.events.averageAttendance}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Sellout Rate</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{analytics.events.selloutRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Events */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Top Performing Events</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="pb-3 font-medium">Event</th>
                <th className="pb-3 font-medium">Revenue</th>
                <th className="pb-3 font-medium">Tickets</th>
                <th className="pb-3 font-medium">Fill Rate</th>
              </tr>
            </thead>
            <tbody>
              {analytics.events.topPerformingEvents.slice(0, 5).map((event, i) => (
                <tr key={event.id} className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-3">
                    <p className="font-medium text-slate-900 dark:text-white">{event.name}</p>
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-400">${event.revenue.toLocaleString()}</td>
                  <td className="py-3 text-slate-600 dark:text-slate-400">{event.ticketsSold}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-sm ${
                      event.fillRate >= 90 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                      event.fillRate >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                      'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
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

      {/* Top Customers */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Top Customers</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="pb-3 font-medium">Customer</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Orders</th>
                <th className="pb-3 font-medium">Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {analytics.customers.topCustomers.slice(0, 5).map((customer) => (
                <tr key={customer.id} className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-3">
                    <p className="font-medium text-slate-900 dark:text-white">{customer.name}</p>
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-400">{customer.email}</td>
                  <td className="py-3 text-slate-600 dark:text-slate-400">{customer.orders}</td>
                  <td className="py-3 text-green-600 dark:text-green-400 font-semibold">
                    ${customer.totalSpent.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      {analytics.trends.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Revenue Trend</h2>
          <div className="h-64 flex items-end gap-1">
            {analytics.trends.slice(-30).map((day, i) => {
              const maxRevenue = Math.max(...analytics.trends.map(t => t.revenue))
              const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0

              return (
                <div
                  key={day.date}
                  className="flex-1 bg-accent-500 rounded-t hover:bg-accent-600 transition-colors cursor-pointer"
                  style={{ height: `${Math.max(2, height)}%` }}
                  title={`${day.date}: $${day.revenue.toLocaleString()}`}
                />
              )
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{analytics.trends[0]?.date}</span>
            <span>{analytics.trends[analytics.trends.length - 1]?.date}</span>
          </div>
        </div>
      )}
    </div>
  )
}
