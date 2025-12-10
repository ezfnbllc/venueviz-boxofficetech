'use client'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

interface Order {
  id: string
  total: number
  createdAt: any
  eventId: string
  eventName: string
  status: string
  tickets: any[]
}

interface Event {
  id: string
  name: string
  venueName: string
  category: string
}

const COLORS = ['#9333EA', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#6366F1']

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalEvents: 0,
    avgOrderValue: 0,
    totalTickets: 0,
    conversionRate: 4.8
  })

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const [ordersSnapshot, eventsSnapshot] = await Promise.all([
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'events'))
      ])

      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[]

      const eventsData = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[]

      // Filter by date range
      const now = new Date()
      const filteredOrders = ordersData.filter(order => {
        if (dateRange === 'all') return true
        const orderDate = order.createdAt?.toDate?.() || new Date(order.createdAt)
        const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
        const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
        return orderDate >= cutoff
      })

      setOrders(filteredOrders)
      setEvents(eventsData)

      // Calculate metrics
      const totalRevenue = filteredOrders.reduce((sum, order) => {
        return sum + (order.total || order.pricing?.total || 0)
      }, 0)

      const totalTickets = filteredOrders.reduce((sum, order) => {
        return sum + (order.tickets?.length || 1)
      }, 0)

      setMetrics({
        totalRevenue,
        totalOrders: filteredOrders.length,
        totalEvents: eventsData.length,
        avgOrderValue: filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0,
        totalTickets,
        conversionRate: 4.8
      })
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  // Generate revenue trend data
  const getRevenueTrendData = () => {
    const daysCount = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 90
    const data: { date: string; revenue: number; orders: number }[] = []

    for (let i = daysCount - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

      const dayOrders = orders.filter(order => {
        const orderDate = order.createdAt?.toDate?.() || new Date(order.createdAt)
        return orderDate.toDateString() === date.toDateString()
      })

      const dayRevenue = dayOrders.reduce((sum, order) => {
        return sum + (order.total || order.pricing?.total || 0)
      }, 0)

      data.push({
        date: dateStr,
        revenue: dayRevenue,
        orders: dayOrders.length
      })
    }

    return data
  }

  // Get orders by event
  const getOrdersByEvent = () => {
    const eventOrders: Record<string, { name: string; orders: number; revenue: number }> = {}

    orders.forEach(order => {
      const eventName = order.eventName || 'Unknown Event'
      if (!eventOrders[eventName]) {
        eventOrders[eventName] = { name: eventName, orders: 0, revenue: 0 }
      }
      eventOrders[eventName].orders++
      eventOrders[eventName].revenue += order.total || order.pricing?.total || 0
    })

    return Object.values(eventOrders)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)
  }

  // Get orders by status
  const getOrdersByStatus = () => {
    const statusCounts: Record<string, number> = {}
    orders.forEach(order => {
      const status = order.status || 'completed'
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })

    return Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }))
  }

  // Get hourly distribution
  const getHourlyDistribution = () => {
    const hourlyData: number[] = new Array(24).fill(0)

    orders.forEach(order => {
      const orderDate = order.createdAt?.toDate?.() || new Date(order.createdAt)
      const hour = orderDate.getHours()
      hourlyData[hour]++
    })

    return hourlyData.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      orders: count
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
      </div>
    )
  }

  const revenueTrendData = getRevenueTrendData()
  const ordersByEvent = getOrdersByEvent()
  const ordersByStatus = getOrdersByStatus()
  const hourlyDistribution = getHourlyDistribution()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>

          {/* Date Range Selector */}
          <div className="flex gap-2">
            {(['7d', '30d', '90d', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {range === 'all' ? 'All Time' : range.replace('d', ' Days')}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="p-4 bg-black/40 backdrop-blur rounded-xl border border-white/10">
            <p className="text-2xl font-bold text-green-400">
              ${(metrics.totalRevenue / 1000).toFixed(1)}K
            </p>
            <p className="text-xs text-gray-400">Total Revenue</p>
          </div>
          <div className="p-4 bg-black/40 backdrop-blur rounded-xl border border-white/10">
            <p className="text-2xl font-bold">{metrics.totalOrders}</p>
            <p className="text-xs text-gray-400">Total Orders</p>
          </div>
          <div className="p-4 bg-black/40 backdrop-blur rounded-xl border border-white/10">
            <p className="text-2xl font-bold">{metrics.totalEvents}</p>
            <p className="text-xs text-gray-400">Total Events</p>
          </div>
          <div className="p-4 bg-black/40 backdrop-blur rounded-xl border border-white/10">
            <p className="text-2xl font-bold">${metrics.avgOrderValue.toFixed(0)}</p>
            <p className="text-xs text-gray-400">Avg Order Value</p>
          </div>
          <div className="p-4 bg-black/40 backdrop-blur rounded-xl border border-white/10">
            <p className="text-2xl font-bold">{metrics.totalTickets}</p>
            <p className="text-xs text-gray-400">Tickets Sold</p>
          </div>
          <div className="p-4 bg-black/40 backdrop-blur rounded-xl border border-white/10">
            <p className="text-2xl font-bold text-purple-400">{metrics.conversionRate}%</p>
            <p className="text-xs text-gray-400">Conversion Rate</p>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Trend */}
          <div className="p-6 bg-black/40 backdrop-blur rounded-xl border border-white/10">
            <h3 className="text-xl font-bold mb-4">Revenue Trend</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrendData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333EA" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#9333EA" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    interval={Math.floor(revenueTrendData.length / 6)}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#F3F4F6' }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#9333EA"
                    strokeWidth={2}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Orders by Event */}
          <div className="p-6 bg-black/40 backdrop-blur rounded-xl border border-white/10">
            <h3 className="text-xl font-bold mb-4">Revenue by Event</h3>
            <div className="h-72">
              {ordersByEvent.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ordersByEvent} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      type="number"
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF', fontSize: 11 }}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#EC4899" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  No order data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Order Status Distribution */}
          <div className="p-6 bg-black/40 backdrop-blur rounded-xl border border-white/10">
            <h3 className="text-xl font-bold mb-4">Order Status</h3>
            <div className="h-64">
              {ordersByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ordersByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {ordersByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend
                      formatter={(value) => <span style={{ color: '#F3F4F6' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  No order data available
                </div>
              )}
            </div>
          </div>

          {/* Hourly Distribution */}
          <div className="lg:col-span-2 p-6 bg-black/40 backdrop-blur rounded-xl border border-white/10">
            <h3 className="text-xl font-bold mb-4">Orders by Hour</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="hour"
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                    interval={2}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="orders" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Daily Orders Trend */}
        <div className="p-6 bg-black/40 backdrop-blur rounded-xl border border-white/10">
          <h3 className="text-xl font-bold mb-4">Daily Orders</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  interval={Math.floor(revenueTrendData.length / 6)}
                />
                <YAxis
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, fill: '#F59E0B' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Events Table */}
        {ordersByEvent.length > 0 && (
          <div className="mt-6 p-6 bg-black/40 backdrop-blur rounded-xl border border-white/10">
            <h3 className="text-xl font-bold mb-4">Top Performing Events</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Event</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Orders</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Revenue</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Avg Order</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersByEvent.map((event, index) => (
                    <tr key={index} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium">{event.name}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">{event.orders}</td>
                      <td className="text-right py-3 px-4 text-green-400 font-medium">
                        ${event.revenue.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-4">
                        ${event.orders > 0 ? (event.revenue / event.orders).toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
