import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AuditService } from './auditService'

const isBrowser = typeof window !== 'undefined'

export interface ReportConfig {
  type: ReportType
  title?: string
  dateRange?: {
    start: Date
    end: Date
  }
  filters?: ReportFilters
  groupBy?: string[]
  sortBy?: { field: string; direction: 'asc' | 'desc' }
  format?: 'json' | 'csv' | 'xlsx'
  includeCharts?: boolean
}

export type ReportType =
  | 'sales_summary'
  | 'event_performance'
  | 'customer_analysis'
  | 'revenue_breakdown'
  | 'promoter_performance'
  | 'venue_utilization'
  | 'ticket_inventory'
  | 'refund_analysis'
  | 'commission_report'
  | 'marketing_effectiveness'

export interface ReportFilters {
  eventIds?: string[]
  venueIds?: string[]
  promoterIds?: string[]
  categories?: string[]
  status?: string[]
  minRevenue?: number
  maxRevenue?: number
}

export interface Report {
  id: string
  type: ReportType
  title: string
  generatedAt: Date
  dateRange?: { start: Date; end: Date }
  summary: ReportSummary
  data: ReportData[]
  charts?: ChartData[]
  metadata: ReportMetadata
}

export interface ReportSummary {
  totalRecords: number
  keyMetrics: { label: string; value: number | string; change?: number }[]
  highlights: string[]
}

export interface ReportData {
  [key: string]: any
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'area'
  title: string
  data: { label: string; value: number; color?: string }[]
}

export interface ReportMetadata {
  generatedBy?: string
  filters: ReportFilters
  recordCount: number
  processingTime: number
}

export class ReportService {

  // Generate a report based on configuration
  static async generateReport(
    config: ReportConfig,
    user?: { id: string; email: string; name?: string; role?: string }
  ): Promise<Report | null> {
    if (!isBrowser) return null

    const startTime = Date.now()

    try {
      let report: Report | null = null

      switch (config.type) {
        case 'sales_summary':
          report = await this.generateSalesSummaryReport(config)
          break
        case 'event_performance':
          report = await this.generateEventPerformanceReport(config)
          break
        case 'customer_analysis':
          report = await this.generateCustomerAnalysisReport(config)
          break
        case 'revenue_breakdown':
          report = await this.generateRevenueBreakdownReport(config)
          break
        case 'promoter_performance':
          report = await this.generatePromoterPerformanceReport(config)
          break
        case 'venue_utilization':
          report = await this.generateVenueUtilizationReport(config)
          break
        case 'ticket_inventory':
          report = await this.generateTicketInventoryReport(config)
          break
        case 'refund_analysis':
          report = await this.generateRefundAnalysisReport(config)
          break
        case 'commission_report':
          report = await this.generateCommissionReport(config)
          break
        case 'marketing_effectiveness':
          report = await this.generateMarketingEffectivenessReport(config)
          break
        default:
          return null
      }

      if (report && user) {
        await AuditService.logExport('report', user, {
          format: config.format || 'json',
          recordCount: report.data.length,
          filters: config.filters
        })
      }

      return report
    } catch (error) {
      console.error('[ReportService] Error generating report:', error)
      return null
    }
  }

  // Export report to CSV format
  static exportToCsv(report: Report): string {
    if (report.data.length === 0) return ''

    const headers = Object.keys(report.data[0])
    const rows = report.data.map(row =>
      headers.map(h => {
        const value = row[h]
        if (value === null || value === undefined) return ''
        if (typeof value === 'object') return JSON.stringify(value)
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return String(value)
      }).join(',')
    )

    return [headers.join(','), ...rows].join('\n')
  }

  // Generate Sales Summary Report
  private static async generateSalesSummaryReport(config: ReportConfig): Promise<Report> {
    const [events, orders] = await Promise.all([
      this.fetchEvents(),
      this.fetchOrders()
    ])

    const filteredOrders = this.applyDateFilter(
      this.applyOrderFilters(orders, config.filters, events),
      config.dateRange
    )

    // Calculate metrics
    const totalRevenue = filteredOrders.reduce((sum, o) =>
      sum + (o.pricing?.total || o.total || 0), 0
    )
    const totalOrders = filteredOrders.length
    const totalTickets = filteredOrders.reduce((sum, o) =>
      sum + (o.tickets?.length || o.quantity || 1), 0
    )
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Group by day
    const salesByDay: Record<string, { revenue: number; orders: number; tickets: number }> = {}
    filteredOrders.forEach(order => {
      const date = this.getOrderDate(order).toISOString().split('T')[0]
      if (!salesByDay[date]) {
        salesByDay[date] = { revenue: 0, orders: 0, tickets: 0 }
      }
      salesByDay[date].revenue += order.pricing?.total || order.total || 0
      salesByDay[date].orders++
      salesByDay[date].tickets += order.tickets?.length || order.quantity || 1
    })

    const data = Object.entries(salesByDay)
      .map(([date, metrics]) => ({
        date,
        revenue: Math.round(metrics.revenue * 100) / 100,
        orders: metrics.orders,
        tickets: metrics.tickets,
        avgOrderValue: metrics.orders > 0 ? Math.round(metrics.revenue / metrics.orders * 100) / 100 : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      id: this.generateReportId(),
      type: 'sales_summary',
      title: config.title || 'Sales Summary Report',
      generatedAt: new Date(),
      dateRange: config.dateRange,
      summary: {
        totalRecords: filteredOrders.length,
        keyMetrics: [
          { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}` },
          { label: 'Total Orders', value: totalOrders },
          { label: 'Total Tickets', value: totalTickets },
          { label: 'Avg Order Value', value: `$${avgOrderValue.toFixed(2)}` }
        ],
        highlights: this.generateSalesHighlights(filteredOrders, salesByDay)
      },
      data,
      charts: config.includeCharts ? [
        {
          type: 'line',
          title: 'Daily Revenue',
          data: data.map(d => ({ label: d.date, value: d.revenue }))
        },
        {
          type: 'bar',
          title: 'Daily Orders',
          data: data.map(d => ({ label: d.date, value: d.orders }))
        }
      ] : undefined,
      metadata: {
        filters: config.filters || {},
        recordCount: data.length,
        processingTime: 0
      }
    }
  }

  // Generate Event Performance Report
  private static async generateEventPerformanceReport(config: ReportConfig): Promise<Report> {
    const [events, orders] = await Promise.all([
      this.fetchEvents(),
      this.fetchOrders()
    ])

    let filteredEvents = this.applyEventFilters(events, config.filters)

    // Calculate performance for each event
    const data = filteredEvents.map(event => {
      const eventOrders = orders.filter(o => o.eventId === event.id)
      const revenue = eventOrders.reduce((sum, o) =>
        sum + (o.pricing?.total || o.total || 0), 0
      )
      const ticketsSold = eventOrders.reduce((sum, o) =>
        sum + (o.tickets?.length || o.quantity || 1), 0
      )
      const capacity = event.capacity || event.totalCapacity || 0
      const fillRate = capacity > 0 ? (ticketsSold / capacity) * 100 : 0

      const eventDate = event.schedule?.date?.toDate?.() || new Date(event.schedule?.date || 0)

      return {
        eventId: event.id,
        eventName: event.name || 'Unnamed',
        category: event.category || 'Other',
        venue: event.venueName || 'Unknown',
        eventDate: eventDate.toISOString(),
        status: event.status || 'unknown',
        capacity,
        ticketsSold,
        fillRate: Math.round(fillRate * 10) / 10,
        revenue: Math.round(revenue * 100) / 100,
        orders: eventOrders.length,
        avgTicketPrice: ticketsSold > 0 ? Math.round(revenue / ticketsSold * 100) / 100 : 0
      }
    }).sort((a, b) => b.revenue - a.revenue)

    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
    const totalTickets = data.reduce((sum, d) => sum + d.ticketsSold, 0)
    const avgFillRate = data.length > 0
      ? data.reduce((sum, d) => sum + d.fillRate, 0) / data.length
      : 0

    return {
      id: this.generateReportId(),
      type: 'event_performance',
      title: config.title || 'Event Performance Report',
      generatedAt: new Date(),
      dateRange: config.dateRange,
      summary: {
        totalRecords: data.length,
        keyMetrics: [
          { label: 'Total Events', value: data.length },
          { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}` },
          { label: 'Total Tickets', value: totalTickets },
          { label: 'Avg Fill Rate', value: `${avgFillRate.toFixed(1)}%` }
        ],
        highlights: [
          `Top performer: ${data[0]?.eventName || 'N/A'} ($${data[0]?.revenue?.toLocaleString() || 0})`,
          `${data.filter(d => d.fillRate >= 90).length} events at 90%+ capacity`,
          `Average revenue per event: $${data.length > 0 ? Math.round(totalRevenue / data.length) : 0}`
        ]
      },
      data,
      charts: config.includeCharts ? [
        {
          type: 'bar',
          title: 'Top 10 Events by Revenue',
          data: data.slice(0, 10).map(d => ({ label: d.eventName.substring(0, 20), value: d.revenue }))
        },
        {
          type: 'pie',
          title: 'Revenue by Category',
          data: this.groupByField(data, 'category', 'revenue')
        }
      ] : undefined,
      metadata: {
        filters: config.filters || {},
        recordCount: data.length,
        processingTime: 0
      }
    }
  }

  // Generate Customer Analysis Report
  private static async generateCustomerAnalysisReport(config: ReportConfig): Promise<Report> {
    const [events, orders, customers] = await Promise.all([
      this.fetchEvents(),
      this.fetchOrders(),
      this.fetchCustomers()
    ])

    const filteredOrders = this.applyDateFilter(
      this.applyOrderFilters(orders, config.filters, events),
      config.dateRange
    )

    // Build customer metrics
    const customerMetrics: Record<string, {
      email: string
      name: string
      orders: number
      totalSpent: number
      tickets: number
      firstPurchase: Date
      lastPurchase: Date
      categories: Set<string>
    }> = {}

    const eventLookup: Record<string, any> = {}
    events.forEach(e => { eventLookup[e.id] = e })

    filteredOrders.forEach(order => {
      const email = (order.customer?.email || order.customerEmail || '').toLowerCase()
      if (!email) return

      if (!customerMetrics[email]) {
        customerMetrics[email] = {
          email,
          name: order.customer?.name || order.customerName || 'Unknown',
          orders: 0,
          totalSpent: 0,
          tickets: 0,
          firstPurchase: new Date(),
          lastPurchase: new Date(0),
          categories: new Set()
        }
      }

      const m = customerMetrics[email]
      const orderDate = this.getOrderDate(order)

      m.orders++
      m.totalSpent += order.pricing?.total || order.total || 0
      m.tickets += order.tickets?.length || order.quantity || 1

      if (orderDate < m.firstPurchase) m.firstPurchase = orderDate
      if (orderDate > m.lastPurchase) m.lastPurchase = orderDate

      const event = eventLookup[order.eventId]
      if (event?.category) m.categories.add(event.category)
    })

    const data = Object.values(customerMetrics)
      .map(m => ({
        email: m.email,
        name: m.name,
        orders: m.orders,
        totalSpent: Math.round(m.totalSpent * 100) / 100,
        tickets: m.tickets,
        avgOrderValue: m.orders > 0 ? Math.round(m.totalSpent / m.orders * 100) / 100 : 0,
        firstPurchase: m.firstPurchase.toISOString(),
        lastPurchase: m.lastPurchase.toISOString(),
        daysSinceLastPurchase: Math.floor((Date.now() - m.lastPurchase.getTime()) / (24 * 60 * 60 * 1000)),
        favoriteCategories: Array.from(m.categories).slice(0, 3).join(', ')
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)

    const totalCustomers = data.length
    const totalRevenue = data.reduce((sum, d) => sum + d.totalSpent, 0)
    const avgLifetimeValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0
    const repeatCustomers = data.filter(d => d.orders > 1).length

    return {
      id: this.generateReportId(),
      type: 'customer_analysis',
      title: config.title || 'Customer Analysis Report',
      generatedAt: new Date(),
      dateRange: config.dateRange,
      summary: {
        totalRecords: totalCustomers,
        keyMetrics: [
          { label: 'Total Customers', value: totalCustomers },
          { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}` },
          { label: 'Avg Lifetime Value', value: `$${avgLifetimeValue.toFixed(2)}` },
          { label: 'Repeat Rate', value: `${totalCustomers > 0 ? Math.round(repeatCustomers / totalCustomers * 100) : 0}%` }
        ],
        highlights: [
          `Top customer: ${data[0]?.name || 'N/A'} ($${data[0]?.totalSpent?.toLocaleString() || 0})`,
          `${repeatCustomers} repeat customers (${totalCustomers > 0 ? Math.round(repeatCustomers / totalCustomers * 100) : 0}%)`,
          `Average ${data.length > 0 ? Math.round(data.reduce((s, d) => s + d.orders, 0) / data.length * 10) / 10 : 0} orders per customer`
        ]
      },
      data,
      charts: config.includeCharts ? [
        {
          type: 'bar',
          title: 'Top 10 Customers by Revenue',
          data: data.slice(0, 10).map(d => ({ label: d.name.substring(0, 15), value: d.totalSpent }))
        },
        {
          type: 'pie',
          title: 'Customer Segments',
          data: [
            { label: 'One-time', value: data.filter(d => d.orders === 1).length },
            { label: '2-3 orders', value: data.filter(d => d.orders >= 2 && d.orders <= 3).length },
            { label: '4+ orders', value: data.filter(d => d.orders >= 4).length }
          ]
        }
      ] : undefined,
      metadata: {
        filters: config.filters || {},
        recordCount: data.length,
        processingTime: 0
      }
    }
  }

  // Generate Revenue Breakdown Report
  private static async generateRevenueBreakdownReport(config: ReportConfig): Promise<Report> {
    const [events, orders] = await Promise.all([
      this.fetchEvents(),
      this.fetchOrders()
    ])

    const filteredOrders = this.applyDateFilter(
      this.applyOrderFilters(orders, config.filters, events),
      config.dateRange
    )

    const eventLookup: Record<string, any> = {}
    events.forEach(e => { eventLookup[e.id] = e })

    // Revenue by category
    const byCategory: Record<string, number> = {}
    // Revenue by venue
    const byVenue: Record<string, number> = {}
    // Revenue by promoter
    const byPromoter: Record<string, number> = {}
    // Revenue by month
    const byMonth: Record<string, number> = {}

    let ticketRevenue = 0
    let feeRevenue = 0

    filteredOrders.forEach(order => {
      const event = eventLookup[order.eventId]
      const total = order.pricing?.total || order.total || 0
      const fees = (order.pricing?.fees?.service || 0) +
                   (order.pricing?.fees?.processing || 0) +
                   (order.pricing?.fees?.facility || 0)

      ticketRevenue += total - fees
      feeRevenue += fees

      const category = event?.category || 'Other'
      byCategory[category] = (byCategory[category] || 0) + total

      const venue = event?.venueName || 'Unknown'
      byVenue[venue] = (byVenue[venue] || 0) + total

      const promoter = event?.promoterId || 'Unassigned'
      byPromoter[promoter] = (byPromoter[promoter] || 0) + total

      const month = this.getOrderDate(order).toISOString().substring(0, 7)
      byMonth[month] = (byMonth[month] || 0) + total
    })

    const totalRevenue = ticketRevenue + feeRevenue

    const data = [
      ...Object.entries(byCategory).map(([name, value]) => ({
        dimension: 'Category',
        name,
        revenue: Math.round(value * 100) / 100,
        percentage: totalRevenue > 0 ? Math.round(value / totalRevenue * 100 * 10) / 10 : 0
      })),
      ...Object.entries(byVenue).map(([name, value]) => ({
        dimension: 'Venue',
        name,
        revenue: Math.round(value * 100) / 100,
        percentage: totalRevenue > 0 ? Math.round(value / totalRevenue * 100 * 10) / 10 : 0
      }))
    ]

    return {
      id: this.generateReportId(),
      type: 'revenue_breakdown',
      title: config.title || 'Revenue Breakdown Report',
      generatedAt: new Date(),
      dateRange: config.dateRange,
      summary: {
        totalRecords: filteredOrders.length,
        keyMetrics: [
          { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}` },
          { label: 'Ticket Revenue', value: `$${ticketRevenue.toLocaleString()}` },
          { label: 'Fee Revenue', value: `$${feeRevenue.toLocaleString()}` },
          { label: 'Categories', value: Object.keys(byCategory).length }
        ],
        highlights: [
          `Top category: ${Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}`,
          `Fees represent ${totalRevenue > 0 ? Math.round(feeRevenue / totalRevenue * 100) : 0}% of revenue`,
          `${Object.keys(byVenue).length} venues generated revenue`
        ]
      },
      data,
      charts: config.includeCharts ? [
        {
          type: 'pie',
          title: 'Revenue by Category',
          data: Object.entries(byCategory).map(([label, value]) => ({ label, value }))
        },
        {
          type: 'line',
          title: 'Monthly Revenue Trend',
          data: Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).map(([label, value]) => ({ label, value }))
        }
      ] : undefined,
      metadata: {
        filters: config.filters || {},
        recordCount: data.length,
        processingTime: 0
      }
    }
  }

  // Generate Promoter Performance Report
  private static async generatePromoterPerformanceReport(config: ReportConfig): Promise<Report> {
    const [events, orders, promoters] = await Promise.all([
      this.fetchEvents(),
      this.fetchOrders(),
      this.fetchPromoters()
    ])

    let filteredPromoters = promoters
    if (config.filters?.promoterIds) {
      filteredPromoters = promoters.filter(p => config.filters!.promoterIds!.includes(p.id))
    }

    const data = filteredPromoters.map(promoter => {
      const promoterEvents = events.filter(e => e.promoterId === promoter.id)
      const eventIds = promoterEvents.map(e => e.id)
      const promoterOrders = orders.filter(o => eventIds.includes(o.eventId))

      const revenue = promoterOrders.reduce((sum, o) =>
        sum + (o.pricing?.total || o.total || 0), 0
      )
      const tickets = promoterOrders.reduce((sum, o) =>
        sum + (o.tickets?.length || o.quantity || 1), 0
      )
      const commissionRate = promoter.commission || 10
      const commission = revenue * (commissionRate / 100)

      return {
        promoterId: promoter.id,
        promoterName: promoter.name || promoter.companyName || 'Unknown',
        email: promoter.email || '',
        active: promoter.active,
        totalEvents: promoterEvents.length,
        activeEvents: promoterEvents.filter(e => {
          const d = e.schedule?.date?.toDate?.() || new Date(0)
          return d > new Date()
        }).length,
        totalOrders: promoterOrders.length,
        ticketsSold: tickets,
        revenue: Math.round(revenue * 100) / 100,
        commissionRate,
        commissionEarned: Math.round(commission * 100) / 100,
        avgRevenuePerEvent: promoterEvents.length > 0 ? Math.round(revenue / promoterEvents.length * 100) / 100 : 0
      }
    }).sort((a, b) => b.revenue - a.revenue)

    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
    const totalCommission = data.reduce((sum, d) => sum + d.commissionEarned, 0)

    return {
      id: this.generateReportId(),
      type: 'promoter_performance',
      title: config.title || 'Promoter Performance Report',
      generatedAt: new Date(),
      dateRange: config.dateRange,
      summary: {
        totalRecords: data.length,
        keyMetrics: [
          { label: 'Total Promoters', value: data.length },
          { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}` },
          { label: 'Total Commission', value: `$${totalCommission.toLocaleString()}` },
          { label: 'Active Promoters', value: data.filter(d => d.active).length }
        ],
        highlights: [
          `Top performer: ${data[0]?.promoterName || 'N/A'} ($${data[0]?.revenue?.toLocaleString() || 0})`,
          `${data.reduce((sum, d) => sum + d.totalEvents, 0)} total events managed`,
          `Average commission rate: ${data.length > 0 ? Math.round(data.reduce((s, d) => s + d.commissionRate, 0) / data.length * 10) / 10 : 0}%`
        ]
      },
      data,
      charts: config.includeCharts ? [
        {
          type: 'bar',
          title: 'Revenue by Promoter',
          data: data.slice(0, 10).map(d => ({ label: d.promoterName.substring(0, 15), value: d.revenue }))
        }
      ] : undefined,
      metadata: {
        filters: config.filters || {},
        recordCount: data.length,
        processingTime: 0
      }
    }
  }

  // Simplified implementations for other report types
  private static async generateVenueUtilizationReport(config: ReportConfig): Promise<Report> {
    const [events, orders, venues] = await Promise.all([
      this.fetchEvents(),
      this.fetchOrders(),
      this.fetchVenues()
    ])

    const data = venues.map(venue => {
      const venueEvents = events.filter(e => e.venueId === venue.id)
      const eventIds = venueEvents.map(e => e.id)
      const venueOrders = orders.filter(o => eventIds.includes(o.eventId))
      const tickets = venueOrders.reduce((sum, o) => sum + (o.tickets?.length || o.quantity || 1), 0)
      const capacity = venue.capacity || 1000

      return {
        venueId: venue.id,
        venueName: venue.name || 'Unknown',
        capacity,
        totalEvents: venueEvents.length,
        ticketsSold: tickets,
        utilization: capacity > 0 ? Math.round(tickets / (capacity * venueEvents.length || 1) * 100) : 0
      }
    }).sort((a, b) => b.utilization - a.utilization)

    return {
      id: this.generateReportId(),
      type: 'venue_utilization',
      title: config.title || 'Venue Utilization Report',
      generatedAt: new Date(),
      summary: {
        totalRecords: data.length,
        keyMetrics: [{ label: 'Total Venues', value: data.length }],
        highlights: [`Top venue: ${data[0]?.venueName || 'N/A'}`]
      },
      data,
      metadata: { filters: config.filters || {}, recordCount: data.length, processingTime: 0 }
    }
  }

  private static async generateTicketInventoryReport(config: ReportConfig): Promise<Report> {
    const [events, orders] = await Promise.all([this.fetchEvents(), this.fetchOrders()])

    const data = events.map(event => {
      const eventOrders = orders.filter(o => o.eventId === event.id)
      const sold = eventOrders.reduce((sum, o) => sum + (o.tickets?.length || o.quantity || 1), 0)
      const capacity = event.capacity || 1000

      return {
        eventId: event.id,
        eventName: event.name || 'Unknown',
        capacity,
        sold,
        available: capacity - sold,
        percentSold: Math.round(sold / capacity * 100)
      }
    })

    return {
      id: this.generateReportId(),
      type: 'ticket_inventory',
      title: config.title || 'Ticket Inventory Report',
      generatedAt: new Date(),
      summary: {
        totalRecords: data.length,
        keyMetrics: [{ label: 'Total Events', value: data.length }],
        highlights: []
      },
      data,
      metadata: { filters: config.filters || {}, recordCount: data.length, processingTime: 0 }
    }
  }

  private static async generateRefundAnalysisReport(config: ReportConfig): Promise<Report> {
    const orders = await this.fetchOrders()
    const refundedOrders = orders.filter(o => o.status === 'refunded' || o.status === 'cancelled')

    const data = refundedOrders.map(order => ({
      orderId: order.id,
      status: order.status,
      amount: order.pricing?.total || order.total || 0,
      date: this.getOrderDate(order).toISOString()
    }))

    return {
      id: this.generateReportId(),
      type: 'refund_analysis',
      title: config.title || 'Refund Analysis Report',
      generatedAt: new Date(),
      summary: {
        totalRecords: data.length,
        keyMetrics: [
          { label: 'Total Refunds', value: data.length },
          { label: 'Total Amount', value: `$${data.reduce((s, d) => s + d.amount, 0).toLocaleString()}` }
        ],
        highlights: []
      },
      data,
      metadata: { filters: config.filters || {}, recordCount: data.length, processingTime: 0 }
    }
  }

  private static async generateCommissionReport(config: ReportConfig): Promise<Report> {
    const [events, orders, promoters] = await Promise.all([
      this.fetchEvents(),
      this.fetchOrders(),
      this.fetchPromoters()
    ])

    const data = promoters.map(promoter => {
      const promoterEvents = events.filter(e => e.promoterId === promoter.id)
      const eventIds = promoterEvents.map(e => e.id)
      const revenue = orders
        .filter(o => eventIds.includes(o.eventId))
        .reduce((sum, o) => sum + (o.pricing?.total || o.total || 0), 0)
      const rate = promoter.commission || 10

      return {
        promoterId: promoter.id,
        promoterName: promoter.name || 'Unknown',
        revenue: Math.round(revenue * 100) / 100,
        commissionRate: rate,
        commissionOwed: Math.round(revenue * rate / 100 * 100) / 100
      }
    }).filter(d => d.commissionOwed > 0)

    return {
      id: this.generateReportId(),
      type: 'commission_report',
      title: config.title || 'Commission Report',
      generatedAt: new Date(),
      summary: {
        totalRecords: data.length,
        keyMetrics: [
          { label: 'Total Commission Owed', value: `$${data.reduce((s, d) => s + d.commissionOwed, 0).toLocaleString()}` }
        ],
        highlights: []
      },
      data,
      metadata: { filters: config.filters || {}, recordCount: data.length, processingTime: 0 }
    }
  }

  private static async generateMarketingEffectivenessReport(config: ReportConfig): Promise<Report> {
    const [orders, promotions] = await Promise.all([
      this.fetchOrders(),
      this.fetchPromotions()
    ])

    const promoUsage: Record<string, { uses: number; revenue: number }> = {}
    orders.forEach(order => {
      const code = order.promoCode || order.discountCode
      if (!code) return
      if (!promoUsage[code]) promoUsage[code] = { uses: 0, revenue: 0 }
      promoUsage[code].uses++
      promoUsage[code].revenue += order.pricing?.total || order.total || 0
    })

    const data = Object.entries(promoUsage).map(([code, stats]) => ({
      promoCode: code,
      uses: stats.uses,
      revenue: Math.round(stats.revenue * 100) / 100
    })).sort((a, b) => b.revenue - a.revenue)

    return {
      id: this.generateReportId(),
      type: 'marketing_effectiveness',
      title: config.title || 'Marketing Effectiveness Report',
      generatedAt: new Date(),
      summary: {
        totalRecords: data.length,
        keyMetrics: [
          { label: 'Promo Codes Used', value: data.length },
          { label: 'Total Revenue', value: `$${data.reduce((s, d) => s + d.revenue, 0).toLocaleString()}` }
        ],
        highlights: []
      },
      data,
      metadata: { filters: config.filters || {}, recordCount: data.length, processingTime: 0 }
    }
  }

  // Helper methods
  private static generateReportId(): string {
    return `rpt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }

  private static getOrderDate(order: any): Date {
    return order.purchaseDate?.toDate?.() || order.createdAt?.toDate?.() || new Date(0)
  }

  private static applyDateFilter(orders: any[], dateRange?: { start: Date; end: Date }): any[] {
    if (!dateRange) return orders
    return orders.filter(order => {
      const date = this.getOrderDate(order)
      return date >= dateRange.start && date <= dateRange.end
    })
  }

  private static applyOrderFilters(orders: any[], filters?: ReportFilters, events?: any[]): any[] {
    if (!filters) return orders

    let filtered = orders

    if (filters.eventIds?.length) {
      filtered = filtered.filter(o => filters.eventIds!.includes(o.eventId))
    }

    if (filters.status?.length) {
      filtered = filtered.filter(o => filters.status!.includes(o.status))
    }

    return filtered
  }

  private static applyEventFilters(events: any[], filters?: ReportFilters): any[] {
    if (!filters) return events

    let filtered = events

    if (filters.eventIds?.length) {
      filtered = filtered.filter(e => filters.eventIds!.includes(e.id))
    }

    if (filters.venueIds?.length) {
      filtered = filtered.filter(e => filters.venueIds!.includes(e.venueId))
    }

    if (filters.promoterIds?.length) {
      filtered = filtered.filter(e => filters.promoterIds!.includes(e.promoterId))
    }

    if (filters.categories?.length) {
      filtered = filtered.filter(e => filters.categories!.includes(e.category))
    }

    return filtered
  }

  private static groupByField(data: any[], field: string, sumField: string): { label: string; value: number }[] {
    const grouped: Record<string, number> = {}
    data.forEach(d => {
      const key = d[field] || 'Other'
      grouped[key] = (grouped[key] || 0) + (d[sumField] || 0)
    })
    return Object.entries(grouped).map(([label, value]) => ({ label, value }))
  }

  private static generateSalesHighlights(orders: any[], salesByDay: Record<string, any>): string[] {
    const highlights: string[] = []
    const days = Object.entries(salesByDay)
    if (days.length > 0) {
      const bestDay = days.sort((a, b) => b[1].revenue - a[1].revenue)[0]
      highlights.push(`Best day: ${bestDay[0]} ($${bestDay[1].revenue.toLocaleString()})`)
    }
    highlights.push(`${orders.length} total orders processed`)
    return highlights
  }

  // Data fetchers
  private static async fetchEvents(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'events'))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch { return [] }
  }

  private static async fetchOrders(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'orders'))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch { return [] }
  }

  private static async fetchCustomers(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'customers'))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch { return [] }
  }

  private static async fetchPromoters(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'promoters'))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch { return [] }
  }

  private static async fetchVenues(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'venues'))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch { return [] }
  }

  private static async fetchPromotions(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'promotions'))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch { return [] }
  }
}

export default ReportService
