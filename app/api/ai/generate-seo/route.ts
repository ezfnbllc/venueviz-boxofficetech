import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { eventName, description, venue, date, type } = await req.json()

    if (!eventName) {
      return NextResponse.json({ error: 'Event name required' }, { status: 400 })
    }

    // Generate URL slug
    const urlSlug = eventName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60)

    // Generate page title (60 chars max for SEO)
    const pageTitle = `${eventName} Tickets | ${venue || 'Live Event'} | ${date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Coming Soon'}`
      .substring(0, 60)

    // Generate meta description (155 chars max for SEO)
    const pageDescription = description
      ? description.substring(0, 155)
      : `Get tickets for ${eventName} at ${venue || 'our venue'}. ${type === 'concert' ? 'Live music event' : type === 'theater' ? 'Theater performance' : 'Special event'} with amazing performances. Book your seats now!`.substring(0, 155)

    // Generate keywords based on event type and name
    const keywords = [
      eventName.toLowerCase(),
      venue?.toLowerCase(),
      type,
      `${type} tickets`,
      `${eventName.toLowerCase()} tickets`,
      'live events',
      'event tickets',
      date ? new Date(date).getFullYear().toString() : '',
      ...eventName.split(' ').filter((word: string) => word.length > 3).map((w: string) => w.toLowerCase())
    ].filter(k => k && k.length > 0)

    // Generate structured data for SEO
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Event",
      "name": eventName,
      "description": description || pageDescription,
      "startDate": date ? new Date(date).toISOString() : '',
      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
      "eventStatus": "https://schema.org/EventScheduled",
      "location": {
        "@type": "Place",
        "name": venue || "Event Venue"
      },
      "offers": {
        "@type": "Offer",
        "availability": "https://schema.org/InStock",
        "priceCurrency": "USD"
      }
    }

    return NextResponse.json({
      pageTitle,
      pageDescription,
      keywords: [...new Set(keywords)], // Remove duplicates
      urlSlug,
      structuredData
    })

  } catch (error) {
    console.error('SEO generation error:', error)
    return NextResponse.json({
      pageTitle: '',
      pageDescription: '',
      keywords: [],
      urlSlug: '',
      structuredData: {}
    })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'SEO generation API',
    method: 'POST',
    usage: 'Send POST with { eventName, description?, venue?, date?, type? }'
  })
}
