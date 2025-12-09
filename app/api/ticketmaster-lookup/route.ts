import { NextRequest, NextResponse } from 'next/server'

// Ticketmaster Discovery API integration
// Sign up for free API key at: https://developer.ticketmaster.com/

const TM_API_KEY = process.env.TICKETMASTER_API_KEY || ''
const TM_API_BASE = 'https://app.ticketmaster.com/discovery/v2'

interface TicketmasterEvent {
  id: string
  name: string
  description?: string
  url?: string
  dates?: {
    start?: {
      localDate?: string
      localTime?: string
      dateTime?: string
    }
    timezone?: string
  }
  priceRanges?: Array<{
    type: string
    currency: string
    min: number
    max: number
  }>
  images?: Array<{
    url: string
    width: number
    height: number
    ratio?: string
  }>
  _embedded?: {
    venues?: Array<{
      id: string
      name: string
      type?: string
      url?: string
      locale?: string
      postalCode?: string
      timezone?: string
      city?: { name: string }
      state?: { name: string; stateCode: string }
      country?: { name: string; countryCode: string }
      address?: { line1: string; line2?: string }
      location?: { longitude: string; latitude: string }
      generalInfo?: { generalRule?: string; childRule?: string }
      parkingDetail?: string
      accessibleSeatingDetail?: string
      boxOfficeInfo?: {
        phoneNumberDetail?: string
        openHoursDetail?: string
        acceptedPaymentDetail?: string
      }
    }>
    attractions?: Array<{
      id: string
      name: string
      type?: string
      url?: string
      images?: Array<{ url: string }>
      classifications?: Array<{
        primary?: boolean
        segment?: { name: string }
        genre?: { name: string }
        subGenre?: { name: string }
      }>
    }>
  }
  classifications?: Array<{
    primary?: boolean
    segment?: { id: string; name: string }
    genre?: { id: string; name: string }
    subGenre?: { id: string; name: string }
  }>
}

// Extract event ID from Ticketmaster URL
function extractEventId(url: string): string | null {
  // Pattern: /event/0C00635C995E4CE1
  const match = url.match(/\/event\/([A-Z0-9]+)/i)
  return match ? match[1] : null
}

// Fetch event details from Ticketmaster Discovery API
async function fetchEventFromAPI(eventId: string): Promise<TicketmasterEvent | null> {
  if (!TM_API_KEY) {
    console.log('No Ticketmaster API key configured')
    return null
  }

  try {
    const url = `${TM_API_BASE}/events/${eventId}.json?apikey=${TM_API_KEY}`
    const response = await fetch(url)

    if (!response.ok) {
      console.log('Ticketmaster API error:', response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Ticketmaster API fetch error:', error)
    return null
  }
}

// Search for event by keyword
async function searchEvents(keyword: string, city?: string): Promise<TicketmasterEvent[]> {
  if (!TM_API_KEY) return []

  try {
    let url = `${TM_API_BASE}/events.json?apikey=${TM_API_KEY}&keyword=${encodeURIComponent(keyword)}&size=5`
    if (city) {
      url += `&city=${encodeURIComponent(city)}`
    }

    const response = await fetch(url)
    if (!response.ok) return []

    const data = await response.json()
    return data._embedded?.events || []
  } catch (error) {
    console.error('Ticketmaster search error:', error)
    return []
  }
}

// Get venue details by ID
async function fetchVenueFromAPI(venueId: string): Promise<any> {
  if (!TM_API_KEY) return null

  try {
    const url = `${TM_API_BASE}/venues/${venueId}.json?apikey=${TM_API_KEY}`
    const response = await fetch(url)

    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error('Venue fetch error:', error)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url, eventId, searchKeyword, city } = await req.json()

    // If URL provided, extract event ID
    let tmEventId = eventId
    if (url && !tmEventId) {
      tmEventId = extractEventId(url)
    }

    // If no API key, return instructions
    if (!TM_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Ticketmaster API key not configured',
        instructions: {
          step1: 'Sign up at https://developer.ticketmaster.com/',
          step2: 'Create an app to get your API key',
          step3: 'Add TICKETMASTER_API_KEY to your .env.local file'
        }
      }, { status: 400 })
    }

    let eventData: TicketmasterEvent | null = null

    // Try to fetch by event ID first
    if (tmEventId) {
      eventData = await fetchEventFromAPI(tmEventId)
    }

    // If no event found and we have a search keyword, try searching
    if (!eventData && searchKeyword) {
      const events = await searchEvents(searchKeyword, city)
      if (events.length > 0) {
        eventData = events[0]
      }
    }

    if (!eventData) {
      return NextResponse.json({
        success: false,
        error: 'Event not found',
        eventId: tmEventId
      }, { status: 404 })
    }

    // Extract venue data
    const venue = eventData._embedded?.venues?.[0]
    const attraction = eventData._embedded?.attractions?.[0]

    // Get best images (prefer 16:9 ratio, larger sizes)
    const images = eventData.images
      ?.filter(img => img.width >= 300)
      ?.sort((a, b) => (b.width || 0) - (a.width || 0))
      ?.slice(0, 5)
      ?.map(img => img.url) || []

    // Determine event category
    const classification = eventData.classifications?.find(c => c.primary)
    const category = classification?.segment?.name?.toLowerCase() || 'event'
    const genre = classification?.genre?.name || ''

    // Build response
    const result = {
      success: true,
      event: {
        id: eventData.id,
        name: eventData.name,
        description: eventData.description || '',
        url: eventData.url,
        date: eventData.dates?.start?.localDate || '',
        time: eventData.dates?.start?.localTime?.slice(0, 5) || '',
        timezone: eventData.dates?.timezone || 'America/Chicago',
        category: category === 'music' ? 'concert' : category === 'arts & theatre' ? 'theater' : category,
        genre,
        priceRange: eventData.priceRanges?.[0] ? {
          min: eventData.priceRanges[0].min,
          max: eventData.priceRanges[0].max,
          currency: eventData.priceRanges[0].currency
        } : null,
        images
      },
      venue: venue ? {
        id: venue.id,
        name: venue.name,
        address: venue.address?.line1 || '',
        city: venue.city?.name || '',
        state: venue.state?.stateCode || venue.state?.name || '',
        postalCode: venue.postalCode || '',
        country: venue.country?.countryCode || 'US',
        timezone: venue.timezone,
        location: venue.location ? {
          lat: parseFloat(venue.location.latitude),
          lng: parseFloat(venue.location.longitude)
        } : null,
        parking: venue.parkingDetail || '',
        accessibility: venue.accessibleSeatingDetail || '',
        boxOffice: venue.boxOfficeInfo ? {
          phone: venue.boxOfficeInfo.phoneNumberDetail || '',
          hours: venue.boxOfficeInfo.openHoursDetail || '',
          payment: venue.boxOfficeInfo.acceptedPaymentDetail || ''
        } : null,
        generalInfo: venue.generalInfo?.generalRule || ''
      } : null,
      performers: eventData._embedded?.attractions?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        images: a.images?.slice(0, 3).map(img => img.url) || []
      })) || []
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Ticketmaster lookup error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to lookup event'
    }, { status: 500 })
  }
}

export async function GET() {
  const hasApiKey = !!TM_API_KEY

  return NextResponse.json({
    message: 'Ticketmaster Discovery API Integration',
    configured: hasApiKey,
    setup: hasApiKey ? 'API key configured' : {
      step1: 'Sign up at https://developer.ticketmaster.com/',
      step2: 'Create an app to get your API key (free tier available)',
      step3: 'Add TICKETMASTER_API_KEY=your_key to .env.local'
    },
    endpoints: {
      lookupByUrl: 'POST with { url: "ticketmaster.com/event/..." }',
      lookupById: 'POST with { eventId: "0C00635C995E4CE1" }',
      search: 'POST with { searchKeyword: "event name", city: "Dallas" }'
    },
    features: [
      'Get accurate event name, date, time',
      'Get complete venue details including address',
      'Get performer/artist information',
      'Get official event images',
      'Get price range information'
    ]
  })
}
