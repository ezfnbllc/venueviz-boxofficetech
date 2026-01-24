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

### Configuration Options

The platform supports **two configuration approaches**:

| Approach | Use Case | Configuration Location |
|----------|----------|----------------------|
| **Platform-Level** | All tenants share one Google Wallet issuer | Vercel Environment Variables |
| **Per-Tenant** | Each tenant has their own branding | Firestore `promoters` collection |

**Priority**: Tenant-specific config → Platform config → Not available

---

### Option A: Platform-Level Configuration (Recommended for Most Cases)

All tenants use the platform's Google Wallet issuer account. Tickets display:
- **Issuer**: Platform name (e.g., "BoxOfficeTech")
- **Event/Promoter**: Shows on the ticket itself

#### Setup Steps

##### 1. Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the "Google Wallet API"

##### 2. Create a Service Account
1. Go to **IAM & Admin** → **Service Accounts**
2. Click **"+ CREATE SERVICE ACCOUNT"**
3. Name it (e.g., `wallet-pass-generator`)
4. Click **"CREATE AND CONTINUE"** → **"DONE"**
5. Click on the service account → **"KEYS"** tab
6. **"ADD KEY"** → **"Create new key"** → **JSON**
7. Download and save the JSON file securely

##### 3. Get Wallet Issuer Account
1. Go to [Google Pay & Wallet Console](https://pay.google.com/business/console)
2. Navigate to **Google Wallet API**
3. Note your **Issuer ID** (format: `3388000000023XXXXXX`)
4. Click **"Register for access to the REST API"**
5. Add your service account email

##### 4. Add to Vercel Environment Variables
In Vercel Dashboard → Settings → Environment Variables:

```bash
GOOGLE_WALLET_ISSUER_ID=3388000000023075621
GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=wallet-pass-generator@yourproject.iam.gserviceaccount.com
GOOGLE_WALLET_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"
```

**Note**: The private key must include `\n` characters for line breaks.

---

### Option B: Per-Tenant Configuration

Each tenant can have their own Google Wallet issuer for custom branding on passes.

#### When to Use
- Tenant wants their company name as the pass issuer
- Tenant has their own Google Pay & Wallet Console account
- White-label requirement where platform branding should be hidden

#### Setup Steps (Per Tenant)

##### 1. Tenant Creates Their Own Google Wallet Issuer
The tenant must:
1. Create a Google Cloud project
2. Enable Google Wallet API
3. Create a service account with JSON key
4. Apply for Wallet Issuer account at [pay.google.com/business/console](https://pay.google.com/business/console)

##### 2. Add Configuration to Firestore
Store the tenant's credentials in their promoter document:

```
Firestore Path: promoters/{promoterId}

{
  "name": "Tenant Name",
  "slug": "tenant-slug",
  ... other fields ...

  "googleWallet": {
    "issuerId": "3388000000023XXXXXX",
    "serviceAccountEmail": "wallet@tenant-project.iam.gserviceaccount.com",
    "privateKey": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
    "origins": ["https://tenant-domain.com"]  // Optional
  }
}
```

##### 3. Admin UI for Tenant Configuration
You can add a settings page in the admin panel to allow tenants to input their Google Wallet credentials:

```typescript
// Example Firestore update
await db.collection('promoters').doc(promoterId).update({
  googleWallet: {
    issuerId: formData.issuerId,
    serviceAccountEmail: formData.serviceAccountEmail,
    privateKey: formData.privateKey,
  }
})

// Clear the config cache after update
import { clearConfigCache } from '@/lib/google-wallet'
clearConfigCache(promoterId)
```

---

### API Endpoints
- `GET /api/wallet/google` - Check platform configuration status
- `POST /api/wallet/google` - Generate passes for an order (auto-detects tenant config)

### How It Works
1. When generating a pass, the system checks the promoter's Firestore document for `googleWallet` config
2. If found, uses tenant-specific credentials
3. If not found, falls back to platform-level environment variables
4. Config is cached for 5 minutes to reduce Firestore reads

### Usage
The "Add to Google Wallet" button appears automatically on the order confirmation page when configured (either platform or tenant level).

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

### Platform-Level (Vercel)

```bash
# Google Wallet API (Platform Default)
GOOGLE_WALLET_ISSUER_ID=3388000000023075621
GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=wallet-pass-generator@yourproject.iam.gserviceaccount.com
GOOGLE_WALLET_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Base URL (required for all integrations)
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### Per-Tenant (Firestore)

```
Collection: promoters
Document: {promoterId}
Field: googleWallet

{
  "googleWallet": {
    "issuerId": "3388000000023XXXXXX",
    "serviceAccountEmail": "wallet@tenant.iam.gserviceaccount.com",
    "privateKey": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
    "origins": ["https://tenant-domain.com"]
  }
}
```

---

## Testing

### Google Wallet

#### Demo Mode Testing
When you first set up Google Wallet, you're in **Demo Mode**:
- Passes only work on accounts added as testers
- Add test accounts in Google Pay & Wallet Console → Google Wallet API → Testers

#### Request Publishing Access
To go live:
1. Create at least one Event Ticket Class in the console
2. Complete your business profile
3. Click "Request publishing access"
4. Approval takes 1-2 weeks

#### Test API Locally
```bash
# Check configuration
curl http://localhost:3000/api/wallet/google

# Generate pass (requires valid order)
curl -X POST http://localhost:3000/api/wallet/google \
  -H "Content-Type: application/json" \
  -d '{"orderId":"ORD-1234567890-ABC123"}'
```

### UCP
Test the inventory and checkout APIs locally:
```bash
# Test inventory
curl http://localhost:3000/api/ucp/inventory

# Test inventory for specific promoter
curl "http://localhost:3000/api/ucp/inventory?promoterSlug=bot"

# Test checkout
curl -X POST http://localhost:3000/api/ucp/checkout \
  -H "Content-Type: application/json" \
  -d '{"eventId":"test","tickets":[{"tierId":"general","quantity":1}],"customerEmail":"test@test.com"}'
```

### Merchant Feed
```bash
# Get XML feed
curl http://localhost:3000/api/feeds/google-merchant

# Get JSON feed
curl "http://localhost:3000/api/feeds/google-merchant?format=json"

# Get feed for specific promoter
curl "http://localhost:3000/api/feeds/google-merchant?promoterSlug=bot"
```

Validate your feed using [Google's Feed Testing Tool](https://merchants.google.com/mc/feeds/feedtest).

---

## Troubleshooting

### Google Wallet Issues

| Issue | Solution |
|-------|----------|
| "Google Wallet is not configured" | Check environment variables are set correctly in Vercel |
| "Failed to get access token" | Verify service account email and private key format |
| Pass not appearing | Ensure you're testing with an account added as a tester (demo mode) |
| "Class not found" | The API creates classes automatically; check for API errors in logs |

### Cache Issues
If you update a tenant's Google Wallet configuration and it's not taking effect:

```typescript
import { clearConfigCache } from '@/lib/google-wallet'

// Clear specific tenant cache
clearConfigCache(promoterId)

// Or clear all cache
clearConfigCache()
```

---

## Support

For implementation questions, contact:
- Google Wallet: [Developer Support](https://developers.google.com/wallet/support)
- Merchant Center: [Help Center](https://support.google.com/merchants)
- Google Ads Certification: [Support Form](https://support.google.com/google-ads/gethelp)
