import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { eventName, venueType, generateImages } = await req.json()
    
    if (!eventName) {
      return NextResponse.json({ error: 'Event name required' }, { status: 400 })
    }
    
    // AI-like generation based on event type
    const eventNameLower = eventName.toLowerCase()
    const isTheater = eventNameLower.includes('musical') || eventNameLower.includes('broadway') || 
                      eventNameLower.includes('theater') || eventNameLower.includes('play')
    const isConcert = eventNameLower.includes('concert') || eventNameLower.includes('tour') || 
                      eventNameLower.includes('live') || eventNameLower.includes('band')
    const isComedy = eventNameLower.includes('comedy') || eventNameLower.includes('standup') || 
                     eventNameLower.includes('comic')
    const isSports = eventNameLower.includes('game') || eventNameLower.includes('match') || 
                     eventNameLower.includes('vs') || eventNameLower.includes('championship')
    const isFestival = eventNameLower.includes('festival') || eventNameLower.includes('fest')
    
    let pricing = []
    let suggestedImages = []
    let eventType = 'concert'
    let capacity = 1000
    let description = ''
    
    if (isTheater) {
      eventType = 'theater'
      capacity = 1500
      pricing = [
        { level: 'Orchestra Center', price: 195, serviceFee: 20, tax: 8, sections: ['Orchestra Center'] },
        { level: 'Orchestra Side', price: 165, serviceFee: 17, tax: 8, sections: ['Orchestra Left', 'Orchestra Right'] },
        { level: 'Mezzanine', price: 125, serviceFee: 13, tax: 8, sections: ['Mezzanine'] },
        { level: 'Balcony', price: 85, serviceFee: 9, tax: 8, sections: ['Balcony'] }
      ]
      description = `Experience the magic of live theater with ${eventName}! This spectacular theatrical production features stunning performances, elaborate sets, and unforgettable music that will transport you to another world. Don't miss this critically acclaimed show that has captivated audiences worldwide.`
      
      if (generateImages) {
        suggestedImages = [
          'https://via.placeholder.com/800x400/6B46C1/FFFFFF?text=Theater+Stage',
          'https://via.placeholder.com/800x400/9333EA/FFFFFF?text=Cast+Photo',
          'https://via.placeholder.com/800x400/A855F7/FFFFFF?text=Performance+Scene'
        ]
      }
    } else if (isConcert) {
      eventType = 'concert'
      capacity = 5000
      pricing = [
        { level: 'VIP Pit', price: 350, serviceFee: 35, tax: 8, sections: ['VIP Pit'] },
        { level: 'Floor', price: 250, serviceFee: 25, tax: 8, sections: ['Floor GA'] },
        { level: 'Lower Bowl', price: 150, serviceFee: 15, tax: 8, sections: ['Lower Bowl'] },
        { level: 'Upper Bowl', price: 75, serviceFee: 8, tax: 8, sections: ['Upper Bowl'] }
      ]
      description = `Get ready for an electrifying night with ${eventName}! Experience the raw energy of live music as world-class performers take the stage. With state-of-the-art sound and lighting, this concert promises to be an unforgettable musical journey that will leave you wanting more.`
      
      if (generateImages) {
        suggestedImages = [
          'https://via.placeholder.com/800x400/DC2626/FFFFFF?text=Concert+Stage',
          'https://via.placeholder.com/800x400/EF4444/FFFFFF?text=Artist+Performance',
          'https://via.placeholder.com/800x400/F87171/FFFFFF?text=Crowd+Energy'
        ]
      }
    } else if (isComedy) {
      eventType = 'comedy'
      capacity = 800
      pricing = [
        { level: 'VIP Front Row', price: 125, serviceFee: 13, tax: 8, sections: ['VIP'] },
        { level: 'Premium', price: 75, serviceFee: 8, tax: 8, sections: ['Premium'] },
        { level: 'Standard', price: 50, serviceFee: 5, tax: 8, sections: ['Standard'] },
        { level: 'Economy', price: 35, serviceFee: 4, tax: 8, sections: ['Economy'] }
      ]
      description = `Prepare for a night of non-stop laughter with ${eventName}! Our lineup of hilarious comedians will keep you entertained with their witty observations and side-splitting stories. Perfect for a night out with friends or a unique date night experience.`
      
      if (generateImages) {
        suggestedImages = [
          'https://via.placeholder.com/800x400/F59E0B/FFFFFF?text=Comedy+Night',
          'https://via.placeholder.com/800x400/FBBF24/FFFFFF?text=Stand-up+Stage',
          'https://via.placeholder.com/800x400/FCD34D/FFFFFF?text=Audience+Laughing'
        ]
      }
    } else if (isSports) {
      eventType = 'sports'
      capacity = 20000
      pricing = [
        { level: 'Courtside/Field', price: 500, serviceFee: 50, tax: 8, sections: ['Courtside'] },
        { level: 'Club Level', price: 250, serviceFee: 25, tax: 8, sections: ['Club'] },
        { level: 'Lower Level', price: 150, serviceFee: 15, tax: 8, sections: ['Lower'] },
        { level: 'Upper Level', price: 75, serviceFee: 8, tax: 8, sections: ['Upper'] }
      ]
      description = `Experience the thrill of live sports with ${eventName}! Feel the energy of the crowd and witness athletic excellence as teams battle for victory. This is more than just a game - it's an unforgettable experience that brings fans together in celebration of sport.`
      
      if (generateImages) {
        suggestedImages = [
          'https://via.placeholder.com/800x400/059669/FFFFFF?text=Sports+Arena',
          'https://via.placeholder.com/800x400/10B981/FFFFFF?text=Game+Action',
          'https://via.placeholder.com/800x400/34D399/FFFFFF?text=Stadium+View'
        ]
      }
    } else if (isFestival) {
      eventType = 'festival'
      capacity = 10000
      pricing = [
        { level: 'VIP All Access', price: 450, serviceFee: 45, tax: 8, sections: ['VIP'] },
        { level: '3-Day Pass', price: 250, serviceFee: 25, tax: 8, sections: ['General'] },
        { level: 'Weekend Pass', price: 175, serviceFee: 18, tax: 8, sections: ['General'] },
        { level: 'Single Day', price: 95, serviceFee: 10, tax: 8, sections: ['General'] }
      ]
      description = `Join us for ${eventName}! This incredible festival brings together the best in music, food, and culture. With multiple stages, dozens of performers, and endless entertainment, this is the must-attend event of the season. Create memories that will last a lifetime!`
      
      if (generateImages) {
        suggestedImages = [
          'https://via.placeholder.com/800x400/8B5CF6/FFFFFF?text=Festival+Grounds',
          'https://via.placeholder.com/800x400/A78BFA/FFFFFF?text=Main+Stage',
          'https://via.placeholder.com/800x400/C4B5FD/FFFFFF?text=Festival+Crowd'
        ]
      }
    } else {
      // Default event type
      eventType = 'event'
      capacity = 1000
      pricing = [
        { level: 'VIP', price: 150, serviceFee: 15, tax: 8, sections: ['VIP'] },
        { level: 'Premium', price: 75, serviceFee: 8, tax: 8, sections: ['Premium'] },
        { level: 'Standard', price: 50, serviceFee: 5, tax: 8, sections: ['Standard'] },
        { level: 'General', price: 35, serviceFee: 4, tax: 8, sections: ['General'] }
      ]
      description = `Don't miss ${eventName}! This special event promises to deliver exceptional entertainment and create lasting memories. Join us for an experience that combines quality performances with an intimate atmosphere that brings people together.`
      
      if (generateImages) {
        suggestedImages = [
          'https://via.placeholder.com/800x400/6366F1/FFFFFF?text=Event+Banner',
          'https://via.placeholder.com/800x400/818CF8/FFFFFF?text=Venue+Photo',
          'https://via.placeholder.com/800x400/A5B4FC/FFFFFF?text=Performance'
        ]
      }
    }
    
    // Extract potential performer names from event name
    const performers = []
    
    // Check for common patterns
    if (eventName.includes(' featuring ') || eventName.includes(' with ') || 
        eventName.includes(' presents ') || eventName.includes(' & ')) {
      const parts = eventName.split(/featuring|with|presents|&/i)
      parts.forEach(part => {
        const cleaned = part.trim()
        if (cleaned && cleaned.length < 50) {
          performers.push(cleaned)
        }
      })
    } else if (eventName.includes(':')) {
      // For events like "Artist Name: Tour Name"
      const artist = eventName.split(':')[0].trim()
      if (artist) performers.push(artist)
    } else if (eventName.includes(' - ')) {
      // For events like "Artist Name - Tour Name"
      const artist = eventName.split(' - ')[0].trim()
      if (artist) performers.push(artist)
    } else if (!isTheater && !isFestival && eventName.length < 40) {
      // Use the whole name as performer if it's short enough
      performers.push(eventName)
    }
    
    return NextResponse.json({
      description,
      type: eventType,
      pricing,
      capacity,
      performers: performers.length > 0 ? performers : [],
      suggestedImages: suggestedImages
    })
    
  } catch (error: any) {
    console.error('Generation error:', error.message)
    return NextResponse.json({
      description: 'Join us for an amazing event filled with entertainment and excitement!',
      type: 'concert',
      pricing: [
        { level: 'General Admission', price: 50, serviceFee: 5, tax: 8, sections: [] }
      ],
      capacity: 500,
      performers: [],
      suggestedImages: []
    })
  }
}

// Export GET to avoid 405 errors
export async function GET() {
  return NextResponse.json({ 
    message: 'Enhanced event generation API with AI-like intelligence',
    method: 'POST',
    usage: 'Send POST request with { eventName: string, venueType?: string, generateImages?: boolean }',
    features: [
      'Smart event type detection (theater, concert, comedy, sports, festival)',
      'Intelligent pricing tier generation',
      'Context-aware descriptions',
      'Performer extraction from event names',
      'Placeholder image suggestions'
    ]
  })
}
