import { NextRequest, NextResponse } from 'next/server'

const mockEvents = [
  {
    id: '1',
    name: 'Hamilton',
    date: '2025-09-28',
    time: '19:30',
    venue: 'Main Theater',
    availableSeats: 75,
    totalSeats: 500,
    minPrice: 75,
    maxPrice: 250,
    image: '/api/placeholder/400/600',
    category: 'Musical'
  },
  {
    id: '2',
    name: 'Symphony Orchestra',
    date: '2025-09-29',
    time: '20:00',
    venue: 'Concert Hall',
    availableSeats: 64,
    totalSeats: 800,
    minPrice: 50,
    maxPrice: 150,
    image: '/api/placeholder/400/600',
    category: 'Classical'
  },
  {
    id: '3',
    name: 'Jazz Night',
    date: '2025-09-30',
    time: '21:00',
    venue: 'Jazz Club',
    availableSeats: 70,
    totalSeats: 200,
    minPrice: 35,
    maxPrice: 75,
    image: '/api/placeholder/400/600',
    category: 'Jazz'
  },
  {
    id: '4',
    name: 'The Lion King',
    date: '2025-10-05',
    time: '14:00',
    venue: 'Main Theater',
    availableSeats: 250,
    totalSeats: 500,
    minPrice: 65,
    maxPrice: 200,
    image: '/api/placeholder/400/600',
    category: 'Musical'
  }
]

export async function GET(request: NextRequest) {
  return NextResponse.json({ events: mockEvents })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const newEvent = {
    id: Date.now().toString(),
    ...body,
    createdAt: new Date().toISOString()
  }
  return NextResponse.json({ success: true, event: newEvent })
}
