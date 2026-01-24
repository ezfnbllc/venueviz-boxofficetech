/**
 * Affiliate Event Import Service
 * Imports events from external ticketing platforms for display as affiliate events
 */

import { db } from '@/lib/firebase'
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { AffiliatePlatform, PromoterAffiliate, AffiliateEvent } from '@/lib/types/promoter'
import { generateAffiliateLink, buildTicketmasterSearchUrl, buildSeatGeekSearchUrl } from './affiliateLinkService'

// Ticketmaster Discovery API Response Types
interface TicketmasterEvent {
  id: string
  name: string
  url: string
  info?: string
  images?: Array<{ url: string; width: number; height: number }>
  dates?: {
    start?: { localDate?: string; localTime?: string; dateTime?: string }
    end?: { localDate?: string; localTime?: string; dateTime?: string }
  }
  priceRanges?: Array<{ type: string; currency: string; min: number; max: number }>
  _embedded?: {
    venues?: Array<{
      name: string
      city?: { name: string }
      state?: { stateCode: string; name: string }
      country?: { countryCode: string; name: string }
      address?: { line1: string }
      location?: { latitude: string; longitude: string }
    }>
  }
}

interface TicketmasterSearchResponse {
  _embedded?: { events?: TicketmasterEvent[] }
  page?: { size: number; totalElements: number; totalPages: number; number: number }
}

// SeatGeek API Response Types
interface SeatGeekEvent {
  id: number
  title: string
  url: string
  short_title?: string
  datetime_local: string
  datetime_utc: string
  venue: {
    name: string
    city: string
    state: string
    country: string
    address?: string
    location?: { lat: number; lon: number }
  }
  performers?: Array<{ name: string; image?: string }>
  stats?: { lowest_price?: number; highest_price?: number; average_price?: number }
}

interface SeatGeekSearchResponse {
  events: SeatGeekEvent[]
  meta: { total: number; per_page: number; page: number }
}

/**
 * Import events from Ticketmaster Discovery API
 */
export async function importTicketmasterEvents(
  affiliate: PromoterAffiliate,
  options?: {
    keyword?: string
    city?: string
    stateCode?: string
    classificationName?: string
    radius?: number
    startDate?: Date
    endDate?: Date
    maxResults?: number
  }
): Promise<AffiliateEvent[]> {
  if (!affiliate.apiKey) {
    throw new Error('Ticketmaster API key is required')
  }

  const startDateTime = options?.startDate?.toISOString().replace('Z', '') || new Date().toISOString().replace('Z', '')
  const endDateTime = options?.endDate?.toISOString().replace('Z', '') || undefined

  const searchUrl = buildTicketmasterSearchUrl({
    apiKey: affiliate.apiKey,
    keyword: options?.keyword || affiliate.importKeywords?.join(' '),
    city: options?.city,
    stateCode: options?.stateCode,
    classificationName: options?.classificationName || affiliate.importCategories?.join(','),
    radius: options?.radius || affiliate.importRadius || 50,
    unit: 'miles',
    startDateTime,
    endDateTime,
    size: options?.maxResults || 50,
    sort: 'date,asc'
  })

  try {
    const response = await fetch(searchUrl)
    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.status} ${response.statusText}`)
    }

    const data: TicketmasterSearchResponse = await response.json()
    const events = data._embedded?.events || []

    return events.map(event => transformTicketmasterEvent(event, affiliate))
  } catch (error) {
    console.error('Error importing Ticketmaster events:', error)
    throw error
  }
}

/**
 * Import events from SeatGeek API
 */
export async function importSeatGeekEvents(
  affiliate: PromoterAffiliate,
  options?: {
    query?: string
    city?: string
    state?: string
    lat?: number
    lon?: number
    range?: string
    startDate?: Date
    endDate?: Date
    maxResults?: number
  }
): Promise<AffiliateEvent[]> {
  if (!affiliate.apiKey) {
    throw new Error('SeatGeek client ID is required')
  }

  const searchUrl = buildSeatGeekSearchUrl({
    clientId: affiliate.apiKey,
    clientSecret: affiliate.apiSecret,
    q: options?.query || affiliate.importKeywords?.join(' '),
    venue: {
      city: options?.city,
      state: options?.state
    },
    lat: options?.lat,
    lon: options?.lon,
    range: options?.range || `${affiliate.importRadius || 50}mi`,
    datetime_local: {
      gte: options?.startDate?.toISOString().split('T')[0],
      lte: options?.endDate?.toISOString().split('T')[0]
    },
    per_page: options?.maxResults || 50,
    sort: 'datetime_local.asc'
  })

  try {
    const response = await fetch(searchUrl)
    if (!response.ok) {
      throw new Error(`SeatGeek API error: ${response.status} ${response.statusText}`)
    }

    const data: SeatGeekSearchResponse = await response.json()
    return data.events.map(event => transformSeatGeekEvent(event, affiliate))
  } catch (error) {
    console.error('Error importing SeatGeek events:', error)
    throw error
  }
}

/**
 * Transform Ticketmaster event to AffiliateEvent
 */
function transformTicketmasterEvent(event: TicketmasterEvent, affiliate: PromoterAffiliate): AffiliateEvent {
  const venue = event._embedded?.venues?.[0]
  const image = event.images?.find(img => img.width >= 500) || event.images?.[0]
  const priceRange = event.priceRanges?.[0]
  const affiliateLink = generateAffiliateLink(event.url, affiliate)

  return {
    id: '', // Will be set when saving to Firestore
    promoterId: affiliate.promoterId,
    affiliateId: affiliate.id,
    platform: 'ticketmaster',
    externalEventId: event.id,
    name: event.name,
    description: event.info,
    imageUrl: image?.url,
    startDate: event.dates?.start?.dateTime || event.dates?.start?.localDate || '',
    endDate: event.dates?.end?.dateTime || event.dates?.end?.localDate,
    venueName: venue?.name || 'TBA',
    venueCity: venue?.city?.name || '',
    venueState: venue?.state?.stateCode,
    venueCountry: venue?.country?.countryCode || 'US',
    minPrice: priceRange?.min,
    maxPrice: priceRange?.max,
    currency: priceRange?.currency || 'USD',
    affiliateUrl: affiliateLink?.affiliateUrl || event.url,
    clicks: 0,
    conversions: 0,
    revenue: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

/**
 * Transform SeatGeek event to AffiliateEvent
 */
function transformSeatGeekEvent(event: SeatGeekEvent, affiliate: PromoterAffiliate): AffiliateEvent {
  const performer = event.performers?.[0]
  const affiliateLink = generateAffiliateLink(event.url, affiliate)

  return {
    id: '', // Will be set when saving to Firestore
    promoterId: affiliate.promoterId,
    affiliateId: affiliate.id,
    platform: 'seatgeek',
    externalEventId: event.id.toString(),
    name: event.title,
    description: event.short_title,
    imageUrl: performer?.image,
    startDate: event.datetime_utc,
    venueName: event.venue.name,
    venueCity: event.venue.city,
    venueState: event.venue.state,
    venueCountry: event.venue.country,
    minPrice: event.stats?.lowest_price,
    maxPrice: event.stats?.highest_price,
    currency: 'USD',
    affiliateUrl: affiliateLink?.affiliateUrl || event.url,
    clicks: 0,
    conversions: 0,
    revenue: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

/**
 * Save imported events to Firestore
 */
export async function saveAffiliateEvents(events: AffiliateEvent[]): Promise<string[]> {
  const savedIds: string[] = []

  for (const event of events) {
    try {
      // Check if event already exists
      const existingQuery = query(
        collection(db, 'affiliateEvents'),
        where('externalEventId', '==', event.externalEventId),
        where('platform', '==', event.platform),
        where('promoterId', '==', event.promoterId)
      )
      const existing = await getDocs(existingQuery)

      if (existing.empty) {
        // Add new event
        const docRef = await addDoc(collection(db, 'affiliateEvents'), event)
        savedIds.push(docRef.id)
      } else {
        // Update existing event
        const docId = existing.docs[0].id
        await updateDoc(doc(db, 'affiliateEvents', docId), {
          ...event,
          id: docId,
          updatedAt: new Date().toISOString()
        })
        savedIds.push(docId)
      }
    } catch (error) {
      console.error(`Error saving affiliate event ${event.externalEventId}:`, error)
    }
  }

  return savedIds
}

/**
 * Get affiliate events for a promoter
 */
export async function getAffiliateEvents(
  promoterId: string,
  options?: {
    platform?: AffiliatePlatform
    affiliateId?: string
    activeOnly?: boolean
    startDate?: Date
    limit?: number
  }
): Promise<AffiliateEvent[]> {
  let q = query(
    collection(db, 'affiliateEvents'),
    where('promoterId', '==', promoterId)
  )

  // Note: Firestore doesn't support multiple inequality filters,
  // so we'll filter in memory for some conditions

  const snapshot = await getDocs(q)
  let events = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as AffiliateEvent[]

  // Apply additional filters
  if (options?.platform) {
    events = events.filter(e => e.platform === options.platform)
  }

  if (options?.affiliateId) {
    events = events.filter(e => e.affiliateId === options.affiliateId)
  }

  if (options?.activeOnly) {
    events = events.filter(e => e.isActive)
  }

  if (options?.startDate) {
    const startDateStr = options.startDate.toISOString()
    events = events.filter(e => e.startDate >= startDateStr)
  }

  // Sort by start date
  events.sort((a, b) => a.startDate.localeCompare(b.startDate))

  // Apply limit
  if (options?.limit) {
    events = events.slice(0, options.limit)
  }

  return events
}

/**
 * Delete old/expired affiliate events
 */
export async function cleanupExpiredAffiliateEvents(
  promoterId: string,
  daysOld: number = 7
): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)
  const cutoffStr = cutoffDate.toISOString()

  const q = query(
    collection(db, 'affiliateEvents'),
    where('promoterId', '==', promoterId)
  )

  const snapshot = await getDocs(q)
  let deletedCount = 0

  for (const docSnapshot of snapshot.docs) {
    const event = docSnapshot.data() as AffiliateEvent
    if (event.startDate < cutoffStr) {
      await deleteDoc(doc(db, 'affiliateEvents', docSnapshot.id))
      deletedCount++
    }
  }

  return deletedCount
}

/**
 * Sync events for all enabled affiliates of a promoter
 */
export async function syncPromoterAffiliateEvents(promoterId: string): Promise<{
  platform: AffiliatePlatform
  imported: number
  errors: string[]
}[]> {
  const results: { platform: AffiliatePlatform; imported: number; errors: string[] }[] = []

  // Get all enabled affiliates for the promoter
  const affiliatesQuery = query(
    collection(db, 'promoterAffiliates'),
    where('promoterId', '==', promoterId),
    where('enabled', '==', true),
    where('autoImportEvents', '==', true)
  )

  const affiliatesSnapshot = await getDocs(affiliatesQuery)
  const affiliates = affiliatesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as PromoterAffiliate[]

  for (const affiliate of affiliates) {
    const result = { platform: affiliate.platform, imported: 0, errors: [] as string[] }

    try {
      let events: AffiliateEvent[] = []

      switch (affiliate.platform) {
        case 'ticketmaster':
          events = await importTicketmasterEvents(affiliate)
          break
        case 'seatgeek':
          events = await importSeatGeekEvents(affiliate)
          break
        // Add more platforms as needed
        default:
          result.errors.push(`Import not supported for platform: ${affiliate.platform}`)
      }

      if (events.length > 0) {
        const savedIds = await saveAffiliateEvents(events)
        result.imported = savedIds.length
      }

      // Update last sync time
      await updateDoc(doc(db, 'promoterAffiliates', affiliate.id), {
        lastSyncAt: new Date().toISOString()
      })

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    results.push(result)
  }

  return results
}

/**
 * Import events from a platform (API route handler helper)
 */
export async function importEventsForAffiliate(
  affiliateId: string,
  options?: {
    keyword?: string
    city?: string
    state?: string
    startDate?: Date
    endDate?: Date
    maxResults?: number
  }
): Promise<{ imported: number; events: AffiliateEvent[] }> {
  // Get affiliate config
  const affiliateDoc = await getDocs(
    query(collection(db, 'promoterAffiliates'), where('__name__', '==', affiliateId))
  )

  if (affiliateDoc.empty) {
    throw new Error('Affiliate not found')
  }

  const affiliate = {
    id: affiliateDoc.docs[0].id,
    ...affiliateDoc.docs[0].data()
  } as PromoterAffiliate

  let events: AffiliateEvent[] = []

  switch (affiliate.platform) {
    case 'ticketmaster':
      events = await importTicketmasterEvents(affiliate, {
        keyword: options?.keyword,
        city: options?.city,
        stateCode: options?.state,
        startDate: options?.startDate,
        endDate: options?.endDate,
        maxResults: options?.maxResults
      })
      break
    case 'seatgeek':
      events = await importSeatGeekEvents(affiliate, {
        query: options?.keyword,
        city: options?.city,
        state: options?.state,
        startDate: options?.startDate,
        endDate: options?.endDate,
        maxResults: options?.maxResults
      })
      break
    default:
      throw new Error(`Import not supported for platform: ${affiliate.platform}`)
  }

  const savedIds = await saveAffiliateEvents(events)

  // Return events with their IDs
  return {
    imported: savedIds.length,
    events: events.map((event, index) => ({
      ...event,
      id: savedIds[index] || ''
    }))
  }
}
