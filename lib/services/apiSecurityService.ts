/**
 * API Rate Limiting & Security Service
 * Comprehensive API protection for event ticketing platform
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  increment,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AuditService } from './auditService'
import crypto from 'crypto'

// ==================== TYPES ====================

export interface ApiKey {
  id?: string
  promoterId: string
  name: string
  keyHash: string // SHA-256 hash of the actual key
  keyPrefix: string // First 8 characters for identification
  permissions: ApiPermission[]
  rateLimit: RateLimitConfig
  ipWhitelist?: string[]
  status: 'active' | 'suspended' | 'revoked'
  environment: 'production' | 'staging' | 'development'
  lastUsedAt?: Date
  usageCount: number
  expiresAt?: Date
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface ApiPermission {
  resource: string // e.g., 'events', 'orders', 'customers'
  actions: ('read' | 'create' | 'update' | 'delete')[]
}

export interface RateLimitConfig {
  requestsPerSecond: number
  requestsPerMinute: number
  requestsPerHour: number
  requestsPerDay: number
  burstLimit: number
}

export interface RateLimitState {
  id?: string
  keyId: string
  windowType: 'second' | 'minute' | 'hour' | 'day'
  windowStart: Date
  requestCount: number
  lastRequestAt: Date
}

export interface SecurityIncident {
  id?: string
  promoterId?: string
  type: 'rate_limit_exceeded' | 'invalid_key' | 'ip_blocked' | 'suspicious_activity' | 'brute_force' | 'injection_attempt' | 'unauthorized_access'
  severity: 'low' | 'medium' | 'high' | 'critical'
  source: {
    ip: string
    userAgent?: string
    apiKeyId?: string
    userId?: string
  }
  details: {
    endpoint?: string
    method?: string
    requestBody?: string
    headers?: Record<string, string>
    additionalInfo?: string
  }
  status: 'open' | 'investigating' | 'resolved' | 'false_positive'
  resolution?: string
  createdAt: Date
  resolvedAt?: Date
  resolvedBy?: string
}

export interface IpBlockRule {
  id?: string
  promoterId?: string // null = global rule
  ip: string
  type: 'single' | 'range' | 'cidr'
  reason: string
  status: 'active' | 'expired'
  expiresAt?: Date
  createdBy: string
  createdAt: Date
}

export interface WebhookSignature {
  id?: string
  promoterId: string
  webhookId: string
  secret: string
  algorithm: 'sha256' | 'sha512'
  createdAt: Date
  rotatedAt?: Date
}

export interface SecurityPolicy {
  id?: string
  promoterId: string
  name: string
  rules: SecurityRule[]
  actions: SecurityAction[]
  enabled: boolean
  priority: number
  createdAt: Date
  updatedAt: Date
}

export interface SecurityRule {
  type: 'rate_limit' | 'ip_check' | 'geo_block' | 'user_agent' | 'request_size' | 'payload_check'
  condition: {
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'matches' | 'in_list'
    value: any
  }
}

export interface SecurityAction {
  type: 'block' | 'rate_limit' | 'log' | 'alert' | 'challenge'
  config?: Record<string, any>
}

// ==================== SERVICE ====================

class ApiSecurityServiceClass {
  private auditService: AuditService
  private rateLimitCache: Map<string, { count: number; windowStart: Date }> = new Map()
  private blockedIpCache: Set<string> = new Set()

  constructor() {
    this.auditService = new AuditService()
  }

  // ==================== API KEY MANAGEMENT ====================

  async createApiKey(
    data: {
      promoterId: string
      name: string
      permissions: ApiPermission[]
      rateLimit?: Partial<RateLimitConfig>
      ipWhitelist?: string[]
      environment: ApiKey['environment']
      expiresAt?: Date
    },
    createdBy: string
  ): Promise<{ apiKey: ApiKey; rawKey: string }> {
    // Generate secure random key
    const rawKey = this.generateApiKey()
    const keyHash = this.hashApiKey(rawKey)
    const keyPrefix = rawKey.substring(0, 8)

    const defaultRateLimit: RateLimitConfig = {
      requestsPerSecond: 10,
      requestsPerMinute: 100,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      burstLimit: 50,
    }

    const now = new Date()
    const apiKeyData: Omit<ApiKey, 'id'> = {
      promoterId: data.promoterId,
      name: data.name,
      keyHash,
      keyPrefix,
      permissions: data.permissions,
      rateLimit: { ...defaultRateLimit, ...data.rateLimit },
      ipWhitelist: data.ipWhitelist,
      status: 'active',
      environment: data.environment,
      usageCount: 0,
      expiresAt: data.expiresAt,
      createdBy,
      createdAt: now,
      updatedAt: now,
    }

    const docRef = await addDoc(collection(db, 'apiKeys'), {
      ...apiKeyData,
      expiresAt: data.expiresAt ? Timestamp.fromDate(data.expiresAt) : null,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    })

    await this.auditService.logActivity({
      userId: createdBy,
      action: 'create',
      resourceType: 'api_key',
      resourceId: docRef.id,
      details: { name: data.name, environment: data.environment },
      ipAddress: '',
      userAgent: '',
    })

    return {
      apiKey: { id: docRef.id, ...apiKeyData },
      rawKey, // Only returned once, at creation time
    }
  }

  private generateApiKey(): string {
    const prefix = 'sk_'
    const randomBytes = crypto.randomBytes(32)
    const key = randomBytes.toString('base64url')
    return `${prefix}${key}`
  }

  private hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex')
  }

  async validateApiKey(rawKey: string): Promise<{
    valid: boolean
    apiKey?: ApiKey
    error?: string
  }> {
    const keyHash = this.hashApiKey(rawKey)

    const q = query(
      collection(db, 'apiKeys'),
      where('keyHash', '==', keyHash)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) {
      return { valid: false, error: 'Invalid API key' }
    }

    const apiKeyDoc = snapshot.docs[0]
    const apiKey = {
      id: apiKeyDoc.id,
      ...apiKeyDoc.data(),
      lastUsedAt: apiKeyDoc.data().lastUsedAt?.toDate(),
      expiresAt: apiKeyDoc.data().expiresAt?.toDate(),
      createdAt: apiKeyDoc.data().createdAt?.toDate(),
      updatedAt: apiKeyDoc.data().updatedAt?.toDate(),
    } as ApiKey

    // Check status
    if (apiKey.status !== 'active') {
      return { valid: false, error: `API key is ${apiKey.status}` }
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false, error: 'API key has expired' }
    }

    // Update usage stats
    await updateDoc(doc(db, 'apiKeys', apiKey.id!), {
      lastUsedAt: Timestamp.fromDate(new Date()),
      usageCount: increment(1),
    })

    return { valid: true, apiKey }
  }

  async getApiKeys(promoterId: string): Promise<ApiKey[]> {
    const q = query(
      collection(db, 'apiKeys'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      lastUsedAt: doc.data().lastUsedAt?.toDate(),
      expiresAt: doc.data().expiresAt?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as ApiKey[]
  }

  async updateApiKey(
    keyId: string,
    updates: Partial<Pick<ApiKey, 'name' | 'permissions' | 'rateLimit' | 'ipWhitelist' | 'status'>>,
    userId: string
  ): Promise<void> {
    await updateDoc(doc(db, 'apiKeys', keyId), {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    })

    await this.auditService.logActivity({
      userId,
      action: 'update',
      resourceType: 'api_key',
      resourceId: keyId,
      details: { updates: Object.keys(updates) },
      ipAddress: '',
      userAgent: '',
    })
  }

  async revokeApiKey(keyId: string, userId: string): Promise<void> {
    await updateDoc(doc(db, 'apiKeys', keyId), {
      status: 'revoked',
      updatedAt: Timestamp.fromDate(new Date()),
    })

    await this.auditService.logActivity({
      userId,
      action: 'revoke',
      resourceType: 'api_key',
      resourceId: keyId,
      details: {},
      ipAddress: '',
      userAgent: '',
    })
  }

  async rotateApiKey(keyId: string, userId: string): Promise<{ newKey: string }> {
    const newKey = this.generateApiKey()
    const keyHash = this.hashApiKey(newKey)
    const keyPrefix = newKey.substring(0, 8)

    await updateDoc(doc(db, 'apiKeys', keyId), {
      keyHash,
      keyPrefix,
      updatedAt: Timestamp.fromDate(new Date()),
    })

    await this.auditService.logActivity({
      userId,
      action: 'rotate',
      resourceType: 'api_key',
      resourceId: keyId,
      details: {},
      ipAddress: '',
      userAgent: '',
    })

    return { newKey }
  }

  // ==================== RATE LIMITING ====================

  async checkRateLimit(
    apiKey: ApiKey,
    ipAddress: string
  ): Promise<{
    allowed: boolean
    remaining: number
    resetAt: Date
    retryAfter?: number
  }> {
    const now = new Date()
    const cacheKey = `${apiKey.id}-minute`

    // Check in-memory cache first
    const cached = this.rateLimitCache.get(cacheKey)
    if (cached) {
      const windowEnd = new Date(cached.windowStart.getTime() + 60000)
      if (now < windowEnd) {
        if (cached.count >= apiKey.rateLimit.requestsPerMinute) {
          const retryAfter = Math.ceil((windowEnd.getTime() - now.getTime()) / 1000)
          return {
            allowed: false,
            remaining: 0,
            resetAt: windowEnd,
            retryAfter,
          }
        }
        cached.count++
        return {
          allowed: true,
          remaining: apiKey.rateLimit.requestsPerMinute - cached.count,
          resetAt: windowEnd,
        }
      }
    }

    // Reset window
    this.rateLimitCache.set(cacheKey, { count: 1, windowStart: now })

    // Persist to database for distributed rate limiting
    await this.updateRateLimitState(apiKey.id!, 'minute', now)

    return {
      allowed: true,
      remaining: apiKey.rateLimit.requestsPerMinute - 1,
      resetAt: new Date(now.getTime() + 60000),
    }
  }

  private async updateRateLimitState(
    keyId: string,
    windowType: RateLimitState['windowType'],
    now: Date
  ): Promise<void> {
    const windowDurations = {
      second: 1000,
      minute: 60000,
      hour: 3600000,
      day: 86400000,
    }

    const windowStart = new Date(
      Math.floor(now.getTime() / windowDurations[windowType]) * windowDurations[windowType]
    )

    const q = query(
      collection(db, 'rateLimitStates'),
      where('keyId', '==', keyId),
      where('windowType', '==', windowType)
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      await addDoc(collection(db, 'rateLimitStates'), {
        keyId,
        windowType,
        windowStart: Timestamp.fromDate(windowStart),
        requestCount: 1,
        lastRequestAt: Timestamp.fromDate(now),
      })
    } else {
      const stateDoc = snapshot.docs[0]
      const state = stateDoc.data()
      const existingWindowStart = state.windowStart.toDate()

      if (existingWindowStart.getTime() === windowStart.getTime()) {
        await updateDoc(doc(db, 'rateLimitStates', stateDoc.id), {
          requestCount: increment(1),
          lastRequestAt: Timestamp.fromDate(now),
        })
      } else {
        await updateDoc(doc(db, 'rateLimitStates', stateDoc.id), {
          windowStart: Timestamp.fromDate(windowStart),
          requestCount: 1,
          lastRequestAt: Timestamp.fromDate(now),
        })
      }
    }
  }

  async getRateLimitStats(keyId: string): Promise<{
    currentSecond: number
    currentMinute: number
    currentHour: number
    currentDay: number
  }> {
    const now = new Date()
    const stats = {
      currentSecond: 0,
      currentMinute: 0,
      currentHour: 0,
      currentDay: 0,
    }

    const q = query(
      collection(db, 'rateLimitStates'),
      where('keyId', '==', keyId)
    )

    const snapshot = await getDocs(q)
    snapshot.docs.forEach((doc) => {
      const data = doc.data()
      const windowStart = data.windowStart.toDate()
      const windowType = data.windowType as keyof typeof stats

      // Check if window is still active
      const windowDurations: Record<string, number> = {
        second: 1000,
        minute: 60000,
        hour: 3600000,
        day: 86400000,
      }

      const windowEnd = new Date(windowStart.getTime() + windowDurations[data.windowType])
      if (now < windowEnd) {
        const key = `current${windowType.charAt(0).toUpperCase() + windowType.slice(1)}` as keyof typeof stats
        stats[key] = data.requestCount
      }
    })

    return stats
  }

  // ==================== IP BLOCKING ====================

  async checkIpBlocked(ip: string, promoterId?: string): Promise<{
    blocked: boolean
    reason?: string
    expiresAt?: Date
  }> {
    // Check cache first
    if (this.blockedIpCache.has(ip)) {
      return { blocked: true, reason: 'IP is blocked (cached)' }
    }

    // Check database
    const conditions = [
      where('ip', '==', ip),
      where('status', '==', 'active'),
    ]

    // Check global rules and promoter-specific rules
    const globalQuery = query(collection(db, 'ipBlockRules'), ...conditions)
    const snapshot = await getDocs(globalQuery)

    for (const doc of snapshot.docs) {
      const rule = doc.data()

      // Skip if rule is promoter-specific and doesn't match
      if (rule.promoterId && rule.promoterId !== promoterId) {
        continue
      }

      // Check expiration
      if (rule.expiresAt && rule.expiresAt.toDate() < new Date()) {
        await updateDoc(doc.ref, { status: 'expired' })
        continue
      }

      // Add to cache
      this.blockedIpCache.add(ip)

      return {
        blocked: true,
        reason: rule.reason,
        expiresAt: rule.expiresAt?.toDate(),
      }
    }

    // Check CIDR ranges
    const cidrBlocked = await this.checkCidrBlock(ip, promoterId)
    if (cidrBlocked.blocked) {
      return cidrBlocked
    }

    return { blocked: false }
  }

  private async checkCidrBlock(
    ip: string,
    promoterId?: string
  ): Promise<{ blocked: boolean; reason?: string }> {
    // Get all CIDR rules
    const q = query(
      collection(db, 'ipBlockRules'),
      where('type', '==', 'cidr'),
      where('status', '==', 'active')
    )

    const snapshot = await getDocs(q)

    for (const doc of snapshot.docs) {
      const rule = doc.data()
      if (rule.promoterId && rule.promoterId !== promoterId) continue

      if (this.ipMatchesCidr(ip, rule.ip)) {
        return { blocked: true, reason: rule.reason }
      }
    }

    return { blocked: false }
  }

  private ipMatchesCidr(ip: string, cidr: string): boolean {
    const [network, prefixLength] = cidr.split('/')
    if (!prefixLength) return ip === network

    const ipBinary = this.ipToBinary(ip)
    const networkBinary = this.ipToBinary(network)
    const prefix = parseInt(prefixLength)

    return ipBinary.substring(0, prefix) === networkBinary.substring(0, prefix)
  }

  private ipToBinary(ip: string): string {
    return ip
      .split('.')
      .map((octet) => parseInt(octet).toString(2).padStart(8, '0'))
      .join('')
  }

  async blockIp(
    data: {
      ip: string
      type: IpBlockRule['type']
      reason: string
      promoterId?: string
      expiresAt?: Date
    },
    createdBy: string
  ): Promise<IpBlockRule> {
    const now = new Date()
    const ruleData: Omit<IpBlockRule, 'id'> = {
      ...data,
      status: 'active',
      createdBy,
      createdAt: now,
    }

    const docRef = await addDoc(collection(db, 'ipBlockRules'), {
      ...ruleData,
      expiresAt: data.expiresAt ? Timestamp.fromDate(data.expiresAt) : null,
      createdAt: Timestamp.fromDate(now),
    })

    // Add to cache
    this.blockedIpCache.add(data.ip)

    await this.auditService.logActivity({
      userId: createdBy,
      action: 'block_ip',
      resourceType: 'ip_block_rule',
      resourceId: docRef.id,
      details: { ip: data.ip, reason: data.reason },
      ipAddress: '',
      userAgent: '',
    })

    return { id: docRef.id, ...ruleData }
  }

  async unblockIp(ruleId: string, userId: string): Promise<void> {
    const ruleDoc = await getDoc(doc(db, 'ipBlockRules', ruleId))
    if (!ruleDoc.exists()) return

    const ip = ruleDoc.data().ip
    await deleteDoc(doc(db, 'ipBlockRules', ruleId))

    // Remove from cache
    this.blockedIpCache.delete(ip)

    await this.auditService.logActivity({
      userId,
      action: 'unblock_ip',
      resourceType: 'ip_block_rule',
      resourceId: ruleId,
      details: { ip },
      ipAddress: '',
      userAgent: '',
    })
  }

  async getBlockedIps(promoterId?: string): Promise<IpBlockRule[]> {
    let q = query(
      collection(db, 'ipBlockRules'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    let rules = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      expiresAt: doc.data().expiresAt?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as IpBlockRule[]

    if (promoterId) {
      rules = rules.filter((r) => !r.promoterId || r.promoterId === promoterId)
    }

    return rules
  }

  // ==================== SECURITY INCIDENTS ====================

  async reportIncident(
    incident: Omit<SecurityIncident, 'id' | 'createdAt' | 'status'>
  ): Promise<SecurityIncident> {
    const now = new Date()
    const incidentData = {
      ...incident,
      status: 'open' as const,
      createdAt: Timestamp.fromDate(now),
    }

    const docRef = await addDoc(collection(db, 'securityIncidents'), incidentData)

    // Auto-block IP for critical incidents
    if (incident.severity === 'critical') {
      await this.blockIp(
        {
          ip: incident.source.ip,
          type: 'single',
          reason: `Auto-blocked due to ${incident.type}`,
          promoterId: incident.promoterId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
        'system'
      )
    }

    return {
      id: docRef.id,
      ...incident,
      status: 'open',
      createdAt: now,
    }
  }

  async getIncidents(
    filters?: {
      promoterId?: string
      type?: SecurityIncident['type'][]
      severity?: SecurityIncident['severity'][]
      status?: SecurityIncident['status'][]
      dateRange?: { start: Date; end: Date }
    }
  ): Promise<SecurityIncident[]> {
    let q = query(
      collection(db, 'securityIncidents'),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    let incidents = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      resolvedAt: doc.data().resolvedAt?.toDate(),
    })) as SecurityIncident[]

    if (filters?.promoterId) {
      incidents = incidents.filter((i) => i.promoterId === filters.promoterId)
    }

    if (filters?.type?.length) {
      incidents = incidents.filter((i) => filters.type!.includes(i.type))
    }

    if (filters?.severity?.length) {
      incidents = incidents.filter((i) => filters.severity!.includes(i.severity))
    }

    if (filters?.status?.length) {
      incidents = incidents.filter((i) => filters.status!.includes(i.status))
    }

    if (filters?.dateRange) {
      incidents = incidents.filter(
        (i) =>
          i.createdAt >= filters.dateRange!.start && i.createdAt <= filters.dateRange!.end
      )
    }

    return incidents
  }

  async resolveIncident(
    incidentId: string,
    resolution: string,
    userId: string
  ): Promise<void> {
    await updateDoc(doc(db, 'securityIncidents', incidentId), {
      status: 'resolved',
      resolution,
      resolvedAt: Timestamp.fromDate(new Date()),
      resolvedBy: userId,
    })

    await this.auditService.logActivity({
      userId,
      action: 'resolve',
      resourceType: 'security_incident',
      resourceId: incidentId,
      details: { resolution },
      ipAddress: '',
      userAgent: '',
    })
  }

  // ==================== WEBHOOK SIGNATURES ====================

  async createWebhookSignature(
    promoterId: string,
    webhookId: string
  ): Promise<{ secret: string }> {
    const secret = crypto.randomBytes(32).toString('hex')

    await addDoc(collection(db, 'webhookSignatures'), {
      promoterId,
      webhookId,
      secret,
      algorithm: 'sha256',
      createdAt: Timestamp.fromDate(new Date()),
    })

    return { secret }
  }

  generateWebhookSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex')
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expected = this.generateWebhookSignature(payload, secret)
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  }

  // ==================== SECURITY POLICIES ====================

  async createSecurityPolicy(
    policy: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<SecurityPolicy> {
    const now = new Date()
    const policyData = {
      ...policy,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    }

    const docRef = await addDoc(collection(db, 'securityPolicies'), policyData)

    await this.auditService.logActivity({
      userId,
      action: 'create',
      resourceType: 'security_policy',
      resourceId: docRef.id,
      details: { name: policy.name },
      ipAddress: '',
      userAgent: '',
    })

    return {
      id: docRef.id,
      ...policy,
      createdAt: now,
      updatedAt: now,
    }
  }

  async evaluateSecurityPolicies(
    promoterId: string,
    request: {
      ip: string
      userAgent?: string
      method: string
      path: string
      body?: any
      headers?: Record<string, string>
    }
  ): Promise<{
    allowed: boolean
    action?: SecurityAction
    policyName?: string
  }> {
    const q = query(
      collection(db, 'securityPolicies'),
      where('promoterId', '==', promoterId),
      where('enabled', '==', true),
      orderBy('priority', 'desc')
    )

    const snapshot = await getDocs(q)
    const policies = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SecurityPolicy[]

    for (const policy of policies) {
      const matches = this.evaluateRules(policy.rules, request)
      if (matches) {
        const blockAction = policy.actions.find((a) => a.type === 'block')
        if (blockAction) {
          return {
            allowed: false,
            action: blockAction,
            policyName: policy.name,
          }
        }
      }
    }

    return { allowed: true }
  }

  private evaluateRules(
    rules: SecurityRule[],
    request: {
      ip: string
      userAgent?: string
      method: string
      path: string
      body?: any
    }
  ): boolean {
    return rules.every((rule) => {
      switch (rule.type) {
        case 'ip_check':
          return this.evaluateCondition(request.ip, rule.condition)
        case 'user_agent':
          return this.evaluateCondition(request.userAgent || '', rule.condition)
        case 'request_size':
          const size = JSON.stringify(request.body || '').length
          return this.evaluateCondition(size, rule.condition)
        default:
          return true
      }
    })
  }

  private evaluateCondition(value: any, condition: SecurityRule['condition']): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value
      case 'contains':
        return String(value).includes(String(condition.value))
      case 'greater_than':
        return value > condition.value
      case 'less_than':
        return value < condition.value
      case 'matches':
        return new RegExp(condition.value).test(String(value))
      case 'in_list':
        return Array.isArray(condition.value) && condition.value.includes(value)
      default:
        return false
    }
  }

  // ==================== INPUT VALIDATION ====================

  sanitizeInput(input: string): string {
    // Remove potential XSS patterns
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<[^>]*>/g, '')
  }

  validateSqlInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
      /(--.*)$/,
      /(\/\*.*\*\/)/,
      /(\bOR\b\s+\d+\s*=\s*\d+)/i,
      /(\bAND\b\s+\d+\s*=\s*\d+)/i,
    ]

    return !sqlPatterns.some((pattern) => pattern.test(input))
  }

  validateRequestBody(body: any, maxSize: number = 1048576): { valid: boolean; error?: string } {
    const bodyString = JSON.stringify(body)

    // Check size
    if (bodyString.length > maxSize) {
      return { valid: false, error: `Request body exceeds maximum size of ${maxSize} bytes` }
    }

    // Check for SQL injection in all string values
    const checkStrings = (obj: any): boolean => {
      if (typeof obj === 'string') {
        return this.validateSqlInjection(obj)
      }
      if (Array.isArray(obj)) {
        return obj.every(checkStrings)
      }
      if (obj && typeof obj === 'object') {
        return Object.values(obj).every(checkStrings)
      }
      return true
    }

    if (!checkStrings(body)) {
      return { valid: false, error: 'Potential SQL injection detected' }
    }

    return { valid: true }
  }

  // ==================== SECURITY HEADERS ====================

  getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    }
  }

  // ==================== UTILITIES ====================

  clearCache(): void {
    this.rateLimitCache.clear()
    this.blockedIpCache.clear()
  }

  async getSecurityDashboard(promoterId: string): Promise<{
    activeApiKeys: number
    recentIncidents: number
    blockedIps: number
    rateLimitStats: { exceeded: number; total: number }
    incidentsBySeverity: Record<string, number>
  }> {
    const [apiKeys, incidents, blockedIps] = await Promise.all([
      this.getApiKeys(promoterId),
      this.getIncidents({
        promoterId,
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
      }),
      this.getBlockedIps(promoterId),
    ])

    const activeApiKeys = apiKeys.filter((k) => k.status === 'active').length
    const rateLimitIncidents = incidents.filter((i) => i.type === 'rate_limit_exceeded')

    const incidentsBySeverity = incidents.reduce(
      (acc, i) => {
        acc[i.severity] = (acc[i.severity] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      activeApiKeys,
      recentIncidents: incidents.length,
      blockedIps: blockedIps.length,
      rateLimitStats: {
        exceeded: rateLimitIncidents.length,
        total: apiKeys.reduce((sum, k) => sum + k.usageCount, 0),
      },
      incidentsBySeverity,
    }
  }
}

export const ApiSecurityService = new ApiSecurityServiceClass()
