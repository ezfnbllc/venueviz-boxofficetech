/**
 * Google Wallet Pass Generation API
 *
 * POST /api/wallet/google
 * Generates Google Wallet passes for tickets in an order
 *
 * Request body:
 * {
 *   orderId: string,
 *   ticketIds?: string[] // Optional: specific tickets, defaults to all
 * }
 *
 * Response:
 * {
 *   passes: Array<{
 *     ticketId: string,
 *     saveUrl: string,
 *     passId: string
 *   }>,
 *   allTicketsUrl?: string // Combined URL for all tickets
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'
import {
  createPassesForOrder,
  isGoogleWalletConfigured,
} from '@/lib/google-wallet'

export async function POST(request: NextRequest) {
  try {
    // Check if Google Wallet is configured
    if (!isGoogleWalletConfigured()) {
      return NextResponse.json(
        { error: 'Google Wallet is not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { orderId, ticketIds } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      )
    }

    // Fetch order from Firestore
    const db = getAdminFirestore()
    const ordersSnapshot = await db.collection('orders')
      .where('orderId', '==', orderId)
      .limit(1)
      .get()

    if (ordersSnapshot.empty) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const orderDoc = ordersSnapshot.docs[0]
    const order = orderDoc.data()

    // Verify order is confirmed/completed
    if (!['confirmed', 'completed'].includes(order.status)) {
      return NextResponse.json(
        { error: 'Order must be confirmed or completed to generate passes' },
        { status: 400 }
      )
    }

    // Get tickets from order
    let tickets = order.tickets || []

    // Filter to specific tickets if requested
    if (ticketIds && ticketIds.length > 0) {
      tickets = tickets.filter((t: { id: string }) => ticketIds.includes(t.id))
    }

    if (tickets.length === 0) {
      return NextResponse.json(
        { error: 'No tickets found in order' },
        { status: 400 }
      )
    }

    // Get event details for the pass
    const eventId = order.eventId
    let eventDate = order.eventDate
    let eventTime: string | undefined
    let venueName = order.venueName || 'Venue'
    let venueAddress: string | undefined

    // Try to get more event details from Firestore
    if (eventId) {
      const eventDoc = await db.collection('events').doc(eventId).get()
      if (eventDoc.exists) {
        const event = eventDoc.data()
        if (event) {
          eventDate = event.startDate?.toDate?.()?.toISOString?.()?.split('T')[0] || eventDate
          eventTime = event.startTime
          venueName = event.venue?.name || venueName

          // Build venue address
          if (event.venue) {
            const addressParts = [
              event.venue.streetAddress1,
              event.venue.city,
              event.venue.state,
              event.venue.zipCode,
            ].filter(Boolean)
            venueAddress = addressParts.join(', ')
          }
        }
      }
    }

    // Get promoter details
    let promoterName = 'BoxOfficeTech'
    let promoterLogo: string | undefined

    if (order.promoterSlug) {
      const promoterSnapshot = await db.collection('promoters')
        .where('slug', '==', order.promoterSlug)
        .limit(1)
        .get()

      if (!promoterSnapshot.empty) {
        const promoter = promoterSnapshot.docs[0].data()
        promoterName = promoter.name || promoterName
        promoterLogo = promoter.logo
      }
    }

    // Generate passes for all tickets
    const passes = await createPassesForOrder(
      orderId,
      tickets.map((t: {
        id: string
        tierName: string
        section?: string | null
        row?: number | null
        seat?: number | null
        price: number
        eventId: string
        eventName: string
        qrCode?: string
      }) => ({
        id: t.id,
        tierName: t.tierName || 'General Admission',
        section: t.section,
        row: t.row,
        seat: t.seat,
        price: t.price || 0,
        eventId: t.eventId || eventId,
        eventName: t.eventName || order.eventName,
        qrCode: t.qrCode,
      })),
      eventDate,
      eventTime,
      venueName,
      venueAddress,
      promoterName,
      promoterLogo,
      order.currency || 'USD',
      order.customerName,
      order.customerEmail,
    )

    // Store pass info in order for future reference
    const passInfo = passes.map((pass, index) => ({
      ticketId: tickets[index].id,
      passId: pass.passId,
      saveUrl: pass.saveUrl,
      createdAt: new Date(),
    }))

    await orderDoc.ref.update({
      googleWalletPasses: passInfo,
      updatedAt: new Date(),
    })

    return NextResponse.json({
      passes: passes.map((pass, index) => ({
        ticketId: tickets[index].id,
        saveUrl: pass.saveUrl,
        passId: pass.passId,
      })),
      // If single ticket, also provide direct URL
      ...(passes.length === 1 && { saveUrl: passes[0].saveUrl }),
    })
  } catch (error) {
    console.error('Error generating Google Wallet passes:', error)
    return NextResponse.json(
      { error: 'Failed to generate passes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check configuration status
export async function GET() {
  const configured = isGoogleWalletConfigured()

  return NextResponse.json({
    configured,
    message: configured
      ? 'Google Wallet is configured and ready'
      : 'Google Wallet is not configured. Set GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL, and GOOGLE_WALLET_PRIVATE_KEY environment variables.',
  })
}
