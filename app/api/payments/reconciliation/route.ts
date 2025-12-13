import { NextRequest, NextResponse } from 'next/server'
import { PaymentReconciliationService } from '@/lib/services/paymentReconciliationService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const promoterId = searchParams.get('promoterId')
    const type = searchParams.get('type') // 'transactions' | 'payouts' | 'disputes' | 'dashboard' | 'statements'

    if (!promoterId) {
      return NextResponse.json({ error: 'promoterId is required' }, { status: 400 })
    }

    let data: any

    switch (type) {
      case 'transactions':
        const txFilters: any = {}
        if (searchParams.get('eventId')) txFilters.eventId = searchParams.get('eventId')
        if (searchParams.get('status')) txFilters.status = [searchParams.get('status')]
        if (searchParams.get('startDate') && searchParams.get('endDate')) {
          txFilters.dateRange = {
            start: new Date(searchParams.get('startDate')!),
            end: new Date(searchParams.get('endDate')!),
          }
        }
        data = await PaymentReconciliationService.getTransactions(promoterId, txFilters)
        break

      case 'payouts':
        const payoutFilters: any = {}
        if (searchParams.get('status')) payoutFilters.status = [searchParams.get('status')]
        data = await PaymentReconciliationService.getPayouts(promoterId, payoutFilters)
        break

      case 'disputes':
        const disputeFilters: any = {}
        if (searchParams.get('status')) disputeFilters.status = [searchParams.get('status')]
        data = await PaymentReconciliationService.getDisputes(promoterId, disputeFilters)
        break

      case 'statements':
        data = await PaymentReconciliationService.getFinancialStatements(promoterId)
        break

      case 'pendingPayout':
        data = await PaymentReconciliationService.calculatePendingPayout(promoterId)
        break

      case 'dashboard':
      default:
        data = await PaymentReconciliationService.getFinancialDashboard(promoterId)
        break
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Payment reconciliation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, promoterId, userId, ...data } = body

    if (!promoterId || !userId) {
      return NextResponse.json({ error: 'promoterId and userId are required' }, { status: 400 })
    }

    let result: any

    switch (action) {
      case 'recordTransaction':
        result = await PaymentReconciliationService.recordTransaction({
          promoterId,
          ...data.transaction,
        })
        break

      case 'runReconciliation':
        result = await PaymentReconciliationService.runReconciliation(
          promoterId,
          {
            start: new Date(data.startDate),
            end: new Date(data.endDate),
          },
          userId
        )
        break

      case 'resolveDiscrepancy':
        await PaymentReconciliationService.resolveDiscrepancy(
          data.reportId,
          data.transactionId,
          data.resolution,
          userId
        )
        result = { success: true }
        break

      case 'createPayout':
        result = await PaymentReconciliationService.createPayout({
          promoterId,
          ...data.payout,
        }, userId)
        break

      case 'processPayout':
        await PaymentReconciliationService.processPayout(data.payoutId, userId)
        result = { success: true }
        break

      case 'generateStatement':
        result = await PaymentReconciliationService.generateFinancialStatement(
          promoterId,
          {
            type: data.periodType,
            start: new Date(data.startDate),
            end: new Date(data.endDate),
          },
          userId
        )
        break

      case 'generateTaxRecord':
        result = await PaymentReconciliationService.generateTaxRecord(
          promoterId,
          data.year,
          userId
        )
        break

      case 'createDispute':
        result = await PaymentReconciliationService.createDispute({
          promoterId,
          ...data.dispute,
        }, userId)
        break

      case 'addDisputeEvidence':
        await PaymentReconciliationService.addDisputeEvidence(
          data.disputeId,
          data.evidence,
          userId
        )
        result = { success: true }
        break

      case 'resolveDispute':
        await PaymentReconciliationService.resolveDispute(
          data.disputeId,
          data.outcome,
          userId
        )
        result = { success: true }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Payment reconciliation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
