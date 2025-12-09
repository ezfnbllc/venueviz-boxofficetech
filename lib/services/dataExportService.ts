/**
 * Data Export & Import Service
 * Comprehensive data management for event ticketing platform
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
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AuditService } from './auditService'

export interface ExportJob {
  id?: string
  promoterId: string
  type: 'events' | 'orders' | 'customers' | 'tickets' | 'financial' | 'analytics' | 'full_backup'
  format: 'csv' | 'json' | 'xlsx' | 'pdf'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  filters?: {
    dateRange?: { start: Date; end: Date }
    eventIds?: string[]
    status?: string[]
    customFilters?: Record<string, any>
  }
  options: {
    includeArchived?: boolean
    anonymizeData?: boolean
    compressOutput?: boolean
    includeRelated?: boolean // e.g., include tickets with orders
  }
  progress: {
    totalRecords: number
    processedRecords: number
    percentage: number
  }
  result?: {
    fileUrl: string
    fileName: string
    fileSize: number
    recordCount: number
    expiresAt: Date
  }
  error?: string
  requestedBy: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}

export interface ImportJob {
  id?: string
  promoterId: string
  type: 'events' | 'customers' | 'tickets' | 'venues' | 'pricing'
  status: 'pending' | 'validating' | 'processing' | 'completed' | 'failed' | 'partial'
  sourceFile: {
    name: string
    url: string
    format: 'csv' | 'json' | 'xlsx'
    size: number
  }
  mapping: {
    sourceField: string
    targetField: string
    transformation?: 'lowercase' | 'uppercase' | 'trim' | 'date' | 'number' | 'custom'
    customTransform?: string
  }[]
  options: {
    updateExisting: boolean
    skipErrors: boolean
    dryRun: boolean
    batchSize: number
  }
  validation: {
    totalRows: number
    validRows: number
    invalidRows: number
    errors: {
      row: number
      field: string
      value: any
      error: string
    }[]
  }
  progress: {
    totalRecords: number
    processedRecords: number
    successCount: number
    errorCount: number
    percentage: number
  }
  result?: {
    created: number
    updated: number
    skipped: number
    failed: number
    errors: { row: number; error: string }[]
  }
  requestedBy: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}

export interface DataSchema {
  type: string
  fields: {
    name: string
    type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object'
    required: boolean
    description: string
    example: any
    validation?: {
      pattern?: string
      min?: number
      max?: number
      enum?: any[]
    }
  }[]
}

export interface ScheduledExport {
  id?: string
  promoterId: string
  name: string
  exportType: ExportJob['type']
  format: ExportJob['format']
  filters?: ExportJob['filters']
  options: ExportJob['options']
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly'
    dayOfWeek?: number // 0-6 for weekly
    dayOfMonth?: number // 1-31 for monthly
    time: string // HH:MM
    timezone: string
  }
  delivery: {
    method: 'email' | 'webhook' | 'storage'
    recipients?: string[] // for email
    webhookUrl?: string
    storagePath?: string
  }
  status: 'active' | 'paused'
  lastRunAt?: Date
  nextRunAt?: Date
  createdAt: Date
  updatedAt: Date
}

class DataExportServiceClass {
  private auditService: AuditService

  constructor() {
    this.auditService = new AuditService()
  }

  // ==================== DATA SCHEMAS ====================

  getDataSchema(type: string): DataSchema {
    const schemas: Record<string, DataSchema> = {
      events: {
        type: 'events',
        fields: [
          { name: 'id', type: 'string', required: false, description: 'Unique event ID', example: 'evt_123' },
          { name: 'name', type: 'string', required: true, description: 'Event name', example: 'Summer Concert 2024' },
          { name: 'description', type: 'string', required: false, description: 'Event description', example: 'Annual outdoor concert' },
          { name: 'venueId', type: 'string', required: true, description: 'Venue ID', example: 'ven_456' },
          { name: 'startDate', type: 'date', required: true, description: 'Event start date/time', example: '2024-07-15T19:00:00Z' },
          { name: 'endDate', type: 'date', required: false, description: 'Event end date/time', example: '2024-07-15T23:00:00Z' },
          { name: 'status', type: 'string', required: false, description: 'Event status', example: 'published', validation: { enum: ['draft', 'published', 'cancelled', 'completed'] } },
          { name: 'capacity', type: 'number', required: false, description: 'Total capacity', example: 5000 },
          { name: 'ticketTypes', type: 'array', required: false, description: 'Ticket type configurations', example: [] },
        ],
      },
      customers: {
        type: 'customers',
        fields: [
          { name: 'id', type: 'string', required: false, description: 'Unique customer ID', example: 'cust_789' },
          { name: 'email', type: 'string', required: true, description: 'Customer email', example: 'john@example.com', validation: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' } },
          { name: 'firstName', type: 'string', required: true, description: 'First name', example: 'John' },
          { name: 'lastName', type: 'string', required: true, description: 'Last name', example: 'Doe' },
          { name: 'phone', type: 'string', required: false, description: 'Phone number', example: '+1234567890' },
          { name: 'address', type: 'object', required: false, description: 'Mailing address', example: { street: '123 Main St', city: 'New York', state: 'NY', zip: '10001', country: 'US' } },
          { name: 'tags', type: 'array', required: false, description: 'Customer tags', example: ['vip', 'newsletter'] },
        ],
      },
      orders: {
        type: 'orders',
        fields: [
          { name: 'id', type: 'string', required: false, description: 'Unique order ID', example: 'ord_101' },
          { name: 'customerId', type: 'string', required: true, description: 'Customer ID', example: 'cust_789' },
          { name: 'eventId', type: 'string', required: true, description: 'Event ID', example: 'evt_123' },
          { name: 'tickets', type: 'array', required: true, description: 'Ticket details', example: [{ type: 'general', quantity: 2, price: 50 }] },
          { name: 'totalAmount', type: 'number', required: true, description: 'Total order amount', example: 100 },
          { name: 'status', type: 'string', required: false, description: 'Order status', example: 'completed', validation: { enum: ['pending', 'completed', 'refunded', 'cancelled'] } },
          { name: 'paymentMethod', type: 'string', required: false, description: 'Payment method', example: 'card' },
          { name: 'purchaseDate', type: 'date', required: false, description: 'Purchase date', example: '2024-06-01T14:30:00Z' },
        ],
      },
      tickets: {
        type: 'tickets',
        fields: [
          { name: 'id', type: 'string', required: false, description: 'Unique ticket ID', example: 'tkt_202' },
          { name: 'orderId', type: 'string', required: true, description: 'Order ID', example: 'ord_101' },
          { name: 'eventId', type: 'string', required: true, description: 'Event ID', example: 'evt_123' },
          { name: 'customerId', type: 'string', required: true, description: 'Customer ID', example: 'cust_789' },
          { name: 'ticketType', type: 'string', required: true, description: 'Ticket type', example: 'general' },
          { name: 'price', type: 'number', required: true, description: 'Ticket price', example: 50 },
          { name: 'seatSection', type: 'string', required: false, description: 'Section', example: 'A' },
          { name: 'seatRow', type: 'string', required: false, description: 'Row', example: '5' },
          { name: 'seatNumber', type: 'string', required: false, description: 'Seat number', example: '12' },
          { name: 'status', type: 'string', required: false, description: 'Ticket status', example: 'valid', validation: { enum: ['valid', 'used', 'cancelled', 'transferred'] } },
          { name: 'barcode', type: 'string', required: false, description: 'Ticket barcode', example: 'TKT202ABC123' },
        ],
      },
      venues: {
        type: 'venues',
        fields: [
          { name: 'id', type: 'string', required: false, description: 'Unique venue ID', example: 'ven_456' },
          { name: 'name', type: 'string', required: true, description: 'Venue name', example: 'Madison Square Garden' },
          { name: 'address', type: 'object', required: true, description: 'Venue address', example: { street: '4 Pennsylvania Plaza', city: 'New York', state: 'NY', zip: '10001', country: 'US' } },
          { name: 'capacity', type: 'number', required: false, description: 'Total capacity', example: 20000 },
          { name: 'sections', type: 'array', required: false, description: 'Seating sections', example: [{ name: 'Floor', capacity: 5000 }] },
        ],
      },
    }

    return schemas[type] || { type, fields: [] }
  }

  // ==================== EXPORT JOBS ====================

  async createExportJob(
    job: Omit<ExportJob, 'id' | 'createdAt' | 'progress' | 'status'>,
    userId: string
  ): Promise<ExportJob> {
    const now = new Date()
    const jobData: Omit<ExportJob, 'id'> = {
      ...job,
      status: 'pending',
      progress: {
        totalRecords: 0,
        processedRecords: 0,
        percentage: 0,
      },
      createdAt: now,
    }

    const docRef = await addDoc(collection(db, 'exportJobs'), {
      ...jobData,
      createdAt: Timestamp.fromDate(now),
      filters: job.filters
        ? {
            ...job.filters,
            dateRange: job.filters.dateRange
              ? {
                  start: Timestamp.fromDate(job.filters.dateRange.start),
                  end: Timestamp.fromDate(job.filters.dateRange.end),
                }
              : null,
          }
        : null,
    })

    await this.auditService.logActivity({
      userId,
      action: 'create',
      resourceType: 'export_job',
      resourceId: docRef.id,
      details: { type: job.type, format: job.format },
      ipAddress: '',
      userAgent: '',
    })

    // Start processing asynchronously
    this.processExportJob(docRef.id, userId)

    return { id: docRef.id, ...jobData }
  }

  private async processExportJob(jobId: string, userId: string): Promise<void> {
    const jobRef = doc(db, 'exportJobs', jobId)

    try {
      // Update status to processing
      await updateDoc(jobRef, {
        status: 'processing',
        startedAt: Timestamp.fromDate(new Date()),
      })

      const jobDoc = await getDoc(jobRef)
      if (!jobDoc.exists()) return

      const job = jobDoc.data() as ExportJob
      const data = await this.fetchExportData(job)

      // Update progress
      await updateDoc(jobRef, {
        'progress.totalRecords': data.length,
        'progress.processedRecords': data.length,
        'progress.percentage': 100,
      })

      // Generate export file
      const exportResult = await this.generateExportFile(job, data)

      // Update job with result
      await updateDoc(jobRef, {
        status: 'completed',
        completedAt: Timestamp.fromDate(new Date()),
        result: {
          ...exportResult,
          expiresAt: Timestamp.fromDate(
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          ),
        },
      })

      await this.auditService.logActivity({
        userId,
        action: 'complete',
        resourceType: 'export_job',
        resourceId: jobId,
        details: { recordCount: data.length },
        ipAddress: '',
        userAgent: '',
      })
    } catch (error: any) {
      await updateDoc(jobRef, {
        status: 'failed',
        error: error.message,
        completedAt: Timestamp.fromDate(new Date()),
      })
    }
  }

  private async fetchExportData(job: ExportJob): Promise<any[]> {
    const collectionName = this.getCollectionName(job.type)
    let q = query(
      collection(db, collectionName),
      where('promoterId', '==', job.promoterId)
    )

    const snapshot = await getDocs(q)
    let data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Apply filters
    if (job.filters?.dateRange) {
      data = data.filter((item: any) => {
        const date = item.createdAt?.toDate() || item.startDate?.toDate()
        if (!date) return true
        return date >= job.filters!.dateRange!.start && date <= job.filters!.dateRange!.end
      })
    }

    if (job.filters?.eventIds?.length) {
      data = data.filter((item: any) => job.filters!.eventIds!.includes(item.eventId || item.id))
    }

    if (job.filters?.status?.length) {
      data = data.filter((item: any) => job.filters!.status!.includes(item.status))
    }

    // Anonymize if requested
    if (job.options.anonymizeData) {
      data = data.map((item: any) => this.anonymizeRecord(item, job.type))
    }

    return data
  }

  private getCollectionName(type: ExportJob['type']): string {
    const mapping: Record<string, string> = {
      events: 'events',
      orders: 'orders',
      customers: 'customers',
      tickets: 'tickets',
      financial: 'paymentTransactions',
      analytics: 'analytics',
      full_backup: 'events', // Will need special handling
    }
    return mapping[type] || type
  }

  private anonymizeRecord(record: any, type: string): any {
    const anonymized = { ...record }

    // Anonymize sensitive fields based on type
    if (type === 'customers' || record.email) {
      anonymized.email = this.hashField(record.email)
      anonymized.firstName = 'REDACTED'
      anonymized.lastName = 'REDACTED'
      anonymized.phone = record.phone ? 'XXX-XXX-' + record.phone.slice(-4) : null
    }

    if (record.address) {
      anonymized.address = {
        ...record.address,
        street: 'REDACTED',
      }
    }

    return anonymized
  }

  private hashField(value: string): string {
    if (!value) return ''
    // Simple hash for anonymization
    let hash = 0
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return `anon_${Math.abs(hash).toString(16)}`
  }

  private async generateExportFile(
    job: ExportJob,
    data: any[]
  ): Promise<{ fileUrl: string; fileName: string; fileSize: number; recordCount: number }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `${job.type}_export_${timestamp}.${job.format}`

    let content: string
    let fileSize: number

    switch (job.format) {
      case 'csv':
        content = this.convertToCSV(data)
        fileSize = new Blob([content]).size
        break
      case 'json':
        content = JSON.stringify(data, null, 2)
        fileSize = new Blob([content]).size
        break
      default:
        content = JSON.stringify(data, null, 2)
        fileSize = new Blob([content]).size
    }

    // In production, upload to cloud storage and return URL
    // For now, return a placeholder URL
    const fileUrl = `/api/exports/download/${job.id}/${fileName}`

    return {
      fileUrl,
      fileName,
      fileSize,
      recordCount: data.length,
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return ''

    // Get all unique keys from all records
    const keys = new Set<string>()
    data.forEach((item) => {
      Object.keys(item).forEach((key) => {
        if (typeof item[key] !== 'object' || item[key] === null) {
          keys.add(key)
        }
      })
    })

    const headers = Array.from(keys)
    const rows = data.map((item) =>
      headers
        .map((header) => {
          const value = item[header]
          if (value === null || value === undefined) return ''
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return String(value)
        })
        .join(',')
    )

    return [headers.join(','), ...rows].join('\n')
  }

  async getExportJobs(
    promoterId: string,
    filters?: {
      status?: ExportJob['status'][]
      type?: ExportJob['type'][]
    }
  ): Promise<ExportJob[]> {
    const q = query(
      collection(db, 'exportJobs'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    let jobs = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
        filters: data.filters
          ? {
              ...data.filters,
              dateRange: data.filters.dateRange
                ? {
                    start: data.filters.dateRange.start?.toDate(),
                    end: data.filters.dateRange.end?.toDate(),
                  }
                : undefined,
            }
          : undefined,
        result: data.result
          ? {
              ...data.result,
              expiresAt: data.result.expiresAt?.toDate(),
            }
          : undefined,
      }
    }) as ExportJob[]

    if (filters?.status?.length) {
      jobs = jobs.filter((j) => filters.status!.includes(j.status))
    }

    if (filters?.type?.length) {
      jobs = jobs.filter((j) => filters.type!.includes(j.type))
    }

    return jobs
  }

  async getExportJob(jobId: string): Promise<ExportJob | null> {
    const docSnap = await getDoc(doc(db, 'exportJobs', jobId))
    if (!docSnap.exists()) return null

    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      startedAt: data.startedAt?.toDate(),
      completedAt: data.completedAt?.toDate(),
    } as ExportJob
  }

  // ==================== IMPORT JOBS ====================

  async createImportJob(
    job: Omit<ImportJob, 'id' | 'createdAt' | 'progress' | 'status' | 'validation'>,
    userId: string
  ): Promise<ImportJob> {
    const now = new Date()
    const jobData: Omit<ImportJob, 'id'> = {
      ...job,
      status: 'pending',
      progress: {
        totalRecords: 0,
        processedRecords: 0,
        successCount: 0,
        errorCount: 0,
        percentage: 0,
      },
      validation: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        errors: [],
      },
      createdAt: now,
    }

    const docRef = await addDoc(collection(db, 'importJobs'), {
      ...jobData,
      createdAt: Timestamp.fromDate(now),
    })

    await this.auditService.logActivity({
      userId,
      action: 'create',
      resourceType: 'import_job',
      resourceId: docRef.id,
      details: { type: job.type, fileName: job.sourceFile.name },
      ipAddress: '',
      userAgent: '',
    })

    // Start validation asynchronously
    this.validateImportJob(docRef.id, userId)

    return { id: docRef.id, ...jobData }
  }

  private async validateImportJob(jobId: string, userId: string): Promise<void> {
    const jobRef = doc(db, 'importJobs', jobId)

    try {
      await updateDoc(jobRef, {
        status: 'validating',
      })

      const jobDoc = await getDoc(jobRef)
      if (!jobDoc.exists()) return

      const job = jobDoc.data() as ImportJob

      // In production, fetch and parse the source file
      // For now, simulate validation
      const validation = await this.simulateValidation(job)

      await updateDoc(jobRef, {
        status: validation.invalidRows === 0 ? 'pending' : 'pending',
        validation,
      })
    } catch (error: any) {
      await updateDoc(jobRef, {
        status: 'failed',
        error: error.message,
      })
    }
  }

  private async simulateValidation(job: ImportJob): Promise<ImportJob['validation']> {
    // Simulate validation results
    const schema = this.getDataSchema(job.type)
    const requiredFields = schema.fields.filter((f) => f.required).map((f) => f.name)

    // In production, parse the actual file and validate each row
    return {
      totalRows: 100, // Would come from actual file
      validRows: 95,
      invalidRows: 5,
      errors: [
        { row: 12, field: 'email', value: 'invalid-email', error: 'Invalid email format' },
        { row: 45, field: 'startDate', value: 'not-a-date', error: 'Invalid date format' },
        { row: 67, field: 'name', value: '', error: 'Required field is empty' },
        { row: 78, field: 'capacity', value: 'abc', error: 'Expected number, got string' },
        { row: 89, field: 'status', value: 'unknown', error: 'Invalid enum value' },
      ],
    }
  }

  async processImportJob(jobId: string, userId: string): Promise<void> {
    const jobRef = doc(db, 'importJobs', jobId)

    try {
      await updateDoc(jobRef, {
        status: 'processing',
        startedAt: Timestamp.fromDate(new Date()),
      })

      const jobDoc = await getDoc(jobRef)
      if (!jobDoc.exists()) return

      const job = jobDoc.data() as ImportJob

      // Skip if dry run
      if (job.options.dryRun) {
        await updateDoc(jobRef, {
          status: 'completed',
          completedAt: Timestamp.fromDate(new Date()),
          result: {
            created: 0,
            updated: 0,
            skipped: job.validation.totalRows,
            failed: 0,
            errors: [],
          },
        })
        return
      }

      // Process import
      const result = await this.executeImport(job)

      await updateDoc(jobRef, {
        status: result.failed > 0 && !job.options.skipErrors ? 'partial' : 'completed',
        completedAt: Timestamp.fromDate(new Date()),
        result,
        'progress.processedRecords': result.created + result.updated + result.skipped + result.failed,
        'progress.successCount': result.created + result.updated,
        'progress.errorCount': result.failed,
        'progress.percentage': 100,
      })

      await this.auditService.logActivity({
        userId,
        action: 'process',
        resourceType: 'import_job',
        resourceId: jobId,
        details: result,
        ipAddress: '',
        userAgent: '',
      })
    } catch (error: any) {
      await updateDoc(jobRef, {
        status: 'failed',
        error: error.message,
        completedAt: Timestamp.fromDate(new Date()),
      })
    }
  }

  private async executeImport(job: ImportJob): Promise<ImportJob['result']> {
    // In production, this would:
    // 1. Parse the source file
    // 2. Apply field mappings and transformations
    // 3. Validate each record
    // 4. Create or update records in batches

    const collectionName = this.getCollectionName(job.type)
    const batch = writeBatch(db)

    // Simulated import results
    const result: ImportJob['result'] = {
      created: 80,
      updated: 15,
      skipped: 0,
      failed: 5,
      errors: [
        { row: 12, error: 'Validation failed: Invalid email format' },
        { row: 45, error: 'Validation failed: Invalid date format' },
        { row: 67, error: 'Validation failed: Required field is empty' },
        { row: 78, error: 'Validation failed: Expected number' },
        { row: 89, error: 'Validation failed: Invalid status value' },
      ],
    }

    return result
  }

  async getImportJobs(
    promoterId: string,
    filters?: {
      status?: ImportJob['status'][]
      type?: ImportJob['type'][]
    }
  ): Promise<ImportJob[]> {
    const q = query(
      collection(db, 'importJobs'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    let jobs = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
      }
    }) as ImportJob[]

    if (filters?.status?.length) {
      jobs = jobs.filter((j) => filters.status!.includes(j.status))
    }

    if (filters?.type?.length) {
      jobs = jobs.filter((j) => filters.type!.includes(j.type))
    }

    return jobs
  }

  async getImportJob(jobId: string): Promise<ImportJob | null> {
    const docSnap = await getDoc(doc(db, 'importJobs', jobId))
    if (!docSnap.exists()) return null

    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      startedAt: data.startedAt?.toDate(),
      completedAt: data.completedAt?.toDate(),
    } as ImportJob
  }

  // ==================== SCHEDULED EXPORTS ====================

  async createScheduledExport(
    schedule: Omit<ScheduledExport, 'id' | 'createdAt' | 'updatedAt' | 'lastRunAt' | 'nextRunAt'>,
    userId: string
  ): Promise<ScheduledExport> {
    const now = new Date()
    const nextRun = this.calculateNextRun(schedule.schedule)

    const scheduleData = {
      ...schedule,
      lastRunAt: null,
      nextRunAt: Timestamp.fromDate(nextRun),
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    }

    const docRef = await addDoc(collection(db, 'scheduledExports'), scheduleData)

    await this.auditService.logActivity({
      userId,
      action: 'create',
      resourceType: 'scheduled_export',
      resourceId: docRef.id,
      details: { name: schedule.name, frequency: schedule.schedule.frequency },
      ipAddress: '',
      userAgent: '',
    })

    return {
      id: docRef.id,
      ...schedule,
      nextRunAt: nextRun,
      createdAt: now,
      updatedAt: now,
    }
  }

  private calculateNextRun(schedule: ScheduledExport['schedule']): Date {
    const now = new Date()
    const [hours, minutes] = schedule.time.split(':').map(Number)
    const next = new Date(now)
    next.setHours(hours, minutes, 0, 0)

    if (next <= now) {
      switch (schedule.frequency) {
        case 'daily':
          next.setDate(next.getDate() + 1)
          break
        case 'weekly':
          next.setDate(next.getDate() + 7)
          if (schedule.dayOfWeek !== undefined) {
            while (next.getDay() !== schedule.dayOfWeek) {
              next.setDate(next.getDate() + 1)
            }
          }
          break
        case 'monthly':
          next.setMonth(next.getMonth() + 1)
          if (schedule.dayOfMonth) {
            next.setDate(Math.min(schedule.dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()))
          }
          break
      }
    }

    return next
  }

  async getScheduledExports(promoterId: string): Promise<ScheduledExport[]> {
    const q = query(
      collection(db, 'scheduledExports'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        lastRunAt: data.lastRunAt?.toDate(),
        nextRunAt: data.nextRunAt?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      }
    }) as ScheduledExport[]
  }

  async updateScheduledExport(
    scheduleId: string,
    updates: Partial<ScheduledExport>,
    userId: string
  ): Promise<void> {
    const scheduleRef = doc(db, 'scheduledExports', scheduleId)

    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }

    if (updates.schedule) {
      updateData.nextRunAt = Timestamp.fromDate(this.calculateNextRun(updates.schedule))
    }

    await updateDoc(scheduleRef, updateData)

    await this.auditService.logActivity({
      userId,
      action: 'update',
      resourceType: 'scheduled_export',
      resourceId: scheduleId,
      details: { updates: Object.keys(updates) },
      ipAddress: '',
      userAgent: '',
    })
  }

  async pauseScheduledExport(scheduleId: string, userId: string): Promise<void> {
    await this.updateScheduledExport(scheduleId, { status: 'paused' }, userId)
  }

  async resumeScheduledExport(scheduleId: string, userId: string): Promise<void> {
    const scheduleDoc = await getDoc(doc(db, 'scheduledExports', scheduleId))
    if (!scheduleDoc.exists()) return

    const schedule = scheduleDoc.data() as ScheduledExport
    const nextRun = this.calculateNextRun(schedule.schedule)

    await updateDoc(doc(db, 'scheduledExports', scheduleId), {
      status: 'active',
      nextRunAt: Timestamp.fromDate(nextRun),
      updatedAt: Timestamp.fromDate(new Date()),
    })

    await this.auditService.logActivity({
      userId,
      action: 'resume',
      resourceType: 'scheduled_export',
      resourceId: scheduleId,
      details: {},
      ipAddress: '',
      userAgent: '',
    })
  }

  async runScheduledExportNow(scheduleId: string, userId: string): Promise<ExportJob> {
    const scheduleDoc = await getDoc(doc(db, 'scheduledExports', scheduleId))
    if (!scheduleDoc.exists()) {
      throw new Error('Scheduled export not found')
    }

    const schedule = scheduleDoc.data() as ScheduledExport

    // Create and run export job
    const exportJob = await this.createExportJob(
      {
        promoterId: schedule.promoterId,
        type: schedule.exportType,
        format: schedule.format,
        filters: schedule.filters,
        options: schedule.options,
        requestedBy: userId,
      },
      userId
    )

    // Update last run time
    await updateDoc(doc(db, 'scheduledExports', scheduleId), {
      lastRunAt: Timestamp.fromDate(new Date()),
      nextRunAt: Timestamp.fromDate(this.calculateNextRun(schedule.schedule)),
    })

    return exportJob
  }

  // ==================== UTILITY ====================

  async getExportDownloadUrl(jobId: string): Promise<string | null> {
    const job = await this.getExportJob(jobId)
    if (!job || job.status !== 'completed' || !job.result) {
      return null
    }

    // Check expiration
    if (job.result.expiresAt && job.result.expiresAt < new Date()) {
      return null
    }

    return job.result.fileUrl
  }

  generateSampleData(type: string, count: number = 10): any[] {
    const schema = this.getDataSchema(type)
    const samples: any[] = []

    for (let i = 0; i < count; i++) {
      const sample: any = {}
      schema.fields.forEach((field) => {
        sample[field.name] = field.example
      })
      samples.push(sample)
    }

    return samples
  }
}

export const DataExportService = new DataExportServiceClass()
