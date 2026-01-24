/**
 * UCP (Universal Commerce Protocol) - Inventory API
 *
 * This endpoint enables Google AI (Gemini) to query event ticket inventory.
 * Part of the Universal Commerce Protocol for AI-native commerce.
 *
 * GET /api/ucp/inventory
 * Query params:
 *   - promoterSlug: Filter by promoter
 *   - eventId: Get specific event
 *   - upcoming: Only return upcoming events (default: true)
 *   - limit: Max results (default: 50)
 *
 * Response follows Google's UCP inventory schema
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'

interface UCPProduct {
  id: string
  title: string
  description?: string
  link: string
  imageLink?: string
  availability: 'in_stock' | 'out_of_stock' | 'preorder' | 'limited_availability'
  price: {
    value: number
    currency: string
  }
  priceRange?: {
    minValue: number
    maxValue: number
    currency: string
  }
  brand?: string
  productType: string
  customAttributes: Record<string, string | number | boolean>
}

interface UCPInventoryResponse {
  products: UCPProduct[]
  totalCount: number
  hasMore: boolean
  nextPageToken?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const promoterSlug = searchParams.get('promoterSlug')
    const eventId = searchParams.get('eventId')
    const upcoming = searchParams.get('upcoming') !== 'false'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const pageToken = searchParams.get('pageToken')

    const db = getAdminFirestore()
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://boxofficetech.com'
    const now = new Date()

    // Build query
    let eventsQuery = db.collection('events').where('status', '==', 'published')

    // Filter by specific event
    if (eventId) {
      const eventDoc = await db.collection('events').doc(eventId).get()
      if (!eventDoc.exists) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }

      const event = eventDoc.data()!
      const promoterDoc = await db.collection('promoters').doc(event.promoterId).get()
      const promoter = promoterDoc.data()

      const product = await eventToUCPProduct(event, eventDoc.id, promoter, baseUrl)
      return NextResponse.json({
        products: [product],
        totalCount: 1,
        hasMore: false,
      })
    }

    // Filter by promoter
    if (promoterSlug) {
      const promoterSnapshot = await db.collection('promoters')
        .where('slug', '==', promoterSlug)
        .limit(1)
        .get()

      if (promoterSnapshot.empty) {
        return NextResponse.json({ error: 'Promoter not found' }, { status: 404 })
      }

      const promoterId = promoterSnapshot.docs[0].id
      eventsQuery = eventsQuery.where('promoterId', '==', promoterId)
    }

    // Execute query
    const eventsSnapshot = await eventsQuery.limit(limit + 1).get()

    // Process events into UCP products
    const products: UCPProduct[] = []
    const promoterCache: Record<string, any> = {}

    for (const doc of eventsSnapshot.docs.slice(0, limit)) {
      const event = doc.data()

      // Filter upcoming events
      const eventDate = event.startDate?.toDate?.() || event.startDate
      if (upcoming && eventDate && eventDate < now) {
        continue
      }

      // Get promoter data (cached)
      if (!promoterCache[event.promoterId]) {
        const promoterDoc = await db.collection('promoters').doc(event.promoterId).get()
        promoterCache[event.promoterId] = promoterDoc.data()
      }

      const product = await eventToUCPProduct(
        event,
        doc.id,
        promoterCache[event.promoterId],
        baseUrl
      )
      products.push(product)
    }

    const response: UCPInventoryResponse = {
      products,
      totalCount: products.length,
      hasMore: eventsSnapshot.docs.length > limit,
      ...(eventsSnapshot.docs.length > limit && {
        nextPageToken: eventsSnapshot.docs[limit - 1].id,
      }),
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('UCP inventory error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

async function eventToUCPProduct(
  event: any,
  eventId: string,
  promoter: any,
  baseUrl: string
): Promise<UCPProduct> {
  const slug = promoter?.slug || 'events'
  const eventSlug = event.slug || eventId

  // Determine availability
  let availability: UCPProduct['availability'] = 'in_stock'
  if (event.isSoldOut) {
    availability = 'out_of_stock'
  } else if (event.ticketsAvailable !== undefined && event.ticketsAvailable < 20) {
    availability = 'limited_availability'
  }

  // Build price data
  const minPrice = event.pricing?.minPrice || 0
  const maxPrice = event.pricing?.maxPrice || minPrice
  const currency = event.pricing?.currency?.toUpperCase() || 'USD'

  // Build venue info
  const venueInfo = event.venue?.name
    ? `${event.venue.name}${event.venue.city ? `, ${event.venue.city}` : ''}`
    : 'Venue TBA'

  // Format date
  const eventDate = event.startDate?.toDate?.() || event.startDate
  const dateStr = eventDate
    ? new Date(eventDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Date TBA'

  return {
    id: `event_${eventId}`,
    title: event.name,
    description: event.shortDescription || event.description?.substring(0, 500),
    link: `${baseUrl}/p/${slug}/events/${eventSlug}`,
    imageLink: event.bannerImage || event.thumbnail,
    availability,
    price: {
      value: minPrice,
      currency,
    },
    ...(minPrice !== maxPrice && {
      priceRange: {
        minValue: minPrice,
        maxValue: maxPrice,
        currency,
      },
    }),
    brand: promoter?.name || 'BoxOfficeTech',
    productType: 'Event Ticket',
    customAttributes: {
      eventDate: dateStr,
      eventTime: event.startTime || '',
      venue: venueInfo,
      venueCity: event.venue?.city || '',
      venueState: event.venue?.state || '',
      category: event.category || 'event',
      ticketsAvailable: event.ticketsAvailable || 0,
      isSoldOut: event.isSoldOut || false,
      isOnline: event.venue?.type === 'online',
    },
  }
}
