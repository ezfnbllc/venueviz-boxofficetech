import { NextRequest, NextResponse } from 'next/server'
import { CustomerSegmentationService } from '@/lib/services/customerSegmentationService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')
    const email = searchParams.get('email')

    // Get customer profile
    if (action === 'profile' && email) {
      const profile = await CustomerSegmentationService.getCustomerProfile(email)

      if (!profile) {
        return NextResponse.json({
          success: false,
          error: 'Customer not found'
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        profile
      })
    }

    // Get similar customers
    if (action === 'similar' && email) {
      const limit = parseInt(searchParams.get('limit') || '5')
      const similar = await CustomerSegmentationService.getSimilarCustomers(email, limit)

      return NextResponse.json({
        success: true,
        customers: similar
      })
    }

    // Get segment insights
    if (action === 'insights') {
      const insights = await CustomerSegmentationService.getInsights()

      return NextResponse.json({
        success: true,
        insights
      })
    }

    // Default: Get all segments
    const segments = await CustomerSegmentationService.getSegments()

    return NextResponse.json({
      success: true,
      segments,
      totalCustomers: segments.reduce((sum, s) => sum + s.customerCount, 0),
      totalRevenue: segments.reduce((sum, s) => sum + s.totalRevenue, 0)
    })
  } catch (error: any) {
    console.error('[API] Customer segments error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch customer segments'
    }, { status: 500 })
  }
}
