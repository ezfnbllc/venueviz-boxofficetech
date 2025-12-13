import { NextRequest, NextResponse } from 'next/server'
import { AnalyticsService } from '@/lib/services/analyticsService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const promoterId = searchParams.get('promoterId') || undefined
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const options: {
      startDate?: Date
      endDate?: Date
      promoterId?: string
    } = {}

    if (promoterId) options.promoterId = promoterId
    if (startDate) options.startDate = new Date(startDate)
    if (endDate) options.endDate = new Date(endDate)

    const analytics = await AnalyticsService.getAnalytics(options)

    return NextResponse.json({
      success: true,
      data: analytics
    })
  } catch (error: any) {
    console.error('[API] Advanced analytics error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch analytics'
    }, { status: 500 })
  }
}
