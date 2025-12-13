import { NextRequest, NextResponse } from 'next/server'
import { EmailCampaignService } from '@/lib/services/emailCampaignService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const promoterId = searchParams.get('promoterId')
    const type = searchParams.get('type') // 'campaigns' | 'templates' | 'subscribers' | 'workflows'
    const status = searchParams.get('status')

    if (!promoterId) {
      return NextResponse.json({ error: 'promoterId is required' }, { status: 400 })
    }

    let data: any

    switch (type) {
      case 'templates':
        data = await EmailCampaignService.getTemplates(promoterId)
        break
      case 'subscribers':
        const subscriberFilters = status ? { status: status as any } : undefined
        const result = await EmailCampaignService.getSubscribers(promoterId, subscriberFilters)
        data = result
        break
      case 'workflows':
        data = await EmailCampaignService.getWorkflows(promoterId)
        break
      case 'campaigns':
      default:
        const campaignFilters = status ? { status: [status] as any[] } : undefined
        data = await EmailCampaignService.getCampaigns(promoterId, campaignFilters)
        break
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Email campaigns error:', error)
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
      case 'createTemplate':
        result = await EmailCampaignService.createTemplate({
          promoterId,
          ...data.template,
        }, userId)
        break

      case 'createCampaign':
        result = await EmailCampaignService.createCampaign({
          promoterId,
          ...data.campaign,
        }, userId)
        break

      case 'sendCampaign':
        result = await EmailCampaignService.sendCampaignNow(data.campaignId, userId)
        break

      case 'scheduleCampaign':
        await EmailCampaignService.scheduleCampaign(
          data.campaignId,
          new Date(data.scheduledAt),
          userId
        )
        result = { success: true }
        break

      case 'addSubscriber':
        result = await EmailCampaignService.addSubscriber({
          promoterId,
          ...data.subscriber,
        }, userId)
        break

      case 'importSubscribers':
        result = await EmailCampaignService.importSubscribers(
          promoterId,
          data.subscribers,
          userId
        )
        break

      case 'unsubscribe':
        await EmailCampaignService.unsubscribe(data.email, promoterId, data.reason)
        result = { success: true }
        break

      case 'createWorkflow':
        result = await EmailCampaignService.createWorkflow({
          promoterId,
          ...data.workflow,
        }, userId)
        break

      case 'trackOpen':
        await EmailCampaignService.trackOpen(data.campaignId, data.subscriberId)
        result = { success: true }
        break

      case 'trackClick':
        await EmailCampaignService.trackClick(data.campaignId, data.subscriberId, data.url)
        result = { success: true }
        break

      case 'getCampaignAnalytics':
        result = await EmailCampaignService.getCampaignAnalytics(data.campaignId)
        break

      case 'getPerformanceOverview':
        result = await EmailCampaignService.getEmailPerformanceOverview(
          promoterId,
          {
            start: new Date(data.startDate),
            end: new Date(data.endDate),
          }
        )
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Email campaigns error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
