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

    if (!eventDoc.exists) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const data = eventDoc.data()!

    // Parse dates
    const startDate = data.startDate?.toDate?.() || new Date(data.startDate)
    const endDate = data.endDate?.toDate?.() || (data.endDate ? new Date(data.endDate) : null)

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

    // Return event data
    const event = {
      id: eventDoc.id,
      name: data.name || data.title,
      slug: data.slug,
      description: data.description,
      shortDescription: data.shortDescription,
      thumbnail: data.thumbnail,
      bannerImage: data.bannerImage || data.coverImage,
      startDate: startDate.toISOString(),
      endDate: endDate?.toISOString(),
      startTime: data.startTime,
      endTime: data.endTime,
      venue: data.venue ? {
        id: data.venue.id,
        name: data.venue.name,
        city: data.venue.city,
        state: data.venue.state,
        address: data.venue.address,
        type: data.venue.type,
      } : null,
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
