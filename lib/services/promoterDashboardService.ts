/**
 * Advanced Promoter Dashboard Service
 * Comprehensive KPI tracking and business intelligence for promoters
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

// ==================== KPI TYPES ====================

export interface PromoterKPIs {
  promoterId: string
  period: {
    start: Date
    end: Date
    type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  }
  revenue: {
    total: number
    ticketSales: number
    fees: number
    refunds: number
    net: number
    trend: number // percentage change from previous period
    byEvent: { eventId: string; eventName: string; amount: number }[]
    byChannel: { channel: string; amount: number }[]
  }
  sales: {
    totalTickets: number
    totalOrders: number
    averageOrderValue: number
    conversionRate: number
    abandonedCarts: number
    abandonedCartValue: number
    trend: number
  }
  customers: {
    total: number
    new: number
    returning: number
    returningRate: number
    averageLifetimeValue: number
    churnRate: number
    topCustomers: { customerId: string; name: string; totalSpent: number }[]
  }
  events: {
    totalActive: number
    totalUpcoming: number
    totalCompleted: number
    averageCapacityUtilization: number
    bestPerforming: { eventId: string; eventName: string; revenue: number; attendance: number }[]
    underperforming: { eventId: string; eventName: string; capacityUtilization: number }[]
  }
  marketing: {
    emailsSent: number
    emailOpenRate: number
    emailClickRate: number
    campaignROI: number
    topCampaigns: { campaignId: string; name: string; revenue: number; roi: number }[]
  }
  operations: {
    averageCheckInTime: number // minutes before event
    noShowRate: number
    transferRate: number
    refundRate: number
    supportTickets: number
    averageResolutionTime: number // hours
  }
}

export interface DashboardWidget {
  id?: string
  promoterId: string
  type: 'metric' | 'chart' | 'table' | 'list' | 'progress' | 'comparison'
  title: string
  dataSource: string // KPI path like 'revenue.total' or 'sales.totalTickets'
  visualization?: {
    chartType?: 'line' | 'bar' | 'pie' | 'donut' | 'area'
    colors?: string[]
    showLegend?: boolean
    showLabels?: boolean
  }
  comparison?: {
    enabled: boolean
    type: 'previous_period' | 'same_period_last_year' | 'target'
    target?: number
  }
  position: { x: number; y: number; width: number; height: number }
  refreshInterval?: number // minutes
  createdAt: Date
  updatedAt: Date
}

export interface DashboardLayout {
  id?: string
  promoterId: string
  name: string
  isDefault: boolean
  widgets: string[] // Widget IDs
  gridSize: { columns: number; rows: number }
  createdAt: Date
  updatedAt: Date
}

export interface GoalTracking {
  id?: string
  promoterId: string
  name: string
  type: 'revenue' | 'tickets' | 'customers' | 'events' | 'custom'
  metric: string // KPI path
  target: number
  current: number
  unit?: string
  period: {
    start: Date
    end: Date
  }
  milestones?: {
    percentage: number
    reached: boolean
    reachedAt?: Date
  }[]
  status: 'on_track' | 'at_risk' | 'behind' | 'completed'
  createdAt: Date
  updatedAt: Date
}

export interface PerformanceBenchmark {
  id?: string
  metric: string
  industryAverage: number
  topPerformer: number
  bottomPerformer: number
  percentile25: number
  percentile50: number
  percentile75: number
  category: string
  updatedAt: Date
}

export interface AlertRule {
  id?: string
  promoterId: string
  name: string
  metric: string
  condition: {
    operator: 'greater_than' | 'less_than' | 'equals' | 'change_by'
    threshold: number
    timeWindow?: number // minutes
  }
  severity: 'info' | 'warning' | 'critical'
  notification: {
    email?: boolean
    sms?: boolean
    inApp?: boolean
    recipients?: string[]
  }
  enabled: boolean
  lastTriggered?: Date
  triggerCount: number
  createdAt: Date
  updatedAt: Date
}

export interface DashboardAlert {
  id?: string
  promoterId: string
  ruleId: string
  ruleName: string
  metric: string
  value: number
  threshold: number
  message: string
  severity: AlertRule['severity']
  status: 'active' | 'acknowledged' | 'resolved'
  acknowledgedBy?: string
  acknowledgedAt?: Date
  resolvedAt?: Date
  createdAt: Date
}

// ==================== SERVICE ====================

class PromoterDashboardServiceClass {

  // ==================== KPI CALCULATION ====================

  async calculateKPIs(
    promoterId: string,
    periodType: PromoterKPIs['period']['type'],
    customRange?: { start: Date; end: Date }
  ): Promise<PromoterKPIs> {
    const period = this.getPeriodRange(periodType, customRange)
    const previousPeriod = this.getPreviousPeriodRange(period)

    // Fetch all relevant data in parallel
    const [
      currentOrders,
      previousOrders,
      currentCustomers,
      previousCustomers,
      events,
      campaigns,
      checkIns,
    ] = await Promise.all([
      this.getOrdersForPeriod(promoterId, period.start, period.end),
      this.getOrdersForPeriod(promoterId, previousPeriod.start, previousPeriod.end),
      this.getCustomersForPeriod(promoterId, period.start, period.end),
      this.getCustomersForPeriod(promoterId, previousPeriod.start, previousPeriod.end),
      this.getEventsForPromoter(promoterId),
      this.getCampaignsForPeriod(promoterId, period.start, period.end),
      this.getCheckInsForPeriod(promoterId, period.start, period.end),
    ])

    // Calculate revenue KPIs
    const revenue = this.calculateRevenueKPIs(currentOrders, previousOrders)

    // Calculate sales KPIs
    const sales = this.calculateSalesKPIs(currentOrders, previousOrders)

    // Calculate customer KPIs
    const customers = this.calculateCustomerKPIs(currentCustomers, previousCustomers, currentOrders)

    // Calculate event KPIs
    const eventsKPIs = this.calculateEventKPIs(events, currentOrders)

    // Calculate marketing KPIs
    const marketing = this.calculateMarketingKPIs(campaigns)

    // Calculate operations KPIs
    const operations = this.calculateOperationsKPIs(checkIns, currentOrders)

    return {
      promoterId,
      period: {
        start: period.start,
        end: period.end,
        type: periodType,
      },
      revenue,
      sales,
      customers,
      events: eventsKPIs,
      marketing,
      operations,
    }
  }

  private getPeriodRange(
    type: PromoterKPIs['period']['type'],
    custom?: { start: Date; end: Date }
  ): { start: Date; end: Date } {
    if (custom) return custom

    const now = new Date()
    const start = new Date()

    switch (type) {
      case 'daily':
        start.setHours(0, 0, 0, 0)
        break
      case 'weekly':
        start.setDate(now.getDate() - 7)
        break
      case 'monthly':
        start.setMonth(now.getMonth() - 1)
        break
      case 'quarterly':
        start.setMonth(now.getMonth() - 3)
        break
      case 'yearly':
        start.setFullYear(now.getFullYear() - 1)
        break
    }

    return { start, end: now }
  }

  private getPreviousPeriodRange(current: { start: Date; end: Date }): { start: Date; end: Date } {
    const duration = current.end.getTime() - current.start.getTime()
    return {
      start: new Date(current.start.getTime() - duration),
      end: new Date(current.end.getTime() - duration),
    }
  }

  private async getOrdersForPeriod(
    promoterId: string,
    start: Date,
    end: Date
  ): Promise<any[]> {
    const q = query(
      collection(db, 'orders'),
      where('promoterId', '==', promoterId),
      where('createdAt', '>=', Timestamp.fromDate(start)),
      where('createdAt', '<=', Timestamp.fromDate(end))
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    }))
  }

  private async getCustomersForPeriod(
    promoterId: string,
    start: Date,
    end: Date
  ): Promise<any[]> {
    const q = query(
      collection(db, 'customers'),
      where('promoterId', '==', promoterId)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      }))
      .filter((c: any) => c.createdAt >= start && c.createdAt <= end)
  }

  private async getEventsForPromoter(promoterId: string): Promise<any[]> {
    const q = query(
      collection(db, 'events'),
      where('promoterId', '==', promoterId)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate(),
    }))
  }

  private async getCampaignsForPeriod(
    promoterId: string,
    start: Date,
    end: Date
  ): Promise<any[]> {
    const q = query(
      collection(db, 'emailCampaigns'),
      where('promoterId', '==', promoterId)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        sentAt: doc.data().sentAt?.toDate(),
      }))
      .filter((c: any) => c.sentAt && c.sentAt >= start && c.sentAt <= end)
  }

  private async getCheckInsForPeriod(
    promoterId: string,
    start: Date,
    end: Date
  ): Promise<any[]> {
    const q = query(
      collection(db, 'checkIns'),
      where('promoterId', '==', promoterId),
      where('checkedInAt', '>=', Timestamp.fromDate(start)),
      where('checkedInAt', '<=', Timestamp.fromDate(end))
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      checkedInAt: doc.data().checkedInAt?.toDate(),
    }))
  }

  private calculateRevenueKPIs(currentOrders: any[], previousOrders: any[]): PromoterKPIs['revenue'] {
    const completedOrders = currentOrders.filter((o) => o.status === 'completed')
    const previousCompleted = previousOrders.filter((o) => o.status === 'completed')

    const ticketSales = completedOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0)
    const fees = completedOrders.reduce((sum, o) => sum + (o.fees || 0), 0)
    const refunds = currentOrders
      .filter((o) => o.status === 'refunded')
      .reduce((sum, o) => sum + (o.total || 0), 0)

    const total = ticketSales + fees
    const net = total - refunds

    const previousTotal = previousCompleted.reduce((sum, o) => sum + (o.total || 0), 0)
    const trend = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : 0

    // Group by event
    const byEvent: Record<string, { eventName: string; amount: number }> = {}
    completedOrders.forEach((o) => {
      if (!byEvent[o.eventId]) {
        byEvent[o.eventId] = { eventName: o.eventName || 'Unknown', amount: 0 }
      }
      byEvent[o.eventId].amount += o.total || 0
    })

    // Group by channel
    const byChannel: Record<string, number> = {}
    completedOrders.forEach((o) => {
      const channel = o.source || 'direct'
      byChannel[channel] = (byChannel[channel] || 0) + (o.total || 0)
    })

    return {
      total,
      ticketSales,
      fees,
      refunds,
      net,
      trend,
      byEvent: Object.entries(byEvent)
        .map(([eventId, data]) => ({ eventId, ...data }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10),
      byChannel: Object.entries(byChannel)
        .map(([channel, amount]) => ({ channel, amount }))
        .sort((a, b) => b.amount - a.amount),
    }
  }

  private calculateSalesKPIs(currentOrders: any[], previousOrders: any[]): PromoterKPIs['sales'] {
    const completedOrders = currentOrders.filter((o) => o.status === 'completed')
    const previousCompleted = previousOrders.filter((o) => o.status === 'completed')
    const abandonedOrders = currentOrders.filter((o) => o.status === 'abandoned')

    const totalTickets = completedOrders.reduce((sum, o) => sum + (o.ticketCount || 0), 0)
    const totalOrders = completedOrders.length
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Calculate conversion rate (requires page views)
    const views = currentOrders.length + abandonedOrders.length
    const conversionRate = views > 0 ? (completedOrders.length / views) * 100 : 0

    const abandonedCarts = abandonedOrders.length
    const abandonedCartValue = abandonedOrders.reduce((sum, o) => sum + (o.total || 0), 0)

    const previousTotal = previousCompleted.length
    const trend = previousTotal > 0 ? ((totalOrders - previousTotal) / previousTotal) * 100 : 0

    return {
      totalTickets,
      totalOrders,
      averageOrderValue,
      conversionRate,
      abandonedCarts,
      abandonedCartValue,
      trend,
    }
  }

  private calculateCustomerKPIs(
    currentCustomers: any[],
    previousCustomers: any[],
    orders: any[]
  ): PromoterKPIs['customers'] {
    const total = currentCustomers.length
    const newCustomers = currentCustomers.filter((c) => {
      const orderCount = orders.filter((o) => o.customerId === c.id).length
      return orderCount === 1
    }).length

    const returning = total - newCustomers
    const returningRate = total > 0 ? (returning / total) * 100 : 0

    // Calculate lifetime values
    const customerSpending: Record<string, { name: string; totalSpent: number }> = {}
    orders.forEach((o) => {
      if (!customerSpending[o.customerId]) {
        customerSpending[o.customerId] = {
          name: o.customerName || 'Unknown',
          totalSpent: 0,
        }
      }
      customerSpending[o.customerId].totalSpent += o.total || 0
    })

    const lifetimeValues = Object.values(customerSpending).map((c) => c.totalSpent)
    const averageLifetimeValue =
      lifetimeValues.length > 0
        ? lifetimeValues.reduce((a, b) => a + b, 0) / lifetimeValues.length
        : 0

    // Churn rate (simplified)
    const previousTotal = previousCustomers.length
    const churnRate = previousTotal > 0 ? Math.max(0, ((previousTotal - total) / previousTotal) * 100) : 0

    const topCustomers = Object.entries(customerSpending)
      .map(([customerId, data]) => ({ customerId, ...data }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)

    return {
      total,
      new: newCustomers,
      returning,
      returningRate,
      averageLifetimeValue,
      churnRate,
      topCustomers,
    }
  }

  private calculateEventKPIs(events: any[], orders: any[]): PromoterKPIs['events'] {
    const now = new Date()
    const activeEvents = events.filter((e) => e.status === 'published' && e.startDate > now)
    const upcomingEvents = events.filter((e) => e.startDate > now)
    const completedEvents = events.filter((e) => e.startDate <= now || e.status === 'completed')

    // Calculate event performance
    const eventPerformance = events.map((e) => {
      const eventOrders = orders.filter((o) => o.eventId === e.id && o.status === 'completed')
      const revenue = eventOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      const attendance = eventOrders.reduce((sum, o) => sum + (o.ticketCount || 0), 0)
      const capacityUtilization = e.capacity > 0 ? (attendance / e.capacity) * 100 : 0

      return {
        eventId: e.id,
        eventName: e.name,
        revenue,
        attendance,
        capacityUtilization,
      }
    })

    const averageCapacityUtilization =
      eventPerformance.length > 0
        ? eventPerformance.reduce((sum, e) => sum + e.capacityUtilization, 0) / eventPerformance.length
        : 0

    return {
      totalActive: activeEvents.length,
      totalUpcoming: upcomingEvents.length,
      totalCompleted: completedEvents.length,
      averageCapacityUtilization,
      bestPerforming: eventPerformance
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
      underperforming: eventPerformance
        .filter((e) => e.capacityUtilization < 50)
        .sort((a, b) => a.capacityUtilization - b.capacityUtilization)
        .slice(0, 5),
    }
  }

  private calculateMarketingKPIs(campaigns: any[]): PromoterKPIs['marketing'] {
    const sentCampaigns = campaigns.filter((c) => c.status === 'sent')

    const emailsSent = sentCampaigns.reduce((sum, c) => sum + (c.metrics?.sent || 0), 0)
    const totalOpened = sentCampaigns.reduce((sum, c) => sum + (c.metrics?.opened || 0), 0)
    const totalClicked = sentCampaigns.reduce((sum, c) => sum + (c.metrics?.clicked || 0), 0)

    const emailOpenRate = emailsSent > 0 ? (totalOpened / emailsSent) * 100 : 0
    const emailClickRate = emailsSent > 0 ? (totalClicked / emailsSent) * 100 : 0

    // Calculate ROI
    const totalRevenue = sentCampaigns.reduce((sum, c) => sum + (c.metrics?.revenue || 0), 0)
    const totalCost = sentCampaigns.reduce((sum, c) => sum + (c.cost || 0), 0)
    const campaignROI = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0

    const topCampaigns = sentCampaigns
      .map((c) => ({
        campaignId: c.id,
        name: c.name,
        revenue: c.metrics?.revenue || 0,
        roi: c.cost > 0 ? ((c.metrics?.revenue - c.cost) / c.cost) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    return {
      emailsSent,
      emailOpenRate,
      emailClickRate,
      campaignROI,
      topCampaigns,
    }
  }

  private calculateOperationsKPIs(checkIns: any[], orders: any[]): PromoterKPIs['operations'] {
    // Average check-in time (minutes before event)
    const checkInTimes = checkIns.map((c) => {
      const eventStart = c.eventStartTime
      const checkInTime = c.checkedInAt
      if (!eventStart || !checkInTime) return 0
      return (eventStart.getTime() - checkInTime.getTime()) / 60000
    }).filter((t) => t > 0)

    const averageCheckInTime =
      checkInTimes.length > 0
        ? checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length
        : 30

    // No-show rate
    const totalTickets = orders
      .filter((o) => o.status === 'completed')
      .reduce((sum, o) => sum + (o.ticketCount || 0), 0)
    const checkedIn = checkIns.length
    const noShowRate = totalTickets > 0 ? ((totalTickets - checkedIn) / totalTickets) * 100 : 0

    // Refund rate
    const refundedOrders = orders.filter((o) => o.status === 'refunded').length
    const refundRate = orders.length > 0 ? (refundedOrders / orders.length) * 100 : 0

    // Transfer rate (would need ticket transfer data)
    const transferRate = 0

    // Support metrics (placeholder - would need support system integration)
    const supportTickets = 0
    const averageResolutionTime = 0

    return {
      averageCheckInTime,
      noShowRate,
      transferRate,
      refundRate,
      supportTickets,
      averageResolutionTime,
    }
  }

  // ==================== DASHBOARD WIDGETS ====================

  async createWidget(
    widget: Omit<DashboardWidget, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<DashboardWidget> {
    const now = new Date()
    const widgetData = {
      ...widget,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    }

    const docRef = await addDoc(collection(db, 'dashboardWidgets'), widgetData)

    return {
      id: docRef.id,
      ...widget,
      createdAt: now,
      updatedAt: now,
    }
  }

  async getWidgets(promoterId: string): Promise<DashboardWidget[]> {
    const q = query(
      collection(db, 'dashboardWidgets'),
      where('promoterId', '==', promoterId)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as DashboardWidget[]
  }

  async updateWidget(
    widgetId: string,
    updates: Partial<DashboardWidget>
  ): Promise<void> {
    await updateDoc(doc(db, 'dashboardWidgets', widgetId), {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    })
  }

  // ==================== DASHBOARD LAYOUTS ====================

  async createLayout(
    layout: Omit<DashboardLayout, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DashboardLayout> {
    const now = new Date()

    // If setting as default, unset other defaults
    if (layout.isDefault) {
      const existingDefaults = await getDocs(
        query(
          collection(db, 'dashboardLayouts'),
          where('promoterId', '==', layout.promoterId),
          where('isDefault', '==', true)
        )
      )

      for (const docSnapshot of existingDefaults.docs) {
        await updateDoc(doc(db, 'dashboardLayouts', docSnapshot.id), {
          isDefault: false,
        })
      }
    }

    const layoutData = {
      ...layout,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    }

    const docRef = await addDoc(collection(db, 'dashboardLayouts'), layoutData)

    return {
      id: docRef.id,
      ...layout,
      createdAt: now,
      updatedAt: now,
    }
  }

  async getLayouts(promoterId: string): Promise<DashboardLayout[]> {
    const q = query(
      collection(db, 'dashboardLayouts'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as DashboardLayout[]
  }

  async getDefaultLayout(promoterId: string): Promise<DashboardLayout | null> {
    const q = query(
      collection(db, 'dashboardLayouts'),
      where('promoterId', '==', promoterId),
      where('isDefault', '==', true),
      limit(1)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    } as DashboardLayout
  }

  // ==================== GOAL TRACKING ====================

  async createGoal(
    goal: Omit<GoalTracking, 'id' | 'createdAt' | 'updatedAt' | 'current' | 'status'>
  ): Promise<GoalTracking> {
    const now = new Date()
    const goalData = {
      ...goal,
      current: 0,
      status: 'on_track' as const,
      period: {
        start: Timestamp.fromDate(goal.period.start),
        end: Timestamp.fromDate(goal.period.end),
      },
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    }

    const docRef = await addDoc(collection(db, 'goalTracking'), goalData)

    return {
      id: docRef.id,
      ...goal,
      current: 0,
      status: 'on_track',
      createdAt: now,
      updatedAt: now,
    }
  }

  async getGoals(promoterId: string): Promise<GoalTracking[]> {
    const q = query(
      collection(db, 'goalTracking'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      period: {
        start: doc.data().period?.start?.toDate(),
        end: doc.data().period?.end?.toDate(),
      },
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as GoalTracking[]
  }

  async updateGoalProgress(goalId: string, currentValue: number): Promise<void> {
    const goalDoc = await getDoc(doc(db, 'goalTracking', goalId))
    if (!goalDoc.exists()) return

    const goal = goalDoc.data()
    const progress = (currentValue / goal.target) * 100
    const now = new Date()
    const periodEnd = goal.period.end.toDate()
    const periodStart = goal.period.start.toDate()
    const totalDays = (periodEnd.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000)
    const elapsedDays = (now.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000)
    const expectedProgress = (elapsedDays / totalDays) * 100

    let status: GoalTracking['status']
    if (progress >= 100) {
      status = 'completed'
    } else if (progress >= expectedProgress * 0.9) {
      status = 'on_track'
    } else if (progress >= expectedProgress * 0.7) {
      status = 'at_risk'
    } else {
      status = 'behind'
    }

    // Check milestones
    const milestones = (goal.milestones || []).map((m: any) => ({
      ...m,
      reached: progress >= m.percentage,
      reachedAt: progress >= m.percentage && !m.reached ? now : m.reachedAt,
    }))

    await updateDoc(doc(db, 'goalTracking', goalId), {
      current: currentValue,
      status,
      milestones,
      updatedAt: Timestamp.fromDate(now),
    })
  }

  // ==================== BENCHMARKS ====================

  async getBenchmarks(category?: string): Promise<PerformanceBenchmark[]> {
    let q = query(collection(db, 'performanceBenchmarks'))

    if (category) {
      q = query(q, where('category', '==', category))
    }

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as PerformanceBenchmark[]
  }

  async compareToIndustry(
    kpis: PromoterKPIs
  ): Promise<{
    metric: string
    value: number
    industryAverage: number
    percentile: number
    status: 'above' | 'at' | 'below'
  }[]> {
    const benchmarks = await this.getBenchmarks()
    const comparisons: {
      metric: string
      value: number
      industryAverage: number
      percentile: number
      status: 'above' | 'at' | 'below'
    }[] = []

    const metricsToCompare = [
      { path: 'sales.conversionRate', benchmark: 'conversion_rate' },
      { path: 'customers.returningRate', benchmark: 'returning_customer_rate' },
      { path: 'marketing.emailOpenRate', benchmark: 'email_open_rate' },
      { path: 'events.averageCapacityUtilization', benchmark: 'capacity_utilization' },
    ]

    metricsToCompare.forEach(({ path, benchmark }) => {
      const benchmarkData = benchmarks.find((b) => b.metric === benchmark)
      if (!benchmarkData) return

      const value = this.getValueByPath(kpis, path)
      let percentile = 50

      if (value >= benchmarkData.topPerformer) {
        percentile = 95
      } else if (value >= benchmarkData.percentile75) {
        percentile = 75 + ((value - benchmarkData.percentile75) / (benchmarkData.topPerformer - benchmarkData.percentile75)) * 20
      } else if (value >= benchmarkData.percentile50) {
        percentile = 50 + ((value - benchmarkData.percentile50) / (benchmarkData.percentile75 - benchmarkData.percentile50)) * 25
      } else if (value >= benchmarkData.percentile25) {
        percentile = 25 + ((value - benchmarkData.percentile25) / (benchmarkData.percentile50 - benchmarkData.percentile25)) * 25
      } else {
        percentile = (value / benchmarkData.percentile25) * 25
      }

      let status: 'above' | 'at' | 'below'
      if (value > benchmarkData.industryAverage * 1.1) {
        status = 'above'
      } else if (value < benchmarkData.industryAverage * 0.9) {
        status = 'below'
      } else {
        status = 'at'
      }

      comparisons.push({
        metric: path,
        value,
        industryAverage: benchmarkData.industryAverage,
        percentile: Math.round(percentile),
        status,
      })
    })

    return comparisons
  }

  private getValueByPath(obj: any, path: string): number {
    return path.split('.').reduce((acc, part) => acc?.[part], obj) || 0
  }

  // ==================== ALERTS ====================

  async createAlertRule(
    rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt' | 'lastTriggered' | 'triggerCount'>
  ): Promise<AlertRule> {
    const now = new Date()
    const ruleData = {
      ...rule,
      triggerCount: 0,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    }

    const docRef = await addDoc(collection(db, 'alertRules'), ruleData)

    return {
      id: docRef.id,
      ...rule,
      triggerCount: 0,
      createdAt: now,
      updatedAt: now,
    }
  }

  async getAlertRules(promoterId: string): Promise<AlertRule[]> {
    const q = query(
      collection(db, 'alertRules'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      lastTriggered: doc.data().lastTriggered?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as AlertRule[]
  }

  async checkAlerts(promoterId: string, kpis: PromoterKPIs): Promise<DashboardAlert[]> {
    const rules = await this.getAlertRules(promoterId)
    const enabledRules = rules.filter((r) => r.enabled)
    const triggeredAlerts: DashboardAlert[] = []

    for (const rule of enabledRules) {
      const value = this.getValueByPath(kpis, rule.metric)
      let shouldTrigger = false

      switch (rule.condition.operator) {
        case 'greater_than':
          shouldTrigger = value > rule.condition.threshold
          break
        case 'less_than':
          shouldTrigger = value < rule.condition.threshold
          break
        case 'equals':
          shouldTrigger = value === rule.condition.threshold
          break
        case 'change_by':
          // Would need historical data to calculate change
          break
      }

      if (shouldTrigger) {
        const alert = await this.createAlert({
          promoterId,
          ruleId: rule.id!,
          ruleName: rule.name,
          metric: rule.metric,
          value,
          threshold: rule.condition.threshold,
          message: `${rule.name}: ${rule.metric} is ${value} (threshold: ${rule.condition.threshold})`,
          severity: rule.severity,
        })

        triggeredAlerts.push(alert)

        // Update rule trigger count
        await updateDoc(doc(db, 'alertRules', rule.id!), {
          lastTriggered: Timestamp.fromDate(new Date()),
          triggerCount: rule.triggerCount + 1,
        })
      }
    }

    return triggeredAlerts
  }

  private async createAlert(
    alert: Omit<DashboardAlert, 'id' | 'createdAt' | 'status'>
  ): Promise<DashboardAlert> {
    const now = new Date()
    const alertData = {
      ...alert,
      status: 'active' as const,
      createdAt: Timestamp.fromDate(now),
    }

    const docRef = await addDoc(collection(db, 'dashboardAlerts'), alertData)

    return {
      id: docRef.id,
      ...alert,
      status: 'active',
      createdAt: now,
    }
  }

  async getAlerts(
    promoterId: string,
    status?: DashboardAlert['status'][]
  ): Promise<DashboardAlert[]> {
    let q = query(
      collection(db, 'dashboardAlerts'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    let alerts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      acknowledgedAt: doc.data().acknowledgedAt?.toDate(),
      resolvedAt: doc.data().resolvedAt?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as DashboardAlert[]

    if (status?.length) {
      alerts = alerts.filter((a) => status.includes(a.status))
    }

    return alerts
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    await updateDoc(doc(db, 'dashboardAlerts', alertId), {
      status: 'acknowledged',
      acknowledgedBy: userId,
      acknowledgedAt: Timestamp.fromDate(new Date()),
    })
  }

  async resolveAlert(alertId: string): Promise<void> {
    await updateDoc(doc(db, 'dashboardAlerts', alertId), {
      status: 'resolved',
      resolvedAt: Timestamp.fromDate(new Date()),
    })
  }

  // ==================== QUICK STATS ====================

  async getQuickStats(promoterId: string): Promise<{
    todayRevenue: number
    todayOrders: number
    activeEvents: number
    upcomingEvents: number
    pendingRefunds: number
    unreadAlerts: number
  }> {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [todayOrders, events, alerts] = await Promise.all([
      this.getOrdersForPeriod(promoterId, startOfToday, now),
      this.getEventsForPromoter(promoterId),
      this.getAlerts(promoterId, ['active']),
    ])

    const completedOrders = todayOrders.filter((o) => o.status === 'completed')
    const pendingRefunds = todayOrders.filter((o) => o.status === 'refund_pending').length

    return {
      todayRevenue: completedOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      todayOrders: completedOrders.length,
      activeEvents: events.filter((e) => e.status === 'published' && e.startDate > now).length,
      upcomingEvents: events.filter((e) => e.startDate > now).length,
      pendingRefunds,
      unreadAlerts: alerts.length,
    }
  }
}

export const PromoterDashboardService = new PromoterDashboardServiceClass()
