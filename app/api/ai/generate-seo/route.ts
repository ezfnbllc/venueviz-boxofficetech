import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { eventName, description, venue, date, type, category, performers, pricing } = await req.json()

    if (!eventName) {
      return NextResponse.json({ error: 'Event name required' }, { status: 400 })
    }

    // Generate URL slug
    const urlSlug = eventName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60)

    // Format date for display
    const dateStr = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
    const eventCategory = category || type || 'event'

    // Generate meta title (60 chars max for SEO)
    const metaTitle = `${eventName} Tickets${venue ? ` | ${venue}` : ''}${dateStr ? ` | ${dateStr}` : ''}`
      .substring(0, 60)

    // Generate meta description (155 chars max for SEO)
    const metaDescription = description
      ? description.substring(0, 155)
      : `Get tickets for ${eventName}${venue ? ` at ${venue}` : ''}. ${eventCategory === 'concert' ? 'Live music event' : eventCategory === 'comedy' ? 'Stand-up comedy show' : eventCategory === 'theater' ? 'Theater performance' : 'Special event'}. Book now!`.substring(0, 155)

    // Generate AI-optimized description (for ChatGPT, Perplexity)
    const performerList = performers?.length > 0 ? performers.join(', ') : ''
    const priceRange = pricing ? `$${pricing.min}-$${pricing.max}` : ''

    const aiDescription = `${eventName} is ${eventCategory === 'concert' ? 'a live music event' : eventCategory === 'comedy' ? 'a stand-up comedy show' : eventCategory === 'theater' ? 'a theater performance' : 'an event'}${venue ? ` taking place at ${venue}` : ''}${dateStr ? ` on ${dateStr}` : ''}.${performerList ? ` Featuring ${performerList}.` : ''}${priceRange ? ` Tickets range from ${priceRange}.` : ''} ${description ? description.substring(0, 150) : 'Experience an unforgettable evening of entertainment.'}`

    // Generate keywords based on event type and name
    const keywords = [
      eventName.toLowerCase(),
      `${eventName.toLowerCase()} tickets`,
      venue?.toLowerCase(),
      eventCategory,
      `${eventCategory} tickets`,
      'live events',
      'event tickets',
      date ? new Date(date).getFullYear().toString() : '',
      ...(performers || []).map((p: string) => p.toLowerCase()),
      ...eventName.split(' ').filter((word: string) => word.length > 3).map((w: string) => w.toLowerCase())
    ].filter(k => k && k.length > 0)

    // Generate FAQ structured data
    const structuredDataFAQ = [
      {
        question: `When is ${eventName}?`,
        answer: dateStr ? `${eventName} takes place on ${dateStr}.` : `Check the event page for specific dates and times.`
      },
      {
        question: `Where is ${eventName}?`,
        answer: venue ? `${eventName} is at ${venue}.` : `Check the event page for venue details.`
      },
      {
        question: `How much are tickets for ${eventName}?`,
        answer: priceRange ? `Tickets for ${eventName} range from ${priceRange}.` : `Check the event page for current ticket prices.`
      },
      {
        question: `How do I buy tickets for ${eventName}?`,
        answer: `You can purchase tickets online through our secure checkout. Select your preferred seats and complete your purchase in minutes.`
      }
    ]

    // Generate semantic/LSI keywords
    const semanticKeywords = [
      `${eventCategory} near me`,
      `best ${eventCategory} events`,
      `live ${eventCategory}`,
      `${eventName} review`,
      venue ? `events at ${venue}` : null,
      `${eventCategory} tickets online`
    ].filter(Boolean) as string[]

    // Generate search queries for voice/AI search
    const searchQueries = [
      `What time does ${eventName} start?`,
      `Where can I buy ${eventName} tickets?`,
      venue ? `What events are at ${venue}?` : null,
      `Is ${eventName} worth seeing?`,
      `${eventName} ticket prices`
    ].filter(Boolean) as string[]

    // Local SEO data
    const localSEO = venue ? {
      venue: venue,
      city: 'Dallas',
      state: 'TX',
      neighborhood: 'Downtown'
    } : null

    // Generate event structured data
    const eventStructuredData = {
      "@context": "https://schema.org",
      "@type": "Event",
      "name": eventName,
      "description": description || metaDescription,
      "startDate": date ? new Date(date).toISOString() : '',
      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
      "eventStatus": "https://schema.org/EventScheduled",
      "location": venue ? {
        "@type": "Place",
        "name": venue
      } : undefined,
      "performer": performers?.length > 0 ? performers.map((p: string) => ({
        "@type": "PerformingGroup",
        "name": p
      })) : undefined,
      "offers": pricing ? {
        "@type": "Offer",
        "availability": "https://schema.org/InStock",
        "priceCurrency": "USD",
        "lowPrice": pricing.min,
        "highPrice": pricing.max
      } : undefined
    }

    return NextResponse.json({
      metaTitle,
      metaDescription,
      aiDescription,
      keywords: [...new Set(keywords)],
      urlSlug,
      ogTitle: metaTitle,
      ogDescription: metaDescription,
      twitterTitle: metaTitle,
      twitterDescription: metaDescription,
      structuredDataFAQ,
      eventStructuredData,
      faqStructuredData: structuredDataFAQ,
      searchQueries,
      semanticKeywords,
      localSEO,
      confidence: 0.85
    })

  } catch (error) {
    console.error('SEO generation error:', error)
    return NextResponse.json({
      metaTitle: '',
      metaDescription: '',
      aiDescription: '',
      keywords: [],
      urlSlug: '',
      confidence: 0
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'SEO generation API',
    method: 'POST',
    usage: 'Send POST with { eventName, description?, venue?, date?, category?, performers?, pricing? }'
  })
}
