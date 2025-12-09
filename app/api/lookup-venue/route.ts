import { NextRequest, NextResponse } from 'next/server'

// Known venue database for common venues
const knownVenues: Record<string, any> = {
  'majestic theatre dallas': {
    name: 'Majestic Theatre',
    address: '1925 Elm Street',
    city: 'Dallas',
    state: 'TX',
    zip: '75201',
    capacity: 1700,
    type: 'theater',
    description: 'The Majestic Theatre is a historic theater in downtown Dallas, Texas. Built in 1921, it is the last remaining palace movie theater in Dallas.',
    features: { hasParking: true, isAccessible: true, hasVIP: true, hasFood: false, hasBars: true }
  },
  'american airlines center': {
    name: 'American Airlines Center',
    address: '2500 Victory Avenue',
    city: 'Dallas',
    state: 'TX',
    zip: '75219',
    capacity: 20000,
    type: 'arena',
    description: 'American Airlines Center is a multi-purpose arena, home to the Dallas Mavericks and Dallas Stars.',
    features: { hasParking: true, isAccessible: true, hasVIP: true, hasFood: true, hasBars: true }
  },
  'at&t stadium': {
    name: 'AT&T Stadium',
    address: '1 AT&T Way',
    city: 'Arlington',
    state: 'TX',
    zip: '76011',
    capacity: 80000,
    type: 'stadium',
    description: 'AT&T Stadium is home to the Dallas Cowboys, featuring a retractable roof and massive video screens.',
    features: { hasParking: true, isAccessible: true, hasVIP: true, hasFood: true, hasBars: true }
  },
  'toyota music factory': {
    name: 'The Pavilion at Toyota Music Factory',
    address: '316 W Las Colinas Blvd',
    city: 'Irving',
    state: 'TX',
    zip: '75039',
    capacity: 8000,
    type: 'amphitheater',
    description: 'The Pavilion at Toyota Music Factory is a premier outdoor amphitheater hosting major concerts and events.',
    features: { hasParking: true, isAccessible: true, hasVIP: true, hasFood: true, hasBars: true }
  },
  'house of blues dallas': {
    name: 'House of Blues Dallas',
    address: '2200 N Lamar Street',
    city: 'Dallas',
    state: 'TX',
    zip: '75202',
    capacity: 2500,
    type: 'club',
    description: 'House of Blues Dallas is a live music venue and restaurant featuring rock, blues, and other genres.',
    features: { hasParking: true, isAccessible: true, hasVIP: true, hasFood: true, hasBars: true }
  },
  'madison square garden': {
    name: 'Madison Square Garden',
    address: '4 Pennsylvania Plaza',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    capacity: 20789,
    type: 'arena',
    description: 'Madison Square Garden is a legendary multi-purpose arena in Manhattan, home to the Knicks and Rangers.',
    features: { hasParking: false, isAccessible: true, hasVIP: true, hasFood: true, hasBars: true }
  },
  'staples center': {
    name: 'Crypto.com Arena',
    address: '1111 S Figueroa Street',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90015',
    capacity: 20000,
    type: 'arena',
    description: 'Crypto.com Arena (formerly Staples Center) is a premier sports and entertainment venue in downtown LA.',
    features: { hasParking: true, isAccessible: true, hasVIP: true, hasFood: true, hasBars: true }
  }
}

// Search Wikipedia for venue information
async function searchWikipedia(venueName: string): Promise<any> {
  try {
    // Search for the venue
    const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(venueName.replace(/ /g, '_'))}`
    const response = await fetch(searchUrl)

    if (response.ok) {
      const data = await response.json()
      if (data.extract && data.title) {
        return {
          name: data.title,
          description: data.extract.slice(0, 300),
          found: true
        }
      }
    }

    // Try search API as fallback
    const searchApiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(venueName + ' venue')}&format=json&origin=*`
    const searchResponse = await fetch(searchApiUrl)

    if (searchResponse.ok) {
      const searchData = await searchResponse.json()
      if (searchData.query?.search?.[0]) {
        const topResult = searchData.query.search[0]
        // Clean HTML from snippet
        const description = topResult.snippet.replace(/<[^>]*>/g, '').slice(0, 300)
        return {
          name: topResult.title,
          description,
          found: true
        }
      }
    }

    return { found: false }
  } catch (error) {
    console.error('Wikipedia search error:', error)
    return { found: false }
  }
}

// Infer venue type from name
function inferVenueType(name: string): string {
  const lowerName = name.toLowerCase()

  if (lowerName.includes('theater') || lowerName.includes('theatre')) return 'theater'
  if (lowerName.includes('arena')) return 'arena'
  if (lowerName.includes('stadium')) return 'stadium'
  if (lowerName.includes('amphitheater') || lowerName.includes('amphitheatre')) return 'amphitheater'
  if (lowerName.includes('hall') || lowerName.includes('auditorium')) return 'hall'
  if (lowerName.includes('club') || lowerName.includes('lounge')) return 'club'
  if (lowerName.includes('center') || lowerName.includes('centre')) return 'arena'
  if (lowerName.includes('garden') || lowerName.includes('park')) return 'outdoor'

  return 'venue'
}

// Infer capacity from venue type
function inferCapacity(type: string): number {
  const capacities: Record<string, number> = {
    theater: 1500,
    arena: 18000,
    stadium: 50000,
    amphitheater: 8000,
    hall: 2500,
    club: 1000,
    outdoor: 10000,
    venue: 2000
  }
  return capacities[type] || 2000
}

// Generate features based on venue type
function inferFeatures(type: string): any {
  const baseFeatures = {
    hasParking: true,
    isAccessible: true,
    hasVIP: false,
    hasFood: false,
    hasBars: false
  }

  switch (type) {
    case 'arena':
    case 'stadium':
      return { ...baseFeatures, hasVIP: true, hasFood: true, hasBars: true }
    case 'theater':
    case 'hall':
      return { ...baseFeatures, hasVIP: true, hasBars: true }
    case 'club':
      return { ...baseFeatures, hasBars: true, hasFood: true }
    case 'amphitheater':
      return { ...baseFeatures, hasVIP: true, hasFood: true, hasBars: true }
    default:
      return baseFeatures
  }
}

export async function POST(req: NextRequest) {
  try {
    const { venueName, city, state } = await req.json()

    if (!venueName) {
      return NextResponse.json({ error: 'Venue name is required' }, { status: 400 })
    }

    const normalizedName = venueName.toLowerCase().trim()
    let venue: any = null
    let confidence = 'low'

    // First check our known venues database
    for (const [key, knownVenue] of Object.entries(knownVenues)) {
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        venue = { ...knownVenue }
        confidence = 'high'
        break
      }
    }

    // If not found in known venues, try Wikipedia
    if (!venue) {
      const wikiResult = await searchWikipedia(venueName)
      if (wikiResult.found) {
        const inferredType = inferVenueType(wikiResult.name || venueName)
        venue = {
          name: wikiResult.name || venueName,
          address: '',
          city: city || '',
          state: state || '',
          zip: '',
          capacity: inferCapacity(inferredType),
          type: inferredType,
          description: wikiResult.description || `${venueName} is a ${inferredType} venue.`,
          features: inferFeatures(inferredType)
        }
        confidence = 'medium'
      }
    }

    // If still not found, generate based on name inference
    if (!venue) {
      const inferredType = inferVenueType(venueName)
      venue = {
        name: venueName,
        address: '',
        city: city || '',
        state: state || '',
        zip: '',
        capacity: inferCapacity(inferredType),
        type: inferredType,
        description: `${venueName} is a ${inferredType} venue offering excellent facilities for events and performances.`,
        features: inferFeatures(inferredType),
        phone: '',
        website: ''
      }
      confidence = 'low'
    }

    // Add confidence level
    venue.confidence = confidence

    return NextResponse.json({
      success: true,
      venue,
      searchContext: confidence === 'high' ? 'Found in venue database'
        : confidence === 'medium' ? 'Found via web search'
        : 'Generated from venue name'
    })

  } catch (error: any) {
    console.error('Venue lookup error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to lookup venue'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Venue lookup API - Find venue details using web search',
    method: 'POST',
    body: {
      venueName: 'Required - Name of the venue to look up',
      city: 'Optional - City to help narrow search',
      state: 'Optional - State code to help narrow search'
    }
  })
}
