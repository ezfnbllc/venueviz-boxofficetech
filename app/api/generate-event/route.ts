import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { eventName } = await req.json()
    
    if (!eventName) {
      return NextResponse.json({ error: 'Event name required' }, { status: 400 })
    }

    // Generate mock data based on event name
    const isMusical = eventName.toLowerCase().includes('musical') || eventName.toLowerCase().includes('broadway')
    const isConcert = eventName.toLowerCase().includes('concert') || eventName.toLowerCase().includes('tour')
    const isComedy = eventName.toLowerCase().includes('comedy') || eventName.toLowerCase().includes('standup')
    
    let eventType = 'concert'
    let basePrice = 75
    let suggestedCapacity = 500
    
    if (isMusical) {
      eventType = 'theater'
      basePrice = 95
      suggestedCapacity = 800
    } else if (isComedy) {
      eventType = 'comedy'
      basePrice = 45
      suggestedCapacity = 300
    } else if (isConcert) {
      eventType = 'concert'
      basePrice = 85
      suggestedCapacity = 1000
    }

    // Extract potential performer names
    const performers = []
    if (eventName.includes('-') || eventName.includes(':')) {
      const parts = eventName.split(/[-:]/)
      if (parts.length > 1) {
        performers.push(parts[0].trim())
      }
    } else if (eventName.includes('featuring') || eventName.includes('with')) {
      const parts = eventName.split(/featuring|with/i)
      parts.forEach(p => {
        const cleaned = p.trim()
        if (cleaned) performers.push(cleaned)
      })
    } else {
      // Use the whole name as performer if it's not too long
      if (eventName.length < 50) {
        performers.push(eventName)
      }
    }

    const description = `Experience an unforgettable evening with ${eventName}! This spectacular ${eventType} event promises to deliver world-class entertainment that will leave you amazed. Join us for a night of incredible performances, stunning production values, and memories that will last a lifetime. Don't miss your chance to be part of this extraordinary experience.`

    return NextResponse.json({
      description,
      type: eventType,
      price: basePrice,
      capacity: suggestedCapacity,
      performers: performers.length > 0 ? performers : [eventName]
    })
    
  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json({
      description: 'Join us for an amazing event filled with entertainment and excitement!',
      type: 'concert',
      price: 75,
      capacity: 500,
      performers: []
    })
  }
}

// Also export GET to avoid 405 errors
export async function GET() {
  return NextResponse.json({ 
    message: 'Event generation API', 
    method: 'POST',
    usage: 'Send POST request with { eventName: "your event name" }'
  })
}
