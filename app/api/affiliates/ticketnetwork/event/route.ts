import { NextRequest, NextResponse } from 'next/server'

/**
 * API route to fetch TicketNetwork event details from a URL
 * Extracts event name, venue, date, and image for creating affiliate events
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate it's a TicketNetwork URL
    if (!url.includes('ticketnetwork.com')) {
      return NextResponse.json({ error: 'Please provide a valid TicketNetwork URL' }, { status: 400 })
    }

    // Fetch the TicketNetwork page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch event page' }, { status: response.status })
    }

    const html = await response.text()

    // Extract event details from the HTML
    const eventData = extractEventData(html, url)

    if (!eventData.name) {
      return NextResponse.json({ error: 'Could not extract event details from this page' }, { status: 400 })
    }

    return NextResponse.json(eventData)
  } catch (error) {
    console.error('Error fetching TicketNetwork event:', error)
    return NextResponse.json(
      { error: 'Failed to fetch event details' },
      { status: 500 }
    )
  }
}

function extractEventData(html: string, url: string) {
  const data: {
    name: string
    venueName: string
    venueCity: string
    venueState: string
    startDate: string
    imageUrl: string
    minPrice: number | null
    url: string
  } = {
    name: '',
    venueName: '',
    venueCity: '',
    venueState: '',
    startDate: '',
    imageUrl: '',
    minPrice: null,
    url: url,
  }

  // Try to extract from JSON-LD structured data first (most reliable)
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1])
      if (jsonLd['@type'] === 'Event' || (Array.isArray(jsonLd) && jsonLd[0]?.['@type'] === 'Event')) {
        const event = Array.isArray(jsonLd) ? jsonLd[0] : jsonLd
        data.name = event.name || ''
        data.startDate = event.startDate || ''

        if (event.location) {
          const location = event.location
          data.venueName = location.name || ''
          if (location.address) {
            data.venueCity = location.address.addressLocality || ''
            data.venueState = location.address.addressRegion || ''
          }
        }

        if (event.image) {
          data.imageUrl = Array.isArray(event.image) ? event.image[0] : event.image
        }

        if (event.offers) {
          const offers = Array.isArray(event.offers) ? event.offers[0] : event.offers
          if (offers.lowPrice) {
            data.minPrice = parseFloat(offers.lowPrice)
          } else if (offers.price) {
            data.minPrice = parseFloat(offers.price)
          }
        }
      }
    } catch (e) {
      console.log('Failed to parse JSON-LD, falling back to HTML parsing')
    }
  }

  // Fallback: Extract from meta tags
  if (!data.name) {
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i) ||
                       html.match(/<title>([^<]+)<\/title>/i)
    if (titleMatch) {
      data.name = titleMatch[1].replace(/\s*\|\s*TicketNetwork.*$/i, '').trim()
    }
  }

  if (!data.imageUrl) {
    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i)
    if (imageMatch) {
      data.imageUrl = imageMatch[1]
    }
  }

  // Try to extract venue from the page content
  if (!data.venueName) {
    // Look for common venue patterns in TicketNetwork pages
    const venueMatch = html.match(/venue["\s:]+([^"<]+)/i) ||
                       html.match(/<span[^>]*class="[^"]*venue[^"]*"[^>]*>([^<]+)<\/span>/i)
    if (venueMatch) {
      data.venueName = venueMatch[1].trim()
    }
  }

  // Extract date from URL or page if not from JSON-LD
  if (!data.startDate) {
    // TicketNetwork URLs often have date patterns
    const dateMatch = url.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/) ||
                      html.match(/datetime="([^"]+)"/i)
    if (dateMatch) {
      data.startDate = dateMatch[1]
    }
  }

  return data
}
