/**
 * Tenant Customer Orders API
 *
 * GET /api/customers/orders - Get orders for a customer by email and promoter slug
 * Returns orders with event details for the account page.
 *
 * Uses simple queries to avoid composite index requirements.
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

    console.log(`[CustomerOrders] Fetching orders for ${normalizedEmail} on tenant ${promoterSlug}`)

    // Get promoter ID from slug
    const promoterSnapshot = await db.collection('promoters')
      .where('slug', '==', promoterSlug)
      .limit(1)
      .get()

    if (promoterSnapshot.empty) {
      console.log(`[CustomerOrders] Promoter not found: ${promoterSlug}`)
      return NextResponse.json({
        success: true,
        orders: [],
        upcomingOrders: [],
        pastOrders: [],
        totalOrders: 0,
        debug: { error: 'Promoter not found' }
      })
    }

    const promoterId = promoterSnapshot.docs[0].id
    console.log(`[CustomerOrders] Promoter ID: ${promoterId}`)

    // Get all events for this promoter to know which event IDs belong to them
    const eventsSnapshot = await db.collection('events')
      .where('promoterId', '==', promoterId)
      .get()

    const promoterEventIds = new Set(eventsSnapshot.docs.map(d => d.id))
    console.log(`[CustomerOrders] Found ${promoterEventIds.size} events for promoter`)

    // Simple query: get all orders by customer email (no composite index needed)
    const allOrdersSnapshot = await db.collection('orders')
      .where('customerEmail', '==', normalizedEmail)
      .get()

    console.log(`[CustomerOrders] Found ${allOrdersSnapshot.size} total orders for email`)

    // Filter orders in JavaScript:
    // 1. Must be completed/confirmed status
    // 2. Must belong to this promoter (by promoterSlug, tenantId, or eventId)
    const filteredDocs = allOrdersSnapshot.docs.filter(doc => {
      const data = doc.data()

      // Check status
      const status = data.status?.toLowerCase()
      if (status !== 'completed' && status !== 'confirmed') {
        return false
      }

      // Check if order belongs to this promoter
      // Method 1: Direct promoterSlug match
      if (data.promoterSlug === promoterSlug) {
        return true
      }

      // Method 2: tenantId matches promoterId
      if (data.tenantId === promoterId) {
        return true
      }

      // Method 3: Event belongs to this promoter
      const eventId = data.eventId || data.items?.[0]?.eventId
      if (eventId && promoterEventIds.has(eventId)) {
        return true
      }

      return false
    })

    console.log(`[CustomerOrders] After filtering: ${filteredDocs.length} orders for this tenant`)

    // Sort by createdAt descending
    filteredDocs.sort((a, b) => {
      const dateA = a.data().createdAt?.toDate?.() || new Date(0)
      const dateB = b.data().createdAt?.toDate?.() || new Date(0)
      return dateB.getTime() - dateA.getTime()
    })

    // Limit to 50
    const limitedDocs = filteredDocs.slice(0, 50)

    // Get unique event IDs for enrichment
    const eventIds = new Set<string>()
    limitedDocs.forEach(doc => {
      const data = doc.data()
      if (data.eventId) eventIds.add(data.eventId)
      data.items?.forEach((item: any) => {
        if (item.eventId) eventIds.add(item.eventId)
      })
    })

    // Fetch event details for enrichment
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
    const orders: OrderWithEvent[] = limitedDocs.map(doc => {
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
        total: data.total || data.pricing?.total || 0,
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

    console.log(`[CustomerOrders] Returning ${orders.length} orders (${upcomingOrders.length} upcoming, ${pastOrders.length} past)`)

    return NextResponse.json({
      success: true,
      orders,
      upcomingOrders,
      pastOrders,
      totalOrders: orders.length,
    })

  } catch (error: any) {
    console.error('[CustomerOrders] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: error.message },
      { status: 500 }
    )
  }
}
