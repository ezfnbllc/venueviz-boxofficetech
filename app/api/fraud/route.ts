import { NextRequest, NextResponse } from 'next/server'
import { FraudDetectionService } from '@/lib/services/fraudDetectionService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const promoterId = searchParams.get('promoterId')
    const type = searchParams.get('type')

    let data: any

    switch (type) {
      case 'rules':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        data = await FraudDetectionService.getRules(promoterId)
        break

      case 'blocklist':
        data = await FraudDetectionService.getBlocklist(promoterId || undefined)
        break

      case 'alerts':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const alertFilters: any = {}
        if (searchParams.get('status')) alertFilters.status = [searchParams.get('status')]
        if (searchParams.get('severity')) alertFilters.severity = [searchParams.get('severity')]
        data = await FraudDetectionService.getAlerts(promoterId, alertFilters)
        break

      case 'ordersForReview':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        data = await FraudDetectionService.getOrdersForReview(promoterId)
        break

      case 'metrics':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        if (!startDate || !endDate) {
          return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 })
        }
        data = await FraudDetectionService.getFraudMetrics(promoterId, {
          start: new Date(startDate),
          end: new Date(endDate),
        })
        break

      case 'chargebackPrediction':
        const orderId = searchParams.get('orderId')
        if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })
        data = await FraudDetectionService.predictChargeback(orderId)
        break

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userId, ...data } = body

    let result: any

    switch (action) {
      case 'assessRisk':
        result = await FraudDetectionService.assessRisk(data.orderData)
        break

      case 'createRule':
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
        result = await FraudDetectionService.createRule(data.rule, userId)
        break

      case 'updateRule':
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
        await FraudDetectionService.updateRule(data.ruleId, data.updates, userId)
        result = { success: true }
        break

      case 'deleteRule':
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
        await FraudDetectionService.deleteRule(data.ruleId, userId)
        result = { success: true }
        break

      case 'addToBlocklist':
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
        result = await FraudDetectionService.addToBlocklist(data.entry, userId)
        break

      case 'removeFromBlocklist':
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
        await FraudDetectionService.removeFromBlocklist(data.entryId, userId)
        result = { success: true }
        break

      case 'resolveAlert':
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
        await FraudDetectionService.resolveAlert(data.alertId, data.resolution, userId)
        result = { success: true }
        break

      case 'reviewOrder':
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
        await FraudDetectionService.reviewOrder(data.assessmentId, data.decision, data.notes, userId)
        result = { success: true }
        break

      case 'clearCache':
        FraudDetectionService.clearCache()
        result = { success: true }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
