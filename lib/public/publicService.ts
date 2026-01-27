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
 * Get promoter by custom domain (server-side)
 * Matches domains like "myticketplatform.com" or "https://myticketplatform.com"
 */
export async function getPromoterByDomain(domain: string): Promise<PublicPromoter | null> {
  try {
    const db = getAdminDb()
    const promotersRef = db.collection('promoters')

    // Normalize the domain (remove protocol, www, trailing slashes)
    const normalizedDomain = domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')

    console.log(`[PublicService] Looking for promoter with domain: ${normalizedDomain}`)

    // Get all active promoters and check their website field
    // We need to check multiple formats (with/without protocol, with/without www)
    const snapshot = await promotersRef
      .where('active', '==', true)
      .get()

    for (const doc of snapshot.docs) {
      const data = doc.data()
      if (data.website) {
        const promoterDomain = data.website
          .toLowerCase()
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/\/$/, '')

        if (promoterDomain === normalizedDomain) {
          console.log(`[PublicService] Found promoter by domain: id=${doc.id}, name=${data.name}`)
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
        }
      }
    }

    console.log(`[PublicService] No promoter found with domain: ${normalizedDomain}`)
    return null
  } catch (error) {
    console.error('Error fetching promoter by domain:', error)
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

    let snapshot = await query.get()
    console.log(`[PublicService] Query (promoter.promoterId) returned ${snapshot.size} events for promoterId: ${promoterId}`)

    // Fallback: Also try top-level promoterId field if no results
    if (snapshot.empty) {
      console.log(`[PublicService] Trying fallback query with top-level promoterId...`)
      let fallbackQuery = db.collection('events')
        .where('promoterId', '==', promoterId)

      if (options?.category) {
        fallbackQuery = fallbackQuery.where('category', '==', options.category)
      }
      if (options?.featured) {
        fallbackQuery = fallbackQuery.where('isFeatured', '==', true)
      }

      snapshot = await fallbackQuery.get()
      console.log(`[PublicService] Fallback query returned ${snapshot.size} events`)
    }

    // Debug: If still no events found, check what promoterIds exist in events
    if (snapshot.empty) {
      console.log(`[PublicService] No events found. Checking sample events...`)
      const sampleEvents = await db.collection('events').limit(5).get()
      sampleEvents.docs.forEach(doc => {
        const data = doc.data()
        console.log(`[PublicService] Sample event: id=${doc.id}, promoter.promoterId=${data.promoter?.promoterId}, promoterId=${data.promoterId}, status=${data.status}`)
      })
    }

    const now = new Date()
    // Set to start of today for date comparisons (include events happening today)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const validStatuses = ['active', 'published']

    // Debug: Log all events and their statuses
    if (snapshot.docs.length > 0) {
      snapshot.docs.forEach((doc, idx) => {
        const data = doc.data()
        console.log(`[PublicService] Event ${idx + 1}:`, {
          id: doc.id,
          name: data.name,
          status: data.status,
          hasPromoter: !!data.promoter?.promoterId,
          promoterId: data.promoter?.promoterId,
          hasSchedule: !!data.schedule?.performances?.length,
          firstPerfDate: data.schedule?.performances?.[0]?.date,
        })
      })
    }

    let events = snapshot.docs
      .filter(doc => {
        const data = doc.data()
        const status = (data.status || '').toLowerCase()
        const isValidStatus = validStatuses.includes(status)
        if (!isValidStatus) {
          console.log(`[PublicService] Event ${doc.id} filtered out - status '${data.status}' not in valid statuses`)
        }
        return isValidStatus
      })
      .map(doc => parseEventDoc(doc.id, doc.data()))

    // Filter upcoming if needed (include events from today onwards)
    if (options?.upcoming) {
      const eventsBeforeFilter = events.length
      events = events.filter(e => {
        const eventDate = new Date(e.startDate)
        const isUpcoming = eventDate >= today || isNaN(eventDate.getTime())  // Include events with invalid dates for now
        if (!isUpcoming) {
          console.log(`[PublicService] Event ${e.id} (${e.name}) filtered out - date ${e.startDate} is in the past`)
        }
        return isUpcoming
      })
      console.log(`[PublicService] Upcoming filter: ${eventsBeforeFilter} -> ${events.length} events`)
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
      // FAQ structured data can be stored in either field
      faqStructuredData: data.communications.seo.faqStructuredData || data.communications.seo.structuredDataFAQ,
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
 * Public affiliate event interface
 */
export interface PublicAffiliateEvent {
  id: string
  name: string
  description?: string
  imageUrl?: string
  startDate: Date
  venueName: string
  venueCity: string
  venueState?: string
  venueCountry?: string
  minPrice?: number
  maxPrice?: number
  currency?: string
  affiliateUrl: string
  platform: string
  isAffiliate: true  // Flag to distinguish from regular events
}

/**
 * Get affiliate events for a promoter (server-side)
 */
export async function getPromoterAffiliateEvents(
  promoterId: string,
  options?: {
    limit?: number
    upcoming?: boolean
  }
): Promise<PublicAffiliateEvent[]> {
  try {
    const db = getAdminDb()
    console.log(`[PublicService] Fetching affiliate events for promoterId: ${promoterId}`)

    // Query affiliate events for this promoter that are active
    const query = db.collection('affiliateEvents')
      .where('promoterId', '==', promoterId)
      .where('isActive', '==', true)

    const snapshot = await query.get()
    console.log(`[PublicService] Found ${snapshot.size} active affiliate events`)

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    let events = snapshot.docs.map(doc => {
      const data = doc.data()

      // Parse date
      let startDate: Date
      if (data.startDate) {
        if (typeof data.startDate?.toDate === 'function') {
          startDate = data.startDate.toDate()
        } else if (data.startDate?._seconds) {
          startDate = new Date(data.startDate._seconds * 1000)
        } else {
          startDate = new Date(data.startDate)
        }
      } else {
        startDate = new Date(NaN)
      }

      return {
        id: doc.id,
        name: data.name || '',
        description: data.description,
        imageUrl: data.imageUrl,
        startDate,
        venueName: data.venueName || 'TBA',
        venueCity: data.venueCity || '',
        venueState: data.venueState,
        venueCountry: data.venueCountry || 'US',
        minPrice: data.minPrice,
        maxPrice: data.maxPrice,
        currency: data.currency || 'USD',
        affiliateUrl: data.affiliateUrl,
        platform: data.platform,
        isAffiliate: true as const,
      }
    })

    // Filter upcoming if needed
    if (options?.upcoming) {
      events = events.filter(e => {
        const eventDate = new Date(e.startDate)
        return eventDate >= today || isNaN(eventDate.getTime())
      })
    }

    // Sort by date
    events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

    // Apply limit
    if (options?.limit) {
      events = events.slice(0, options.limit)
    }

    return events
  } catch (error) {
    console.error('Error fetching affiliate events:', error)
    return []
  }
}

// =============================================================================
// CMS PAGE FUNCTIONS
// =============================================================================

/**
 * Public CMS Page interface
 * Simplified version of TenantPage for public rendering
 */
export interface PublicCMSPage {
  id: string
  title: string
  slug: string
  description?: string
  sections: any[] // PageSection[] from cms.ts
  seo?: {
    title?: string
    description?: string
    keywords?: string[]
    ogImage?: string
  }
}

/**
 * Get CMS page for a promoter by system type (about, contact, terms, privacy, faq)
 *
 * This function fetches the page data from the tenantPages collection
 * for CMS-editable pages that render dynamic content.
 *
 * @param promoterId - The promoter's ID
 * @param systemType - The system page type (about, contact, terms, privacy, faq)
 * @returns The CMS page with sections, or null if not found
 */
export async function getCMSPage(
  promoterId: string,
  systemType: string
): Promise<PublicCMSPage | null> {
  try {
    const db = getAdminDb()
    console.log(`[PublicService] Fetching CMS page: promoterId=${promoterId}, systemType=${systemType}`)

    // Query tenantPages collection
    // Note: tenantId in tenantPages = promoterId (they're interchangeable)
    const snapshot = await db.collection('tenantPages')
      .where('tenantId', '==', promoterId)
      .where('type', '==', 'system')
      .where('systemType', '==', systemType)
      .where('status', '==', 'published')
      .limit(1)
      .get()

    if (snapshot.empty) {
      console.log(`[PublicService] No CMS page found for ${systemType}`)
      return null
    }

    const doc = snapshot.docs[0]
    const data = doc.data()

    console.log(`[PublicService] Found CMS page: id=${doc.id}, sections=${data.sections?.length || 0}`)

    return {
      id: doc.id,
      title: data.title || '',
      slug: data.slug || systemType,
      description: data.description,
      sections: data.sections || [],
      seo: data.seo ? {
        title: data.seo.title,
        description: data.seo.description,
        keywords: data.seo.keywords,
        ogImage: data.seo.ogImage,
      } : undefined,
    }
  } catch (error) {
    console.error(`Error fetching CMS page ${systemType}:`, error)
    return null
  }
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
