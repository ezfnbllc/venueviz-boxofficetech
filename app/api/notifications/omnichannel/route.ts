import { NextRequest, NextResponse } from 'next/server'
import { OmnichannelService } from '@/lib/services/omnichannelService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const promoterId = searchParams.get('promoterId')
    const type = searchParams.get('type')

    let data: any

    switch (type) {
      case 'templates':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const channel = searchParams.get('channel') as any
        const triggerType = searchParams.get('triggerType') as any
        data = await OmnichannelService.getTemplates(promoterId, { channel, triggerType, status: 'active' })
        break

      case 'preferences':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const customerId = searchParams.get('customerId')
        if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 })
        data = await OmnichannelService.getCustomerPreferences(promoterId, customerId)
        break

      case 'inAppNotifications':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const inAppCustomerId = searchParams.get('customerId')
        if (!inAppCustomerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 })
        const unreadOnly = searchParams.get('unreadOnly') === 'true'
        data = await OmnichannelService.getInAppNotifications(promoterId, inAppCustomerId, unreadOnly)
        break

      case 'unreadCount':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const countCustomerId = searchParams.get('customerId')
        if (!countCustomerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 })
        data = { count: await OmnichannelService.getUnreadCount(promoterId, countCustomerId) }
        break

      case 'deliveryReport':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const reportChannel = searchParams.get('channel') as any
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        if (!reportChannel || !startDate || !endDate) {
          return NextResponse.json({ error: 'channel, startDate and endDate required' }, { status: 400 })
        }
        data = await OmnichannelService.generateDeliveryReport(promoterId, reportChannel, {
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
    const { action, ...data } = body

    let result: any

    switch (action) {
      case 'createTemplate':
        result = await OmnichannelService.createTemplate(data.template)
        break

      case 'updateTemplate':
        await OmnichannelService.updateTemplate(data.templateId, data.updates)
        result = { success: true }
        break

      case 'sendNotification':
        result = await OmnichannelService.sendNotification(data.notification)
        break

      case 'triggerNotification':
        result = await OmnichannelService.triggerNotification(data.trigger, data.data)
        break

      case 'updatePreferences':
        result = await OmnichannelService.updateCustomerPreferences(
          data.promoterId, data.customerId, data.updates
        )
        break

      case 'unsubscribe':
        await OmnichannelService.unsubscribe(data.promoterId, data.customerId, data.channel)
        result = { success: true }
        break

      case 'registerPushSubscription':
        result = await OmnichannelService.registerPushSubscription(data.subscription)
        break

      case 'unregisterPushSubscription':
        await OmnichannelService.unregisterPushSubscription(data.deviceToken)
        result = { success: true }
        break

      case 'trackOpen':
        await OmnichannelService.trackOpen(data.messageId)
        result = { success: true }
        break

      case 'trackClick':
        await OmnichannelService.trackClick(data.messageId)
        result = { success: true }
        break

      case 'trackDelivery':
        await OmnichannelService.trackDelivery(data.messageId)
        result = { success: true }
        break

      case 'markAsRead':
        await OmnichannelService.markAsRead(data.notificationIds)
        result = { success: true }
        break

      case 'processScheduledMessages':
        result = await OmnichannelService.processScheduledMessages()
        break

      case 'clearCache':
        OmnichannelService.clearCache()
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
