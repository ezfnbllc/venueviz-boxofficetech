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
  // Schedule info
  startDate: Date
  endDate?: Date
  startTime?: string  // HH:mm format
  endTime?: string    // HH:mm format
  doorsOpen?: string  // HH:mm format
  timezone?: string
  // Venue info
  venue?: {
    id?: string
    name: string
    address?: string
    streetAddress1?: string
    streetAddress2?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
    coordinates?: {
      lat: number
      lng: number
    }
    type?: string
    amenities?: string[]
  }
  category?: string
  status: string
  // Pricing info
  pricing?: {
    minPrice?: number
    maxPrice?: number
    currency?: string
    tiers?: Array<{
      id: string
      name: string
      basePrice: number
      capacity?: number
    }>
    fees?: {
      serviceFee?: number
      serviceFeeType?: string
      processingFee?: number
      facilityFee?: number
      salesTax?: number
    }
  }
  promoterId: string
  promoterSlug?: string
  ticketsAvailable?: number
  totalCapacity?: number
  isFeatured?: boolean
  isSoldOut?: boolean
  // Additional info
  performers?: string[]
  tags?: string[]
  // SEO info
  seo?: {
    metaTitle?: string
    metaDescription?: string
    aiSearchDescription?: string
    keywords?: string[]
    socialMediaImage?: string
    faqStructuredData?: Array<{
      question: string
      answer: string
    }>
    localSeo?: {
      city?: string
      state?: string
      neighborhood?: string
    }
    targetSearchQueries?: string[]
    semanticKeywords?: string[]
  }
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

    // Debug: Log first event's data structure
    if (snapshot.docs.length > 0) {
      const firstData = snapshot.docs[0].data()
      console.log('[PublicService] Sample event data structure:', {
        name: firstData.name,
        hasImages: !!firstData.images,
        imagesCover: firstData.images?.cover,
        hasSchedule: !!firstData.schedule,
        schedulePerformances: firstData.schedule?.performances?.length,
        firstPerfStartTime: firstData.schedule?.performances?.[0]?.startTime,
        venueName: firstData.venueName,
        venueObj: firstData.venue,
        pricingTiers: firstData.pricing?.tiers?.length,
        pricingCurrency: firstData.pricing?.currency,
      })
    }

    let events = snapshot.docs
      .filter(doc => {
        const status = doc.data().status
        return validStatuses.includes(status)
      })
      .map(doc => parseEventDoc(doc.id, doc.data()))

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
 * Get event by slug or ID (tries slug first, falls back to ID)
 */
export async function getEventBySlugOrId(slugOrId: string): Promise<PublicEvent | null> {
  try {
    const db = getAdminDb()

    // First try to find by slug
    const slugQuery = await db.collection('events')
      .where('slug', '==', slugOrId)
      .limit(1)
      .get()

    if (!slugQuery.empty) {
      const doc = slugQuery.docs[0]
      return parseEventDoc(doc.id, doc.data())
    }

    // Also check communications.seo.urlSlug
    const urlSlugQuery = await db.collection('events')
      .where('communications.seo.urlSlug', '==', slugOrId)
      .limit(1)
      .get()

    if (!urlSlugQuery.empty) {
      const doc = urlSlugQuery.docs[0]
      return parseEventDoc(doc.id, doc.data())
    }

    // Fall back to ID lookup
    const doc = await db.collection('events').doc(slugOrId).get()
    if (doc.exists) {
      return parseEventDoc(doc.id, doc.data()!)
    }

    return null
  } catch (error) {
    console.error('Error fetching event by slug or ID:', error)
    return null
  }
}

/**
 * Helper to parse event document data
 */
function parseEventDoc(id: string, data: any): PublicEvent {
  // Get schedule info from first performance
  const firstPerformance = data.schedule?.performances?.[0]

  // Parse start date
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
    startDate = new Date(NaN)
  }

  // Get times from performance
  const startTime = firstPerformance?.startTime
  const endTime = firstPerformance?.endTime
  const doorsOpen = firstPerformance?.doorsOpen
  const timezone = data.schedule?.timezone

  // Get image
  const thumbnail = data.images?.cover || data.thumbnail || data.image || data.bannerImage

  // Build venue object with all available data
  const venueData = data.venue || {}

  // Extract coordinates from multiple possible locations
  let coordinates = venueData.coordinates
  if (!coordinates && venueData.address?.coordinates) {
    coordinates = {
      lat: venueData.address.coordinates.lat,
      lng: venueData.address.coordinates.lng,
    }
  }
  if (!coordinates && venueData.latitude && venueData.longitude) {
    coordinates = {
      lat: venueData.latitude,
      lng: venueData.longitude,
    }
  }
  if (!coordinates && data.venueLatitude && data.venueLongitude) {
    coordinates = {
      lat: data.venueLatitude,
      lng: data.venueLongitude,
    }
  }

  const venue = {
    id: venueData.venueId || venueData.id,
    name: venueData.name || data.venueName || '',
    address: venueData.address,
    streetAddress1: venueData.streetAddress1,
    streetAddress2: venueData.streetAddress2,
    city: venueData.city || data.venueCity,
    state: venueData.state || data.venueState,
    zipCode: venueData.zipCode,
    country: venueData.country || 'USA',
    coordinates,
    type: venueData.type,
    amenities: venueData.amenities,
  }

  // Build pricing object with tiers and fees
  const pricingTiers = data.pricing?.tiers || []
  const minPrice = pricingTiers.length > 0
    ? Math.min(...pricingTiers.map((t: any) => t.basePrice || 0))
    : data.pricing?.minPrice || data.minPrice
  const maxPrice = pricingTiers.length > 0
    ? Math.max(...pricingTiers.map((t: any) => t.basePrice || 0))
    : data.pricing?.maxPrice || data.maxPrice

  const pricing = {
    minPrice,
    maxPrice,
    currency: data.pricing?.currency || 'USD',
    tiers: pricingTiers.map((t: any) => ({
      id: t.id,
      name: t.name,
      basePrice: t.basePrice,
      capacity: t.capacity,
    })),
    fees: data.pricing?.fees ? {
      serviceFee: data.pricing.fees.serviceFee,
      serviceFeeType: data.pricing.fees.serviceFeeType,
      processingFee: data.pricing.fees.processingFee,
      facilityFee: data.pricing.fees.facilityFee,
      salesTax: data.pricing.fees.salesTax,
    } : undefined,
  }

  return {
    id,
    name: data.name || data.basics?.name || '',
    slug: data.slug || data.communications?.seo?.urlSlug,
    description: data.description || data.basics?.description,
    shortDescription: data.shortDescription || data.basics?.shortDescription,
    thumbnail,
    bannerImage: data.bannerImage || data.images?.cover,
    // Schedule
    startDate,
    endDate: data.endDate?.toDate?.(),
    startTime,
    endTime,
    doorsOpen,
    timezone,
    // Venue
    venue: venue.name ? venue : undefined,
    category: data.category || data.basics?.category,
    status: data.status,
    // Pricing
    pricing,
    promoterId: data.promoter?.promoterId || data.promoterId,
    promoterSlug: data.promoter?.slug || data.promoterSlug,
    ticketsAvailable: data.ticketsAvailable,
    totalCapacity: data.totalCapacity || data.capacity || venueData.totalCapacity,
    isFeatured: data.isFeatured || data.basics?.featured,
    isSoldOut: data.isSoldOut || (data.ticketsAvailable === 0),
    // Additional
    performers: data.basics?.performers || data.performers,
    tags: data.basics?.tags || data.tags,
    // SEO
    seo: data.communications?.seo ? {
      metaTitle: data.communications.seo.metaTitle,
      metaDescription: data.communications.seo.metaDescription,
      aiSearchDescription: data.communications.seo.aiSearchDescription,
      keywords: data.communications.seo.keywords,
      socialMediaImage: data.communications.seo.socialMediaImage,
      faqStructuredData: data.communications.seo.faqStructuredData,
      localSeo: data.communications.seo.localSeo,
      targetSearchQueries: data.communications.seo.targetSearchQueries,
      semanticKeywords: data.communications.seo.semanticKeywords,
    } : undefined,
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

/**
 * Public venue interface
 */
export interface PublicVenue {
  id: string
  name: string
  description?: string
  type?: string
  streetAddress1?: string
  streetAddress2?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  coordinates?: {
    lat: number
    lng: number
  }
  capacity?: number
  amenities?: string[]
  images?: string[]
  contactEmail?: string
  contactPhone?: string
  website?: string
}

/**
 * Get venue by ID
 */
export async function getVenueById(venueId: string): Promise<PublicVenue | null> {
  try {
    const db = getAdminDb()
    const doc = await db.collection('venues').doc(venueId).get()

    if (!doc.exists) return null

    const data = doc.data()!

    return {
      id: doc.id,
      name: data.name || '',
      description: data.description,
      type: data.type,
      streetAddress1: data.streetAddress1,
      streetAddress2: data.streetAddress2,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      country: data.country || 'USA',
      coordinates: data.address?.coordinates || (data.latitude && data.longitude ? {
        lat: data.latitude,
        lng: data.longitude,
      } : undefined),
      capacity: data.capacity,
      amenities: data.amenities,
      images: data.images,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      website: data.website,
    }
  } catch (error) {
    console.error('Error fetching venue:', error)
    return null
  }
}
