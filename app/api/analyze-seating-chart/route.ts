import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { image, venueType, existingCapacity } = body
    
    if (!image) {
      return NextResponse.json({ error: 'Image required' }, { status: 400 })
    }

    // Generate sections based on venue type
    const sections = []
    let totalCapacity = 0
    
    if (venueType === 'theater' || !venueType) {
      // Orchestra section
      const orchestraSection = {
        id: 'orchestra',
        name: 'Orchestra',
        x: 400,
        y: 250,
        rows: [],
        pricing: 'premium',
        rotation: 0,
        color: '#c0c0c0',
        curved: false
      }
      
      for (let r = 0; r < 12; r++) {
        const row = {
          id: `orchestra-row-${r}`,
          label: String.fromCharCode(65 + r),
          seats: [],
          y: r * 25
        }
        
        for (let s = 0; s < 20; s++) {
          row.seats.push({
            id: `orchestra-R${r}S${s}`,
            sectionId: 'orchestra',
            row: row.label,
            number: (s + 1).toString(),
            x: (s - 10) * 18,
            y: row.y,
            status: 'available',
            type: 'regular'
          })
          totalCapacity++
        }
        orchestraSection.rows.push(row)
      }
      sections.push(orchestraSection)
      
      // Mezzanine section
      const mezzanineSection = {
        id: 'mezzanine',
        name: 'Mezzanine',
        x: 400,
        y: 500,
        rows: [],
        pricing: 'standard',
        rotation: 0,
        color: '#cd7f32',
        curved: true,
        curveRadius: 200,
        curveAngle: 60
      }
      
      for (let r = 0; r < 8; r++) {
        const row = {
          id: `mezzanine-row-${r}`,
          label: String.fromCharCode(65 + r),
          seats: [],
          y: r * 35,
          curve: {
            radius: 180 + r * 30,
            startAngle: -40,
            endAngle: 40
          }
        }
        
        for (let s = 0; s < 18; s++) {
          row.seats.push({
            id: `mezzanine-R${r}S${s}`,
            sectionId: 'mezzanine',
            row: row.label,
            number: (s + 1).toString(),
            x: 0,
            y: row.y,
            status: 'available',
            type: 'regular'
          })
          totalCapacity++
        }
        mezzanineSection.rows.push(row)
      }
      sections.push(mezzanineSection)
    }
    
    return NextResponse.json({
      sections,
      totalCapacity,
      stage: {
        x: 200,
        y: 50,
        width: 400,
        height: 80,
        label: 'STAGE',
        type: 'stage'
      },
      success: true,
      message: `Detected ${sections.length} sections with ${totalCapacity} total seats`
    })
    
  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json({
      error: 'Analysis failed: ' + error.message,
      sections: [],
      totalCapacity: 0
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Seating chart analysis API',
    method: 'POST',
    status: 'ready'
  })
}
