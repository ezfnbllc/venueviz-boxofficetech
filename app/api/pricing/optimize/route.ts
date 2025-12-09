import { NextRequest, NextResponse } from 'next/server'
import { DynamicPricingService } from '@/lib/services/dynamicPricingService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const eventId = searchParams.get('eventId')
    const promoterId = searchParams.get('promoterId')
    const category = searchParams.get('category')
    const minConfidence = parseInt(searchParams.get('minConfidence') || '0')

    if (eventId) {
      // Get pricing analysis for a specific event
      const analysis = await DynamicPricingService.analyzeEventPricing(eventId)

      if (!analysis) {
        return NextResponse.json({
          success: false,
          error: 'Event not found'
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: analysis
      })
    }

    // Get recommendations for all events
    const recommendations = await DynamicPricingService.getPricingRecommendations({
      promoterId: promoterId || undefined,
      category: category || undefined,
      minConfidence: minConfidence || undefined
    })

    return NextResponse.json({
      success: true,
      data: recommendations
    })
  } catch (error: any) {
    console.error('[API] Pricing optimization error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get pricing recommendations'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId, tierName, newPrice, reason } = body

    if (!eventId || !tierName || newPrice === undefined) {
      return NextResponse.json({
        success: false,
        error: 'eventId, tierName, and newPrice are required'
      }, { status: 400 })
    }

    const result = await DynamicPricingService.applyPricingAdjustment(
      eventId,
      tierName,
      newPrice,
      reason || 'Manual adjustment'
    )

    return NextResponse.json({
      success: result,
      message: result ? 'Price updated successfully' : 'Failed to update price'
    })
  } catch (error: any) {
    console.error('[API] Price update error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update price'
    }, { status: 500 })
  }
}
