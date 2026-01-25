/**
 * Check Guest Customer API
 *
 * POST /api/customers/check-guest
 *
 * Checks if a customer with the given email exists for a tenant.
 * Used during guest checkout to notify returning customers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const { email, promoterSlug } = await request.json()

    if (!email || !promoterSlug) {
      return NextResponse.json(
        { error: 'Email and promoterSlug are required' },
        { status: 400 }
      )
    }

    const db = getAdminFirestore()

    // Check if customer exists for this tenant
    const customersSnapshot = await db.collection('customers')
      .where('promoterSlug', '==', promoterSlug)
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get()

    if (customersSnapshot.empty) {
      return NextResponse.json({
        exists: false,
      })
    }

    const customer = customersSnapshot.docs[0].data()

    // Count actual orders from orders collection (matches admin count - all orders for this customer)
    const ordersSnapshot = await db.collection('orders')
      .where('promoterSlug', '==', promoterSlug)
      .where('customerEmail', '==', email.toLowerCase())
      .get()

    const actualOrderCount = ordersSnapshot.size

    // Return limited info for privacy
    return NextResponse.json({
      exists: true,
      firstName: customer.firstName || null,
      orderCount: actualOrderCount,
      isGuest: customer.isGuest || false,
    })
  } catch (error) {
    console.error('Error checking guest customer:', error)
    return NextResponse.json(
      { error: 'Failed to check customer' },
      { status: 500 }
    )
  }
}
