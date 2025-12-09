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
} from 'firebase/firestore'

// Types
export interface Ticket {
  id: string
  promoterId: string
  number: string
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  category: string
  subcategory?: string
  tags: string[]
  customer: TicketCustomer
  assignee?: TicketAssignee
  channel: TicketChannel
  relatedEntities?: {
    orderId?: string
    eventId?: string
    ticketIds?: string[]
  }
  messages: TicketMessage[]
  attachments: TicketAttachment[]
  metadata: TicketMetadata
  sla: TicketSLA
  satisfaction?: TicketSatisfaction
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
  closedAt?: Date
}

export type TicketStatus = 'new' | 'open' | 'pending' | 'on_hold' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TicketChannel = 'email' | 'web' | 'phone' | 'chat' | 'social' | 'api'

export interface TicketCustomer {
  id?: string
  name: string
  email: string
  phone?: string
  avatar?: string
  customerSince?: Date
  totalOrders?: number
  totalSpent?: number
  vipStatus?: boolean
}

export interface TicketAssignee {
  id: string
  name: string
  email: string
  avatar?: string
  team?: string
}

export interface TicketMessage {
  id: string
  type: 'customer' | 'agent' | 'system' | 'note'
  authorId: string
  authorName: string
  authorType: 'customer' | 'agent' | 'system'
  content: string
  contentType: 'text' | 'html'
  attachments?: TicketAttachment[]
  isPublic: boolean
  createdAt: Date
}

export interface TicketAttachment {
  id: string
  name: string
  type: string
  size: number
  url: string
  uploadedBy: string
  uploadedAt: Date
}

export interface TicketMetadata {
  source?: string
  browser?: string
  device?: string
  os?: string
  ipAddress?: string
  location?: string
  referrer?: string
  customFields?: Record<string, any>
}

export interface TicketSLA {
  policyId?: string
  policyName?: string
  firstResponseDue?: Date
  firstResponseAt?: Date
  firstResponseBreached: boolean
  resolutionDue?: Date
  resolutionBreached: boolean
  nextBreachAt?: Date
  businessHoursUsed: number
}

export interface TicketSatisfaction {
  rating: number // 1-5
  comment?: string
  submittedAt: Date
}

export interface SLAPolicy {
  id: string
  promoterId: string
  name: string
  description?: string
  isDefault: boolean
  conditions: SLACondition[]
  targets: SLATargets
  businessHours: BusinessHours
  holidays: string[] // dates
  status: 'active' | 'inactive'
  createdAt: Date
}

export interface SLACondition {
  field: 'priority' | 'category' | 'channel' | 'customer_type'
  operator: 'equals' | 'in'
  value: string | string[]
}

export interface SLATargets {
  firstResponse: {
    low: number // minutes
    normal: number
    high: number
    urgent: number
  }
  resolution: {
    low: number
    normal: number
    high: number
    urgent: number
  }
}

export interface BusinessHours {
  timezone: string
  schedule: Array<{
    day: number // 0-6
    start: string // HH:MM
    end: string // HH:MM
  }>
}

export interface CannedResponse {
  id: string
  promoterId: string
  title: string
  content: string
  category: string
  tags: string[]
  shortcut?: string
  variables: string[]
  usageCount: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface KnowledgeArticle {
  id: string
  promoterId: string
  title: string
  slug: string
  content: string
  excerpt?: string
  category: string
  subcategory?: string
  tags: string[]
  status: 'draft' | 'published' | 'archived'
  visibility: 'public' | 'internal' | 'agents_only'
  relatedArticles?: string[]
  viewCount: number
  helpfulCount: number
  notHelpfulCount: number
  author: string
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
}

export interface LiveChatSession {
  id: string
  promoterId: string
  visitorId: string
  customerId?: string
  status: 'waiting' | 'active' | 'ended' | 'missed'
  agent?: TicketAssignee
  department?: string
  messages: ChatMessage[]
  metadata: {
    page?: string
    referrer?: string
    device?: string
    location?: string
  }
  startedAt: Date
  acceptedAt?: Date
  endedAt?: Date
  waitTime?: number // seconds
  duration?: number // seconds
  satisfaction?: number
}

export interface ChatMessage {
  id: string
  type: 'visitor' | 'agent' | 'system' | 'bot'
  senderId: string
  senderName: string
  content: string
  contentType: 'text' | 'file' | 'image' | 'quick_reply'
  attachments?: TicketAttachment[]
  timestamp: Date
}

export interface AgentMetrics {
  agentId: string
  period: { start: Date; end: Date }
  tickets: {
    assigned: number
    resolved: number
    reopened: number
    avgResolutionTime: number // hours
    avgFirstResponseTime: number // minutes
  }
  chat: {
    sessions: number
    avgResponseTime: number // seconds
    avgDuration: number // minutes
  }
  satisfaction: {
    ratings: number
    average: number
    positive: number
    negative: number
  }
  availability: {
    totalHours: number
    utilization: number
  }
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
function generateTicketNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `TKT-${timestamp}-${random}`
}

function calculateSLADue(
  createdAt: Date,
  targetMinutes: number,
  businessHours: BusinessHours
): Date {
  // Simplified: just add minutes. In production, calculate based on business hours
  const due = new Date(createdAt)
  due.setMinutes(due.getMinutes() + targetMinutes)
  return due
}

// Main Service Class
export class HelpDeskService {
  // ==================== TICKET MANAGEMENT ====================

  static async createTicket(
    data: Omit<Ticket, 'id' | 'number' | 'status' | 'messages' | 'attachments' | 'sla' | 'createdAt' | 'updatedAt'>
  ): Promise<Ticket> {
    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const ticketNumber = generateTicketNumber()

    // Get SLA policy
    const slaPolicy = await this.getApplicableSLAPolicy(data.promoterId, data.priority, data.category)

    const now = new Date()
    let sla: TicketSLA = {
      firstResponseBreached: false,
      resolutionBreached: false,
      businessHoursUsed: 0,
    }

    if (slaPolicy) {
      const firstResponseTarget = slaPolicy.targets.firstResponse[data.priority]
      const resolutionTarget = slaPolicy.targets.resolution[data.priority]

      sla = {
        policyId: slaPolicy.id,
        policyName: slaPolicy.name,
        firstResponseDue: calculateSLADue(now, firstResponseTarget, slaPolicy.businessHours),
        firstResponseBreached: false,
        resolutionDue: calculateSLADue(now, resolutionTarget, slaPolicy.businessHours),
        resolutionBreached: false,
        nextBreachAt: calculateSLADue(now, firstResponseTarget, slaPolicy.businessHours),
        businessHoursUsed: 0,
      }
    }

    const ticket: Ticket = {
      ...data,
      id: ticketId,
      number: ticketNumber,
      status: 'new',
      messages: [{
        id: `msg_${Date.now()}`,
        type: 'customer',
        authorId: data.customer.id || 'anonymous',
        authorName: data.customer.name,
        authorType: 'customer',
        content: data.description,
        contentType: 'text',
        isPublic: true,
        createdAt: now,
      }],
      attachments: [],
      sla,
      createdAt: now,
      updatedAt: now,
    }

    await setDoc(doc(db, 'tickets', ticketId), {
      ...ticket,
      messages: ticket.messages.map((m) => ({
        ...m,
        createdAt: Timestamp.fromDate(m.createdAt),
      })),
      sla: {
        ...sla,
        firstResponseDue: sla.firstResponseDue ? Timestamp.fromDate(sla.firstResponseDue) : null,
        resolutionDue: sla.resolutionDue ? Timestamp.fromDate(sla.resolutionDue) : null,
        nextBreachAt: sla.nextBreachAt ? Timestamp.fromDate(sla.nextBreachAt) : null,
      },
      createdAt: Timestamp.fromDate(ticket.createdAt),
      updatedAt: Timestamp.fromDate(ticket.updatedAt),
    })

    return ticket
  }

  static async getTicket(ticketId: string): Promise<Ticket | null> {
    const docRef = await getDoc(doc(db, 'tickets', ticketId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    return {
      ...data,
      id: docRef.id,
      messages: data.messages?.map((m: any) => ({
        ...m,
        createdAt: m.createdAt.toDate(),
      })) || [],
      attachments: data.attachments?.map((a: any) => ({
        ...a,
        uploadedAt: a.uploadedAt?.toDate(),
      })) || [],
      sla: {
        ...data.sla,
        firstResponseDue: data.sla?.firstResponseDue?.toDate(),
        firstResponseAt: data.sla?.firstResponseAt?.toDate(),
        resolutionDue: data.sla?.resolutionDue?.toDate(),
        nextBreachAt: data.sla?.nextBreachAt?.toDate(),
      },
      satisfaction: data.satisfaction
        ? { ...data.satisfaction, submittedAt: data.satisfaction.submittedAt?.toDate() }
        : undefined,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      resolvedAt: data.resolvedAt?.toDate(),
      closedAt: data.closedAt?.toDate(),
    } as Ticket
  }

  static async getTickets(
    promoterId: string,
    filters?: {
      status?: TicketStatus | TicketStatus[]
      priority?: TicketPriority
      assigneeId?: string
      customerId?: string
      category?: string
      channel?: TicketChannel
      search?: string
      dateRange?: { start: Date; end: Date }
    }
  ): Promise<Ticket[]> {
    let q = query(
      collection(db, 'tickets'),
      where('promoterId', '==', promoterId),
      orderBy('updatedAt', 'desc'),
      limit(100)
    )

    if (filters?.status && !Array.isArray(filters.status)) {
      q = query(q, where('status', '==', filters.status))
    }
    if (filters?.priority) {
      q = query(q, where('priority', '==', filters.priority))
    }
    if (filters?.assigneeId) {
      q = query(q, where('assignee.id', '==', filters.assigneeId))
    }
    if (filters?.category) {
      q = query(q, where('category', '==', filters.category))
    }

    const snapshot = await getDocs(q)
    let tickets = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as Ticket
    })

    // Apply additional filters
    if (filters?.status && Array.isArray(filters.status)) {
      tickets = tickets.filter((t) => filters.status!.includes(t.status))
    }
    if (filters?.customerId) {
      tickets = tickets.filter((t) => t.customer.id === filters.customerId)
    }
    if (filters?.dateRange) {
      tickets = tickets.filter((t) =>
        t.createdAt >= filters.dateRange!.start && t.createdAt <= filters.dateRange!.end
      )
    }
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      tickets = tickets.filter((t) =>
        t.subject.toLowerCase().includes(searchLower) ||
        t.number.toLowerCase().includes(searchLower) ||
        t.customer.email.toLowerCase().includes(searchLower)
      )
    }

    return tickets
  }

  static async updateTicket(
    ticketId: string,
    updates: Partial<Ticket>,
    actorId?: string,
    actorName?: string
  ): Promise<void> {
    const ticket = await this.getTicket(ticketId)
    if (!ticket) {
      throw new Error('Ticket not found')
    }

    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }

    // Add system message for status changes
    if (updates.status && updates.status !== ticket.status && actorId && actorName) {
      const systemMessage: TicketMessage = {
        id: `msg_${Date.now()}`,
        type: 'system',
        authorId: actorId,
        authorName: actorName,
        authorType: 'system',
        content: `Status changed from ${ticket.status} to ${updates.status}`,
        contentType: 'text',
        isPublic: false,
        createdAt: new Date(),
      }
      updateData.messages = [...ticket.messages.map((m) => ({
        ...m,
        createdAt: Timestamp.fromDate(m.createdAt),
      })), {
        ...systemMessage,
        createdAt: Timestamp.fromDate(systemMessage.createdAt),
      }]
    }

    // Handle resolution
    if (updates.status === 'resolved' && !ticket.resolvedAt) {
      updateData.resolvedAt = Timestamp.fromDate(new Date())
    }
    if (updates.status === 'closed' && !ticket.closedAt) {
      updateData.closedAt = Timestamp.fromDate(new Date())
    }

    delete updateData.id
    delete updateData.createdAt

    await updateDoc(doc(db, 'tickets', ticketId), updateData)
  }

  static async addMessage(
    ticketId: string,
    message: Omit<TicketMessage, 'id' | 'createdAt'>
  ): Promise<TicketMessage> {
    const ticket = await this.getTicket(ticketId)
    if (!ticket) {
      throw new Error('Ticket not found')
    }

    const newMessage: TicketMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date(),
    }

    const messages = [...ticket.messages.map((m) => ({
      ...m,
      createdAt: Timestamp.fromDate(m.createdAt),
    })), {
      ...newMessage,
      createdAt: Timestamp.fromDate(newMessage.createdAt),
    }]

    const updates: any = {
      messages,
      updatedAt: Timestamp.fromDate(new Date()),
    }

    // Update SLA for first response
    if (
      message.authorType === 'agent' &&
      message.isPublic &&
      !ticket.sla.firstResponseAt
    ) {
      updates['sla.firstResponseAt'] = Timestamp.fromDate(new Date())
      updates['sla.firstResponseBreached'] = ticket.sla.firstResponseDue
        ? new Date() > ticket.sla.firstResponseDue
        : false
    }

    // Reopen if customer responds to resolved ticket
    if (message.authorType === 'customer' && ticket.status === 'resolved') {
      updates.status = 'open'
      updates.resolvedAt = null
    }

    await updateDoc(doc(db, 'tickets', ticketId), updates)

    return newMessage
  }

  static async assignTicket(
    ticketId: string,
    assignee: TicketAssignee
  ): Promise<void> {
    await this.updateTicket(ticketId, {
      assignee,
      status: 'open',
    }, assignee.id, assignee.name)
  }

  static async unassignTicket(ticketId: string): Promise<void> {
    await updateDoc(doc(db, 'tickets', ticketId), {
      assignee: null,
      updatedAt: Timestamp.fromDate(new Date()),
    })
  }

  static async mergeTickets(
    primaryTicketId: string,
    secondaryTicketIds: string[],
    actorId: string,
    actorName: string
  ): Promise<void> {
    const primaryTicket = await this.getTicket(primaryTicketId)
    if (!primaryTicket) {
      throw new Error('Primary ticket not found')
    }

    const allMessages = [...primaryTicket.messages]

    for (const secondaryId of secondaryTicketIds) {
      const secondary = await this.getTicket(secondaryId)
      if (!secondary) continue

      // Add messages from secondary ticket
      for (const message of secondary.messages) {
        allMessages.push({
          ...message,
          content: `[Merged from ${secondary.number}] ${message.content}`,
        })
      }

      // Close secondary ticket
      await this.updateTicket(secondaryId, {
        status: 'closed',
      }, actorId, actorName)

      // Add merge note to secondary
      await this.addMessage(secondaryId, {
        type: 'system',
        authorId: actorId,
        authorName: actorName,
        authorType: 'system',
        content: `Merged into ticket ${primaryTicket.number}`,
        contentType: 'text',
        isPublic: false,
      })
    }

    // Sort messages by date
    allMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

    // Update primary ticket
    await updateDoc(doc(db, 'tickets', primaryTicketId), {
      messages: allMessages.map((m) => ({
        ...m,
        createdAt: Timestamp.fromDate(m.createdAt),
      })),
      updatedAt: Timestamp.fromDate(new Date()),
    })
  }

  static async submitSatisfaction(
    ticketId: string,
    rating: number,
    comment?: string
  ): Promise<void> {
    await updateDoc(doc(db, 'tickets', ticketId), {
      satisfaction: {
        rating,
        comment,
        submittedAt: Timestamp.fromDate(new Date()),
      },
      updatedAt: Timestamp.fromDate(new Date()),
    })
  }

  // ==================== SLA POLICIES ====================

  static async createSLAPolicy(
    data: Omit<SLAPolicy, 'id' | 'createdAt'>
  ): Promise<SLAPolicy> {
    const policyId = `sla_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const policy: SLAPolicy = {
      ...data,
      id: policyId,
      createdAt: new Date(),
    }

    await setDoc(doc(db, 'slaPolicies', policyId), {
      ...policy,
      createdAt: Timestamp.fromDate(policy.createdAt),
    })

    return policy
  }

  static async getSLAPolicies(promoterId: string): Promise<SLAPolicy[]> {
    const q = query(
      collection(db, 'slaPolicies'),
      where('promoterId', '==', promoterId),
      where('status', '==', 'active')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt.toDate(),
      } as SLAPolicy
    })
  }

  static async getApplicableSLAPolicy(
    promoterId: string,
    priority: TicketPriority,
    category: string
  ): Promise<SLAPolicy | null> {
    const policies = await this.getSLAPolicies(promoterId)

    // Find matching policy based on conditions
    for (const policy of policies) {
      let matches = true

      for (const condition of policy.conditions) {
        if (condition.field === 'priority') {
          if (Array.isArray(condition.value)) {
            matches = matches && condition.value.includes(priority)
          } else {
            matches = matches && priority === condition.value
          }
        }
        if (condition.field === 'category') {
          if (Array.isArray(condition.value)) {
            matches = matches && condition.value.includes(category)
          } else {
            matches = matches && category === condition.value
          }
        }
      }

      if (matches) return policy
    }

    // Return default policy
    return policies.find((p) => p.isDefault) || null
  }

  // ==================== CANNED RESPONSES ====================

  static async createCannedResponse(
    data: Omit<CannedResponse, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>
  ): Promise<CannedResponse> {
    const responseId = `canned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const response: CannedResponse = {
      ...data,
      id: responseId,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await setDoc(doc(db, 'cannedResponses', responseId), {
      ...response,
      createdAt: Timestamp.fromDate(response.createdAt),
      updatedAt: Timestamp.fromDate(response.updatedAt),
    })

    return response
  }

  static async getCannedResponses(
    promoterId: string,
    category?: string
  ): Promise<CannedResponse[]> {
    let q = query(
      collection(db, 'cannedResponses'),
      where('promoterId', '==', promoterId),
      orderBy('usageCount', 'desc')
    )

    if (category) {
      q = query(q, where('category', '==', category))
    }

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as CannedResponse
    })
  }

  static async useCannedResponse(
    responseId: string,
    variables: Record<string, string>
  ): Promise<string> {
    const docRef = await getDoc(doc(db, 'cannedResponses', responseId))
    if (!docRef.exists()) {
      throw new Error('Canned response not found')
    }

    const response = docRef.data() as CannedResponse

    // Replace variables
    let content = response.content
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }

    // Increment usage count
    await updateDoc(doc(db, 'cannedResponses', responseId), {
      usageCount: increment(1),
    })

    return content
  }

  // ==================== KNOWLEDGE BASE ====================

  static async createArticle(
    data: Omit<KnowledgeArticle, 'id' | 'viewCount' | 'helpfulCount' | 'notHelpfulCount' | 'createdAt' | 'updatedAt'>
  ): Promise<KnowledgeArticle> {
    const articleId = `article_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const article: KnowledgeArticle = {
      ...data,
      id: articleId,
      viewCount: 0,
      helpfulCount: 0,
      notHelpfulCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await setDoc(doc(db, 'knowledgeArticles', articleId), {
      ...article,
      createdAt: Timestamp.fromDate(article.createdAt),
      updatedAt: Timestamp.fromDate(article.updatedAt),
      publishedAt: article.publishedAt ? Timestamp.fromDate(article.publishedAt) : null,
    })

    return article
  }

  static async getArticle(articleId: string): Promise<KnowledgeArticle | null> {
    const docRef = await getDoc(doc(db, 'knowledgeArticles', articleId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    return {
      ...data,
      id: docRef.id,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      publishedAt: data.publishedAt?.toDate(),
    } as KnowledgeArticle
  }

  static async getArticles(
    promoterId: string,
    filters?: {
      status?: KnowledgeArticle['status']
      visibility?: KnowledgeArticle['visibility']
      category?: string
      search?: string
    }
  ): Promise<KnowledgeArticle[]> {
    let q = query(
      collection(db, 'knowledgeArticles'),
      where('promoterId', '==', promoterId),
      orderBy('updatedAt', 'desc')
    )

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status))
    }
    if (filters?.visibility) {
      q = query(q, where('visibility', '==', filters.visibility))
    }
    if (filters?.category) {
      q = query(q, where('category', '==', filters.category))
    }

    const snapshot = await getDocs(q)
    let articles = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        publishedAt: data.publishedAt?.toDate(),
      } as KnowledgeArticle
    })

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      articles = articles.filter((a) =>
        a.title.toLowerCase().includes(searchLower) ||
        a.content.toLowerCase().includes(searchLower)
      )
    }

    return articles
  }

  static async recordArticleView(articleId: string): Promise<void> {
    await updateDoc(doc(db, 'knowledgeArticles', articleId), {
      viewCount: increment(1),
    })
  }

  static async recordArticleFeedback(
    articleId: string,
    helpful: boolean
  ): Promise<void> {
    await updateDoc(doc(db, 'knowledgeArticles', articleId), {
      [helpful ? 'helpfulCount' : 'notHelpfulCount']: increment(1),
    })
  }

  static async searchKnowledgeBase(
    promoterId: string,
    query_string: string
  ): Promise<KnowledgeArticle[]> {
    return this.getArticles(promoterId, {
      status: 'published',
      visibility: 'public',
      search: query_string,
    })
  }

  // ==================== LIVE CHAT ====================

  static async startChatSession(
    data: Omit<LiveChatSession, 'id' | 'status' | 'messages' | 'startedAt'>
  ): Promise<LiveChatSession> {
    const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const session: LiveChatSession = {
      ...data,
      id: sessionId,
      status: 'waiting',
      messages: [],
      startedAt: new Date(),
    }

    await setDoc(doc(db, 'chatSessions', sessionId), {
      ...session,
      startedAt: Timestamp.fromDate(session.startedAt),
    })

    return session
  }

  static async getChatSession(sessionId: string): Promise<LiveChatSession | null> {
    const docRef = await getDoc(doc(db, 'chatSessions', sessionId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    return {
      ...data,
      id: docRef.id,
      messages: data.messages?.map((m: any) => ({
        ...m,
        timestamp: m.timestamp.toDate(),
      })) || [],
      startedAt: data.startedAt.toDate(),
      acceptedAt: data.acceptedAt?.toDate(),
      endedAt: data.endedAt?.toDate(),
    } as LiveChatSession
  }

  static async acceptChatSession(
    sessionId: string,
    agent: TicketAssignee
  ): Promise<void> {
    const session = await this.getChatSession(sessionId)
    if (!session) {
      throw new Error('Chat session not found')
    }

    const now = new Date()
    const waitTime = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000)

    await updateDoc(doc(db, 'chatSessions', sessionId), {
      status: 'active',
      agent,
      acceptedAt: Timestamp.fromDate(now),
      waitTime,
    })
  }

  static async sendChatMessage(
    sessionId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<ChatMessage> {
    const session = await this.getChatSession(sessionId)
    if (!session) {
      throw new Error('Chat session not found')
    }

    const newMessage: ChatMessage = {
      ...message,
      id: `cmsg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
    }

    await updateDoc(doc(db, 'chatSessions', sessionId), {
      messages: [...session.messages.map((m) => ({
        ...m,
        timestamp: Timestamp.fromDate(m.timestamp),
      })), {
        ...newMessage,
        timestamp: Timestamp.fromDate(newMessage.timestamp),
      }],
    })

    return newMessage
  }

  static async endChatSession(sessionId: string): Promise<void> {
    const session = await this.getChatSession(sessionId)
    if (!session) return

    const endedAt = new Date()
    const duration = session.acceptedAt
      ? Math.floor((endedAt.getTime() - session.acceptedAt.getTime()) / 1000)
      : 0

    await updateDoc(doc(db, 'chatSessions', sessionId), {
      status: 'ended',
      endedAt: Timestamp.fromDate(endedAt),
      duration,
    })
  }

  // ==================== METRICS ====================

  static async getTicketMetrics(
    promoterId: string,
    period: { start: Date; end: Date }
  ): Promise<{
    total: number
    open: number
    resolved: number
    avgResolutionTime: number
    avgFirstResponseTime: number
    slaCompliance: number
    byPriority: Record<TicketPriority, number>
    byCategory: Record<string, number>
    byChannel: Record<TicketChannel, number>
    satisfaction: { average: number; responses: number }
  }> {
    const tickets = await this.getTickets(promoterId, {
      dateRange: period,
    })

    const metrics = {
      total: tickets.length,
      open: 0,
      resolved: 0,
      avgResolutionTime: 0,
      avgFirstResponseTime: 0,
      slaCompliance: 0,
      byPriority: { low: 0, normal: 0, high: 0, urgent: 0 } as Record<TicketPriority, number>,
      byCategory: {} as Record<string, number>,
      byChannel: {} as Record<TicketChannel, number>,
      satisfaction: { average: 0, responses: 0 },
    }

    let totalResolutionTime = 0
    let resolvedCount = 0
    let totalFirstResponseTime = 0
    let firstResponseCount = 0
    let slaMetCount = 0
    let totalSatisfaction = 0
    let satisfactionCount = 0

    for (const ticket of tickets) {
      // Status counts
      if (['new', 'open', 'pending', 'on_hold'].includes(ticket.status)) {
        metrics.open++
      } else {
        metrics.resolved++
      }

      // Priority
      metrics.byPriority[ticket.priority]++

      // Category
      metrics.byCategory[ticket.category] = (metrics.byCategory[ticket.category] || 0) + 1

      // Channel
      metrics.byChannel[ticket.channel] = (metrics.byChannel[ticket.channel] || 0) + 1

      // Resolution time
      if (ticket.resolvedAt) {
        totalResolutionTime += ticket.resolvedAt.getTime() - ticket.createdAt.getTime()
        resolvedCount++
      }

      // First response time
      if (ticket.sla.firstResponseAt) {
        totalFirstResponseTime += ticket.sla.firstResponseAt.getTime() - ticket.createdAt.getTime()
        firstResponseCount++
      }

      // SLA compliance
      if (!ticket.sla.firstResponseBreached && !ticket.sla.resolutionBreached) {
        slaMetCount++
      }

      // Satisfaction
      if (ticket.satisfaction) {
        totalSatisfaction += ticket.satisfaction.rating
        satisfactionCount++
      }
    }

    metrics.avgResolutionTime = resolvedCount > 0
      ? Math.round(totalResolutionTime / resolvedCount / (1000 * 60 * 60))
      : 0
    metrics.avgFirstResponseTime = firstResponseCount > 0
      ? Math.round(totalFirstResponseTime / firstResponseCount / (1000 * 60))
      : 0
    metrics.slaCompliance = tickets.length > 0
      ? Math.round((slaMetCount / tickets.length) * 100)
      : 100
    metrics.satisfaction = {
      average: satisfactionCount > 0
        ? Math.round((totalSatisfaction / satisfactionCount) * 10) / 10
        : 0,
      responses: satisfactionCount,
    }

    return metrics
  }

  // ==================== CACHE MANAGEMENT ====================

  static clearCache(): void {
    cache.clear()
  }
}
