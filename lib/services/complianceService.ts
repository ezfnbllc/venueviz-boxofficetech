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
export interface ConsentRecord {
  id: string
  promoterId: string
  customerId: string
  customerEmail: string
  consents: ConsentItem[]
  ipAddress?: string
  userAgent?: string
  source: 'website' | 'app' | 'api' | 'import' | 'manual'
  version: string
  createdAt: Date
  updatedAt: Date
}

export interface ConsentItem {
  type: ConsentType
  granted: boolean
  timestamp: Date
  expiresAt?: Date
  version?: string
  details?: string
}

export type ConsentType =
  | 'marketing_email'
  | 'marketing_sms'
  | 'marketing_push'
  | 'marketing_phone'
  | 'third_party_sharing'
  | 'analytics'
  | 'personalization'
  | 'cookies_essential'
  | 'cookies_functional'
  | 'cookies_analytics'
  | 'cookies_advertising'
  | 'terms_of_service'
  | 'privacy_policy'
  | 'age_verification'
  | 'data_processing'

export interface DataSubjectRequest {
  id: string
  promoterId: string
  customerId?: string
  email: string
  type: DSRType
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  verificationStatus: 'pending' | 'verified' | 'failed'
  verificationMethod?: 'email' | 'id_document' | 'manual'
  details?: string
  assignedTo?: string
  response?: DSRResponse
  attachments?: string[]
  deadline: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export type DSRType =
  | 'access' // Right to access
  | 'rectification' // Right to rectify
  | 'erasure' // Right to be forgotten
  | 'portability' // Right to data portability
  | 'restriction' // Right to restrict processing
  | 'objection' // Right to object
  | 'withdraw_consent' // Withdraw consent
  | 'do_not_sell' // CCPA Do Not Sell

export interface DSRResponse {
  message: string
  dataExport?: string // URL to exported data
  actionsToken?: string[]
  respondedBy: string
  respondedAt: Date
}

export interface LegalDocument {
  id: string
  promoterId: string
  type: LegalDocumentType
  title: string
  content: string
  version: string
  status: 'draft' | 'active' | 'archived'
  effectiveDate: Date
  expiryDate?: Date
  changelog?: string
  previousVersionId?: string
  requiredConsent: boolean
  displayLocations: string[]
  translations?: Record<string, { title: string; content: string }>
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export type LegalDocumentType =
  | 'terms_of_service'
  | 'privacy_policy'
  | 'cookie_policy'
  | 'refund_policy'
  | 'accessibility_statement'
  | 'disclaimer'
  | 'data_processing_agreement'
  | 'user_agreement'
  | 'event_waiver'
  | 'custom'

export interface DataRetentionPolicy {
  id: string
  promoterId: string
  name: string
  dataCategory: string
  retentionPeriod: number // days
  retentionUnit: 'days' | 'months' | 'years'
  legalBasis: string
  description?: string
  autoDelete: boolean
  notifyBeforeDelete: boolean
  notifyDays?: number
  exemptions?: string[]
  status: 'active' | 'inactive'
  lastRun?: Date
  nextRun?: Date
  createdAt: Date
}

export interface DataInventory {
  id: string
  promoterId: string
  category: string
  dataElements: DataElement[]
  processingPurposes: string[]
  legalBasis: string[]
  dataSubjects: string[]
  retention: {
    period: number
    unit: 'days' | 'months' | 'years'
  }
  thirdPartySharing: {
    enabled: boolean
    recipients?: string[]
    purposes?: string[]
  }
  securityMeasures: string[]
  crossBorderTransfer: {
    enabled: boolean
    countries?: string[]
    safeguards?: string[]
  }
  createdAt: Date
  updatedAt: Date
}

export interface DataElement {
  name: string
  description?: string
  type: 'personal' | 'sensitive' | 'anonymous' | 'pseudonymous'
  fields: string[]
  source: string
  required: boolean
}

export interface CookieConsent {
  id: string
  promoterId: string
  visitorId: string
  sessionId?: string
  preferences: CookiePreferences
  ipAddress?: string
  userAgent?: string
  country?: string
  consentBanner: {
    shown: boolean
    shownAt?: Date
    interactedAt?: Date
  }
  createdAt: Date
  updatedAt: Date
}

export interface CookiePreferences {
  essential: boolean // Always true
  functional: boolean
  analytics: boolean
  advertising: boolean
  customCategories?: Record<string, boolean>
}

export interface CookieDefinition {
  id: string
  promoterId: string
  name: string
  domain: string
  category: 'essential' | 'functional' | 'analytics' | 'advertising' | 'custom'
  customCategory?: string
  purpose: string
  duration: string
  provider: string
  type: 'first_party' | 'third_party'
  httpOnly: boolean
  secure: boolean
  sameSite: 'strict' | 'lax' | 'none'
  active: boolean
  createdAt: Date
}

export interface AuditTrail {
  id: string
  promoterId: string
  entityType: string
  entityId: string
  action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'consent' | 'request'
  actorType: 'user' | 'system' | 'customer' | 'api'
  actorId: string
  actorName?: string
  previousValue?: Record<string, any>
  newValue?: Record<string, any>
  changedFields?: string[]
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
  timestamp: Date
}

export interface ComplianceReport {
  id: string
  promoterId: string
  type: 'gdpr' | 'ccpa' | 'pci' | 'accessibility' | 'custom'
  period: { start: Date; end: Date }
  metrics: ComplianceMetrics
  issues: ComplianceIssue[]
  recommendations: string[]
  generatedAt: Date
  generatedBy: string
}

export interface ComplianceMetrics {
  totalCustomers: number
  customersWithConsent: number
  consentRate: number
  dsrRequests: {
    total: number
    completed: number
    pending: number
    avgResponseTime: number // hours
  }
  dataBreaches: number
  cookieConsentRate: number
  documentsUpToDate: number
  totalDocuments: number
}

export interface ComplianceIssue {
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: string
  description: string
  affectedRecords?: number
  recommendation: string
  deadline?: Date
}

export interface AgeVerification {
  id: string
  promoterId: string
  customerId?: string
  sessionId: string
  method: 'self_declaration' | 'id_verification' | 'credit_card' | 'database'
  dateOfBirth?: Date
  verifiedAge?: number
  minimumAge: number
  status: 'pending' | 'verified' | 'failed' | 'expired'
  verificationData?: {
    documentType?: string
    documentNumber?: string
    expiryDate?: Date
    provider?: string
    confidence?: number
  }
  expiresAt: Date
  createdAt: Date
}

export interface BreachNotification {
  id: string
  promoterId: string
  type: 'data_breach' | 'security_incident' | 'unauthorized_access'
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'detected' | 'investigating' | 'contained' | 'resolved' | 'notified'
  description: string
  affectedData: string[]
  affectedCount: number
  detectedAt: Date
  containedAt?: Date
  resolvedAt?: Date
  rootCause?: string
  remediation?: string
  notifications: {
    authority?: { notified: boolean; notifiedAt?: Date; reference?: string }
    affected?: { notified: boolean; notifiedAt?: Date; count?: number }
  }
  timeline: Array<{
    timestamp: Date
    action: string
    actor: string
  }>
  createdAt: Date
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
function calculateDeadline(type: DSRType): Date {
  const deadline = new Date()
  // GDPR requires response within 30 days
  // Can be extended to 60 days for complex requests
  const days = type === 'erasure' || type === 'portability' ? 30 : 30
  deadline.setDate(deadline.getDate() + days)
  return deadline
}

function generateVersion(): string {
  const now = new Date()
  return `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}`
}

// Main Service Class
export class ComplianceService {
  // ==================== CONSENT MANAGEMENT ====================

  static async recordConsent(
    data: Omit<ConsentRecord, 'id' | 'version' | 'createdAt' | 'updatedAt'>
  ): Promise<ConsentRecord> {
    const consentId = `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const record: ConsentRecord = {
      ...data,
      id: consentId,
      version: generateVersion(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await setDoc(doc(db, 'consentRecords', consentId), {
      ...record,
      consents: record.consents.map((c) => ({
        ...c,
        timestamp: Timestamp.fromDate(c.timestamp),
        expiresAt: c.expiresAt ? Timestamp.fromDate(c.expiresAt) : null,
      })),
      createdAt: Timestamp.fromDate(record.createdAt),
      updatedAt: Timestamp.fromDate(record.updatedAt),
    })

    // Log audit trail
    await this.logAudit({
      promoterId: data.promoterId,
      entityType: 'consent',
      entityId: consentId,
      action: 'consent',
      actorType: 'customer',
      actorId: data.customerId,
      newValue: { consents: data.consents },
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    })

    return record
  }

  static async getConsent(
    promoterId: string,
    customerId: string
  ): Promise<ConsentRecord | null> {
    const q = query(
      collection(db, 'consentRecords'),
      where('promoterId', '==', promoterId),
      where('customerId', '==', customerId),
      orderBy('updatedAt', 'desc'),
      limit(1)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const doc_data = snapshot.docs[0]
    const data = doc_data.data()
    return {
      ...data,
      id: doc_data.id,
      consents: data.consents.map((c: any) => ({
        ...c,
        timestamp: c.timestamp.toDate(),
        expiresAt: c.expiresAt?.toDate(),
      })),
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as ConsentRecord
  }

  static async updateConsent(
    promoterId: string,
    customerId: string,
    updates: ConsentItem[],
    metadata?: { ipAddress?: string; userAgent?: string; source?: string }
  ): Promise<ConsentRecord> {
    const existing = await this.getConsent(promoterId, customerId)

    if (existing) {
      // Merge consents
      const consentMap = new Map(existing.consents.map((c) => [c.type, c]))
      for (const update of updates) {
        consentMap.set(update.type, update)
      }

      const updatedConsents = Array.from(consentMap.values())

      await updateDoc(doc(db, 'consentRecords', existing.id), {
        consents: updatedConsents.map((c) => ({
          ...c,
          timestamp: Timestamp.fromDate(c.timestamp),
          expiresAt: c.expiresAt ? Timestamp.fromDate(c.expiresAt) : null,
        })),
        ipAddress: metadata?.ipAddress || existing.ipAddress,
        userAgent: metadata?.userAgent || existing.userAgent,
        source: metadata?.source || existing.source,
        version: generateVersion(),
        updatedAt: Timestamp.fromDate(new Date()),
      })

      return { ...existing, consents: updatedConsents }
    }

    // Create new consent record
    const customerDoc = await getDoc(doc(db, 'customers', customerId))
    const customerEmail = customerDoc.exists() ? customerDoc.data().email : ''

    return this.recordConsent({
      promoterId,
      customerId,
      customerEmail,
      consents: updates,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      source: (metadata?.source as any) || 'api',
    })
  }

  static async hasConsent(
    promoterId: string,
    customerId: string,
    consentType: ConsentType
  ): Promise<boolean> {
    const record = await this.getConsent(promoterId, customerId)
    if (!record) return false

    const consent = record.consents.find((c) => c.type === consentType)
    if (!consent) return false

    if (!consent.granted) return false

    if (consent.expiresAt && consent.expiresAt < new Date()) return false

    return true
  }

  static async withdrawConsent(
    promoterId: string,
    customerId: string,
    consentTypes: ConsentType[],
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const updates: ConsentItem[] = consentTypes.map((type) => ({
      type,
      granted: false,
      timestamp: new Date(),
    }))

    await this.updateConsent(promoterId, customerId, updates, metadata)
  }

  // ==================== DATA SUBJECT REQUESTS ====================

  static async createDSR(
    data: Omit<DataSubjectRequest, 'id' | 'status' | 'verificationStatus' | 'deadline' | 'createdAt' | 'updatedAt'>
  ): Promise<DataSubjectRequest> {
    const dsrId = `dsr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const deadline = calculateDeadline(data.type)

    const dsr: DataSubjectRequest = {
      ...data,
      id: dsrId,
      status: 'pending',
      verificationStatus: 'pending',
      deadline,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await setDoc(doc(db, 'dsrRequests', dsrId), {
      ...dsr,
      deadline: Timestamp.fromDate(dsr.deadline),
      createdAt: Timestamp.fromDate(dsr.createdAt),
      updatedAt: Timestamp.fromDate(dsr.updatedAt),
    })

    return dsr
  }

  static async getDSR(dsrId: string): Promise<DataSubjectRequest | null> {
    const docRef = await getDoc(doc(db, 'dsrRequests', dsrId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    return {
      ...data,
      id: docRef.id,
      deadline: data.deadline.toDate(),
      completedAt: data.completedAt?.toDate(),
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      response: data.response
        ? { ...data.response, respondedAt: data.response.respondedAt?.toDate() }
        : undefined,
    } as DataSubjectRequest
  }

  static async getDSRs(
    promoterId: string,
    filters?: {
      status?: DataSubjectRequest['status']
      type?: DSRType
      email?: string
    }
  ): Promise<DataSubjectRequest[]> {
    let q = query(
      collection(db, 'dsrRequests'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status))
    }
    if (filters?.type) {
      q = query(q, where('type', '==', filters.type))
    }
    if (filters?.email) {
      q = query(q, where('email', '==', filters.email))
    }

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        deadline: data.deadline.toDate(),
        completedAt: data.completedAt?.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as DataSubjectRequest
    })
  }

  static async updateDSR(
    dsrId: string,
    updates: Partial<DataSubjectRequest>
  ): Promise<void> {
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }

    if (updates.response?.respondedAt) {
      updateData.response.respondedAt = Timestamp.fromDate(updates.response.respondedAt)
    }
    if (updates.completedAt) {
      updateData.completedAt = Timestamp.fromDate(updates.completedAt)
    }

    delete updateData.id
    delete updateData.createdAt

    await updateDoc(doc(db, 'dsrRequests', dsrId), updateData)
  }

  static async verifyDSR(
    dsrId: string,
    method: 'email' | 'id_document' | 'manual',
    verified: boolean
  ): Promise<void> {
    await this.updateDSR(dsrId, {
      verificationStatus: verified ? 'verified' : 'failed',
      verificationMethod: method,
    })
  }

  static async completeDSR(
    dsrId: string,
    response: DSRResponse
  ): Promise<void> {
    await this.updateDSR(dsrId, {
      status: 'completed',
      response: {
        ...response,
        respondedAt: new Date(),
      },
      completedAt: new Date(),
    })
  }

  static async processErasureRequest(
    dsrId: string,
    customerId: string
  ): Promise<{ deleted: string[]; retained: string[] }> {
    const deleted: string[] = []
    const retained: string[] = []

    // This would delete/anonymize customer data across collections
    // Some data may be retained for legal/accounting purposes

    // Example: Delete from customers collection
    try {
      await deleteDoc(doc(db, 'customers', customerId))
      deleted.push('customer_profile')
    } catch {
      retained.push('customer_profile')
    }

    // Anonymize order data (retain for accounting but remove PII)
    // In production, this would be more comprehensive

    return { deleted, retained }
  }

  static async processAccessRequest(
    customerId: string
  ): Promise<Record<string, any>> {
    const data: Record<string, any> = {}

    // Gather all customer data
    const customerDoc = await getDoc(doc(db, 'customers', customerId))
    if (customerDoc.exists()) {
      data.profile = customerDoc.data()
    }

    // Get orders
    const ordersQuery = query(
      collection(db, 'orders'),
      where('customerId', '==', customerId)
    )
    const ordersSnap = await getDocs(ordersQuery)
    data.orders = ordersSnap.docs.map((d) => d.data())

    // Get consent records
    const consent = await this.getConsent('', customerId) // Would need promoterId
    if (consent) {
      data.consents = consent.consents
    }

    return data
  }

  static async exportPortableData(
    customerId: string
  ): Promise<{ format: 'json'; data: string }> {
    const data = await this.processAccessRequest(customerId)
    return {
      format: 'json',
      data: JSON.stringify(data, null, 2),
    }
  }

  // ==================== LEGAL DOCUMENTS ====================

  static async createLegalDocument(
    data: Omit<LegalDocument, 'id' | 'version' | 'createdAt' | 'updatedAt'>
  ): Promise<LegalDocument> {
    const docId = `legal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const document: LegalDocument = {
      ...data,
      id: docId,
      version: generateVersion(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await setDoc(doc(db, 'legalDocuments', docId), {
      ...document,
      effectiveDate: Timestamp.fromDate(document.effectiveDate),
      expiryDate: document.expiryDate ? Timestamp.fromDate(document.expiryDate) : null,
      createdAt: Timestamp.fromDate(document.createdAt),
      updatedAt: Timestamp.fromDate(document.updatedAt),
    })

    return document
  }

  static async getLegalDocument(documentId: string): Promise<LegalDocument | null> {
    const docRef = await getDoc(doc(db, 'legalDocuments', documentId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    return {
      ...data,
      id: docRef.id,
      effectiveDate: data.effectiveDate.toDate(),
      expiryDate: data.expiryDate?.toDate(),
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as LegalDocument
  }

  static async getActiveLegalDocument(
    promoterId: string,
    type: LegalDocumentType
  ): Promise<LegalDocument | null> {
    const q = query(
      collection(db, 'legalDocuments'),
      where('promoterId', '==', promoterId),
      where('type', '==', type),
      where('status', '==', 'active'),
      orderBy('effectiveDate', 'desc'),
      limit(1)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const doc_data = snapshot.docs[0]
    const data = doc_data.data()
    return {
      ...data,
      id: doc_data.id,
      effectiveDate: data.effectiveDate.toDate(),
      expiryDate: data.expiryDate?.toDate(),
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as LegalDocument
  }

  static async getLegalDocuments(
    promoterId: string,
    filters?: { type?: LegalDocumentType; status?: LegalDocument['status'] }
  ): Promise<LegalDocument[]> {
    let q = query(
      collection(db, 'legalDocuments'),
      where('promoterId', '==', promoterId),
      orderBy('updatedAt', 'desc')
    )

    if (filters?.type) {
      q = query(q, where('type', '==', filters.type))
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
        effectiveDate: data.effectiveDate.toDate(),
        expiryDate: data.expiryDate?.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as LegalDocument
    })
  }

  static async updateLegalDocument(
    documentId: string,
    updates: Partial<LegalDocument>
  ): Promise<void> {
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }

    if (updates.effectiveDate) {
      updateData.effectiveDate = Timestamp.fromDate(updates.effectiveDate)
    }
    if (updates.expiryDate) {
      updateData.expiryDate = Timestamp.fromDate(updates.expiryDate)
    }

    delete updateData.id
    delete updateData.createdAt

    await updateDoc(doc(db, 'legalDocuments', documentId), updateData)
  }

  static async publishNewVersion(
    documentId: string,
    content: string,
    changelog: string,
    effectiveDate: Date
  ): Promise<LegalDocument> {
    const current = await this.getLegalDocument(documentId)
    if (!current) {
      throw new Error('Document not found')
    }

    // Archive current version
    await this.updateLegalDocument(documentId, { status: 'archived' })

    // Create new version
    return this.createLegalDocument({
      promoterId: current.promoterId,
      type: current.type,
      title: current.title,
      content,
      status: 'active',
      effectiveDate,
      changelog,
      previousVersionId: documentId,
      requiredConsent: current.requiredConsent,
      displayLocations: current.displayLocations,
      translations: current.translations,
      createdBy: current.createdBy,
    })
  }

  // ==================== DATA RETENTION ====================

  static async createRetentionPolicy(
    data: Omit<DataRetentionPolicy, 'id' | 'lastRun' | 'nextRun' | 'createdAt'>
  ): Promise<DataRetentionPolicy> {
    const policyId = `retention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const policy: DataRetentionPolicy = {
      ...data,
      id: policyId,
      createdAt: new Date(),
    }

    await setDoc(doc(db, 'retentionPolicies', policyId), {
      ...policy,
      createdAt: Timestamp.fromDate(policy.createdAt),
    })

    return policy
  }

  static async getRetentionPolicies(promoterId: string): Promise<DataRetentionPolicy[]> {
    const q = query(
      collection(db, 'retentionPolicies'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        lastRun: data.lastRun?.toDate(),
        nextRun: data.nextRun?.toDate(),
        createdAt: data.createdAt.toDate(),
      } as DataRetentionPolicy
    })
  }

  static async executeRetentionPolicy(policyId: string): Promise<{
    processed: number
    deleted: number
    errors: number
  }> {
    // In production, this would process and delete expired data
    // For now, return mock results
    return {
      processed: 0,
      deleted: 0,
      errors: 0,
    }
  }

  // ==================== COOKIE CONSENT ====================

  static async recordCookieConsent(
    data: Omit<CookieConsent, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CookieConsent> {
    const consentId = `cookie_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const consent: CookieConsent = {
      ...data,
      id: consentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await setDoc(doc(db, 'cookieConsents', consentId), {
      ...consent,
      consentBanner: {
        ...consent.consentBanner,
        shownAt: consent.consentBanner.shownAt
          ? Timestamp.fromDate(consent.consentBanner.shownAt)
          : null,
        interactedAt: consent.consentBanner.interactedAt
          ? Timestamp.fromDate(consent.consentBanner.interactedAt)
          : null,
      },
      createdAt: Timestamp.fromDate(consent.createdAt),
      updatedAt: Timestamp.fromDate(consent.updatedAt),
    })

    return consent
  }

  static async getCookieConsent(
    promoterId: string,
    visitorId: string
  ): Promise<CookieConsent | null> {
    const q = query(
      collection(db, 'cookieConsents'),
      where('promoterId', '==', promoterId),
      where('visitorId', '==', visitorId),
      orderBy('updatedAt', 'desc'),
      limit(1)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const doc_data = snapshot.docs[0]
    const data = doc_data.data()
    return {
      ...data,
      id: doc_data.id,
      consentBanner: {
        ...data.consentBanner,
        shownAt: data.consentBanner.shownAt?.toDate(),
        interactedAt: data.consentBanner.interactedAt?.toDate(),
      },
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as CookieConsent
  }

  static async updateCookiePreferences(
    promoterId: string,
    visitorId: string,
    preferences: CookiePreferences
  ): Promise<void> {
    const existing = await this.getCookieConsent(promoterId, visitorId)
    if (existing) {
      await updateDoc(doc(db, 'cookieConsents', existing.id), {
        preferences,
        'consentBanner.interactedAt': Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      })
    }
  }

  // ==================== AGE VERIFICATION ====================

  static async createAgeVerification(
    data: Omit<AgeVerification, 'id' | 'status' | 'expiresAt' | 'createdAt'>
  ): Promise<AgeVerification> {
    const verificationId = `age_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1) // Valid for 1 year

    const verification: AgeVerification = {
      ...data,
      id: verificationId,
      status: 'pending',
      expiresAt,
      createdAt: new Date(),
    }

    await setDoc(doc(db, 'ageVerifications', verificationId), {
      ...verification,
      dateOfBirth: verification.dateOfBirth
        ? Timestamp.fromDate(verification.dateOfBirth)
        : null,
      verificationData: verification.verificationData
        ? {
            ...verification.verificationData,
            expiryDate: verification.verificationData.expiryDate
              ? Timestamp.fromDate(verification.verificationData.expiryDate)
              : null,
          }
        : null,
      expiresAt: Timestamp.fromDate(verification.expiresAt),
      createdAt: Timestamp.fromDate(verification.createdAt),
    })

    return verification
  }

  static async verifyAge(
    verificationId: string,
    dateOfBirth: Date
  ): Promise<{ verified: boolean; age: number }> {
    const today = new Date()
    const age = today.getFullYear() - dateOfBirth.getFullYear()
    const monthDiff = today.getMonth() - dateOfBirth.getMonth()
    const calculatedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
      ? age - 1
      : age

    const docRef = await getDoc(doc(db, 'ageVerifications', verificationId))
    if (!docRef.exists()) {
      throw new Error('Verification not found')
    }

    const verification = docRef.data()
    const verified = calculatedAge >= verification.minimumAge

    await updateDoc(doc(db, 'ageVerifications', verificationId), {
      dateOfBirth: Timestamp.fromDate(dateOfBirth),
      verifiedAge: calculatedAge,
      status: verified ? 'verified' : 'failed',
    })

    return { verified, age: calculatedAge }
  }

  // ==================== BREACH MANAGEMENT ====================

  static async createBreachNotification(
    data: Omit<BreachNotification, 'id' | 'status' | 'notifications' | 'timeline' | 'createdAt'>
  ): Promise<BreachNotification> {
    const breachId = `breach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const breach: BreachNotification = {
      ...data,
      id: breachId,
      status: 'detected',
      notifications: {
        authority: { notified: false },
        affected: { notified: false },
      },
      timeline: [
        { timestamp: new Date(), action: 'Breach detected', actor: 'system' },
      ],
      createdAt: new Date(),
    }

    await setDoc(doc(db, 'breachNotifications', breachId), {
      ...breach,
      detectedAt: Timestamp.fromDate(breach.detectedAt),
      timeline: breach.timeline.map((t) => ({
        ...t,
        timestamp: Timestamp.fromDate(t.timestamp),
      })),
      createdAt: Timestamp.fromDate(breach.createdAt),
    })

    return breach
  }

  static async updateBreachStatus(
    breachId: string,
    status: BreachNotification['status'],
    actor: string
  ): Promise<void> {
    const breach = await getDoc(doc(db, 'breachNotifications', breachId))
    if (!breach.exists()) return

    const timeline = breach.data().timeline || []
    timeline.push({
      timestamp: Timestamp.fromDate(new Date()),
      action: `Status changed to ${status}`,
      actor,
    })

    const updates: any = { status, timeline }

    if (status === 'contained') {
      updates.containedAt = Timestamp.fromDate(new Date())
    } else if (status === 'resolved') {
      updates.resolvedAt = Timestamp.fromDate(new Date())
    }

    await updateDoc(doc(db, 'breachNotifications', breachId), updates)
  }

  static async notifyAuthority(
    breachId: string,
    reference?: string
  ): Promise<void> {
    await updateDoc(doc(db, 'breachNotifications', breachId), {
      'notifications.authority': {
        notified: true,
        notifiedAt: Timestamp.fromDate(new Date()),
        reference,
      },
      status: 'notified',
    })
  }

  // ==================== AUDIT TRAIL ====================

  static async logAudit(
    data: Omit<AuditTrail, 'id' | 'timestamp'>
  ): Promise<void> {
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await setDoc(doc(db, 'complianceAuditLogs', auditId), {
      ...data,
      id: auditId,
      timestamp: Timestamp.fromDate(new Date()),
    })
  }

  static async getAuditTrail(
    promoterId: string,
    filters?: {
      entityType?: string
      entityId?: string
      actorId?: string
      action?: string
      startDate?: Date
      endDate?: Date
      limit?: number
    }
  ): Promise<AuditTrail[]> {
    let q = query(
      collection(db, 'complianceAuditLogs'),
      where('promoterId', '==', promoterId),
      orderBy('timestamp', 'desc'),
      limit(filters?.limit || 100)
    )

    if (filters?.entityType) {
      q = query(q, where('entityType', '==', filters.entityType))
    }
    if (filters?.entityId) {
      q = query(q, where('entityId', '==', filters.entityId))
    }
    if (filters?.actorId) {
      q = query(q, where('actorId', '==', filters.actorId))
    }

    const snapshot = await getDocs(q)
    let logs = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        timestamp: data.timestamp.toDate(),
      } as AuditTrail
    })

    if (filters?.startDate) {
      logs = logs.filter((l) => l.timestamp >= filters.startDate!)
    }
    if (filters?.endDate) {
      logs = logs.filter((l) => l.timestamp <= filters.endDate!)
    }

    return logs
  }

  // ==================== COMPLIANCE REPORTS ====================

  static async generateComplianceReport(
    promoterId: string,
    type: ComplianceReport['type'],
    period: { start: Date; end: Date },
    generatedBy: string
  ): Promise<ComplianceReport> {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Calculate metrics
    const metrics = await this.calculateComplianceMetrics(promoterId, period)
    const issues = await this.identifyComplianceIssues(promoterId)
    const recommendations = this.generateRecommendations(issues)

    const report: ComplianceReport = {
      id: reportId,
      promoterId,
      type,
      period,
      metrics,
      issues,
      recommendations,
      generatedAt: new Date(),
      generatedBy,
    }

    await setDoc(doc(db, 'complianceReports', reportId), {
      ...report,
      period: {
        start: Timestamp.fromDate(period.start),
        end: Timestamp.fromDate(period.end),
      },
      generatedAt: Timestamp.fromDate(report.generatedAt),
    })

    return report
  }

  static async calculateComplianceMetrics(
    promoterId: string,
    period: { start: Date; end: Date }
  ): Promise<ComplianceMetrics> {
    // In production, calculate actual metrics
    return {
      totalCustomers: 0,
      customersWithConsent: 0,
      consentRate: 0,
      dsrRequests: {
        total: 0,
        completed: 0,
        pending: 0,
        avgResponseTime: 0,
      },
      dataBreaches: 0,
      cookieConsentRate: 0,
      documentsUpToDate: 0,
      totalDocuments: 0,
    }
  }

  static async identifyComplianceIssues(
    promoterId: string
  ): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = []

    // Check for overdue DSR requests
    const dsrs = await this.getDSRs(promoterId, { status: 'pending' })
    const overdueDsrs = dsrs.filter((d) => d.deadline < new Date())
    if (overdueDsrs.length > 0) {
      issues.push({
        severity: 'critical',
        category: 'DSR',
        description: `${overdueDsrs.length} data subject request(s) are overdue`,
        affectedRecords: overdueDsrs.length,
        recommendation: 'Immediately process overdue requests to avoid regulatory penalties',
      })
    }

    // Check for expired legal documents
    const documents = await this.getLegalDocuments(promoterId, { status: 'active' })
    const expiredDocs = documents.filter((d) => d.expiryDate && d.expiryDate < new Date())
    if (expiredDocs.length > 0) {
      issues.push({
        severity: 'high',
        category: 'Legal Documents',
        description: `${expiredDocs.length} legal document(s) have expired`,
        recommendation: 'Review and update expired documents',
      })
    }

    return issues
  }

  static generateRecommendations(issues: ComplianceIssue[]): string[] {
    const recommendations: string[] = []

    if (issues.some((i) => i.category === 'DSR')) {
      recommendations.push('Implement automated DSR processing workflows')
      recommendations.push('Set up alerts for approaching DSR deadlines')
    }

    if (issues.some((i) => i.category === 'Legal Documents')) {
      recommendations.push('Schedule regular legal document reviews')
      recommendations.push('Enable automatic expiry notifications')
    }

    if (issues.length === 0) {
      recommendations.push('Continue monitoring compliance metrics')
      recommendations.push('Schedule quarterly compliance reviews')
    }

    return recommendations
  }

  // ==================== CACHE MANAGEMENT ====================

  static clearCache(): void {
    cache.clear()
  }
}
