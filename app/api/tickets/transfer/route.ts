import { NextRequest, NextResponse } from 'next/server'
import { TicketTransferService } from '@/lib/services/ticketTransferService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')

    let data: any

    switch (type) {
      case 'transfers':
        const customerId = searchParams.get('customerId')
        if (!customerId) {
          return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
        }
        const direction = searchParams.get('direction') as 'sent' | 'received' | undefined
        data = await TicketTransferService.getTransfersByCustomer(customerId, direction)
        break

      case 'transfer':
        const transferId = searchParams.get('transferId')
        if (!transferId) {
          return NextResponse.json({ error: 'transferId is required' }, { status: 400 })
        }
        data = await TicketTransferService.getTransfer(transferId)
        break

      case 'waitlist':
        const eventId = searchParams.get('eventId')
        if (!eventId) {
          return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
        }
        data = await TicketTransferService.getWaitlist(eventId)
        break

      case 'waitlistPosition':
        const posEventId = searchParams.get('eventId')
        const posCustomerId = searchParams.get('customerId')
        if (!posEventId || !posCustomerId) {
          return NextResponse.json({ error: 'eventId and customerId are required' }, { status: 400 })
        }
        data = await TicketTransferService.getWaitlistPosition(posEventId, posCustomerId)
        break

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Ticket transfer error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    let result: any

    switch (action) {
      case 'initiateTransfer':
        result = await TicketTransferService.initiateTransfer(data.transfer)
        break

      case 'acceptTransfer':
        result = await TicketTransferService.acceptTransfer(
          data.transferId,
          data.recipientCustomerId
        )
        break

      case 'claimWithCode':
        result = await TicketTransferService.claimTransferWithCode(
          data.transferCode,
          data.recipientCustomerId
        )
        break

      case 'cancelTransfer':
        await TicketTransferService.cancelTransfer(data.transferId)
        result = { success: true }
        break

      case 'joinWaitlist':
        result = await TicketTransferService.joinWaitlist(data.entry)
        break

      case 'leaveWaitlist':
        await TicketTransferService.leaveWaitlist(data.waitlistId)
        result = { success: true }
        break

      case 'processWaitlistOffer':
        result = await TicketTransferService.processWaitlistOffer(
          data.eventId,
          data.availableTickets
        )
        break

      case 'acceptWaitlistOffer':
        result = await TicketTransferService.acceptWaitlistOffer(data.waitlistId, data.ticketIds)
        break

      case 'declineWaitlistOffer':
        await TicketTransferService.declineWaitlistOffer(data.waitlistId)
        result = { success: true }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Ticket transfer error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
