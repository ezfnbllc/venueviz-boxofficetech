'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface RevenueChartProps {
  orders: any[]
}

export function RevenueChart({ orders }: RevenueChartProps) {
  const chartData = useMemo(() => {
    // Group orders by day for the last 30 days
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const dailyRevenue: Record<string, number> = {}

    // Initialize all days with 0
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
      const key = date.toISOString().split('T')[0]
      dailyRevenue[key] = 0
    }

    // Sum revenue by day
    orders.forEach(order => {
      const orderDate = order.purchaseDate?.toDate?.() || order.createdAt?.toDate?.() || new Date(order.createdAt)
      if (orderDate >= thirtyDaysAgo) {
        const key = orderDate.toISOString().split('T')[0]
        if (dailyRevenue[key] !== undefined) {
          dailyRevenue[key] += order.pricing?.total || order.total || 0
        }
      }
    })

    return Object.entries(dailyRevenue).map(([date, revenue]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: Math.round(revenue * 100) / 100,
    }))
  }, [orders])

  if (orders.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-slate-400 dark:text-slate-500">
        <div className="text-center">
          <span className="text-3xl block mb-2">📈</span>
          <p className="text-sm">Revenue data will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
          width={50}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
          }}
          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#8b5cf6"
          strokeWidth={2}
          fill="url(#revenueGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

interface OrdersChartProps {
  orders: any[]
}

export function OrdersChart({ orders }: OrdersChartProps) {
  const chartData = useMemo(() => {
    // Group orders by day for the last 7 days
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const dailyOrders: Record<string, number> = {}

    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
      const key = date.toISOString().split('T')[0]
      dailyOrders[key] = 0
    }

    orders.forEach(order => {
      const orderDate = order.purchaseDate?.toDate?.() || order.createdAt?.toDate?.() || new Date(order.createdAt)
      if (orderDate >= sevenDaysAgo) {
        const key = orderDate.toISOString().split('T')[0]
        if (dailyOrders[key] !== undefined) {
          dailyOrders[key]++
        }
      }
    })

    return Object.entries(dailyOrders).map(([date, count]) => ({
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      orders: count,
    }))
  }, [orders])

  if (orders.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-slate-400 dark:text-slate-500">
        <div className="text-center">
          <span className="text-3xl block mb-2">📊</span>
          <p className="text-sm">Order data will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          width={30}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
          }}
        />
        <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface PromoterBreakdownProps {
  events: any[]
  promoters: any[]
}

export function PromoterBreakdown({ events, promoters }: PromoterBreakdownProps) {
  const chartData = useMemo(() => {
    const eventsByPromoter: Record<string, number> = {}

    events.forEach(event => {
      const promoterId = event.promoter?.promoterId || event.promoterId || 'unassigned'
      eventsByPromoter[promoterId] = (eventsByPromoter[promoterId] || 0) + 1
    })

    return promoters
      .filter(p => eventsByPromoter[p.id])
      .map(promoter => ({
        name: promoter.name,
        value: eventsByPromoter[promoter.id] || 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [events, promoters])

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']

  if (chartData.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-slate-400 dark:text-slate-500">
        <div className="text-center">
          <span className="text-3xl block mb-2">🎭</span>
          <p className="text-sm">Promoter data will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={120} height={120}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={35}
            outerRadius={55}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2">
        {chartData.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-slate-600 dark:text-slate-400 truncate max-w-[100px]">
                {item.name}
              </span>
            </div>
            <span className="font-medium text-slate-900 dark:text-white">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface CustomerMapProps {
  orders: any[]
}

export function CustomerMap({ orders }: CustomerMapProps) {
  const locationData = useMemo(() => {
    const stateCounts: Record<string, number> = {}

    orders.forEach(order => {
      const state = order.customer?.state || order.billingAddress?.state || order.state
      if (state) {
        stateCounts[state] = (stateCounts[state] || 0) + 1
      }
    })

    return Object.entries(stateCounts)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [orders])

  if (locationData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
        <div className="text-center">
          <span className="text-3xl block mb-2">🗺️</span>
          <p className="text-sm">Location data will appear here</p>
          <p className="text-xs mt-1">When customers provide addresses</p>
        </div>
      </div>
    )
  }

  const maxCount = Math.max(...locationData.map(d => d.count))

  return (
    <div className="space-y-3">
      {locationData.map(({ state, count }) => (
        <div key={state} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">{state}</span>
            <span className="font-medium text-slate-900 dark:text-white">{count}</span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${(count / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
