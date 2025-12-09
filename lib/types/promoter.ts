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
