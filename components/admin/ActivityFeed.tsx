'use client'

import { useMemo } from 'react'
import Link from 'next/link'

interface ActivityItem {
  id: string
  type: 'order' | 'event'
  title: string
  subtitle: string
  amount?: number
  timestamp: Date
  icon: string
  color: string
  href: string
}

interface ActivityFeedProps {
  events: any[]
  orders: any[]
  maxItems?: number
}

export function ActivityFeed({ events, orders, maxItems = 10 }: ActivityFeedProps) {
  const activities = useMemo(() => {
    const items: ActivityItem[] = []

    // Create event lookup map for order details
    const eventMap = new Map<string, any>()
    events.forEach(event => {
      eventMap.set(event.id, event)
    })

    // Add orders
    orders.slice(0, 20).forEach(order => {
      const timestamp = order.purchaseDate?.toDate?.() || order.createdAt?.toDate?.() || new Date()

      // Get event details for richer subtitle
      const event = eventMap.get(order.eventId)
      const eventName = order.eventName || event?.name || event?.basics?.name || 'Event'
      const venueName = order.venueName || event?.venueName || event?.basics?.venue?.name || ''

      // Format event date if available
      const eventDate = event?.schedule?.date?.toDate?.() || event?.date?.toDate?.()
      const dateStr = eventDate
        ? eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : ''

      // Build subtitle: "Event Name · Dec 25 · Venue"
      const subtitleParts = [eventName]
      if (dateStr) subtitleParts.push(dateStr)
      if (venueName) subtitleParts.push(venueName)

      items.push({
        id: `order-${order.id}`,
        type: 'order',
        title: order.customer?.name || order.customerName || 'New Order',
        subtitle: subtitleParts.join(' · '),
        amount: order.pricing?.total || order.total || 0,
        timestamp,
        icon: '🎫',
        color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
        href: `/admin/orders?id=${order.id}`,
      })
    })

    // Add recent events (created in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    events.filter(e => {
      const created = e.createdAt?.toDate?.() || new Date(0)
      return created > sevenDaysAgo
    }).forEach(event => {
      const timestamp = event.createdAt?.toDate?.() || new Date()
      items.push({
        id: `event-${event.id}`,
        type: 'event',
        title: event.name || event.basics?.name || 'New Event',
        subtitle: event.venueName || event.basics?.venue?.name || 'Event Created',
        timestamp,
        icon: '🎭',
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
        href: `/admin/events/edit/${event.id}`,
      })
    })

    // Sort by timestamp descending
    return items
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxItems)
  }, [events, orders, maxItems])

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-4xl block mb-3">📭</span>
        <p className="text-slate-500 dark:text-slate-400 font-medium">No recent activity</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
          Activity will appear here when events are created or orders are placed
        </p>
      </div>
    )
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-1">
      {activities.map((activity, index) => (
        <Link
          key={activity.id}
          href={activity.href}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${activity.color}`}>
            {activity.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-slate-900 dark:text-white truncate text-sm">
                {activity.title}
              </p>
              {activity.amount !== undefined && (
                <span className="text-sm font-semibold text-green-600 dark:text-green-400 flex-shrink-0">
                  ${activity.amount.toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {activity.subtitle}
              </p>
              <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
                {formatTime(activity.timestamp)}
              </span>
            </div>
          </div>
          <svg
            className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ))}
    </div>
  )
}

interface StatsSummaryProps {
  stats: {
    totalEvents: number
    totalOrders: number
    totalRevenue: number
    totalCustomers: number
  }
  previousPeriod?: {
    totalEvents: number
    totalOrders: number
    totalRevenue: number
    totalCustomers: number
  }
}

export function StatsSummary({ stats, previousPeriod }: StatsSummaryProps) {
  const calculateChange = (current: number, previous: number) => {
    if (!previous) return null
    const change = ((current - previous) / previous) * 100
    return Math.round(change * 10) / 10
  }

  const items = [
    {
      label: 'Events',
      value: stats.totalEvents,
      change: previousPeriod ? calculateChange(stats.totalEvents, previousPeriod.totalEvents) : null,
      icon: '🎭',
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Orders',
      value: stats.totalOrders,
      change: previousPeriod ? calculateChange(stats.totalOrders, previousPeriod.totalOrders) : null,
      icon: '🎫',
      gradient: 'from-green-500 to-green-600',
    },
    {
      label: 'Revenue',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      change: previousPeriod ? calculateChange(stats.totalRevenue, previousPeriod.totalRevenue) : null,
      icon: '💰',
      gradient: 'from-purple-500 to-purple-600',
    },
    {
      label: 'Customers',
      value: stats.totalCustomers,
      change: previousPeriod ? calculateChange(stats.totalCustomers, previousPeriod.totalCustomers) : null,
      icon: '👥',
      gradient: 'from-orange-500 to-orange-600',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {item.label}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {item.value}
              </p>
              {item.change !== null && (
                <p className={`text-xs font-medium mt-1 ${item.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {item.change >= 0 ? '↑' : '↓'} {Math.abs(item.change)}%
                </p>
              )}
            </div>
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center text-lg shadow-sm`}>
              {item.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
