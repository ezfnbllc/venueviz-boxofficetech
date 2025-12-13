import { NextRequest, NextResponse } from 'next/server'
import { BIDashboardService } from '@/lib/services/biDashboardService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const promoterId = searchParams.get('promoterId')
    const type = searchParams.get('type')

    let data: any

    switch (type) {
      case 'dashboards':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const dashFilters: any = {}
        if (searchParams.get('dashboardType')) dashFilters.type = searchParams.get('dashboardType')
        data = await BIDashboardService.getDashboards(promoterId, dashFilters)
        break

      case 'dashboard':
        const dashboardId = searchParams.get('dashboardId')
        if (!dashboardId) return NextResponse.json({ error: 'dashboardId required' }, { status: 400 })
        data = await BIDashboardService.getDashboard(dashboardId)
        break

      case 'sharedDashboard':
        const shareToken = searchParams.get('shareToken')
        if (!shareToken) return NextResponse.json({ error: 'shareToken required' }, { status: 400 })
        data = await BIDashboardService.getDashboardByShareToken(shareToken)
        break

      case 'reports':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const reportFilters: any = {}
        if (searchParams.get('category')) reportFilters.category = searchParams.get('category')
        if (searchParams.get('reportType')) reportFilters.type = searchParams.get('reportType')
        data = await BIDashboardService.getReports(promoterId, reportFilters)
        break

      case 'report':
        const reportId = searchParams.get('reportId')
        if (!reportId) return NextResponse.json({ error: 'reportId required' }, { status: 400 })
        data = await BIDashboardService.getReport(reportId)
        break

      case 'reportTemplates':
        data = BIDashboardService.getReportTemplates()
        break

      case 'queries':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        data = await BIDashboardService.getQueries(promoterId)
        break

      case 'query':
        const queryId = searchParams.get('queryId')
        if (!queryId) return NextResponse.json({ error: 'queryId required' }, { status: 400 })
        data = await BIDashboardService.getQuery(queryId)
        break

      case 'cohortAnalysis':
        const cohortId = searchParams.get('analysisId')
        if (!cohortId) return NextResponse.json({ error: 'analysisId required' }, { status: 400 })
        data = await BIDashboardService.getCohortAnalysis(cohortId)
        break

      case 'funnelAnalysis':
        const funnelId = searchParams.get('analysisId')
        if (!funnelId) return NextResponse.json({ error: 'analysisId required' }, { status: 400 })
        data = await BIDashboardService.getFunnelAnalysis(funnelId)
        break

      case 'metrics':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        data = await BIDashboardService.getMetrics(promoterId)
        break

      case 'alerts':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        data = await BIDashboardService.getAlerts(promoterId)
        break

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('BI dashboard error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    let result: any

    switch (action) {
      // Dashboard management
      case 'createDashboard':
        result = await BIDashboardService.createDashboard(data.dashboard)
        break

      case 'updateDashboard':
        await BIDashboardService.updateDashboard(data.dashboardId, data.updates)
        result = { success: true }
        break

      case 'deleteDashboard':
        await BIDashboardService.deleteDashboard(data.dashboardId)
        result = { success: true }
        break

      case 'duplicateDashboard':
        result = await BIDashboardService.duplicateDashboard(
          data.dashboardId, data.newName, data.userId
        )
        break

      case 'addWidget':
        result = await BIDashboardService.addWidget(data.dashboardId, data.widget)
        break

      case 'updateWidget':
        await BIDashboardService.updateWidget(data.dashboardId, data.widgetId, data.updates)
        result = { success: true }
        break

      case 'removeWidget':
        await BIDashboardService.removeWidget(data.dashboardId, data.widgetId)
        result = { success: true }
        break

      // Report management
      case 'createReport':
        result = await BIDashboardService.createReport({
          ...data.report,
          query: {
            ...data.report.query,
            customDateRange: data.report.query.customDateRange ? {
              start: new Date(data.report.query.customDateRange.start),
              end: new Date(data.report.query.customDateRange.end),
            } : undefined,
          },
        })
        break

      case 'updateReport':
        await BIDashboardService.updateReport(data.reportId, data.updates)
        result = { success: true }
        break

      case 'deleteReport':
        await BIDashboardService.deleteReport(data.reportId)
        result = { success: true }
        break

      case 'runReport':
        result = await BIDashboardService.runReport(data.reportId, data.parameters)
        break

      // Query management
      case 'createQuery':
        result = await BIDashboardService.createQuery(data.query)
        break

      case 'executeQuery':
        result = await BIDashboardService.executeQuery(data.queryId, data.parameters)
        break

      // Cohort analysis
      case 'createCohortAnalysis':
        result = await BIDashboardService.createCohortAnalysis({
          ...data.analysis,
          dateRange: {
            start: new Date(data.analysis.dateRange.start),
            end: new Date(data.analysis.dateRange.end),
          },
        })
        break

      case 'calculateCohortAnalysis':
        result = await BIDashboardService.calculateCohortAnalysis(data.analysisId)
        break

      // Funnel analysis
      case 'createFunnelAnalysis':
        result = await BIDashboardService.createFunnelAnalysis({
          ...data.analysis,
          dateRange: {
            start: new Date(data.analysis.dateRange.start),
            end: new Date(data.analysis.dateRange.end),
          },
        })
        break

      case 'calculateFunnelAnalysis':
        result = await BIDashboardService.calculateFunnelAnalysis(data.analysisId)
        break

      // Metrics
      case 'createMetric':
        result = await BIDashboardService.createMetric(data.metric)
        break

      case 'calculateMetric':
        result = { value: await BIDashboardService.calculateMetric(data.metricId) }
        break

      // Alerts
      case 'createAlert':
        result = await BIDashboardService.createAlert(data.alert)
        break

      case 'checkAlerts':
        result = await BIDashboardService.checkAlerts(data.promoterId)
        break

      case 'clearCache':
        BIDashboardService.clearCache()
        result = { success: true }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('BI dashboard error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
