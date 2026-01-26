# BoxOfficeTech - Claude Code Project Memory

> This file contains project context, architecture decisions, and key information for AI assistants working on this codebase.

## Project Overview

**BoxOfficeTech** is a white-label event ticketing platform that allows promoters (event organizers) to have their own branded ticket-selling portals.

### Business Model
- **Master Admin**: BoxOfficeTech platform owner - manages all promoters
- **Promoters/Tenants**: Event organizers who use the platform (these terms are interchangeable)
- **End Users**: Customers who buy tickets through promoter portals

---

## Critical Architecture Decisions

### 1. Promoters = Tenants (Interchangeable Terms)

**Decision**: The terms "promoter" and "tenant" are used interchangeably throughout the codebase.

**Why**:
- "Promoter" is the business term (event promoters/organizers)
- "Tenant" is the technical term (multi-tenant architecture)
- Both refer to the same entity in the database

**Collections**:
- `promoters` - Stores business data (name, email, slug, commission, logo)
- `tenants` - Stores theme/branding configuration (links to promoter via `promoterId`)

**Key Files**:
- `lib/hooks/useTenantContext.ts` - Uses `PromoterService.getPromoters()` for tenant list
- `lib/types/promoter.ts` - `PromoterProfile` type definition
- `lib/services/promoterService.ts` - CRUD operations for promoters

```typescript
// Example: Getting "tenants" actually uses the promoters collection
const promoters = await PromoterService.getPromoters()
setAllTenants(promoters as PromoterProfile[])
```

### 2. CMS Page Locking System

**Decision**: System pages are divided into "locked" (core business) and "editable" (static content).

**Locked Pages** (cannot edit via CMS):
- Home, Events, Event Detail, Checkout
- Login, Register, Account

**Editable Pages** (can customize via CMS):
- About Us, Contact, Terms, Privacy, FAQ

**Why**: Prevents tenants from breaking critical ticketing functionality while allowing content customization.

**Key Fields** in `TenantPage`:
- `isLocked: boolean` - True for core business pages
- `isCmsEditable: boolean` - True for static content pages
- `isProtected: boolean` - Prevents deletion of system pages

**Key Files**:
- `lib/types/cms.ts` - TenantPage type with lock flags
- `lib/services/systemPageSeederService.ts` - Page definitions and lock status

### 3. Multi-Tenant Dashboard Scoping

**Decision**: Admin dashboard adapts based on user role and selected promoter context.

**Scopes**:
- `master` - Platform admin sees all promoters' data
- `promoter` - Promoter admin sees only their own data
- `all` - Special value meaning "show aggregated data from all promoters"

**Key Files**:
- `lib/hooks/useTenantContext.ts` - Scope detection and promoter selection
- `lib/hooks/usePromoterAccess.ts` - Role-based access control
- `app/admin/page.tsx` - Dashboard with scope-aware data loading

### 4. White-Label Portal Routes

**Decision**: Each promoter gets a branded portal at `/p/[slug]/...`

**Route Structure**:
```
/p/[slug]           - Promoter's home page
/p/[slug]/events    - Event listing
/p/[slug]/events/[id] - Event detail
/p/[slug]/about     - About page (CMS-editable)
/p/[slug]/contact   - Contact page (CMS-editable)
/p/[slug]/checkout  - Ticket checkout
```

**Key Files**:
- `app/p/[slug]/` - All public portal pages
- `components/public/` - Shared public-facing components

---

## Database Collections (Firestore)

### Core Collections
| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `promoters` | Promoter/tenant business data | name, email, slug, logo, commission |
| `tenants` | Theme/branding config | promoterId, themeId, branding |
| `tenantThemes` | Theme assets and config | colors, typography, assets |
| `tenantPages` | CMS pages per tenant | sections, isLocked, isCmsEditable |
| `events` | Event listings | promoterId, basics, tickets, venue |
| `orders` | Ticket purchases | eventId, customerId, tickets, total |
| `users` | User accounts | email, role, promoterId (if promoter) |

### Indexes Required
- `tenantPages`: composite index on `(tenantId, type, systemType)`

---

## Key Services

### PromoterService (`lib/services/promoterService.ts`)
- CRUD for promoters
- Used by admin dashboard and tenant context

### WhiteLabelService (`lib/services/whiteLabelService.ts`)
- Theme management
- Tenant branding operations

### SystemPageSeederService (`lib/services/systemPageSeederService.ts`)
- Creates default system pages for new tenants
- Manages page lock status migration
- Defines which pages are CMS-editable

### AIInsightsService (`lib/services/aiInsightsService.ts`)
- Generates AI-powered dashboard insights
- Scope-aware (master vs promoter)

---

## UI Components

### Admin Dashboard (`app/admin/page.tsx`)
- Modern design with charts (Recharts library)
- AI Insights section
- Quick action buttons with tooltips
- Unified activity feed (events + orders)
- Customer location visualization

### Page Builder (`app/admin/white-label/pages/[pageId]/page.tsx`)
- Section-based page editing
- Blocks editing for locked pages
- SEO settings per page

### Activity Feed (`components/admin/ActivityFeed.tsx`)
- Combines events and orders in timeline
- Shows enriched order details (event name, date, venue)

---

## Common Patterns

### Loading Tenant Data
```typescript
// Always use effectivePromoterId for scoped queries
const { effectivePromoterId, scope } = usePromoterAccess()

// For "all promoters" view, load aggregated data
if (effectivePromoterId === 'all') {
  // Load from all promoters
} else {
  // Load for specific promoter
}
```

### Enriching Orders with Event Data
```typescript
// Orders don't store full event details, so enrich them
const eventsMap = new Map(events.map(e => [e.id, e]))
const enrichedOrders = orders.map(order => ({
  ...order,
  event: eventsMap.get(order.eventId),
  eventName: order.eventName || event?.name,
  venueName: order.venueName || event?.venueName,
}))
```

### Checking Page Edit Permissions
```typescript
// Block editing for locked/core business pages
if (page.isLocked || page.isCmsEditable === false) {
  // Show locked message
  return
}
```

---

## Recent Major Changes (as of Jan 2026)

1. **Dashboard Redesign** - Replaced basic overview with AI insights, charts, activity feed
2. **Page Locking System** - Added isLocked/isCmsEditable to protect core pages
3. **Promoter Collection Fix** - Dashboard now correctly uses `promoters` collection
4. **Activity Feed Enhancement** - Shows event details for orders
5. **Default Page Sections** - System pages created with starter content

---

## Development Notes

### Running Locally
```bash
npm run dev
```

### Key Environment Variables
- Firebase config (NEXT_PUBLIC_FIREBASE_*)
- OpenAI API key (for AI insights)

### Testing Tenant Context
1. Log in as master admin
2. Use promoter dropdown to switch context
3. Dashboard data should update accordingly

### Adding New System Page Type
1. Add to `SystemPageType` in `lib/types/cms.ts`
2. Add definition in `SYSTEM_PAGES` array in `systemPageSeederService.ts`
3. Set `isCmsEditable: true/false` based on whether it's static content
4. Add default sections in `getDefaultSectionsForPage()` if editable

---

## Troubleshooting

### "0 tenants" in Dashboard
- Check that `useTenantContext.ts` uses `PromoterService.getPromoters()`
- Verify `promoters` collection has data in Firestore

### Empty Page Editor
- Run "Apply Security Settings" migration in Pages list
- Then run "Add Default Sections" for editable pages
- Check that page has `isCmsEditable: true`

### Activity Feed Missing Event Names
- Ensure orders are enriched with event data before filtering
- Check `eventsMap` is built from all events, not filtered subset
