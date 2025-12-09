import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, merchantId, environment } = body

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: 'Access token is required',
        error: 'Missing access token'
      }, { status: 400 })
    }

    // Determine Square API URL based on environment
    const baseUrl = environment === 'live'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com'

    // Get merchant info
    const merchantUrl = merchantId
      ? `${baseUrl}/v2/merchants/${merchantId}`
      : `${baseUrl}/v2/merchants/me`

    const response = await fetch(merchantUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json({
        success: false,
        message: 'Square connection failed',
        error: error.errors?.[0]?.detail || 'Invalid access token or permissions'
      })
    }

    const data = await response.json()
    const merchant = data.merchant

    return NextResponse.json({
      success: true,
      message: 'Square connection successful',
      details: {
        businessName: merchant?.business_name || 'Unknown',
        merchantId: merchant?.id || merchantId || 'Auto-detected',
        country: merchant?.country || 'US',
        currency: merchant?.currency || 'USD',
        environment: environment === 'live' ? 'Live' : 'Sandbox'
      }
    })
  } catch (error: any) {
    console.error('Square test error:', error)
    return NextResponse.json({
      success: false,
      message: 'Connection test failed',
      error: error.message || 'Unknown error'
    }, { status: 500 })
  }
}
