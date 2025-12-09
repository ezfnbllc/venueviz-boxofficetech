/**
 * Email Campaign & Marketing Automation Service
 * Comprehensive email marketing system for event promotions
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
  limit,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AuditService } from './auditService'
import { CustomerSegmentationService } from './customerSegmentationService'

export interface EmailTemplate {
  id?: string
  promoterId: string
  name: string
  subject: string
  htmlContent: string
  textContent: string
  category: 'promotional' | 'transactional' | 'newsletter' | 'reminder' | 'follow_up'
  variables: string[] // e.g., {{customer_name}}, {{event_name}}
  previewText?: string
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

export interface EmailCampaign {
  id?: string
  promoterId: string
  name: string
  description?: string
  templateId: string
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled'
  targetAudience: {
    type: 'all' | 'segment' | 'custom' | 'event_attendees' | 'past_purchasers'
    segmentIds?: string[]
    eventIds?: string[]
    customFilters?: {
      tags?: string[]
      purchaseHistory?: {
        minPurchases?: number
        maxPurchases?: number
        minSpent?: number
        maxSpent?: number
        lastPurchaseWithinDays?: number
      }
      location?: {
        cities?: string[]
        states?: string[]
        countries?: string[]
      }
    }
    excludeUnsubscribed: boolean
  }
  schedule: {
    type: 'immediate' | 'scheduled' | 'recurring'
    scheduledAt?: Date
    recurringSchedule?: {
      frequency: 'daily' | 'weekly' | 'monthly'
      dayOfWeek?: number // 0-6 for weekly
      dayOfMonth?: number // 1-31 for monthly
      time: string // HH:MM format
    }
    timezone: string
  }
  personalizations: {
    dynamicContent?: {
      fieldName: string
      rules: {
        condition: string
        content: string
      }[]
    }[]
    abTest?: {
      enabled: boolean
      variants: {
        name: string
        subject?: string
        templateId?: string
        percentage: number
      }[]
      winnerCriteria: 'open_rate' | 'click_rate' | 'conversion_rate'
      testDuration: number // hours
    }
  }
  tracking: {
    trackOpens: boolean
    trackClicks: boolean
    utmParameters?: {
      source: string
      medium: string
      campaign: string
      content?: string
    }
  }
  metrics: {
    totalRecipients: number
    sent: number
    delivered: number
    opened: number
    clicked: number
    bounced: number
    unsubscribed: number
    complained: number
    converted: number
    revenue: number
  }
  createdAt: Date
  updatedAt: Date
  sentAt?: Date
  completedAt?: Date
}

export interface EmailSubscriber {
  id?: string
  promoterId: string
  email: string
  customerId?: string
  firstName?: string
  lastName?: string
  tags: string[]
  status: 'subscribed' | 'unsubscribed' | 'bounced' | 'complained'
  subscriptionSource: 'purchase' | 'signup' | 'import' | 'api'
  preferences: {
    frequency: 'all' | 'weekly' | 'monthly' | 'important_only'
    categories: string[]
  }
  engagement: {
    totalSent: number
    totalOpened: number
    totalClicked: number
    lastOpenedAt?: Date
    lastClickedAt?: Date
    engagementScore: number // 0-100
  }
  createdAt: Date
  updatedAt: Date
  unsubscribedAt?: Date
}

export interface EmailSend {
  id?: string
  campaignId: string
  subscriberId: string
  email: string
  status: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'
  sentAt?: Date
  deliveredAt?: Date
  openedAt?: Date
  clickedAt?: Date
  clicks: {
    url: string
    clickedAt: Date
  }[]
  bounceType?: 'soft' | 'hard'
  bounceReason?: string
  variantName?: string // for A/B testing
}

export interface AutomationWorkflow {
  id?: string
  promoterId: string
  name: string
  description?: string
  trigger: {
    type: 'event_purchase' | 'event_signup' | 'abandoned_cart' | 'post_event' | 'birthday' | 'anniversary' | 'inactivity' | 'tag_added'
    config: {
      eventId?: string
      inactivityDays?: number
      tag?: string
      delayMinutes?: number
    }
  }
  steps: {
    id: string
    type: 'email' | 'wait' | 'condition' | 'tag' | 'webhook'
    config: {
      templateId?: string
      waitDuration?: { value: number; unit: 'minutes' | 'hours' | 'days' }
      condition?: {
        field: string
        operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
        value: any
      }
      tagAction?: { action: 'add' | 'remove'; tag: string }
      webhookUrl?: string
    }
    nextStepId?: string
    trueStepId?: string // for conditions
    falseStepId?: string // for conditions
  }[]
  status: 'active' | 'paused' | 'draft'
  stats: {
    totalEnrolled: number
    totalCompleted: number
    totalExited: number
  }
  createdAt: Date
  updatedAt: Date
}

class EmailCampaignServiceClass {
  private auditService: AuditService
  private segmentationService: CustomerSegmentationService

  constructor() {
    this.auditService = new AuditService()
    this.segmentationService = new CustomerSegmentationService()
  }

  // ==================== EMAIL TEMPLATES ====================

  async createTemplate(
    template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<EmailTemplate> {
    const now = new Date()
    const templateData = {
      ...template,
      variables: this.extractVariables(template.htmlContent),
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    }

    const docRef = await addDoc(collection(db, 'emailTemplates'), templateData)

    await this.auditService.logActivity({
      userId,
      action: 'create',
      resourceType: 'email_template',
      resourceId: docRef.id,
      details: { templateName: template.name },
      ipAddress: '',
      userAgent: '',
    })

    return {
      id: docRef.id,
      ...template,
      variables: templateData.variables,
      createdAt: now,
      updatedAt: now,
    }
  }

  private extractVariables(content: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g
    const variables: string[] = []
    let match
    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1].trim())) {
        variables.push(match[1].trim())
      }
    }
    return variables
  }

  async getTemplates(promoterId: string): Promise<EmailTemplate[]> {
    const q = query(
      collection(db, 'emailTemplates'),
      where('promoterId', '==', promoterId),
      where('isActive', '==', true),
      orderBy('updatedAt', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as EmailTemplate[]
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<EmailTemplate>,
    userId: string
  ): Promise<void> {
    const templateRef = doc(db, 'emailTemplates', templateId)

    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }

    if (updates.htmlContent) {
      updateData.variables = this.extractVariables(updates.htmlContent)
    }

    await updateDoc(templateRef, updateData)

    await this.auditService.logActivity({
      userId,
      action: 'update',
      resourceType: 'email_template',
      resourceId: templateId,
      details: { updates: Object.keys(updates) },
      ipAddress: '',
      userAgent: '',
    })
  }

  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    const templateRef = doc(db, 'emailTemplates', templateId)
    await updateDoc(templateRef, { isActive: false, updatedAt: Timestamp.fromDate(new Date()) })

    await this.auditService.logActivity({
      userId,
      action: 'delete',
      resourceType: 'email_template',
      resourceId: templateId,
      details: {},
      ipAddress: '',
      userAgent: '',
    })
  }

  // ==================== EMAIL CAMPAIGNS ====================

  async createCampaign(
    campaign: Omit<EmailCampaign, 'id' | 'createdAt' | 'updatedAt' | 'metrics'>,
    userId: string
  ): Promise<EmailCampaign> {
    const now = new Date()
    const campaignData = {
      ...campaign,
      metrics: {
        totalRecipients: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        unsubscribed: 0,
        complained: 0,
        converted: 0,
        revenue: 0,
      },
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      schedule: {
        ...campaign.schedule,
        scheduledAt: campaign.schedule.scheduledAt
          ? Timestamp.fromDate(campaign.schedule.scheduledAt)
          : null,
      },
    }

    const docRef = await addDoc(collection(db, 'emailCampaigns'), campaignData)

    await this.auditService.logActivity({
      userId,
      action: 'create',
      resourceType: 'email_campaign',
      resourceId: docRef.id,
      details: { campaignName: campaign.name, status: campaign.status },
      ipAddress: '',
      userAgent: '',
    })

    return {
      id: docRef.id,
      ...campaign,
      metrics: campaignData.metrics,
      createdAt: now,
      updatedAt: now,
    }
  }

  async getCampaigns(
    promoterId: string,
    filters?: {
      status?: EmailCampaign['status'][]
      dateRange?: { start: Date; end: Date }
    }
  ): Promise<EmailCampaign[]> {
    let q = query(
      collection(db, 'emailCampaigns'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    let campaigns = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      sentAt: doc.data().sentAt?.toDate(),
      completedAt: doc.data().completedAt?.toDate(),
      schedule: {
        ...doc.data().schedule,
        scheduledAt: doc.data().schedule?.scheduledAt?.toDate(),
      },
    })) as EmailCampaign[]

    if (filters?.status && filters.status.length > 0) {
      campaigns = campaigns.filter((c) => filters.status!.includes(c.status))
    }

    if (filters?.dateRange) {
      campaigns = campaigns.filter((c) => {
        return c.createdAt >= filters.dateRange!.start && c.createdAt <= filters.dateRange!.end
      })
    }

    return campaigns
  }

  async getCampaign(campaignId: string): Promise<EmailCampaign | null> {
    const docSnap = await getDoc(doc(db, 'emailCampaigns', campaignId))
    if (!docSnap.exists()) return null

    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      sentAt: data.sentAt?.toDate(),
      completedAt: data.completedAt?.toDate(),
      schedule: {
        ...data.schedule,
        scheduledAt: data.schedule?.scheduledAt?.toDate(),
      },
    } as EmailCampaign
  }

  async updateCampaign(
    campaignId: string,
    updates: Partial<EmailCampaign>,
    userId: string
  ): Promise<void> {
    const campaignRef = doc(db, 'emailCampaigns', campaignId)

    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }

    if (updates.schedule?.scheduledAt) {
      updateData.schedule = {
        ...updates.schedule,
        scheduledAt: Timestamp.fromDate(updates.schedule.scheduledAt),
      }
    }

    await updateDoc(campaignRef, updateData)

    await this.auditService.logActivity({
      userId,
      action: 'update',
      resourceType: 'email_campaign',
      resourceId: campaignId,
      details: { updates: Object.keys(updates) },
      ipAddress: '',
      userAgent: '',
    })
  }

  async scheduleCampaign(
    campaignId: string,
    scheduledAt: Date,
    userId: string
  ): Promise<void> {
    await this.updateCampaign(
      campaignId,
      {
        status: 'scheduled',
        schedule: {
          type: 'scheduled',
          scheduledAt,
          timezone: 'UTC',
        },
      },
      userId
    )
  }

  async sendCampaignNow(campaignId: string, userId: string): Promise<{ recipientCount: number }> {
    const campaign = await this.getCampaign(campaignId)
    if (!campaign) {
      throw new Error('Campaign not found')
    }

    // Get target subscribers
    const subscribers = await this.getTargetSubscribers(campaign)

    // Update campaign status
    await this.updateCampaign(
      campaignId,
      {
        status: 'sending',
        metrics: {
          ...campaign.metrics,
          totalRecipients: subscribers.length,
        },
      },
      userId
    )

    // Queue emails for sending
    const batch = writeBatch(db)
    const now = new Date()

    for (const subscriber of subscribers) {
      const sendRef = doc(collection(db, 'emailSends'))
      batch.set(sendRef, {
        campaignId,
        subscriberId: subscriber.id,
        email: subscriber.email,
        status: 'queued',
        createdAt: Timestamp.fromDate(now),
      })
    }

    await batch.commit()

    // Mark campaign as sent (in production, this would be done after actual sending)
    await this.updateCampaign(
      campaignId,
      {
        status: 'sent',
        sentAt: now,
        metrics: {
          ...campaign.metrics,
          totalRecipients: subscribers.length,
          sent: subscribers.length,
        },
      },
      userId
    )

    await this.auditService.logActivity({
      userId,
      action: 'send',
      resourceType: 'email_campaign',
      resourceId: campaignId,
      details: { recipientCount: subscribers.length },
      ipAddress: '',
      userAgent: '',
    })

    return { recipientCount: subscribers.length }
  }

  private async getTargetSubscribers(campaign: EmailCampaign): Promise<EmailSubscriber[]> {
    const audience = campaign.targetAudience
    let q = query(
      collection(db, 'emailSubscribers'),
      where('promoterId', '==', campaign.promoterId),
      where('status', '==', 'subscribed')
    )

    const snapshot = await getDocs(q)
    let subscribers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as EmailSubscriber[]

    // Apply segment filters
    if (audience.type === 'segment' && audience.segmentIds?.length) {
      // Get customers in segments
      const segmentCustomers = new Set<string>()
      for (const segmentId of audience.segmentIds) {
        const segmentDoc = await getDoc(doc(db, 'customerSegments', segmentId))
        if (segmentDoc.exists()) {
          const customerIds = segmentDoc.data().customerIds || []
          customerIds.forEach((id: string) => segmentCustomers.add(id))
        }
      }
      subscribers = subscribers.filter(
        (s) => s.customerId && segmentCustomers.has(s.customerId)
      )
    }

    // Apply custom filters
    if (audience.customFilters?.tags?.length) {
      subscribers = subscribers.filter((s) =>
        audience.customFilters!.tags!.some((tag) => s.tags.includes(tag))
      )
    }

    return subscribers
  }

  async pauseCampaign(campaignId: string, userId: string): Promise<void> {
    await this.updateCampaign(campaignId, { status: 'paused' }, userId)
  }

  async cancelCampaign(campaignId: string, userId: string): Promise<void> {
    await this.updateCampaign(campaignId, { status: 'cancelled' }, userId)
  }

  // ==================== SUBSCRIBERS ====================

  async addSubscriber(
    subscriber: Omit<EmailSubscriber, 'id' | 'createdAt' | 'updatedAt' | 'engagement'>,
    userId?: string
  ): Promise<EmailSubscriber> {
    // Check for existing subscriber
    const existingQuery = query(
      collection(db, 'emailSubscribers'),
      where('promoterId', '==', subscriber.promoterId),
      where('email', '==', subscriber.email.toLowerCase())
    )
    const existing = await getDocs(existingQuery)

    if (!existing.empty) {
      // Resubscribe if unsubscribed
      const existingDoc = existing.docs[0]
      if (existingDoc.data().status === 'unsubscribed') {
        await updateDoc(doc(db, 'emailSubscribers', existingDoc.id), {
          status: 'subscribed',
          updatedAt: Timestamp.fromDate(new Date()),
        })
      }
      return {
        id: existingDoc.id,
        ...existingDoc.data(),
        createdAt: existingDoc.data().createdAt?.toDate(),
        updatedAt: existingDoc.data().updatedAt?.toDate(),
      } as EmailSubscriber
    }

    const now = new Date()
    const subscriberData = {
      ...subscriber,
      email: subscriber.email.toLowerCase(),
      engagement: {
        totalSent: 0,
        totalOpened: 0,
        totalClicked: 0,
        engagementScore: 50, // Start at neutral
      },
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    }

    const docRef = await addDoc(collection(db, 'emailSubscribers'), subscriberData)

    if (userId) {
      await this.auditService.logActivity({
        userId,
        action: 'create',
        resourceType: 'email_subscriber',
        resourceId: docRef.id,
        details: { email: subscriber.email },
        ipAddress: '',
        userAgent: '',
      })
    }

    return {
      id: docRef.id,
      ...subscriber,
      email: subscriberData.email,
      engagement: subscriberData.engagement,
      createdAt: now,
      updatedAt: now,
    }
  }

  async getSubscribers(
    promoterId: string,
    filters?: {
      status?: EmailSubscriber['status']
      tags?: string[]
      engagementLevel?: 'high' | 'medium' | 'low'
    },
    pagination?: { limit: number; offset: number }
  ): Promise<{ subscribers: EmailSubscriber[]; total: number }> {
    let q = query(
      collection(db, 'emailSubscribers'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    let subscribers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      engagement: {
        ...doc.data().engagement,
        lastOpenedAt: doc.data().engagement?.lastOpenedAt?.toDate(),
        lastClickedAt: doc.data().engagement?.lastClickedAt?.toDate(),
      },
    })) as EmailSubscriber[]

    // Apply filters
    if (filters?.status) {
      subscribers = subscribers.filter((s) => s.status === filters.status)
    }

    if (filters?.tags?.length) {
      subscribers = subscribers.filter((s) =>
        filters.tags!.some((tag) => s.tags.includes(tag))
      )
    }

    if (filters?.engagementLevel) {
      subscribers = subscribers.filter((s) => {
        const score = s.engagement.engagementScore
        switch (filters.engagementLevel) {
          case 'high':
            return score >= 70
          case 'medium':
            return score >= 30 && score < 70
          case 'low':
            return score < 30
          default:
            return true
        }
      })
    }

    const total = subscribers.length

    // Apply pagination
    if (pagination) {
      subscribers = subscribers.slice(
        pagination.offset,
        pagination.offset + pagination.limit
      )
    }

    return { subscribers, total }
  }

  async unsubscribe(email: string, promoterId: string, reason?: string): Promise<void> {
    const q = query(
      collection(db, 'emailSubscribers'),
      where('promoterId', '==', promoterId),
      where('email', '==', email.toLowerCase())
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return

    const subscriberDoc = snapshot.docs[0]
    await updateDoc(doc(db, 'emailSubscribers', subscriberDoc.id), {
      status: 'unsubscribed',
      unsubscribedAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    })

    await this.auditService.logActivity({
      userId: 'system',
      action: 'unsubscribe',
      resourceType: 'email_subscriber',
      resourceId: subscriberDoc.id,
      details: { email, reason },
      ipAddress: '',
      userAgent: '',
    })
  }

  async importSubscribers(
    promoterId: string,
    subscribers: {
      email: string
      firstName?: string
      lastName?: string
      tags?: string[]
    }[],
    userId: string
  ): Promise<{ imported: number; duplicates: number; invalid: number }> {
    let imported = 0
    let duplicates = 0
    let invalid = 0

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    for (const sub of subscribers) {
      if (!emailRegex.test(sub.email)) {
        invalid++
        continue
      }

      try {
        const result = await this.addSubscriber({
          promoterId,
          email: sub.email,
          firstName: sub.firstName,
          lastName: sub.lastName,
          tags: sub.tags || [],
          status: 'subscribed',
          subscriptionSource: 'import',
          preferences: {
            frequency: 'all',
            categories: [],
          },
        })

        // Check if it was a new subscriber or existing
        const existingCheck = await getDocs(
          query(
            collection(db, 'emailSubscribers'),
            where('promoterId', '==', promoterId),
            where('email', '==', sub.email.toLowerCase())
          )
        )

        if (existingCheck.docs.length > 1) {
          duplicates++
        } else {
          imported++
        }
      } catch (error) {
        invalid++
      }
    }

    await this.auditService.logActivity({
      userId,
      action: 'import',
      resourceType: 'email_subscribers',
      resourceId: promoterId,
      details: { imported, duplicates, invalid },
      ipAddress: '',
      userAgent: '',
    })

    return { imported, duplicates, invalid }
  }

  async updateSubscriberTags(
    subscriberId: string,
    action: 'add' | 'remove',
    tags: string[]
  ): Promise<void> {
    const subscriberRef = doc(db, 'emailSubscribers', subscriberId)
    const subscriberDoc = await getDoc(subscriberRef)

    if (!subscriberDoc.exists()) {
      throw new Error('Subscriber not found')
    }

    const currentTags = subscriberDoc.data().tags || []
    let newTags: string[]

    if (action === 'add') {
      newTags = [...new Set([...currentTags, ...tags])]
    } else {
      newTags = currentTags.filter((t: string) => !tags.includes(t))
    }

    await updateDoc(subscriberRef, {
      tags: newTags,
      updatedAt: Timestamp.fromDate(new Date()),
    })
  }

  // ==================== AUTOMATION WORKFLOWS ====================

  async createWorkflow(
    workflow: Omit<AutomationWorkflow, 'id' | 'createdAt' | 'updatedAt' | 'stats'>,
    userId: string
  ): Promise<AutomationWorkflow> {
    const now = new Date()
    const workflowData = {
      ...workflow,
      stats: {
        totalEnrolled: 0,
        totalCompleted: 0,
        totalExited: 0,
      },
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    }

    const docRef = await addDoc(collection(db, 'automationWorkflows'), workflowData)

    await this.auditService.logActivity({
      userId,
      action: 'create',
      resourceType: 'automation_workflow',
      resourceId: docRef.id,
      details: { workflowName: workflow.name, trigger: workflow.trigger.type },
      ipAddress: '',
      userAgent: '',
    })

    return {
      id: docRef.id,
      ...workflow,
      stats: workflowData.stats,
      createdAt: now,
      updatedAt: now,
    }
  }

  async getWorkflows(promoterId: string): Promise<AutomationWorkflow[]> {
    const q = query(
      collection(db, 'automationWorkflows'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as AutomationWorkflow[]
  }

  async updateWorkflow(
    workflowId: string,
    updates: Partial<AutomationWorkflow>,
    userId: string
  ): Promise<void> {
    const workflowRef = doc(db, 'automationWorkflows', workflowId)
    await updateDoc(workflowRef, {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    })

    await this.auditService.logActivity({
      userId,
      action: 'update',
      resourceType: 'automation_workflow',
      resourceId: workflowId,
      details: { updates: Object.keys(updates) },
      ipAddress: '',
      userAgent: '',
    })
  }

  async activateWorkflow(workflowId: string, userId: string): Promise<void> {
    await this.updateWorkflow(workflowId, { status: 'active' }, userId)
  }

  async pauseWorkflow(workflowId: string, userId: string): Promise<void> {
    await this.updateWorkflow(workflowId, { status: 'paused' }, userId)
  }

  async triggerWorkflow(workflowId: string, subscriberId: string): Promise<void> {
    const workflowDoc = await getDoc(doc(db, 'automationWorkflows', workflowId))
    if (!workflowDoc.exists() || workflowDoc.data().status !== 'active') {
      return
    }

    // Create workflow enrollment
    await addDoc(collection(db, 'workflowEnrollments'), {
      workflowId,
      subscriberId,
      currentStepId: workflowDoc.data().steps[0]?.id,
      status: 'active',
      enrolledAt: Timestamp.fromDate(new Date()),
    })

    // Update workflow stats
    await updateDoc(doc(db, 'automationWorkflows', workflowId), {
      'stats.totalEnrolled': workflowDoc.data().stats.totalEnrolled + 1,
    })
  }

  // ==================== CAMPAIGN ANALYTICS ====================

  async getCampaignAnalytics(
    campaignId: string
  ): Promise<{
    metrics: EmailCampaign['metrics']
    openRate: number
    clickRate: number
    bounceRate: number
    unsubscribeRate: number
    clicksByLink: { url: string; clicks: number }[]
    opensByHour: { hour: number; opens: number }[]
  }> {
    const campaign = await this.getCampaign(campaignId)
    if (!campaign) {
      throw new Error('Campaign not found')
    }

    const metrics = campaign.metrics
    const totalDelivered = metrics.delivered || metrics.sent

    // Get detailed click data
    const sendsQuery = query(
      collection(db, 'emailSends'),
      where('campaignId', '==', campaignId)
    )
    const sendsSnapshot = await getDocs(sendsQuery)

    const clicksByLink: Record<string, number> = {}
    const opensByHour: Record<number, number> = {}

    sendsSnapshot.docs.forEach((doc) => {
      const data = doc.data()

      // Track clicks
      if (data.clicks) {
        data.clicks.forEach((click: any) => {
          clicksByLink[click.url] = (clicksByLink[click.url] || 0) + 1
        })
      }

      // Track opens by hour
      if (data.openedAt) {
        const hour = data.openedAt.toDate().getHours()
        opensByHour[hour] = (opensByHour[hour] || 0) + 1
      }
    })

    return {
      metrics,
      openRate: totalDelivered > 0 ? (metrics.opened / totalDelivered) * 100 : 0,
      clickRate: totalDelivered > 0 ? (metrics.clicked / totalDelivered) * 100 : 0,
      bounceRate: metrics.sent > 0 ? (metrics.bounced / metrics.sent) * 100 : 0,
      unsubscribeRate: totalDelivered > 0 ? (metrics.unsubscribed / totalDelivered) * 100 : 0,
      clicksByLink: Object.entries(clicksByLink)
        .map(([url, clicks]) => ({ url, clicks }))
        .sort((a, b) => b.clicks - a.clicks),
      opensByHour: Object.entries(opensByHour)
        .map(([hour, opens]) => ({ hour: parseInt(hour), opens }))
        .sort((a, b) => a.hour - b.hour),
    }
  }

  async getEmailPerformanceOverview(
    promoterId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<{
    totalCampaigns: number
    totalSent: number
    totalOpened: number
    totalClicked: number
    avgOpenRate: number
    avgClickRate: number
    bestPerformingCampaign: { name: string; openRate: number } | null
    subscriberGrowth: { date: string; count: number }[]
  }> {
    const campaigns = await this.getCampaigns(promoterId, { dateRange })

    let totalSent = 0
    let totalOpened = 0
    let totalClicked = 0
    let bestCampaign: { name: string; openRate: number } | null = null

    campaigns.forEach((campaign) => {
      totalSent += campaign.metrics.sent
      totalOpened += campaign.metrics.opened
      totalClicked += campaign.metrics.clicked

      const openRate =
        campaign.metrics.delivered > 0
          ? (campaign.metrics.opened / campaign.metrics.delivered) * 100
          : 0

      if (!bestCampaign || openRate > bestCampaign.openRate) {
        bestCampaign = { name: campaign.name, openRate }
      }
    })

    // Get subscriber growth
    const subscribersQuery = query(
      collection(db, 'emailSubscribers'),
      where('promoterId', '==', promoterId),
      where('createdAt', '>=', Timestamp.fromDate(dateRange.start)),
      where('createdAt', '<=', Timestamp.fromDate(dateRange.end))
    )
    const subscribersSnapshot = await getDocs(subscribersQuery)

    const growthByDate: Record<string, number> = {}
    subscribersSnapshot.docs.forEach((doc) => {
      const date = doc.data().createdAt.toDate().toISOString().split('T')[0]
      growthByDate[date] = (growthByDate[date] || 0) + 1
    })

    return {
      totalCampaigns: campaigns.length,
      totalSent,
      totalOpened,
      totalClicked,
      avgOpenRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
      avgClickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
      bestPerformingCampaign: bestCampaign,
      subscriberGrowth: Object.entries(growthByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    }
  }

  // ==================== EMAIL TRACKING ====================

  async trackOpen(campaignId: string, subscriberId: string): Promise<void> {
    const now = new Date()

    // Update email send record
    const sendQuery = query(
      collection(db, 'emailSends'),
      where('campaignId', '==', campaignId),
      where('subscriberId', '==', subscriberId)
    )
    const sendSnapshot = await getDocs(sendQuery)

    if (!sendSnapshot.empty) {
      const sendDoc = sendSnapshot.docs[0]
      if (!sendDoc.data().openedAt) {
        await updateDoc(doc(db, 'emailSends', sendDoc.id), {
          status: 'opened',
          openedAt: Timestamp.fromDate(now),
        })

        // Update campaign metrics
        const campaign = await this.getCampaign(campaignId)
        if (campaign) {
          await updateDoc(doc(db, 'emailCampaigns', campaignId), {
            'metrics.opened': campaign.metrics.opened + 1,
          })
        }

        // Update subscriber engagement
        await this.updateSubscriberEngagement(subscriberId, 'open')
      }
    }
  }

  async trackClick(campaignId: string, subscriberId: string, url: string): Promise<void> {
    const now = new Date()

    const sendQuery = query(
      collection(db, 'emailSends'),
      where('campaignId', '==', campaignId),
      where('subscriberId', '==', subscriberId)
    )
    const sendSnapshot = await getDocs(sendQuery)

    if (!sendSnapshot.empty) {
      const sendDoc = sendSnapshot.docs[0]
      const currentClicks = sendDoc.data().clicks || []
      const isFirstClick = currentClicks.length === 0

      await updateDoc(doc(db, 'emailSends', sendDoc.id), {
        status: 'clicked',
        clickedAt: isFirstClick ? Timestamp.fromDate(now) : sendDoc.data().clickedAt,
        clicks: [...currentClicks, { url, clickedAt: Timestamp.fromDate(now) }],
      })

      // Update campaign metrics only for first click
      if (isFirstClick) {
        const campaign = await this.getCampaign(campaignId)
        if (campaign) {
          await updateDoc(doc(db, 'emailCampaigns', campaignId), {
            'metrics.clicked': campaign.metrics.clicked + 1,
          })
        }
      }

      // Update subscriber engagement
      await this.updateSubscriberEngagement(subscriberId, 'click')
    }
  }

  private async updateSubscriberEngagement(
    subscriberId: string,
    action: 'open' | 'click'
  ): Promise<void> {
    const subscriberRef = doc(db, 'emailSubscribers', subscriberId)
    const subscriberDoc = await getDoc(subscriberRef)

    if (!subscriberDoc.exists()) return

    const engagement = subscriberDoc.data().engagement || {}
    const now = new Date()

    const updates: any = {
      updatedAt: Timestamp.fromDate(now),
    }

    if (action === 'open') {
      updates['engagement.totalOpened'] = (engagement.totalOpened || 0) + 1
      updates['engagement.lastOpenedAt'] = Timestamp.fromDate(now)
    } else if (action === 'click') {
      updates['engagement.totalClicked'] = (engagement.totalClicked || 0) + 1
      updates['engagement.lastClickedAt'] = Timestamp.fromDate(now)
    }

    // Recalculate engagement score
    const totalSent = engagement.totalSent || 1
    const totalOpened = (engagement.totalOpened || 0) + (action === 'open' ? 1 : 0)
    const totalClicked = (engagement.totalClicked || 0) + (action === 'click' ? 1 : 0)

    const openRate = totalOpened / totalSent
    const clickRate = totalClicked / totalSent

    // Score: 60% open rate weight, 40% click rate weight
    updates['engagement.engagementScore'] = Math.min(
      100,
      Math.round(openRate * 60 + clickRate * 40 * 100)
    )

    await updateDoc(subscriberRef, updates)
  }
}

export const EmailCampaignService = new EmailCampaignServiceClass()
