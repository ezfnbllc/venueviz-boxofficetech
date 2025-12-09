import { NextRequest, NextResponse } from 'next/server'
import { WebhookService } from '@/lib/services/webhookService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const promoterId = searchParams.get('promoterId') || undefined
    const webhookId = searchParams.get('webhookId')

    // Get deliveries for a specific webhook
    if (webhookId && searchParams.get('deliveries') === 'true') {
      const limit = parseInt(searchParams.get('limit') || '50')
      const status = searchParams.get('status') || undefined
      const deliveries = await WebhookService.getDeliveries(webhookId, { limit, status })

      return NextResponse.json({
        success: true,
        deliveries
      })
    }

    // Get all webhooks
    const webhooks = await WebhookService.getWebhooks(promoterId)

    return NextResponse.json({
      success: true,
      webhooks
    })
  } catch (error: any) {
    console.error('[API] Webhooks error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch webhooks'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    // Test webhook
    if (action === 'test' && data.webhookId) {
      const result = await WebhookService.testWebhook(data.webhookId)
      return NextResponse.json({
        success: result.success,
        ...result
      })
    }

    // Retry delivery
    if (action === 'retry' && data.deliveryId) {
      const result = await WebhookService.retryDelivery(data.deliveryId)
      return NextResponse.json({
        success: result,
        message: result ? 'Delivery retried successfully' : 'Retry failed'
      })
    }

    // Toggle webhook
    if (action === 'toggle' && data.webhookId !== undefined) {
      const result = await WebhookService.toggleWebhook(data.webhookId, data.enabled)
      return NextResponse.json({
        success: result,
        message: result ? 'Webhook toggled successfully' : 'Toggle failed'
      })
    }

    // Create webhook
    if (!data.name || !data.url || !data.events) {
      return NextResponse.json({
        success: false,
        error: 'name, url, and events are required'
      }, { status: 400 })
    }

    const webhookId = await WebhookService.createWebhook({
      name: data.name,
      url: data.url,
      events: data.events,
      enabled: data.enabled ?? true,
      headers: data.headers,
      retryConfig: data.retryConfig,
      filters: data.filters
    })

    return NextResponse.json({
      success: !!webhookId,
      webhookId,
      message: webhookId ? 'Webhook created successfully' : 'Failed to create webhook'
    })
  } catch (error: any) {
    console.error('[API] Webhook creation error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process webhook request'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { webhookId, ...updates } = body

    if (!webhookId) {
      return NextResponse.json({
        success: false,
        error: 'webhookId is required'
      }, { status: 400 })
    }

    const result = await WebhookService.updateWebhook(webhookId, updates)

    return NextResponse.json({
      success: result,
      message: result ? 'Webhook updated successfully' : 'Update failed'
    })
  } catch (error: any) {
    console.error('[API] Webhook update error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update webhook'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const webhookId = searchParams.get('webhookId')

    if (!webhookId) {
      return NextResponse.json({
        success: false,
        error: 'webhookId is required'
      }, { status: 400 })
    }

    const result = await WebhookService.deleteWebhook(webhookId)

    return NextResponse.json({
      success: result,
      message: result ? 'Webhook deleted successfully' : 'Delete failed'
    })
  } catch (error: any) {
    console.error('[API] Webhook delete error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete webhook'
    }, { status: 500 })
  }
}
