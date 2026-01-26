/**
 * Tenant Customer Orders API
 *
 * GET /api/customers/orders - Get orders for a customer by email and promoter slug
 * Returns orders with event details for the account page.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'

interface OrderWithEvent {
  id: string
  orderId: string
  status: string
  customerName: string
  customerEmail: string
  eventId: string
  eventName: string
  eventDate: string | null
  eventTime: string | null
  eventImage: string | null
  venueName: string | null
  venueLocation: string | null
  items: any[]
  tickets: any[]
  subtotal: number
  serviceFee: number
  total: number
  currency: string
  qrCode: string | null
  createdAt: string | null
  paidAt: string | null
  isPastEvent: boolean
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const promoterSlug = searchParams.get('promoterSlug')

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      )
    }

    if (!promoterSlug) {
      return NextResponse.json(
        { error: 'promoterSlug parameter is required' },
        { status: 400 }
      )
    }

    const db = getAdminFirestore()
    const normalizedEmail = email.toLowerCase()

    // Get promoter ID from slug for fallback queries
    const promoterSnapshot = await db.collection('promoters')
      .where('slug', '==', promoterSlug)
      .limit(1)
      .get()

    const promoterId = promoterSnapshot.empty ? null : promoterSnapshot.docs[0].id

    // Try multiple query strategies since orders might have different fields
    let ordersSnapshot = await db.collection('orders')
      .where('promoterSlug', '==', promoterSlug)
      .where('customerEmail', '==', normalizedEmail)
      .where('status', 'in', ['completed', 'confirmed'])
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    // If no results and we have promoterId, try tenantId
    if (ordersSnapshot.empty && promoterId) {
      ordersSnapshot = await db.collection('orders')
        .where('tenantId', '==', promoterId)
        .where('customerEmail', '==', normalizedEmail)
        .where('status', 'in', ['completed', 'confirmed'])
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get()
    }

    // Final fallback: get orders by email and filter by events owned by this promoter
    if (ordersSnapshot.empty && promoterId) {
      // Get all events for this promoter
      const eventsSnapshot = await db.collection('events')
        .where('promoterId', '==', promoterId)
        .get()
      const promoterEventIds = new Set(eventsSnapshot.docs.map(d => d.id))

      // Get all customer orders
      const allOrdersSnapshot = await db.collection('orders')
        .where('customerEmail', '==', normalizedEmail)
        .where('status', 'in', ['completed', 'confirmed'])
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get()

      // Filter to only orders for this promoter's events
      const filteredDocs = allOrdersSnapshot.docs.filter(doc => {
        const data = doc.data()
        const eventId = data.eventId || data.items?.[0]?.eventId
        return eventId && promoterEventIds.has(eventId)
      }).slice(0, 50)

      // Create a mock snapshot-like structure
      ordersSnapshot = {
        docs: filteredDocs,
        empty: filteredDocs.length === 0,
        size: filteredDocs.length,
      } as any
    }

    // Get unique event IDs
    const eventIds = new Set<string>()
    ordersSnapshot.docs.forEach(doc => {
      const data = doc.data()
      if (data.eventId) eventIds.add(data.eventId)
      data.items?.forEach((item: any) => {
        if (item.eventId) eventIds.add(item.eventId)
      })
    })

    // Fetch event details
    const eventsMap = new Map<string, any>()
    for (const eventId of eventIds) {
      const eventDoc = await db.collection('events').doc(eventId).get()
      if (eventDoc.exists) {
        const data = eventDoc.data()
        if (data) {
          // Parse event date
          let eventDate: Date | null = null
          const firstPerformance = data.schedule?.performances?.[0]
          if (firstPerformance?.date) {
            const rawDate = firstPerformance.date
            if (rawDate?.toDate) eventDate = rawDate.toDate()
            else if (rawDate?._seconds) eventDate = new Date(rawDate._seconds * 1000)
            else if (rawDate) eventDate = new Date(rawDate)
          } else if (data.startDate) {
            const rawDate = data.startDate
            if (rawDate?.toDate) eventDate = rawDate.toDate()
            else if (rawDate?._seconds) eventDate = new Date(rawDate._seconds * 1000)
            else if (rawDate) eventDate = new Date(rawDate)
          }

          eventsMap.set(eventId, {
            id: eventId,
            name: data.name || data.basics?.name || data.title || '',
            bannerImage: data.basics?.images?.cover || data.bannerImage || data.images?.cover || null,
            startDate: eventDate,
            startTime: firstPerformance?.startTime || data.startTime || null,
            venue: data.venue,
          })
        }
      }
    }

    const now = new Date()

    // Build response with enriched order data
    const orders: OrderWithEvent[] = ordersSnapshot.docs.map(doc => {
      const data = doc.data()
      const eventId = data.eventId || data.items?.[0]?.eventId
      const event = eventId ? eventsMap.get(eventId) : null

      const eventDate = event?.startDate
      const isPastEvent = eventDate ? eventDate < now : false

      // Format venue location
      let venueLocation = null
      if (event?.venue?.city && event?.venue?.state) {
        venueLocation = `${event.venue.city}, ${event.venue.state}`
      } else if (event?.venue?.city) {
        venueLocation = event.venue.city
      }

      return {
        id: doc.id,
        orderId: data.orderId || doc.id,
        status: data.status,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        eventId: eventId || '',
        eventName: event?.name || data.items?.[0]?.eventName || 'Unknown Event',
        eventDate: eventDate?.toISOString() || null,
        eventTime: event?.startTime || null,
        eventImage: event?.bannerImage || data.items?.[0]?.eventImage || null,
        venueName: event?.venue?.name || null,
        venueLocation,
        items: data.items || [],
        tickets: data.tickets || [],
        subtotal: data.subtotal || 0,
        serviceFee: data.serviceFee || 0,
        total: data.total || 0,
        currency: data.currency || 'usd',
        qrCode: data.qrCode || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        paidAt: data.paidAt?.toDate?.()?.toISOString() || null,
        isPastEvent,
      }
    })

    // Separate upcoming and past orders
    const upcomingOrders = orders.filter(o => !o.isPastEvent)
    const pastOrders = orders.filter(o => o.isPastEvent)

    return NextResponse.json({
      success: true,
      orders,
      upcomingOrders,
      pastOrders,
      totalOrders: orders.length,
    })

  } catch (error) {
    console.error('Error fetching customer orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
