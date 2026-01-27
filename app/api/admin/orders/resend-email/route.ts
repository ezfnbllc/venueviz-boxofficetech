/**
 * Resend Order Email API
 *
 * POST /api/admin/orders/resend-email
 *
 * Resends order confirmation email for a specific order.
 * Queues the email for review (in queue mode) or sends directly (in live mode).
 *
 * Body:
 * - orderId: The order ID to resend email for
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { ResendService } from '@/lib/services/resendService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      )
    }

    const db = getAdminFirestore()

    // Get the order
    const orderDoc = await db.collection('orders').doc(orderId).get()

    if (!orderDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    const order = orderDoc.data()!

    // Get event details
    let eventData = null
    if (order.eventId) {
      const eventDoc = await db.collection('events').doc(order.eventId).get()
      if (eventDoc.exists) {
        eventData = eventDoc.data()
      }
    }

    // Get promoter details
    let promoter = {
      name: 'BoxOfficeTech',
      slug: 'bot',
      logo: undefined as string | undefined,
      primaryColor: '#6ac045',
      supportEmail: undefined as string | undefined,
    }

    const promoterId = order.promoterId || eventData?.promoterId
    if (promoterId) {
      const promoterDoc = await db.collection('promoters').doc(promoterId).get()
      if (promoterDoc.exists) {
        const promoterData = promoterDoc.data()!
        promoter = {
          name: promoterData.name || promoter.name,
          slug: promoterData.slug || promoter.slug,
          logo: promoterData.logo || promoterData.branding?.logo,
          primaryColor: promoterData.branding?.primaryColor || promoter.primaryColor,
          supportEmail: promoterData.email,
        }
      }
    }

    // Get customer email
    const customerEmail = order.customerEmail || order.customer?.email
    const customerName = order.customerName || order.customer?.name || 'Customer'

    if (!customerEmail) {
      return NextResponse.json(
        { success: false, error: 'Order has no customer email' },
        { status: 400 }
      )
    }

    // Build ticket details for the email
    const tickets = order.tickets?.map((ticket: any) => ({
      name: ticket.name || ticket.ticketType || 'Ticket',
      quantity: ticket.quantity || 1,
      price: ticket.price || 0,
    })) || []

    // Calculate totals
    const subtotal = order.subtotal || order.total || 0
    const serviceFee = order.serviceFee || 0
    const total = order.total || subtotal + serviceFee

    // Build event details
    const eventName = order.eventName || eventData?.basics?.name || eventData?.name || 'Event'
    const eventDate = order.eventDate || eventData?.basics?.date || eventData?.date || 'Date TBD'
    const eventTime = order.eventTime || eventData?.basics?.time || eventData?.time
    const venueName = order.venueName || eventData?.venue?.name || eventData?.venueName
    const venueAddress = order.venueAddress || eventData?.venue?.address || eventData?.venueAddress

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://boxofficetech.com'

    // Send/queue the order confirmation email
    const result = await ResendService.sendOrderConfirmation({
      orderId: orderId,
      customerName: customerName,
      customerEmail: customerEmail,
      eventName: eventName,
      eventDate: eventDate,
      eventTime: eventTime,
      venueName: venueName,
      venueAddress: venueAddress,
      tickets: tickets,
      subtotal: subtotal,
      serviceFee: serviceFee,
      total: total,
      currency: order.currency || 'usd',
      qrCodeUrl: order.qrCodeUrl,
      orderUrl: `${baseUrl}/p/${promoter.slug}/orders/${orderId}`,
      promoter: promoter,
    })

    if (result.success) {
      // Update order to indicate email was resent
      await orderDoc.ref.update({
        lastEmailSentAt: new Date(),
        emailResendCount: (order.emailResendCount || 0) + 1,
      })

      const isQueued = ResendService.isQueueMode()
      return NextResponse.json({
        success: true,
        message: isQueued
          ? 'Email queued for review'
          : 'Email sent successfully',
        queued: isQueued,
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[ResendOrderEmail] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to resend email' },
      { status: 500 }
    )
  }
}
