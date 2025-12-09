import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, secretKey, environment } = body

    if (!clientId || !secretKey) {
      return NextResponse.json({
        success: false,
        message: 'Client ID and Secret are required',
        error: 'Missing credentials'
      }, { status: 400 })
    }

    // Determine PayPal API URL based on environment
    const baseUrl = environment === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com'

    // Get access token
    const authString = Buffer.from(`${clientId}:${secretKey}`).toString('base64')

    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json()
      return NextResponse.json({
        success: false,
        message: 'PayPal authentication failed',
        error: error.error_description || 'Invalid credentials'
      })
    }

    const tokenData = await tokenResponse.json()

    // Get merchant identity info
    const identityResponse = await fetch(`${baseUrl}/v1/identity/openidconnect/userinfo?schema=openid`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    let merchantEmail = 'N/A'
    if (identityResponse.ok) {
      const identity = await identityResponse.json()
      merchantEmail = identity.email || identity.emails?.[0]?.value || 'N/A'
    }

    return NextResponse.json({
      success: true,
      message: 'PayPal connection successful',
      details: {
        appId: tokenData.app_id || 'Connected',
        scope: tokenData.scope?.split(' ').slice(0, 3).join(', ') || 'Standard',
        expiresIn: `${Math.floor(tokenData.expires_in / 60)} minutes`,
        environment: environment === 'live' ? 'Live' : 'Sandbox',
        merchantEmail
      }
    })
  } catch (error: any) {
    console.error('PayPal test error:', error)
    return NextResponse.json({
      success: false,
      message: 'Connection test failed',
      error: error.message || 'Unknown error'
    }, { status: 500 })
  }
}
