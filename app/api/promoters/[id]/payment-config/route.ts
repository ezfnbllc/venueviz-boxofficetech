/**
 * Get Promoter Payment Configuration
 *
 * GET /api/promoters/[id]/payment-config
 *
 * Returns the public payment configuration for a promoter (e.g., Stripe publishable key)
 * Only returns non-sensitive information safe for client-side use.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const bySlug = searchParams.get('bySlug') === 'true'

    const db = getAdminFirestore()

    let promoterId = id

    // If bySlug is true, look up promoter by slug first
    if (bySlug) {
      const promoterSnapshot = await db.collection('promoters')
        .where('slug', '==', id)
        .limit(1)
        .get()

      if (promoterSnapshot.empty) {
        return NextResponse.json({
          success: false,
          error: 'Promoter not found'
        }, { status: 404 })
      }

      promoterId = promoterSnapshot.docs[0].id
    }

    // Get payment gateway for this promoter
    const gatewaySnapshot = await db.collection('payment_gateways')
      .where('promoterId', '==', promoterId)
      .limit(1)
      .get()

    if (gatewaySnapshot.empty) {
      return NextResponse.json({
        success: false,
        error: 'Payment gateway not configured'
      }, { status: 404 })
    }

    const gateway = gatewaySnapshot.docs[0].data()

    // Only return public/non-sensitive information
    return NextResponse.json({
      success: true,
      data: {
        provider: gateway.provider,
        environment: gateway.environment,
        isActive: gateway.isActive,
        // Only include publishable key for Stripe (it's meant to be public)
        publishableKey: gateway.provider === 'stripe'
          ? gateway.credentials?.publishableKey
          : undefined,
        // For PayPal, client ID is also public
        clientId: gateway.provider === 'paypal'
          ? gateway.credentials?.clientId
          : undefined,
      }
    })
  } catch (error: any) {
    console.error('Error fetching payment config:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
