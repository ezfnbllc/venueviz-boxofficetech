/**
 * Subscription & Recurring Revenue Model Service
 * Season passes, memberships, and recurring billing
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
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AuditService } from './auditService'

// ==================== TYPES ====================

export interface SubscriptionPlan {
  id?: string
  promoterId: string
  name: string
  description: string
  type: 'season_pass' | 'membership' | 'ticket_bundle' | 'vip_club'
  billingCycle: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'one_time'
  price: number
  currency: string
  benefits: PlanBenefit[]
  ticketAllowance?: {
    ticketsPerPeriod: number
    rolloverEnabled: boolean
    maxRollover?: number
  }
  earlyAccess?: {
    enabled: boolean
    daysBeforePublic: number
  }
  seatReservation?: {
    enabled: boolean
    reservedSections: string[]
  }
  discounts: {
    ticketDiscount?: number // percentage
    merchandiseDiscount?: number
    foodBeverageDiscount?: number
  }
  trialConfig?: {
    enabled: boolean
    durationDays: number
  }
  status: 'active' | 'inactive' | 'archived'
  maxSubscribers?: number
  currentSubscribers: number
  renewalConfig: {
    autoRenew: boolean
    reminderDays: number[]
    gracePeriodDays: number
  }
  createdAt: Date
  updatedAt: Date
}

export interface PlanBenefit {
  type: 'tickets' | 'discount' | 'early_access' | 'reserved_seating' | 'vip_lounge' |
        'parking' | 'merchandise' | 'meet_greet' | 'exclusive_events' | 'custom'
  description: string
  value?: any
}

export interface Subscription {
  id?: string
  promoterId: string
  planId: string
  customerId: string
  status: 'trial' | 'active' | 'paused' | 'past_due' | 'cancelled' | 'expired'
  billing: {
    amount: number
    currency: string
    cycle: SubscriptionPlan['billingCycle']
    nextBillingDate: Date
    lastBillingDate?: Date
    paymentMethodId?: string
  }
  usage: {
    ticketsUsed: number
    ticketsRemaining: number
    ticketsRolledOver: number
    periodStart: Date
    periodEnd: Date
  }
  trial?: {
    startDate: Date
    endDate: Date
  }
  pauseConfig?: {
    pausedAt: Date
    resumeAt: Date
    reason: string
  }
  cancellation?: {
    requestedAt: Date
    effectiveAt: Date
    reason: string
    feedback?: string
  }
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface SubscriptionInvoice {
  id?: string
  subscriptionId: string
  promoterId: string
  customerId: string
  amount: number
  currency: string
  status: 'draft' | 'open' | 'paid' | 'failed' | 'void' | 'uncollectible'
  periodStart: Date
  periodEnd: Date
  dueDate: Date
  paidAt?: Date
  paymentIntentId?: string
  failureReason?: string
  retryCount: number
  items: {
    description: string
    amount: number
    quantity: number
  }[]
  createdAt: Date
}

export interface SubscriptionUsage {
  id?: string
  subscriptionId: string
  type: 'ticket_redemption' | 'benefit_usage'
  benefitType?: string
  eventId?: string
  ticketCount?: number
  description: string
  usedAt: Date
}

export interface FamilyPlan {
  id?: string
  promoterId: string
  primarySubscriptionId: string
  primaryCustomerId: string
  members: {
    customerId: string
    name: string
    relationship: 'spouse' | 'child' | 'parent' | 'other'
    addedAt: Date
  }[]
  maxMembers: number
  status: 'active' | 'inactive'
  createdAt: Date
  updatedAt: Date
}

// ==================== SERVICE ====================

class SubscriptionServiceClass {
  private auditService: AuditService

  constructor() {
    this.auditService = new AuditService()
  }

  // ==================== PLAN MANAGEMENT ====================

  async createPlan(
    plan: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt' | 'currentSubscribers'>,
    userId: string
  ): Promise<SubscriptionPlan> {
    const now = new Date()
    const planData = {
      ...plan,
      currentSubscribers: 0,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    }

    const docRef = await addDoc(collection(db, 'subscriptionPlans'), planData)

    await this.auditService.logActivity({
      userId,
      action: 'create',
      resourceType: 'subscription_plan',
      resourceId: docRef.id,
      details: { planName: plan.name, type: plan.type },
      ipAddress: '',
      userAgent: '',
    })

    return {
      id: docRef.id,
      ...plan,
      currentSubscribers: 0,
      createdAt: now,
      updatedAt: now,
    }
  }

  async getPlan(planId: string): Promise<SubscriptionPlan | null> {
    const docSnap = await getDoc(doc(db, 'subscriptionPlans', planId))
    if (!docSnap.exists()) return null

    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as SubscriptionPlan
  }

  async getPlans(
    promoterId: string,
    filters?: {
      status?: SubscriptionPlan['status']
      type?: SubscriptionPlan['type']
    }
  ): Promise<SubscriptionPlan[]> {
    let q = query(
      collection(db, 'subscriptionPlans'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    let plans = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as SubscriptionPlan[]

    if (filters?.status) {
      plans = plans.filter((p) => p.status === filters.status)
    }
    if (filters?.type) {
      plans = plans.filter((p) => p.type === filters.type)
    }

    return plans
  }

  async updatePlan(
    planId: string,
    updates: Partial<SubscriptionPlan>,
    userId: string
  ): Promise<void> {
    await updateDoc(doc(db, 'subscriptionPlans', planId), {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    })

    await this.auditService.logActivity({
      userId,
      action: 'update',
      resourceType: 'subscription_plan',
      resourceId: planId,
      details: { updates: Object.keys(updates) },
      ipAddress: '',
      userAgent: '',
    })
  }

  // ==================== SUBSCRIPTION MANAGEMENT ====================

  async createSubscription(
    data: {
      promoterId: string
      planId: string
      customerId: string
      paymentMethodId?: string
      startTrial?: boolean
    },
    userId: string
  ): Promise<Subscription> {
    const plan = await this.getPlan(data.planId)
    if (!plan) throw new Error('Plan not found')

    if (plan.status !== 'active') {
      throw new Error('Plan is not active')
    }

    if (plan.maxSubscribers && plan.currentSubscribers >= plan.maxSubscribers) {
      throw new Error('Plan has reached maximum subscribers')
    }

    // Check for existing active subscription
    const existingQuery = query(
      collection(db, 'subscriptions'),
      where('promoterId', '==', data.promoterId),
      where('customerId', '==', data.customerId),
      where('planId', '==', data.planId),
      where('status', 'in', ['active', 'trial', 'paused'])
    )
    const existing = await getDocs(existingQuery)
    if (!existing.empty) {
      throw new Error('Customer already has an active subscription to this plan')
    }

    const now = new Date()
    const periodStart = now
    const periodEnd = this.calculatePeriodEnd(now, plan.billingCycle)

    let status: Subscription['status'] = 'active'
    let trial: Subscription['trial'] | undefined

    if (data.startTrial && plan.trialConfig?.enabled) {
      status = 'trial'
      const trialEnd = new Date(now)
      trialEnd.setDate(trialEnd.getDate() + plan.trialConfig.durationDays)
      trial = {
        startDate: now,
        endDate: trialEnd,
      }
    }

    const subscriptionData: Omit<Subscription, 'id'> = {
      promoterId: data.promoterId,
      planId: data.planId,
      customerId: data.customerId,
      status,
      billing: {
        amount: plan.price,
        currency: plan.currency,
        cycle: plan.billingCycle,
        nextBillingDate: trial ? trial.endDate : now,
        paymentMethodId: data.paymentMethodId,
      },
      usage: {
        ticketsUsed: 0,
        ticketsRemaining: plan.ticketAllowance?.ticketsPerPeriod || 0,
        ticketsRolledOver: 0,
        periodStart,
        periodEnd,
      },
      trial,
      createdAt: now,
      updatedAt: now,
    }

    const docRef = await addDoc(collection(db, 'subscriptions'), {
      ...subscriptionData,
      billing: {
        ...subscriptionData.billing,
        nextBillingDate: Timestamp.fromDate(subscriptionData.billing.nextBillingDate),
      },
      usage: {
        ...subscriptionData.usage,
        periodStart: Timestamp.fromDate(periodStart),
        periodEnd: Timestamp.fromDate(periodEnd),
      },
      trial: trial ? {
        startDate: Timestamp.fromDate(trial.startDate),
        endDate: Timestamp.fromDate(trial.endDate),
      } : null,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    })

    // Update plan subscriber count
    await updateDoc(doc(db, 'subscriptionPlans', data.planId), {
      currentSubscribers: increment(1),
    })

    // Create initial invoice if not trial
    if (status !== 'trial') {
      await this.createInvoice(docRef.id, subscriptionData, plan)
    }

    await this.auditService.logActivity({
      userId,
      action: 'create',
      resourceType: 'subscription',
      resourceId: docRef.id,
      details: { planId: data.planId, status },
      ipAddress: '',
      userAgent: '',
    })

    return { id: docRef.id, ...subscriptionData }
  }

  private calculatePeriodEnd(start: Date, cycle: SubscriptionPlan['billingCycle']): Date {
    const end = new Date(start)
    switch (cycle) {
      case 'monthly':
        end.setMonth(end.getMonth() + 1)
        break
      case 'quarterly':
        end.setMonth(end.getMonth() + 3)
        break
      case 'semi_annual':
        end.setMonth(end.getMonth() + 6)
        break
      case 'annual':
        end.setFullYear(end.getFullYear() + 1)
        break
      case 'one_time':
        end.setFullYear(end.getFullYear() + 100) // Effectively never
        break
    }
    return end
  }

  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    const docSnap = await getDoc(doc(db, 'subscriptions', subscriptionId))
    if (!docSnap.exists()) return null

    return this.mapSubscription(docSnap)
  }

  async getCustomerSubscriptions(
    promoterId: string,
    customerId: string,
    activeOnly: boolean = true
  ): Promise<Subscription[]> {
    let q = query(
      collection(db, 'subscriptions'),
      where('promoterId', '==', promoterId),
      where('customerId', '==', customerId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    let subscriptions = snapshot.docs.map((doc) => this.mapSubscription(doc))

    if (activeOnly) {
      subscriptions = subscriptions.filter((s) =>
        ['active', 'trial', 'paused'].includes(s.status)
      )
    }

    return subscriptions
  }

  private mapSubscription(docSnap: any): Subscription {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      billing: {
        ...data.billing,
        nextBillingDate: data.billing.nextBillingDate?.toDate(),
        lastBillingDate: data.billing.lastBillingDate?.toDate(),
      },
      usage: {
        ...data.usage,
        periodStart: data.usage.periodStart?.toDate(),
        periodEnd: data.usage.periodEnd?.toDate(),
      },
      trial: data.trial ? {
        startDate: data.trial.startDate?.toDate(),
        endDate: data.trial.endDate?.toDate(),
      } : undefined,
      pauseConfig: data.pauseConfig ? {
        ...data.pauseConfig,
        pausedAt: data.pauseConfig.pausedAt?.toDate(),
        resumeAt: data.pauseConfig.resumeAt?.toDate(),
      } : undefined,
      cancellation: data.cancellation ? {
        ...data.cancellation,
        requestedAt: data.cancellation.requestedAt?.toDate(),
        effectiveAt: data.cancellation.effectiveAt?.toDate(),
      } : undefined,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    }
  }

  // ==================== SUBSCRIPTION LIFECYCLE ====================

  async pauseSubscription(
    subscriptionId: string,
    resumeAt: Date,
    reason: string,
    userId: string
  ): Promise<void> {
    const subscription = await this.getSubscription(subscriptionId)
    if (!subscription) throw new Error('Subscription not found')

    if (!['active', 'trial'].includes(subscription.status)) {
      throw new Error('Can only pause active subscriptions')
    }

    await updateDoc(doc(db, 'subscriptions', subscriptionId), {
      status: 'paused',
      pauseConfig: {
        pausedAt: Timestamp.fromDate(new Date()),
        resumeAt: Timestamp.fromDate(resumeAt),
        reason,
      },
      updatedAt: Timestamp.fromDate(new Date()),
    })

    await this.auditService.logActivity({
      userId,
      action: 'pause',
      resourceType: 'subscription',
      resourceId: subscriptionId,
      details: { reason, resumeAt },
      ipAddress: '',
      userAgent: '',
    })
  }

  async resumeSubscription(subscriptionId: string, userId: string): Promise<void> {
    const subscription = await this.getSubscription(subscriptionId)
    if (!subscription) throw new Error('Subscription not found')

    if (subscription.status !== 'paused') {
      throw new Error('Subscription is not paused')
    }

    await updateDoc(doc(db, 'subscriptions', subscriptionId), {
      status: 'active',
      pauseConfig: null,
      updatedAt: Timestamp.fromDate(new Date()),
    })

    await this.auditService.logActivity({
      userId,
      action: 'resume',
      resourceType: 'subscription',
      resourceId: subscriptionId,
      details: {},
      ipAddress: '',
      userAgent: '',
    })
  }

  async cancelSubscription(
    subscriptionId: string,
    reason: string,
    immediate: boolean,
    feedback?: string,
    userId?: string
  ): Promise<void> {
    const subscription = await this.getSubscription(subscriptionId)
    if (!subscription) throw new Error('Subscription not found')

    const now = new Date()
    const effectiveAt = immediate ? now : subscription.usage.periodEnd

    await updateDoc(doc(db, 'subscriptions', subscriptionId), {
      status: immediate ? 'cancelled' : subscription.status,
      cancellation: {
        requestedAt: Timestamp.fromDate(now),
        effectiveAt: Timestamp.fromDate(effectiveAt),
        reason,
        feedback,
      },
      updatedAt: Timestamp.fromDate(now),
    })

    // Update plan subscriber count if immediate
    if (immediate) {
      await updateDoc(doc(db, 'subscriptionPlans', subscription.planId), {
        currentSubscribers: increment(-1),
      })
    }

    await this.auditService.logActivity({
      userId: userId || 'system',
      action: 'cancel',
      resourceType: 'subscription',
      resourceId: subscriptionId,
      details: { reason, immediate, effectiveAt },
      ipAddress: '',
      userAgent: '',
    })
  }

  async reactivateSubscription(subscriptionId: string, userId: string): Promise<void> {
    const subscription = await this.getSubscription(subscriptionId)
    if (!subscription) throw new Error('Subscription not found')

    if (subscription.status !== 'cancelled') {
      throw new Error('Can only reactivate cancelled subscriptions')
    }

    // Check if within grace period or still valid
    const plan = await this.getPlan(subscription.planId)
    if (!plan) throw new Error('Plan not found')

    await updateDoc(doc(db, 'subscriptions', subscriptionId), {
      status: 'active',
      cancellation: null,
      updatedAt: Timestamp.fromDate(new Date()),
    })

    await updateDoc(doc(db, 'subscriptionPlans', subscription.planId), {
      currentSubscribers: increment(1),
    })

    await this.auditService.logActivity({
      userId,
      action: 'reactivate',
      resourceType: 'subscription',
      resourceId: subscriptionId,
      details: {},
      ipAddress: '',
      userAgent: '',
    })
  }

  // ==================== BILLING ====================

  async createInvoice(
    subscriptionId: string,
    subscription: Subscription,
    plan: SubscriptionPlan
  ): Promise<SubscriptionInvoice> {
    const now = new Date()
    const dueDate = new Date(now)
    dueDate.setDate(dueDate.getDate() + 7)

    const invoiceData: Omit<SubscriptionInvoice, 'id'> = {
      subscriptionId,
      promoterId: subscription.promoterId,
      customerId: subscription.customerId,
      amount: subscription.billing.amount,
      currency: subscription.billing.currency,
      status: 'open',
      periodStart: subscription.usage.periodStart,
      periodEnd: subscription.usage.periodEnd,
      dueDate,
      retryCount: 0,
      items: [{
        description: `${plan.name} - ${subscription.billing.cycle} subscription`,
        amount: subscription.billing.amount,
        quantity: 1,
      }],
      createdAt: now,
    }

    const docRef = await addDoc(collection(db, 'subscriptionInvoices'), {
      ...invoiceData,
      periodStart: Timestamp.fromDate(subscription.usage.periodStart),
      periodEnd: Timestamp.fromDate(subscription.usage.periodEnd),
      dueDate: Timestamp.fromDate(dueDate),
      createdAt: Timestamp.fromDate(now),
    })

    return { id: docRef.id, ...invoiceData }
  }

  async getInvoices(
    subscriptionId?: string,
    customerId?: string,
    status?: SubscriptionInvoice['status'][]
  ): Promise<SubscriptionInvoice[]> {
    let q = query(
      collection(db, 'subscriptionInvoices'),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    let invoices = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      periodStart: doc.data().periodStart?.toDate(),
      periodEnd: doc.data().periodEnd?.toDate(),
      dueDate: doc.data().dueDate?.toDate(),
      paidAt: doc.data().paidAt?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as SubscriptionInvoice[]

    if (subscriptionId) {
      invoices = invoices.filter((i) => i.subscriptionId === subscriptionId)
    }
    if (customerId) {
      invoices = invoices.filter((i) => i.customerId === customerId)
    }
    if (status?.length) {
      invoices = invoices.filter((i) => status.includes(i.status))
    }

    return invoices
  }

  async processInvoicePayment(
    invoiceId: string,
    paymentIntentId: string
  ): Promise<void> {
    const invoiceDoc = await getDoc(doc(db, 'subscriptionInvoices', invoiceId))
    if (!invoiceDoc.exists()) throw new Error('Invoice not found')

    const invoice = invoiceDoc.data() as SubscriptionInvoice

    await updateDoc(doc(db, 'subscriptionInvoices', invoiceId), {
      status: 'paid',
      paidAt: Timestamp.fromDate(new Date()),
      paymentIntentId,
    })

    // Update subscription
    const subscription = await this.getSubscription(invoice.subscriptionId)
    if (subscription) {
      const nextBillingDate = this.calculatePeriodEnd(new Date(), subscription.billing.cycle)
      const newPeriodEnd = nextBillingDate

      await updateDoc(doc(db, 'subscriptions', invoice.subscriptionId), {
        status: 'active',
        'billing.lastBillingDate': Timestamp.fromDate(new Date()),
        'billing.nextBillingDate': Timestamp.fromDate(nextBillingDate),
        'usage.periodEnd': Timestamp.fromDate(newPeriodEnd),
        updatedAt: Timestamp.fromDate(new Date()),
      })
    }
  }

  async handlePaymentFailure(invoiceId: string, reason: string): Promise<void> {
    const invoiceDoc = await getDoc(doc(db, 'subscriptionInvoices', invoiceId))
    if (!invoiceDoc.exists()) throw new Error('Invoice not found')

    const invoice = invoiceDoc.data() as SubscriptionInvoice

    await updateDoc(doc(db, 'subscriptionInvoices', invoiceId), {
      status: invoice.retryCount >= 3 ? 'uncollectible' : 'failed',
      failureReason: reason,
      retryCount: increment(1),
    })

    // Update subscription status if max retries exceeded
    if (invoice.retryCount >= 3) {
      await updateDoc(doc(db, 'subscriptions', invoice.subscriptionId), {
        status: 'past_due',
        updatedAt: Timestamp.fromDate(new Date()),
      })
    }
  }

  // ==================== TICKET USAGE ====================

  async useTickets(
    subscriptionId: string,
    eventId: string,
    ticketCount: number,
    userId: string
  ): Promise<{ success: boolean; remainingTickets: number }> {
    const subscription = await this.getSubscription(subscriptionId)
    if (!subscription) throw new Error('Subscription not found')

    if (!['active', 'trial'].includes(subscription.status)) {
      throw new Error('Subscription is not active')
    }

    if (subscription.usage.ticketsRemaining < ticketCount) {
      throw new Error('Insufficient ticket allowance')
    }

    // Record usage
    await addDoc(collection(db, 'subscriptionUsage'), {
      subscriptionId,
      type: 'ticket_redemption',
      eventId,
      ticketCount,
      description: `Redeemed ${ticketCount} tickets for event ${eventId}`,
      usedAt: Timestamp.fromDate(new Date()),
    })

    // Update remaining tickets
    const remaining = subscription.usage.ticketsRemaining - ticketCount
    await updateDoc(doc(db, 'subscriptions', subscriptionId), {
      'usage.ticketsUsed': increment(ticketCount),
      'usage.ticketsRemaining': remaining,
      updatedAt: Timestamp.fromDate(new Date()),
    })

    await this.auditService.logActivity({
      userId,
      action: 'use_tickets',
      resourceType: 'subscription',
      resourceId: subscriptionId,
      details: { eventId, ticketCount, remaining },
      ipAddress: '',
      userAgent: '',
    })

    return { success: true, remainingTickets: remaining }
  }

  async getUsageHistory(subscriptionId: string): Promise<SubscriptionUsage[]> {
    const q = query(
      collection(db, 'subscriptionUsage'),
      where('subscriptionId', '==', subscriptionId),
      orderBy('usedAt', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      usedAt: doc.data().usedAt?.toDate(),
    })) as SubscriptionUsage[]
  }

  // ==================== PERIOD RENEWAL ====================

  async processRenewals(): Promise<{ processed: number; failed: number }> {
    const now = new Date()
    const q = query(
      collection(db, 'subscriptions'),
      where('status', '==', 'active'),
      where('billing.nextBillingDate', '<=', Timestamp.fromDate(now))
    )

    const snapshot = await getDocs(q)
    let processed = 0
    let failed = 0

    for (const docSnapshot of snapshot.docs) {
      const subscription = this.mapSubscription(docSnapshot)
      const plan = await this.getPlan(subscription.planId)

      if (!plan || plan.billingCycle === 'one_time') continue

      try {
        // Handle ticket rollover
        let rolledOver = 0
        if (plan.ticketAllowance?.rolloverEnabled && subscription.usage.ticketsRemaining > 0) {
          rolledOver = Math.min(
            subscription.usage.ticketsRemaining,
            plan.ticketAllowance.maxRollover || subscription.usage.ticketsRemaining
          )
        }

        // Reset usage for new period
        const newPeriodStart = now
        const newPeriodEnd = this.calculatePeriodEnd(now, subscription.billing.cycle)

        await updateDoc(doc(db, 'subscriptions', subscription.id!), {
          'usage.ticketsUsed': 0,
          'usage.ticketsRemaining': (plan.ticketAllowance?.ticketsPerPeriod || 0) + rolledOver,
          'usage.ticketsRolledOver': rolledOver,
          'usage.periodStart': Timestamp.fromDate(newPeriodStart),
          'usage.periodEnd': Timestamp.fromDate(newPeriodEnd),
          updatedAt: Timestamp.fromDate(now),
        })

        // Create invoice
        const updatedSubscription = await this.getSubscription(subscription.id!)
        if (updatedSubscription) {
          await this.createInvoice(subscription.id!, updatedSubscription, plan)
        }

        processed++
      } catch (error) {
        failed++
        console.error(`Failed to process renewal for ${subscription.id}:`, error)
      }
    }

    return { processed, failed }
  }

  // ==================== FAMILY PLANS ====================

  async createFamilyPlan(
    data: {
      promoterId: string
      subscriptionId: string
      customerId: string
      maxMembers: number
    }
  ): Promise<FamilyPlan> {
    const now = new Date()
    const familyPlanData: Omit<FamilyPlan, 'id'> = {
      promoterId: data.promoterId,
      primarySubscriptionId: data.subscriptionId,
      primaryCustomerId: data.customerId,
      members: [],
      maxMembers: data.maxMembers,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }

    const docRef = await addDoc(collection(db, 'familyPlans'), {
      ...familyPlanData,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    })

    return { id: docRef.id, ...familyPlanData }
  }

  async addFamilyMember(
    familyPlanId: string,
    member: FamilyPlan['members'][0]
  ): Promise<void> {
    const familyPlanDoc = await getDoc(doc(db, 'familyPlans', familyPlanId))
    if (!familyPlanDoc.exists()) throw new Error('Family plan not found')

    const familyPlan = familyPlanDoc.data() as FamilyPlan
    if (familyPlan.members.length >= familyPlan.maxMembers) {
      throw new Error('Family plan has reached maximum members')
    }

    await updateDoc(doc(db, 'familyPlans', familyPlanId), {
      members: [...familyPlan.members, { ...member, addedAt: Timestamp.fromDate(new Date()) }],
      updatedAt: Timestamp.fromDate(new Date()),
    })
  }

  async removeFamilyMember(familyPlanId: string, customerId: string): Promise<void> {
    const familyPlanDoc = await getDoc(doc(db, 'familyPlans', familyPlanId))
    if (!familyPlanDoc.exists()) throw new Error('Family plan not found')

    const familyPlan = familyPlanDoc.data() as FamilyPlan
    const updatedMembers = familyPlan.members.filter((m: any) => m.customerId !== customerId)

    await updateDoc(doc(db, 'familyPlans', familyPlanId), {
      members: updatedMembers,
      updatedAt: Timestamp.fromDate(new Date()),
    })
  }

  // ==================== ANALYTICS ====================

  async getSubscriptionMetrics(
    promoterId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<{
    totalActive: number
    newSubscriptions: number
    cancelled: number
    churned: number
    mrr: number
    arr: number
    averageLifetimeMonths: number
    planBreakdown: { planId: string; planName: string; count: number; revenue: number }[]
  }> {
    const subscriptionsQuery = query(
      collection(db, 'subscriptions'),
      where('promoterId', '==', promoterId)
    )

    const snapshot = await getDocs(subscriptionsQuery)
    const subscriptions = snapshot.docs.map((doc) => this.mapSubscription(doc))

    const activeSubscriptions = subscriptions.filter((s) =>
      ['active', 'trial'].includes(s.status)
    )

    const newInPeriod = subscriptions.filter((s) =>
      s.createdAt >= dateRange.start && s.createdAt <= dateRange.end
    )

    const cancelledInPeriod = subscriptions.filter((s) =>
      s.cancellation?.requestedAt &&
      s.cancellation.requestedAt >= dateRange.start &&
      s.cancellation.requestedAt <= dateRange.end
    )

    // Calculate MRR
    let mrr = 0
    const planCounts: Record<string, { count: number; revenue: number }> = {}

    for (const sub of activeSubscriptions) {
      const monthlyAmount = this.getMonthlyEquivalent(sub.billing.amount, sub.billing.cycle)
      mrr += monthlyAmount

      if (!planCounts[sub.planId]) {
        planCounts[sub.planId] = { count: 0, revenue: 0 }
      }
      planCounts[sub.planId].count++
      planCounts[sub.planId].revenue += monthlyAmount
    }

    // Get plan names
    const planBreakdown = await Promise.all(
      Object.entries(planCounts).map(async ([planId, data]) => {
        const plan = await this.getPlan(planId)
        return {
          planId,
          planName: plan?.name || 'Unknown',
          count: data.count,
          revenue: data.revenue,
        }
      })
    )

    return {
      totalActive: activeSubscriptions.length,
      newSubscriptions: newInPeriod.length,
      cancelled: cancelledInPeriod.length,
      churned: cancelledInPeriod.length,
      mrr,
      arr: mrr * 12,
      averageLifetimeMonths: this.calculateAverageLifetime(subscriptions),
      planBreakdown,
    }
  }

  private getMonthlyEquivalent(amount: number, cycle: SubscriptionPlan['billingCycle']): number {
    switch (cycle) {
      case 'monthly':
        return amount
      case 'quarterly':
        return amount / 3
      case 'semi_annual':
        return amount / 6
      case 'annual':
        return amount / 12
      case 'one_time':
        return 0
      default:
        return amount
    }
  }

  private calculateAverageLifetime(subscriptions: Subscription[]): number {
    const lifetimes = subscriptions
      .filter((s) => s.createdAt)
      .map((s) => {
        const endDate = s.cancellation?.effectiveAt || new Date()
        const months = (endDate.getTime() - s.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000)
        return months
      })

    if (lifetimes.length === 0) return 0
    return lifetimes.reduce((a, b) => a + b, 0) / lifetimes.length
  }
}

export const SubscriptionService = new SubscriptionServiceClass()
