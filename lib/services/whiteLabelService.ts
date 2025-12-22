import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  increment,
  writeBatch,
} from 'firebase/firestore'

// Types
export interface Tenant {
  id: string
  name: string
  slug: string
  type: 'standard' | 'enterprise' | 'reseller' | 'partner'
  status: 'pending' | 'active' | 'suspended' | 'terminated'
  owner: TenantOwner
  branding: TenantBranding
  domains: TenantDomain[]
  subscription: TenantSubscription
  features: TenantFeatures
  settings: TenantSettings
  limits: TenantLimits
  usage: TenantUsage
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date

  // Master Tenant Fields
  isMaster?: boolean                   // true only for BoxOfficeTech platform owner
  defaultThemeId?: string              // Theme ID to use as default (master's core theme)
  customThemeId?: string               // Tenant's own uploaded theme (overrides default)
}

export interface TenantOwner {
  userId: string
  name: string
  email: string
  phone?: string
  company?: string
  address?: {
    street: string
    city: string
    state: string
    country: string
    postalCode: string
  }
}

export interface TenantBranding {
  logo: {
    primary: string
    secondary?: string
    favicon?: string
    emailHeader?: string
  }
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
    textSecondary: string
    error: string
    warning: string
    success: string
    info: string
  }
  typography: {
    fontFamily: string
    headingFont?: string
    fontSize: {
      base: number
      small: number
      large: number
      heading: number
    }
  }
  customCSS?: string
  darkMode?: {
    enabled: boolean
    colors?: Partial<TenantBranding['colors']>
  }
  emailTemplates?: {
    header?: string
    footer?: string
    signature?: string
  }
}

export interface TenantDomain {
  id: string
  domain: string
  type: 'primary' | 'alias' | 'subdomain'
  status: 'pending' | 'verified' | 'failed'
  ssl: {
    enabled: boolean
    provider: 'auto' | 'custom'
    certificate?: string
    expiresAt?: Date
  }
  dns: {
    configured: boolean
    records: DNSRecord[]
    lastChecked?: Date
  }
  createdAt: Date
}

export interface DNSRecord {
  type: 'A' | 'CNAME' | 'TXT' | 'MX'
  name: string
  value: string
  ttl: number
  verified: boolean
}

export interface TenantSubscription {
  planId: string
  planName: string
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired'
  billingCycle: 'monthly' | 'annual'
  startDate: Date
  currentPeriodStart: Date
  currentPeriodEnd: Date
  trialEndsAt?: Date
  cancelledAt?: Date
  pricing: {
    basePrice: number
    currency: string
    discount?: number
    discountType?: 'percentage' | 'fixed'
  }
  paymentMethod?: {
    type: 'card' | 'bank' | 'invoice'
    last4?: string
    brand?: string
    expiryMonth?: number
    expiryYear?: number
  }
}

export interface TenantFeatures {
  core: {
    events: boolean
    ticketing: boolean
    customers: boolean
    orders: boolean
    payments: boolean
  }
  advanced: {
    analytics: boolean
    marketing: boolean
    loyalty: boolean
    fraud: boolean
    automation: boolean
    integrations: boolean
    api: boolean
    webhooks: boolean
    customReports: boolean
  }
  enterprise: {
    sso: boolean
    customDomain: boolean
    whiteLabel: boolean
    multiCurrency: boolean
    advancedSecurity: boolean
    sla: boolean
    dedicatedSupport: boolean
    customDevelopment: boolean
  }
  featureFlags: Record<string, boolean>
}

export interface TenantSettings {
  general: {
    timezone: string
    dateFormat: string
    timeFormat: string
    language: string
    currency: string
  }
  notifications: {
    emailEnabled: boolean
    smsEnabled: boolean
    pushEnabled: boolean
    webhooksEnabled: boolean
  }
  security: {
    mfaRequired: boolean
    sessionTimeout: number // minutes
    ipWhitelist?: string[]
    passwordPolicy: {
      minLength: number
      requireUppercase: boolean
      requireNumbers: boolean
      requireSymbols: boolean
      expiryDays?: number
    }
  }
  api: {
    enabled: boolean
    rateLimit: number
    ipRestrictions?: string[]
  }
  customFields: CustomField[]
}

export interface CustomField {
  id: string
  entity: 'event' | 'customer' | 'order' | 'ticket'
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect'
  required: boolean
  options?: string[]
  defaultValue?: any
  visible: boolean
  searchable: boolean
}

export interface TenantLimits {
  events: { max: number; used: number }
  customers: { max: number; used: number }
  orders: { max: number; used: number }
  storage: { max: number; used: number } // MB
  apiCalls: { max: number; used: number }
  users: { max: number; used: number }
  emailsPerMonth: { max: number; used: number }
  smsPerMonth: { max: number; used: number }
}

export interface TenantUsage {
  currentPeriod: {
    orders: number
    revenue: number
    fees: number
    apiCalls: number
    emailsSent: number
    smsSent: number
    storageUsed: number
  }
  allTime: {
    orders: number
    revenue: number
    fees: number
  }
  lastUpdated: Date
}

export interface Plan {
  id: string
  name: string
  description: string
  type: 'standard' | 'enterprise' | 'custom'
  pricing: {
    monthly: number
    annual: number
    currency: string
  }
  features: Partial<TenantFeatures>
  limits: Partial<TenantLimits>
  trial: {
    enabled: boolean
    days: number
  }
  popular?: boolean
  hidden?: boolean
  createdAt: Date
}

export interface TenantInvite {
  id: string
  tenantId: string
  email: string
  role: 'admin' | 'manager' | 'staff' | 'readonly'
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  invitedBy: string
  token: string
  expiresAt: Date
  createdAt: Date
}

export interface TenantUser {
  id: string
  tenantId: string
  userId: string
  email: string
  name: string
  role: 'owner' | 'admin' | 'manager' | 'staff' | 'readonly' | 'superadmin'
  permissions: string[]
  lastLogin?: Date
  status: 'active' | 'suspended' | 'invited'
  createdAt: Date

  // Superadmin Fields (platform-level access)
  canAccessAllTenants?: boolean        // true for superadmin role
  canImpersonate?: boolean             // Can impersonate other tenant admins
  canManageBilling?: boolean           // Can access all tenant billing
}

export interface TenantAuditLog {
  id: string
  tenantId: string
  userId: string
  userName: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

// Caching
const cache = new Map<string, { data: any; expiry: number }>()
const CACHE_TTL = 5 * 60 * 1000

function getCached<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T
  }
  cache.delete(key)
  return null
}

function setCache(key: string, data: any, ttl: number = CACHE_TTL): void {
  cache.set(key, { data, expiry: Date.now() + ttl })
}

// Helper Functions
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

// Default configurations
const DEFAULT_BRANDING: TenantBranding = {
  logo: {
    primary: '/default-logo.png',
  },
  colors: {
    primary: '#3B82F6',
    secondary: '#6366F1',
    accent: '#F59E0B',
    background: '#FFFFFF',
    surface: '#F3F4F6',
    text: '#111827',
    textSecondary: '#6B7280',
    error: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
    info: '#3B82F6',
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    fontSize: {
      base: 16,
      small: 14,
      large: 18,
      heading: 24,
    },
  },
}

const DEFAULT_SETTINGS: TenantSettings = {
  general: {
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    language: 'en',
    currency: 'USD',
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: false,
    webhooksEnabled: false,
  },
  security: {
    mfaRequired: false,
    sessionTimeout: 60,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSymbols: false,
    },
  },
  api: {
    enabled: true,
    rateLimit: 1000,
  },
  customFields: [],
}

const DEFAULT_LIMITS: TenantLimits = {
  events: { max: 10, used: 0 },
  customers: { max: 1000, used: 0 },
  orders: { max: 500, used: 0 },
  storage: { max: 1024, used: 0 },
  apiCalls: { max: 10000, used: 0 },
  users: { max: 5, used: 0 },
  emailsPerMonth: { max: 5000, used: 0 },
  smsPerMonth: { max: 0, used: 0 },
}

const DEFAULT_FEATURES: TenantFeatures = {
  core: {
    events: true,
    ticketing: true,
    customers: true,
    orders: true,
    payments: true,
  },
  advanced: {
    analytics: false,
    marketing: false,
    loyalty: false,
    fraud: false,
    automation: false,
    integrations: false,
    api: false,
    webhooks: false,
    customReports: false,
  },
  enterprise: {
    sso: false,
    customDomain: false,
    whiteLabel: false,
    multiCurrency: false,
    advancedSecurity: false,
    sla: false,
    dedicatedSupport: false,
    customDevelopment: false,
  },
  featureFlags: {},
}

// Main Service Class
export class WhiteLabelService {
  // ==================== TENANT MANAGEMENT ====================

  static async createTenant(
    data: {
      name: string
      owner: TenantOwner
      planId: string
      type?: Tenant['type']
      branding?: Partial<TenantBranding>
      settings?: Partial<TenantSettings>
    }
  ): Promise<Tenant> {
    const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const slug = generateSlug(data.name)

    // Get plan details
    const plan = await this.getPlan(data.planId)
    if (!plan) {
      throw new Error('Plan not found')
    }

    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    const tenant: Tenant = {
      id: tenantId,
      name: data.name,
      slug,
      type: data.type || 'standard',
      status: plan.trial.enabled ? 'pending' : 'active',
      owner: data.owner,
      branding: { ...DEFAULT_BRANDING, ...data.branding },
      domains: [],
      subscription: {
        planId: plan.id,
        planName: plan.name,
        status: plan.trial.enabled ? 'trial' : 'active',
        billingCycle: 'monthly',
        startDate: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt: plan.trial.enabled
          ? new Date(now.getTime() + plan.trial.days * 24 * 60 * 60 * 1000)
          : undefined,
        pricing: {
          basePrice: plan.pricing.monthly,
          currency: plan.pricing.currency,
        },
      },
      features: { ...DEFAULT_FEATURES, ...(plan.features as TenantFeatures) },
      settings: { ...DEFAULT_SETTINGS, ...data.settings },
      limits: { ...DEFAULT_LIMITS, ...(plan.limits as TenantLimits) },
      usage: {
        currentPeriod: {
          orders: 0,
          revenue: 0,
          fees: 0,
          apiCalls: 0,
          emailsSent: 0,
          smsSent: 0,
          storageUsed: 0,
        },
        allTime: {
          orders: 0,
          revenue: 0,
          fees: 0,
        },
        lastUpdated: now,
      },
      createdAt: now,
      updatedAt: now,
    }

    await setDoc(doc(db, 'tenants', tenantId), {
      ...tenant,
      subscription: {
        ...tenant.subscription,
        startDate: Timestamp.fromDate(tenant.subscription.startDate),
        currentPeriodStart: Timestamp.fromDate(tenant.subscription.currentPeriodStart),
        currentPeriodEnd: Timestamp.fromDate(tenant.subscription.currentPeriodEnd),
        trialEndsAt: tenant.subscription.trialEndsAt
          ? Timestamp.fromDate(tenant.subscription.trialEndsAt)
          : null,
      },
      usage: {
        ...tenant.usage,
        lastUpdated: Timestamp.fromDate(tenant.usage.lastUpdated),
      },
      createdAt: Timestamp.fromDate(tenant.createdAt),
      updatedAt: Timestamp.fromDate(tenant.updatedAt),
    })

    // Create owner as tenant user
    await this.addTenantUser(tenantId, {
      userId: data.owner.userId,
      email: data.owner.email,
      name: data.owner.name,
      role: 'owner',
      permissions: ['*'],
    })

    return tenant
  }

  static async getTenant(tenantId: string): Promise<Tenant | null> {
    const cached = getCached<Tenant>(`tenant:${tenantId}`)
    if (cached) return cached

    const docRef = await getDoc(doc(db, 'tenants', tenantId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    const tenant: Tenant = {
      ...data,
      id: docRef.id,
      subscription: {
        ...data.subscription,
        startDate: data.subscription.startDate.toDate(),
        currentPeriodStart: data.subscription.currentPeriodStart.toDate(),
        currentPeriodEnd: data.subscription.currentPeriodEnd.toDate(),
        trialEndsAt: data.subscription.trialEndsAt?.toDate(),
        cancelledAt: data.subscription.cancelledAt?.toDate(),
      },
      domains: data.domains?.map((d: any) => ({
        ...d,
        ssl: {
          ...d.ssl,
          expiresAt: d.ssl?.expiresAt?.toDate(),
        },
        dns: {
          ...d.dns,
          lastChecked: d.dns?.lastChecked?.toDate(),
        },
        createdAt: d.createdAt.toDate(),
      })) || [],
      usage: {
        ...data.usage,
        lastUpdated: data.usage.lastUpdated.toDate(),
      },
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as Tenant

    setCache(`tenant:${tenantId}`, tenant)
    return tenant
  }

  static async getTenantBySlug(slug: string): Promise<Tenant | null> {
    const q = query(
      collection(db, 'tenants'),
      where('slug', '==', slug),
      limit(1)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    return this.getTenant(snapshot.docs[0].id)
  }

  static async getTenantByDomain(domain: string): Promise<Tenant | null> {
    // Search for tenant with this domain
    const q = query(collection(db, 'tenants'))
    const snapshot = await getDocs(q)

    for (const doc_data of snapshot.docs) {
      const tenant = doc_data.data()
      const hasDomain = tenant.domains?.some(
        (d: any) => d.domain === domain && d.status === 'verified'
      )
      if (hasDomain) {
        return this.getTenant(doc_data.id)
      }
    }

    return null
  }

  static async getTenants(
    filters?: {
      status?: Tenant['status']
      type?: Tenant['type']
      planId?: string
    }
  ): Promise<Tenant[]> {
    let q = query(collection(db, 'tenants'), orderBy('createdAt', 'desc'))

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status))
    }
    if (filters?.type) {
      q = query(q, where('type', '==', filters.type))
    }
    if (filters?.planId) {
      q = query(q, where('subscription.planId', '==', filters.planId))
    }

    const snapshot = await getDocs(q)
    const tenants: Tenant[] = []

    for (const doc_data of snapshot.docs) {
      const tenant = await this.getTenant(doc_data.id)
      if (tenant) tenants.push(tenant)
    }

    return tenants
  }

  static async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<void> {
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }

    delete updateData.id
    delete updateData.createdAt

    await updateDoc(doc(db, 'tenants', tenantId), updateData)
    cache.delete(`tenant:${tenantId}`)
  }

  static async suspendTenant(tenantId: string, reason?: string): Promise<void> {
    await this.updateTenant(tenantId, {
      status: 'suspended',
      metadata: { suspendedAt: new Date(), suspendReason: reason },
    })
  }

  static async activateTenant(tenantId: string): Promise<void> {
    await this.updateTenant(tenantId, {
      status: 'active',
      metadata: { activatedAt: new Date() },
    })
  }

  static async terminateTenant(tenantId: string): Promise<void> {
    await this.updateTenant(tenantId, {
      status: 'terminated',
      metadata: { terminatedAt: new Date() },
    })
  }

  // ==================== BRANDING ====================

  static async updateBranding(
    tenantId: string,
    branding: Partial<TenantBranding>
  ): Promise<void> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    const updatedBranding = {
      ...tenant.branding,
      ...branding,
      colors: { ...tenant.branding.colors, ...branding.colors },
      typography: { ...tenant.branding.typography, ...branding.typography },
      logo: { ...tenant.branding.logo, ...branding.logo },
    }

    await this.updateTenant(tenantId, { branding: updatedBranding })
  }

  static async getBrandingCSS(tenantId: string): Promise<string> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    const { colors, typography } = tenant.branding

    let css = `:root {
  --color-primary: ${colors.primary};
  --color-secondary: ${colors.secondary};
  --color-accent: ${colors.accent};
  --color-background: ${colors.background};
  --color-surface: ${colors.surface};
  --color-text: ${colors.text};
  --color-text-secondary: ${colors.textSecondary};
  --color-error: ${colors.error};
  --color-warning: ${colors.warning};
  --color-success: ${colors.success};
  --color-info: ${colors.info};
  --font-family: ${typography.fontFamily};
  --font-size-base: ${typography.fontSize.base}px;
  --font-size-small: ${typography.fontSize.small}px;
  --font-size-large: ${typography.fontSize.large}px;
  --font-size-heading: ${typography.fontSize.heading}px;
}`

    if (typography.headingFont) {
      css += `\n  --font-heading: ${typography.headingFont};`
    }

    if (tenant.branding.customCSS) {
      css += `\n\n/* Custom CSS */\n${tenant.branding.customCSS}`
    }

    return css
  }

  // ==================== DOMAIN MANAGEMENT ====================

  static async addDomain(
    tenantId: string,
    domain: string,
    type: TenantDomain['type'] = 'alias'
  ): Promise<TenantDomain> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    // Check if domain already exists
    if (tenant.domains.some((d) => d.domain === domain)) {
      throw new Error('Domain already exists')
    }

    const domainId = `domain_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

    const newDomain: TenantDomain = {
      id: domainId,
      domain,
      type,
      status: 'pending',
      ssl: {
        enabled: true,
        provider: 'auto',
      },
      dns: {
        configured: false,
        records: this.generateDNSRecords(domain),
      },
      createdAt: new Date(),
    }

    await updateDoc(doc(db, 'tenants', tenantId), {
      domains: [...tenant.domains, {
        ...newDomain,
        createdAt: Timestamp.fromDate(newDomain.createdAt),
      }],
      updatedAt: Timestamp.fromDate(new Date()),
    })

    cache.delete(`tenant:${tenantId}`)

    return newDomain
  }

  static generateDNSRecords(domain: string): DNSRecord[] {
    return [
      {
        type: 'CNAME',
        name: domain,
        value: 'platform.example.com',
        ttl: 3600,
        verified: false,
      },
      {
        type: 'TXT',
        name: `_verify.${domain}`,
        value: `verify_${generateToken(24)}`,
        ttl: 3600,
        verified: false,
      },
    ]
  }

  static async verifyDomain(tenantId: string, domainId: string): Promise<{
    verified: boolean
    errors: string[]
  }> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    const domain = tenant.domains.find((d) => d.id === domainId)
    if (!domain) {
      throw new Error('Domain not found')
    }

    // In production, actually verify DNS records
    // For now, simulate verification
    const errors: string[] = []
    const verified = true // Would check actual DNS

    if (verified) {
      const updatedDomains = tenant.domains.map((d) =>
        d.id === domainId
          ? {
              ...d,
              status: 'verified' as const,
              dns: {
                ...d.dns,
                configured: true,
                lastChecked: new Date(),
                records: d.dns.records.map((r) => ({ ...r, verified: true })),
              },
            }
          : d
      )

      await updateDoc(doc(db, 'tenants', tenantId), {
        domains: updatedDomains.map((d) => ({
          ...d,
          createdAt: Timestamp.fromDate(d.createdAt),
          dns: {
            ...d.dns,
            lastChecked: d.dns.lastChecked ? Timestamp.fromDate(d.dns.lastChecked) : null,
          },
        })),
        updatedAt: Timestamp.fromDate(new Date()),
      })

      cache.delete(`tenant:${tenantId}`)
    }

    return { verified, errors }
  }

  static async removeDomain(tenantId: string, domainId: string): Promise<void> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    const domain = tenant.domains.find((d) => d.id === domainId)
    if (!domain) {
      throw new Error('Domain not found')
    }

    if (domain.type === 'primary') {
      throw new Error('Cannot remove primary domain')
    }

    const updatedDomains = tenant.domains.filter((d) => d.id !== domainId)

    await updateDoc(doc(db, 'tenants', tenantId), {
      domains: updatedDomains.map((d) => ({
        ...d,
        createdAt: Timestamp.fromDate(d.createdAt),
      })),
      updatedAt: Timestamp.fromDate(new Date()),
    })

    cache.delete(`tenant:${tenantId}`)
  }

  // ==================== SUBSCRIPTION & BILLING ====================

  static async changePlan(
    tenantId: string,
    newPlanId: string,
    billingCycle: 'monthly' | 'annual' = 'monthly'
  ): Promise<void> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    const plan = await this.getPlan(newPlanId)
    if (!plan) {
      throw new Error('Plan not found')
    }

    const price = billingCycle === 'annual' ? plan.pricing.annual : plan.pricing.monthly

    await this.updateTenant(tenantId, {
      subscription: {
        ...tenant.subscription,
        planId: plan.id,
        planName: plan.name,
        billingCycle,
        pricing: {
          basePrice: price,
          currency: plan.pricing.currency,
        },
      },
      features: { ...DEFAULT_FEATURES, ...(plan.features as TenantFeatures) },
      limits: { ...tenant.limits, ...(plan.limits as TenantLimits) },
    })
  }

  static async updatePaymentMethod(
    tenantId: string,
    paymentMethod: TenantSubscription['paymentMethod']
  ): Promise<void> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    await this.updateTenant(tenantId, {
      subscription: {
        ...tenant.subscription,
        paymentMethod,
      },
    })
  }

  static async cancelSubscription(tenantId: string): Promise<void> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    await this.updateTenant(tenantId, {
      subscription: {
        ...tenant.subscription,
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    })
  }

  static async reactivateSubscription(tenantId: string): Promise<void> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    await this.updateTenant(tenantId, {
      subscription: {
        ...tenant.subscription,
        status: 'active',
        cancelledAt: undefined,
      },
    })
  }

  // ==================== FEATURES & LIMITS ====================

  static async updateFeatures(
    tenantId: string,
    features: Partial<TenantFeatures>
  ): Promise<void> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    await this.updateTenant(tenantId, {
      features: {
        ...tenant.features,
        ...features,
        core: { ...tenant.features.core, ...features.core },
        advanced: { ...tenant.features.advanced, ...features.advanced },
        enterprise: { ...tenant.features.enterprise, ...features.enterprise },
        featureFlags: { ...tenant.features.featureFlags, ...features.featureFlags },
      },
    })
  }

  static async setFeatureFlag(
    tenantId: string,
    flag: string,
    enabled: boolean
  ): Promise<void> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    await this.updateTenant(tenantId, {
      features: {
        ...tenant.features,
        featureFlags: {
          ...tenant.features.featureFlags,
          [flag]: enabled,
        },
      },
    })
  }

  static async updateLimits(
    tenantId: string,
    limits: Partial<TenantLimits>
  ): Promise<void> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    const updatedLimits = { ...tenant.limits }
    for (const [key, value] of Object.entries(limits)) {
      if (updatedLimits[key as keyof TenantLimits] && value) {
        updatedLimits[key as keyof TenantLimits] = {
          ...updatedLimits[key as keyof TenantLimits],
          ...value,
        }
      }
    }

    await this.updateTenant(tenantId, { limits: updatedLimits })
  }

  static async checkLimit(
    tenantId: string,
    limitType: keyof TenantLimits,
    increment: number = 1
  ): Promise<{ allowed: boolean; current: number; max: number }> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    const limit = tenant.limits[limitType]
    const allowed = limit.used + increment <= limit.max

    return {
      allowed,
      current: limit.used,
      max: limit.max,
    }
  }

  static async incrementUsage(
    tenantId: string,
    limitType: keyof TenantLimits,
    amount: number = 1
  ): Promise<void> {
    await updateDoc(doc(db, 'tenants', tenantId), {
      [`limits.${limitType}.used`]: increment(amount),
      updatedAt: Timestamp.fromDate(new Date()),
    })
    cache.delete(`tenant:${tenantId}`)
  }

  // ==================== TENANT USERS ====================

  static async addTenantUser(
    tenantId: string,
    userData: Omit<TenantUser, 'id' | 'tenantId' | 'status' | 'createdAt'>
  ): Promise<TenantUser> {
    const userId = `tu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const user: TenantUser = {
      ...userData,
      id: userId,
      tenantId,
      status: 'active',
      createdAt: new Date(),
    }

    await setDoc(doc(db, 'tenantUsers', userId), {
      ...user,
      createdAt: Timestamp.fromDate(user.createdAt),
      lastLogin: user.lastLogin ? Timestamp.fromDate(user.lastLogin) : null,
    })

    // Increment user count
    await this.incrementUsage(tenantId, 'users')

    return user
  }

  static async getTenantUsers(tenantId: string): Promise<TenantUser[]> {
    const q = query(
      collection(db, 'tenantUsers'),
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'asc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt.toDate(),
        lastLogin: data.lastLogin?.toDate(),
      } as TenantUser
    })
  }

  static async updateTenantUser(
    userId: string,
    updates: Partial<TenantUser>
  ): Promise<void> {
    const updateData: any = { ...updates }
    delete updateData.id
    delete updateData.tenantId
    delete updateData.createdAt

    await updateDoc(doc(db, 'tenantUsers', userId), updateData)
  }

  static async removeTenantUser(userId: string): Promise<void> {
    const userDoc = await getDoc(doc(db, 'tenantUsers', userId))
    if (!userDoc.exists()) return

    const user = userDoc.data()
    if (user.role === 'owner') {
      throw new Error('Cannot remove tenant owner')
    }

    await deleteDoc(doc(db, 'tenantUsers', userId))
  }

  // ==================== INVITATIONS ====================

  static async createInvite(
    tenantId: string,
    email: string,
    role: TenantInvite['role'],
    invitedBy: string
  ): Promise<TenantInvite> {
    const inviteId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const token = generateToken(48)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    const invite: TenantInvite = {
      id: inviteId,
      tenantId,
      email,
      role,
      status: 'pending',
      invitedBy,
      token,
      expiresAt,
      createdAt: new Date(),
    }

    await setDoc(doc(db, 'tenantInvites', inviteId), {
      ...invite,
      expiresAt: Timestamp.fromDate(invite.expiresAt),
      createdAt: Timestamp.fromDate(invite.createdAt),
    })

    return invite
  }

  static async getInviteByToken(token: string): Promise<TenantInvite | null> {
    const q = query(
      collection(db, 'tenantInvites'),
      where('token', '==', token),
      where('status', '==', 'pending'),
      limit(1)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const doc_data = snapshot.docs[0]
    const data = doc_data.data()
    return {
      ...data,
      id: doc_data.id,
      expiresAt: data.expiresAt.toDate(),
      createdAt: data.createdAt.toDate(),
    } as TenantInvite
  }

  static async acceptInvite(
    token: string,
    userId: string,
    name: string
  ): Promise<TenantUser> {
    const invite = await this.getInviteByToken(token)
    if (!invite) {
      throw new Error('Invalid or expired invite')
    }

    if (invite.expiresAt < new Date()) {
      await updateDoc(doc(db, 'tenantInvites', invite.id), { status: 'expired' })
      throw new Error('Invite has expired')
    }

    // Create tenant user
    const user = await this.addTenantUser(invite.tenantId, {
      userId,
      email: invite.email,
      name,
      role: invite.role,
      permissions: this.getDefaultPermissions(invite.role),
    })

    // Update invite status
    await updateDoc(doc(db, 'tenantInvites', invite.id), { status: 'accepted' })

    return user
  }

  static getDefaultPermissions(role: TenantUser['role']): string[] {
    switch (role) {
      case 'owner':
      case 'admin':
        return ['*']
      case 'manager':
        return ['events:*', 'orders:*', 'customers:read', 'reports:read']
      case 'staff':
        return ['events:read', 'orders:read', 'customers:read', 'checkin:*']
      case 'readonly':
        return ['events:read', 'orders:read', 'customers:read', 'reports:read']
      default:
        return []
    }
  }

  // ==================== AUDIT LOGGING ====================

  static async logAudit(
    data: Omit<TenantAuditLog, 'id' | 'timestamp'>
  ): Promise<void> {
    const logId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await setDoc(doc(db, 'tenantAuditLogs', logId), {
      ...data,
      id: logId,
      timestamp: Timestamp.fromDate(new Date()),
    })
  }

  static async getAuditLogs(
    tenantId: string,
    filters?: {
      userId?: string
      action?: string
      resource?: string
      startDate?: Date
      endDate?: Date
      limit?: number
    }
  ): Promise<TenantAuditLog[]> {
    let q = query(
      collection(db, 'tenantAuditLogs'),
      where('tenantId', '==', tenantId),
      orderBy('timestamp', 'desc'),
      limit(filters?.limit || 100)
    )

    if (filters?.userId) {
      q = query(q, where('userId', '==', filters.userId))
    }
    if (filters?.action) {
      q = query(q, where('action', '==', filters.action))
    }

    const snapshot = await getDocs(q)
    let logs = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        timestamp: data.timestamp.toDate(),
      } as TenantAuditLog
    })

    if (filters?.startDate) {
      logs = logs.filter((l) => l.timestamp >= filters.startDate!)
    }
    if (filters?.endDate) {
      logs = logs.filter((l) => l.timestamp <= filters.endDate!)
    }

    return logs
  }

  // ==================== PLAN MANAGEMENT ====================

  static async createPlan(
    data: Omit<Plan, 'id' | 'createdAt'>
  ): Promise<Plan> {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const plan: Plan = {
      ...data,
      id: planId,
      createdAt: new Date(),
    }

    await setDoc(doc(db, 'plans', planId), {
      ...plan,
      createdAt: Timestamp.fromDate(plan.createdAt),
    })

    return plan
  }

  static async getPlan(planId: string): Promise<Plan | null> {
    const cached = getCached<Plan>(`plan:${planId}`)
    if (cached) return cached

    const docRef = await getDoc(doc(db, 'plans', planId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    const plan: Plan = {
      ...data,
      id: docRef.id,
      createdAt: data.createdAt.toDate(),
    } as Plan

    setCache(`plan:${planId}`, plan)
    return plan
  }

  static async getPlans(includeHidden: boolean = false): Promise<Plan[]> {
    let q = query(
      collection(db, 'plans'),
      orderBy('pricing.monthly', 'asc')
    )

    if (!includeHidden) {
      q = query(q, where('hidden', '!=', true))
    }

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt.toDate(),
      } as Plan
    })
  }

  // ==================== CACHE MANAGEMENT ====================

  static clearCache(): void {
    cache.clear()
  }
}
