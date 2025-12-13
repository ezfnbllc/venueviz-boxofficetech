/**
 * Advanced Fraud & Risk Detection Engine
 * ML-based anomaly detection and fraud prevention for ticketing
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  increment,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AuditService } from './auditService'

// ==================== TYPES ====================

export interface RiskAssessment {
  id?: string
  promoterId: string
  orderId: string
  customerId: string
  transactionId?: string
  riskScore: number // 0-100, higher = more risky
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  decision: 'approve' | 'review' | 'reject' | 'challenge'
  factors: RiskFactor[]
  signals: {
    velocitySignals: VelocitySignal[]
    geoSignals: GeoSignal[]
    deviceSignals: DeviceSignal[]
    behaviorSignals: BehaviorSignal[]
    paymentSignals: PaymentSignal[]
  }
  metadata: {
    ipAddress: string
    userAgent: string
    deviceFingerprint?: string
    sessionId?: string
  }
  reviewStatus?: 'pending' | 'approved' | 'rejected'
  reviewedBy?: string
  reviewedAt?: Date
  reviewNotes?: string
  createdAt: Date
}

export interface RiskFactor {
  type: string
  weight: number
  score: number
  description: string
  evidence?: any
}

export interface VelocitySignal {
  type: 'same_card' | 'same_ip' | 'same_device' | 'same_email' | 'same_customer'
  count: number
  timeWindowMinutes: number
  threshold: number
  triggered: boolean
}

export interface GeoSignal {
  type: 'ip_country_mismatch' | 'billing_shipping_mismatch' | 'high_risk_country' | 'proxy_vpn' | 'distance_velocity'
  details: string
  triggered: boolean
  confidence: number
}

export interface DeviceSignal {
  type: 'new_device' | 'device_mismatch' | 'browser_anomaly' | 'bot_detected' | 'emulator'
  details: string
  triggered: boolean
  confidence: number
}

export interface BehaviorSignal {
  type: 'fast_checkout' | 'bulk_purchase' | 'unusual_time' | 'repeated_failures' | 'session_anomaly'
  details: string
  triggered: boolean
  confidence: number
}

export interface PaymentSignal {
  type: 'card_testing' | 'prepaid_card' | 'international_card' | 'new_card' | 'avs_mismatch' | 'cvv_mismatch'
  details: string
  triggered: boolean
  confidence: number
}

export interface FraudRule {
  id?: string
  promoterId: string
  name: string
  description: string
  enabled: boolean
  priority: number
  conditions: {
    field: string
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in_list' | 'regex'
    value: any
  }[]
  conditionLogic: 'and' | 'or'
  action: 'add_score' | 'flag_review' | 'reject' | 'challenge'
  actionConfig: {
    scoreToAdd?: number
    reviewReason?: string
    challengeType?: 'captcha' | '3ds' | 'phone_verification'
  }
  triggerCount: number
  lastTriggeredAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface FraudAlert {
  id?: string
  promoterId: string
  type: 'high_risk_order' | 'velocity_spike' | 'bot_attack' | 'chargeback_cluster' | 'anomaly_detected'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  affectedOrders: string[]
  status: 'active' | 'investigating' | 'resolved' | 'false_positive'
  investigationNotes?: string
  resolvedBy?: string
  resolvedAt?: Date
  createdAt: Date
}

export interface BlocklistEntry {
  id?: string
  promoterId?: string // null = global
  type: 'email' | 'ip' | 'card_bin' | 'device' | 'phone' | 'address'
  value: string
  reason: string
  source: 'manual' | 'automatic' | 'chargeback' | 'third_party'
  expiresAt?: Date
  createdBy: string
  createdAt: Date
}

export interface ChargebackPrediction {
  orderId: string
  probability: number // 0-1
  riskFactors: string[]
  recommendedAction: 'none' | 'proactive_refund' | 'contact_customer' | 'add_to_blocklist'
  estimatedLoss: number
}

export interface FraudMetrics {
  promoterId: string
  period: { start: Date; end: Date }
  totalOrders: number
  flaggedOrders: number
  rejectedOrders: number
  chargebacks: number
  chargebackRate: number
  fraudPreventedAmount: number
  falsePositiveRate: number
  averageRiskScore: number
  riskDistribution: { level: string; count: number }[]
  topRiskFactors: { factor: string; occurrences: number }[]
}

// ==================== HIGH RISK DATA ====================

const HIGH_RISK_COUNTRIES = ['NG', 'GH', 'PK', 'BD', 'PH', 'ID', 'VN', 'RU', 'UA', 'RO', 'BG']
const DISPOSABLE_EMAIL_DOMAINS = ['tempmail.com', 'guerrillamail.com', '10minutemail.com', 'mailinator.com', 'throwaway.email']
const BOT_USER_AGENTS = ['bot', 'crawler', 'spider', 'scraper', 'headless', 'phantom', 'selenium']

// ==================== SERVICE ====================

class FraudDetectionServiceClass {
  private auditService: AuditService
  private ruleCache: Map<string, FraudRule[]> = new Map()
  private blocklistCache: Map<string, Set<string>> = new Map()

  constructor() {
    this.auditService = new AuditService()
  }

  // ==================== RISK ASSESSMENT ====================

  async assessRisk(
    orderData: {
      promoterId: string
      orderId: string
      customerId: string
      customerEmail: string
      amount: number
      ticketCount: number
      eventId: string
      paymentMethod: {
        type: 'card' | 'paypal' | 'applepay' | 'googlepay'
        cardBin?: string
        cardLast4?: string
        cardCountry?: string
        isInternational?: boolean
        isPrepaid?: boolean
      }
      billingAddress?: {
        country: string
        postalCode: string
        city: string
      }
      metadata: {
        ipAddress: string
        userAgent: string
        deviceFingerprint?: string
        sessionId?: string
        sessionDuration?: number // seconds
        pageViews?: number
      }
    }
  ): Promise<RiskAssessment> {
    const factors: RiskFactor[] = []
    let totalScore = 0

    // 1. Velocity checks
    const velocitySignals = await this.checkVelocity(orderData)
    velocitySignals.forEach((signal) => {
      if (signal.triggered) {
        const weight = this.getVelocityWeight(signal.type)
        const score = weight * (signal.count / signal.threshold)
        factors.push({
          type: `velocity_${signal.type}`,
          weight,
          score,
          description: `${signal.count} transactions in ${signal.timeWindowMinutes} minutes (threshold: ${signal.threshold})`,
        })
        totalScore += score
      }
    })

    // 2. Geo signals
    const geoSignals = await this.checkGeoSignals(orderData)
    geoSignals.forEach((signal) => {
      if (signal.triggered) {
        factors.push({
          type: `geo_${signal.type}`,
          weight: 15,
          score: 15 * signal.confidence,
          description: signal.details,
        })
        totalScore += 15 * signal.confidence
      }
    })

    // 3. Device signals
    const deviceSignals = await this.checkDeviceSignals(orderData)
    deviceSignals.forEach((signal) => {
      if (signal.triggered) {
        const weight = signal.type === 'bot_detected' ? 50 : 10
        factors.push({
          type: `device_${signal.type}`,
          weight,
          score: weight * signal.confidence,
          description: signal.details,
        })
        totalScore += weight * signal.confidence
      }
    })

    // 4. Behavior signals
    const behaviorSignals = await this.checkBehaviorSignals(orderData)
    behaviorSignals.forEach((signal) => {
      if (signal.triggered) {
        const weight = signal.type === 'bulk_purchase' ? 20 : 10
        factors.push({
          type: `behavior_${signal.type}`,
          weight,
          score: weight * signal.confidence,
          description: signal.details,
        })
        totalScore += weight * signal.confidence
      }
    })

    // 5. Payment signals
    const paymentSignals = await this.checkPaymentSignals(orderData)
    paymentSignals.forEach((signal) => {
      if (signal.triggered) {
        const weight = signal.type === 'card_testing' ? 40 : 15
        factors.push({
          type: `payment_${signal.type}`,
          weight,
          score: weight * signal.confidence,
          description: signal.details,
        })
        totalScore += weight * signal.confidence
      }
    })

    // 6. Blocklist checks
    const blocklistHit = await this.checkBlocklist(orderData)
    if (blocklistHit) {
      factors.push({
        type: 'blocklist_hit',
        weight: 100,
        score: 100,
        description: `Matched blocklist: ${blocklistHit.type} - ${blocklistHit.reason}`,
        evidence: blocklistHit,
      })
      totalScore += 100
    }

    // 7. Custom rules
    const ruleResults = await this.evaluateCustomRules(orderData)
    ruleResults.forEach((result) => {
      factors.push(result)
      totalScore += result.score
    })

    // Normalize score to 0-100
    const riskScore = Math.min(100, Math.max(0, totalScore))

    // Determine risk level and decision
    const riskLevel = this.getRiskLevel(riskScore)
    const decision = this.getDecision(riskScore, factors)

    const assessment: Omit<RiskAssessment, 'id'> = {
      promoterId: orderData.promoterId,
      orderId: orderData.orderId,
      customerId: orderData.customerId,
      riskScore,
      riskLevel,
      decision,
      factors,
      signals: {
        velocitySignals,
        geoSignals,
        deviceSignals,
        behaviorSignals,
        paymentSignals,
      },
      metadata: orderData.metadata,
      createdAt: new Date(),
    }

    // Save assessment
    const docRef = await addDoc(collection(db, 'riskAssessments'), {
      ...assessment,
      createdAt: Timestamp.fromDate(new Date()),
    })

    // Create alert if high risk
    if (riskLevel === 'high' || riskLevel === 'critical') {
      await this.createAlert({
        promoterId: orderData.promoterId,
        type: 'high_risk_order',
        severity: riskLevel === 'critical' ? 'critical' : 'high',
        title: `High Risk Order Detected: ${orderData.orderId}`,
        description: `Risk score: ${riskScore}. Top factors: ${factors.slice(0, 3).map((f) => f.type).join(', ')}`,
        affectedOrders: [orderData.orderId],
      })
    }

    await this.auditService.logActivity({
      userId: 'system',
      action: 'risk_assessment',
      resourceType: 'order',
      resourceId: orderData.orderId,
      details: {
        riskScore,
        riskLevel,
        decision,
        factorCount: factors.length,
      },
      ipAddress: orderData.metadata.ipAddress,
      userAgent: orderData.metadata.userAgent,
    })

    return { id: docRef.id, ...assessment }
  }

  private async checkVelocity(orderData: any): Promise<VelocitySignal[]> {
    const signals: VelocitySignal[] = []
    const now = new Date()

    // Check same IP velocity (last 60 minutes)
    const ipVelocity = await this.countRecentOrders(
      orderData.promoterId,
      'metadata.ipAddress',
      orderData.metadata.ipAddress,
      60
    )
    signals.push({
      type: 'same_ip',
      count: ipVelocity,
      timeWindowMinutes: 60,
      threshold: 5,
      triggered: ipVelocity > 5,
    })

    // Check same customer velocity (last 24 hours)
    const customerVelocity = await this.countRecentOrders(
      orderData.promoterId,
      'customerId',
      orderData.customerId,
      1440
    )
    signals.push({
      type: 'same_customer',
      count: customerVelocity,
      timeWindowMinutes: 1440,
      threshold: 10,
      triggered: customerVelocity > 10,
    })

    // Check same email velocity (last 60 minutes)
    const emailVelocity = await this.countRecentOrders(
      orderData.promoterId,
      'customerEmail',
      orderData.customerEmail,
      60
    )
    signals.push({
      type: 'same_email',
      count: emailVelocity,
      timeWindowMinutes: 60,
      threshold: 3,
      triggered: emailVelocity > 3,
    })

    return signals
  }

  private async countRecentOrders(
    promoterId: string,
    field: string,
    value: string,
    windowMinutes: number
  ): Promise<number> {
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000)

    // Query risk assessments instead of orders for speed
    const q = query(
      collection(db, 'riskAssessments'),
      where('promoterId', '==', promoterId),
      where('createdAt', '>=', Timestamp.fromDate(cutoff))
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.filter((doc) => {
      const data = doc.data()
      // Handle nested fields
      const fieldValue = field.includes('.')
        ? field.split('.').reduce((obj, key) => obj?.[key], data)
        : data[field]
      return fieldValue === value
    }).length
  }

  private async checkGeoSignals(orderData: any): Promise<GeoSignal[]> {
    const signals: GeoSignal[] = []

    // Check high risk country
    if (orderData.billingAddress?.country) {
      const isHighRisk = HIGH_RISK_COUNTRIES.includes(orderData.billingAddress.country)
      signals.push({
        type: 'high_risk_country',
        details: `Billing country: ${orderData.billingAddress.country}`,
        triggered: isHighRisk,
        confidence: isHighRisk ? 0.8 : 0,
      })
    }

    // Check card country mismatch
    if (orderData.paymentMethod.cardCountry && orderData.billingAddress?.country) {
      const mismatch = orderData.paymentMethod.cardCountry !== orderData.billingAddress.country
      signals.push({
        type: 'ip_country_mismatch',
        details: `Card country: ${orderData.paymentMethod.cardCountry}, Billing: ${orderData.billingAddress.country}`,
        triggered: mismatch,
        confidence: mismatch ? 0.7 : 0,
      })
    }

    return signals
  }

  private async checkDeviceSignals(orderData: any): Promise<DeviceSignal[]> {
    const signals: DeviceSignal[] = []
    const ua = orderData.metadata.userAgent?.toLowerCase() || ''

    // Check for bot user agents
    const isBot = BOT_USER_AGENTS.some((bot) => ua.includes(bot))
    signals.push({
      type: 'bot_detected',
      details: isBot ? `Suspicious user agent: ${ua}` : 'No bot indicators',
      triggered: isBot,
      confidence: isBot ? 0.95 : 0,
    })

    // Check for headless browser indicators
    const headlessIndicators = ['headless', 'phantom', 'puppeteer', 'playwright']
    const isHeadless = headlessIndicators.some((indicator) => ua.includes(indicator))
    signals.push({
      type: 'emulator',
      details: isHeadless ? 'Headless browser detected' : 'Normal browser',
      triggered: isHeadless,
      confidence: isHeadless ? 0.9 : 0,
    })

    // Check for new device (would need device history)
    // Simplified check - if no device fingerprint
    const isNewDevice = !orderData.metadata.deviceFingerprint
    signals.push({
      type: 'new_device',
      details: isNewDevice ? 'No device fingerprint' : 'Known device',
      triggered: isNewDevice,
      confidence: isNewDevice ? 0.3 : 0,
    })

    return signals
  }

  private async checkBehaviorSignals(orderData: any): Promise<BehaviorSignal[]> {
    const signals: BehaviorSignal[] = []

    // Fast checkout (less than 30 seconds session)
    const isFastCheckout = orderData.metadata.sessionDuration && orderData.metadata.sessionDuration < 30
    signals.push({
      type: 'fast_checkout',
      details: `Session duration: ${orderData.metadata.sessionDuration || 'unknown'}s`,
      triggered: isFastCheckout,
      confidence: isFastCheckout ? 0.6 : 0,
    })

    // Bulk purchase (more than 10 tickets)
    const isBulkPurchase = orderData.ticketCount > 10
    signals.push({
      type: 'bulk_purchase',
      details: `Ticket count: ${orderData.ticketCount}`,
      triggered: isBulkPurchase,
      confidence: isBulkPurchase ? 0.5 : 0,
    })

    // Unusual time (2 AM - 5 AM local)
    const hour = new Date().getHours()
    const isUnusualTime = hour >= 2 && hour <= 5
    signals.push({
      type: 'unusual_time',
      details: `Order placed at ${hour}:00`,
      triggered: isUnusualTime,
      confidence: isUnusualTime ? 0.3 : 0,
    })

    return signals
  }

  private async checkPaymentSignals(orderData: any): Promise<PaymentSignal[]> {
    const signals: PaymentSignal[] = []

    // Prepaid card
    if (orderData.paymentMethod.isPrepaid) {
      signals.push({
        type: 'prepaid_card',
        details: 'Prepaid card detected',
        triggered: true,
        confidence: 0.4,
      })
    }

    // International card
    if (orderData.paymentMethod.isInternational) {
      signals.push({
        type: 'international_card',
        details: `International card from ${orderData.paymentMethod.cardCountry}`,
        triggered: true,
        confidence: 0.3,
      })
    }

    // Check for card testing pattern (small amounts in quick succession)
    if (orderData.amount < 5) {
      signals.push({
        type: 'card_testing',
        details: `Low amount order: $${orderData.amount}`,
        triggered: true,
        confidence: 0.7,
      })
    }

    return signals
  }

  private async checkBlocklist(orderData: any): Promise<BlocklistEntry | null> {
    // Check email
    const emailBlocked = await this.isBlocklisted('email', orderData.customerEmail, orderData.promoterId)
    if (emailBlocked) return emailBlocked

    // Check IP
    const ipBlocked = await this.isBlocklisted('ip', orderData.metadata.ipAddress, orderData.promoterId)
    if (ipBlocked) return ipBlocked

    // Check card BIN
    if (orderData.paymentMethod.cardBin) {
      const binBlocked = await this.isBlocklisted('card_bin', orderData.paymentMethod.cardBin, orderData.promoterId)
      if (binBlocked) return binBlocked
    }

    // Check device fingerprint
    if (orderData.metadata.deviceFingerprint) {
      const deviceBlocked = await this.isBlocklisted('device', orderData.metadata.deviceFingerprint, orderData.promoterId)
      if (deviceBlocked) return deviceBlocked
    }

    return null
  }

  private async isBlocklisted(
    type: BlocklistEntry['type'],
    value: string,
    promoterId: string
  ): Promise<BlocklistEntry | null> {
    const q = query(
      collection(db, 'fraudBlocklist'),
      where('type', '==', type),
      where('value', '==', value.toLowerCase())
    )

    const snapshot = await getDocs(q)
    for (const doc of snapshot.docs) {
      const entry = doc.data()

      // Check if global or matches promoter
      if (entry.promoterId && entry.promoterId !== promoterId) continue

      // Check expiration
      if (entry.expiresAt && entry.expiresAt.toDate() < new Date()) continue

      return {
        id: doc.id,
        ...entry,
        expiresAt: entry.expiresAt?.toDate(),
        createdAt: entry.createdAt?.toDate(),
      } as BlocklistEntry
    }

    return null
  }

  private async evaluateCustomRules(orderData: any): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = []

    // Get custom rules for promoter
    const rules = await this.getRules(orderData.promoterId)
    const enabledRules = rules.filter((r) => r.enabled).sort((a, b) => b.priority - a.priority)

    for (const rule of enabledRules) {
      const matches = this.evaluateRuleConditions(rule, orderData)

      if (matches) {
        factors.push({
          type: `custom_rule_${rule.id}`,
          weight: rule.actionConfig.scoreToAdd || 10,
          score: rule.actionConfig.scoreToAdd || 10,
          description: `Rule triggered: ${rule.name} - ${rule.description}`,
        })

        // Update rule trigger count
        await updateDoc(doc(db, 'fraudRules', rule.id!), {
          triggerCount: increment(1),
          lastTriggeredAt: Timestamp.fromDate(new Date()),
        })
      }
    }

    return factors
  }

  private evaluateRuleConditions(rule: FraudRule, orderData: any): boolean {
    const results = rule.conditions.map((condition) => {
      const value = this.getFieldValue(orderData, condition.field)
      return this.evaluateCondition(value, condition.operator, condition.value)
    })

    return rule.conditionLogic === 'and'
      ? results.every((r) => r)
      : results.some((r) => r)
  }

  private getFieldValue(obj: any, field: string): any {
    return field.split('.').reduce((acc, key) => acc?.[key], obj)
  }

  private evaluateCondition(value: any, operator: string, conditionValue: any): boolean {
    switch (operator) {
      case 'equals':
        return value === conditionValue
      case 'not_equals':
        return value !== conditionValue
      case 'greater_than':
        return value > conditionValue
      case 'less_than':
        return value < conditionValue
      case 'contains':
        return String(value).includes(String(conditionValue))
      case 'in_list':
        return Array.isArray(conditionValue) && conditionValue.includes(value)
      case 'regex':
        return new RegExp(conditionValue).test(String(value))
      default:
        return false
    }
  }

  private getVelocityWeight(type: VelocitySignal['type']): number {
    const weights: Record<string, number> = {
      same_card: 25,
      same_ip: 15,
      same_device: 20,
      same_email: 15,
      same_customer: 10,
    }
    return weights[type] || 10
  }

  private getRiskLevel(score: number): RiskAssessment['riskLevel'] {
    if (score >= 75) return 'critical'
    if (score >= 50) return 'high'
    if (score >= 25) return 'medium'
    return 'low'
  }

  private getDecision(score: number, factors: RiskFactor[]): RiskAssessment['decision'] {
    // Auto-reject if blocklist hit
    if (factors.some((f) => f.type === 'blocklist_hit')) {
      return 'reject'
    }

    // Auto-reject if bot detected with high confidence
    if (factors.some((f) => f.type === 'device_bot_detected' && f.score >= 45)) {
      return 'reject'
    }

    if (score >= 75) return 'reject'
    if (score >= 50) return 'review'
    if (score >= 25) return 'challenge'
    return 'approve'
  }

  // ==================== RULES MANAGEMENT ====================

  async createRule(
    rule: Omit<FraudRule, 'id' | 'createdAt' | 'updatedAt' | 'triggerCount'>,
    userId: string
  ): Promise<FraudRule> {
    const now = new Date()
    const ruleData = {
      ...rule,
      triggerCount: 0,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    }

    const docRef = await addDoc(collection(db, 'fraudRules'), ruleData)

    // Invalidate cache
    this.ruleCache.delete(rule.promoterId)

    await this.auditService.logActivity({
      userId,
      action: 'create',
      resourceType: 'fraud_rule',
      resourceId: docRef.id,
      details: { ruleName: rule.name },
      ipAddress: '',
      userAgent: '',
    })

    return {
      id: docRef.id,
      ...rule,
      triggerCount: 0,
      createdAt: now,
      updatedAt: now,
    }
  }

  async getRules(promoterId: string): Promise<FraudRule[]> {
    // Check cache
    if (this.ruleCache.has(promoterId)) {
      return this.ruleCache.get(promoterId)!
    }

    const q = query(
      collection(db, 'fraudRules'),
      where('promoterId', '==', promoterId),
      orderBy('priority', 'desc')
    )

    const snapshot = await getDocs(q)
    const rules = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      lastTriggeredAt: doc.data().lastTriggeredAt?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as FraudRule[]

    // Update cache
    this.ruleCache.set(promoterId, rules)

    return rules
  }

  async updateRule(ruleId: string, updates: Partial<FraudRule>, userId: string): Promise<void> {
    const ruleDoc = await getDoc(doc(db, 'fraudRules', ruleId))
    if (!ruleDoc.exists()) throw new Error('Rule not found')

    await updateDoc(doc(db, 'fraudRules', ruleId), {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    })

    // Invalidate cache
    this.ruleCache.delete(ruleDoc.data().promoterId)

    await this.auditService.logActivity({
      userId,
      action: 'update',
      resourceType: 'fraud_rule',
      resourceId: ruleId,
      details: { updates: Object.keys(updates) },
      ipAddress: '',
      userAgent: '',
    })
  }

  async deleteRule(ruleId: string, userId: string): Promise<void> {
    const ruleDoc = await getDoc(doc(db, 'fraudRules', ruleId))
    if (!ruleDoc.exists()) throw new Error('Rule not found')

    // Soft delete by disabling
    await updateDoc(doc(db, 'fraudRules', ruleId), {
      enabled: false,
      updatedAt: Timestamp.fromDate(new Date()),
    })

    // Invalidate cache
    this.ruleCache.delete(ruleDoc.data().promoterId)

    await this.auditService.logActivity({
      userId,
      action: 'delete',
      resourceType: 'fraud_rule',
      resourceId: ruleId,
      details: {},
      ipAddress: '',
      userAgent: '',
    })
  }

  // ==================== BLOCKLIST MANAGEMENT ====================

  async addToBlocklist(
    entry: Omit<BlocklistEntry, 'id' | 'createdAt'>,
    userId: string
  ): Promise<BlocklistEntry> {
    const now = new Date()
    const entryData = {
      ...entry,
      value: entry.value.toLowerCase(),
      createdBy: userId,
      expiresAt: entry.expiresAt ? Timestamp.fromDate(entry.expiresAt) : null,
      createdAt: Timestamp.fromDate(now),
    }

    const docRef = await addDoc(collection(db, 'fraudBlocklist'), entryData)

    await this.auditService.logActivity({
      userId,
      action: 'add_to_blocklist',
      resourceType: 'fraud_blocklist',
      resourceId: docRef.id,
      details: { type: entry.type, value: entry.value },
      ipAddress: '',
      userAgent: '',
    })

    return {
      id: docRef.id,
      ...entry,
      createdAt: now,
    }
  }

  async removeFromBlocklist(entryId: string, userId: string): Promise<void> {
    const entryDoc = await getDoc(doc(db, 'fraudBlocklist', entryId))
    if (!entryDoc.exists()) throw new Error('Entry not found')

    // Set expiration to now (soft delete)
    await updateDoc(doc(db, 'fraudBlocklist', entryId), {
      expiresAt: Timestamp.fromDate(new Date()),
    })

    await this.auditService.logActivity({
      userId,
      action: 'remove_from_blocklist',
      resourceType: 'fraud_blocklist',
      resourceId: entryId,
      details: {},
      ipAddress: '',
      userAgent: '',
    })
  }

  async getBlocklist(promoterId?: string, type?: BlocklistEntry['type']): Promise<BlocklistEntry[]> {
    let q = query(collection(db, 'fraudBlocklist'), orderBy('createdAt', 'desc'))

    const snapshot = await getDocs(q)
    let entries = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      expiresAt: doc.data().expiresAt?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as BlocklistEntry[]

    // Filter out expired entries
    entries = entries.filter((e) => !e.expiresAt || e.expiresAt > new Date())

    if (promoterId) {
      entries = entries.filter((e) => !e.promoterId || e.promoterId === promoterId)
    }

    if (type) {
      entries = entries.filter((e) => e.type === type)
    }

    return entries
  }

  // ==================== ALERTS ====================

  async createAlert(
    alert: Omit<FraudAlert, 'id' | 'createdAt' | 'status'>
  ): Promise<FraudAlert> {
    const now = new Date()
    const alertData = {
      ...alert,
      status: 'active' as const,
      createdAt: Timestamp.fromDate(now),
    }

    const docRef = await addDoc(collection(db, 'fraudAlerts'), alertData)

    return {
      id: docRef.id,
      ...alert,
      status: 'active',
      createdAt: now,
    }
  }

  async getAlerts(
    promoterId: string,
    filters?: {
      status?: FraudAlert['status'][]
      severity?: FraudAlert['severity'][]
      type?: FraudAlert['type'][]
    }
  ): Promise<FraudAlert[]> {
    let q = query(
      collection(db, 'fraudAlerts'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    let alerts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      resolvedAt: doc.data().resolvedAt?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as FraudAlert[]

    if (filters?.status?.length) {
      alerts = alerts.filter((a) => filters.status!.includes(a.status))
    }

    if (filters?.severity?.length) {
      alerts = alerts.filter((a) => filters.severity!.includes(a.severity))
    }

    if (filters?.type?.length) {
      alerts = alerts.filter((a) => filters.type!.includes(a.type))
    }

    return alerts
  }

  async resolveAlert(alertId: string, resolution: string, userId: string): Promise<void> {
    await updateDoc(doc(db, 'fraudAlerts', alertId), {
      status: 'resolved',
      investigationNotes: resolution,
      resolvedBy: userId,
      resolvedAt: Timestamp.fromDate(new Date()),
    })

    await this.auditService.logActivity({
      userId,
      action: 'resolve',
      resourceType: 'fraud_alert',
      resourceId: alertId,
      details: { resolution },
      ipAddress: '',
      userAgent: '',
    })
  }

  // ==================== MANUAL REVIEW ====================

  async getOrdersForReview(promoterId: string): Promise<RiskAssessment[]> {
    const q = query(
      collection(db, 'riskAssessments'),
      where('promoterId', '==', promoterId),
      where('decision', '==', 'review'),
      where('reviewStatus', '==', null),
      orderBy('riskScore', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      reviewedAt: doc.data().reviewedAt?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as RiskAssessment[]
  }

  async reviewOrder(
    assessmentId: string,
    decision: 'approved' | 'rejected',
    notes: string,
    userId: string
  ): Promise<void> {
    const assessmentDoc = await getDoc(doc(db, 'riskAssessments', assessmentId))
    if (!assessmentDoc.exists()) throw new Error('Assessment not found')

    await updateDoc(doc(db, 'riskAssessments', assessmentId), {
      reviewStatus: decision,
      reviewedBy: userId,
      reviewedAt: Timestamp.fromDate(new Date()),
      reviewNotes: notes,
    })

    // If rejected, optionally add to blocklist
    if (decision === 'rejected') {
      const assessment = assessmentDoc.data()
      // Could auto-add email/IP to blocklist based on policy
    }

    await this.auditService.logActivity({
      userId,
      action: 'review_order',
      resourceType: 'risk_assessment',
      resourceId: assessmentId,
      details: { decision, notes },
      ipAddress: '',
      userAgent: '',
    })
  }

  // ==================== CHARGEBACK PREDICTION ====================

  async predictChargeback(orderId: string): Promise<ChargebackPrediction> {
    // Get risk assessment
    const q = query(
      collection(db, 'riskAssessments'),
      where('orderId', '==', orderId),
      limit(1)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) {
      return {
        orderId,
        probability: 0,
        riskFactors: [],
        recommendedAction: 'none',
        estimatedLoss: 0,
      }
    }

    const assessment = snapshot.docs[0].data() as RiskAssessment

    // Calculate chargeback probability based on risk factors
    let probability = assessment.riskScore / 200 // Base probability from risk score

    const riskFactors: string[] = []

    // High velocity increases probability
    if (assessment.signals?.velocitySignals?.some((s) => s.triggered)) {
      probability += 0.1
      riskFactors.push('High velocity transactions')
    }

    // Geo mismatch increases probability
    if (assessment.signals?.geoSignals?.some((s) => s.triggered && s.type === 'ip_country_mismatch')) {
      probability += 0.15
      riskFactors.push('Geographic mismatch')
    }

    // Prepaid card increases probability
    if (assessment.signals?.paymentSignals?.some((s) => s.triggered && s.type === 'prepaid_card')) {
      probability += 0.1
      riskFactors.push('Prepaid card used')
    }

    // Fast checkout increases probability
    if (assessment.signals?.behaviorSignals?.some((s) => s.triggered && s.type === 'fast_checkout')) {
      probability += 0.05
      riskFactors.push('Unusually fast checkout')
    }

    probability = Math.min(1, probability)

    // Get order amount for estimated loss
    // Would need to fetch from orders collection
    const estimatedLoss = 0 // Placeholder

    let recommendedAction: ChargebackPrediction['recommendedAction'] = 'none'
    if (probability >= 0.7) {
      recommendedAction = 'proactive_refund'
    } else if (probability >= 0.5) {
      recommendedAction = 'contact_customer'
    } else if (probability >= 0.3) {
      recommendedAction = 'add_to_blocklist'
    }

    return {
      orderId,
      probability,
      riskFactors,
      recommendedAction,
      estimatedLoss,
    }
  }

  // ==================== METRICS ====================

  async getFraudMetrics(
    promoterId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<FraudMetrics> {
    const q = query(
      collection(db, 'riskAssessments'),
      where('promoterId', '==', promoterId),
      where('createdAt', '>=', Timestamp.fromDate(dateRange.start)),
      where('createdAt', '<=', Timestamp.fromDate(dateRange.end))
    )

    const snapshot = await getDocs(q)
    const assessments = snapshot.docs.map((doc) => doc.data()) as RiskAssessment[]

    const totalOrders = assessments.length
    const flaggedOrders = assessments.filter((a) => a.decision === 'review').length
    const rejectedOrders = assessments.filter((a) => a.decision === 'reject').length

    // Risk distribution
    const riskDistribution = [
      { level: 'low', count: assessments.filter((a) => a.riskLevel === 'low').length },
      { level: 'medium', count: assessments.filter((a) => a.riskLevel === 'medium').length },
      { level: 'high', count: assessments.filter((a) => a.riskLevel === 'high').length },
      { level: 'critical', count: assessments.filter((a) => a.riskLevel === 'critical').length },
    ]

    // Top risk factors
    const factorCounts: Record<string, number> = {}
    assessments.forEach((a) => {
      a.factors?.forEach((f) => {
        factorCounts[f.type] = (factorCounts[f.type] || 0) + 1
      })
    })

    const topRiskFactors = Object.entries(factorCounts)
      .map(([factor, occurrences]) => ({ factor, occurrences }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10)

    // Average risk score
    const averageRiskScore =
      assessments.length > 0
        ? assessments.reduce((sum, a) => sum + a.riskScore, 0) / assessments.length
        : 0

    // Calculate false positive rate from reviewed orders
    const reviewedOrders = assessments.filter((a) => a.reviewStatus)
    const falsePositives = reviewedOrders.filter(
      (a) => a.decision === 'review' && a.reviewStatus === 'approved'
    ).length
    const falsePositiveRate = reviewedOrders.length > 0 ? (falsePositives / reviewedOrders.length) * 100 : 0

    return {
      promoterId,
      period: dateRange,
      totalOrders,
      flaggedOrders,
      rejectedOrders,
      chargebacks: 0, // Would need chargeback data
      chargebackRate: 0,
      fraudPreventedAmount: 0, // Would need order amounts
      falsePositiveRate,
      averageRiskScore,
      riskDistribution,
      topRiskFactors,
    }
  }

  // ==================== UTILITIES ====================

  clearCache(): void {
    this.ruleCache.clear()
    this.blocklistCache.clear()
  }
}

export const FraudDetectionService = new FraudDetectionServiceClass()
