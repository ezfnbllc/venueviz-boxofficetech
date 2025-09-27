import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { venueName, venueType, capacity } = await req.json()
    
    if (!venueName) {
      return NextResponse.json({ error: 'Venue name required' }, { status: 400 })
    }
    
    // Generate description based on venue type
    let description = ''
    let amenities = []
    let parkingCapacity = Math.floor(capacity * 0.3)
    let suggestedLayouts = []
    
    switch (venueType) {
      case 'theater':
        description = `${venueName} is a premier theatrical venue offering an intimate setting for live performances. With state-of-the-art acoustics and lighting, this theater provides an exceptional experience for both performers and audiences.`
        amenities = ['Parking', 'Bar', 'VIP Lounge', 'Accessible', 'Air Conditioning', 'Coat Check']
        suggestedLayouts = [
          { name: 'Standard Theater', type: 'seating_chart', sections: ['Orchestra', 'Mezzanine', 'Balcony'] },
          { name: 'Cabaret Style', type: 'seating_chart', sections: ['Tables', 'Bar Seating'] }
        ]
        break
      
      case 'arena':
        description = `${venueName} is a world-class arena venue designed for large-scale events. Featuring modern amenities and flexible seating configurations, it's perfect for concerts, sports, and major productions.`
        amenities = ['Parking', 'WiFi', 'Food Service', 'Bar', 'VIP Lounge', 'Accessible']
        parkingCapacity = Math.floor(capacity * 0.5)
        suggestedLayouts = [
          { name: 'Concert Configuration', type: 'seating_chart', sections: ['Floor', 'Lower Bowl', 'Upper Bowl', 'VIP Boxes'] },
          { name: 'Sports Configuration', type: 'seating_chart', sections: ['Courtside', 'Lower Level', 'Club Level', 'Upper Level'] }
        ]
        break
      
      case 'stadium':
        description = `${venueName} is a massive outdoor stadium built for the biggest events. With excellent sightlines and modern facilities, it hosts everything from concerts to sporting events.`
        amenities = ['Parking', 'WiFi', 'Food Service', 'Bar', 'VIP Lounge', 'Accessible']
        parkingCapacity = Math.floor(capacity * 0.7)
        suggestedLayouts = [
          { name: 'Field Level', type: 'general_admission', capacity: Math.floor(capacity * 0.3) },
          { name: 'Stadium Seating', type: 'seating_chart', sections: ['Field Level', 'Lower Deck', 'Club Level', 'Upper Deck'] }
        ]
        break
      
      case 'club':
        description = `${venueName} is an intimate club venue perfect for live music and special events. The space offers a vibrant atmosphere with excellent acoustics and a full-service bar.`
        amenities = ['Bar', 'WiFi', 'Accessible', 'Air Conditioning']
        parkingCapacity = Math.floor(capacity * 0.2)
        suggestedLayouts = [
          { name: 'Standing Room', type: 'general_admission', capacity: capacity },
          { name: 'VIP Tables', type: 'seating_chart', sections: ['VIP Tables', 'General Admission'] }
        ]
        break
      
      default:
        description = `${venueName} is a versatile venue suitable for a wide range of events. With modern facilities and flexible configurations, it can accommodate various performance and gathering needs.`
        amenities = ['Parking', 'WiFi', 'Accessible']
        suggestedLayouts = [
          { name: 'General Layout', type: 'general_admission', capacity: capacity }
        ]
    }
    
    return NextResponse.json({
      description,
      amenities,
      parkingCapacity,
      suggestedLayouts
    })
    
  } catch (error) {
    console.error('Venue generation error:', error)
    return NextResponse.json({
      description: '',
      amenities: [],
      parkingCapacity: 500,
      suggestedLayouts: []
    })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Venue generation API',
    method: 'POST'
  })
}
