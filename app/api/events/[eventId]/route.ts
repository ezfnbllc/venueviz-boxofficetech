/**
 * Event API
 *
 * GET /api/events/[eventId] - Get event details including ticket types
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params
    const db = getAdminFirestore()

    // Try to find event by ID or slug
    let eventDoc = await db.collection('events').doc(eventId).get()

    // If not found by ID, try to find by slug
    if (!eventDoc.exists) {
      const slugQuery = await db.collection('events')
        .where('slug', '==', eventId)
        .limit(1)
        .get()

      if (!slugQuery.empty) {
        eventDoc = slugQuery.docs[0]
      }
    }

    // Also check communications.seo.urlSlug (some events store slug there)
    if (!eventDoc.exists) {
      const urlSlugQuery = await db.collection('events')
        .where('communications.seo.urlSlug', '==', eventId)
        .limit(1)
        .get()

      if (!urlSlugQuery.empty) {
        eventDoc = urlSlugQuery.docs[0]
      }
    }

    if (!eventDoc.exists) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const data = eventDoc.data()!

    // Get schedule info from first performance (primary source for dates/times)
    const firstPerformance = data.schedule?.performances?.[0]

    // Parse start date - check schedule.performances first, then fallback to startDate field
    let startDate: Date
    if (firstPerformance?.date) {
      const rawDate = firstPerformance.date
      if (typeof rawDate?.toDate === 'function') {
        startDate = rawDate.toDate()
      } else if (rawDate?._seconds) {
        startDate = new Date(rawDate._seconds * 1000)
      } else {
        startDate = new Date(rawDate)
      }
    } else if (data.startDate) {
      const rawDate = data.startDate
      if (typeof rawDate?.toDate === 'function') {
        startDate = rawDate.toDate()
      } else if (rawDate?._seconds) {
        startDate = new Date(rawDate._seconds * 1000)
      } else {
        startDate = new Date(rawDate)
      }
    } else {
      startDate = new Date() // Fallback to now if no date found
    }

    // Parse end date
    let endDate: Date | null = null
    if (data.endDate) {
      const rawEndDate = data.endDate
      if (typeof rawEndDate?.toDate === 'function') {
        endDate = rawEndDate.toDate()
      } else if (rawEndDate?._seconds) {
        endDate = new Date(rawEndDate._seconds * 1000)
      } else {
        endDate = new Date(rawEndDate)
      }
    }

    // Get times from performance or fallback fields
    const startTime = firstPerformance?.startTime || data.startTime
    const endTime = firstPerformance?.endTime || data.endTime

    // Get image from multiple possible sources
    const thumbnail = data.images?.cover || data.thumbnail || data.image || data.bannerImage
    const bannerImage = data.bannerImage || data.images?.cover || data.coverImage

    // Build ticket types from pricing data or create defaults
    let ticketTypes = data.ticketTypes || []

    if (ticketTypes.length === 0 && data.pricing) {
      // Create ticket types from pricing tiers
      const tiers = data.pricing.tiers || []
      if (tiers.length > 0) {
        ticketTypes = tiers.map((tier: any, index: number) => ({
          id: tier.id || `tier-${index}`,
          name: tier.name || tier.tierName || 'General Admission',
          description: tier.description,
          price: tier.price || 0,
          available: tier.available ?? tier.quantity ?? 100,
          maxPerOrder: tier.maxPerOrder ?? 10,
        }))
      } else if (data.pricing.minPrice !== undefined) {
        // Create default ticket types from min/max price
        ticketTypes = [
          {
            id: 'general',
            name: 'General Admission',
            price: data.pricing.minPrice,
            available: data.ticketsAvailable ?? 100,
            maxPerOrder: 10,
          },
        ]

        if (data.pricing.maxPrice && data.pricing.maxPrice > data.pricing.minPrice) {
          ticketTypes.push({
            id: 'vip',
            name: 'VIP',
            description: 'Premium seating with exclusive perks',
            price: data.pricing.maxPrice,
            available: Math.floor((data.ticketsAvailable ?? 100) / 4),
            maxPerOrder: 4,
          })
        }
      }
    }

    // Build venue object with fallbacks
    const venueData = data.venue || {}
    const venue = venueData.name || data.venueName ? {
      id: venueData.venueId || venueData.id,
      name: venueData.name || data.venueName || '',
      city: venueData.city || data.venueCity,
      state: venueData.state || data.venueState,
      address: venueData.address,
      type: venueData.type,
    } : null

    // Return event data
    const event = {
      id: eventDoc.id,
      name: data.name || data.basics?.name || data.title || '',
      slug: data.slug || data.communications?.seo?.urlSlug,
      description: data.description || data.basics?.description,
      shortDescription: data.shortDescription || data.basics?.shortDescription,
      thumbnail,
      bannerImage,
      startDate: startDate.toISOString(),
      endDate: endDate?.toISOString(),
      startTime,
      endTime,
      venue,
      pricing: data.pricing ? {
        currency: data.pricing.currency || 'USD',
        minPrice: data.pricing.minPrice,
        maxPrice: data.pricing.maxPrice,
      } : null,
      ticketTypes,
      isSoldOut: data.isSoldOut || false,
      ticketsAvailable: data.ticketsAvailable,
      status: data.status,
    }

    return NextResponse.json(event)

  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    )
  }
}
