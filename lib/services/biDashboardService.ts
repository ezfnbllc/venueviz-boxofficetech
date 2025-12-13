import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  increment,
} from 'firebase/firestore'

// Types
export interface Dashboard {
  id: string
  promoterId: string
  name: string
  description?: string
  type: 'executive' | 'operational' | 'sales' | 'marketing' | 'custom'
  layout: DashboardLayout
  widgets: DashboardWidget[]
  filters: DashboardFilter[]
  refreshInterval?: number // minutes
  isDefault: boolean
  isPublic: boolean
  shareToken?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface DashboardLayout {
  columns: number
  rows: number
  responsive: boolean
  theme: 'light' | 'dark' | 'auto'
}

export interface DashboardWidget {
  id: string
  type: WidgetType
  title: string
  position: { x: number; y: number; width: number; height: number }
  config: WidgetConfig
  dataSource: DataSource
  refresh?: number // seconds
}

export type WidgetType =
  | 'kpi_card'
  | 'line_chart'
  | 'bar_chart'
  | 'pie_chart'
  | 'donut_chart'
  | 'area_chart'
  | 'scatter_plot'
  | 'heatmap'
  | 'funnel'
  | 'gauge'
  | 'table'
  | 'pivot_table'
  | 'map'
  | 'treemap'
  | 'sankey'
  | 'cohort'
  | 'text'

export interface WidgetConfig {
  colors?: string[]
  showLegend?: boolean
  showLabels?: boolean
  showGrid?: boolean
  animation?: boolean
  stacked?: boolean
  comparison?: 'previous_period' | 'previous_year' | 'custom'
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median'
  formatting?: {
    prefix?: string
    suffix?: string
    decimals?: number
    thousandsSeparator?: string
  }
  thresholds?: Array<{ value: number; color: string; label?: string }>
  drilldown?: boolean
  customOptions?: Record<string, any>
}

export interface DataSource {
  type: 'query' | 'report' | 'api' | 'realtime'
  queryId?: string
  reportId?: string
  apiEndpoint?: string
  realtimeChannel?: string
  parameters?: Record<string, any>
}

export interface DashboardFilter {
  id: string
  field: string
  label: string
  type: 'select' | 'multiselect' | 'daterange' | 'search' | 'toggle'
  defaultValue?: any
  options?: Array<{ value: string; label: string }>
  affectsWidgets: string[] // widget IDs
}

export interface Report {
  id: string
  promoterId: string
  name: string
  description?: string
  category: ReportCategory
  type: 'standard' | 'custom' | 'template'
  query: ReportQuery
  columns: ReportColumn[]
  filters: ReportFilter[]
  sorting?: ReportSorting[]
  grouping?: string[]
  scheduling?: ReportSchedule
  outputs: ReportOutput[]
  lastRun?: Date
  runCount: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export type ReportCategory =
  | 'sales'
  | 'revenue'
  | 'customers'
  | 'events'
  | 'marketing'
  | 'operations'
  | 'finance'
  | 'inventory'
  | 'custom'

export interface ReportQuery {
  baseCollection: string
  joins?: Array<{
    collection: string
    localField: string
    foreignField: string
    type: 'inner' | 'left' | 'right'
  }>
  conditions: ReportCondition[]
  dateField?: string
  dateRange?: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'custom'
  customDateRange?: { start: Date; end: Date }
}

export interface ReportCondition {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'contains' | 'starts_with' | 'ends_with' | 'between' | 'is_null' | 'is_not_null'
  value: any
  logic?: 'and' | 'or'
}

export interface ReportColumn {
  field: string
  label: string
  type: 'string' | 'number' | 'currency' | 'date' | 'boolean' | 'percentage'
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'count_distinct'
  formula?: string
  format?: string
  width?: number
  visible: boolean
  sortable: boolean
}

export interface ReportFilter {
  field: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect'
  required: boolean
  defaultValue?: any
  options?: Array<{ value: string; label: string }>
}

export interface ReportSorting {
  field: string
  direction: 'asc' | 'desc'
}

export interface ReportSchedule {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  dayOfWeek?: number // 0-6
  dayOfMonth?: number // 1-31
  time: string // HH:MM
  timezone: string
  recipients: string[]
  format: 'pdf' | 'excel' | 'csv'
  lastSent?: Date
  nextSend?: Date
}

export interface ReportOutput {
  type: 'email' | 'download' | 'storage' | 'webhook'
  config: Record<string, any>
}

export interface SavedQuery {
  id: string
  promoterId: string
  name: string
  description?: string
  sql: string
  parameters: QueryParameter[]
  resultSchema?: Record<string, string>
  cached: boolean
  cacheDuration?: number // minutes
  lastCachedAt?: Date
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface QueryParameter {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'array'
  required: boolean
  defaultValue?: any
}

export interface CohortAnalysis {
  id: string
  promoterId: string
  name: string
  cohortType: 'acquisition' | 'behavior' | 'custom'
  cohortField: string
  cohortGranularity: 'day' | 'week' | 'month' | 'quarter'
  metric: string
  metricType: 'count' | 'sum' | 'avg' | 'retention'
  dateRange: { start: Date; end: Date }
  filters?: ReportCondition[]
  results?: CohortResult[]
  lastCalculated?: Date
  createdAt: Date
}

export interface CohortResult {
  cohort: string
  size: number
  periods: Array<{
    period: number
    value: number
    percentage?: number
  }>
}

export interface FunnelAnalysis {
  id: string
  promoterId: string
  name: string
  steps: FunnelStep[]
  conversionWindow: number // hours
  dateRange: { start: Date; end: Date }
  segmentBy?: string
  filters?: ReportCondition[]
  results?: FunnelResult[]
  lastCalculated?: Date
  createdAt: Date
}

export interface FunnelStep {
  id: string
  name: string
  event: string
  conditions?: ReportCondition[]
}

export interface FunnelResult {
  segment?: string
  steps: Array<{
    name: string
    count: number
    conversionRate: number
    dropoffRate: number
    avgTimeToNext?: number
  }>
  overallConversion: number
}

export interface Metric {
  id: string
  promoterId: string
  name: string
  description?: string
  formula: string
  unit: string
  format: string
  category: string
  target?: {
    value: number
    type: 'above' | 'below' | 'exact'
    alertThreshold?: number
  }
  dependencies: string[]
  cached: boolean
  cacheDuration?: number
  lastValue?: number
  lastCalculated?: Date
  createdAt: Date
}

export interface DataAlert {
  id: string
  promoterId: string
  name: string
  metric: string
  condition: {
    operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'change_gt' | 'change_lt'
    value: number
    compareWindow?: string // e.g., "1d", "1w"
  }
  severity: 'info' | 'warning' | 'critical'
  channels: Array<{
    type: 'email' | 'slack' | 'webhook' | 'sms'
    config: Record<string, any>
  }>
  enabled: boolean
  lastTriggered?: Date
  triggerCount: number
  createdAt: Date
}

// Caching
const cache = new Map<string, { data: any; expiry: number }>()
const CACHE_TTL = 5 * 60 * 1000

function getCached<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T
  }
  cache.delete(key)
  return null
}

function setCache(key: string, data: any, ttl: number = CACHE_TTL): void {
  cache.set(key, { data, expiry: Date.now() + ttl })
}

// Helper Functions
function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

function calculateDateRange(
  range: ReportQuery['dateRange'],
  customRange?: { start: Date; end: Date }
): { start: Date; end: Date } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (range) {
    case 'today':
      return { start: today, end: now }
    case 'yesterday':
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return { start: yesterday, end: today }
    case 'this_week':
      const startOfWeek = new Date(today)
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      return { start: startOfWeek, end: now }
    case 'this_month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
    case 'this_quarter':
      const quarter = Math.floor(now.getMonth() / 3)
      return { start: new Date(now.getFullYear(), quarter * 3, 1), end: now }
    case 'this_year':
      return { start: new Date(now.getFullYear(), 0, 1), end: now }
    case 'custom':
      return customRange || { start: today, end: now }
    default:
      return { start: today, end: now }
  }
}

// Main Service Class
export class BIDashboardService {
  // ==================== DASHBOARD MANAGEMENT ====================

  static async createDashboard(
    data: Omit<Dashboard, 'id' | 'shareToken' | 'createdAt' | 'updatedAt'>
  ): Promise<Dashboard> {
    const dashboardId = `dash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const dashboard: Dashboard = {
      ...data,
      id: dashboardId,
      shareToken: data.isPublic ? generateShareToken() : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await setDoc(doc(db, 'dashboards', dashboardId), {
      ...dashboard,
      createdAt: Timestamp.fromDate(dashboard.createdAt),
      updatedAt: Timestamp.fromDate(dashboard.updatedAt),
    })

    return dashboard
  }

  static async getDashboard(dashboardId: string): Promise<Dashboard | null> {
    const cached = getCached<Dashboard>(`dashboard:${dashboardId}`)
    if (cached) return cached

    const docRef = await getDoc(doc(db, 'dashboards', dashboardId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    const dashboard: Dashboard = {
      ...data,
      id: docRef.id,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as Dashboard

    setCache(`dashboard:${dashboardId}`, dashboard)
    return dashboard
  }

  static async getDashboardByShareToken(shareToken: string): Promise<Dashboard | null> {
    const q = query(
      collection(db, 'dashboards'),
      where('shareToken', '==', shareToken),
      where('isPublic', '==', true),
      limit(1)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const doc_data = snapshot.docs[0]
    const data = doc_data.data()
    return {
      ...data,
      id: doc_data.id,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as Dashboard
  }

  static async getDashboards(
    promoterId: string,
    filters?: { type?: Dashboard['type'] }
  ): Promise<Dashboard[]> {
    let q = query(
      collection(db, 'dashboards'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    if (filters?.type) {
      q = query(q, where('type', '==', filters.type))
    }

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as Dashboard
    })
  }

  static async updateDashboard(
    dashboardId: string,
    updates: Partial<Dashboard>
  ): Promise<void> {
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }

    delete updateData.id
    delete updateData.createdAt

    await updateDoc(doc(db, 'dashboards', dashboardId), updateData)
    cache.delete(`dashboard:${dashboardId}`)
  }

  static async deleteDashboard(dashboardId: string): Promise<void> {
    await deleteDoc(doc(db, 'dashboards', dashboardId))
    cache.delete(`dashboard:${dashboardId}`)
  }

  static async duplicateDashboard(
    dashboardId: string,
    newName: string,
    userId: string
  ): Promise<Dashboard> {
    const original = await this.getDashboard(dashboardId)
    if (!original) {
      throw new Error('Dashboard not found')
    }

    return this.createDashboard({
      ...original,
      name: newName,
      isDefault: false,
      isPublic: false,
      createdBy: userId,
    })
  }

  static async addWidget(
    dashboardId: string,
    widget: Omit<DashboardWidget, 'id'>
  ): Promise<DashboardWidget> {
    const dashboard = await this.getDashboard(dashboardId)
    if (!dashboard) {
      throw new Error('Dashboard not found')
    }

    const widgetId = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    const newWidget: DashboardWidget = { ...widget, id: widgetId }

    await updateDoc(doc(db, 'dashboards', dashboardId), {
      widgets: [...dashboard.widgets, newWidget],
      updatedAt: Timestamp.fromDate(new Date()),
    })

    cache.delete(`dashboard:${dashboardId}`)
    return newWidget
  }

  static async updateWidget(
    dashboardId: string,
    widgetId: string,
    updates: Partial<DashboardWidget>
  ): Promise<void> {
    const dashboard = await this.getDashboard(dashboardId)
    if (!dashboard) {
      throw new Error('Dashboard not found')
    }

    const widgets = dashboard.widgets.map((w) =>
      w.id === widgetId ? { ...w, ...updates } : w
    )

    await updateDoc(doc(db, 'dashboards', dashboardId), {
      widgets,
      updatedAt: Timestamp.fromDate(new Date()),
    })

    cache.delete(`dashboard:${dashboardId}`)
  }

  static async removeWidget(dashboardId: string, widgetId: string): Promise<void> {
    const dashboard = await this.getDashboard(dashboardId)
    if (!dashboard) {
      throw new Error('Dashboard not found')
    }

    const widgets = dashboard.widgets.filter((w) => w.id !== widgetId)

    await updateDoc(doc(db, 'dashboards', dashboardId), {
      widgets,
      updatedAt: Timestamp.fromDate(new Date()),
    })

    cache.delete(`dashboard:${dashboardId}`)
  }

  // ==================== REPORT MANAGEMENT ====================

  static async createReport(
    data: Omit<Report, 'id' | 'lastRun' | 'runCount' | 'createdAt' | 'updatedAt'>
  ): Promise<Report> {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const report: Report = {
      ...data,
      id: reportId,
      runCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const firestoreData: any = {
      ...report,
      createdAt: Timestamp.fromDate(report.createdAt),
      updatedAt: Timestamp.fromDate(report.updatedAt),
    }

    if (report.scheduling?.nextSend) {
      firestoreData.scheduling.nextSend = Timestamp.fromDate(report.scheduling.nextSend)
    }

    await setDoc(doc(db, 'reports', reportId), firestoreData)

    return report
  }

  static async getReport(reportId: string): Promise<Report | null> {
    const docRef = await getDoc(doc(db, 'reports', reportId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    return {
      ...data,
      id: docRef.id,
      lastRun: data.lastRun?.toDate(),
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      scheduling: data.scheduling
        ? {
            ...data.scheduling,
            lastSent: data.scheduling.lastSent?.toDate(),
            nextSend: data.scheduling.nextSend?.toDate(),
          }
        : undefined,
      query: {
        ...data.query,
        customDateRange: data.query.customDateRange
          ? {
              start: data.query.customDateRange.start.toDate(),
              end: data.query.customDateRange.end.toDate(),
            }
          : undefined,
      },
    } as Report
  }

  static async getReports(
    promoterId: string,
    filters?: { category?: ReportCategory; type?: Report['type'] }
  ): Promise<Report[]> {
    let q = query(
      collection(db, 'reports'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    if (filters?.category) {
      q = query(q, where('category', '==', filters.category))
    }
    if (filters?.type) {
      q = query(q, where('type', '==', filters.type))
    }

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        lastRun: data.lastRun?.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as Report
    })
  }

  static async updateReport(reportId: string, updates: Partial<Report>): Promise<void> {
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }

    delete updateData.id
    delete updateData.createdAt

    await updateDoc(doc(db, 'reports', reportId), updateData)
  }

  static async deleteReport(reportId: string): Promise<void> {
    await deleteDoc(doc(db, 'reports', reportId))
  }

  static async runReport(
    reportId: string,
    parameters?: Record<string, any>
  ): Promise<{
    data: any[]
    columns: ReportColumn[]
    summary?: Record<string, any>
    generatedAt: Date
  }> {
    const report = await this.getReport(reportId)
    if (!report) {
      throw new Error('Report not found')
    }

    // Calculate date range
    const dateRange = calculateDateRange(
      report.query.dateRange,
      report.query.customDateRange
    )

    // Build and execute query (simplified - in production this would be more complex)
    // For now, return mock data structure
    const mockData: any[] = []
    const summary: Record<string, any> = {}

    // Calculate aggregations
    for (const column of report.columns) {
      if (column.aggregation && column.visible) {
        summary[column.field] = {
          aggregation: column.aggregation,
          value: 0, // Would be calculated from actual data
        }
      }
    }

    // Update report run stats
    await updateDoc(doc(db, 'reports', reportId), {
      lastRun: Timestamp.fromDate(new Date()),
      runCount: increment(1),
    })

    return {
      data: mockData,
      columns: report.columns.filter((c) => c.visible),
      summary: Object.keys(summary).length > 0 ? summary : undefined,
      generatedAt: new Date(),
    }
  }

  // ==================== SAVED QUERIES ====================

  static async createQuery(
    data: Omit<SavedQuery, 'id' | 'lastCachedAt' | 'createdAt' | 'updatedAt'>
  ): Promise<SavedQuery> {
    const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const savedQuery: SavedQuery = {
      ...data,
      id: queryId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await setDoc(doc(db, 'savedQueries', queryId), {
      ...savedQuery,
      createdAt: Timestamp.fromDate(savedQuery.createdAt),
      updatedAt: Timestamp.fromDate(savedQuery.updatedAt),
    })

    return savedQuery
  }

  static async getQuery(queryId: string): Promise<SavedQuery | null> {
    const docRef = await getDoc(doc(db, 'savedQueries', queryId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    return {
      ...data,
      id: docRef.id,
      lastCachedAt: data.lastCachedAt?.toDate(),
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as SavedQuery
  }

  static async getQueries(promoterId: string): Promise<SavedQuery[]> {
    const q = query(
      collection(db, 'savedQueries'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        lastCachedAt: data.lastCachedAt?.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as SavedQuery
    })
  }

  static async executeQuery(
    queryId: string,
    parameters?: Record<string, any>
  ): Promise<{ data: any[]; cached: boolean; executionTime: number }> {
    const savedQuery = await this.getQuery(queryId)
    if (!savedQuery) {
      throw new Error('Query not found')
    }

    // Check cache
    if (savedQuery.cached && savedQuery.lastCachedAt) {
      const cacheExpiry = new Date(
        savedQuery.lastCachedAt.getTime() + (savedQuery.cacheDuration || 60) * 60 * 1000
      )
      if (cacheExpiry > new Date()) {
        const cached = getCached<any[]>(`query_result:${queryId}`)
        if (cached) {
          return { data: cached, cached: true, executionTime: 0 }
        }
      }
    }

    const startTime = Date.now()

    // Execute query (simplified)
    // In production, this would execute against a data warehouse
    const data: any[] = []

    const executionTime = Date.now() - startTime

    // Cache results if caching is enabled
    if (savedQuery.cached) {
      setCache(`query_result:${queryId}`, data, (savedQuery.cacheDuration || 60) * 60 * 1000)
      await updateDoc(doc(db, 'savedQueries', queryId), {
        lastCachedAt: Timestamp.fromDate(new Date()),
      })
    }

    return { data, cached: false, executionTime }
  }

  // ==================== COHORT ANALYSIS ====================

  static async createCohortAnalysis(
    data: Omit<CohortAnalysis, 'id' | 'results' | 'lastCalculated' | 'createdAt'>
  ): Promise<CohortAnalysis> {
    const analysisId = `cohort_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const analysis: CohortAnalysis = {
      ...data,
      id: analysisId,
      createdAt: new Date(),
    }

    await setDoc(doc(db, 'cohortAnalyses', analysisId), {
      ...analysis,
      dateRange: {
        start: Timestamp.fromDate(analysis.dateRange.start),
        end: Timestamp.fromDate(analysis.dateRange.end),
      },
      createdAt: Timestamp.fromDate(analysis.createdAt),
    })

    return analysis
  }

  static async getCohortAnalysis(analysisId: string): Promise<CohortAnalysis | null> {
    const docRef = await getDoc(doc(db, 'cohortAnalyses', analysisId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    return {
      ...data,
      id: docRef.id,
      dateRange: {
        start: data.dateRange.start.toDate(),
        end: data.dateRange.end.toDate(),
      },
      lastCalculated: data.lastCalculated?.toDate(),
      createdAt: data.createdAt.toDate(),
    } as CohortAnalysis
  }

  static async calculateCohortAnalysis(analysisId: string): Promise<CohortResult[]> {
    const analysis = await this.getCohortAnalysis(analysisId)
    if (!analysis) {
      throw new Error('Cohort analysis not found')
    }

    // Calculate cohort results (simplified)
    // In production, this would query the data warehouse
    const results: CohortResult[] = []

    // Generate cohort periods
    const cohortStart = new Date(analysis.dateRange.start)
    const cohortEnd = new Date(analysis.dateRange.end)

    let current = new Date(cohortStart)
    while (current < cohortEnd) {
      const cohortLabel = current.toISOString().split('T')[0]

      results.push({
        cohort: cohortLabel,
        size: Math.floor(Math.random() * 1000) + 100, // Mock data
        periods: Array.from({ length: 12 }, (_, i) => ({
          period: i,
          value: Math.floor(Math.random() * 100),
          percentage: Math.random() * 100,
        })),
      })

      // Advance by granularity
      switch (analysis.cohortGranularity) {
        case 'day':
          current.setDate(current.getDate() + 1)
          break
        case 'week':
          current.setDate(current.getDate() + 7)
          break
        case 'month':
          current.setMonth(current.getMonth() + 1)
          break
        case 'quarter':
          current.setMonth(current.getMonth() + 3)
          break
      }
    }

    // Save results
    await updateDoc(doc(db, 'cohortAnalyses', analysisId), {
      results,
      lastCalculated: Timestamp.fromDate(new Date()),
    })

    return results
  }

  // ==================== FUNNEL ANALYSIS ====================

  static async createFunnelAnalysis(
    data: Omit<FunnelAnalysis, 'id' | 'results' | 'lastCalculated' | 'createdAt'>
  ): Promise<FunnelAnalysis> {
    const analysisId = `funnel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const analysis: FunnelAnalysis = {
      ...data,
      id: analysisId,
      createdAt: new Date(),
    }

    await setDoc(doc(db, 'funnelAnalyses', analysisId), {
      ...analysis,
      dateRange: {
        start: Timestamp.fromDate(analysis.dateRange.start),
        end: Timestamp.fromDate(analysis.dateRange.end),
      },
      createdAt: Timestamp.fromDate(analysis.createdAt),
    })

    return analysis
  }

  static async getFunnelAnalysis(analysisId: string): Promise<FunnelAnalysis | null> {
    const docRef = await getDoc(doc(db, 'funnelAnalyses', analysisId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    return {
      ...data,
      id: docRef.id,
      dateRange: {
        start: data.dateRange.start.toDate(),
        end: data.dateRange.end.toDate(),
      },
      lastCalculated: data.lastCalculated?.toDate(),
      createdAt: data.createdAt.toDate(),
    } as FunnelAnalysis
  }

  static async calculateFunnelAnalysis(analysisId: string): Promise<FunnelResult[]> {
    const analysis = await this.getFunnelAnalysis(analysisId)
    if (!analysis) {
      throw new Error('Funnel analysis not found')
    }

    // Calculate funnel results (simplified)
    const results: FunnelResult[] = []

    let previousCount = 10000 // Starting count
    const steps = analysis.steps.map((step, index) => {
      const count = Math.floor(previousCount * (0.3 + Math.random() * 0.5))
      const conversionRate = previousCount > 0 ? (count / previousCount) * 100 : 0
      const dropoffRate = 100 - conversionRate

      previousCount = count

      return {
        name: step.name,
        count,
        conversionRate: Math.round(conversionRate * 100) / 100,
        dropoffRate: Math.round(dropoffRate * 100) / 100,
        avgTimeToNext: index < analysis.steps.length - 1 ? Math.floor(Math.random() * 3600) : undefined,
      }
    })

    const overallConversion = steps.length > 0
      ? (steps[steps.length - 1].count / 10000) * 100
      : 0

    results.push({
      steps,
      overallConversion: Math.round(overallConversion * 100) / 100,
    })

    // Save results
    await updateDoc(doc(db, 'funnelAnalyses', analysisId), {
      results,
      lastCalculated: Timestamp.fromDate(new Date()),
    })

    return results
  }

  // ==================== METRICS & ALERTS ====================

  static async createMetric(
    data: Omit<Metric, 'id' | 'lastValue' | 'lastCalculated' | 'createdAt'>
  ): Promise<Metric> {
    const metricId = `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const metric: Metric = {
      ...data,
      id: metricId,
      createdAt: new Date(),
    }

    await setDoc(doc(db, 'metrics', metricId), {
      ...metric,
      createdAt: Timestamp.fromDate(metric.createdAt),
    })

    return metric
  }

  static async getMetrics(promoterId: string): Promise<Metric[]> {
    const q = query(
      collection(db, 'metrics'),
      where('promoterId', '==', promoterId),
      orderBy('category')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        lastCalculated: data.lastCalculated?.toDate(),
        createdAt: data.createdAt.toDate(),
      } as Metric
    })
  }

  static async calculateMetric(metricId: string): Promise<number> {
    const docRef = await getDoc(doc(db, 'metrics', metricId))
    if (!docRef.exists()) {
      throw new Error('Metric not found')
    }

    // Calculate metric value (simplified)
    // In production, this would evaluate the formula against real data
    const value = Math.random() * 10000

    await updateDoc(doc(db, 'metrics', metricId), {
      lastValue: value,
      lastCalculated: Timestamp.fromDate(new Date()),
    })

    return Math.round(value * 100) / 100
  }

  static async createAlert(
    data: Omit<DataAlert, 'id' | 'lastTriggered' | 'triggerCount' | 'createdAt'>
  ): Promise<DataAlert> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const alert: DataAlert = {
      ...data,
      id: alertId,
      triggerCount: 0,
      createdAt: new Date(),
    }

    await setDoc(doc(db, 'dataAlerts', alertId), {
      ...alert,
      createdAt: Timestamp.fromDate(alert.createdAt),
    })

    return alert
  }

  static async getAlerts(promoterId: string): Promise<DataAlert[]> {
    const q = query(
      collection(db, 'dataAlerts'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        lastTriggered: data.lastTriggered?.toDate(),
        createdAt: data.createdAt.toDate(),
      } as DataAlert
    })
  }

  static async checkAlerts(promoterId: string): Promise<DataAlert[]> {
    const alerts = await this.getAlerts(promoterId)
    const triggeredAlerts: DataAlert[] = []

    for (const alert of alerts) {
      if (!alert.enabled) continue

      // Calculate metric value
      const metricValue = await this.calculateMetric(alert.metric)

      let triggered = false
      switch (alert.condition.operator) {
        case 'gt':
          triggered = metricValue > alert.condition.value
          break
        case 'lt':
          triggered = metricValue < alert.condition.value
          break
        case 'gte':
          triggered = metricValue >= alert.condition.value
          break
        case 'lte':
          triggered = metricValue <= alert.condition.value
          break
        case 'eq':
          triggered = metricValue === alert.condition.value
          break
      }

      if (triggered) {
        await updateDoc(doc(db, 'dataAlerts', alert.id), {
          lastTriggered: Timestamp.fromDate(new Date()),
          triggerCount: increment(1),
        })
        triggeredAlerts.push(alert)
      }
    }

    return triggeredAlerts
  }

  // ==================== REPORT TEMPLATES ====================

  static getReportTemplates(): Array<{
    id: string
    name: string
    category: ReportCategory
    description: string
  }> {
    return [
      { id: 'sales_summary', name: 'Sales Summary', category: 'sales', description: 'Daily/weekly/monthly sales overview' },
      { id: 'revenue_breakdown', name: 'Revenue Breakdown', category: 'revenue', description: 'Revenue by event, ticket type, and channel' },
      { id: 'customer_acquisition', name: 'Customer Acquisition', category: 'customers', description: 'New customers and acquisition channels' },
      { id: 'customer_lifetime', name: 'Customer Lifetime Value', category: 'customers', description: 'CLV analysis and segments' },
      { id: 'event_performance', name: 'Event Performance', category: 'events', description: 'Attendance, revenue, and satisfaction by event' },
      { id: 'marketing_roi', name: 'Marketing ROI', category: 'marketing', description: 'Campaign performance and attribution' },
      { id: 'inventory_status', name: 'Inventory Status', category: 'inventory', description: 'Ticket availability and sell-through rates' },
      { id: 'financial_reconciliation', name: 'Financial Reconciliation', category: 'finance', description: 'Payment reconciliation and fees' },
      { id: 'operational_metrics', name: 'Operational Metrics', category: 'operations', description: 'Check-in rates, refunds, and support tickets' },
    ]
  }

  // ==================== CACHE MANAGEMENT ====================

  static clearCache(): void {
    cache.clear()
  }
}
