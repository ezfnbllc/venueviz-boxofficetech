import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Helper to check if code is running in browser
const isBrowser = typeof window !== 'undefined'

export interface AnalyticsMetrics {
  revenue: RevenueMetrics
  sales: SalesMetrics
  customers: CustomerMetrics
  events: EventMetrics
  trends: TrendData[]
  forecasts: ForecastData
  insights: AnalyticsInsight[]
}

export interface RevenueMetrics {
  total: number
  thisMonth: number
  lastMonth: number
  growth: number
  averageOrderValue: number
  revenueByCategory: Record<string, number>
  revenueByPromoter: Record<string, number>
  dailyRevenue: { date: string; amount: number }[]
}

export interface SalesMetrics {
  totalOrders: number
  thisMonthOrders: number
  lastMonthOrders: number
  orderGrowth: number
  conversionRate: number
  ticketsSold: number
  averageTicketsPerOrder: number
  salesByStatus: Record<string, number>
  hourlyDistribution: { hour: number; count: number }[]
}

export interface CustomerMetrics {
  totalCustomers: number
  newCustomers: number
  returningCustomers: number
  retentionRate: number
  customerLifetimeValue: number
  topCustomers: { id: string; name: string; email: string; totalSpent: number; orders: number }[]
  customersBySource: Record<string, number>
}

export interface EventMetrics {
  totalEvents: number
  activeEvents: number
  completedEvents: number
  upcomingEvents: number
  averageAttendance: number
  selloutRate: number
  topPerformingEvents: { id: string; name: string; revenue: number; ticketsSold: number; fillRate: number }[]
  eventsByCategory: Record<string, number>
}

export interface TrendData {
  date: string
  revenue: number
  orders: number
  tickets: number
  customers: number
}

export interface ForecastData {
  nextMonth: {
    revenue: number
    orders: number
    confidence: number
  }
  nextQuarter: {
    revenue: number
    orders: number
    confidence: number
  }
  seasonalTrends: {
    month: string
    expectedRevenue: number
    historicalAverage: number
  }[]
}

export interface AnalyticsInsight {
  id: string
  type: 'success' | 'warning' | 'info' | 'opportunity'
  title: string
  description: string
  metric?: string
  change?: number
  recommendation?: string
  priority: 'high' | 'medium' | 'low'
  createdAt: string
}

export class AnalyticsService {

  // Get comprehensive analytics dashboard data
  static async getAnalytics(options?: {
    startDate?: Date
    endDate?: Date
    promoterId?: string
  }): Promise<AnalyticsMetrics> {
    if (!isBrowser) {
      return this.getEmptyMetrics()
    }

    try {
      const [events, orders, customers, promoters] = await Promise.all([
        this.fetchEvents(),
        this.fetchOrders(),
        this.fetchCustomers(),
        this.fetchPromoters()
      ])

      // Apply filters
      let filteredOrders = orders
      let filteredEvents = events

      if (options?.promoterId) {
        const promoterEventIds = events
          .filter(e => e.promoterId === options.promoterId)
          .map(e => e.id)
        filteredEvents = events.filter(e => e.promoterId === options.promoterId)
        filteredOrders = orders.filter(o => promoterEventIds.includes(o.eventId))
      }

      if (options?.startDate || options?.endDate) {
        filteredOrders = filteredOrders.filter(order => {
          const orderDate = this.getOrderDate(order)
          if (options.startDate && orderDate < options.startDate) return false
          if (options.endDate && orderDate > options.endDate) return false
          return true
        })
      }

      // Calculate all metrics
      const revenue = this.calculateRevenueMetrics(filteredOrders, filteredEvents)
      const sales = this.calculateSalesMetrics(filteredOrders)
      const customerMetrics = this.calculateCustomerMetrics(customers, filteredOrders)
      const eventMetrics = this.calculateEventMetrics(filteredEvents, filteredOrders)
      const trends = this.calculateTrends(filteredOrders, 30)
      const forecasts = this.calculateForecasts(filteredOrders, revenue)
      const insights = this.generateInsights(revenue, sales, customerMetrics, eventMetrics)

      return {
        revenue,
        sales,
        customers: customerMetrics,
        events: eventMetrics,
        trends,
        forecasts,
        insights
      }
    } catch (error) {
      console.error('[AnalyticsService] Error fetching analytics:', error)
      return this.getEmptyMetrics()
    }
  }

  // Revenue metrics calculation
  private static calculateRevenueMetrics(orders: any[], events: any[]): RevenueMetrics {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    let total = 0
    let thisMonth = 0
    let lastMonth = 0
    const revenueByCategory: Record<string, number> = {}
    const revenueByPromoter: Record<string, number> = {}
    const dailyRevenueMap: Record<string, number> = {}

    // Create event lookup
    const eventLookup: Record<string, any> = {}
    events.forEach(e => { eventLookup[e.id] = e })

    orders.forEach(order => {
      const amount = order.pricing?.total || order.totalAmount || order.total || 0
      const orderDate = this.getOrderDate(order)

      total += amount

      if (orderDate >= thisMonthStart) {
        thisMonth += amount
      } else if (orderDate >= lastMonthStart && orderDate <= lastMonthEnd) {
        lastMonth += amount
      }

      // By category
      const event = eventLookup[order.eventId]
      if (event?.category) {
        revenueByCategory[event.category] = (revenueByCategory[event.category] || 0) + amount
      }

      // By promoter
      if (event?.promoterId) {
        revenueByPromoter[event.promoterId] = (revenueByPromoter[event.promoterId] || 0) + amount
      }

      // Daily revenue (last 30 days)
      const dateKey = orderDate.toISOString().split('T')[0]
      dailyRevenueMap[dateKey] = (dailyRevenueMap[dateKey] || 0) + amount
    })

    const growth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0
    const averageOrderValue = orders.length > 0 ? total / orders.length : 0

    // Convert daily revenue to array sorted by date
    const dailyRevenue = Object.entries(dailyRevenueMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30)

    return {
      total: Math.round(total * 100) / 100,
      thisMonth: Math.round(thisMonth * 100) / 100,
      lastMonth: Math.round(lastMonth * 100) / 100,
      growth: Math.round(growth * 10) / 10,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      revenueByCategory,
      revenueByPromoter,
      dailyRevenue
    }
  }

  // Sales metrics calculation
  private static calculateSalesMetrics(orders: any[]): SalesMetrics {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    let thisMonthOrders = 0
    let lastMonthOrders = 0
    let totalTickets = 0
    const salesByStatus: Record<string, number> = {}
    const hourlyDistribution: Record<number, number> = {}

    for (let i = 0; i < 24; i++) {
      hourlyDistribution[i] = 0
    }

    orders.forEach(order => {
      const orderDate = this.getOrderDate(order)
      const tickets = order.tickets?.length || order.quantity || 1

      totalTickets += tickets

      if (orderDate >= thisMonthStart) {
        thisMonthOrders++
      } else if (orderDate >= lastMonthStart && orderDate <= lastMonthEnd) {
        lastMonthOrders++
      }

      // By status
      const status = order.status || 'pending'
      salesByStatus[status] = (salesByStatus[status] || 0) + 1

      // Hourly distribution
      const hour = orderDate.getHours()
      hourlyDistribution[hour]++
    })

    const orderGrowth = lastMonthOrders > 0
      ? ((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100
      : 0

    return {
      totalOrders: orders.length,
      thisMonthOrders,
      lastMonthOrders,
      orderGrowth: Math.round(orderGrowth * 10) / 10,
      conversionRate: 0, // Would need visitor data
      ticketsSold: totalTickets,
      averageTicketsPerOrder: orders.length > 0 ? Math.round((totalTickets / orders.length) * 10) / 10 : 0,
      salesByStatus,
      hourlyDistribution: Object.entries(hourlyDistribution).map(([hour, count]) => ({
        hour: parseInt(hour),
        count
      }))
    }
  }

  // Customer metrics calculation
  private static calculateCustomerMetrics(customers: any[], orders: any[]): CustomerMetrics {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Build customer order map
    const customerOrders: Record<string, { total: number; count: number; email: string; name: string }> = {}
    const uniqueCustomerEmails = new Set<string>()
    const newCustomerEmails = new Set<string>()
    const returningEmails = new Set<string>()

    orders.forEach(order => {
      const email = (order.customer?.email || order.customerEmail || order.email || '').toLowerCase()
      if (!email) return

      const name = order.customer?.name || order.customerName || 'Unknown'
      const amount = order.pricing?.total || order.totalAmount || order.total || 0
      const orderDate = this.getOrderDate(order)

      if (!customerOrders[email]) {
        customerOrders[email] = { total: 0, count: 0, email, name }
      }
      customerOrders[email].total += amount
      customerOrders[email].count++

      uniqueCustomerEmails.add(email)

      if (orderDate >= thirtyDaysAgo) {
        if (customerOrders[email].count === 1) {
          newCustomerEmails.add(email)
        } else {
          returningEmails.add(email)
        }
      }
    })

    // Calculate top customers
    const topCustomers = Object.entries(customerOrders)
      .map(([email, data]) => ({
        id: email,
        email: data.email,
        name: data.name,
        totalSpent: Math.round(data.total * 100) / 100,
        orders: data.count
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)

    // Calculate lifetime value
    const totalCustomerValue = Object.values(customerOrders).reduce((sum, c) => sum + c.total, 0)
    const customerLifetimeValue = uniqueCustomerEmails.size > 0
      ? totalCustomerValue / uniqueCustomerEmails.size
      : 0

    // Retention rate (simplified)
    const retentionRate = uniqueCustomerEmails.size > 0
      ? (returningEmails.size / uniqueCustomerEmails.size) * 100
      : 0

    return {
      totalCustomers: uniqueCustomerEmails.size,
      newCustomers: newCustomerEmails.size,
      returningCustomers: returningEmails.size,
      retentionRate: Math.round(retentionRate * 10) / 10,
      customerLifetimeValue: Math.round(customerLifetimeValue * 100) / 100,
      topCustomers,
      customersBySource: {} // Would need source tracking
    }
  }

  // Event metrics calculation
  private static calculateEventMetrics(events: any[], orders: any[]): EventMetrics {
    const now = new Date()

    // Build order totals by event
    const ordersByEvent: Record<string, { revenue: number; tickets: number }> = {}
    orders.forEach(order => {
      const eventId = order.eventId
      if (!eventId) return

      if (!ordersByEvent[eventId]) {
        ordersByEvent[eventId] = { revenue: 0, tickets: 0 }
      }
      ordersByEvent[eventId].revenue += order.pricing?.total || order.totalAmount || order.total || 0
      ordersByEvent[eventId].tickets += order.tickets?.length || order.quantity || 1
    })

    let activeEvents = 0
    let completedEvents = 0
    let upcomingEvents = 0
    const eventsByCategory: Record<string, number> = {}
    let totalCapacity = 0
    let totalSold = 0
    let sellouts = 0

    const eventPerformance = events.map(event => {
      const eventDate = this.getEventDate(event)
      const isActive = eventDate > now
      const isCompleted = eventDate < now

      if (isActive) activeEvents++
      if (isCompleted) completedEvents++
      if (eventDate > now && eventDate < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
        upcomingEvents++
      }

      // Category count
      if (event.category) {
        eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1
      }

      // Calculate fill rate
      const capacity = event.capacity || event.totalCapacity || 0
      const ticketsSold = ordersByEvent[event.id]?.tickets || 0
      const revenue = ordersByEvent[event.id]?.revenue || 0
      const fillRate = capacity > 0 ? (ticketsSold / capacity) * 100 : 0

      if (fillRate >= 95) sellouts++
      totalCapacity += capacity
      totalSold += ticketsSold

      return {
        id: event.id,
        name: event.name || 'Unnamed Event',
        revenue: Math.round(revenue * 100) / 100,
        ticketsSold,
        fillRate: Math.round(fillRate * 10) / 10
      }
    })

    // Top performing events
    const topPerformingEvents = eventPerformance
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    const averageAttendance = events.length > 0 ? Math.round(totalSold / events.length) : 0
    const selloutRate = events.length > 0 ? (sellouts / events.length) * 100 : 0

    return {
      totalEvents: events.length,
      activeEvents,
      completedEvents,
      upcomingEvents,
      averageAttendance,
      selloutRate: Math.round(selloutRate * 10) / 10,
      topPerformingEvents,
      eventsByCategory
    }
  }

  // Calculate trends over time
  private static calculateTrends(orders: any[], days: number): TrendData[] {
    const trends: TrendData[] = []
    const now = new Date()

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayOrders = orders.filter(order => {
        const orderDate = this.getOrderDate(order)
        return orderDate.toISOString().split('T')[0] === dateStr
      })

      const dayRevenue = dayOrders.reduce((sum, o) =>
        sum + (o.pricing?.total || o.totalAmount || o.total || 0), 0
      )

      const dayTickets = dayOrders.reduce((sum, o) =>
        sum + (o.tickets?.length || o.quantity || 1), 0
      )

      const uniqueCustomers = new Set(
        dayOrders.map(o => o.customer?.email || o.customerEmail || '').filter(Boolean)
      ).size

      trends.push({
        date: dateStr,
        revenue: Math.round(dayRevenue * 100) / 100,
        orders: dayOrders.length,
        tickets: dayTickets,
        customers: uniqueCustomers
      })
    }

    return trends
  }

  // Calculate forecasts using simple moving average and seasonality
  private static calculateForecasts(orders: any[], revenue: RevenueMetrics): ForecastData {
    // Calculate average daily revenue from last 30 days
    const last30DaysRevenue = revenue.dailyRevenue.slice(-30)
    const avgDailyRevenue = last30DaysRevenue.length > 0
      ? last30DaysRevenue.reduce((sum, d) => sum + d.amount, 0) / last30DaysRevenue.length
      : 0

    // Calculate average daily orders
    const last30DaysOrders = orders.filter(o => {
      const date = this.getOrderDate(o)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return date >= thirtyDaysAgo
    }).length
    const avgDailyOrders = last30DaysOrders / 30

    // Apply growth factor based on recent trend
    const growthFactor = 1 + (revenue.growth / 100 * 0.5) // Dampened growth projection

    // Next month forecast
    const nextMonthRevenue = avgDailyRevenue * 30 * growthFactor
    const nextMonthOrders = Math.round(avgDailyOrders * 30 * growthFactor)

    // Next quarter forecast
    const nextQuarterRevenue = avgDailyRevenue * 90 * growthFactor
    const nextQuarterOrders = Math.round(avgDailyOrders * 90 * growthFactor)

    // Calculate confidence based on data consistency
    const variance = this.calculateVariance(last30DaysRevenue.map(d => d.amount))
    const confidence = Math.max(50, Math.min(95, 100 - (variance / avgDailyRevenue) * 10))

    // Seasonal trends (simplified)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const seasonalTrends = months.map((month, i) => {
      // Apply simple seasonality multiplier
      const seasonalMultiplier = [0.8, 0.85, 0.9, 0.95, 1.0, 1.1, 1.15, 1.1, 0.95, 1.05, 1.15, 1.2][i]
      return {
        month,
        expectedRevenue: Math.round(avgDailyRevenue * 30 * seasonalMultiplier * 100) / 100,
        historicalAverage: Math.round(avgDailyRevenue * 30 * 100) / 100
      }
    })

    return {
      nextMonth: {
        revenue: Math.round(nextMonthRevenue * 100) / 100,
        orders: nextMonthOrders,
        confidence: Math.round(confidence)
      },
      nextQuarter: {
        revenue: Math.round(nextQuarterRevenue * 100) / 100,
        orders: nextQuarterOrders,
        confidence: Math.round(confidence * 0.9)
      },
      seasonalTrends
    }
  }

  // Generate actionable insights
  private static generateInsights(
    revenue: RevenueMetrics,
    sales: SalesMetrics,
    customers: CustomerMetrics,
    events: EventMetrics
  ): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = []
    const now = new Date().toISOString()

    // Revenue growth insight
    if (revenue.growth > 20) {
      insights.push({
        id: 'revenue-growth-high',
        type: 'success',
        title: 'Strong Revenue Growth',
        description: `Revenue is up ${revenue.growth.toFixed(1)}% compared to last month`,
        metric: 'Revenue',
        change: revenue.growth,
        recommendation: 'Consider increasing marketing spend to capitalize on momentum',
        priority: 'high',
        createdAt: now
      })
    } else if (revenue.growth < -10) {
      insights.push({
        id: 'revenue-growth-low',
        type: 'warning',
        title: 'Revenue Decline Detected',
        description: `Revenue is down ${Math.abs(revenue.growth).toFixed(1)}% compared to last month`,
        metric: 'Revenue',
        change: revenue.growth,
        recommendation: 'Review pricing strategy and promotional activities',
        priority: 'high',
        createdAt: now
      })
    }

    // Order growth insight
    if (sales.orderGrowth > 15) {
      insights.push({
        id: 'order-growth-high',
        type: 'success',
        title: 'Increased Order Volume',
        description: `Orders are up ${sales.orderGrowth.toFixed(1)}% this month`,
        metric: 'Orders',
        change: sales.orderGrowth,
        priority: 'medium',
        createdAt: now
      })
    }

    // Customer retention insight
    if (customers.retentionRate > 40) {
      insights.push({
        id: 'retention-high',
        type: 'success',
        title: 'Strong Customer Retention',
        description: `${customers.retentionRate.toFixed(1)}% of customers are returning buyers`,
        metric: 'Retention',
        change: customers.retentionRate,
        priority: 'medium',
        createdAt: now
      })
    } else if (customers.retentionRate < 15) {
      insights.push({
        id: 'retention-low',
        type: 'warning',
        title: 'Low Customer Retention',
        description: 'Most customers are one-time buyers',
        metric: 'Retention',
        change: customers.retentionRate,
        recommendation: 'Consider implementing a loyalty program or email remarketing',
        priority: 'high',
        createdAt: now
      })
    }

    // Event sellout insight
    if (events.selloutRate > 50) {
      insights.push({
        id: 'sellout-high',
        type: 'success',
        title: 'High Event Demand',
        description: `${events.selloutRate.toFixed(1)}% of events are selling out`,
        metric: 'Sellout Rate',
        change: events.selloutRate,
        recommendation: 'Consider adding more events or larger venues',
        priority: 'medium',
        createdAt: now
      })
    }

    // Average order value opportunity
    if (revenue.averageOrderValue < 50) {
      insights.push({
        id: 'aov-opportunity',
        type: 'opportunity',
        title: 'Average Order Value Opportunity',
        description: `Current AOV is $${revenue.averageOrderValue.toFixed(2)}`,
        metric: 'AOV',
        recommendation: 'Consider bundled ticket packages or upselling VIP options',
        priority: 'medium',
        createdAt: now
      })
    }

    // Peak hours insight
    const peakHour = sales.hourlyDistribution.reduce((max, curr) =>
      curr.count > max.count ? curr : max
    , { hour: 0, count: 0 })

    if (peakHour.count > 0) {
      insights.push({
        id: 'peak-hours',
        type: 'info',
        title: 'Peak Sales Hours',
        description: `Most orders occur around ${peakHour.hour}:00 hours`,
        metric: 'Sales Distribution',
        recommendation: 'Schedule marketing emails and promotions around this time',
        priority: 'low',
        createdAt: now
      })
    }

    // New customers insight
    if (customers.newCustomers > 10) {
      insights.push({
        id: 'new-customers',
        type: 'success',
        title: 'Growing Customer Base',
        description: `${customers.newCustomers} new customers acquired in the last 30 days`,
        metric: 'New Customers',
        priority: 'medium',
        createdAt: now
      })
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }

  // Helper methods
  private static calculateVariance(values: number[]): number {
    if (values.length === 0) return 0
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length)
  }

  private static getOrderDate(order: any): Date {
    return order.purchaseDate?.toDate?.() ||
           order.createdAt?.toDate?.() ||
           new Date(order.purchaseDate || order.createdAt || 0)
  }

  private static getEventDate(event: any): Date {
    return event.schedule?.date?.toDate?.() ||
           event.date?.toDate?.() ||
           new Date(event.schedule?.date || event.date || 0)
  }

  // Data fetchers
  private static async fetchEvents(): Promise<any[]> {
    try {
      const eventsRef = collection(db, 'events')
      const snapshot = await getDocs(eventsRef)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('[AnalyticsService] Error fetching events:', error)
      return []
    }
  }

  private static async fetchOrders(): Promise<any[]> {
    try {
      const ordersRef = collection(db, 'orders')
      const snapshot = await getDocs(ordersRef)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('[AnalyticsService] Error fetching orders:', error)
      return []
    }
  }

  private static async fetchCustomers(): Promise<any[]> {
    try {
      const customersRef = collection(db, 'customers')
      const snapshot = await getDocs(customersRef)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('[AnalyticsService] Error fetching customers:', error)
      return []
    }
  }

  private static async fetchPromoters(): Promise<any[]> {
    try {
      const promotersRef = collection(db, 'promoters')
      const snapshot = await getDocs(promotersRef)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('[AnalyticsService] Error fetching promoters:', error)
      return []
    }
  }

  private static getEmptyMetrics(): AnalyticsMetrics {
    return {
      revenue: {
        total: 0,
        thisMonth: 0,
        lastMonth: 0,
        growth: 0,
        averageOrderValue: 0,
        revenueByCategory: {},
        revenueByPromoter: {},
        dailyRevenue: []
      },
      sales: {
        totalOrders: 0,
        thisMonthOrders: 0,
        lastMonthOrders: 0,
        orderGrowth: 0,
        conversionRate: 0,
        ticketsSold: 0,
        averageTicketsPerOrder: 0,
        salesByStatus: {},
        hourlyDistribution: []
      },
      customers: {
        totalCustomers: 0,
        newCustomers: 0,
        returningCustomers: 0,
        retentionRate: 0,
        customerLifetimeValue: 0,
        topCustomers: [],
        customersBySource: {}
      },
      events: {
        totalEvents: 0,
        activeEvents: 0,
        completedEvents: 0,
        upcomingEvents: 0,
        averageAttendance: 0,
        selloutRate: 0,
        topPerformingEvents: [],
        eventsByCategory: {}
      },
      trends: [],
      forecasts: {
        nextMonth: { revenue: 0, orders: 0, confidence: 0 },
        nextQuarter: { revenue: 0, orders: 0, confidence: 0 },
        seasonalTrends: []
      },
      insights: []
    }
  }
}

export default AnalyticsService
