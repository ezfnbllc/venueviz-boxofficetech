import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const apiKey = searchParams.get('apikey')
  if (!apiKey) {
    return NextResponse.json({ error: 'API key is required' }, { status: 400 })
  }

  // Build Ticketmaster API URL
  const tmParams = new URLSearchParams()
  tmParams.set('apikey', apiKey)

  // Forward all other parameters
  const forwardParams = ['size', 'sort', 'city', 'stateCode', 'keyword', 'startDateTime', 'endDateTime', 'radius', 'unit', 'classificationName', 'page']
  forwardParams.forEach(param => {
    const value = searchParams.get(param)
    if (value) tmParams.set(param, value)
  })

  try {
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${tmParams.toString()}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        // Cache for 5 minutes to avoid hitting rate limits
        next: { revalidate: 300 }
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Ticketmaster API error:', response.status, errorText)
      return NextResponse.json(
        { error: `Ticketmaster API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching from Ticketmaster:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events from Ticketmaster' },
      { status: 500 }
    )
  }
}
