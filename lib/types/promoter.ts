export interface PromoterProfile {
  id: string
  name: string
  email: string
  phone?: string
  slug: string
  logo?: string
  brandingType: 'basic' | 'advanced'
  colorScheme: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  commission: number
  active: boolean
  users?: string[]
  website?: string
  description?: string
  setupComplete?: boolean
  setupStep?: 'profile' | 'payment' | 'documents'
  createdAt?: string
  updatedAt?: string
}

export interface PaymentGateway {
  id?: string
  promoterId: string
  provider: 'stripe' | 'square' | 'paypal' | 'boxofficetech'
  environment: 'sandbox' | 'live'
  credentials?: {
    publishableKey?: string
    secretKey?: string
    apiKey?: string
    merchantId?: string
    accessToken?: string
    clientId?: string
    webhookSecret?: string
  }
  isActive: boolean
  createdAt?: Date | any
  updatedAt?: Date | any
  validatedAt?: Date | any
  testMode?: boolean
}

export interface PromoterDocument {
  id: string
  promoterId: string
  type: 'tax' | 'contract' | 'insurance' | 'other'
  name: string
  fileName?: string
  url: string
  uploadedAt: string
  status: 'pending' | 'approved' | 'rejected'
}

export interface Commission {
  id: string
  promoterId: string
  eventId: string
  eventName: string
  totalSales: number
  commissionRate: number
  amountOwed: number
  paymentStatus: 'pending' | 'paid' | 'processing'
  paidAt?: string
  createdAt: string
  updatedAt: string
}

// Affiliate Integration Types
export type AffiliatePlatform =
  | 'ticketmaster'
  | 'seatgeek'
  | 'stubhub'
  | 'ticketnetwork'
  | 'eventbrite'
  | 'bandsintown'
  | 'fever'
  | 'vivid_seats'
  | 'viagogo'

export type AffiliateNetwork = 'impact' | 'cj' | 'rakuten' | 'direct'

export interface PromoterAffiliate {
  id: string
  promoterId: string
  platform: AffiliatePlatform
  enabled: boolean

  // API credentials (for Discovery/Partner APIs)
  apiKey?: string
  apiSecret?: string

  // Affiliate network credentials (Impact, CJ, etc.)
  affiliateNetwork?: AffiliateNetwork
  publisherId?: string        // Network publisher/partner ID
  affiliateId?: string        // Platform-specific affiliate ID
  trackingId?: string         // Custom tracking parameter

  // Auto-import settings
  autoImportEvents: boolean
  importCategories?: string[] // e.g., ['music', 'sports', 'comedy']
  importRadius?: number       // Miles from venue location
  importVenues?: string[]     // Specific venue IDs to import from
  importKeywords?: string[]   // Search keywords for events

  // Revenue tracking
  totalClicks: number
  totalConversions: number
  totalRevenue: number
  commissionRate?: number     // Platform-specific commission rate

  // Timestamps
  lastSyncAt?: string
  createdAt: string
  updatedAt: string
}

export interface AffiliateEvent {
  id: string
  promoterId: string
  affiliateId: string
  platform: AffiliatePlatform

  // External event data
  externalEventId: string
  name: string
  description?: string
  imageUrl?: string
  startDate: string
  endDate?: string

  // Venue info
  venueName: string
  venueCity: string
  venueState?: string
  venueCountry: string

  // Pricing
  minPrice?: number
  maxPrice?: number
  currency: string

  // Affiliate link
  affiliateUrl: string

  // Tracking
  clicks: number
  conversions: number
  revenue: number

  // Status
  isActive: boolean
  lastUpdatedFromSource?: string
  createdAt: string
  updatedAt: string
}

// Platform-specific configuration
export interface AffiliatePlatformConfig {
  platform: AffiliatePlatform
  displayName: string
  logoUrl: string
  commissionRange: string
  apiDocsUrl?: string
  affiliateSignupUrl?: string
  supportsApi: boolean
  supportsAffiliateLinks: boolean
  networks: AffiliateNetwork[]
}
