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
    let eventData = extractEventData(html, url)

    if (!eventData.name) {
      return NextResponse.json({ error: 'Could not extract event details from this page' }, { status: 400 })
    }

    // If no image found, try to find one via web search
    if (!eventData.imageUrl) {
      eventData.imageUrl = await findEventImage(eventData.name, eventData.venueName)
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

// Decode HTML entities
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
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
  const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)
  for (const match of jsonLdMatches) {
    try {
      const jsonLd = JSON.parse(match[1])
      const event = jsonLd['@type'] === 'Event' ? jsonLd :
                    (Array.isArray(jsonLd) && jsonLd.find((item: any) => item['@type'] === 'Event')) || null

      if (event) {
        data.name = decodeHtmlEntities(event.name || '')
        data.startDate = event.startDate || ''

        if (event.location) {
          const location = event.location
          data.venueName = decodeHtmlEntities(location.name || '')
          if (location.address) {
            data.venueCity = location.address.addressLocality || ''
            data.venueState = location.address.addressRegion || ''
          }
        }

        if (event.image) {
          const img = Array.isArray(event.image) ? event.image[0] : event.image
          if (typeof img === 'string') {
            data.imageUrl = img
          } else if (img?.url) {
            data.imageUrl = img.url
          }
        }

        if (event.offers) {
          const offers = Array.isArray(event.offers) ? event.offers[0] : event.offers
          if (offers.lowPrice) {
            data.minPrice = parseFloat(offers.lowPrice)
          } else if (offers.price) {
            data.minPrice = parseFloat(offers.price)
          }
        }

        // If we got a name from JSON-LD, we have good data
        if (data.name) break
      }
    } catch (e) {
      // Continue to next JSON-LD block or fallback
    }
  }

  // Fallback: Extract from meta tags
  if (!data.name) {
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i) ||
                       html.match(/<meta name="title" content="([^"]+)"/i) ||
                       html.match(/<title>([^<]+)<\/title>/i)
    if (titleMatch) {
      data.name = decodeHtmlEntities(titleMatch[1].replace(/\s*[-|]\s*TicketNetwork.*$/i, '').trim())
    }
  }

  // Try multiple image sources
  if (!data.imageUrl) {
    // og:image
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i)
    if (ogImageMatch) {
      data.imageUrl = ogImageMatch[1]
    }
  }

  if (!data.imageUrl) {
    // twitter:image
    const twitterImageMatch = html.match(/<meta name="twitter:image" content="([^"]+)"/i)
    if (twitterImageMatch) {
      data.imageUrl = twitterImageMatch[1]
    }
  }

  if (!data.imageUrl) {
    // Look for performer/event images in the page
    const imgMatch = html.match(/<img[^>]+src="([^"]+)"[^>]*alt="[^"]*(?:performer|event|artist|concert|game)[^"]*"/i) ||
                     html.match(/<img[^>]+class="[^"]*(?:performer|event|hero|banner)[^"]*"[^>]*src="([^"]+)"/i)
    if (imgMatch) {
      data.imageUrl = imgMatch[1]
    }
  }

  // Try to extract venue from the page content if not from JSON-LD
  if (!data.venueName) {
    const venueMatch = html.match(/<[^>]*class="[^"]*venue[^"]*"[^>]*>([^<]+)</i) ||
                       html.match(/at\s+([^,<]+(?:Stadium|Arena|Center|Theatre|Theater|Hall|Garden|Coliseum|Amphitheatre|Pavilion))/i)
    if (venueMatch) {
      data.venueName = decodeHtmlEntities(venueMatch[1].trim())
    }
  }

  // Extract city/state from venue name if present
  if (data.venueName && !data.venueCity) {
    const locationMatch = data.name.match(/in\s+([^,]+),\s*([A-Z]{2})/i)
    if (locationMatch) {
      data.venueCity = locationMatch[1].trim()
      data.venueState = locationMatch[2].trim()
    }
  }

  // Extract date from URL or page if not from JSON-LD
  if (!data.startDate) {
    const dateMatch = html.match(/datetime="([^"]+)"/i) ||
                      html.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/i)
    if (dateMatch) {
      data.startDate = dateMatch[1]
    }
  }

  // Clean up the name - remove venue/date info if it's redundant
  if (data.name) {
    // Remove " in City, ST at Venue on Date" suffix if present
    data.name = data.name.replace(/\s+in\s+[^,]+,\s*[A-Z]{2}\s+at\s+.+$/i, '').trim()
  }

  return data
}

// Try to find an event image via web search or generate a placeholder
async function findEventImage(eventName: string, venueName: string): Promise<string> {
  // Extract the main performer/event name (first part before " - " or " at " or " vs ")
  const mainName = eventName.split(/\s*[-–]\s*|\s+at\s+|\s+vs\.?\s+/i)[0].trim()

  // Try to find an image using a free image API
  try {
    // Use Unsplash for generic event/concert images as fallback
    const searchTerm = mainName.toLowerCase().includes('world cup') ? 'soccer stadium' :
                       mainName.toLowerCase().includes('concert') ? 'concert' :
                       mainName.toLowerCase().includes('nba') || mainName.toLowerCase().includes('basketball') ? 'basketball arena' :
                       mainName.toLowerCase().includes('nfl') || mainName.toLowerCase().includes('football') ? 'football stadium' :
                       mainName.toLowerCase().includes('mlb') || mainName.toLowerCase().includes('baseball') ? 'baseball stadium' :
                       mainName.toLowerCase().includes('nhl') || mainName.toLowerCase().includes('hockey') ? 'hockey arena' :
                       mainName.toLowerCase().includes('fifa') || mainName.toLowerCase().includes('soccer') ? 'soccer stadium' :
                       'concert venue'

    // Use Unsplash source for a relevant placeholder image
    return `https://source.unsplash.com/800x450/?${encodeURIComponent(searchTerm)}`
  } catch (error) {
    console.error('Error finding event image:', error)
    // Return a generic placeholder
    return `https://source.unsplash.com/800x450/?live,event`
  }
}
