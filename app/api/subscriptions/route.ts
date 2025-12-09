import { NextRequest, NextResponse } from 'next/server'
import { SubscriptionService } from '@/lib/services/subscriptionService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const promoterId = searchParams.get('promoterId')
    const type = searchParams.get('type')

    let data: any

    switch (type) {
      case 'plans':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        data = await SubscriptionService.getPlans(promoterId, { status: 'active' })
        break

      case 'plan':
        const planId = searchParams.get('planId')
        if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 })
        data = await SubscriptionService.getPlan(planId)
        break

      case 'subscription':
        const subId = searchParams.get('subscriptionId')
        if (!subId) return NextResponse.json({ error: 'subscriptionId required' }, { status: 400 })
        data = await SubscriptionService.getSubscription(subId)
        break

      case 'customerSubscriptions':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const customerId = searchParams.get('customerId')
        if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 })
        data = await SubscriptionService.getCustomerSubscriptions(promoterId, customerId)
        break

      case 'invoices':
        const invoiceSubId = searchParams.get('subscriptionId')
        const invoiceCustomerId = searchParams.get('customerId')
        data = await SubscriptionService.getInvoices(invoiceSubId || undefined, invoiceCustomerId || undefined)
        break

      case 'usageHistory':
        const usageSubId = searchParams.get('subscriptionId')
        if (!usageSubId) return NextResponse.json({ error: 'subscriptionId required' }, { status: 400 })
        data = await SubscriptionService.getUsageHistory(usageSubId)
        break

      case 'metrics':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        if (!startDate || !endDate) {
          return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 })
        }
        data = await SubscriptionService.getSubscriptionMetrics(promoterId, {
          start: new Date(startDate),
          end: new Date(endDate),
        })
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
      case 'createPlan':
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
        result = await SubscriptionService.createPlan(data.plan, userId)
        break

      case 'updatePlan':
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
        await SubscriptionService.updatePlan(data.planId, data.updates, userId)
        result = { success: true }
        break

      case 'createSubscription':
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
        result = await SubscriptionService.createSubscription(data.subscription, userId)
        break

      case 'pauseSubscription':
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
        await SubscriptionService.pauseSubscription(
          data.subscriptionId, new Date(data.resumeAt), data.reason, userId
        )
        result = { success: true }
        break

      case 'resumeSubscription':
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
        await SubscriptionService.resumeSubscription(data.subscriptionId, userId)
        result = { success: true }
        break

      case 'cancelSubscription':
        await SubscriptionService.cancelSubscription(
          data.subscriptionId, data.reason, data.immediate, data.feedback, userId
        )
        result = { success: true }
        break

      case 'reactivateSubscription':
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
        await SubscriptionService.reactivateSubscription(data.subscriptionId, userId)
        result = { success: true }
        break

      case 'useTickets':
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
        result = await SubscriptionService.useTickets(
          data.subscriptionId, data.eventId, data.ticketCount, userId
        )
        break

      case 'processPayment':
        await SubscriptionService.processInvoicePayment(data.invoiceId, data.paymentIntentId)
        result = { success: true }
        break

      case 'handlePaymentFailure':
        await SubscriptionService.handlePaymentFailure(data.invoiceId, data.reason)
        result = { success: true }
        break

      case 'processRenewals':
        result = await SubscriptionService.processRenewals()
        break

      case 'createFamilyPlan':
        result = await SubscriptionService.createFamilyPlan(data.familyPlan)
        break

      case 'addFamilyMember':
        await SubscriptionService.addFamilyMember(data.familyPlanId, data.member)
        result = { success: true }
        break

      case 'removeFamilyMember':
        await SubscriptionService.removeFamilyMember(data.familyPlanId, data.customerId)
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
