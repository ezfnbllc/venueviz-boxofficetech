/**
 * Venue Autocomplete API
 *
 * GET /api/venue-autocomplete?query=madison&types=establishment
 *
 * Uses Google Places Autocomplete to suggest venues as the user types.
 * Returns a list of venue suggestions with place_id for detailed lookup.
 */

import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY

interface PlacePrediction {
  place_id: string
  description: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
  types: string[]
}

interface AutocompleteResponse {
  predictions: PlacePrediction[]
  status: string
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  if (!query || query.length < 3) {
    return NextResponse.json({
      success: true,
      suggestions: [],
      message: 'Enter at least 3 characters to search'
    })
  }

  // Check if Google Places API key is configured
  if (!GOOGLE_PLACES_API_KEY) {
    return fallbackAutocomplete(query)
  }

  try {
    // Use Google Places Autocomplete API
    // Filter by establishment types relevant to venues
    const types = 'establishment'
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=${types}&key=${GOOGLE_PLACES_API_KEY}`

    const response = await fetch(url)
    const data = await response.json() as AutocompleteResponse & { error_message?: string }

    if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
      const suggestions = data.predictions.map(prediction => ({
        placeId: prediction.place_id,
        name: prediction.structured_formatting.main_text,
        address: prediction.structured_formatting.secondary_text,
        fullDescription: prediction.description,
        types: prediction.types,
      }))

      return NextResponse.json({
        success: true,
        suggestions,
        source: 'google_places'
      })
    }

    // If Google API fails, fall back to local search
    return fallbackAutocomplete(query)

  } catch (error) {
    console.error('[Venue Autocomplete] Error:', error)
    return fallbackAutocomplete(query)
  }
}

/**
 * Fallback autocomplete using a local database of known venues
 */
function fallbackAutocomplete(query: string) {
  const knownVenues = [
    { name: 'Madison Square Garden', address: 'New York, NY', placeId: 'msg-nyc' },
    { name: 'Majestic Theatre', address: 'Dallas, TX', placeId: 'majestic-dallas' },
    { name: 'American Airlines Center', address: 'Dallas, TX', placeId: 'aac-dallas' },
    { name: 'AT&T Stadium', address: 'Arlington, TX', placeId: 'att-arlington' },
    { name: 'Toyota Music Factory', address: 'Irving, TX', placeId: 'toyota-irving' },
    { name: 'House of Blues Dallas', address: 'Dallas, TX', placeId: 'hob-dallas' },
    { name: 'Crypto.com Arena', address: 'Los Angeles, CA', placeId: 'crypto-la' },
    { name: 'The Forum', address: 'Inglewood, CA', placeId: 'forum-inglewood' },
    { name: 'Radio City Music Hall', address: 'New York, NY', placeId: 'rcmh-nyc' },
    { name: 'United Center', address: 'Chicago, IL', placeId: 'united-chicago' },
    { name: 'T-Mobile Arena', address: 'Las Vegas, NV', placeId: 'tmobile-vegas' },
    { name: 'Chase Center', address: 'San Francisco, CA', placeId: 'chase-sf' },
    { name: 'Barclays Center', address: 'Brooklyn, NY', placeId: 'barclays-brooklyn' },
    { name: 'TD Garden', address: 'Boston, MA', placeId: 'td-boston' },
    { name: 'State Farm Arena', address: 'Atlanta, GA', placeId: 'statefarm-atlanta' },
    { name: 'Smoothie King Center', address: 'New Orleans, LA', placeId: 'smoothie-nola' },
    { name: 'Toyota Center', address: 'Houston, TX', placeId: 'toyota-houston' },
    { name: 'Ball Arena', address: 'Denver, CO', placeId: 'ball-denver' },
    { name: 'Moody Center', address: 'Austin, TX', placeId: 'moody-austin' },
    { name: 'Bass Concert Hall', address: 'Austin, TX', placeId: 'bass-austin' },
    { name: 'The Anthem', address: 'Washington, DC', placeId: 'anthem-dc' },
    { name: 'Red Rocks Amphitheatre', address: 'Morrison, CO', placeId: 'redrocks-morrison' },
    { name: 'Hollywood Bowl', address: 'Los Angeles, CA', placeId: 'bowl-la' },
    { name: 'Greek Theatre', address: 'Los Angeles, CA', placeId: 'greek-la' },
    { name: 'Grand Theater Plano', address: 'Plano, TX', placeId: 'grand-plano' },
    { name: 'Globe Life Field', address: 'Arlington, TX', placeId: 'globelife-arlington' },
  ]

  const queryLower = query.toLowerCase()
  const matches = knownVenues.filter(venue =>
    venue.name.toLowerCase().includes(queryLower) ||
    venue.address.toLowerCase().includes(queryLower)
  )

  return NextResponse.json({
    success: true,
    suggestions: matches.map(v => ({
      placeId: v.placeId,
      name: v.name,
      address: v.address,
      fullDescription: `${v.name}, ${v.address}`,
      types: ['establishment', 'point_of_interest'],
    })),
    source: 'fallback_database'
  })
}
