import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const analytics = {
    revenue: {
      today: 24580,
      week: 142300,
      month: 580000,
      year: 4200000,
      trend: '+22%'
    },
    tickets: {
      soldToday: 342,
      soldWeek: 2150,
      soldMonth: 8900,
      conversionRate: 4.8
    },
    customers: {
      total: 8234,
      new: 324,
      returning: 7910,
      vip: 892
    },
    venues: {
      occupancyRate: 78,
      popularVenue: 'Main Theater',
      peakTime: '19:00-21:00'
    }
  }
  
  return NextResponse.json(analytics)
}
