/**
 * Affiliate Link Service
 * Generates tracking URLs for affiliate platforms
 */

import { AffiliatePlatform, AffiliateNetwork, PromoterAffiliate } from '@/lib/types/promoter'

export interface AffiliateLink {
  originalUrl: string
  affiliateUrl: string
  platform: AffiliatePlatform
  trackingId: string
}

// Platform-specific URL patterns
const PLATFORM_URL_PATTERNS: Record<AffiliatePlatform, {
  baseUrl: string
  eventPattern: RegExp
  buildUrl: (eventId: string, affiliate: PromoterAffiliate) => string
}> = {
  ticketmaster: {
    baseUrl: 'https://www.ticketmaster.com',
    eventPattern: /ticketmaster\.com\/event\/([\w-]+)/,
    buildUrl: (eventId, affiliate) => {
      // Ticketmaster uses Impact.com for affiliate tracking
      if (affiliate.affiliateNetwork === 'impact' && affiliate.publisherId) {
        return `https://ticketmaster.evyy.net/c/${affiliate.publisherId}/${affiliate.affiliateId || 'ticketmaster'}/4272?subId1=${affiliate.trackingId || 'bot'}&u=https://www.ticketmaster.com/event/${eventId}`
      }
      return `https://www.ticketmaster.com/event/${eventId}?camefrom=${affiliate.trackingId || 'affiliate'}`
    }
  },
  seatgeek: {
    baseUrl: 'https://seatgeek.com',
    eventPattern: /seatgeek\.com\/[\w-]+\/[\w-]+-tickets\/([\w-]+)/,
    buildUrl: (eventId, affiliate) => {
      // SeatGeek Partner tracking
      const trackingParams = new URLSearchParams()
      if (affiliate.affiliateId) trackingParams.set('aid', affiliate.affiliateId)
      if (affiliate.publisherId) trackingParams.set('pid', affiliate.publisherId)
      if (affiliate.trackingId) trackingParams.set('rid', affiliate.trackingId)
      return `https://seatgeek.com/e/${eventId}?${trackingParams.toString()}`
    }
  },
  stubhub: {
    baseUrl: 'https://www.stubhub.com',
    eventPattern: /stubhub\.com\/[\w-]+-tickets-[\w-]+\/event\/([\d]+)/,
    buildUrl: (eventId, affiliate) => {
      // StubHub uses Impact.com or CJ
      if (affiliate.affiliateNetwork === 'impact' && affiliate.publisherId) {
        return `https://stubhub.pxf.io/c/${affiliate.publisherId}/${affiliate.affiliateId || 'stubhub'}/6482?subId1=${affiliate.trackingId || 'bot'}&u=https://www.stubhub.com/event/${eventId}`
      }
      if (affiliate.affiliateNetwork === 'cj' && affiliate.publisherId) {
        return `https://www.anrdoezrs.net/click-${affiliate.publisherId}-${affiliate.affiliateId}?url=https://www.stubhub.com/event/${eventId}`
      }
      return `https://www.stubhub.com/event/${eventId}?gcid=${affiliate.trackingId || 'affiliate'}`
    }
  },
  ticketnetwork: {
    baseUrl: 'https://www.ticketnetwork.com',
    eventPattern: /ticketnetwork\.com\/ticket\/([\d]+)/,
    buildUrl: (eventId, affiliate) => {
      // TicketNetwork direct affiliate program
      const params = new URLSearchParams()
      if (affiliate.affiliateId) params.set('affid', affiliate.affiliateId)
      if (affiliate.trackingId) params.set('subid', affiliate.trackingId)
      return `https://www.ticketnetwork.com/ticket/${eventId}?${params.toString()}`
    }
  },
  fever: {
    baseUrl: 'https://feverup.com',
    eventPattern: /feverup\.com\/[\w]+\/[\w-]+\/([\w-]+)/,
    buildUrl: (eventId, affiliate) => {
      // Fever uses Impact.com
      if (affiliate.affiliateNetwork === 'impact' && affiliate.publisherId) {
        return `https://fever.pxf.io/c/${affiliate.publisherId}/${affiliate.affiliateId || 'fever'}/12345?subId1=${affiliate.trackingId || 'bot'}&u=https://feverup.com/m/${eventId}`
      }
      return `https://feverup.com/m/${eventId}?utm_source=${affiliate.trackingId || 'affiliate'}`
    }
  },
  eventbrite: {
    baseUrl: 'https://www.eventbrite.com',
    eventPattern: /eventbrite\.com\/e\/([\w-]+-[\d]+)/,
    buildUrl: (eventId, affiliate) => {
      // Eventbrite affiliate program
      const params = new URLSearchParams()
      if (affiliate.affiliateId) params.set('aff', affiliate.affiliateId)
      if (affiliate.trackingId) params.set('utm_source', affiliate.trackingId)
      return `https://www.eventbrite.com/e/${eventId}?${params.toString()}`
    }
  },
  bandsintown: {
    baseUrl: 'https://www.bandsintown.com',
    eventPattern: /bandsintown\.com\/e\/([\d]+)/,
    buildUrl: (eventId, affiliate) => {
      // Bandsintown partner program
      const params = new URLSearchParams()
      if (affiliate.affiliateId) params.set('app_id', affiliate.affiliateId)
      if (affiliate.trackingId) params.set('came_from', affiliate.trackingId)
      return `https://www.bandsintown.com/e/${eventId}?${params.toString()}`
    }
  },
  vivid_seats: {
    baseUrl: 'https://www.vividseats.com',
    eventPattern: /vividseats\.com\/[\w-]+\/[\w-]+\/[\d]+/,
    buildUrl: (eventId, affiliate) => {
      // Vivid Seats uses Impact.com or CJ
      if (affiliate.affiliateNetwork === 'impact' && affiliate.publisherId) {
        return `https://vividseats.pxf.io/c/${affiliate.publisherId}/${affiliate.affiliateId || 'vividseats'}/12345?subId1=${affiliate.trackingId || 'bot'}&u=https://www.vividseats.com/production/${eventId}`
      }
      return `https://www.vividseats.com/production/${eventId}?wsUser=${affiliate.trackingId || 'affiliate'}`
    }
  },
  viagogo: {
    baseUrl: 'https://www.viagogo.com',
    eventPattern: /viagogo\.com\/[\w]+\/[\w-]+\/E-([\d]+)/,
    buildUrl: (eventId, affiliate) => {
      // Viagogo direct affiliate
      return `https://www.viagogo.com/ww/E-${eventId}?AffiliateID=${affiliate.affiliateId || ''}&SubID=${affiliate.trackingId || 'bot'}`
    }
  }
}

/**
 * Generate an affiliate tracking URL for a given event URL
 */
export function generateAffiliateLink(
  originalUrl: string,
  affiliate: PromoterAffiliate
): AffiliateLink | null {
  const platform = affiliate.platform
  const config = PLATFORM_URL_PATTERNS[platform]

  if (!config) {
    console.warn(`No URL pattern configured for platform: ${platform}`)
    return null
  }

  // Extract event ID from the original URL
  const match = originalUrl.match(config.eventPattern)
  if (!match || !match[1]) {
    // If no match, try to use the URL as-is with tracking params
    return {
      originalUrl,
      affiliateUrl: appendTrackingParams(originalUrl, affiliate),
      platform,
      trackingId: affiliate.trackingId || 'unknown'
    }
  }

  const eventId = match[1]
  const affiliateUrl = config.buildUrl(eventId, affiliate)

  return {
    originalUrl,
    affiliateUrl,
    platform,
    trackingId: affiliate.trackingId || 'unknown'
  }
}

/**
 * Append tracking parameters to any URL
 */
export function appendTrackingParams(url: string, affiliate: PromoterAffiliate): string {
  try {
    const urlObj = new URL(url)

    // Add standard tracking parameters
    if (affiliate.trackingId) {
      urlObj.searchParams.set('utm_source', affiliate.trackingId)
      urlObj.searchParams.set('utm_medium', 'affiliate')
      urlObj.searchParams.set('utm_campaign', affiliate.platform)
    }

    if (affiliate.affiliateId) {
      urlObj.searchParams.set('aff_id', affiliate.affiliateId)
    }

    if (affiliate.publisherId) {
      urlObj.searchParams.set('pub_id', affiliate.publisherId)
    }

    return urlObj.toString()
  } catch {
    return url
  }
}

/**
 * Build a Ticketmaster Discovery API search URL
 */
export function buildTicketmasterSearchUrl(params: {
  apiKey: string
  keyword?: string
  city?: string
  stateCode?: string
  countryCode?: string
  classificationName?: string
  radius?: number
  unit?: 'miles' | 'km'
  startDateTime?: string
  endDateTime?: string
  size?: number
  page?: number
  sort?: string
}): string {
  const baseUrl = 'https://app.ticketmaster.com/discovery/v2/events.json'
  const searchParams = new URLSearchParams()

  searchParams.set('apikey', params.apiKey)

  if (params.keyword) searchParams.set('keyword', params.keyword)
  if (params.city) searchParams.set('city', params.city)
  if (params.stateCode) searchParams.set('stateCode', params.stateCode)
  if (params.countryCode) searchParams.set('countryCode', params.countryCode)
  if (params.classificationName) searchParams.set('classificationName', params.classificationName)
  if (params.radius) searchParams.set('radius', params.radius.toString())
  if (params.unit) searchParams.set('unit', params.unit)
  if (params.startDateTime) searchParams.set('startDateTime', params.startDateTime)
  if (params.endDateTime) searchParams.set('endDateTime', params.endDateTime)
  if (params.size) searchParams.set('size', params.size.toString())
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.sort) searchParams.set('sort', params.sort)

  return `${baseUrl}?${searchParams.toString()}`
}

/**
 * Build a SeatGeek API search URL
 */
export function buildSeatGeekSearchUrl(params: {
  clientId: string
  clientSecret?: string
  q?: string
  venue?: { city?: string; state?: string; country?: string }
  performers?: string[]
  taxonomies?: string[]
  lat?: number
  lon?: number
  range?: string
  datetime_local?: { gte?: string; lte?: string }
  per_page?: number
  page?: number
  sort?: string
}): string {
  const baseUrl = 'https://api.seatgeek.com/2/events'
  const searchParams = new URLSearchParams()

  searchParams.set('client_id', params.clientId)
  if (params.clientSecret) searchParams.set('client_secret', params.clientSecret)

  if (params.q) searchParams.set('q', params.q)
  if (params.venue?.city) searchParams.set('venue.city', params.venue.city)
  if (params.venue?.state) searchParams.set('venue.state', params.venue.state)
  if (params.venue?.country) searchParams.set('venue.country', params.venue.country)
  if (params.performers) params.performers.forEach(p => searchParams.append('performers.slug', p))
  if (params.taxonomies) params.taxonomies.forEach(t => searchParams.append('taxonomies.name', t))
  if (params.lat) searchParams.set('lat', params.lat.toString())
  if (params.lon) searchParams.set('lon', params.lon.toString())
  if (params.range) searchParams.set('range', params.range)
  if (params.datetime_local?.gte) searchParams.set('datetime_local.gte', params.datetime_local.gte)
  if (params.datetime_local?.lte) searchParams.set('datetime_local.lte', params.datetime_local.lte)
  if (params.per_page) searchParams.set('per_page', params.per_page.toString())
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.sort) searchParams.set('sort', params.sort)

  return `${baseUrl}?${searchParams.toString()}`
}

/**
 * Track a click on an affiliate link
 */
export async function trackAffiliateClick(
  affiliateId: string,
  eventId: string,
  metadata?: {
    userAgent?: string
    referrer?: string
    ip?: string
  }
): Promise<void> {
  // This would typically update Firestore with click tracking
  // For now, we'll just log it - implement actual tracking in production
  console.log('Affiliate click tracked:', {
    affiliateId,
    eventId,
    metadata,
    timestamp: new Date().toISOString()
  })
}

/**
 * Get supported platforms for a specific affiliate network
 */
export function getPlatformsForNetwork(network: AffiliateNetwork): AffiliatePlatform[] {
  const platformsByNetwork: Record<AffiliateNetwork, AffiliatePlatform[]> = {
    impact: ['ticketmaster', 'stubhub', 'fever', 'vivid_seats', 'seatgeek'],
    cj: ['stubhub', 'vivid_seats'],
    rakuten: [],
    direct: ['seatgeek', 'ticketnetwork', 'eventbrite', 'bandsintown', 'viagogo']
  }

  return platformsByNetwork[network] || []
}

/**
 * Validate affiliate credentials for a platform
 */
export async function validateAffiliateCredentials(
  platform: AffiliatePlatform,
  credentials: {
    apiKey?: string
    apiSecret?: string
    affiliateId?: string
    publisherId?: string
  }
): Promise<{ valid: boolean; message: string }> {
  // For now, just basic validation
  // In production, you would make test API calls to verify credentials

  if (platform === 'ticketmaster') {
    if (!credentials.apiKey) {
      return { valid: false, message: 'Ticketmaster API key is required' }
    }
    // Could make a test call to the Discovery API here
    return { valid: true, message: 'Credentials appear valid' }
  }

  if (platform === 'seatgeek') {
    if (!credentials.apiKey) {
      return { valid: false, message: 'SeatGeek client ID is required' }
    }
    return { valid: true, message: 'Credentials appear valid' }
  }

  // Default validation for platforms without API
  if (credentials.affiliateId || credentials.publisherId) {
    return { valid: true, message: 'Affiliate ID configured' }
  }

  return { valid: false, message: 'No credentials provided' }
}
