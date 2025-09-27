import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { venueName, venueType, capacity, layoutType } = await req.json()
    
    let sections = []
    
    // Generate sections based on venue type
    if (venueType === 'theater') {
      sections = [
        {
          id: 'orchestra',
          name: 'Orchestra',
          x: 400,
          y: 200,
          rows: generateRows(15, 30, false),
          pricing: 'premium',
          rotation: 0,
          color: '#c0c0c0',
          curved: false
        },
        {
          id: 'mezzanine',
          name: 'Mezzanine',
          x: 400,
          y: 450,
          rows: generateRows(8, 25, true),
          pricing: 'standard',
          rotation: 0,
          color: '#cd7f32',
          curved: true,
          curveRadius: 150,
          curveAngle: 60
        },
        {
          id: 'balcony',
          name: 'Balcony',
          x: 400,
          y: 600,
          rows: generateRows(5, 20, true),
          pricing: 'economy',
          rotation: 0,
          color: '#4a5568',
          curved: true,
          curveRadius: 200,
          curveAngle: 45
        }
      ]
    } else if (venueType === 'arena') {
      sections = [
        {
          id: 'floor',
          name: 'Floor',
          x: 400,
          y: 300,
          rows: generateRows(10, 20, false),
          pricing: 'vip',
          rotation: 0,
          color: '#ffd700',
          curved: false
        },
        {
          id: 'lower-left',
          name: 'Lower Left',
          x: 200,
          y: 400,
          rows: generateRows(15, 15, false),
          pricing: 'premium',
          rotation: -30,
          color: '#c0c0c0',
          curved: false
        },
        {
          id: 'lower-right',
          name: 'Lower Right',
          x: 600,
          y: 400,
          rows: generateRows(15, 15, false),
          pricing: 'premium',
          rotation: 30,
          color: '#c0c0c0',
          curved: false
        }
      ]
    } else {
      // Default configuration
      sections = [
        {
          id: 'main',
          name: 'Main Section',
          x: 400,
          y: 300,
          rows: generateRows(20, 25, false),
          pricing: 'standard',
          rotation: 0,
          color: '#4a5568',
          curved: false
        }
      ]
    }
    
    function generateRows(rowCount: number, seatsPerRow: number, curved: boolean) {
      const rows = []
      for (let r = 0; r < rowCount; r++) {
        const row: any = {
          id: `row-${r}`,
          label: String.fromCharCode(65 + r),
          seats: [],
          y: r * 20
        }
        
        if (curved) {
          row.curve = {
            radius: 100 + r * 15,
            startAngle: -30,
            endAngle: 30
          }
        }
        
        for (let s = 0; s < seatsPerRow; s++) {
          row.seats.push({
            id: `seat-R${r}S${s}`,
            sectionId: '',
            row: row.label,
            number: (s + 1).toString(),
            x: s * 15,
            y: row.y,
            status: 'available',
            type: s === 0 || s === seatsPerRow - 1 ? 'wheelchair' : 'regular'
          })
        }
        rows.push(row)
      }
      return rows
    }
    
    // Calculate total capacity
    let totalCapacity = 0
    sections.forEach((section: any) => {
      section.rows.forEach((row: any) => {
        totalCapacity += row.seats.length
      })
    })
    
    return NextResponse.json({
      sections,
      totalCapacity,
      configuration: {
        version: '2.0',
        generatedFor: venueName,
        type: layoutType
      }
    })
    
  } catch (error) {
    console.error('Layout generation error:', error)
    return NextResponse.json({
      sections: [],
      totalCapacity: 0,
      configuration: {}
    })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Layout generation API',
    method: 'POST'
  })
}
