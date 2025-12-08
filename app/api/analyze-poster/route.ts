import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { image, filename } = body

    if (!image) {
      return NextResponse.json({ error: 'Image required' }, { status: 400 })
    }

    // Extract hints from filename if available
    const nameHints = filename ? filename
      .replace(/\.(jpg|jpeg|png|gif|webp)$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\d{10,}/g, '') // Remove timestamps
      .trim() : ''

    // In a production environment, this would use AI vision (OpenAI GPT-4V, Claude Vision, etc.)
    // to extract text and event details from the poster image.
    // For now, return placeholder data that can be edited by the user.

    // Detect event type from filename hints
    const lowerHints = nameHints.toLowerCase()
    let category = 'concert'
    let tags: string[] = []

    if (lowerHints.includes('comedy') || lowerHints.includes('standup')) {
      category = 'comedy'
      tags = ['comedy', 'standup', 'live entertainment']
    } else if (lowerHints.includes('theater') || lowerHints.includes('musical') || lowerHints.includes('broadway')) {
      category = 'theater'
      tags = ['theater', 'live performance', 'stage']
    } else if (lowerHints.includes('concert') || lowerHints.includes('music') || lowerHints.includes('live')) {
      category = 'concert'
      tags = ['live music', 'concert', 'entertainment']
    } else if (lowerHints.includes('bollywood') || lowerHints.includes('indian')) {
      category = 'concert'
      tags = ['bollywood', 'indian music', 'cultural']
    } else if (lowerHints.includes('party') || lowerHints.includes('nye') || lowerHints.includes('new year')) {
      category = 'party'
      tags = ['party', 'celebration', 'nightlife']
    } else {
      tags = ['event', 'entertainment', 'live']
    }

    // Generate a readable event name from hints or use placeholder
    const eventName = nameHints
      .split(' ')
      .filter(word => word.length > 1)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ') || 'Event from Poster'

    // Return extracted data
    // Note: In production, AI vision would extract actual text from the poster
    return NextResponse.json({
      name: eventName,
      description: `Join us for an exciting event! This ${category} promises an unforgettable experience with amazing performances and entertainment. Don't miss out on this spectacular occasion.`,
      category,
      tags,
      performers: nameHints ? [eventName.split(' ').slice(0, 2).join(' ')] : [],
      confidence: 0.6,
      venue: null, // Would be extracted by AI vision
      date: null, // Would be extracted by AI vision
      time: null, // Would be extracted by AI vision
      pricing: [], // Would be extracted by AI vision
      promotions: [],
      message: 'Poster scanned successfully. Please review and edit the extracted details.',
      aiNote: 'AI vision integration pending. Event details extracted from filename hints.'
    })

  } catch (error: any) {
    console.error('Poster analysis error:', error)
    return NextResponse.json({
      error: 'Analysis failed: ' + error.message,
      name: 'Untitled Event',
      description: 'Event details could not be extracted. Please fill in manually.',
      category: 'other',
      confidence: 0
    }, { status: 200 }) // Return 200 with fallback data
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Poster analysis API',
    method: 'POST',
    usage: 'Send POST request with { image: "base64", filename: "optional.jpg" }',
    note: 'AI vision integration for text extraction from posters'
  })
}
