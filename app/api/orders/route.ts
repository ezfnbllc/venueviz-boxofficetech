/**
 * Orders API
 *
 * GET /api/orders - Get orders for a user by email
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      )
    }

    const db = getAdminFirestore()

    // Fetch orders for the user
    const ordersSnapshot = await db.collection('orders')
      .where('customerEmail', '==', email)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    const orders = ordersSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        orderId: data.orderId,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        status: data.status,
        items: data.items,
        subtotal: data.subtotal,
        serviceFee: data.serviceFee,
        total: data.total,
        currency: data.currency,
        qrCode: data.qrCode,
        tickets: data.tickets,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        paidAt: data.paidAt?.toDate?.()?.toISOString() || data.paidAt,
      }
    })

    return NextResponse.json({ orders })

  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
