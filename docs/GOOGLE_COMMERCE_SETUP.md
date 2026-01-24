# Google Commerce Integration Setup

This document describes how to set up Google's commerce integrations for the BoxOfficeTech platform.

## Table of Contents
1. [Google Wallet API](#1-google-wallet-api)
2. [Universal Commerce Protocol (UCP)](#2-universal-commerce-protocol-ucp)
3. [Google Merchant Center Feed](#3-google-merchant-center-feed)
4. [Event Ticket Seller Certification](#4-event-ticket-seller-certification)

---

## 1. Google Wallet API

### Overview
The Google Wallet API allows users to save their event tickets directly to their Google Wallet app for easy access at the event venue.

### Setup Steps

#### 1.1 Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the "Google Wallet API"

#### 1.2 Create a Service Account
1. Go to IAM & Admin > Service Accounts
2. Create a new service account
3. Grant it the "Wallet Object Creator" role
4. Create a JSON key and download it

#### 1.3 Apply for Wallet Issuer Account
1. Go to [Google Pay & Wallet Console](https://pay.google.com/business/console)
2. Apply for a Wallet Issuer account
3. Wait for approval (typically 1-2 weeks)

#### 1.4 Configure Environment Variables
Add these to your `.env.local` file:

```bash
GOOGLE_WALLET_ISSUER_ID=your-issuer-id
GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=wallet-service@project.iam.gserviceaccount.com
GOOGLE_WALLET_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GOOGLE_WALLET_ORIGINS=https://yourdomain.com
```

### API Endpoints
- `GET /api/wallet/google` - Check configuration status
- `POST /api/wallet/google` - Generate passes for an order

### Usage
The "Add to Google Wallet" button appears automatically on the order confirmation page when configured.

---

## 2. Universal Commerce Protocol (UCP)

### Overview
UCP enables Google's AI (Gemini, AI Mode) to query your event inventory and initiate purchases directly from search results.

### API Endpoints

#### Inventory API
```
GET /api/ucp/inventory
```

Query Parameters:
- `promoterSlug` - Filter by promoter (optional)
- `eventId` - Get specific event (optional)
- `upcoming` - Only return upcoming events (default: true)
- `limit` - Max results (default: 50, max: 100)

Response:
```json
{
  "products": [
    {
      "id": "event_abc123",
      "title": "Concert Name",
      "description": "Event description",
      "link": "https://domain.com/p/promoter/events/event-slug",
      "imageLink": "https://...",
      "availability": "in_stock",
      "price": { "value": 50, "currency": "USD" },
      "customAttributes": {
        "eventDate": "January 15, 2026",
        "venue": "Madison Square Garden, New York",
        "ticketsAvailable": 150
      }
    }
  ],
  "totalCount": 1,
  "hasMore": false
}
```

#### Checkout API
```
POST /api/ucp/checkout
```

Request Body:
```json
{
  "eventId": "abc123",
  "tickets": [
    { "tierId": "general", "quantity": 2 }
  ],
  "customerEmail": "user@example.com",
  "customerName": "John Doe",
  "returnUrl": "https://..."
}
```

Response:
```json
{
  "checkoutUrl": "https://domain.com/p/promoter/checkout?sessionId=...",
  "checkoutId": "ucp_uuid",
  "expiresAt": "2026-01-24T12:30:00Z",
  "summary": {
    "eventName": "Concert Name",
    "subtotal": 100,
    "fees": 10,
    "total": 110,
    "currency": "USD"
  }
}
```

### UCP Enrollment
UCP is currently rolling out to qualified US retailers. To apply:
1. Contact Google's commerce partnerships team
2. Ensure your checkout flow supports embedded iframe mode
3. Integrate Google Pay as a payment method

---

## 3. Google Merchant Center Feed

### Overview
The Merchant Center feed enables your events to appear in:
- Google Shopping
- Free product listings
- Google search results

### Feed URL
```
GET /api/feeds/google-merchant
```

Query Parameters:
- `promoterSlug` - Filter by specific promoter (optional)
- `format` - 'xml' (default) or 'json'

### Setup Steps

#### 3.1 Create Merchant Center Account
1. Go to [Google Merchant Center](https://merchants.google.com)
2. Create an account and verify your website

#### 3.2 Add Feed
1. Go to Products > Feeds
2. Click "+" to add a new feed
3. Select "Scheduled fetch"
4. Enter feed URL: `https://yourdomain.com/api/feeds/google-merchant`
5. Set fetch frequency (recommended: daily)

#### 3.3 Map Custom Attributes
The feed includes custom labels for event-specific data:
- `custom_label_0`: Event date
- `custom_label_1`: Venue name
- `custom_label_2`: Event location

---

## 4. Event Ticket Seller Certification

### Overview
Google requires certification before you can run Google Ads for ticket sales. This applies to:
- Primary ticket sellers
- Resellers
- Secondary market platforms
- Affiliate ticket listings

### Certification Process

#### 4.1 Prerequisites
Before applying, ensure you have:
- A clear refund policy displayed on your website
- Transparent pricing (no hidden fees)
- Customer support contact information
- Terms of service and privacy policy
- Secure checkout (HTTPS)

#### 4.2 Apply for Certification
1. Go to [Event Ticket Seller Certification](https://support.google.com/google-ads/contact/event_ticket_seller_certification)
2. Fill out the certification form with:
   - Business information
   - Website URL
   - Ticket sourcing information
   - Refund/cancellation policies
3. Submit supporting documentation

#### 4.3 Certification Requirements
Google verifies:
- **Transparency**: Clear disclosure of ticket sources (primary vs resale)
- **Pricing**: All fees shown before checkout
- **Customer Service**: Working contact methods
- **Fulfillment**: Reliable ticket delivery
- **Compliance**: Adherence to local laws and venue policies

#### 4.4 Timeline
- Initial review: 1-2 weeks
- Additional verification may be required
- Re-certification: Annual

### Compliance Checklist

- [ ] Display "Primary" or "Resale" label on all tickets
- [ ] Show total price including all fees on event pages
- [ ] Provide 24/7 customer support for day-of-event issues
- [ ] Include venue address and event time clearly
- [ ] Have a published refund policy
- [ ] Use secure payment processing (PCI compliant)
- [ ] Deliver tickets electronically (email/app) within 24 hours
- [ ] Support Google Wallet for digital ticket storage

---

## Environment Variables Summary

```bash
# Google Wallet API
GOOGLE_WALLET_ISSUER_ID=
GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=
GOOGLE_WALLET_PRIVATE_KEY=
GOOGLE_WALLET_ORIGINS=

# Base URL (required for all integrations)
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

---

## Testing

### Google Wallet
Use the test issuer ID provided during enrollment to test pass generation without actual wallet integration.

### UCP
Test the inventory and checkout APIs locally:
```bash
# Test inventory
curl http://localhost:3000/api/ucp/inventory

# Test checkout
curl -X POST http://localhost:3000/api/ucp/checkout \
  -H "Content-Type: application/json" \
  -d '{"eventId":"test","tickets":[{"tierId":"general","quantity":1}],"customerEmail":"test@test.com"}'
```

### Merchant Feed
Validate your feed using [Google's Feed Testing Tool](https://merchants.google.com/mc/feeds/feedtest).

---

## Support

For implementation questions, contact:
- Google Wallet: [Developer Support](https://developers.google.com/wallet/support)
- Merchant Center: [Help Center](https://support.google.com/merchants)
- Google Ads Certification: [Support Form](https://support.google.com/google-ads/gethelp)
