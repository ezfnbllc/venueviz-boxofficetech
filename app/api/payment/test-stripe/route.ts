import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, environment } = body

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: 'API key is required',
        error: 'Missing API key'
      }, { status: 400 })
    }

    // Determine Stripe API URL based on environment
    // Both sandbox and live use the same API, the key determines the mode
    const stripeUrl = 'https://api.stripe.com/v1/balance'

    const response = await fetch(stripeUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json({
        success: false,
        message: 'Stripe connection failed',
        error: error.error?.message || 'Invalid API key or permissions'
      })
    }

    const data = await response.json()

    // Check if it's a test key or live key
    const isTestKey = apiKey.startsWith('sk_test_')
    const isLiveKey = apiKey.startsWith('sk_live_')

    return NextResponse.json({
      success: true,
      message: 'Stripe connection successful',
      details: {
        mode: isTestKey ? 'Test' : isLiveKey ? 'Live' : 'Unknown',
        currency: data.available?.[0]?.currency?.toUpperCase() || 'USD',
        availableBalance: data.available?.[0]?.amount ? `${(data.available[0].amount / 100).toFixed(2)}` : '0.00',
        pendingBalance: data.pending?.[0]?.amount ? `${(data.pending[0].amount / 100).toFixed(2)}` : '0.00'
      }
    })
  } catch (error: any) {
    console.error('Stripe test error:', error)
    return NextResponse.json({
      success: false,
      message: 'Connection test failed',
      error: error.message || 'Unknown error'
    }, { status: 500 })
  }
}
