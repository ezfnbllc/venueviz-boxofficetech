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
  runTransaction,
} from 'firebase/firestore'

// Types
export interface VirtualQueue {
  id: string
  promoterId: string
  eventId: string
  eventName: string
  name: string
  status: 'inactive' | 'waiting' | 'active' | 'paused' | 'completed'
  config: QueueConfig
  capacity: QueueCapacity
  metrics: QueueMetrics
  schedule?: {
    openAt: Date
    closeAt: Date
    saleStartAt: Date
  }
  createdAt: Date
  updatedAt: Date
}

export interface QueueConfig {
  maxConcurrentUsers: number
  sessionDuration: number // minutes
  refreshInterval: number // seconds
  fairnessMode: 'random' | 'fifo' | 'priority' | 'lottery'
  enablePriorityAccess: boolean
  priorityGroups?: PriorityGroup[]
  antiBot: AntiBotConfig
  customMessages?: {
    waiting?: string
    almostThere?: string
    yourTurn?: string
    sessionExpiring?: string
  }
}

export interface PriorityGroup {
  id: string
  name: string
  priority: number // 1 = highest
  customerSegments?: string[]
  memberTiers?: string[]
  maxPercentage?: number // max % of capacity for this group
}

export interface AntiBotConfig {
  enabled: boolean
  captchaRequired: boolean
  deviceFingerprintRequired: boolean
  rateLimitPerIP: number
  rateLimitPerDevice: number
  blockVPN: boolean
  blockDataCenters: boolean
  challengeThreshold: number // suspicious score threshold
}

export interface QueueCapacity {
  totalInQueue: number
  activeUsers: number
  completedSessions: number
  abandonedSessions: number
  averageWaitTime: number // minutes
  estimatedWaitTime: number // minutes
  throughputRate: number // users per minute
}

export interface QueueMetrics {
  peakConcurrentUsers: number
  totalUsersServed: number
  averageSessionDuration: number
  conversionRate: number
  botBlockedCount: number
  challengeFailedCount: number
}

export interface QueueEntry {
  id: string
  queueId: string
  promoterId: string
  eventId: string
  customerId?: string
  sessionId: string
  deviceFingerprint?: string
  ipAddress: string
  userAgent: string
  status: 'waiting' | 'ready' | 'active' | 'completed' | 'abandoned' | 'expired' | 'blocked'
  position?: number
  estimatedWait?: number
  priorityGroup?: string
  priorityScore: number
  challengeStatus?: 'pending' | 'passed' | 'failed'
  metadata?: Record<string, any>
  joinedAt: Date
  readyAt?: Date
  activatedAt?: Date
  expiresAt?: Date
  completedAt?: Date
}

export interface QueueSession {
  id: string
  queueId: string
  entryId: string
  customerId?: string
  status: 'active' | 'expired' | 'completed'
  accessToken: string
  startedAt: Date
  expiresAt: Date
  lastActivityAt: Date
  cartItems?: number
  purchaseCompleted: boolean
  purchaseAmount?: number
}

export interface CapacityPool {
  id: string
  promoterId: string
  eventId: string
  sectionId?: string
  name: string
  totalCapacity: number
  availableCapacity: number
  reservedCapacity: number
  holdCapacity: number
  soldCapacity: number
  capacityByType: Record<string, number>
  status: 'available' | 'limited' | 'soldout'
  lastUpdated: Date
}

export interface CapacityHold {
  id: string
  poolId: string
  sessionId?: string
  customerId?: string
  quantity: number
  ticketType?: string
  status: 'held' | 'released' | 'converted'
  createdAt: Date
  expiresAt: Date
  convertedAt?: Date
}

export interface WaitlistEntry {
  id: string
  promoterId: string
  eventId: string
  sectionId?: string
  ticketType?: string
  customerId: string
  customerEmail: string
  customerName: string
  quantity: number
  status: 'waiting' | 'notified' | 'purchased' | 'expired' | 'cancelled'
  priority: number
  notifiedAt?: Date
  purchaseDeadline?: Date
  createdAt: Date
}

// Caching
const cache = new Map<string, { data: any; expiry: number }>()
const CACHE_TTL = 10 * 1000 // 10 seconds for queue data

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
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`
}

function generateAccessToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

function calculateEstimatedWait(
  position: number,
  throughputRate: number,
  config: QueueConfig
): number {
  if (throughputRate <= 0) {
    return Math.ceil(position * config.sessionDuration / config.maxConcurrentUsers)
  }
  return Math.ceil(position / throughputRate)
}

function calculateSuspiciousScore(entry: Partial<QueueEntry>): number {
  let score = 0

  // Add score based on various factors
  // This is a simplified version - real implementation would be more sophisticated

  // Rapid requests from same IP
  // Missing device fingerprint
  if (!entry.deviceFingerprint) score += 20

  // Unusual user agent
  if (entry.userAgent && (
    entry.userAgent.includes('bot') ||
    entry.userAgent.includes('crawler') ||
    entry.userAgent.includes('spider')
  )) {
    score += 50
  }

  // Known datacenter IP ranges (simplified check)
  if (entry.ipAddress && (
    entry.ipAddress.startsWith('10.') ||
    entry.ipAddress.startsWith('192.168.')
  )) {
    score += 10
  }

  return score
}

// Main Service Class
export class QueueManagementService {
  // ==================== VIRTUAL QUEUE MANAGEMENT ====================

  static async createQueue(
    data: Omit<VirtualQueue, 'id' | 'capacity' | 'metrics' | 'createdAt' | 'updatedAt'>
  ): Promise<VirtualQueue> {
    const queueId = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const queue: VirtualQueue = {
      ...data,
      id: queueId,
      capacity: {
        totalInQueue: 0,
        activeUsers: 0,
        completedSessions: 0,
        abandonedSessions: 0,
        averageWaitTime: 0,
        estimatedWaitTime: 0,
        throughputRate: 0,
      },
      metrics: {
        peakConcurrentUsers: 0,
        totalUsersServed: 0,
        averageSessionDuration: 0,
        conversionRate: 0,
        botBlockedCount: 0,
        challengeFailedCount: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const firestoreData: any = {
      ...queue,
      createdAt: Timestamp.fromDate(queue.createdAt),
      updatedAt: Timestamp.fromDate(queue.updatedAt),
    }

    if (queue.schedule) {
      firestoreData.schedule = {
        openAt: Timestamp.fromDate(queue.schedule.openAt),
        closeAt: Timestamp.fromDate(queue.schedule.closeAt),
        saleStartAt: Timestamp.fromDate(queue.schedule.saleStartAt),
      }
    }

    await setDoc(doc(db, 'virtualQueues', queueId), firestoreData)

    return queue
  }

  static async getQueue(queueId: string): Promise<VirtualQueue | null> {
    const cached = getCached<VirtualQueue>(`queue:${queueId}`)
    if (cached) return cached

    const docRef = await getDoc(doc(db, 'virtualQueues', queueId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    const queue: VirtualQueue = {
      ...data,
      id: docRef.id,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      schedule: data.schedule
        ? {
            openAt: data.schedule.openAt.toDate(),
            closeAt: data.schedule.closeAt.toDate(),
            saleStartAt: data.schedule.saleStartAt.toDate(),
          }
        : undefined,
    } as VirtualQueue

    setCache(`queue:${queueId}`, queue)
    return queue
  }

  static async getQueueByEvent(eventId: string): Promise<VirtualQueue | null> {
    const q = query(
      collection(db, 'virtualQueues'),
      where('eventId', '==', eventId),
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
      updatedAt: data.updatedAt.toDate(),
      schedule: data.schedule
        ? {
            openAt: data.schedule.openAt.toDate(),
            closeAt: data.schedule.closeAt.toDate(),
            saleStartAt: data.schedule.saleStartAt.toDate(),
          }
        : undefined,
    } as VirtualQueue
  }

  static async updateQueue(queueId: string, updates: Partial<VirtualQueue>): Promise<void> {
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }

    if (updates.schedule) {
      updateData.schedule = {
        openAt: Timestamp.fromDate(updates.schedule.openAt),
        closeAt: Timestamp.fromDate(updates.schedule.closeAt),
        saleStartAt: Timestamp.fromDate(updates.schedule.saleStartAt),
      }
    }

    delete updateData.id
    delete updateData.createdAt

    await updateDoc(doc(db, 'virtualQueues', queueId), updateData)
    cache.delete(`queue:${queueId}`)
  }

  static async activateQueue(queueId: string): Promise<void> {
    await this.updateQueue(queueId, { status: 'active' })
  }

  static async pauseQueue(queueId: string): Promise<void> {
    await this.updateQueue(queueId, { status: 'paused' })
  }

  static async completeQueue(queueId: string): Promise<void> {
    await this.updateQueue(queueId, { status: 'completed' })
  }

  // ==================== QUEUE ENTRY MANAGEMENT ====================

  static async joinQueue(
    queueId: string,
    data: {
      customerId?: string
      deviceFingerprint?: string
      ipAddress: string
      userAgent: string
      metadata?: Record<string, any>
    }
  ): Promise<{ entry: QueueEntry; requiresChallenge: boolean }> {
    const queue = await this.getQueue(queueId)
    if (!queue) {
      throw new Error('Queue not found')
    }

    if (queue.status !== 'active' && queue.status !== 'waiting') {
      throw new Error('Queue is not accepting new entries')
    }

    // Check anti-bot measures
    const suspiciousScore = calculateSuspiciousScore(data)
    const requiresChallenge = queue.config.antiBot.enabled &&
      suspiciousScore >= queue.config.antiBot.challengeThreshold

    if (queue.config.antiBot.enabled && suspiciousScore >= 80) {
      throw new Error('Access denied due to suspicious activity')
    }

    // Check rate limits
    const recentFromIP = await this.getRecentEntriesByIP(queueId, data.ipAddress)
    if (recentFromIP >= queue.config.antiBot.rateLimitPerIP) {
      throw new Error('Rate limit exceeded')
    }

    // Determine priority
    let priorityScore = 100 // default
    let priorityGroup: string | undefined

    if (queue.config.enablePriorityAccess && queue.config.priorityGroups) {
      // In a real implementation, we would check customer segments/tiers
      // For now, use default priority
      priorityScore = 100
    }

    const entryId = `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const sessionId = generateSessionId()

    // Calculate position
    const position = queue.capacity.totalInQueue + 1
    const estimatedWait = calculateEstimatedWait(position, queue.capacity.throughputRate, queue.config)

    const entry: QueueEntry = {
      id: entryId,
      queueId,
      promoterId: queue.promoterId,
      eventId: queue.eventId,
      customerId: data.customerId,
      sessionId,
      deviceFingerprint: data.deviceFingerprint,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      status: 'waiting',
      position,
      estimatedWait,
      priorityGroup,
      priorityScore,
      challengeStatus: requiresChallenge ? 'pending' : undefined,
      metadata: data.metadata,
      joinedAt: new Date(),
    }

    await setDoc(doc(db, 'queueEntries', entryId), {
      ...entry,
      joinedAt: Timestamp.fromDate(entry.joinedAt),
    })

    // Update queue capacity
    await updateDoc(doc(db, 'virtualQueues', queueId), {
      'capacity.totalInQueue': increment(1),
      updatedAt: Timestamp.fromDate(new Date()),
    })

    cache.delete(`queue:${queueId}`)

    return { entry, requiresChallenge }
  }

  static async getQueueEntry(entryId: string): Promise<QueueEntry | null> {
    const docRef = await getDoc(doc(db, 'queueEntries', entryId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    return {
      ...data,
      id: docRef.id,
      joinedAt: data.joinedAt.toDate(),
      readyAt: data.readyAt?.toDate(),
      activatedAt: data.activatedAt?.toDate(),
      expiresAt: data.expiresAt?.toDate(),
      completedAt: data.completedAt?.toDate(),
    } as QueueEntry
  }

  static async getQueueEntryBySession(sessionId: string): Promise<QueueEntry | null> {
    const q = query(
      collection(db, 'queueEntries'),
      where('sessionId', '==', sessionId),
      limit(1)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const doc_data = snapshot.docs[0]
    const data = doc_data.data()
    return {
      ...data,
      id: doc_data.id,
      joinedAt: data.joinedAt.toDate(),
      readyAt: data.readyAt?.toDate(),
      activatedAt: data.activatedAt?.toDate(),
      expiresAt: data.expiresAt?.toDate(),
      completedAt: data.completedAt?.toDate(),
    } as QueueEntry
  }

  static async getRecentEntriesByIP(queueId: string, ipAddress: string): Promise<number> {
    const fiveMinutesAgo = new Date()
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5)

    const q = query(
      collection(db, 'queueEntries'),
      where('queueId', '==', queueId),
      where('ipAddress', '==', ipAddress),
      where('joinedAt', '>=', Timestamp.fromDate(fiveMinutesAgo))
    )

    const snapshot = await getDocs(q)
    return snapshot.size
  }

  static async getQueuePosition(entryId: string): Promise<{
    position: number
    estimatedWait: number
    status: string
    aheadOfYou: number
  }> {
    const entry = await this.getQueueEntry(entryId)
    if (!entry) {
      throw new Error('Entry not found')
    }

    const queue = await this.getQueue(entry.queueId)
    if (!queue) {
      throw new Error('Queue not found')
    }

    // Count entries ahead
    const q = query(
      collection(db, 'queueEntries'),
      where('queueId', '==', entry.queueId),
      where('status', '==', 'waiting'),
      where('priorityScore', '<=', entry.priorityScore),
      where('joinedAt', '<', Timestamp.fromDate(entry.joinedAt))
    )

    const snapshot = await getDocs(q)
    const aheadOfYou = snapshot.size

    const estimatedWait = calculateEstimatedWait(
      aheadOfYou + 1,
      queue.capacity.throughputRate,
      queue.config
    )

    return {
      position: aheadOfYou + 1,
      estimatedWait,
      status: entry.status,
      aheadOfYou,
    }
  }

  static async passChallenge(entryId: string): Promise<void> {
    await updateDoc(doc(db, 'queueEntries', entryId), {
      challengeStatus: 'passed',
    })
  }

  static async failChallenge(entryId: string): Promise<void> {
    const entry = await this.getQueueEntry(entryId)
    if (!entry) return

    await updateDoc(doc(db, 'queueEntries', entryId), {
      challengeStatus: 'failed',
      status: 'blocked',
    })

    // Update queue metrics
    await updateDoc(doc(db, 'virtualQueues', entry.queueId), {
      'metrics.challengeFailedCount': increment(1),
      'capacity.totalInQueue': increment(-1),
    })

    cache.delete(`queue:${entry.queueId}`)
  }

  static async activateEntry(entryId: string): Promise<QueueSession> {
    const entry = await this.getQueueEntry(entryId)
    if (!entry) {
      throw new Error('Entry not found')
    }

    if (entry.status !== 'ready') {
      throw new Error('Entry is not ready for activation')
    }

    const queue = await this.getQueue(entry.queueId)
    if (!queue) {
      throw new Error('Queue not found')
    }

    const accessToken = generateAccessToken()
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + queue.config.sessionDuration)

    // Create session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const session: QueueSession = {
      id: sessionId,
      queueId: entry.queueId,
      entryId,
      customerId: entry.customerId,
      status: 'active',
      accessToken,
      startedAt: new Date(),
      expiresAt,
      lastActivityAt: new Date(),
      purchaseCompleted: false,
    }

    await setDoc(doc(db, 'queueSessions', sessionId), {
      ...session,
      startedAt: Timestamp.fromDate(session.startedAt),
      expiresAt: Timestamp.fromDate(session.expiresAt),
      lastActivityAt: Timestamp.fromDate(session.lastActivityAt),
    })

    // Update entry
    await updateDoc(doc(db, 'queueEntries', entryId), {
      status: 'active',
      activatedAt: Timestamp.fromDate(new Date()),
      expiresAt: Timestamp.fromDate(expiresAt),
    })

    // Update queue capacity
    await updateDoc(doc(db, 'virtualQueues', entry.queueId), {
      'capacity.activeUsers': increment(1),
      updatedAt: Timestamp.fromDate(new Date()),
    })

    cache.delete(`queue:${entry.queueId}`)

    return session
  }

  static async completeSession(sessionId: string, purchaseAmount?: number): Promise<void> {
    const docRef = await getDoc(doc(db, 'queueSessions', sessionId))
    if (!docRef.exists()) {
      throw new Error('Session not found')
    }

    const session = docRef.data() as any
    const entry = await this.getQueueEntry(session.entryId)
    if (!entry) return

    const batch = writeBatch(db)

    // Update session
    batch.update(doc(db, 'queueSessions', sessionId), {
      status: 'completed',
      purchaseCompleted: !!purchaseAmount,
      purchaseAmount,
    })

    // Update entry
    batch.update(doc(db, 'queueEntries', session.entryId), {
      status: 'completed',
      completedAt: Timestamp.fromDate(new Date()),
    })

    // Update queue
    batch.update(doc(db, 'virtualQueues', entry.queueId), {
      'capacity.activeUsers': increment(-1),
      'capacity.completedSessions': increment(1),
      'metrics.totalUsersServed': increment(1),
      updatedAt: Timestamp.fromDate(new Date()),
    })

    await batch.commit()
    cache.delete(`queue:${entry.queueId}`)
  }

  static async expireSession(sessionId: string): Promise<void> {
    const docRef = await getDoc(doc(db, 'queueSessions', sessionId))
    if (!docRef.exists()) return

    const session = docRef.data() as any
    const entry = await this.getQueueEntry(session.entryId)
    if (!entry) return

    const batch = writeBatch(db)

    batch.update(doc(db, 'queueSessions', sessionId), {
      status: 'expired',
    })

    batch.update(doc(db, 'queueEntries', session.entryId), {
      status: 'expired',
      completedAt: Timestamp.fromDate(new Date()),
    })

    batch.update(doc(db, 'virtualQueues', entry.queueId), {
      'capacity.activeUsers': increment(-1),
      'capacity.abandonedSessions': increment(1),
      updatedAt: Timestamp.fromDate(new Date()),
    })

    await batch.commit()
    cache.delete(`queue:${entry.queueId}`)
  }

  static async refreshSession(sessionId: string): Promise<{ extended: boolean; newExpiresAt?: Date }> {
    const docRef = await getDoc(doc(db, 'queueSessions', sessionId))
    if (!docRef.exists()) {
      throw new Error('Session not found')
    }

    const session = docRef.data() as any
    if (session.status !== 'active') {
      return { extended: false }
    }

    const entry = await this.getQueueEntry(session.entryId)
    if (!entry) return { extended: false }

    const queue = await this.getQueue(entry.queueId)
    if (!queue) return { extended: false }

    const newExpiresAt = new Date()
    newExpiresAt.setMinutes(newExpiresAt.getMinutes() + queue.config.sessionDuration)

    await updateDoc(doc(db, 'queueSessions', sessionId), {
      lastActivityAt: Timestamp.fromDate(new Date()),
      expiresAt: Timestamp.fromDate(newExpiresAt),
    })

    await updateDoc(doc(db, 'queueEntries', session.entryId), {
      expiresAt: Timestamp.fromDate(newExpiresAt),
    })

    return { extended: true, newExpiresAt }
  }

  static async validateAccessToken(accessToken: string): Promise<{
    valid: boolean
    session?: QueueSession
    entry?: QueueEntry
  }> {
    const q = query(
      collection(db, 'queueSessions'),
      where('accessToken', '==', accessToken),
      where('status', '==', 'active'),
      limit(1)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) {
      return { valid: false }
    }

    const doc_data = snapshot.docs[0]
    const sessionData = doc_data.data()
    const expiresAt = sessionData.expiresAt.toDate()

    if (expiresAt < new Date()) {
      await this.expireSession(doc_data.id)
      return { valid: false }
    }

    const session: QueueSession = {
      ...sessionData,
      id: doc_data.id,
      startedAt: sessionData.startedAt.toDate(),
      expiresAt,
      lastActivityAt: sessionData.lastActivityAt.toDate(),
    } as QueueSession

    const entry = await this.getQueueEntry(session.entryId)

    return { valid: true, session, entry: entry || undefined }
  }

  // ==================== QUEUE PROCESSING ====================

  static async processQueue(queueId: string): Promise<{
    promoted: number
    expired: number
  }> {
    const queue = await this.getQueue(queueId)
    if (!queue || queue.status !== 'active') {
      return { promoted: 0, expired: 0 }
    }

    let promoted = 0
    let expired = 0

    // Check for expired sessions
    const expiredSessionsQuery = query(
      collection(db, 'queueSessions'),
      where('queueId', '==', queueId),
      where('status', '==', 'active'),
      where('expiresAt', '<', Timestamp.fromDate(new Date()))
    )

    const expiredSessions = await getDocs(expiredSessionsQuery)
    for (const sessionDoc of expiredSessions.docs) {
      await this.expireSession(sessionDoc.id)
      expired++
    }

    // Calculate available slots
    const availableSlots = queue.config.maxConcurrentUsers - queue.capacity.activeUsers + expired

    if (availableSlots <= 0) {
      return { promoted, expired }
    }

    // Get waiting entries (sorted by priority and join time)
    let waitingQuery
    if (queue.config.fairnessMode === 'fifo') {
      waitingQuery = query(
        collection(db, 'queueEntries'),
        where('queueId', '==', queueId),
        where('status', '==', 'waiting'),
        orderBy('joinedAt', 'asc'),
        limit(availableSlots)
      )
    } else if (queue.config.fairnessMode === 'priority') {
      waitingQuery = query(
        collection(db, 'queueEntries'),
        where('queueId', '==', queueId),
        where('status', '==', 'waiting'),
        orderBy('priorityScore', 'asc'),
        orderBy('joinedAt', 'asc'),
        limit(availableSlots)
      )
    } else {
      // random or lottery - get all waiting and randomly select
      waitingQuery = query(
        collection(db, 'queueEntries'),
        where('queueId', '==', queueId),
        where('status', '==', 'waiting'),
        limit(availableSlots * 3) // Get more to allow random selection
      )
    }

    const waitingEntries = await getDocs(waitingQuery)
    let entriesToPromote = waitingEntries.docs

    if (queue.config.fairnessMode === 'random' || queue.config.fairnessMode === 'lottery') {
      // Shuffle and take first N
      entriesToPromote = entriesToPromote
        .sort(() => Math.random() - 0.5)
        .slice(0, availableSlots)
    }

    // Promote entries
    for (const entryDoc of entriesToPromote) {
      const entry = entryDoc.data()

      // Skip if challenge required but not passed
      if (entry.challengeStatus === 'pending') continue

      await updateDoc(doc(db, 'queueEntries', entryDoc.id), {
        status: 'ready',
        readyAt: Timestamp.fromDate(new Date()),
      })
      promoted++
    }

    // Update queue throughput rate
    if (promoted > 0) {
      const newThroughputRate = promoted / ((Date.now() - queue.updatedAt.getTime()) / 60000)
      await updateDoc(doc(db, 'virtualQueues', queueId), {
        'capacity.throughputRate': newThroughputRate,
        updatedAt: Timestamp.fromDate(new Date()),
      })
    }

    cache.delete(`queue:${queueId}`)

    return { promoted, expired }
  }

  static async getQueueStats(queueId: string): Promise<{
    queue: VirtualQueue
    waitingCount: number
    readyCount: number
    activeCount: number
    positionDistribution: { min: number; max: number; median: number }
  }> {
    const queue = await this.getQueue(queueId)
    if (!queue) {
      throw new Error('Queue not found')
    }

    const [waitingSnap, readySnap, activeSnap] = await Promise.all([
      getDocs(query(
        collection(db, 'queueEntries'),
        where('queueId', '==', queueId),
        where('status', '==', 'waiting')
      )),
      getDocs(query(
        collection(db, 'queueEntries'),
        where('queueId', '==', queueId),
        where('status', '==', 'ready')
      )),
      getDocs(query(
        collection(db, 'queueEntries'),
        where('queueId', '==', queueId),
        where('status', '==', 'active')
      )),
    ])

    const waitingCount = waitingSnap.size
    const positions = waitingSnap.docs.map((d) => d.data().position || 0).sort((a, b) => a - b)

    return {
      queue,
      waitingCount,
      readyCount: readySnap.size,
      activeCount: activeSnap.size,
      positionDistribution: {
        min: positions[0] || 0,
        max: positions[positions.length - 1] || 0,
        median: positions[Math.floor(positions.length / 2)] || 0,
      },
    }
  }

  // ==================== CAPACITY POOL MANAGEMENT ====================

  static async createCapacityPool(
    data: Omit<CapacityPool, 'id' | 'availableCapacity' | 'reservedCapacity' | 'holdCapacity' | 'soldCapacity' | 'status' | 'lastUpdated'>
  ): Promise<CapacityPool> {
    const poolId = `pool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const pool: CapacityPool = {
      ...data,
      id: poolId,
      availableCapacity: data.totalCapacity,
      reservedCapacity: 0,
      holdCapacity: 0,
      soldCapacity: 0,
      status: 'available',
      lastUpdated: new Date(),
    }

    await setDoc(doc(db, 'capacityPools', poolId), {
      ...pool,
      lastUpdated: Timestamp.fromDate(pool.lastUpdated),
    })

    return pool
  }

  static async getCapacityPool(poolId: string): Promise<CapacityPool | null> {
    const cached = getCached<CapacityPool>(`pool:${poolId}`)
    if (cached) return cached

    const docRef = await getDoc(doc(db, 'capacityPools', poolId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    const pool: CapacityPool = {
      ...data,
      id: docRef.id,
      lastUpdated: data.lastUpdated.toDate(),
    } as CapacityPool

    setCache(`pool:${poolId}`, pool)
    return pool
  }

  static async getCapacityPools(eventId: string): Promise<CapacityPool[]> {
    const q = query(
      collection(db, 'capacityPools'),
      where('eventId', '==', eventId)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        lastUpdated: data.lastUpdated.toDate(),
      } as CapacityPool
    })
  }

  static async holdCapacity(
    poolId: string,
    quantity: number,
    sessionId?: string,
    customerId?: string,
    ticketType?: string,
    holdDurationMinutes: number = 15
  ): Promise<CapacityHold> {
    const pool = await this.getCapacityPool(poolId)
    if (!pool) {
      throw new Error('Capacity pool not found')
    }

    if (pool.availableCapacity < quantity) {
      throw new Error('Insufficient capacity')
    }

    const holdId = `hold_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + holdDurationMinutes)

    const hold: CapacityHold = {
      id: holdId,
      poolId,
      sessionId,
      customerId,
      quantity,
      ticketType,
      status: 'held',
      createdAt: new Date(),
      expiresAt,
    }

    await setDoc(doc(db, 'capacityHolds', holdId), {
      ...hold,
      createdAt: Timestamp.fromDate(hold.createdAt),
      expiresAt: Timestamp.fromDate(hold.expiresAt),
    })

    // Update pool
    await updateDoc(doc(db, 'capacityPools', poolId), {
      availableCapacity: increment(-quantity),
      holdCapacity: increment(quantity),
      lastUpdated: Timestamp.fromDate(new Date()),
    })

    cache.delete(`pool:${poolId}`)

    return hold
  }

  static async releaseHold(holdId: string): Promise<void> {
    const docRef = await getDoc(doc(db, 'capacityHolds', holdId))
    if (!docRef.exists()) return

    const hold = docRef.data() as CapacityHold
    if (hold.status !== 'held') return

    const batch = writeBatch(db)

    batch.update(doc(db, 'capacityHolds', holdId), {
      status: 'released',
    })

    batch.update(doc(db, 'capacityPools', hold.poolId), {
      availableCapacity: increment(hold.quantity),
      holdCapacity: increment(-hold.quantity),
      lastUpdated: Timestamp.fromDate(new Date()),
    })

    await batch.commit()
    cache.delete(`pool:${hold.poolId}`)
  }

  static async convertHoldToSale(holdId: string): Promise<void> {
    const docRef = await getDoc(doc(db, 'capacityHolds', holdId))
    if (!docRef.exists()) {
      throw new Error('Hold not found')
    }

    const hold = docRef.data() as CapacityHold
    if (hold.status !== 'held') {
      throw new Error('Hold is not active')
    }

    const batch = writeBatch(db)

    batch.update(doc(db, 'capacityHolds', holdId), {
      status: 'converted',
      convertedAt: Timestamp.fromDate(new Date()),
    })

    batch.update(doc(db, 'capacityPools', hold.poolId), {
      holdCapacity: increment(-hold.quantity),
      soldCapacity: increment(hold.quantity),
      lastUpdated: Timestamp.fromDate(new Date()),
    })

    await batch.commit()
    cache.delete(`pool:${hold.poolId}`)

    // Update pool status if needed
    const pool = await this.getCapacityPool(hold.poolId)
    if (pool) {
      let newStatus: CapacityPool['status'] = 'available'
      const availablePercent = (pool.availableCapacity / pool.totalCapacity) * 100
      if (availablePercent <= 0) newStatus = 'soldout'
      else if (availablePercent <= 10) newStatus = 'limited'

      if (newStatus !== pool.status) {
        await updateDoc(doc(db, 'capacityPools', hold.poolId), { status: newStatus })
      }
    }
  }

  static async processExpiredHolds(): Promise<number> {
    const q = query(
      collection(db, 'capacityHolds'),
      where('status', '==', 'held'),
      where('expiresAt', '<', Timestamp.fromDate(new Date()))
    )

    const snapshot = await getDocs(q)
    let released = 0

    for (const holdDoc of snapshot.docs) {
      await this.releaseHold(holdDoc.id)
      released++
    }

    return released
  }

  // ==================== WAITLIST MANAGEMENT ====================

  static async addToWaitlist(
    data: Omit<WaitlistEntry, 'id' | 'status' | 'priority' | 'createdAt'>
  ): Promise<WaitlistEntry> {
    const entryId = `waitlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Calculate priority based on existing waitlist size
    const existingQuery = query(
      collection(db, 'waitlistEntries'),
      where('promoterId', '==', data.promoterId),
      where('eventId', '==', data.eventId),
      where('status', '==', 'waiting')
    )
    const existingSnap = await getDocs(existingQuery)
    const priority = existingSnap.size + 1

    const entry: WaitlistEntry = {
      ...data,
      id: entryId,
      status: 'waiting',
      priority,
      createdAt: new Date(),
    }

    await setDoc(doc(db, 'waitlistEntries', entryId), {
      ...entry,
      createdAt: Timestamp.fromDate(entry.createdAt),
    })

    return entry
  }

  static async getWaitlist(
    eventId: string,
    filters?: {
      sectionId?: string
      ticketType?: string
      status?: WaitlistEntry['status']
    }
  ): Promise<WaitlistEntry[]> {
    let q = query(
      collection(db, 'waitlistEntries'),
      where('eventId', '==', eventId),
      orderBy('priority', 'asc')
    )

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status))
    }

    const snapshot = await getDocs(q)
    let entries = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt.toDate(),
        notifiedAt: data.notifiedAt?.toDate(),
        purchaseDeadline: data.purchaseDeadline?.toDate(),
      } as WaitlistEntry
    })

    if (filters?.sectionId) {
      entries = entries.filter((e) => e.sectionId === filters.sectionId)
    }
    if (filters?.ticketType) {
      entries = entries.filter((e) => e.ticketType === filters.ticketType)
    }

    return entries
  }

  static async notifyWaitlistEntries(
    eventId: string,
    availableQuantity: number,
    ticketType?: string
  ): Promise<WaitlistEntry[]> {
    const entries = await this.getWaitlist(eventId, {
      ticketType,
      status: 'waiting',
    })

    const notified: WaitlistEntry[] = []
    let remainingQuantity = availableQuantity

    for (const entry of entries) {
      if (remainingQuantity <= 0) break
      if (entry.quantity > remainingQuantity) continue

      const purchaseDeadline = new Date()
      purchaseDeadline.setHours(purchaseDeadline.getHours() + 24)

      await updateDoc(doc(db, 'waitlistEntries', entry.id), {
        status: 'notified',
        notifiedAt: Timestamp.fromDate(new Date()),
        purchaseDeadline: Timestamp.fromDate(purchaseDeadline),
      })

      remainingQuantity -= entry.quantity
      notified.push({
        ...entry,
        status: 'notified',
        notifiedAt: new Date(),
        purchaseDeadline,
      })
    }

    return notified
  }

  static async processExpiredWaitlistNotifications(): Promise<number> {
    const q = query(
      collection(db, 'waitlistEntries'),
      where('status', '==', 'notified'),
      where('purchaseDeadline', '<', Timestamp.fromDate(new Date()))
    )

    const snapshot = await getDocs(q)
    let expired = 0

    for (const entryDoc of snapshot.docs) {
      await updateDoc(doc(db, 'waitlistEntries', entryDoc.id), {
        status: 'expired',
      })
      expired++
    }

    return expired
  }

  static async markWaitlistPurchased(entryId: string): Promise<void> {
    await updateDoc(doc(db, 'waitlistEntries', entryId), {
      status: 'purchased',
    })
  }

  static async cancelWaitlistEntry(entryId: string): Promise<void> {
    await updateDoc(doc(db, 'waitlistEntries', entryId), {
      status: 'cancelled',
    })
  }

  // ==================== CACHE MANAGEMENT ====================

  static clearCache(): void {
    cache.clear()
  }
}
