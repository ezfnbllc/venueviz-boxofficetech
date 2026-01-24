/**
 * UCP (Universal Commerce Protocol) - Checkout API
 *
 * This endpoint enables Google AI (Gemini) to initiate ticket purchases.
 * Part of the Universal Commerce Protocol for AI-native commerce.
 *
 * POST /api/ucp/checkout
 * Request body:
 * {
 *   eventId: string,
 *   tickets: Array<{ tierId: string, quantity: number }>,
 *   customerEmail: string,
 *   customerName?: string,
 *   returnUrl?: string
 * }
 *
 * Response:
 * {
 *   checkoutUrl: string,      // URL to complete purchase
 *   checkoutId: string,       // Session identifier
 *   expiresAt: string,        // ISO date when checkout expires
 *   summary: {
 *     subtotal: number,
 *     fees: number,
 *     total: number,
 *     currency: string,
 *     items: Array<{ name: string, quantity: number, price: number }>
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { v4 as uuidv4 } from 'uuid'

interface CheckoutRequest {
  eventId: string
  tickets: Array<{
    tierId: string
    quantity: number
  }>
  customerEmail: string
  customerName?: string
  returnUrl?: string
}

interface CheckoutItem {
  tierId: string
  tierName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckoutRequest = await request.json()
    const { eventId, tickets, customerEmail, customerName, returnUrl } = body

    // Validate required fields
    if (!eventId || !tickets || tickets.length === 0 || !customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId, tickets, customerEmail' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const db = getAdminFirestore()
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://boxofficetech.com'

    // Get event
    const eventDoc = await db.collection('events').doc(eventId).get()
    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const event = eventDoc.data()!

    // Check event is still available
    if (event.status !== 'published') {
      return NextResponse.json(
        { error: 'Event is not available for purchase' },
        { status: 400 }
      )
    }

    if (event.isSoldOut) {
      return NextResponse.json(
        { error: 'Event is sold out' },
        { status: 400 }
      )
    }

    // Get promoter
    const promoterDoc = await db.collection('promoters').doc(event.promoterId).get()
    const promoter = promoterDoc.data()
    const promoterSlug = promoter?.slug || 'events'

    // Validate tickets and calculate pricing
    const checkoutItems: CheckoutItem[] = []
    let subtotal = 0

    // Get event ticket tiers (from event or layouts)
    const ticketTiers = event.ticketTiers || []

    for (const ticketRequest of tickets) {
      const tier = ticketTiers.find((t: any) => t.id === ticketRequest.tierId)

      if (!tier) {
        // If no specific tier found, use event pricing
        const unitPrice = event.pricing?.minPrice || 0
        const totalPrice = unitPrice * ticketRequest.quantity

        checkoutItems.push({
          tierId: ticketRequest.tierId || 'general',
          tierName: 'General Admission',
          quantity: ticketRequest.quantity,
          unitPrice,
          totalPrice,
        })
        subtotal += totalPrice
      } else {
        // Check availability
        if (tier.available !== undefined && tier.available < ticketRequest.quantity) {
          return NextResponse.json(
            { error: `Not enough tickets available for ${tier.name}. Only ${tier.available} remaining.` },
            { status: 400 }
          )
        }

        const unitPrice = tier.price || 0
        const totalPrice = unitPrice * ticketRequest.quantity

        checkoutItems.push({
          tierId: tier.id,
          tierName: tier.name,
          quantity: ticketRequest.quantity,
          unitPrice,
          totalPrice,
        })
        subtotal += totalPrice
      }
    }

    // Calculate fees
    const serviceFeePercent = promoter?.fees?.servicePercent || 0.1 // Default 10%
    const serviceFee = Math.round(subtotal * serviceFeePercent * 100) / 100
    const total = subtotal + serviceFee
    const currency = event.pricing?.currency?.toUpperCase() || 'USD'

    // Generate checkout session
    const checkoutId = `ucp_${uuidv4()}`
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

    // Store checkout session in Firestore
    await db.collection('ucp_checkouts').doc(checkoutId).set({
      checkoutId,
      eventId,
      eventName: event.name,
      promoterId: event.promoterId,
      promoterSlug,
      items: checkoutItems,
      customerEmail,
      customerName: customerName || '',
      subtotal,
      serviceFee,
      total,
      currency,
      returnUrl: returnUrl || `${baseUrl}/p/${promoterSlug}/events/${event.slug || eventId}`,
      status: 'pending',
      createdAt: new Date(),
      expiresAt,
      source: 'ucp', // Mark as UCP-initiated
    })

    // Build checkout URL
    const checkoutUrl = new URL(`${baseUrl}/p/${promoterSlug}/checkout`)
    checkoutUrl.searchParams.set('sessionId', checkoutId)
    checkoutUrl.searchParams.set('source', 'ucp')

    return NextResponse.json({
      checkoutUrl: checkoutUrl.toString(),
      checkoutId,
      expiresAt: expiresAt.toISOString(),
      summary: {
        eventName: event.name,
        eventDate: event.startDate?.toDate?.()?.toISOString() || null,
        venue: event.venue?.name || 'Online',
        subtotal,
        fees: serviceFee,
        total,
        currency,
        items: checkoutItems.map(item => ({
          name: item.tierName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      },
    })
  } catch (error) {
    console.error('UCP checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

// GET endpoint to check checkout session status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const checkoutId = searchParams.get('checkoutId')

    if (!checkoutId) {
      return NextResponse.json(
        { error: 'checkoutId is required' },
        { status: 400 }
      )
    }

    const db = getAdminFirestore()
    const checkoutDoc = await db.collection('ucp_checkouts').doc(checkoutId).get()

    if (!checkoutDoc.exists) {
      return NextResponse.json(
        { error: 'Checkout session not found' },
        { status: 404 }
      )
    }

    const checkout = checkoutDoc.data()!

    return NextResponse.json({
      checkoutId: checkout.checkoutId,
      status: checkout.status,
      eventName: checkout.eventName,
      total: checkout.total,
      currency: checkout.currency,
      createdAt: checkout.createdAt?.toDate?.()?.toISOString(),
      expiresAt: checkout.expiresAt?.toDate?.()?.toISOString(),
      completedAt: checkout.completedAt?.toDate?.()?.toISOString() || null,
      orderId: checkout.orderId || null,
    })
  } catch (error) {
    console.error('UCP checkout status error:', error)
    return NextResponse.json(
      { error: 'Failed to get checkout status' },
      { status: 500 }
    )
  }
}
