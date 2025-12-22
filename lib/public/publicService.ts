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
    console.log(`[PublicService] Looking for promoter with slug: ${slug}`)

    const snapshot = await promotersRef
      .where('slug', '==', slug)
      .where('active', '==', true)
      .limit(1)
      .get()

    if (snapshot.empty) {
      console.log(`[PublicService] No promoter found with slug: ${slug}`)
      return null
    }

    const doc = snapshot.docs[0]
    const data = doc.data()
    console.log(`[PublicService] Found promoter: id=${doc.id}, name=${data.name}`)

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
    console.log(`[PublicService] Fetching events for promoterId: ${promoterId}`)

    // Events are stored with promoter info in nested 'promoter.promoterId' field
    // Events can have status 'active' or 'published' - both are visible on public site
    let query = db.collection('events')
      .where('promoter.promoterId', '==', promoterId)

    if (options?.category) {
      query = query.where('category', '==', options.category)
    }

    if (options?.featured) {
      query = query.where('isFeatured', '==', true)
    }

    const snapshot = await query.get()
    console.log(`[PublicService] Query returned ${snapshot.size} events for promoterId: ${promoterId}`)

    // Debug: If no events found, let's check what promoterIds exist in events
    if (snapshot.empty) {
      console.log(`[PublicService] No events found. Checking sample events...`)
      const sampleEvents = await db.collection('events').limit(3).get()
      sampleEvents.docs.forEach(doc => {
        const data = doc.data()
        console.log(`[PublicService] Sample event: id=${doc.id}, promoter.promoterId=${data.promoter?.promoterId}, promoterId=${data.promoterId}, status=${data.status}`)
      })
    }

    const now = new Date()
    const validStatuses = ['active', 'published']

    let events = snapshot.docs
      .filter(doc => {
        const status = doc.data().status
        return validStatuses.includes(status)
      })
      .map(doc => {
      const data = doc.data()

      // Debug: Log first event's data structure
      if (snapshot.docs.indexOf(doc) === 0) {
        console.log('[PublicService] Sample event data structure:', {
          name: data.name,
          hasImages: !!data.images,
          imagesCover: data.images?.cover,
          thumbnail: data.thumbnail,
          image: data.image,
          hasSchedule: !!data.schedule,
          schedulePerformances: data.schedule?.performances?.length,
          firstPerfDate: data.schedule?.performances?.[0]?.date,
          firstPerfDateType: typeof data.schedule?.performances?.[0]?.date,
          hasToDate: typeof data.schedule?.performances?.[0]?.date?.toDate,
        })
      }

      // Get start date from schedule.performances[0].date (primary) or fallback fields
      const firstPerformance = data.schedule?.performances?.[0]
      let startDate: Date
      if (firstPerformance?.date) {
        // Handle Firestore Timestamp or ISO string
        const rawDate = firstPerformance.date
        if (typeof rawDate?.toDate === 'function') {
          startDate = rawDate.toDate()
        } else if (rawDate?._seconds) {
          // Firestore Timestamp serialized format
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
        startDate = new Date(NaN) // Invalid date - will show "Date TBA"
      }

      // Get image from images.cover (primary) or fallback fields
      const thumbnail = data.images?.cover || data.thumbnail || data.image || data.bannerImage

      return {
        id: doc.id,
        name: data.name || data.basics?.name || '',
        slug: data.slug || data.communications?.seo?.urlSlug,
        description: data.description || data.basics?.description,
        shortDescription: data.shortDescription || data.basics?.shortDescription,
        thumbnail,
        bannerImage: data.bannerImage || data.images?.cover,
        startDate,
        endDate: data.endDate?.toDate?.(),
        venue: data.venue || {
          name: data.venueName,
          address: data.venueAddress,
          city: data.venueCity,
          state: data.venueState,
        },
        category: data.category || data.basics?.category,
        status: data.status,
        pricing: {
          minPrice: data.pricing?.minPrice || data.minPrice,
          maxPrice: data.pricing?.maxPrice || data.maxPrice,
          currency: data.pricing?.currency || 'USD',
        },
        promoterId: data.promoter?.promoterId || data.promoterId,
        promoterSlug: data.promoter?.slug || data.promoterSlug,
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

    // Get start date from schedule.performances[0].date (primary) or fallback fields
    const firstPerformance = data.schedule?.performances?.[0]
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
      startDate = new Date(NaN) // Invalid date - will show "Date TBA"
    }

    // Get image from images.cover (primary) or fallback fields
    const thumbnail = data.images?.cover || data.thumbnail || data.image || data.bannerImage

    return {
      id: doc.id,
      name: data.name || data.basics?.name || '',
      slug: data.slug || data.communications?.seo?.urlSlug,
      description: data.description || data.basics?.description,
      shortDescription: data.shortDescription || data.basics?.shortDescription,
      thumbnail,
      bannerImage: data.bannerImage || data.images?.cover,
      startDate,
      endDate: data.endDate?.toDate?.(),
      venue: data.venue || {
        name: data.venueName,
        address: data.venueAddress,
        city: data.venueCity,
        state: data.venueState,
      },
      category: data.category || data.basics?.category,
      status: data.status,
      pricing: {
        minPrice: data.pricing?.minPrice || data.minPrice,
        maxPrice: data.pricing?.maxPrice || data.maxPrice,
        currency: data.pricing?.currency || 'USD',
      },
      promoterId: data.promoter?.promoterId || data.promoterId,
      promoterSlug: data.promoter?.slug || data.promoterSlug,
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
