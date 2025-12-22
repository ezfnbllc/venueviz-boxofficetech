/**
 * Public Service
 * Server-side data fetching for public pages
 *
 * Uses Firebase Admin SDK for server-side rendering
 */

import { getAdminDb } from '@/lib/firebase-admin'

export interface PublicEvent {
  id: string
  name: string
  slug?: string
  description?: string
  shortDescription?: string
  thumbnail?: string
  bannerImage?: string
  startDate: Date
  endDate?: Date
  venue?: {
    name: string
    address?: string
    city?: string
    state?: string
  }
  category?: string
  status: string
  pricing?: {
    minPrice?: number
    maxPrice?: number
    currency?: string
  }
  promoterId: string
  promoterSlug?: string
  ticketsAvailable?: number
  totalCapacity?: number
  isFeatured?: boolean
  isSoldOut?: boolean
}

export interface PublicPromoter {
  id: string
  name: string
  slug: string
  logo?: string
  banner?: string
  description?: string
  website?: string
  socialLinks?: {
    facebook?: string
    twitter?: string
    instagram?: string
    youtube?: string
  }
  contactEmail?: string
  active: boolean
}

/**
 * Get promoter by slug (server-side)
 */
export async function getPromoterBySlug(slug: string): Promise<PublicPromoter | null> {
  try {
    const db = getAdminDb()
    const promotersRef = db.collection('promoters')
    const snapshot = await promotersRef
      .where('slug', '==', slug)
      .where('active', '==', true)
      .limit(1)
      .get()

    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    const data = doc.data()

    return {
      id: doc.id,
      name: data.name || '',
      slug: data.slug || '',
      logo: data.logo,
      banner: data.banner,
      description: data.description,
      website: data.website,
      socialLinks: data.socialLinks,
      contactEmail: data.contactEmail,
      active: data.active,
    }
  } catch (error) {
    console.error('Error fetching promoter by slug:', error)
    return null
  }
}

/**
 * Get public events for a promoter
 */
export async function getPromoterEvents(
  promoterId: string,
  options?: {
    limit?: number
    category?: string
    upcoming?: boolean
    featured?: boolean
  }
): Promise<PublicEvent[]> {
  try {
    const db = getAdminDb()
    let query = db.collection('events')
      .where('promoterId', '==', promoterId)
      .where('status', '==', 'published')

    if (options?.category) {
      query = query.where('category', '==', options.category)
    }

    if (options?.featured) {
      query = query.where('isFeatured', '==', true)
    }

    const snapshot = await query.get()
    const now = new Date()

    let events = snapshot.docs.map(doc => {
      const data = doc.data()
      const startDate = data.startDate?.toDate?.() ||
                       data.schedule?.date?.toDate?.() ||
                       new Date(data.startDate || data.schedule?.date)

      return {
        id: doc.id,
        name: data.name || '',
        slug: data.slug,
        description: data.description,
        shortDescription: data.shortDescription,
        thumbnail: data.thumbnail || data.image,
        bannerImage: data.bannerImage,
        startDate,
        endDate: data.endDate?.toDate?.(),
        venue: data.venue,
        category: data.category,
        status: data.status,
        pricing: {
          minPrice: data.pricing?.minPrice || data.minPrice,
          maxPrice: data.pricing?.maxPrice || data.maxPrice,
          currency: data.pricing?.currency || 'USD',
        },
        promoterId: data.promoterId,
        promoterSlug: data.promoterSlug,
        ticketsAvailable: data.ticketsAvailable,
        totalCapacity: data.totalCapacity || data.capacity,
        isFeatured: data.isFeatured,
        isSoldOut: data.isSoldOut || (data.ticketsAvailable === 0),
      } as PublicEvent
    })

    // Filter upcoming if needed
    if (options?.upcoming) {
      events = events.filter(e => e.startDate > now)
    }

    // Sort by date
    events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

    // Apply limit
    if (options?.limit) {
      events = events.slice(0, options.limit)
    }

    return events
  } catch (error) {
    console.error('Error fetching promoter events:', error)
    return []
  }
}

/**
 * Get single event by ID
 */
export async function getEventById(eventId: string): Promise<PublicEvent | null> {
  try {
    const db = getAdminDb()
    const doc = await db.collection('events').doc(eventId).get()

    if (!doc.exists) return null

    const data = doc.data()!
    const startDate = data.startDate?.toDate?.() ||
                     data.schedule?.date?.toDate?.() ||
                     new Date(data.startDate || data.schedule?.date)

    return {
      id: doc.id,
      name: data.name || '',
      slug: data.slug,
      description: data.description,
      shortDescription: data.shortDescription,
      thumbnail: data.thumbnail || data.image,
      bannerImage: data.bannerImage,
      startDate,
      endDate: data.endDate?.toDate?.(),
      venue: data.venue,
      category: data.category,
      status: data.status,
      pricing: {
        minPrice: data.pricing?.minPrice || data.minPrice,
        maxPrice: data.pricing?.maxPrice || data.maxPrice,
        currency: data.pricing?.currency || 'USD',
      },
      promoterId: data.promoterId,
      promoterSlug: data.promoterSlug,
      ticketsAvailable: data.ticketsAvailable,
      totalCapacity: data.totalCapacity || data.capacity,
      isFeatured: data.isFeatured,
      isSoldOut: data.isSoldOut || (data.ticketsAvailable === 0),
    }
  } catch (error) {
    console.error('Error fetching event:', error)
    return null
  }
}

/**
 * Get event categories for a promoter
 */
export async function getPromoterCategories(promoterId: string): Promise<string[]> {
  try {
    const events = await getPromoterEvents(promoterId)
    const categories = new Set(events.map(e => e.category).filter(Boolean))
    return Array.from(categories) as string[]
  } catch (error) {
    console.error('Error fetching categories:', error)
    return []
  }
}

/**
 * Get featured events for a promoter
 */
export async function getFeaturedEvents(promoterId: string, limit = 4): Promise<PublicEvent[]> {
  return getPromoterEvents(promoterId, { featured: true, limit, upcoming: true })
}

/**
 * Get upcoming events for a promoter
 */
export async function getUpcomingEvents(promoterId: string, limit = 8): Promise<PublicEvent[]> {
  return getPromoterEvents(promoterId, { upcoming: true, limit })
}
