/**
 * Payment Reconciliation & Financial Tracking Service
 * Comprehensive financial management for event ticketing
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

export interface PaymentTransaction {
  id?: string
  promoterId: string
  orderId: string
  eventId: string
  customerId: string
  type: 'sale' | 'refund' | 'partial_refund' | 'chargeback' | 'fee' | 'payout' | 'adjustment'
  amount: number
  currency: string
  paymentGateway: 'stripe' | 'square' | 'paypal' | 'manual'
  gatewayTransactionId: string
  gatewayFee: number
  platformFee: number
  netAmount: number
  status: 'pending' | 'completed' | 'failed' | 'disputed' | 'refunded'
  metadata: {
    cardLast4?: string
    cardBrand?: string
    paymentMethod?: string
    ticketIds?: string[]
    refundReason?: string
  }
  reconciliationStatus: 'pending' | 'matched' | 'discrepancy' | 'resolved'
  createdAt: Date
  processedAt?: Date
  reconciledAt?: Date
}

export interface PayoutRecord {
  id?: string
  promoterId: string
  eventIds: string[]
  amount: number
  currency: string
  paymentGateway: 'stripe' | 'square' | 'paypal' | 'bank_transfer'
  gatewayPayoutId?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  scheduledDate: Date
  processedDate?: Date
  bankAccount: {
    last4: string
    bankName: string
    accountType: 'checking' | 'savings'
  }
  breakdown: {
    grossSales: number
    refunds: number
    chargebacks: number
    gatewayFees: number
    platformFees: number
    otherDeductions: number
    netPayout: number
  }
  transactionIds: string[]
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface ReconciliationReport {
  id?: string
  promoterId: string
  reportPeriod: {
    start: Date
    end: Date
  }
  status: 'in_progress' | 'completed' | 'requires_review'
  summary: {
    totalTransactions: number
    totalAmount: number
    matchedTransactions: number
    discrepancies: number
    unresolvedAmount: number
  }
  gatewayBalances: {
    gateway: string
    expectedBalance: number
    actualBalance: number
    difference: number
  }[]
  discrepancies: {
    transactionId: string
    type: 'missing' | 'amount_mismatch' | 'duplicate' | 'timing'
    expectedAmount: number
    actualAmount: number
    details: string
  }[]
  createdAt: Date
  completedAt?: Date
  reviewedBy?: string
}

export interface FinancialStatement {
  id?: string
  promoterId: string
  period: {
    type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual'
    start: Date
    end: Date
  }
  revenue: {
    ticketSales: number
    fees: number
    addOns: number
    other: number
    total: number
  }
  deductions: {
    refunds: number
    chargebacks: number
    gatewayFees: number
    platformFees: number
    taxes: number
    total: number
  }
  netRevenue: number
  payouts: {
    completed: number
    pending: number
  }
  accountsReceivable: number
  eventBreakdown: {
    eventId: string
    eventName: string
    revenue: number
    deductions: number
    net: number
  }[]
  createdAt: Date
}

export interface TaxRecord {
  id?: string
  promoterId: string
  year: number
  totalRevenue: number
  totalRefunds: number
  totalFees: number
  netIncome: number
  taxableAmount: number
  transactions: string[]
  form1099Eligible: boolean
  form1099Sent?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Dispute {
  id?: string
  promoterId: string
  transactionId: string
  orderId: string
  type: 'chargeback' | 'inquiry' | 'retrieval'
  reason: string
  amount: number
  currency: string
  status: 'open' | 'under_review' | 'won' | 'lost' | 'expired'
  evidence: {
    type: string
    url: string
    uploadedAt: Date
  }[]
  gatewayDisputeId: string
  deadline?: Date
  outcome?: {
    result: 'won' | 'lost'
    reason: string
    resolvedAt: Date
  }
  createdAt: Date
  updatedAt: Date
}

class PaymentReconciliationServiceClass {
  private auditService: AuditService

  constructor() {
    this.auditService = new AuditService()
  }

  // ==================== TRANSACTIONS ====================

  async recordTransaction(
    transaction: Omit<PaymentTransaction, 'id' | 'createdAt' | 'reconciliationStatus'>
  ): Promise<PaymentTransaction> {
    const now = new Date()
    const transactionData = {
      ...transaction,
      reconciliationStatus: 'pending' as const,
      createdAt: Timestamp.fromDate(now),
      processedAt: transaction.processedAt
        ? Timestamp.fromDate(transaction.processedAt)
        : null,
    }

    const docRef = await addDoc(collection(db, 'paymentTransactions'), transactionData)

    return {
      id: docRef.id,
      ...transaction,
      reconciliationStatus: 'pending',
      createdAt: now,
    }
  }

  async getTransactions(
    promoterId: string,
    filters?: {
      dateRange?: { start: Date; end: Date }
      type?: PaymentTransaction['type'][]
      status?: PaymentTransaction['status'][]
      eventId?: string
      reconciliationStatus?: PaymentTransaction['reconciliationStatus']
    },
    pagination?: { limit: number; offset: number }
  ): Promise<{ transactions: PaymentTransaction[]; total: number }> {
    let q = query(
      collection(db, 'paymentTransactions'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    let transactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      processedAt: doc.data().processedAt?.toDate(),
      reconciledAt: doc.data().reconciledAt?.toDate(),
    })) as PaymentTransaction[]

    // Apply filters
    if (filters?.dateRange) {
      transactions = transactions.filter(
        (t) =>
          t.createdAt >= filters.dateRange!.start && t.createdAt <= filters.dateRange!.end
      )
    }

    if (filters?.type?.length) {
      transactions = transactions.filter((t) => filters.type!.includes(t.type))
    }

    if (filters?.status?.length) {
      transactions = transactions.filter((t) => filters.status!.includes(t.status))
    }

    if (filters?.eventId) {
      transactions = transactions.filter((t) => t.eventId === filters.eventId)
    }

    if (filters?.reconciliationStatus) {
      transactions = transactions.filter(
        (t) => t.reconciliationStatus === filters.reconciliationStatus
      )
    }

    const total = transactions.length

    if (pagination) {
      transactions = transactions.slice(
        pagination.offset,
        pagination.offset + pagination.limit
      )
    }

    return { transactions, total }
  }

  async getTransaction(transactionId: string): Promise<PaymentTransaction | null> {
    const docSnap = await getDoc(doc(db, 'paymentTransactions', transactionId))
    if (!docSnap.exists()) return null

    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      processedAt: data.processedAt?.toDate(),
      reconciledAt: data.reconciledAt?.toDate(),
    } as PaymentTransaction
  }

  // ==================== RECONCILIATION ====================

  async runReconciliation(
    promoterId: string,
    dateRange: { start: Date; end: Date },
    userId: string
  ): Promise<ReconciliationReport> {
    const now = new Date()

    // Get all transactions in the date range
    const { transactions } = await this.getTransactions(promoterId, { dateRange })

    // Group by gateway
    const gatewayTotals: Record<string, { expected: number; transactions: PaymentTransaction[] }> =
      {}

    transactions.forEach((t) => {
      if (!gatewayTotals[t.paymentGateway]) {
        gatewayTotals[t.paymentGateway] = { expected: 0, transactions: [] }
      }
      gatewayTotals[t.paymentGateway].transactions.push(t)
      if (t.type === 'sale') {
        gatewayTotals[t.paymentGateway].expected += t.netAmount
      } else if (t.type === 'refund' || t.type === 'partial_refund') {
        gatewayTotals[t.paymentGateway].expected -= t.amount
      }
    })

    // Check for discrepancies
    const discrepancies: ReconciliationReport['discrepancies'] = []
    let matchedCount = 0

    // Check for potential duplicates
    const transactionMap = new Map<string, PaymentTransaction[]>()
    transactions.forEach((t) => {
      const key = `${t.gatewayTransactionId}-${t.amount}`
      if (!transactionMap.has(key)) {
        transactionMap.set(key, [])
      }
      transactionMap.get(key)!.push(t)
    })

    transactionMap.forEach((txns, key) => {
      if (txns.length > 1) {
        txns.slice(1).forEach((t) => {
          discrepancies.push({
            transactionId: t.id!,
            type: 'duplicate',
            expectedAmount: 0,
            actualAmount: t.amount,
            details: `Potential duplicate of transaction ${txns[0].id}`,
          })
        })
      }
    })

    // Mark matched transactions
    const batch = writeBatch(db)
    transactions.forEach((t) => {
      const isDuplicate = discrepancies.some((d) => d.transactionId === t.id)
      if (!isDuplicate && t.reconciliationStatus === 'pending') {
        batch.update(doc(db, 'paymentTransactions', t.id!), {
          reconciliationStatus: 'matched',
          reconciledAt: Timestamp.fromDate(now),
        })
        matchedCount++
      }
    })
    await batch.commit()

    // Calculate summary
    const totalAmount = transactions.reduce((sum, t) => {
      if (t.type === 'sale') return sum + t.amount
      if (t.type === 'refund' || t.type === 'partial_refund') return sum - t.amount
      return sum
    }, 0)

    const unresolvedAmount = discrepancies.reduce((sum, d) => sum + d.actualAmount, 0)

    const report: Omit<ReconciliationReport, 'id'> = {
      promoterId,
      reportPeriod: dateRange,
      status: discrepancies.length > 0 ? 'requires_review' : 'completed',
      summary: {
        totalTransactions: transactions.length,
        totalAmount,
        matchedTransactions: matchedCount,
        discrepancies: discrepancies.length,
        unresolvedAmount,
      },
      gatewayBalances: Object.entries(gatewayTotals).map(([gateway, data]) => ({
        gateway,
        expectedBalance: data.expected,
        actualBalance: data.expected, // In production, would fetch from gateway API
        difference: 0,
      })),
      discrepancies,
      createdAt: now,
      completedAt: discrepancies.length === 0 ? now : undefined,
    }

    const docRef = await addDoc(collection(db, 'reconciliationReports'), {
      ...report,
      reportPeriod: {
        start: Timestamp.fromDate(dateRange.start),
        end: Timestamp.fromDate(dateRange.end),
      },
      createdAt: Timestamp.fromDate(now),
      completedAt: report.completedAt ? Timestamp.fromDate(report.completedAt) : null,
    })

    await this.auditService.logActivity({
      userId,
      action: 'run_reconciliation',
      resourceType: 'reconciliation_report',
      resourceId: docRef.id,
      details: {
        period: dateRange,
        transactionCount: transactions.length,
        discrepancies: discrepancies.length,
      },
      ipAddress: '',
      userAgent: '',
    })

    return { id: docRef.id, ...report }
  }

  async resolveDiscrepancy(
    reportId: string,
    transactionId: string,
    resolution: {
      action: 'mark_resolved' | 'adjust' | 'write_off'
      adjustmentAmount?: number
      notes: string
    },
    userId: string
  ): Promise<void> {
    const reportRef = doc(db, 'reconciliationReports', reportId)
    const reportDoc = await getDoc(reportRef)

    if (!reportDoc.exists()) {
      throw new Error('Report not found')
    }

    const report = reportDoc.data()
    const discrepancies = report.discrepancies.filter(
      (d: any) => d.transactionId !== transactionId
    )

    // Update transaction status
    await updateDoc(doc(db, 'paymentTransactions', transactionId), {
      reconciliationStatus: 'resolved',
      reconciledAt: Timestamp.fromDate(new Date()),
    })

    // Create adjustment if needed
    if (resolution.action === 'adjust' && resolution.adjustmentAmount) {
      const transaction = await this.getTransaction(transactionId)
      if (transaction) {
        await this.recordTransaction({
          promoterId: transaction.promoterId,
          orderId: transaction.orderId,
          eventId: transaction.eventId,
          customerId: transaction.customerId,
          type: 'adjustment',
          amount: resolution.adjustmentAmount,
          currency: transaction.currency,
          paymentGateway: transaction.paymentGateway,
          gatewayTransactionId: `adj-${transactionId}`,
          gatewayFee: 0,
          platformFee: 0,
          netAmount: resolution.adjustmentAmount,
          status: 'completed',
          metadata: {
            refundReason: resolution.notes,
          },
        })
      }
    }

    // Update report
    await updateDoc(reportRef, {
      discrepancies,
      'summary.discrepancies': discrepancies.length,
      status: discrepancies.length === 0 ? 'completed' : 'requires_review',
      completedAt:
        discrepancies.length === 0 ? Timestamp.fromDate(new Date()) : null,
      reviewedBy: userId,
    })

    await this.auditService.logActivity({
      userId,
      action: 'resolve_discrepancy',
      resourceType: 'reconciliation_report',
      resourceId: reportId,
      details: { transactionId, resolution },
      ipAddress: '',
      userAgent: '',
    })
  }

  // ==================== PAYOUTS ====================

  async createPayout(
    payout: Omit<PayoutRecord, 'id' | 'createdAt' | 'updatedAt' | 'breakdown'>,
    userId: string
  ): Promise<PayoutRecord> {
    const now = new Date()

    // Calculate breakdown from transactions
    const { transactions } = await this.getTransactions(payout.promoterId, {
      dateRange: { start: new Date(0), end: now },
    })

    const relevantTransactions = transactions.filter((t) =>
      payout.transactionIds.includes(t.id!)
    )

    const breakdown = {
      grossSales: relevantTransactions
        .filter((t) => t.type === 'sale')
        .reduce((sum, t) => sum + t.amount, 0),
      refunds: relevantTransactions
        .filter((t) => t.type === 'refund' || t.type === 'partial_refund')
        .reduce((sum, t) => sum + t.amount, 0),
      chargebacks: relevantTransactions
        .filter((t) => t.type === 'chargeback')
        .reduce((sum, t) => sum + t.amount, 0),
      gatewayFees: relevantTransactions.reduce((sum, t) => sum + t.gatewayFee, 0),
      platformFees: relevantTransactions.reduce((sum, t) => sum + t.platformFee, 0),
      otherDeductions: 0,
      netPayout: 0,
    }

    breakdown.netPayout =
      breakdown.grossSales -
      breakdown.refunds -
      breakdown.chargebacks -
      breakdown.gatewayFees -
      breakdown.platformFees -
      breakdown.otherDeductions

    const payoutData = {
      ...payout,
      breakdown,
      scheduledDate: Timestamp.fromDate(payout.scheduledDate),
      processedDate: payout.processedDate
        ? Timestamp.fromDate(payout.processedDate)
        : null,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    }

    const docRef = await addDoc(collection(db, 'payoutRecords'), payoutData)

    await this.auditService.logActivity({
      userId,
      action: 'create',
      resourceType: 'payout',
      resourceId: docRef.id,
      details: { amount: breakdown.netPayout, transactionCount: payout.transactionIds.length },
      ipAddress: '',
      userAgent: '',
    })

    return {
      id: docRef.id,
      ...payout,
      breakdown,
      createdAt: now,
      updatedAt: now,
    }
  }

  async getPayouts(
    promoterId: string,
    filters?: {
      status?: PayoutRecord['status'][]
      dateRange?: { start: Date; end: Date }
    }
  ): Promise<PayoutRecord[]> {
    let q = query(
      collection(db, 'payoutRecords'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    let payouts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      scheduledDate: doc.data().scheduledDate?.toDate(),
      processedDate: doc.data().processedDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as PayoutRecord[]

    if (filters?.status?.length) {
      payouts = payouts.filter((p) => filters.status!.includes(p.status))
    }

    if (filters?.dateRange) {
      payouts = payouts.filter(
        (p) =>
          p.scheduledDate >= filters.dateRange!.start &&
          p.scheduledDate <= filters.dateRange!.end
      )
    }

    return payouts
  }

  async processPayout(payoutId: string, userId: string): Promise<void> {
    const payoutRef = doc(db, 'payoutRecords', payoutId)
    const payoutDoc = await getDoc(payoutRef)

    if (!payoutDoc.exists()) {
      throw new Error('Payout not found')
    }

    // In production, this would integrate with payment gateway
    await updateDoc(payoutRef, {
      status: 'processing',
      updatedAt: Timestamp.fromDate(new Date()),
    })

    // Simulate processing time, then mark completed
    await updateDoc(payoutRef, {
      status: 'completed',
      processedDate: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    })

    await this.auditService.logActivity({
      userId,
      action: 'process',
      resourceType: 'payout',
      resourceId: payoutId,
      details: { status: 'completed' },
      ipAddress: '',
      userAgent: '',
    })
  }

  async calculatePendingPayout(promoterId: string): Promise<{
    available: number
    pending: number
    nextPayoutDate: Date | null
    breakdown: PayoutRecord['breakdown']
  }> {
    // Get unprocessed transactions
    const { transactions } = await this.getTransactions(promoterId)
    const unpaidTransactions = transactions.filter(
      (t) => t.status === 'completed' && t.reconciliationStatus !== 'discrepancy'
    )

    // Get pending payouts
    const pendingPayouts = await this.getPayouts(promoterId, {
      status: ['pending', 'processing'],
    })
    const pendingPayoutAmount = pendingPayouts.reduce(
      (sum, p) => sum + p.breakdown.netPayout,
      0
    )

    // Get completed payout transaction IDs
    const completedPayouts = await this.getPayouts(promoterId, { status: ['completed'] })
    const paidTransactionIds = new Set(completedPayouts.flatMap((p) => p.transactionIds))

    // Calculate available balance
    const availableTransactions = unpaidTransactions.filter((t) => !paidTransactionIds.has(t.id!))

    const breakdown = {
      grossSales: availableTransactions
        .filter((t) => t.type === 'sale')
        .reduce((sum, t) => sum + t.amount, 0),
      refunds: availableTransactions
        .filter((t) => t.type === 'refund' || t.type === 'partial_refund')
        .reduce((sum, t) => sum + t.amount, 0),
      chargebacks: availableTransactions
        .filter((t) => t.type === 'chargeback')
        .reduce((sum, t) => sum + t.amount, 0),
      gatewayFees: availableTransactions.reduce((sum, t) => sum + t.gatewayFee, 0),
      platformFees: availableTransactions.reduce((sum, t) => sum + t.platformFee, 0),
      otherDeductions: 0,
      netPayout: 0,
    }

    breakdown.netPayout =
      breakdown.grossSales -
      breakdown.refunds -
      breakdown.chargebacks -
      breakdown.gatewayFees -
      breakdown.platformFees

    // Calculate next payout date (first Friday after 7 days)
    const nextPayout = new Date()
    nextPayout.setDate(nextPayout.getDate() + 7)
    while (nextPayout.getDay() !== 5) {
      nextPayout.setDate(nextPayout.getDate() + 1)
    }

    return {
      available: breakdown.netPayout,
      pending: pendingPayoutAmount,
      nextPayoutDate: breakdown.netPayout > 0 ? nextPayout : null,
      breakdown,
    }
  }

  // ==================== FINANCIAL STATEMENTS ====================

  async generateFinancialStatement(
    promoterId: string,
    period: FinancialStatement['period'],
    userId: string
  ): Promise<FinancialStatement> {
    const { transactions } = await this.getTransactions(promoterId, {
      dateRange: { start: period.start, end: period.end },
    })

    // Calculate revenue
    const sales = transactions.filter((t) => t.type === 'sale')
    const revenue = {
      ticketSales: sales.reduce((sum, t) => sum + t.amount, 0),
      fees: 0, // Add-on fees if tracked separately
      addOns: 0,
      other: 0,
      total: 0,
    }
    revenue.total = revenue.ticketSales + revenue.fees + revenue.addOns + revenue.other

    // Calculate deductions
    const deductions = {
      refunds: transactions
        .filter((t) => t.type === 'refund' || t.type === 'partial_refund')
        .reduce((sum, t) => sum + t.amount, 0),
      chargebacks: transactions
        .filter((t) => t.type === 'chargeback')
        .reduce((sum, t) => sum + t.amount, 0),
      gatewayFees: transactions.reduce((sum, t) => sum + t.gatewayFee, 0),
      platformFees: transactions.reduce((sum, t) => sum + t.platformFee, 0),
      taxes: 0, // Calculate based on tax rules
      total: 0,
    }
    deductions.total =
      deductions.refunds +
      deductions.chargebacks +
      deductions.gatewayFees +
      deductions.platformFees +
      deductions.taxes

    // Get payouts
    const payouts = await this.getPayouts(promoterId, {
      dateRange: { start: period.start, end: period.end },
    })

    const completedPayouts = payouts
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + p.breakdown.netPayout, 0)

    const pendingPayouts = payouts
      .filter((p) => p.status === 'pending' || p.status === 'processing')
      .reduce((sum, p) => sum + p.breakdown.netPayout, 0)

    // Event breakdown
    const eventTotals: Record<string, { revenue: number; deductions: number }> = {}
    transactions.forEach((t) => {
      if (!eventTotals[t.eventId]) {
        eventTotals[t.eventId] = { revenue: 0, deductions: 0 }
      }
      if (t.type === 'sale') {
        eventTotals[t.eventId].revenue += t.amount
      } else if (t.type === 'refund' || t.type === 'partial_refund' || t.type === 'chargeback') {
        eventTotals[t.eventId].deductions += t.amount
      }
      eventTotals[t.eventId].deductions += t.gatewayFee + t.platformFee
    })

    // Get event names
    const eventBreakdown: FinancialStatement['eventBreakdown'] = []
    for (const [eventId, totals] of Object.entries(eventTotals)) {
      const eventDoc = await getDoc(doc(db, 'events', eventId))
      eventBreakdown.push({
        eventId,
        eventName: eventDoc.exists() ? eventDoc.data().name : 'Unknown Event',
        revenue: totals.revenue,
        deductions: totals.deductions,
        net: totals.revenue - totals.deductions,
      })
    }

    const statement: Omit<FinancialStatement, 'id'> = {
      promoterId,
      period,
      revenue,
      deductions,
      netRevenue: revenue.total - deductions.total,
      payouts: {
        completed: completedPayouts,
        pending: pendingPayouts,
      },
      accountsReceivable: revenue.total - deductions.total - completedPayouts - pendingPayouts,
      eventBreakdown: eventBreakdown.sort((a, b) => b.net - a.net),
      createdAt: new Date(),
    }

    const docRef = await addDoc(collection(db, 'financialStatements'), {
      ...statement,
      period: {
        ...period,
        start: Timestamp.fromDate(period.start),
        end: Timestamp.fromDate(period.end),
      },
      createdAt: Timestamp.fromDate(new Date()),
    })

    await this.auditService.logActivity({
      userId,
      action: 'generate',
      resourceType: 'financial_statement',
      resourceId: docRef.id,
      details: { period, netRevenue: statement.netRevenue },
      ipAddress: '',
      userAgent: '',
    })

    return { id: docRef.id, ...statement }
  }

  async getFinancialStatements(promoterId: string): Promise<FinancialStatement[]> {
    const q = query(
      collection(db, 'financialStatements'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      period: {
        ...doc.data().period,
        start: doc.data().period?.start?.toDate(),
        end: doc.data().period?.end?.toDate(),
      },
      createdAt: doc.data().createdAt?.toDate(),
    })) as FinancialStatement[]
  }

  // ==================== TAX RECORDS ====================

  async generateTaxRecord(
    promoterId: string,
    year: number,
    userId: string
  ): Promise<TaxRecord> {
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31, 23, 59, 59)

    const { transactions } = await this.getTransactions(promoterId, {
      dateRange: { start: startOfYear, end: endOfYear },
    })

    const totalRevenue = transactions
      .filter((t) => t.type === 'sale')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalRefunds = transactions
      .filter((t) => t.type === 'refund' || t.type === 'partial_refund')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalFees = transactions.reduce(
      (sum, t) => sum + t.gatewayFee + t.platformFee,
      0
    )

    const netIncome = totalRevenue - totalRefunds - totalFees

    const taxRecord: Omit<TaxRecord, 'id'> = {
      promoterId,
      year,
      totalRevenue,
      totalRefunds,
      totalFees,
      netIncome,
      taxableAmount: netIncome, // Simplified; actual calculation would be more complex
      transactions: transactions.map((t) => t.id!),
      form1099Eligible: netIncome >= 600, // IRS threshold
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const docRef = await addDoc(collection(db, 'taxRecords'), {
      ...taxRecord,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    })

    await this.auditService.logActivity({
      userId,
      action: 'generate',
      resourceType: 'tax_record',
      resourceId: docRef.id,
      details: { year, netIncome },
      ipAddress: '',
      userAgent: '',
    })

    return { id: docRef.id, ...taxRecord }
  }

  // ==================== DISPUTES ====================

  async createDispute(
    dispute: Omit<Dispute, 'id' | 'createdAt' | 'updatedAt' | 'evidence'>,
    userId: string
  ): Promise<Dispute> {
    const now = new Date()
    const disputeData = {
      ...dispute,
      evidence: [],
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      deadline: dispute.deadline ? Timestamp.fromDate(dispute.deadline) : null,
    }

    const docRef = await addDoc(collection(db, 'paymentDisputes'), disputeData)

    // Update transaction status
    await updateDoc(doc(db, 'paymentTransactions', dispute.transactionId), {
      status: 'disputed',
    })

    await this.auditService.logActivity({
      userId,
      action: 'create',
      resourceType: 'dispute',
      resourceId: docRef.id,
      details: { type: dispute.type, amount: dispute.amount },
      ipAddress: '',
      userAgent: '',
    })

    return {
      id: docRef.id,
      ...dispute,
      evidence: [],
      createdAt: now,
      updatedAt: now,
    }
  }

  async getDisputes(
    promoterId: string,
    filters?: {
      status?: Dispute['status'][]
      type?: Dispute['type'][]
    }
  ): Promise<Dispute[]> {
    let q = query(
      collection(db, 'paymentDisputes'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    let disputes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      deadline: doc.data().deadline?.toDate(),
      evidence: (doc.data().evidence || []).map((e: any) => ({
        ...e,
        uploadedAt: e.uploadedAt?.toDate(),
      })),
      outcome: doc.data().outcome
        ? {
            ...doc.data().outcome,
            resolvedAt: doc.data().outcome.resolvedAt?.toDate(),
          }
        : undefined,
    })) as Dispute[]

    if (filters?.status?.length) {
      disputes = disputes.filter((d) => filters.status!.includes(d.status))
    }

    if (filters?.type?.length) {
      disputes = disputes.filter((d) => filters.type!.includes(d.type))
    }

    return disputes
  }

  async addDisputeEvidence(
    disputeId: string,
    evidence: { type: string; url: string },
    userId: string
  ): Promise<void> {
    const disputeRef = doc(db, 'paymentDisputes', disputeId)
    const disputeDoc = await getDoc(disputeRef)

    if (!disputeDoc.exists()) {
      throw new Error('Dispute not found')
    }

    const currentEvidence = disputeDoc.data().evidence || []
    await updateDoc(disputeRef, {
      evidence: [
        ...currentEvidence,
        {
          ...evidence,
          uploadedAt: Timestamp.fromDate(new Date()),
        },
      ],
      status: 'under_review',
      updatedAt: Timestamp.fromDate(new Date()),
    })

    await this.auditService.logActivity({
      userId,
      action: 'add_evidence',
      resourceType: 'dispute',
      resourceId: disputeId,
      details: { evidenceType: evidence.type },
      ipAddress: '',
      userAgent: '',
    })
  }

  async resolveDispute(
    disputeId: string,
    outcome: { result: 'won' | 'lost'; reason: string },
    userId: string
  ): Promise<void> {
    const disputeRef = doc(db, 'paymentDisputes', disputeId)
    const disputeDoc = await getDoc(disputeRef)

    if (!disputeDoc.exists()) {
      throw new Error('Dispute not found')
    }

    const dispute = disputeDoc.data()

    await updateDoc(disputeRef, {
      status: outcome.result,
      outcome: {
        ...outcome,
        resolvedAt: Timestamp.fromDate(new Date()),
      },
      updatedAt: Timestamp.fromDate(new Date()),
    })

    // Update transaction based on outcome
    if (outcome.result === 'lost') {
      // Record chargeback
      await this.recordTransaction({
        promoterId: dispute.promoterId,
        orderId: dispute.orderId,
        eventId: '', // Get from original transaction
        customerId: '', // Get from original transaction
        type: 'chargeback',
        amount: dispute.amount,
        currency: dispute.currency,
        paymentGateway: 'stripe', // Get from original transaction
        gatewayTransactionId: `chargeback-${disputeId}`,
        gatewayFee: 15, // Typical chargeback fee
        platformFee: 0,
        netAmount: -(dispute.amount + 15),
        status: 'completed',
        metadata: {
          refundReason: `Dispute lost: ${outcome.reason}`,
        },
      })
    }

    await this.auditService.logActivity({
      userId,
      action: 'resolve',
      resourceType: 'dispute',
      resourceId: disputeId,
      details: outcome,
      ipAddress: '',
      userAgent: '',
    })
  }

  // ==================== DASHBOARD METRICS ====================

  async getFinancialDashboard(
    promoterId: string
  ): Promise<{
    today: { sales: number; refunds: number; net: number }
    thisMonth: { sales: number; refunds: number; net: number; trend: number }
    pendingPayout: number
    openDisputes: number
    recentTransactions: PaymentTransaction[]
    revenueByGateway: { gateway: string; amount: number }[]
  }> {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Get transactions
    const { transactions: allTransactions } = await this.getTransactions(promoterId)

    // Today's transactions
    const todayTransactions = allTransactions.filter((t) => t.createdAt >= startOfToday)
    const todaySales = todayTransactions
      .filter((t) => t.type === 'sale')
      .reduce((sum, t) => sum + t.amount, 0)
    const todayRefunds = todayTransactions
      .filter((t) => t.type === 'refund' || t.type === 'partial_refund')
      .reduce((sum, t) => sum + t.amount, 0)

    // This month's transactions
    const monthTransactions = allTransactions.filter((t) => t.createdAt >= startOfMonth)
    const monthSales = monthTransactions
      .filter((t) => t.type === 'sale')
      .reduce((sum, t) => sum + t.amount, 0)
    const monthRefunds = monthTransactions
      .filter((t) => t.type === 'refund' || t.type === 'partial_refund')
      .reduce((sum, t) => sum + t.amount, 0)

    // Last month's transactions for trend
    const lastMonthTransactions = allTransactions.filter(
      (t) => t.createdAt >= startOfLastMonth && t.createdAt <= endOfLastMonth
    )
    const lastMonthNet =
      lastMonthTransactions
        .filter((t) => t.type === 'sale')
        .reduce((sum, t) => sum + t.amount, 0) -
      lastMonthTransactions
        .filter((t) => t.type === 'refund' || t.type === 'partial_refund')
        .reduce((sum, t) => sum + t.amount, 0)

    const monthNet = monthSales - monthRefunds
    const trend = lastMonthNet > 0 ? ((monthNet - lastMonthNet) / lastMonthNet) * 100 : 0

    // Pending payout
    const pendingPayoutInfo = await this.calculatePendingPayout(promoterId)

    // Open disputes
    const disputes = await this.getDisputes(promoterId, { status: ['open', 'under_review'] })

    // Revenue by gateway
    const gatewayTotals: Record<string, number> = {}
    allTransactions
      .filter((t) => t.type === 'sale')
      .forEach((t) => {
        gatewayTotals[t.paymentGateway] = (gatewayTotals[t.paymentGateway] || 0) + t.amount
      })

    return {
      today: {
        sales: todaySales,
        refunds: todayRefunds,
        net: todaySales - todayRefunds,
      },
      thisMonth: {
        sales: monthSales,
        refunds: monthRefunds,
        net: monthNet,
        trend,
      },
      pendingPayout: pendingPayoutInfo.available,
      openDisputes: disputes.length,
      recentTransactions: allTransactions.slice(0, 10),
      revenueByGateway: Object.entries(gatewayTotals).map(([gateway, amount]) => ({
        gateway,
        amount,
      })),
    }
  }
}

export const PaymentReconciliationService = new PaymentReconciliationServiceClass()
