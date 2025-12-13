import { NextRequest, NextResponse } from 'next/server'
import { QueueManagementService } from '@/lib/services/queueManagementService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')

    let data: any

    switch (type) {
      case 'queue':
        const queueId = searchParams.get('queueId')
        if (!queueId) return NextResponse.json({ error: 'queueId required' }, { status: 400 })
        data = await QueueManagementService.getQueue(queueId)
        break

      case 'queueByEvent':
        const eventId = searchParams.get('eventId')
        if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })
        data = await QueueManagementService.getQueueByEvent(eventId)
        break

      case 'queueStats':
        const statsQueueId = searchParams.get('queueId')
        if (!statsQueueId) return NextResponse.json({ error: 'queueId required' }, { status: 400 })
        data = await QueueManagementService.getQueueStats(statsQueueId)
        break

      case 'entry':
        const entryId = searchParams.get('entryId')
        if (!entryId) return NextResponse.json({ error: 'entryId required' }, { status: 400 })
        data = await QueueManagementService.getQueueEntry(entryId)
        break

      case 'entryBySession':
        const sessionId = searchParams.get('sessionId')
        if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
        data = await QueueManagementService.getQueueEntryBySession(sessionId)
        break

      case 'position':
        const posEntryId = searchParams.get('entryId')
        if (!posEntryId) return NextResponse.json({ error: 'entryId required' }, { status: 400 })
        data = await QueueManagementService.getQueuePosition(posEntryId)
        break

      case 'validateToken':
        const accessToken = searchParams.get('accessToken')
        if (!accessToken) return NextResponse.json({ error: 'accessToken required' }, { status: 400 })
        data = await QueueManagementService.validateAccessToken(accessToken)
        break

      case 'capacityPools':
        const poolsEventId = searchParams.get('eventId')
        if (!poolsEventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })
        data = await QueueManagementService.getCapacityPools(poolsEventId)
        break

      case 'capacityPool':
        const poolId = searchParams.get('poolId')
        if (!poolId) return NextResponse.json({ error: 'poolId required' }, { status: 400 })
        data = await QueueManagementService.getCapacityPool(poolId)
        break

      case 'waitlist':
        const waitlistEventId = searchParams.get('eventId')
        if (!waitlistEventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })
        const waitlistFilters: any = {}
        if (searchParams.get('sectionId')) waitlistFilters.sectionId = searchParams.get('sectionId')
        if (searchParams.get('ticketType')) waitlistFilters.ticketType = searchParams.get('ticketType')
        if (searchParams.get('status')) waitlistFilters.status = searchParams.get('status')
        data = await QueueManagementService.getWaitlist(waitlistEventId, waitlistFilters)
        break

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Queue management error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    let result: any

    switch (action) {
      // Queue management
      case 'createQueue':
        const queueData = {
          ...data.queue,
          schedule: data.queue.schedule ? {
            openAt: new Date(data.queue.schedule.openAt),
            closeAt: new Date(data.queue.schedule.closeAt),
            saleStartAt: new Date(data.queue.schedule.saleStartAt),
          } : undefined,
        }
        result = await QueueManagementService.createQueue(queueData)
        break

      case 'updateQueue':
        const queueUpdates = { ...data.updates }
        if (queueUpdates.schedule) {
          queueUpdates.schedule = {
            openAt: new Date(queueUpdates.schedule.openAt),
            closeAt: new Date(queueUpdates.schedule.closeAt),
            saleStartAt: new Date(queueUpdates.schedule.saleStartAt),
          }
        }
        await QueueManagementService.updateQueue(data.queueId, queueUpdates)
        result = { success: true }
        break

      case 'activateQueue':
        await QueueManagementService.activateQueue(data.queueId)
        result = { success: true }
        break

      case 'pauseQueue':
        await QueueManagementService.pauseQueue(data.queueId)
        result = { success: true }
        break

      case 'completeQueue':
        await QueueManagementService.completeQueue(data.queueId)
        result = { success: true }
        break

      case 'processQueue':
        result = await QueueManagementService.processQueue(data.queueId)
        break

      // Queue entry management
      case 'joinQueue':
        result = await QueueManagementService.joinQueue(data.queueId, {
          customerId: data.customerId,
          deviceFingerprint: data.deviceFingerprint,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          metadata: data.metadata,
        })
        break

      case 'passChallenge':
        await QueueManagementService.passChallenge(data.entryId)
        result = { success: true }
        break

      case 'failChallenge':
        await QueueManagementService.failChallenge(data.entryId)
        result = { success: true }
        break

      case 'activateEntry':
        result = await QueueManagementService.activateEntry(data.entryId)
        break

      case 'completeSession':
        await QueueManagementService.completeSession(data.sessionId, data.purchaseAmount)
        result = { success: true }
        break

      case 'expireSession':
        await QueueManagementService.expireSession(data.sessionId)
        result = { success: true }
        break

      case 'refreshSession':
        result = await QueueManagementService.refreshSession(data.sessionId)
        break

      // Capacity management
      case 'createCapacityPool':
        result = await QueueManagementService.createCapacityPool(data.pool)
        break

      case 'holdCapacity':
        result = await QueueManagementService.holdCapacity(
          data.poolId,
          data.quantity,
          data.sessionId,
          data.customerId,
          data.ticketType,
          data.holdDurationMinutes
        )
        break

      case 'releaseHold':
        await QueueManagementService.releaseHold(data.holdId)
        result = { success: true }
        break

      case 'convertHoldToSale':
        await QueueManagementService.convertHoldToSale(data.holdId)
        result = { success: true }
        break

      case 'processExpiredHolds':
        result = { released: await QueueManagementService.processExpiredHolds() }
        break

      // Waitlist management
      case 'addToWaitlist':
        result = await QueueManagementService.addToWaitlist(data.entry)
        break

      case 'notifyWaitlistEntries':
        result = await QueueManagementService.notifyWaitlistEntries(
          data.eventId, data.availableQuantity, data.ticketType
        )
        break

      case 'processExpiredWaitlistNotifications':
        result = { expired: await QueueManagementService.processExpiredWaitlistNotifications() }
        break

      case 'markWaitlistPurchased':
        await QueueManagementService.markWaitlistPurchased(data.entryId)
        result = { success: true }
        break

      case 'cancelWaitlistEntry':
        await QueueManagementService.cancelWaitlistEntry(data.entryId)
        result = { success: true }
        break

      case 'clearCache':
        QueueManagementService.clearCache()
        result = { success: true }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Queue management error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
