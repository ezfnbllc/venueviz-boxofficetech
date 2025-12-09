import { NextRequest, NextResponse } from 'next/server'
import { RecommendationService } from '@/lib/services/recommendationService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'personalized'
    const customerId = searchParams.get('customerId')
    const eventId = searchParams.get('eventId')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '10')

    let data: any = null

    switch (type) {
      case 'personalized':
        if (!customerId) {
          return NextResponse.json({
            success: false,
            error: 'customerId is required for personalized recommendations'
          }, { status: 400 })
        }
        data = await RecommendationService.getPersonalizedRecommendations(customerId, { limit })
        break

      case 'similar':
        if (!eventId) {
          return NextResponse.json({
            success: false,
            error: 'eventId is required for similar events'
          }, { status: 400 })
        }
        data = await RecommendationService.getSimilarEvents({ eventId, limit })
        break

      case 'trending':
        data = await RecommendationService.getTrendingEvents({ limit, category: category || undefined })
        break

      case 'also-bought':
        if (!eventId) {
          return NextResponse.json({
            success: false,
            error: 'eventId is required for also-bought recommendations'
          }, { status: 400 })
        }
        data = await RecommendationService.getAlsoBought(eventId, { limit })
        break

      case 'category':
        if (!category) {
          return NextResponse.json({
            success: false,
            error: 'category is required for category recommendations'
          }, { status: 400 })
        }
        data = await RecommendationService.getCategoryRecommendations(category, { limit })
        break

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid recommendation type'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      type,
      data
    })
  } catch (error: any) {
    console.error('[API] Recommendations error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch recommendations'
    }, { status: 500 })
  }
}
