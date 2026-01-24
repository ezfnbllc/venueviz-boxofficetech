/**
 * Google Wallet Service
 * Handles creation and management of digital event tickets in Google Wallet
 *
 * Documentation: https://developers.google.com/wallet/tickets/events
 */

import * as jwt from 'jsonwebtoken'
import {
  EventTicketClass,
  EventTicketObject,
  CreatePassRequest,
  CreatePassResponse,
  GoogleWalletConfig,
} from './types'

// Google Wallet API base URLs
const WALLET_API_BASE = 'https://walletobjects.googleapis.com/walletobjects/v1'
const SAVE_LINK_BASE = 'https://pay.google.com/gp/v/save'

// Default configuration from environment
function getConfig(): GoogleWalletConfig {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID
  const serviceAccountEmail = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!issuerId || !serviceAccountEmail || !privateKey) {
    throw new Error('Google Wallet configuration missing. Required env vars: GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL, GOOGLE_WALLET_PRIVATE_KEY')
  }

  return {
    issuerId,
    serviceAccountEmail,
    privateKey,
    origins: process.env.GOOGLE_WALLET_ORIGINS?.split(','),
  }
}

/**
 * Get OAuth2 access token for Google APIs
 */
async function getAccessToken(config: GoogleWalletConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: config.serviceAccountEmail,
    scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const assertion = jwt.sign(payload, config.privateKey, { algorithm: 'RS256' })

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get access token: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

/**
 * Create an Event Ticket Class (template) for an event
 * Should be called once per event
 */
export async function createEventTicketClass(
  eventId: string,
  eventName: string,
  eventDate: string,
  eventTime: string | undefined,
  venueName: string,
  venueAddress: string,
  promoterName: string,
  promoterLogo?: string,
  heroImage?: string,
  hexBackgroundColor?: string,
): Promise<EventTicketClass> {
  const config = getConfig()
  const classId = `${config.issuerId}.event_${eventId}`

  // Format date/time for Google Wallet
  const startDateTime = eventTime
    ? `${eventDate}T${eventTime}:00`
    : `${eventDate}T00:00:00`

  const ticketClass: EventTicketClass = {
    id: classId,
    issuerName: promoterName,
    eventName: {
      defaultValue: {
        language: 'en-US',
        value: eventName,
      },
    },
    eventId: eventId,
    logo: {
      uri: promoterLogo || `${process.env.NEXT_PUBLIC_BASE_URL || ''}/images/logo.svg`,
      description: promoterName,
    },
    ...(heroImage && {
      heroImage: {
        uri: heroImage,
        description: eventName,
      },
    }),
    venue: {
      name: {
        defaultValue: {
          language: 'en-US',
          value: venueName,
        },
      },
      address: {
        defaultValue: {
          language: 'en-US',
          value: venueAddress,
        },
      },
    },
    dateTime: {
      start: startDateTime,
      doorsOpen: startDateTime,
    },
    reviewStatus: 'UNDER_REVIEW',
    countryCode: 'US',
    homepageUri: {
      uri: process.env.NEXT_PUBLIC_BASE_URL || 'https://boxofficetech.com',
      description: 'Event Website',
    },
    ...(hexBackgroundColor && { hexBackgroundColor }),
    enableSmartTap: true,
  }

  // Try to create or update the class
  const accessToken = await getAccessToken(config)

  // First try to get existing class
  const getResponse = await fetch(`${WALLET_API_BASE}/eventTicketClass/${classId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (getResponse.ok) {
    // Class exists, update it
    const updateResponse = await fetch(`${WALLET_API_BASE}/eventTicketClass/${classId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ticketClass),
    })

    if (!updateResponse.ok) {
      const error = await updateResponse.text()
      console.error('Failed to update ticket class:', error)
      // Return the class anyway for JWT generation
    }
  } else if (getResponse.status === 404) {
    // Class doesn't exist, create it
    const createResponse = await fetch(`${WALLET_API_BASE}/eventTicketClass`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ticketClass),
    })

    if (!createResponse.ok) {
      const error = await createResponse.text()
      console.error('Failed to create ticket class:', error)
      // Continue anyway - we can still create passes with JWT
    }
  }

  return ticketClass
}

/**
 * Create an Event Ticket Object (individual ticket)
 */
export function createEventTicketObject(
  request: CreatePassRequest,
  classId: string,
  issuerId: string,
): EventTicketObject {
  const objectId = `${issuerId}.ticket_${request.orderId}_${request.ticketId}`

  // Convert price to micros (1/1,000,000 of currency unit)
  const priceMicros = Math.round(request.price * 1000000).toString()

  const ticketObject: EventTicketObject = {
    id: objectId,
    classId: classId,
    state: 'ACTIVE',
    ticketHolderName: request.holderName || 'Guest',
    ticketNumber: request.ticketId,
    ticketType: {
      defaultValue: {
        language: 'en-US',
        value: request.ticketType,
      },
    },
    ...(request.section || request.row || request.seat) && {
      seatInfo: {
        ...(request.section && {
          section: {
            defaultValue: { language: 'en-US', value: String(request.section) },
          },
        }),
        ...(request.row && {
          row: {
            defaultValue: { language: 'en-US', value: String(request.row) },
          },
        }),
        ...(request.seat && {
          seat: {
            defaultValue: { language: 'en-US', value: String(request.seat) },
          },
        }),
      },
    },
    reservationInfo: {
      confirmationCode: request.orderId,
    },
    faceValue: {
      micros: priceMicros,
      currencyCode: request.currency.toUpperCase(),
    },
    barcode: {
      type: 'QR_CODE',
      value: request.qrCode || `${request.orderId}-${request.ticketId}`,
      alternateText: `Order: ${request.orderId}`,
    },
    textModulesData: [
      {
        header: 'Order Number',
        body: request.orderId,
        id: 'order_number',
      },
      ...(request.holderEmail ? [{
        header: 'Email',
        body: request.holderEmail,
        id: 'email',
      }] : []),
    ],
    linksModuleData: {
      uris: [
        {
          uri: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/p/${request.orderId.split('-')[0]?.toLowerCase() || 'ticket'}/account/orders/${request.orderId}`,
          description: 'View Order Details',
          id: 'order_link',
        },
      ],
    },
  }

  return ticketObject
}

/**
 * Generate a signed JWT for adding a pass to Google Wallet
 */
export function generateSaveJwt(
  ticketClass: EventTicketClass,
  ticketObject: EventTicketObject,
  config: GoogleWalletConfig,
): string {
  const claims = {
    iss: config.serviceAccountEmail,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    payload: {
      eventTicketClasses: [ticketClass],
      eventTicketObjects: [ticketObject],
    },
    origins: config.origins || [process.env.NEXT_PUBLIC_BASE_URL || 'https://boxofficetech.com'],
  }

  return jwt.sign(claims, config.privateKey, { algorithm: 'RS256' })
}

/**
 * Generate the "Add to Google Wallet" URL
 */
export function generateSaveUrl(signedJwt: string): string {
  return `${SAVE_LINK_BASE}/${signedJwt}`
}

/**
 * Main function to create a pass and get the save URL
 */
export async function createEventTicketPass(request: CreatePassRequest): Promise<CreatePassResponse> {
  const config = getConfig()

  // Create or update the ticket class for this event
  const ticketClass = await createEventTicketClass(
    request.eventId,
    request.eventName,
    request.eventDate,
    request.eventTime,
    request.venueName,
    request.venueAddress || request.venueName,
    request.promoterName,
    request.promoterLogo,
    undefined, // heroImage
    '#1d1d1d', // hexBackgroundColor
  )

  // Create the ticket object (individual ticket)
  const ticketObject = createEventTicketObject(
    request,
    ticketClass.id,
    config.issuerId,
  )

  // Generate signed JWT
  const signedJwt = generateSaveJwt(ticketClass, ticketObject, config)

  // Generate save URL
  const saveUrl = generateSaveUrl(signedJwt)

  return {
    saveUrl,
    jwt: signedJwt,
    passId: ticketObject.id,
  }
}

/**
 * Create passes for all tickets in an order
 */
export async function createPassesForOrder(
  orderId: string,
  tickets: Array<{
    id: string
    tierName: string
    section?: string | null
    row?: number | null
    seat?: number | null
    price: number
    eventId: string
    eventName: string
    qrCode?: string
  }>,
  eventDate: string,
  eventTime: string | undefined,
  venueName: string,
  venueAddress: string | undefined,
  promoterName: string,
  promoterLogo: string | undefined,
  currency: string,
  holderName?: string,
  holderEmail?: string,
): Promise<CreatePassResponse[]> {
  const passes: CreatePassResponse[] = []

  for (const ticket of tickets) {
    try {
      const pass = await createEventTicketPass({
        orderId,
        ticketId: ticket.id,
        eventId: ticket.eventId,
        eventName: ticket.eventName,
        eventDate,
        eventTime,
        venueName,
        venueAddress,
        ticketType: ticket.tierName,
        section: ticket.section || undefined,
        row: ticket.row || undefined,
        seat: ticket.seat || undefined,
        price: ticket.price,
        currency,
        holderName,
        holderEmail,
        promoterName,
        promoterLogo,
        qrCode: ticket.qrCode,
      })
      passes.push(pass)
    } catch (error) {
      console.error(`Failed to create pass for ticket ${ticket.id}:`, error)
      // Continue with other tickets
    }
  }

  return passes
}

/**
 * Check if Google Wallet is configured
 */
export function isGoogleWalletConfigured(): boolean {
  return !!(
    process.env.GOOGLE_WALLET_ISSUER_ID &&
    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_WALLET_PRIVATE_KEY
  )
}
