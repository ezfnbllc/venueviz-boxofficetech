import { NextRequest, NextResponse } from 'next/server'

// Ticketmaster Discovery API (best option when API key is available)
const TM_API_KEY = process.env.TICKETMASTER_API_KEY || ''

async function fetchFromTicketmasterAPI(eventId: string): Promise<any> {
  if (!TM_API_KEY) return null

  try {
    const url = `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json?apikey=${TM_API_KEY}`
    const response = await fetch(url)

    if (!response.ok) {
      console.log('Ticketmaster Discovery API error:', response.status)
      return null
    }

    const data = await response.json()
    return parseTicketmasterEventData(data)
  } catch (e) {
    console.log('Ticketmaster Discovery API failed:', e)
    return null
  }
}

// Search Ticketmaster Discovery API by keyword (fallback for legacy event IDs)
async function searchTicketmasterAPI(keyword: string, eventDate?: string): Promise<any> {
  if (!TM_API_KEY || !keyword) return null

  try {
    // Clean up keyword - extract main event name
    const cleanKeyword = keyword
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    let searchUrl = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TM_API_KEY}&keyword=${encodeURIComponent(cleanKeyword)}&size=5&sort=relevance,desc`

    // Add date filter if available
    if (eventDate) {
      searchUrl += `&startDateTime=${eventDate}T00:00:00Z&endDateTime=${eventDate}T23:59:59Z`
    }

    console.log('Searching Ticketmaster API with keyword:', cleanKeyword)
    const response = await fetch(searchUrl)

    if (!response.ok) {
      console.log('Ticketmaster Discovery API search error:', response.status)
      return null
    }

    const data = await response.json()
    const events = data._embedded?.events

    if (!events || events.length === 0) {
      console.log('No events found in Ticketmaster search')
      return null
    }

    // Return the first (most relevant) result
    console.log('Found', events.length, 'events, using:', events[0].name)
    return parseTicketmasterEventData(events[0])
  } catch (e) {
    console.log('Ticketmaster Discovery API search failed:', e)
    return null
  }
}

// Parse Ticketmaster event data into our format
function parseTicketmasterEventData(data: any): any {
  const venue = data._embedded?.venues?.[0]
  const images = data.images
    ?.filter((img: any) => img.width >= 300)
    ?.sort((a: any, b: any) => (b.width || 0) - (a.width || 0))
    ?.slice(0, 5)
    ?.map((img: any) => img.url) || []

  return {
    eventName: data.name,
    venueName: venue?.name,
    venueCity: venue?.city?.name,
    venueState: venue?.state?.stateCode || venue?.state?.name,
    venueAddress: venue?.address?.line1,
    venueZip: venue?.postalCode,
    eventDate: data.dates?.start?.localDate,
    eventTime: data.dates?.start?.localTime?.slice(0, 5),
    timezone: data.dates?.timezone,
    imageUrls: images,
    priceRange: data.priceRanges?.[0] ? {
      min: data.priceRanges[0].min,
      max: data.priceRanges[0].max
    } : null,
    performers: data._embedded?.attractions?.map((a: any) => a.name) || [],
    source: 'ticketmaster_discovery_api'
  }
}

// Try to get event data from Ticketmaster's public embed/widget API
async function fetchTicketmasterEventData(eventId: string): Promise<any> {
  try {
    // Ticketmaster embed endpoint (publicly accessible)
    const embedUrl = `https://www.ticketmaster.com/json/event/${eventId}`
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.ticketmaster.com/'
      }
    })

    if (response.ok) {
      const data = await response.json()
      if (data && data.event) {
        return {
          eventName: data.event.name,
          venueName: data.event.venue?.name,
          venueCity: data.event.venue?.city,
          venueState: data.event.venue?.state,
          venueAddress: data.event.venue?.address,
          eventDate: data.event.dates?.start?.localDate,
          eventTime: data.event.dates?.start?.localTime?.slice(0, 5),
          imageUrls: data.event.images?.map((img: any) => img.url).filter(Boolean) || [],
          source: 'ticketmaster_embed_api'
        }
      }
    }
  } catch (e) {
    console.log('Ticketmaster JSON API failed:', e)
  }
  return null
}

// Fetch and parse HTML from URL to extract venue and other details
async function fetchAndParseHTML(url: string): Promise<{
  venueName?: string
  venueCity?: string
  venueState?: string
  venueAddress?: string
  eventName?: string
  eventDate?: string
  eventTime?: string
  imageUrls?: string[]
}> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache'
      }
    })

    if (!response.ok) {
      console.log('Failed to fetch URL:', response.status)
      return {}
    }

    const html = await response.text()
    const result: any = {}

    // Extract venue name from various patterns
    // Ticketmaster: Look for venue in JSON-LD or meta tags
    const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        try {
          const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '')
          const data = JSON.parse(jsonContent)

          // Check for Event schema
          if (data['@type'] === 'Event' || data['@type'] === 'MusicEvent' || data['@type'] === 'ComedyEvent') {
            if (data.location) {
              result.venueName = data.location.name
              if (data.location.address) {
                if (typeof data.location.address === 'string') {
                  result.venueAddress = data.location.address
                } else {
                  result.venueAddress = data.location.address.streetAddress
                  result.venueCity = data.location.address.addressLocality
                  result.venueState = data.location.address.addressRegion
                }
              }
            }
            if (data.name) result.eventName = data.name
            if (data.startDate) {
              const date = new Date(data.startDate)
              result.eventDate = date.toISOString().split('T')[0]
              result.eventTime = date.toTimeString().slice(0, 5)
            }
            if (data.image) {
              result.imageUrls = Array.isArray(data.image) ? data.image : [data.image]
            }
          }
        } catch (e) {
          // Continue to next JSON-LD block
        }
      }
    }

    // Fallback: Look for venue in meta tags
    if (!result.venueName) {
      const venueMetaMatch = html.match(/property="event:venue"[^>]*content="([^"]+)"/i) ||
                            html.match(/name="venue"[^>]*content="([^"]+)"/i)
      if (venueMetaMatch) {
        result.venueName = venueMetaMatch[1]
      }
    }

    // Look for venue in common HTML patterns
    if (!result.venueName) {
      // Ticketmaster specific selectors
      const tmVenueMatch = html.match(/class="[^"]*venue-name[^"]*"[^>]*>([^<]+)</i) ||
                          html.match(/data-testid="venue-name"[^>]*>([^<]+)</i) ||
                          html.match(/<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)</i)
      if (tmVenueMatch) {
        result.venueName = tmVenueMatch[1].trim()
      }
    }

    // Extract images
    if (!result.imageUrls || result.imageUrls.length === 0) {
      const imageMatches = html.matchAll(/og:image"[^>]*content="([^"]+)"/gi)
      const images: string[] = []
      for (const match of imageMatches) {
        if (match[1] && !images.includes(match[1])) {
          images.push(match[1])
        }
      }
      if (images.length > 0) {
        result.imageUrls = images
      }
    }

    return result
  } catch (error) {
    console.error('Error fetching/parsing HTML:', error)
    return {}
  }
}

// US State name to abbreviation mapping
const stateAbbreviations: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
}

// Detect event type from name
function detectEventType(name: string): { type: string; category: string } {
  const lowerName = name.toLowerCase()

  if (lowerName.includes('comedy') || lowerName.includes('standup') || lowerName.includes('stand-up')) {
    return { type: 'comedy', category: 'comedy' }
  }
  if (lowerName.includes('world cup') || lowerName.includes('fifa') || lowerName.includes('soccer') ||
      lowerName.includes('football') || lowerName.includes('nfl') || lowerName.includes('nba') ||
      lowerName.includes('mlb') || lowerName.includes('hockey') || lowerName.includes('nhl')) {
    return { type: 'sports', category: 'sports' }
  }
  if (lowerName.includes('musical') || lowerName.includes('broadway') || lowerName.includes('theater') ||
      lowerName.includes('theatre') || lowerName.includes('play') || lowerName.includes('ballet')) {
    return { type: 'theater', category: 'theater' }
  }
  if (lowerName.includes('movie') || lowerName.includes('film') || lowerName.includes('screening')) {
    return { type: 'movie', category: 'movie' }
  }

  return { type: 'concert', category: 'concert' }
}

// Format title properly
function formatTitle(words: string[]): string {
  const smallWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with']
  return words
    .map((word, index) => {
      if (index === 0 || !smallWords.includes(word.toLowerCase())) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      }
      return word.toLowerCase()
    })
    .join(' ')
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 })
    }

    const urlObj = new URL(url)
    const domain = urlObj.hostname.toLowerCase()

    let eventData: any = {
      title: '',
      description: '',
      date: '',
      time: '19:00',
      venueName: '',
      venueAddress: '',
      venueCity: '',
      venueState: '',
      venueCapacity: 500,
      pricing: [],
      performers: [],
      type: 'concert',
      capacity: 500,
      imageUrls: [],
      layoutConfig: null
    }

    // TICKETMASTER PARSER
    // Example: https://www.ticketmaster.com/vir-das-hey-stranger-dallas-texas-04-09-2026/event/0C00635C995E4CE1
    if (domain.includes('ticketmaster.com')) {
      const pathParts = url.split('/')
      const eventSlug = pathParts.find((p: string) => p.includes('-') && !p.includes('event')) || ''

      // Extract event ID from URL - supports multiple formats:
      // Long: /event/0C006266EC5C396A
      // Short: /event/Z7r9jZ1A7_kF9
      const eventIdMatch = url.match(/\/event\/([A-Za-z0-9_-]+)/i)
      const eventId = eventIdMatch ? eventIdMatch[1] : ''

      console.log('Ticketmaster URL detected, event ID:', eventId, 'API key configured:', !!TM_API_KEY)

      // Try multiple data sources in order of reliability
      let parsedData: any = {}

      // Extract event name and date from slug for search fallback
      let slugParts = eventSlug.split('-')
      let extractedDate = ''
      const lastThree = slugParts.slice(-3)
      if (lastThree.length === 3) {
        const [mm, dd, yyyy] = lastThree
        if (/^\d{2}$/.test(mm) && /^\d{2}$/.test(dd) && /^\d{4}$/.test(yyyy)) {
          extractedDate = `${yyyy}-${mm}-${dd}`
        }
      }

      // Extract search keyword from slug (event name without city/state/date)
      let searchKeyword = ''
      if (eventSlug) {
        // Remove date parts
        let keywordParts = [...slugParts]
        if (extractedDate) {
          keywordParts = keywordParts.slice(0, -3)
        }
        // Remove city and state (usually last 2 parts before date)
        if (keywordParts.length > 2) {
          const possibleState = keywordParts[keywordParts.length - 1].toLowerCase()
          if (stateAbbreviations[possibleState] || possibleState.length === 2) {
            keywordParts.pop() // Remove state
            keywordParts.pop() // Remove city
          }
        }
        searchKeyword = keywordParts.join(' ')
      }

      // 1. Try Ticketmaster Discovery API first (most reliable, requires API key)
      if (eventId && TM_API_KEY) {
        const discoveryData = await fetchFromTicketmasterAPI(eventId)
        if (discoveryData && discoveryData.venueName) {
          parsedData = discoveryData
          console.log('Got data from Ticketmaster Discovery API:', discoveryData.venueName)
        }
      }

      // 1b. If direct ID lookup failed, try searching by event name
      if (!parsedData.venueName && searchKeyword && TM_API_KEY) {
        console.log('Direct ID lookup failed, trying search with:', searchKeyword)
        const searchData = await searchTicketmasterAPI(searchKeyword, extractedDate)
        if (searchData && searchData.venueName) {
          parsedData = searchData
          console.log('Got data from Ticketmaster Discovery API search:', searchData.venueName)
        }
      }

      // 2. Try Ticketmaster embed/widget API (public, no key required)
      if (!parsedData.venueName && eventId) {
        const tmApiData = await fetchTicketmasterEventData(eventId)
        if (tmApiData && tmApiData.venueName) {
          parsedData = { ...parsedData, ...tmApiData }
          console.log('Got data from Ticketmaster embed API:', tmApiData.venueName)
        }
      }

      // 3. Fall back to HTML parsing
      if (!parsedData.venueName) {
        const htmlData = await fetchAndParseHTML(url)
        if (htmlData.venueName) {
          parsedData = { ...parsedData, ...htmlData }
          console.log('Got data from HTML parsing:', htmlData.venueName)
        }
      }

      // Use extracted date or parsed date
      let eventDate = parsedData.eventDate || extractedDate

      // Remove date from slugParts for name parsing
      if (extractedDate) {
        slugParts = slugParts.slice(0, -3)
      }

      // Extract state (last part after removing date)
      let state = parsedData.venueState || 'TX'
      let city = parsedData.venueCity || 'Dallas'

      if (!parsedData.venueCity && slugParts.length >= 2) {
        const lastPart = slugParts[slugParts.length - 1].toLowerCase()

        // Check for full state name
        if (stateAbbreviations[lastPart]) {
          state = stateAbbreviations[lastPart]
          slugParts.pop()
        } else if (lastPart.length === 2) {
          state = lastPart.toUpperCase()
          slugParts.pop()
        }

        // City is the part before state
        if (slugParts.length >= 1) {
          city = slugParts.pop() || 'Dallas'
          city = city.charAt(0).toUpperCase() + city.slice(1)
        }
      }

      // Use parsed event name or construct from remaining slug parts
      const eventName = parsedData.eventName || formatTitle(slugParts)
      const { type, category } = detectEventType(eventName)

      // Generate description based on event type
      let description = ''
      if (type === 'comedy') {
        description = `Get ready to laugh! ${eventName} brings their hilarious stand-up comedy show to ${city}. Experience a night of non-stop laughter and unforgettable entertainment.`
      } else if (type === 'sports') {
        description = `Don't miss this exciting ${eventName} event in ${city}! Experience the thrill of live sports action with world-class athletes and incredible atmosphere.`
      } else {
        description = `Experience an incredible performance! ${eventName} brings an unforgettable night of entertainment to ${city}. Join us for world-class production and spectacular performances.`
      }

      // Use venue from API/HTML parsing - DO NOT generate fallback, show empty if not found
      // This lets the user know the venue wasn't scraped and they should enter it manually
      const venueName = parsedData.venueName || ''
      const venueAddress = parsedData.venueAddress || ''

      // If we still don't have venue, try lookup API
      let venueFromLookup: any = null
      if (!venueName && eventName) {
        // Don't auto-generate venue - leave empty for user to fill in or use lookup
        console.log('No venue found from scraping, user should use venue lookup')
      }

      eventData = {
        title: eventName,
        description,
        date: eventDate,
        time: parsedData.eventTime || (type === 'comedy' ? '20:00' : '19:30'),
        venueName,
        venueAddress,
        venueCity: city,
        venueState: state,
        venueCapacity: type === 'sports' ? 50000 : type === 'comedy' ? 500 : 20000,
        pricing: type === 'comedy' ? [
          { level: 'VIP', price: 125, serviceFee: 12.5, tax: 8, sections: ['VIP'] },
          { level: 'Premium', price: 75, serviceFee: 7.5, tax: 8, sections: ['Premium'] },
          { level: 'General', price: 45, serviceFee: 4.5, tax: 8, sections: ['General'] }
        ] : [
          { level: 'VIP', price: 250, serviceFee: 25, tax: 8, sections: ['VIP'] },
          { level: 'Orchestra', price: 150, serviceFee: 15, tax: 8, sections: ['Orchestra'] },
          { level: 'Mezzanine', price: 100, serviceFee: 10, tax: 8, sections: ['Mezzanine'] },
          { level: 'Balcony', price: 75, serviceFee: 7.5, tax: 8, sections: ['Balcony'] }
        ],
        performers: [eventName],
        type: category,
        capacity: type === 'sports' ? 50000 : type === 'comedy' ? 500 : 20000,
        imageUrls: parsedData.imageUrls || []
      }
    }

    // STUBHUB PARSER
    // Example: https://www.stubhub.com/world-cup-arlington-tickets-6-14-2026/event/153021218/?...
    else if (domain.includes('stubhub.com')) {
      // First, try to fetch and parse actual HTML for accurate venue info
      const parsedData = await fetchAndParseHTML(url)

      const pathParts = url.split('/')
      const eventSlug = pathParts.find((p: string) => p.includes('-tickets-')) || ''

      // Split by '-tickets-' to separate event/city from date
      const [eventCityPart, datePart] = eventSlug.split('-tickets-')

      // Parse date (format: M-DD-YYYY or MM-DD-YYYY)
      let eventDate = parsedData.eventDate || ''
      if (!eventDate && datePart) {
        const dateMatch = datePart.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/)
        if (dateMatch) {
          const [, month, day, year] = dateMatch
          eventDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        }
      }

      // Parse event name and city from the first part
      const slugParts = eventCityPart ? eventCityPart.split('-') : []

      // Last part before '-tickets-' is usually the city
      let city = parsedData.venueCity || 'Dallas'
      if (!parsedData.venueCity && slugParts.length >= 2) {
        city = slugParts.pop() || 'Dallas'
        city = city.charAt(0).toUpperCase() + city.slice(1)
      }

      const eventName = parsedData.eventName || formatTitle(slugParts)
      const { type, category } = detectEventType(eventName)

      // Generate appropriate description
      let description = ''
      if (type === 'sports') {
        description = `Don't miss the ${eventName} in ${city}! This is your chance to witness history in the making. Get your tickets now for an unforgettable sports experience.`
      } else {
        description = `Experience ${eventName} live in ${city}! Secure your tickets for this highly anticipated event and be part of something special.`
      }

      const venueName = parsedData.venueName || `${city} ${type === 'sports' ? 'Stadium' : 'Arena'}`
      const venueAddress = parsedData.venueAddress || ''
      const state = parsedData.venueState || 'TX'

      eventData = {
        title: eventName,
        description,
        date: eventDate,
        time: parsedData.eventTime || (type === 'sports' ? '18:00' : '20:00'),
        venueName,
        venueAddress,
        venueCity: city,
        venueState: state,
        venueCapacity: type === 'sports' ? 80000 : 20000,
        pricing: [
          { level: 'Field/Floor', price: 500, serviceFee: 50, tax: 8, sections: ['Field'] },
          { level: 'Lower Bowl', price: 300, serviceFee: 30, tax: 8, sections: ['Lower'] },
          { level: 'Club Level', price: 200, serviceFee: 20, tax: 8, sections: ['Club'] },
          { level: 'Upper Deck', price: 100, serviceFee: 10, tax: 8, sections: ['Upper'] }
        ],
        performers: [eventName],
        type: category,
        capacity: type === 'sports' ? 80000 : 20000,
        imageUrls: parsedData.imageUrls || []
      }
    }

    // SULEKHA PARSER
    else if (domain.includes('sulekha.com')) {
      const pathParts = url.split('/')
      const fullSlug = pathParts[pathParts.length - 1] || ''
      const [eventPart, locationPart] = fullSlug.split('_event-in_')

      // Extract year from event name (e.g., "revolution-2026-1techno" -> 2026)
      const yearMatch = eventPart.match(/20\d{2}/)
      const eventYear = yearMatch ? yearMatch[0] : new Date().getFullYear().toString()

      // Determine if it's a New Year event
      const isNewYear = eventPart.toLowerCase().includes('new-year') ||
                        eventPart.toLowerCase().includes('newyear') ||
                        eventPart.toLowerCase().includes('nye')

      // Set appropriate date based on event type
      let eventDate = `${eventYear}-12-31` // Default to NYE for new year events
      if (!isNewYear) {
        eventDate = `${eventYear}-01-15`
      }

      const eventName = eventPart
        .replace(/-/g, ' ')
        .replace(/\d+techno/gi, 'Techno')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim()

      let city = 'Dallas'
      let state = 'TX'
      if (locationPart) {
        const locParts = locationPart.split('_')[0].split('-')
        if (locParts.length >= 2) {
          state = locParts.pop()?.toUpperCase() || 'TX'
          city = locParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
        }
      }

      const eventType = eventName.toLowerCase().includes('bollywood') ? 'Bollywood' :
                       eventName.toLowerCase().includes('comedy') ? 'comedy' :
                       eventName.toLowerCase().includes('classical') ? 'classical music' : 'cultural'

      const description = isNewYear
        ? `Ring in ${eventYear} with an unforgettable ${eventType} celebration! Join us for a spectacular New Year's Eve party featuring live performances, amazing music, and festive entertainment. Dance the night away and welcome the new year in style!`
        : `Experience an incredible ${eventType} event! Join us for a spectacular evening of live performances, amazing music, and unforgettable entertainment. This event celebrates the best of ${eventType} culture.`

      eventData = {
        title: eventName || 'Cultural Event',
        description,
        date: eventDate,
        time: isNewYear ? '21:00' : '18:30',
        venueName: city + ' Convention Center',
        venueAddress: '456 Convention Plaza',
        venueCity: city,
        venueState: state,
        venueCapacity: 5000,
        pricing: [
          { level: 'VIP', price: 150, serviceFee: 15, tax: 8, sections: [] },
          { level: 'Premium', price: 100, serviceFee: 10, tax: 8, sections: [] },
          { level: 'General', price: 75, serviceFee: 7.5, tax: 8, sections: [] }
        ],
        performers: [eventName.split(' ').slice(0, 3).join(' ')],
        type: eventType === 'comedy' ? 'comedy' : 'concert',
        capacity: 5000
      }
    }

    // FANDANGO PARSER
    // Example: https://www.fandango.com/five-nights-at-freddys-2-2025-240146/movie-overview
    else if (domain.includes('fandango.com')) {
      const pathParts = url.split('/')
      // Find the movie slug (contains year pattern like -2025-)
      let movieSlug = pathParts.find((part: string) => /\-20\d{2}\-/.test(part)) || ''

      // Extract year from slug
      const yearMatch = movieSlug.match(/-(\d{4})-/)
      const movieYear = yearMatch ? yearMatch[1] : new Date().getFullYear().toString()

      // Extract movie name (everything before the year)
      const movieName = movieSlug
        .replace(/-\d{4}-\d+$/, '') // Remove -YYYY-ID at end
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim()

      // Check if it's a sequel (ends with number)
      const sequelMatch = movieName.match(/^(.+?)\s+(\d+)$/)
      const displayName = sequelMatch
        ? `${sequelMatch[1]} ${sequelMatch[2]}`
        : movieName

      eventData = {
        title: displayName,
        description: `Coming ${movieYear}! "${displayName}" hits theaters with stunning visuals and an unforgettable story. Experience this highly anticipated film on the big screen with premium Dolby Atmos sound and crystal-clear picture quality.`,
        date: `${movieYear}-01-01`, // Placeholder release date
        time: '19:30',
        venueName: 'AMC Theater',
        venueAddress: '789 Cinema Boulevard',
        venueCity: 'Dallas',
        venueState: 'TX',
        venueCapacity: 300,
        pricing: [
          { level: 'IMAX/Dolby', price: 25, serviceFee: 2.5, tax: 8, sections: [] },
          { level: 'Premium', price: 18, serviceFee: 1.8, tax: 8, sections: [] },
          { level: 'Standard', price: 12, serviceFee: 1.2, tax: 8, sections: [] }
        ],
        performers: [],
        type: 'movie',
        capacity: 300
      }
    }

    // EVENTBRITE PARSER
    else if (domain.includes('eventbrite.com')) {
      eventData = {
        title: 'Imported Event from Eventbrite',
        description: 'Event imported from Eventbrite. Please update the details as needed.',
        date: '2025-12-01',
        time: '19:00',
        venueName: 'Event Venue',
        venueAddress: '123 Event Street',
        venueCity: 'Dallas',
        venueState: 'TX',
        venueCapacity: 1000,
        pricing: [
          { level: 'General Admission', price: 50, serviceFee: 5, tax: 8, sections: [] },
          { level: 'VIP', price: 150, serviceFee: 15, tax: 8, sections: [] }
        ],
        type: 'event',
        capacity: 1000
      }
    }

    // DEFAULT PARSER
    else {
      eventData = {
        title: 'Imported Event',
        description: 'Event imported from ' + domain + '. Please update the details as needed.',
        date: '2025-12-01',
        time: '19:00',
        venueName: 'Main Venue',
        venueAddress: '123 Main Street',
        venueCity: 'Dallas',
        venueState: 'TX',
        venueCapacity: 1000,
        pricing: [
          { level: 'General', price: 50, serviceFee: 5, tax: 8, sections: [] }
        ],
        type: 'event',
        capacity: 1000
      }
    }

    return NextResponse.json(eventData)

  } catch (error: any) {
    console.error('Scraping error:', error.message)
    return NextResponse.json({
      error: 'Failed to extract: ' + error.message,
      title: '',
      description: '',
      date: '',
      time: '19:00',
      venueName: '',
      pricing: [],
      performers: [],
      type: 'concert'
    }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Enhanced event scraping API',
    method: 'POST',
    supported: ['ticketmaster.com', 'stubhub.com', 'sulekha.com', 'fandango.com', 'eventbrite.com']
  })
}
