# BoxOfficeTech - Claude Code Project Status

> **Last Updated:** December 24, 2024
> **Branch:** `claude/merge-tenant-foundation-mCjFn`

## Project Overview

BoxOfficeTech is a **white-label ticketing platform** built with Next.js 14, Firebase/Firestore, and Stripe. Each "promoter" (tenant) gets their own branded ticketing site at `/p/[slug]` with customizable theming.

### Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Database:** Firebase Firestore
- **Auth:** Firebase Auth (planned)
- **Payments:** Stripe (per-tenant credentials stored in Firestore)
- **State Management:** Zustand (cart store with persistence)
- **Styling:** Tailwind CSS + custom theme variables

---

## Phase 0: Sprint Status

| Sprint | Status | Notes |
|--------|--------|-------|
| Sprint 0: Master Tenant Foundation | ✅ Complete | Multi-tenant architecture, promoter slugs |
| Sprint 1: Component Library | ✅ Complete | Shared components, Layout, EventCard, etc. |
| Sprint 2: Home & Events Pages | ✅ Complete | Event listing, filtering, future events only |
| Sprint 3: Purchase Flow (Stripe) | ✅ Complete | Full checkout, QR codes, fraud prevention |
| Sprint 4: Auth & Account | ❌ NOT Complete | Firebase Auth integration needed |
| Sprint 5: Static Pages & SEO | ❌ NOT Complete | About, Contact, FAQ, sitemap, meta tags |

---

## Completed Features (Phase 0)

### Multi-Tenant Architecture
- Promoters stored in `promoters` collection with `slug` field
- Public routes at `/p/[slug]/*` (homepage, events, checkout, account)
- Admin routes at `/admin/*` for platform management
- Tenant-specific Stripe credentials in `payment_gateways` collection

### Event Management
- Events linked to promoters via `promoterId`
- Future events filter using `upcoming: true` parameter
- Event detail pages with ticket selection
- UTC-based date formatting to prevent hydration errors

### Purchase Flow
```
/p/[slug]/events/[eventId] → Add to Cart
        ↓
/p/[slug]/checkout → Stripe Payment
        ↓
/p/[slug]/confirmation/[orderId] → Order Complete
        ↓
/p/[slug]/account/orders/[orderId] → View Tickets
```

### Stripe Integration
- **Tenant-specific keys:** Each promoter has their own Stripe account
- **Payment Config API:** `GET /api/promoters/[id]/payment-config?bySlug=true`
- **Payment Intent API:** `POST /api/stripe/create-payment-intent`
- **Webhook Handler:** `POST /api/stripe/webhook`

### Fraud Prevention (Just Completed)
- Stripe Radar risk assessment stored on orders
- User-friendly error messages for declined cards
- Webhook handlers for:
  - `payment_intent.succeeded` (with risk level/score)
  - `payment_intent.payment_failed` (fraud detection)
  - `radar.early_fraud_warning.created`
  - `charge.dispute.created` / `charge.dispute.closed`
- Automatic ticket cancellation on disputes

### QR Codes for Tickets
- `TicketQRCode` component using `react-qr-code`
- `TicketCard` component for displaying tickets
- QR codes shown on confirmation and order detail pages
- Admin can view QR codes in order modal

### Order Data Structure
```typescript
{
  orderId: "ORD-1234567890-ABC123",
  status: "pending" | "completed" | "confirmed" | "failed" | "disputed" | "refunded",
  customerEmail: string,
  customerName: string,
  promoterSlug: string,
  eventId: string,
  eventName: string,
  items: CartItem[],
  tickets: Ticket[],  // Individual tickets with QR-scannable IDs
  total: number,
  fraudAssessment: {
    riskLevel: "normal" | "elevated" | "highest",
    riskScore: number,
    cvcCheck: string,
    // ... more Radar data
  }
}
```

---

## Remaining Work (Phase 0)

### Sprint 4: Auth & Account (NOT Started)
- [ ] Firebase Auth integration
- [ ] User registration/login pages at `/p/[slug]/auth/*`
- [ ] Protected routes for account pages
- [ ] Link orders to authenticated users
- [ ] Order history lookup by user ID (not just email)
- [ ] Account settings page

### Sprint 5: Static Pages & SEO (NOT Started)
- [ ] About page at `/p/[slug]/about`
- [ ] Contact page at `/p/[slug]/contact`
- [ ] FAQ page at `/p/[slug]/faq`
- [ ] Terms & Privacy pages
- [ ] Dynamic sitemap generation (fix existing Firebase errors)
- [ ] Meta tags and OpenGraph for events
- [ ] Structured data (JSON-LD) for events

---

## Phase 1: Token Extraction Pipeline

**Goal:** Extract design tokens from promoter branding to enable dynamic theming.

### Tasks
1. **Token Schema Definition**
   - Define CSS custom properties structure
   - Color tokens (primary, secondary, accent, backgrounds)
   - Typography tokens (fonts, sizes, weights)
   - Spacing and radius tokens

2. **Brand Asset Processing**
   - Extract colors from uploaded logos
   - Generate color palette from primary brand color
   - Store tokens in promoter document

3. **Token Storage**
   ```typescript
   // In promoters collection
   {
     slug: "bot",
     name: "BoxOfficeTech",
     branding: {
       logo: "url",
       primaryColor: "#6ac045",
       tokens: {
         colors: {
           primary: "#6ac045",
           primaryHover: "#5aa038",
           secondary: "#1a1a2e",
           accent: "#6ac045",
           background: "#ffffff",
           surface: "#f9fafb",
           text: "#111827",
           textMuted: "#6b7280"
         },
         fonts: {
           heading: "Inter",
           body: "Inter"
         }
       }
     }
   }
   ```

4. **Admin Token Editor**
   - Color picker for brand colors
   - Preview of generated palette
   - Font selection
   - Live preview of theme

---

## Phase 2: Dynamic Theming Infrastructure

**Goal:** Apply extracted tokens at runtime for each tenant.

### Tasks
1. **CSS Custom Properties Injection**
   - Server-side token injection in Layout component
   - Generate CSS variables from promoter tokens
   - Fallback to default theme

2. **Theme Provider Component**
   ```tsx
   // components/public/ThemeProvider.tsx
   export function ThemeProvider({ tokens, children }) {
     const cssVars = generateCSSVariables(tokens)
     return (
       <div style={cssVars}>
         {children}
       </div>
     )
   }
   ```

3. **Update Components to Use Tokens**
   - Replace hardcoded colors with CSS variables
   - Update Tailwind config for custom properties
   - Example: `bg-[#6ac045]` → `bg-[var(--color-primary)]`

4. **Theme Preview in Admin**
   - Real-time preview as tokens are edited
   - Before/after comparison
   - Mobile preview

5. **Font Loading**
   - Dynamic Google Fonts loading based on tenant config
   - Font optimization with `next/font`

---

## Key Files Reference

### Public Pages (White-label)
- `app/p/[slug]/page.tsx` - Tenant homepage
- `app/p/[slug]/events/page.tsx` - Events listing
- `app/p/[slug]/events/[eventId]/page.tsx` - Event detail
- `app/p/[slug]/checkout/page.tsx` - Checkout with Stripe
- `app/p/[slug]/confirmation/[orderId]/page.tsx` - Order confirmation
- `app/p/[slug]/account/orders/[orderId]/page.tsx` - Order detail

### API Routes
- `app/api/stripe/create-payment-intent/route.ts` - Create Stripe payment
- `app/api/stripe/webhook/route.ts` - Handle Stripe webhooks
- `app/api/promoters/[id]/payment-config/route.ts` - Get tenant payment config
- `app/api/orders/route.ts` - Get orders by email

### Shared Components
- `components/public/Layout.tsx` - Public page layout
- `components/public/EventCard.tsx` - Event listing card
- `components/shared/TicketQRCode.tsx` - QR code renderer
- `components/shared/TicketCard.tsx` - Ticket display with QR

### State Management
- `lib/stores/cartStore.ts` - Zustand cart with persistence

### Firebase
- `lib/firebase-admin.ts` - Server-side Firebase Admin SDK
- `lib/firebase.ts` - Client-side Firebase SDK

---

## Known Issues

1. **Sitemap Build Error:** Firebase Admin SDK not initialized during static generation (missing service account). Sitemap works at runtime but fails during build.

2. **Order Status Display:** Orders may show "pending" if user doesn't land on confirmation page with `?redirect_status=succeeded` parameter. Fixed in latest commit.

3. **Webhook Stripe Instance:** The webhook uses a global Stripe instance from env vars, but tenant-specific webhooks may need their own keys.

---

## Environment Variables Required

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (for API routes)
FIREBASE_SERVICE_ACCOUNT_KEY= # JSON string of service account

# Stripe (fallback/webhook verification)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## Quick Start for Next Session

1. **Continue Sprint 4 (Auth):**
   ```
   Implement Firebase Auth for user registration and login.
   Create auth pages at /p/[slug]/auth/login and /p/[slug]/auth/register.
   Protect account routes with auth middleware.
   ```

2. **Continue Sprint 5 (Static Pages):**
   ```
   Create About, Contact, FAQ pages for each tenant.
   Add SEO meta tags and structured data.
   Fix sitemap generation.
   ```

3. **Start Phase 1 (Token Extraction):**
   ```
   Define token schema for colors, fonts, spacing.
   Add branding.tokens field to promoter documents.
   Create admin UI for editing tokens.
   ```

4. **Start Phase 2 (Dynamic Theming):**
   ```
   Create ThemeProvider component.
   Inject CSS variables from promoter tokens.
   Update components to use CSS variables.
   ```
