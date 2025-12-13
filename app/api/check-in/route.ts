import { NextRequest, NextResponse } from 'next/server'
import { CheckInService } from '@/lib/services/checkInService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')

    let data: any

    switch (type) {
      case 'stats':
        const eventId = searchParams.get('eventId')
        if (!eventId) {
          return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
        }
        data = await CheckInService.getCheckInStats(eventId)
        break

      case 'willCallEntries':
        const wcEventId = searchParams.get('eventId')
        const searchTerm = searchParams.get('search')
        if (!wcEventId) {
          return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
        }
        data = await CheckInService.getWillCallEntries(wcEventId, searchTerm || undefined)
        break

      case 'checkInHistory':
        const historyEventId = searchParams.get('eventId')
        if (!historyEventId) {
          return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
        }
        const historyLimit = parseInt(searchParams.get('limit') || '100')
        data = await CheckInService.getCheckInHistory(historyEventId, historyLimit)
        break

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Check-in error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    let result: any

    switch (action) {
      case 'scan':
        result = await CheckInService.scanTicket(
          data.barcode,
          data.eventId,
          data.operatorId,
          data.stationId
        )
        break

      case 'searchAndCheckIn':
        result = await CheckInService.searchAndCheckIn(
          data.eventId,
          data.searchTerm,
          data.operatorId,
          data.stationId
        )
        break

      case 'manualCheckIn':
        result = await CheckInService.manualCheckIn(
          data.ticketId,
          data.operatorId,
          data.stationId,
          data.notes
        )
        break

      case 'bulkCheckIn':
        result = await CheckInService.bulkCheckIn(
          data.ticketIds,
          data.operatorId,
          data.stationId
        )
        break

      case 'undoCheckIn':
        await CheckInService.undoCheckIn(data.checkInId, data.operatorId, data.reason)
        result = { success: true }
        break

      case 'createWillCallEntry':
        result = await CheckInService.createWillCallEntry(data.entry)
        break

      case 'processWillCallPickup':
        result = await CheckInService.processWillCallPickup(
          data.willCallId,
          data.pickupCode,
          data.operatorId,
          data.verificationMethod
        )
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Check-in error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
