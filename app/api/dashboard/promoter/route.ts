import { NextRequest, NextResponse } from 'next/server'
import { PromoterDashboardService } from '@/lib/services/promoterDashboardService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const promoterId = searchParams.get('promoterId')
    const type = searchParams.get('type')

    if (!promoterId) {
      return NextResponse.json({ error: 'promoterId is required' }, { status: 400 })
    }

    let data: any

    switch (type) {
      case 'kpis':
        const periodType = (searchParams.get('period') || 'monthly') as any
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const customRange = startDate && endDate
          ? { start: new Date(startDate), end: new Date(endDate) }
          : undefined
        data = await PromoterDashboardService.calculateKPIs(promoterId, periodType, customRange)
        break

      case 'quickStats':
        data = await PromoterDashboardService.getQuickStats(promoterId)
        break

      case 'widgets':
        data = await PromoterDashboardService.getWidgets(promoterId)
        break

      case 'layouts':
        data = await PromoterDashboardService.getLayouts(promoterId)
        break

      case 'defaultLayout':
        data = await PromoterDashboardService.getDefaultLayout(promoterId)
        break

      case 'goals':
        data = await PromoterDashboardService.getGoals(promoterId)
        break

      case 'benchmarks':
        const category = searchParams.get('category')
        data = await PromoterDashboardService.getBenchmarks(category || undefined)
        break

      case 'industryComparison':
        const kpis = await PromoterDashboardService.calculateKPIs(promoterId, 'monthly')
        data = await PromoterDashboardService.compareToIndustry(kpis)
        break

      case 'alertRules':
        data = await PromoterDashboardService.getAlertRules(promoterId)
        break

      case 'alerts':
        const status = searchParams.get('status')
        const alertFilters = status ? [status] as any[] : undefined
        data = await PromoterDashboardService.getAlerts(promoterId, alertFilters)
        break

      default:
        // Return comprehensive dashboard data
        const [quickStats, kpisData, goals, alerts] = await Promise.all([
          PromoterDashboardService.getQuickStats(promoterId),
          PromoterDashboardService.calculateKPIs(promoterId, 'monthly'),
          PromoterDashboardService.getGoals(promoterId),
          PromoterDashboardService.getAlerts(promoterId, ['active']),
        ])
        data = { quickStats, kpis: kpisData, goals, alerts }
        break
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Promoter dashboard error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, promoterId, userId, ...data } = body

    if (!promoterId) {
      return NextResponse.json({ error: 'promoterId is required' }, { status: 400 })
    }

    let result: any

    switch (action) {
      case 'createWidget':
        if (!userId) {
          return NextResponse.json({ error: 'userId is required' }, { status: 400 })
        }
        result = await PromoterDashboardService.createWidget({
          promoterId,
          ...data.widget,
        }, userId)
        break

      case 'updateWidget':
        await PromoterDashboardService.updateWidget(data.widgetId, data.updates)
        result = { success: true }
        break

      case 'createLayout':
        result = await PromoterDashboardService.createLayout({
          promoterId,
          ...data.layout,
        })
        break

      case 'createGoal':
        result = await PromoterDashboardService.createGoal({
          promoterId,
          ...data.goal,
        })
        break

      case 'updateGoalProgress':
        await PromoterDashboardService.updateGoalProgress(data.goalId, data.currentValue)
        result = { success: true }
        break

      case 'createAlertRule':
        result = await PromoterDashboardService.createAlertRule({
          promoterId,
          ...data.rule,
        })
        break

      case 'checkAlerts':
        const kpis = await PromoterDashboardService.calculateKPIs(promoterId, 'daily')
        result = await PromoterDashboardService.checkAlerts(promoterId, kpis)
        break

      case 'acknowledgeAlert':
        if (!userId) {
          return NextResponse.json({ error: 'userId is required' }, { status: 400 })
        }
        await PromoterDashboardService.acknowledgeAlert(data.alertId, userId)
        result = { success: true }
        break

      case 'resolveAlert':
        await PromoterDashboardService.resolveAlert(data.alertId)
        result = { success: true }
        break

      case 'compareToIndustry':
        const periodKpis = await PromoterDashboardService.calculateKPIs(
          promoterId,
          data.period || 'monthly'
        )
        result = await PromoterDashboardService.compareToIndustry(periodKpis)
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Promoter dashboard error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
