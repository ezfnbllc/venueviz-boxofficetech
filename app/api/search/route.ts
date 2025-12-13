import { NextRequest, NextResponse } from 'next/server'
import { SearchService } from '@/lib/services/searchService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const fuzzy = searchParams.get('fuzzy') === 'true'

    // Quick search for autocomplete
    if (searchParams.get('quick') === 'true' && q) {
      const results = await SearchService.quickSearch(q, limit)
      return NextResponse.json({
        success: true,
        results
      })
    }

    // Get suggestions
    if (searchParams.get('suggestions') === 'true' && q) {
      const suggestions = await SearchService.getSuggestions(q)
      return NextResponse.json({
        success: true,
        suggestions
      })
    }

    // Full search
    if (!q) {
      return NextResponse.json({
        success: false,
        error: 'Search query (q) is required'
      }, { status: 400 })
    }

    // Parse filters
    const filters: any = {}
    if (searchParams.get('category')) {
      filters.category = searchParams.get('category')!.split(',')
    }
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')!.split(',')
    }
    if (searchParams.get('venueId')) {
      filters.venueId = searchParams.get('venueId')!.split(',')
    }
    if (searchParams.get('promoterId')) {
      filters.promoterId = searchParams.get('promoterId')!.split(',')
    }

    const response = await SearchService.search({
      q,
      type: type ? (type.split(',') as any) : undefined,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      limit,
      offset,
      fuzzy
    })

    return NextResponse.json({
      success: true,
      ...response
    })
  } catch (error: any) {
    console.error('[API] Search error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Search failed'
    }, { status: 500 })
  }
}
