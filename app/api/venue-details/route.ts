/**
 * Venue Details API
 *
 * GET /api/venue-details?placeId=ChIJ...
 *
 * Fetches detailed venue information from Google Places including:
 * - Full address with components
 * - Phone number
 * - Website
 * - Photos
 * - Opening hours
 * - Reviews/rating
 */

import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY

interface PlaceDetails {
  name: string
  formatted_address: string
  formatted_phone_number?: string
  international_phone_number?: string
  website?: string
  url?: string // Google Maps URL
  rating?: number
  user_ratings_total?: number
  photos?: Array<{
    photo_reference: string
    height: number
    width: number
  }>
  address_components?: Array<{
    long_name: string
    short_name: string
    types: string[]
  }>
  geometry?: {
    location: {
      lat: number
      lng: number
    }
  }
  opening_hours?: {
    weekday_text: string[]
    open_now: boolean
  }
  types?: string[]
  editorial_summary?: {
    overview: string
  }
}

interface PlaceDetailsResponse {
  result: PlaceDetails
  status: string
}

// Known venues fallback database with full details
const knownVenueDetails: Record<string, any> = {
  'majestic-dallas': {
    name: 'Majestic Theatre',
    streetAddress1: '1925 Elm Street',
    city: 'Dallas',
    state: 'TX',
    zipCode: '75201',
    latitude: 32.7834,
    longitude: -96.7977,
    capacity: 1700,
    type: 'theater',
    contactPhone: '(214) 670-3687',
    website: 'https://www.liveatthemajestic.com/',
    description: 'The Majestic Theatre is a historic theater in downtown Dallas, Texas. Built in 1921, it is the last remaining palace movie theater in Dallas and hosts concerts, comedy shows, and special events.',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Dallas_Majestic_Theater_02.jpg/1280px-Dallas_Majestic_Theater_02.jpg'],
    amenities: ['Wheelchair Accessible', 'Bar', 'VIP Boxes']
  },
  'aac-dallas': {
    name: 'American Airlines Center',
    streetAddress1: '2500 Victory Avenue',
    city: 'Dallas',
    state: 'TX',
    zipCode: '75219',
    latitude: 32.7906,
    longitude: -96.8103,
    capacity: 20000,
    type: 'arena',
    contactPhone: '(214) 222-3687',
    website: 'https://www.americanairlinescenter.com/',
    description: 'American Airlines Center is a multi-purpose arena in Victory Park, Dallas. Home to the Dallas Mavericks (NBA) and Dallas Stars (NHL), it hosts major concerts and events.',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/American_Airlines_Center_%28exterior%29.jpg/1280px-American_Airlines_Center_%28exterior%29.jpg'],
    amenities: ['Parking', 'Wheelchair Accessible', 'Food Service', 'Bar', 'VIP Boxes', 'Merchandise Shop']
  },
  'att-arlington': {
    name: 'AT&T Stadium',
    streetAddress1: '1 AT&T Way',
    city: 'Arlington',
    state: 'TX',
    zipCode: '76011',
    latitude: 32.7480,
    longitude: -97.0928,
    capacity: 80000,
    type: 'stadium',
    contactPhone: '(817) 892-4000',
    website: 'https://attstadium.com/',
    description: 'AT&T Stadium is home to the Dallas Cowboys and features a retractable roof, massive video screens, and world-class facilities for concerts and major events.',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Cowboys_Stadium_land.jpg/1280px-Cowboys_Stadium_land.jpg'],
    amenities: ['Parking', 'Wheelchair Accessible', 'Food Service', 'Bar', 'VIP Boxes', 'ATM', 'Merchandise Shop']
  },
  'msg-nyc': {
    name: 'Madison Square Garden',
    streetAddress1: '4 Pennsylvania Plaza',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    latitude: 40.7505,
    longitude: -73.9934,
    capacity: 20789,
    type: 'arena',
    contactPhone: '(212) 465-6741',
    website: 'https://www.msg.com/',
    description: 'Madison Square Garden is a legendary multi-purpose indoor arena in Midtown Manhattan, known as "The World\'s Most Famous Arena." Home to the New York Knicks and New York Rangers.',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Madison_Square_Garden_%28MSG%29_-_Full_%2848124330357%29.jpg/1280px-Madison_Square_Garden_%28MSG%29_-_Full_%2848124330357%29.jpg'],
    amenities: ['Wheelchair Accessible', 'Food Service', 'Bar', 'VIP Boxes', 'ATM', 'Merchandise Shop']
  },
  'grand-plano': {
    name: 'Grand Theater Plano',
    streetAddress1: '100 N Central Expressway',
    city: 'Plano',
    state: 'TX',
    zipCode: '75074',
    latitude: 33.0198,
    longitude: -96.6989,
    capacity: 400,
    type: 'theater',
    contactPhone: '(972) 881-5809',
    website: 'https://www.visitplano.com/listing/courtyard-theater-at-the-plano-artcentre/106/',
    description: 'The Grand Theater Plano is an intimate performing arts venue in downtown Plano, hosting theater productions, concerts, and cultural events.',
    images: [],
    amenities: ['Parking', 'Wheelchair Accessible', 'Bar']
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const placeId = searchParams.get('placeId')

  if (!placeId) {
    return NextResponse.json({
      success: false,
      error: 'placeId is required'
    }, { status: 400 })
  }

  // Check fallback database first for non-Google place IDs
  if (knownVenueDetails[placeId]) {
    return NextResponse.json({
      success: true,
      venue: knownVenueDetails[placeId],
      source: 'fallback_database'
    })
  }

  // Check if Google Places API key is configured
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('[Venue Details] GOOGLE_PLACES_API_KEY not configured')
    return NextResponse.json({
      success: false,
      error: 'Venue details not available. Please configure Google Places API.',
      source: 'no_api_key'
    }, { status: 503 })
  }

  try {
    // Fetch place details from Google Places API
    const fields = [
      'name',
      'formatted_address',
      'formatted_phone_number',
      'international_phone_number',
      'website',
      'url',
      'rating',
      'user_ratings_total',
      'photos',
      'address_components',
      'geometry',
      'opening_hours',
      'types',
      'editorial_summary'
    ].join(',')

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_PLACES_API_KEY}`

    const response = await fetch(url)
    const data: PlaceDetailsResponse = await response.json()

    if (data.status !== 'OK') {
      console.error(`[Venue Details] Google API error: ${data.status}`)
      return NextResponse.json({
        success: false,
        error: `Place not found: ${data.status}`
      }, { status: 404 })
    }

    const place = data.result

    // Parse address components
    let streetAddress1 = ''
    let city = ''
    let state = ''
    let zipCode = ''

    if (place.address_components) {
      for (const component of place.address_components) {
        if (component.types.includes('street_number')) {
          streetAddress1 = component.long_name + ' '
        }
        if (component.types.includes('route')) {
          streetAddress1 += component.long_name
        }
        if (component.types.includes('locality')) {
          city = component.long_name
        }
        if (component.types.includes('administrative_area_level_1')) {
          state = component.short_name
        }
        if (component.types.includes('postal_code')) {
          zipCode = component.long_name
        }
      }
    }

    // Infer venue type from place types
    const venueType = inferVenueType(place.types || [], place.name)

    // Get photo URLs (first 5)
    const photoUrls: string[] = []
    if (place.photos && GOOGLE_PLACES_API_KEY) {
      for (const photo of place.photos.slice(0, 5)) {
        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
        photoUrls.push(photoUrl)
      }
    }

    const venue = {
      name: place.name,
      streetAddress1: streetAddress1.trim() || extractStreetFromAddress(place.formatted_address),
      city,
      state,
      zipCode,
      latitude: place.geometry?.location.lat || 0,
      longitude: place.geometry?.location.lng || 0,
      capacity: inferCapacity(venueType),
      type: venueType,
      contactPhone: place.formatted_phone_number || place.international_phone_number || '',
      website: place.website || '',
      description: place.editorial_summary?.overview || generateDescription(place.name, venueType, city, state),
      images: photoUrls,
      rating: place.rating,
      totalReviews: place.user_ratings_total,
      googleMapsUrl: place.url,
      openingHours: place.opening_hours?.weekday_text,
      amenities: inferAmenities(venueType)
    }

    return NextResponse.json({
      success: true,
      venue,
      source: 'google_places'
    })

  } catch (error) {
    console.error('[Venue Details] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch venue details'
    }, { status: 500 })
  }
}

function extractStreetFromAddress(fullAddress: string): string {
  // Extract street from full address (before first comma)
  const parts = fullAddress.split(',')
  return parts[0]?.trim() || ''
}

function inferVenueType(types: string[], name: string): string {
  const lowerName = name.toLowerCase()

  // Check name first
  if (lowerName.includes('theater') || lowerName.includes('theatre')) return 'theater'
  if (lowerName.includes('arena')) return 'arena'
  if (lowerName.includes('stadium')) return 'stadium'
  if (lowerName.includes('amphitheater') || lowerName.includes('amphitheatre')) return 'outdoor'
  if (lowerName.includes('hall') || lowerName.includes('auditorium')) return 'hall'
  if (lowerName.includes('club')) return 'club'
  if (lowerName.includes('center') || lowerName.includes('centre')) return 'arena'

  // Check Google place types
  if (types.includes('stadium')) return 'stadium'
  if (types.includes('movie_theater') || types.includes('performing_arts_theater')) return 'theater'
  if (types.includes('night_club')) return 'club'
  if (types.includes('park') || types.includes('campground')) return 'outdoor'

  return 'venue'
}

function inferCapacity(type: string): number {
  const capacities: Record<string, number> = {
    theater: 1500,
    arena: 18000,
    stadium: 50000,
    hall: 2500,
    club: 1000,
    outdoor: 10000,
    venue: 2000
  }
  return capacities[type] || 2000
}

function inferAmenities(type: string): string[] {
  const baseAmenities = ['Wheelchair Accessible']

  switch (type) {
    case 'arena':
    case 'stadium':
      return [...baseAmenities, 'Parking', 'Food Service', 'Bar', 'VIP Boxes', 'ATM', 'Merchandise Shop']
    case 'theater':
    case 'hall':
      return [...baseAmenities, 'Parking', 'Bar', 'Coat Check']
    case 'club':
      return [...baseAmenities, 'Bar', 'Food Service']
    case 'outdoor':
      return [...baseAmenities, 'Parking', 'Food Service', 'Bar']
    default:
      return baseAmenities
  }
}

function generateDescription(name: string, type: string, city: string, state: string): string {
  const location = city && state ? ` in ${city}, ${state}` : ''
  const typeLabel = type === 'venue' ? 'entertainment venue' : type

  return `${name} is a ${typeLabel}${location} offering excellent facilities for events and performances.`
}
