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
export interface Integration {
  id: string
  promoterId: string
  name: string
  provider: IntegrationProvider
  category: IntegrationCategory
  status: 'pending' | 'connected' | 'error' | 'disabled'
  config: IntegrationConfig
  credentials?: IntegrationCredentials
  mapping?: DataMapping
  syncConfig?: SyncConfig
  metrics: IntegrationMetrics
  lastSync?: Date
  lastError?: string
  createdAt: Date
  updatedAt: Date
}

export type IntegrationProvider =
  | 'salesforce'
  | 'hubspot'
  | 'mailchimp'
  | 'klaviyo'
  | 'quickbooks'
  | 'xero'
  | 'stripe'
  | 'paypal'
  | 'square'
  | 'google_analytics'
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'zapier'
  | 'make'
  | 'slack'
  | 'twilio'
  | 'sendgrid'
  | 'mailgun'
  | 'aws_s3'
  | 'google_cloud'
  | 'shopify'
  | 'woocommerce'
  | 'eventbrite'
  | 'custom_webhook'
  | 'custom_api'

export type IntegrationCategory =
  | 'crm'
  | 'marketing'
  | 'accounting'
  | 'payment'
  | 'analytics'
  | 'social'
  | 'automation'
  | 'communication'
  | 'storage'
  | 'ecommerce'
  | 'ticketing'
  | 'custom'

export interface IntegrationConfig {
  apiBaseUrl?: string
  apiVersion?: string
  environment: 'sandbox' | 'production'
  features: string[]
  permissions: string[]
  rateLimit?: {
    requestsPerMinute: number
    requestsPerDay: number
  }
  retryConfig?: {
    maxRetries: number
    retryDelay: number
    backoffMultiplier: number
  }
  customSettings?: Record<string, any>
}

export interface IntegrationCredentials {
  authType: 'oauth2' | 'api_key' | 'basic' | 'jwt' | 'custom'
  oauth?: {
    accessToken: string
    refreshToken?: string
    tokenType: string
    expiresAt?: Date
    scope?: string[]
  }
  apiKey?: {
    key: string
    secret?: string
    header?: string
  }
  basic?: {
    username: string
    password: string
  }
  jwt?: {
    token: string
    expiresAt?: Date
  }
  custom?: Record<string, string>
}

export interface DataMapping {
  id: string
  name: string
  sourceEntity: string
  targetEntity: string
  fieldMappings: FieldMapping[]
  transformations?: DataTransformation[]
  filters?: MappingFilter[]
  active: boolean
}

export interface FieldMapping {
  sourceField: string
  targetField: string
  required: boolean
  defaultValue?: any
  transform?: string
}

export interface DataTransformation {
  type: 'format' | 'calculate' | 'lookup' | 'concat' | 'split' | 'custom'
  sourceFields: string[]
  targetField: string
  config: Record<string, any>
}

export interface MappingFilter {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'contains' | 'regex'
  value: any
}

export interface SyncConfig {
  direction: 'inbound' | 'outbound' | 'bidirectional'
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual'
  entities: SyncEntity[]
  conflictResolution: 'source_wins' | 'target_wins' | 'newer_wins' | 'manual'
  batchSize: number
  enabled: boolean
}

export interface SyncEntity {
  name: string
  sourceCollection: string
  targetEndpoint: string
  mapping: string // mapping ID
  lastSyncedAt?: Date
  syncCursor?: string
}

export interface IntegrationMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  totalDataSynced: number
  averageResponseTime: number
  lastDayRequests: number
  errorsLastDay: number
}

export interface SyncJob {
  id: string
  integrationId: string
  promoterId: string
  type: 'full' | 'incremental' | 'manual'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  direction: 'inbound' | 'outbound'
  entity: string
  progress: {
    total: number
    processed: number
    succeeded: number
    failed: number
  }
  startedAt?: Date
  completedAt?: Date
  error?: string
  logs: SyncLog[]
  createdAt: Date
}

export interface SyncLog {
  timestamp: Date
  level: 'info' | 'warning' | 'error'
  message: string
  details?: Record<string, any>
}

export interface WebhookEndpoint {
  id: string
  integrationId: string
  promoterId: string
  name: string
  url: string
  events: string[]
  secret?: string
  headers?: Record<string, string>
  status: 'active' | 'inactive' | 'failed'
  lastTriggeredAt?: Date
  successCount: number
  failureCount: number
  createdAt: Date
}

export interface WebhookDelivery {
  id: string
  endpointId: string
  event: string
  payload: Record<string, any>
  status: 'pending' | 'delivered' | 'failed'
  responseCode?: number
  responseBody?: string
  attempts: number
  nextRetryAt?: Date
  deliveredAt?: Date
  createdAt: Date
}

export interface OAuthApp {
  id: string
  promoterId: string
  name: string
  description?: string
  clientId: string
  clientSecret: string
  redirectUris: string[]
  scopes: string[]
  grantTypes: ('authorization_code' | 'client_credentials' | 'refresh_token')[]
  status: 'active' | 'inactive'
  createdAt: Date
}

export interface OAuthToken {
  id: string
  appId: string
  userId?: string
  accessToken: string
  refreshToken?: string
  tokenType: string
  scope: string[]
  expiresAt: Date
  createdAt: Date
}

// Provider Configurations
const PROVIDER_CONFIGS: Record<IntegrationProvider, {
  name: string
  category: IntegrationCategory
  authTypes: IntegrationCredentials['authType'][]
  baseUrl: string
  requiredScopes?: string[]
  features: string[]
}> = {
  salesforce: {
    name: 'Salesforce',
    category: 'crm',
    authTypes: ['oauth2'],
    baseUrl: 'https://login.salesforce.com',
    requiredScopes: ['api', 'refresh_token'],
    features: ['contacts', 'leads', 'opportunities', 'campaigns'],
  },
  hubspot: {
    name: 'HubSpot',
    category: 'crm',
    authTypes: ['oauth2', 'api_key'],
    baseUrl: 'https://api.hubapi.com',
    features: ['contacts', 'companies', 'deals', 'tickets', 'marketing'],
  },
  mailchimp: {
    name: 'Mailchimp',
    category: 'marketing',
    authTypes: ['oauth2', 'api_key'],
    baseUrl: 'https://api.mailchimp.com/3.0',
    features: ['lists', 'campaigns', 'automations', 'reports'],
  },
  klaviyo: {
    name: 'Klaviyo',
    category: 'marketing',
    authTypes: ['api_key'],
    baseUrl: 'https://a.klaviyo.com/api',
    features: ['profiles', 'lists', 'campaigns', 'flows', 'events'],
  },
  quickbooks: {
    name: 'QuickBooks Online',
    category: 'accounting',
    authTypes: ['oauth2'],
    baseUrl: 'https://quickbooks.api.intuit.com',
    features: ['invoices', 'payments', 'customers', 'items', 'reports'],
  },
  xero: {
    name: 'Xero',
    category: 'accounting',
    authTypes: ['oauth2'],
    baseUrl: 'https://api.xero.com',
    features: ['invoices', 'contacts', 'payments', 'bank_transactions'],
  },
  stripe: {
    name: 'Stripe',
    category: 'payment',
    authTypes: ['api_key'],
    baseUrl: 'https://api.stripe.com/v1',
    features: ['payments', 'subscriptions', 'invoices', 'customers'],
  },
  paypal: {
    name: 'PayPal',
    category: 'payment',
    authTypes: ['oauth2'],
    baseUrl: 'https://api.paypal.com',
    features: ['payments', 'payouts', 'subscriptions'],
  },
  square: {
    name: 'Square',
    category: 'payment',
    authTypes: ['oauth2'],
    baseUrl: 'https://connect.squareup.com/v2',
    features: ['payments', 'orders', 'inventory', 'customers'],
  },
  google_analytics: {
    name: 'Google Analytics',
    category: 'analytics',
    authTypes: ['oauth2'],
    baseUrl: 'https://analyticsdata.googleapis.com',
    features: ['reports', 'realtime', 'audiences'],
  },
  facebook: {
    name: 'Facebook',
    category: 'social',
    authTypes: ['oauth2'],
    baseUrl: 'https://graph.facebook.com',
    features: ['pages', 'events', 'ads', 'insights'],
  },
  instagram: {
    name: 'Instagram',
    category: 'social',
    authTypes: ['oauth2'],
    baseUrl: 'https://graph.instagram.com',
    features: ['media', 'insights', 'stories'],
  },
  twitter: {
    name: 'Twitter/X',
    category: 'social',
    authTypes: ['oauth2'],
    baseUrl: 'https://api.twitter.com/2',
    features: ['tweets', 'users', 'analytics'],
  },
  zapier: {
    name: 'Zapier',
    category: 'automation',
    authTypes: ['api_key'],
    baseUrl: 'https://hooks.zapier.com',
    features: ['triggers', 'actions'],
  },
  make: {
    name: 'Make (Integromat)',
    category: 'automation',
    authTypes: ['api_key'],
    baseUrl: 'https://hook.make.com',
    features: ['triggers', 'actions'],
  },
  slack: {
    name: 'Slack',
    category: 'communication',
    authTypes: ['oauth2'],
    baseUrl: 'https://slack.com/api',
    features: ['messages', 'channels', 'notifications'],
  },
  twilio: {
    name: 'Twilio',
    category: 'communication',
    authTypes: ['basic'],
    baseUrl: 'https://api.twilio.com',
    features: ['sms', 'voice', 'whatsapp'],
  },
  sendgrid: {
    name: 'SendGrid',
    category: 'communication',
    authTypes: ['api_key'],
    baseUrl: 'https://api.sendgrid.com/v3',
    features: ['email', 'templates', 'contacts'],
  },
  mailgun: {
    name: 'Mailgun',
    category: 'communication',
    authTypes: ['api_key'],
    baseUrl: 'https://api.mailgun.net/v3',
    features: ['email', 'templates', 'validation'],
  },
  aws_s3: {
    name: 'Amazon S3',
    category: 'storage',
    authTypes: ['api_key'],
    baseUrl: 'https://s3.amazonaws.com',
    features: ['upload', 'download', 'presigned_urls'],
  },
  google_cloud: {
    name: 'Google Cloud Storage',
    category: 'storage',
    authTypes: ['oauth2', 'api_key'],
    baseUrl: 'https://storage.googleapis.com',
    features: ['upload', 'download', 'signed_urls'],
  },
  shopify: {
    name: 'Shopify',
    category: 'ecommerce',
    authTypes: ['oauth2'],
    baseUrl: 'https://admin.shopify.com/api',
    features: ['products', 'orders', 'customers', 'inventory'],
  },
  woocommerce: {
    name: 'WooCommerce',
    category: 'ecommerce',
    authTypes: ['api_key'],
    baseUrl: '/wp-json/wc/v3',
    features: ['products', 'orders', 'customers'],
  },
  eventbrite: {
    name: 'Eventbrite',
    category: 'ticketing',
    authTypes: ['oauth2'],
    baseUrl: 'https://www.eventbriteapi.com/v3',
    features: ['events', 'orders', 'attendees', 'venues'],
  },
  custom_webhook: {
    name: 'Custom Webhook',
    category: 'custom',
    authTypes: ['api_key', 'basic', 'custom'],
    baseUrl: '',
    features: ['webhooks'],
  },
  custom_api: {
    name: 'Custom API',
    category: 'custom',
    authTypes: ['api_key', 'basic', 'oauth2', 'jwt', 'custom'],
    baseUrl: '',
    features: ['custom'],
  },
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

// Helper functions
function encryptCredentials(credentials: IntegrationCredentials): string {
  // In production, use proper encryption (AES-256-GCM)
  return Buffer.from(JSON.stringify(credentials)).toString('base64')
}

function decryptCredentials(encrypted: string): IntegrationCredentials {
  // In production, use proper decryption
  return JSON.parse(Buffer.from(encrypted, 'base64').toString())
}

function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`
}

function generateClientSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let secret = ''
  for (let i = 0; i < 64; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return secret
}

function generateWebhookSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let secret = 'whsec_'
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return secret
}

// Main Service Class
export class IntegrationHubService {
  // ==================== PROVIDER INFO ====================

  static getAvailableProviders(): Array<{
    provider: IntegrationProvider
    name: string
    category: IntegrationCategory
    features: string[]
  }> {
    return Object.entries(PROVIDER_CONFIGS).map(([provider, config]) => ({
      provider: provider as IntegrationProvider,
      name: config.name,
      category: config.category,
      features: config.features,
    }))
  }

  static getProviderConfig(provider: IntegrationProvider) {
    return PROVIDER_CONFIGS[provider]
  }

  // ==================== INTEGRATION MANAGEMENT ====================

  static async createIntegration(
    data: {
      promoterId: string
      name: string
      provider: IntegrationProvider
      config: Partial<IntegrationConfig>
      credentials?: IntegrationCredentials
    }
  ): Promise<Integration> {
    const integrationId = `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const providerConfig = PROVIDER_CONFIGS[data.provider]

    const integration: Integration = {
      id: integrationId,
      promoterId: data.promoterId,
      name: data.name,
      provider: data.provider,
      category: providerConfig.category,
      status: data.credentials ? 'connected' : 'pending',
      config: {
        apiBaseUrl: data.config.apiBaseUrl || providerConfig.baseUrl,
        apiVersion: data.config.apiVersion,
        environment: data.config.environment || 'production',
        features: data.config.features || providerConfig.features,
        permissions: data.config.permissions || [],
        rateLimit: data.config.rateLimit || { requestsPerMinute: 60, requestsPerDay: 10000 },
        retryConfig: data.config.retryConfig || { maxRetries: 3, retryDelay: 1000, backoffMultiplier: 2 },
        customSettings: data.config.customSettings,
      },
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalDataSynced: 0,
        averageResponseTime: 0,
        lastDayRequests: 0,
        errorsLastDay: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const firestoreData: any = {
      ...integration,
      createdAt: Timestamp.fromDate(integration.createdAt),
      updatedAt: Timestamp.fromDate(integration.updatedAt),
    }

    if (data.credentials) {
      firestoreData.encryptedCredentials = encryptCredentials(data.credentials)
    }

    await setDoc(doc(db, 'integrations', integrationId), firestoreData)

    return integration
  }

  static async getIntegration(integrationId: string): Promise<Integration | null> {
    const cached = getCached<Integration>(`integration:${integrationId}`)
    if (cached) return cached

    const docRef = await getDoc(doc(db, 'integrations', integrationId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    const integration: Integration = {
      ...data,
      id: docRef.id,
      credentials: data.encryptedCredentials
        ? decryptCredentials(data.encryptedCredentials)
        : undefined,
      lastSync: data.lastSync?.toDate(),
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as Integration

    setCache(`integration:${integrationId}`, integration)
    return integration
  }

  static async getIntegrations(
    promoterId: string,
    filters?: {
      category?: IntegrationCategory
      provider?: IntegrationProvider
      status?: Integration['status']
    }
  ): Promise<Integration[]> {
    let q = query(
      collection(db, 'integrations'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    if (filters?.category) {
      q = query(q, where('category', '==', filters.category))
    }
    if (filters?.provider) {
      q = query(q, where('provider', '==', filters.provider))
    }
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status))
    }

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        credentials: data.encryptedCredentials
          ? decryptCredentials(data.encryptedCredentials)
          : undefined,
        lastSync: data.lastSync?.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as Integration
    })
  }

  static async updateIntegration(
    integrationId: string,
    updates: Partial<Integration>
  ): Promise<void> {
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }

    if (updates.credentials) {
      updateData.encryptedCredentials = encryptCredentials(updates.credentials)
      delete updateData.credentials
    }

    delete updateData.id
    delete updateData.createdAt

    await updateDoc(doc(db, 'integrations', integrationId), updateData)
    cache.delete(`integration:${integrationId}`)
  }

  static async updateCredentials(
    integrationId: string,
    credentials: IntegrationCredentials
  ): Promise<void> {
    await updateDoc(doc(db, 'integrations', integrationId), {
      encryptedCredentials: encryptCredentials(credentials),
      status: 'connected',
      updatedAt: Timestamp.fromDate(new Date()),
    })
    cache.delete(`integration:${integrationId}`)
  }

  static async disableIntegration(integrationId: string): Promise<void> {
    await this.updateIntegration(integrationId, { status: 'disabled' })
  }

  static async deleteIntegration(integrationId: string): Promise<void> {
    // Delete associated webhooks
    const webhooksQuery = query(
      collection(db, 'webhookEndpoints'),
      where('integrationId', '==', integrationId)
    )
    const webhooksSnap = await getDocs(webhooksQuery)
    const batch = writeBatch(db)

    for (const webhookDoc of webhooksSnap.docs) {
      batch.delete(webhookDoc.ref)
    }

    // Delete associated sync jobs
    const jobsQuery = query(
      collection(db, 'syncJobs'),
      where('integrationId', '==', integrationId)
    )
    const jobsSnap = await getDocs(jobsQuery)
    for (const jobDoc of jobsSnap.docs) {
      batch.delete(jobDoc.ref)
    }

    // Delete integration
    batch.delete(doc(db, 'integrations', integrationId))

    await batch.commit()
    cache.delete(`integration:${integrationId}`)
  }

  static async testConnection(integrationId: string): Promise<{
    success: boolean
    message: string
    responseTime?: number
  }> {
    const integration = await this.getIntegration(integrationId)
    if (!integration) {
      return { success: false, message: 'Integration not found' }
    }

    if (!integration.credentials) {
      return { success: false, message: 'No credentials configured' }
    }

    const startTime = Date.now()

    try {
      // Simulate connection test based on provider
      // In production, actually test the connection
      await new Promise((resolve) => setTimeout(resolve, 100))

      const responseTime = Date.now() - startTime

      await updateDoc(doc(db, 'integrations', integrationId), {
        status: 'connected',
        lastError: null,
        updatedAt: Timestamp.fromDate(new Date()),
      })

      cache.delete(`integration:${integrationId}`)

      return {
        success: true,
        message: 'Connection successful',
        responseTime,
      }
    } catch (error: any) {
      await updateDoc(doc(db, 'integrations', integrationId), {
        status: 'error',
        lastError: error.message,
        updatedAt: Timestamp.fromDate(new Date()),
      })

      cache.delete(`integration:${integrationId}`)

      return {
        success: false,
        message: error.message,
      }
    }
  }

  // ==================== DATA MAPPING ====================

  static async createMapping(
    integrationId: string,
    data: Omit<DataMapping, 'id'>
  ): Promise<DataMapping> {
    const mappingId = `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const mapping: DataMapping = {
      ...data,
      id: mappingId,
    }

    await updateDoc(doc(db, 'integrations', integrationId), {
      mapping,
      updatedAt: Timestamp.fromDate(new Date()),
    })

    cache.delete(`integration:${integrationId}`)

    return mapping
  }

  static async updateMapping(
    integrationId: string,
    updates: Partial<DataMapping>
  ): Promise<void> {
    const integration = await this.getIntegration(integrationId)
    if (!integration || !integration.mapping) {
      throw new Error('Integration or mapping not found')
    }

    const updatedMapping = { ...integration.mapping, ...updates }

    await updateDoc(doc(db, 'integrations', integrationId), {
      mapping: updatedMapping,
      updatedAt: Timestamp.fromDate(new Date()),
    })

    cache.delete(`integration:${integrationId}`)
  }

  static applyMapping(
    data: Record<string, any>,
    mapping: DataMapping
  ): Record<string, any> {
    const result: Record<string, any> = {}

    // Apply field mappings
    for (const fieldMap of mapping.fieldMappings) {
      let value = data[fieldMap.sourceField]

      if (value === undefined || value === null) {
        if (fieldMap.required && fieldMap.defaultValue === undefined) {
          throw new Error(`Required field missing: ${fieldMap.sourceField}`)
        }
        value = fieldMap.defaultValue
      }

      // Apply simple transforms
      if (fieldMap.transform) {
        switch (fieldMap.transform) {
          case 'lowercase':
            value = String(value).toLowerCase()
            break
          case 'uppercase':
            value = String(value).toUpperCase()
            break
          case 'trim':
            value = String(value).trim()
            break
          case 'toNumber':
            value = Number(value)
            break
          case 'toString':
            value = String(value)
            break
          case 'toBoolean':
            value = Boolean(value)
            break
          case 'toDate':
            value = new Date(value).toISOString()
            break
        }
      }

      result[fieldMap.targetField] = value
    }

    // Apply transformations
    if (mapping.transformations) {
      for (const transform of mapping.transformations) {
        switch (transform.type) {
          case 'concat':
            result[transform.targetField] = transform.sourceFields
              .map((f) => data[f] || '')
              .join(transform.config.separator || ' ')
            break
          case 'split':
            const splitValue = data[transform.sourceFields[0]] || ''
            const parts = splitValue.split(transform.config.separator || ',')
            result[transform.targetField] = parts[transform.config.index || 0]
            break
          case 'calculate':
            // Simple arithmetic
            if (transform.config.operation === 'sum') {
              result[transform.targetField] = transform.sourceFields
                .reduce((sum, f) => sum + (Number(data[f]) || 0), 0)
            }
            break
          case 'format':
            result[transform.targetField] = transform.config.template
              .replace(/\{(\w+)\}/g, (match: string, field: string) => data[field] || '')
            break
        }
      }
    }

    return result
  }

  // ==================== SYNC JOBS ====================

  static async createSyncJob(
    integrationId: string,
    data: {
      type: SyncJob['type']
      direction: SyncJob['direction']
      entity: string
    }
  ): Promise<SyncJob> {
    const integration = await this.getIntegration(integrationId)
    if (!integration) {
      throw new Error('Integration not found')
    }

    const jobId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const job: SyncJob = {
      id: jobId,
      integrationId,
      promoterId: integration.promoterId,
      type: data.type,
      status: 'pending',
      direction: data.direction,
      entity: data.entity,
      progress: {
        total: 0,
        processed: 0,
        succeeded: 0,
        failed: 0,
      },
      logs: [],
      createdAt: new Date(),
    }

    await setDoc(doc(db, 'syncJobs', jobId), {
      ...job,
      createdAt: Timestamp.fromDate(job.createdAt),
    })

    return job
  }

  static async getSyncJob(jobId: string): Promise<SyncJob | null> {
    const docRef = await getDoc(doc(db, 'syncJobs', jobId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    return {
      ...data,
      id: docRef.id,
      startedAt: data.startedAt?.toDate(),
      completedAt: data.completedAt?.toDate(),
      createdAt: data.createdAt.toDate(),
      logs: data.logs?.map((log: any) => ({
        ...log,
        timestamp: log.timestamp.toDate(),
      })) || [],
    } as SyncJob
  }

  static async getSyncJobs(
    integrationId: string,
    filters?: {
      status?: SyncJob['status']
      limit?: number
    }
  ): Promise<SyncJob[]> {
    let q = query(
      collection(db, 'syncJobs'),
      where('integrationId', '==', integrationId),
      orderBy('createdAt', 'desc'),
      limit(filters?.limit || 50)
    )

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status))
    }

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
        createdAt: data.createdAt.toDate(),
        logs: data.logs?.map((log: any) => ({
          ...log,
          timestamp: log.timestamp.toDate(),
        })) || [],
      } as SyncJob
    })
  }

  static async startSyncJob(jobId: string): Promise<void> {
    await updateDoc(doc(db, 'syncJobs', jobId), {
      status: 'running',
      startedAt: Timestamp.fromDate(new Date()),
    })
  }

  static async updateSyncProgress(
    jobId: string,
    progress: Partial<SyncJob['progress']>,
    log?: SyncLog
  ): Promise<void> {
    const updates: any = {}

    if (progress.total !== undefined) updates['progress.total'] = progress.total
    if (progress.processed !== undefined) updates['progress.processed'] = progress.processed
    if (progress.succeeded !== undefined) updates['progress.succeeded'] = progress.succeeded
    if (progress.failed !== undefined) updates['progress.failed'] = progress.failed

    if (log) {
      const job = await this.getSyncJob(jobId)
      if (job) {
        updates.logs = [...job.logs, { ...log, timestamp: Timestamp.fromDate(log.timestamp) }]
      }
    }

    await updateDoc(doc(db, 'syncJobs', jobId), updates)
  }

  static async completeSyncJob(
    jobId: string,
    status: 'completed' | 'failed',
    error?: string
  ): Promise<void> {
    const job = await this.getSyncJob(jobId)
    if (!job) return

    const updates: any = {
      status,
      completedAt: Timestamp.fromDate(new Date()),
    }

    if (error) {
      updates.error = error
    }

    await updateDoc(doc(db, 'syncJobs', jobId), updates)

    // Update integration metrics and last sync
    await updateDoc(doc(db, 'integrations', job.integrationId), {
      lastSync: Timestamp.fromDate(new Date()),
      'metrics.totalDataSynced': increment(job.progress.succeeded),
      updatedAt: Timestamp.fromDate(new Date()),
    })

    cache.delete(`integration:${job.integrationId}`)
  }

  // ==================== WEBHOOK MANAGEMENT ====================

  static async createWebhookEndpoint(
    data: Omit<WebhookEndpoint, 'id' | 'secret' | 'lastTriggeredAt' | 'successCount' | 'failureCount' | 'createdAt'>
  ): Promise<WebhookEndpoint> {
    const endpointId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const secret = generateWebhookSecret()

    const endpoint: WebhookEndpoint = {
      ...data,
      id: endpointId,
      secret,
      successCount: 0,
      failureCount: 0,
      createdAt: new Date(),
    }

    await setDoc(doc(db, 'webhookEndpoints', endpointId), {
      ...endpoint,
      createdAt: Timestamp.fromDate(endpoint.createdAt),
    })

    return endpoint
  }

  static async getWebhookEndpoint(endpointId: string): Promise<WebhookEndpoint | null> {
    const docRef = await getDoc(doc(db, 'webhookEndpoints', endpointId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    return {
      ...data,
      id: docRef.id,
      lastTriggeredAt: data.lastTriggeredAt?.toDate(),
      createdAt: data.createdAt.toDate(),
    } as WebhookEndpoint
  }

  static async getWebhookEndpoints(
    integrationId: string
  ): Promise<WebhookEndpoint[]> {
    const q = query(
      collection(db, 'webhookEndpoints'),
      where('integrationId', '==', integrationId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        lastTriggeredAt: data.lastTriggeredAt?.toDate(),
        createdAt: data.createdAt.toDate(),
      } as WebhookEndpoint
    })
  }

  static async updateWebhookEndpoint(
    endpointId: string,
    updates: Partial<WebhookEndpoint>
  ): Promise<void> {
    const updateData: any = { ...updates }
    delete updateData.id
    delete updateData.createdAt
    delete updateData.secret

    await updateDoc(doc(db, 'webhookEndpoints', endpointId), updateData)
  }

  static async deleteWebhookEndpoint(endpointId: string): Promise<void> {
    await deleteDoc(doc(db, 'webhookEndpoints', endpointId))
  }

  static async triggerWebhook(
    endpointId: string,
    event: string,
    payload: Record<string, any>
  ): Promise<WebhookDelivery> {
    const endpoint = await this.getWebhookEndpoint(endpointId)
    if (!endpoint) {
      throw new Error('Webhook endpoint not found')
    }

    if (endpoint.status !== 'active') {
      throw new Error('Webhook endpoint is not active')
    }

    if (!endpoint.events.includes(event) && !endpoint.events.includes('*')) {
      throw new Error('Event not subscribed')
    }

    const deliveryId = `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const delivery: WebhookDelivery = {
      id: deliveryId,
      endpointId,
      event,
      payload,
      status: 'pending',
      attempts: 0,
      createdAt: new Date(),
    }

    await setDoc(doc(db, 'webhookDeliveries', deliveryId), {
      ...delivery,
      createdAt: Timestamp.fromDate(delivery.createdAt),
    })

    // Attempt delivery
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          'X-Webhook-Signature': this.generateWebhookSignature(payload, endpoint.secret!),
          ...endpoint.headers,
        },
        body: JSON.stringify(payload),
      })

      await updateDoc(doc(db, 'webhookDeliveries', deliveryId), {
        status: response.ok ? 'delivered' : 'failed',
        responseCode: response.status,
        responseBody: await response.text().catch(() => ''),
        attempts: increment(1),
        deliveredAt: response.ok ? Timestamp.fromDate(new Date()) : null,
      })

      await updateDoc(doc(db, 'webhookEndpoints', endpointId), {
        lastTriggeredAt: Timestamp.fromDate(new Date()),
        [response.ok ? 'successCount' : 'failureCount']: increment(1),
        status: response.ok ? 'active' : 'failed',
      })

      delivery.status = response.ok ? 'delivered' : 'failed'
      delivery.responseCode = response.status
    } catch (error: any) {
      await updateDoc(doc(db, 'webhookDeliveries', deliveryId), {
        status: 'failed',
        attempts: increment(1),
        nextRetryAt: Timestamp.fromDate(new Date(Date.now() + 60000)),
      })

      delivery.status = 'failed'
    }

    return delivery
  }

  static generateWebhookSignature(payload: Record<string, any>, secret: string): string {
    // In production, use HMAC-SHA256
    const data = JSON.stringify(payload)
    return `sha256=${Buffer.from(data + secret).toString('base64').substring(0, 64)}`
  }

  static async getWebhookDeliveries(
    endpointId: string,
    limit_count: number = 50
  ): Promise<WebhookDelivery[]> {
    const q = query(
      collection(db, 'webhookDeliveries'),
      where('endpointId', '==', endpointId),
      orderBy('createdAt', 'desc'),
      limit(limit_count)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        nextRetryAt: data.nextRetryAt?.toDate(),
        deliveredAt: data.deliveredAt?.toDate(),
        createdAt: data.createdAt.toDate(),
      } as WebhookDelivery
    })
  }

  // ==================== OAUTH APP MANAGEMENT ====================

  static async createOAuthApp(
    data: Omit<OAuthApp, 'id' | 'clientId' | 'clientSecret' | 'createdAt'>
  ): Promise<OAuthApp> {
    const appId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const clientId = generateClientId()
    const clientSecret = generateClientSecret()

    const app: OAuthApp = {
      ...data,
      id: appId,
      clientId,
      clientSecret,
      createdAt: new Date(),
    }

    await setDoc(doc(db, 'oauthApps', appId), {
      ...app,
      createdAt: Timestamp.fromDate(app.createdAt),
    })

    return app
  }

  static async getOAuthApp(appId: string): Promise<OAuthApp | null> {
    const docRef = await getDoc(doc(db, 'oauthApps', appId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    return {
      ...data,
      id: docRef.id,
      createdAt: data.createdAt.toDate(),
    } as OAuthApp
  }

  static async getOAuthAppByClientId(clientId: string): Promise<OAuthApp | null> {
    const q = query(
      collection(db, 'oauthApps'),
      where('clientId', '==', clientId),
      limit(1)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const doc_data = snapshot.docs[0]
    const data = doc_data.data()
    return {
      ...data,
      id: doc_data.id,
      createdAt: data.createdAt.toDate(),
    } as OAuthApp
  }

  static async getOAuthApps(promoterId: string): Promise<OAuthApp[]> {
    const q = query(
      collection(db, 'oauthApps'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt.toDate(),
      } as OAuthApp
    })
  }

  static async regenerateClientSecret(appId: string): Promise<string> {
    const newSecret = generateClientSecret()

    await updateDoc(doc(db, 'oauthApps', appId), {
      clientSecret: newSecret,
    })

    return newSecret
  }

  static async deleteOAuthApp(appId: string): Promise<void> {
    // Delete associated tokens
    const tokensQuery = query(
      collection(db, 'oauthTokens'),
      where('appId', '==', appId)
    )
    const tokensSnap = await getDocs(tokensQuery)
    const batch = writeBatch(db)

    for (const tokenDoc of tokensSnap.docs) {
      batch.delete(tokenDoc.ref)
    }

    batch.delete(doc(db, 'oauthApps', appId))

    await batch.commit()
  }

  // ==================== METRICS ====================

  static async recordRequest(
    integrationId: string,
    success: boolean,
    responseTime: number
  ): Promise<void> {
    const integration = await this.getIntegration(integrationId)
    if (!integration) return

    const updates: any = {
      'metrics.totalRequests': increment(1),
      'metrics.lastDayRequests': increment(1),
      updatedAt: Timestamp.fromDate(new Date()),
    }

    if (success) {
      updates['metrics.successfulRequests'] = increment(1)
    } else {
      updates['metrics.failedRequests'] = increment(1)
      updates['metrics.errorsLastDay'] = increment(1)
    }

    // Update average response time
    const totalRequests = integration.metrics.totalRequests + 1
    const newAvgTime = (
      (integration.metrics.averageResponseTime * integration.metrics.totalRequests) +
      responseTime
    ) / totalRequests
    updates['metrics.averageResponseTime'] = newAvgTime

    await updateDoc(doc(db, 'integrations', integrationId), updates)
    cache.delete(`integration:${integrationId}`)
  }

  static async getIntegrationAnalytics(
    promoterId: string
  ): Promise<{
    totalIntegrations: number
    activeIntegrations: number
    errorIntegrations: number
    byCategory: Record<IntegrationCategory, number>
    totalRequests: number
    successRate: number
    topIntegrations: Array<{ id: string; name: string; requests: number }>
  }> {
    const integrations = await this.getIntegrations(promoterId)

    const byCategory: Record<IntegrationCategory, number> = {} as any

    let totalRequests = 0
    let successfulRequests = 0

    for (const int of integrations) {
      byCategory[int.category] = (byCategory[int.category] || 0) + 1
      totalRequests += int.metrics.totalRequests
      successfulRequests += int.metrics.successfulRequests
    }

    const topIntegrations = integrations
      .sort((a, b) => b.metrics.totalRequests - a.metrics.totalRequests)
      .slice(0, 5)
      .map((int) => ({
        id: int.id,
        name: int.name,
        requests: int.metrics.totalRequests,
      }))

    return {
      totalIntegrations: integrations.length,
      activeIntegrations: integrations.filter((i) => i.status === 'connected').length,
      errorIntegrations: integrations.filter((i) => i.status === 'error').length,
      byCategory,
      totalRequests,
      successRate: totalRequests > 0
        ? Math.round((successfulRequests / totalRequests) * 10000) / 100
        : 0,
      topIntegrations,
    }
  }

  // ==================== CACHE MANAGEMENT ====================

  static clearCache(): void {
    cache.clear()
  }
}
