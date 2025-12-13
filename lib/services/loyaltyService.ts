/**
 * Loyalty & Rewards Program Service
 * Comprehensive customer loyalty and rewards management
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

export interface LoyaltyProgram {
  id?: string
  promoterId: string
  name: string
  description: string
  status: 'active' | 'paused' | 'ended'
  tiers: LoyaltyTier[]
  pointsConfig: {
    pointsPerDollar: number
    bonusCategories: {
      category: string // 'vip_events', 'weekday', 'early_bird', etc.
      multiplier: number
    }[]
    expirationMonths: number // 0 = never expires
    minimumRedemption: number
  }
  referralConfig: {
    enabled: boolean
    pointsPerReferral: number
    refereeBonus: number
    maxReferralsPerMonth: number
  }
  socialConfig: {
    enabled: boolean
    sharePoints: number
    platforms: ('facebook' | 'twitter' | 'instagram' | 'tiktok')[]
    maxSharesPerDay: number
  }
  createdAt: Date
  updatedAt: Date
}

export interface LoyaltyTier {
  id: string
  name: string
  level: number // 1 = lowest, ascending
  minPoints: number
  maxPoints?: number // undefined = unlimited
  benefits: {
    type: 'discount' | 'free_upgrade' | 'early_access' | 'priority_checkout' | 'exclusive_events' | 'free_tickets' | 'custom'
    value: any
    description: string
  }[]
  color: string
  icon: string
}

export interface LoyaltyMember {
  id?: string
  promoterId: string
  customerId: string
  programId: string
  currentTier: string
  totalPointsEarned: number
  currentPoints: number
  pointsToNextTier: number
  lifetimeValue: number
  referralCode: string
  referredBy?: string
  referralCount: number
  joinedAt: Date
  tierUpdatedAt: Date
  lastActivityAt: Date
  preferences: {
    emailNotifications: boolean
    smsNotifications: boolean
    marketingOptIn: boolean
  }
}

export interface PointsTransaction {
  id?: string
  memberId: string
  promoterId: string
  type: 'earn' | 'redeem' | 'expire' | 'adjust' | 'referral' | 'social' | 'bonus'
  points: number
  balance: number
  source: {
    type: 'purchase' | 'referral' | 'social_share' | 'bonus' | 'manual' | 'tier_upgrade' | 'redemption' | 'expiration'
    referenceId?: string
    description: string
  }
  metadata?: Record<string, any>
  createdAt: Date
  expiresAt?: Date
}

export interface Reward {
  id?: string
  promoterId: string
  programId: string
  name: string
  description: string
  type: 'discount_percentage' | 'discount_fixed' | 'free_ticket' | 'upgrade' | 'merchandise' | 'experience' | 'early_access'
  pointsCost: number
  value: any // depends on type
  stock?: number // undefined = unlimited
  stockUsed: number
  minTier?: string
  validFrom?: Date
  validTo?: Date
  terms: string
  status: 'active' | 'inactive' | 'out_of_stock'
  redemptionCount: number
  createdAt: Date
  updatedAt: Date
}

export interface Redemption {
  id?: string
  memberId: string
  promoterId: string
  rewardId: string
  rewardName: string
  pointsUsed: number
  status: 'pending' | 'confirmed' | 'used' | 'expired' | 'cancelled'
  code: string
  validUntil: Date
  usedAt?: Date
  orderId?: string
  metadata?: Record<string, any>
  createdAt: Date
}

export interface Referral {
  id?: string
  promoterId: string
  programId: string
  referrerId: string
  referrerMemberId: string
  refereeEmail: string
  refereeCustomerId?: string
  refereeMemberId?: string
  status: 'pending' | 'signed_up' | 'purchased' | 'rewarded'
  referralCode: string
  pointsAwarded?: number
  purchaseAmount?: number
  createdAt: Date
  convertedAt?: Date
  rewardedAt?: Date
}

// ==================== SERVICE ====================

class LoyaltyServiceClass {
  private auditService: AuditService

  constructor() {
    this.auditService = new AuditService()
  }

  // ==================== PROGRAM MANAGEMENT ====================

  async createProgram(
    program: Omit<LoyaltyProgram, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<LoyaltyProgram> {
    const now = new Date()
    const programData = {
      ...program,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    }

    const docRef = await addDoc(collection(db, 'loyaltyPrograms'), programData)

    await this.auditService.logActivity({
      userId,
      action: 'create',
      resourceType: 'loyalty_program',
      resourceId: docRef.id,
      details: { programName: program.name },
      ipAddress: '',
      userAgent: '',
    })

    return {
      id: docRef.id,
      ...program,
      createdAt: now,
      updatedAt: now,
    }
  }

  async getProgram(programId: string): Promise<LoyaltyProgram | null> {
    const docSnap = await getDoc(doc(db, 'loyaltyPrograms', programId))
    if (!docSnap.exists()) return null

    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as LoyaltyProgram
  }

  async getProgramByPromoter(promoterId: string): Promise<LoyaltyProgram | null> {
    const q = query(
      collection(db, 'loyaltyPrograms'),
      where('promoterId', '==', promoterId),
      where('status', '==', 'active'),
      limit(1)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as LoyaltyProgram
  }

  async updateProgram(
    programId: string,
    updates: Partial<LoyaltyProgram>,
    userId: string
  ): Promise<void> {
    await updateDoc(doc(db, 'loyaltyPrograms', programId), {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    })

    await this.auditService.logActivity({
      userId,
      action: 'update',
      resourceType: 'loyalty_program',
      resourceId: programId,
      details: { updates: Object.keys(updates) },
      ipAddress: '',
      userAgent: '',
    })
  }

  // ==================== MEMBER MANAGEMENT ====================

  async enrollMember(
    data: {
      promoterId: string
      customerId: string
      programId: string
      referralCode?: string
    }
  ): Promise<LoyaltyMember> {
    // Check if already a member
    const existingQuery = query(
      collection(db, 'loyaltyMembers'),
      where('promoterId', '==', data.promoterId),
      where('customerId', '==', data.customerId)
    )
    const existing = await getDocs(existingQuery)
    if (!existing.empty) {
      const doc = existing.docs[0]
      return {
        id: doc.id,
        ...doc.data(),
        joinedAt: doc.data().joinedAt?.toDate(),
        tierUpdatedAt: doc.data().tierUpdatedAt?.toDate(),
        lastActivityAt: doc.data().lastActivityAt?.toDate(),
      } as LoyaltyMember
    }

    const program = await this.getProgram(data.programId)
    if (!program) throw new Error('Program not found')

    const lowestTier = program.tiers.reduce((lowest, tier) =>
      tier.level < lowest.level ? tier : lowest
    )

    const now = new Date()
    const referralCode = this.generateReferralCode()

    // Check if referred by someone
    let referredBy: string | undefined
    if (data.referralCode) {
      const referrer = await this.getMemberByReferralCode(data.promoterId, data.referralCode)
      if (referrer) {
        referredBy = referrer.id
      }
    }

    const memberData: Omit<LoyaltyMember, 'id'> = {
      promoterId: data.promoterId,
      customerId: data.customerId,
      programId: data.programId,
      currentTier: lowestTier.id,
      totalPointsEarned: 0,
      currentPoints: 0,
      pointsToNextTier: this.calculatePointsToNextTier(0, program.tiers, lowestTier.id),
      lifetimeValue: 0,
      referralCode,
      referredBy,
      referralCount: 0,
      joinedAt: now,
      tierUpdatedAt: now,
      lastActivityAt: now,
      preferences: {
        emailNotifications: true,
        smsNotifications: false,
        marketingOptIn: true,
      },
    }

    const docRef = await addDoc(collection(db, 'loyaltyMembers'), {
      ...memberData,
      joinedAt: Timestamp.fromDate(now),
      tierUpdatedAt: Timestamp.fromDate(now),
      lastActivityAt: Timestamp.fromDate(now),
    })

    // Handle referral tracking
    if (referredBy && data.referralCode) {
      await this.trackReferralSignup(data.promoterId, data.referralCode, data.customerId, docRef.id)
    }

    // Award signup bonus if configured
    if (program.referralConfig.enabled && program.referralConfig.refereeBonus > 0 && referredBy) {
      await this.awardPoints(docRef.id, {
        type: 'bonus',
        points: program.referralConfig.refereeBonus,
        source: {
          type: 'bonus',
          description: 'Welcome bonus for joining via referral',
        },
      })
    }

    return { id: docRef.id, ...memberData }
  }

  async getMember(memberId: string): Promise<LoyaltyMember | null> {
    const docSnap = await getDoc(doc(db, 'loyaltyMembers', memberId))
    if (!docSnap.exists()) return null

    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      joinedAt: data.joinedAt?.toDate(),
      tierUpdatedAt: data.tierUpdatedAt?.toDate(),
      lastActivityAt: data.lastActivityAt?.toDate(),
    } as LoyaltyMember
  }

  async getMemberByCustomer(promoterId: string, customerId: string): Promise<LoyaltyMember | null> {
    const q = query(
      collection(db, 'loyaltyMembers'),
      where('promoterId', '==', promoterId),
      where('customerId', '==', customerId),
      limit(1)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      joinedAt: data.joinedAt?.toDate(),
      tierUpdatedAt: data.tierUpdatedAt?.toDate(),
      lastActivityAt: data.lastActivityAt?.toDate(),
    } as LoyaltyMember
  }

  async getMemberByReferralCode(promoterId: string, code: string): Promise<LoyaltyMember | null> {
    const q = query(
      collection(db, 'loyaltyMembers'),
      where('promoterId', '==', promoterId),
      where('referralCode', '==', code.toUpperCase()),
      limit(1)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      joinedAt: data.joinedAt?.toDate(),
      tierUpdatedAt: data.tierUpdatedAt?.toDate(),
      lastActivityAt: data.lastActivityAt?.toDate(),
    } as LoyaltyMember
  }

  async getMembers(
    promoterId: string,
    filters?: {
      tier?: string
      minPoints?: number
      maxPoints?: number
    },
    pagination?: { limit: number; offset: number }
  ): Promise<{ members: LoyaltyMember[]; total: number }> {
    let q = query(
      collection(db, 'loyaltyMembers'),
      where('promoterId', '==', promoterId),
      orderBy('totalPointsEarned', 'desc')
    )

    const snapshot = await getDocs(q)
    let members = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      joinedAt: doc.data().joinedAt?.toDate(),
      tierUpdatedAt: doc.data().tierUpdatedAt?.toDate(),
      lastActivityAt: doc.data().lastActivityAt?.toDate(),
    })) as LoyaltyMember[]

    // Apply filters
    if (filters?.tier) {
      members = members.filter((m) => m.currentTier === filters.tier)
    }
    if (filters?.minPoints !== undefined) {
      members = members.filter((m) => m.currentPoints >= filters.minPoints!)
    }
    if (filters?.maxPoints !== undefined) {
      members = members.filter((m) => m.currentPoints <= filters.maxPoints!)
    }

    const total = members.length

    if (pagination) {
      members = members.slice(pagination.offset, pagination.offset + pagination.limit)
    }

    return { members, total }
  }

  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  private calculatePointsToNextTier(
    currentPoints: number,
    tiers: LoyaltyTier[],
    currentTierId: string
  ): number {
    const sortedTiers = [...tiers].sort((a, b) => a.level - b.level)
    const currentTierIndex = sortedTiers.findIndex((t) => t.id === currentTierId)

    if (currentTierIndex === sortedTiers.length - 1) {
      return 0 // Already at highest tier
    }

    const nextTier = sortedTiers[currentTierIndex + 1]
    return Math.max(0, nextTier.minPoints - currentPoints)
  }

  // ==================== POINTS MANAGEMENT ====================

  async awardPoints(
    memberId: string,
    transaction: {
      type: PointsTransaction['type']
      points: number
      source: PointsTransaction['source']
      metadata?: Record<string, any>
    }
  ): Promise<PointsTransaction> {
    const member = await this.getMember(memberId)
    if (!member) throw new Error('Member not found')

    const program = await this.getProgram(member.programId)
    if (!program) throw new Error('Program not found')

    const now = new Date()
    const newBalance = member.currentPoints + transaction.points

    // Calculate expiration if configured
    let expiresAt: Date | undefined
    if (program.pointsConfig.expirationMonths > 0 && transaction.type === 'earn') {
      expiresAt = new Date(now)
      expiresAt.setMonth(expiresAt.getMonth() + program.pointsConfig.expirationMonths)
    }

    // Create transaction record
    const transactionData: Omit<PointsTransaction, 'id'> = {
      memberId,
      promoterId: member.promoterId,
      type: transaction.type,
      points: transaction.points,
      balance: newBalance,
      source: transaction.source,
      metadata: transaction.metadata,
      createdAt: now,
      expiresAt,
    }

    const docRef = await addDoc(collection(db, 'pointsTransactions'), {
      ...transactionData,
      createdAt: Timestamp.fromDate(now),
      expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
    })

    // Update member
    const updates: any = {
      currentPoints: newBalance,
      totalPointsEarned: member.totalPointsEarned + (transaction.points > 0 ? transaction.points : 0),
      lastActivityAt: Timestamp.fromDate(now),
    }

    // Check for tier upgrade
    const newTier = this.calculateTier(newBalance, program.tiers)
    if (newTier.id !== member.currentTier) {
      updates.currentTier = newTier.id
      updates.tierUpdatedAt = Timestamp.fromDate(now)

      // Award tier upgrade bonus if moving up
      const currentTierLevel = program.tiers.find((t) => t.id === member.currentTier)?.level || 0
      if (newTier.level > currentTierLevel) {
        // Could trigger tier upgrade notification here
      }
    }

    updates.pointsToNextTier = this.calculatePointsToNextTier(newBalance, program.tiers, newTier.id)

    await updateDoc(doc(db, 'loyaltyMembers', memberId), updates)

    return { id: docRef.id, ...transactionData }
  }

  async redeemPoints(
    memberId: string,
    points: number,
    source: PointsTransaction['source']
  ): Promise<PointsTransaction> {
    const member = await this.getMember(memberId)
    if (!member) throw new Error('Member not found')

    if (member.currentPoints < points) {
      throw new Error('Insufficient points')
    }

    return this.awardPoints(memberId, {
      type: 'redeem',
      points: -points,
      source,
    })
  }

  async calculatePointsForPurchase(
    programId: string,
    purchaseAmount: number,
    categories?: string[]
  ): Promise<{ basePoints: number; bonusPoints: number; totalPoints: number }> {
    const program = await this.getProgram(programId)
    if (!program) throw new Error('Program not found')

    const basePoints = Math.floor(purchaseAmount * program.pointsConfig.pointsPerDollar)

    let bonusMultiplier = 1
    if (categories && program.pointsConfig.bonusCategories) {
      for (const category of categories) {
        const bonus = program.pointsConfig.bonusCategories.find((b) => b.category === category)
        if (bonus && bonus.multiplier > bonusMultiplier) {
          bonusMultiplier = bonus.multiplier
        }
      }
    }

    const bonusPoints = Math.floor(basePoints * (bonusMultiplier - 1))
    const totalPoints = basePoints + bonusPoints

    return { basePoints, bonusPoints, totalPoints }
  }

  async processPurchasePoints(
    memberId: string,
    orderId: string,
    purchaseAmount: number,
    categories?: string[]
  ): Promise<PointsTransaction> {
    const member = await this.getMember(memberId)
    if (!member) throw new Error('Member not found')

    const pointsCalc = await this.calculatePointsForPurchase(
      member.programId,
      purchaseAmount,
      categories
    )

    // Update lifetime value
    await updateDoc(doc(db, 'loyaltyMembers', memberId), {
      lifetimeValue: increment(purchaseAmount),
    })

    return this.awardPoints(memberId, {
      type: 'earn',
      points: pointsCalc.totalPoints,
      source: {
        type: 'purchase',
        referenceId: orderId,
        description: `Points earned from purchase of $${purchaseAmount.toFixed(2)}`,
      },
      metadata: {
        purchaseAmount,
        basePoints: pointsCalc.basePoints,
        bonusPoints: pointsCalc.bonusPoints,
        categories,
      },
    })
  }

  async getPointsHistory(
    memberId: string,
    filters?: {
      type?: PointsTransaction['type'][]
      dateRange?: { start: Date; end: Date }
    },
    limit_?: number
  ): Promise<PointsTransaction[]> {
    let q = query(
      collection(db, 'pointsTransactions'),
      where('memberId', '==', memberId),
      orderBy('createdAt', 'desc')
    )

    if (limit_) {
      q = query(q, limit(limit_))
    }

    const snapshot = await getDocs(q)
    let transactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      expiresAt: doc.data().expiresAt?.toDate(),
    })) as PointsTransaction[]

    if (filters?.type?.length) {
      transactions = transactions.filter((t) => filters.type!.includes(t.type))
    }

    if (filters?.dateRange) {
      transactions = transactions.filter(
        (t) =>
          t.createdAt >= filters.dateRange!.start && t.createdAt <= filters.dateRange!.end
      )
    }

    return transactions
  }

  private calculateTier(points: number, tiers: LoyaltyTier[]): LoyaltyTier {
    const sortedTiers = [...tiers].sort((a, b) => b.level - a.level) // Highest first

    for (const tier of sortedTiers) {
      if (points >= tier.minPoints) {
        return tier
      }
    }

    // Return lowest tier as fallback
    return tiers.reduce((lowest, tier) =>
      tier.level < lowest.level ? tier : lowest
    )
  }

  // ==================== REWARDS MANAGEMENT ====================

  async createReward(
    reward: Omit<Reward, 'id' | 'createdAt' | 'updatedAt' | 'stockUsed' | 'redemptionCount'>
  ): Promise<Reward> {
    const now = new Date()
    const rewardData = {
      ...reward,
      stockUsed: 0,
      redemptionCount: 0,
      validFrom: reward.validFrom ? Timestamp.fromDate(reward.validFrom) : null,
      validTo: reward.validTo ? Timestamp.fromDate(reward.validTo) : null,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    }

    const docRef = await addDoc(collection(db, 'loyaltyRewards'), rewardData)

    return {
      id: docRef.id,
      ...reward,
      stockUsed: 0,
      redemptionCount: 0,
      createdAt: now,
      updatedAt: now,
    }
  }

  async getRewards(
    promoterId: string,
    filters?: {
      status?: Reward['status']
      type?: Reward['type']
      minTier?: string
    }
  ): Promise<Reward[]> {
    let q = query(
      collection(db, 'loyaltyRewards'),
      where('promoterId', '==', promoterId),
      orderBy('pointsCost', 'asc')
    )

    const snapshot = await getDocs(q)
    let rewards = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      validFrom: doc.data().validFrom?.toDate(),
      validTo: doc.data().validTo?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Reward[]

    if (filters?.status) {
      rewards = rewards.filter((r) => r.status === filters.status)
    }

    if (filters?.type) {
      rewards = rewards.filter((r) => r.type === filters.type)
    }

    return rewards
  }

  async getAvailableRewards(memberId: string): Promise<Reward[]> {
    const member = await this.getMember(memberId)
    if (!member) throw new Error('Member not found')

    const program = await this.getProgram(member.programId)
    if (!program) throw new Error('Program not found')

    const rewards = await this.getRewards(member.promoterId, { status: 'active' })
    const now = new Date()

    // Get member's tier level
    const memberTier = program.tiers.find((t) => t.id === member.currentTier)
    const memberTierLevel = memberTier?.level || 0

    return rewards.filter((reward) => {
      // Check if in stock
      if (reward.stock !== undefined && reward.stockUsed >= reward.stock) {
        return false
      }

      // Check validity dates
      if (reward.validFrom && reward.validFrom > now) return false
      if (reward.validTo && reward.validTo < now) return false

      // Check tier requirement
      if (reward.minTier) {
        const requiredTier = program.tiers.find((t) => t.id === reward.minTier)
        if (requiredTier && requiredTier.level > memberTierLevel) {
          return false
        }
      }

      return true
    })
  }

  async redeemReward(memberId: string, rewardId: string): Promise<Redemption> {
    const member = await this.getMember(memberId)
    if (!member) throw new Error('Member not found')

    const rewardDoc = await getDoc(doc(db, 'loyaltyRewards', rewardId))
    if (!rewardDoc.exists()) throw new Error('Reward not found')

    const reward = {
      id: rewardDoc.id,
      ...rewardDoc.data(),
    } as Reward

    // Validate
    if (reward.status !== 'active') {
      throw new Error('Reward is not available')
    }

    if (member.currentPoints < reward.pointsCost) {
      throw new Error('Insufficient points')
    }

    if (reward.stock !== undefined && reward.stockUsed >= reward.stock) {
      throw new Error('Reward is out of stock')
    }

    // Deduct points
    await this.redeemPoints(memberId, reward.pointsCost, {
      type: 'redemption',
      referenceId: rewardId,
      description: `Redeemed: ${reward.name}`,
    })

    // Create redemption
    const now = new Date()
    const validUntil = new Date(now)
    validUntil.setDate(validUntil.getDate() + 30) // 30 day validity

    const redemptionData: Omit<Redemption, 'id'> = {
      memberId,
      promoterId: member.promoterId,
      rewardId,
      rewardName: reward.name,
      pointsUsed: reward.pointsCost,
      status: 'pending',
      code: this.generateRedemptionCode(),
      validUntil,
      createdAt: now,
    }

    const docRef = await addDoc(collection(db, 'loyaltyRedemptions'), {
      ...redemptionData,
      validUntil: Timestamp.fromDate(validUntil),
      createdAt: Timestamp.fromDate(now),
    })

    // Update reward stats
    await updateDoc(doc(db, 'loyaltyRewards', rewardId), {
      stockUsed: increment(1),
      redemptionCount: increment(1),
      updatedAt: Timestamp.fromDate(now),
    })

    return { id: docRef.id, ...redemptionData }
  }

  private generateRedemptionCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = 'RWD-'
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  async getRedemptions(
    memberId: string,
    status?: Redemption['status'][]
  ): Promise<Redemption[]> {
    let q = query(
      collection(db, 'loyaltyRedemptions'),
      where('memberId', '==', memberId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    let redemptions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      validUntil: doc.data().validUntil?.toDate(),
      usedAt: doc.data().usedAt?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as Redemption[]

    if (status?.length) {
      redemptions = redemptions.filter((r) => status.includes(r.status))
    }

    return redemptions
  }

  async useRedemption(redemptionId: string, orderId?: string): Promise<void> {
    const redemptionDoc = await getDoc(doc(db, 'loyaltyRedemptions', redemptionId))
    if (!redemptionDoc.exists()) throw new Error('Redemption not found')

    const redemption = redemptionDoc.data()
    if (redemption.status !== 'pending' && redemption.status !== 'confirmed') {
      throw new Error('Redemption cannot be used')
    }

    if (redemption.validUntil.toDate() < new Date()) {
      throw new Error('Redemption has expired')
    }

    await updateDoc(doc(db, 'loyaltyRedemptions', redemptionId), {
      status: 'used',
      usedAt: Timestamp.fromDate(new Date()),
      orderId,
    })
  }

  async validateRedemptionCode(code: string): Promise<Redemption | null> {
    const q = query(
      collection(db, 'loyaltyRedemptions'),
      where('code', '==', code.toUpperCase()),
      limit(1)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    return {
      id: doc.id,
      ...doc.data(),
      validUntil: doc.data().validUntil?.toDate(),
      usedAt: doc.data().usedAt?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    } as Redemption
  }

  // ==================== REFERRAL MANAGEMENT ====================

  async createReferral(
    promoterId: string,
    programId: string,
    referrerId: string,
    refereeEmail: string
  ): Promise<Referral> {
    const referrer = await this.getMember(referrerId)
    if (!referrer) throw new Error('Referrer not found')

    // Check for existing referral
    const existingQuery = query(
      collection(db, 'loyaltyReferrals'),
      where('promoterId', '==', promoterId),
      where('refereeEmail', '==', refereeEmail.toLowerCase())
    )
    const existing = await getDocs(existingQuery)
    if (!existing.empty) {
      throw new Error('Referral already exists for this email')
    }

    const now = new Date()
    const referralData: Omit<Referral, 'id'> = {
      promoterId,
      programId,
      referrerId,
      referrerMemberId: referrerId,
      refereeEmail: refereeEmail.toLowerCase(),
      status: 'pending',
      referralCode: referrer.referralCode,
      createdAt: now,
    }

    const docRef = await addDoc(collection(db, 'loyaltyReferrals'), {
      ...referralData,
      createdAt: Timestamp.fromDate(now),
    })

    return { id: docRef.id, ...referralData }
  }

  async trackReferralSignup(
    promoterId: string,
    referralCode: string,
    refereeCustomerId: string,
    refereeMemberId: string
  ): Promise<void> {
    const q = query(
      collection(db, 'loyaltyReferrals'),
      where('promoterId', '==', promoterId),
      where('referralCode', '==', referralCode.toUpperCase()),
      where('status', '==', 'pending')
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return

    const referralDoc = snapshot.docs[0]
    await updateDoc(doc(db, 'loyaltyReferrals', referralDoc.id), {
      status: 'signed_up',
      refereeCustomerId,
      refereeMemberId,
      convertedAt: Timestamp.fromDate(new Date()),
    })
  }

  async processReferralPurchase(
    memberId: string,
    purchaseAmount: number,
    orderId: string
  ): Promise<void> {
    const member = await this.getMember(memberId)
    if (!member || !member.referredBy) return

    // Find the referral record
    const q = query(
      collection(db, 'loyaltyReferrals'),
      where('refereeMemberId', '==', memberId),
      where('status', 'in', ['signed_up', 'purchased'])
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return

    const referralDoc = snapshot.docs[0]
    const referral = referralDoc.data()

    // Only process if this is the first purchase (status is 'signed_up')
    if (referral.status !== 'signed_up') return

    const program = await this.getProgram(member.programId)
    if (!program || !program.referralConfig.enabled) return

    // Update referral status
    await updateDoc(doc(db, 'loyaltyReferrals', referralDoc.id), {
      status: 'purchased',
      purchaseAmount,
    })

    // Award points to referrer
    await this.awardPoints(referral.referrerMemberId, {
      type: 'referral',
      points: program.referralConfig.pointsPerReferral,
      source: {
        type: 'referral',
        referenceId: orderId,
        description: `Referral bonus - ${referral.refereeEmail} made a purchase`,
      },
    })

    // Update referral as rewarded
    await updateDoc(doc(db, 'loyaltyReferrals', referralDoc.id), {
      status: 'rewarded',
      pointsAwarded: program.referralConfig.pointsPerReferral,
      rewardedAt: Timestamp.fromDate(new Date()),
    })

    // Update referrer's referral count
    await updateDoc(doc(db, 'loyaltyMembers', referral.referrerMemberId), {
      referralCount: increment(1),
    })
  }

  async getReferrals(memberId: string): Promise<Referral[]> {
    const q = query(
      collection(db, 'loyaltyReferrals'),
      where('referrerMemberId', '==', memberId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      convertedAt: doc.data().convertedAt?.toDate(),
      rewardedAt: doc.data().rewardedAt?.toDate(),
    })) as Referral[]
  }

  // ==================== SOCIAL SHARING ====================

  async awardSocialShare(
    memberId: string,
    platform: 'facebook' | 'twitter' | 'instagram' | 'tiktok',
    contentId: string
  ): Promise<PointsTransaction | null> {
    const member = await this.getMember(memberId)
    if (!member) throw new Error('Member not found')

    const program = await this.getProgram(member.programId)
    if (!program || !program.socialConfig.enabled) return null

    if (!program.socialConfig.platforms.includes(platform)) return null

    // Check daily limit
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todaySharesQuery = query(
      collection(db, 'pointsTransactions'),
      where('memberId', '==', memberId),
      where('type', '==', 'social'),
      where('createdAt', '>=', Timestamp.fromDate(today))
    )
    const todayShares = await getDocs(todaySharesQuery)

    if (todayShares.size >= program.socialConfig.maxSharesPerDay) {
      return null // Daily limit reached
    }

    // Check for duplicate share
    const duplicateQuery = query(
      collection(db, 'pointsTransactions'),
      where('memberId', '==', memberId),
      where('type', '==', 'social'),
      where('metadata.platform', '==', platform),
      where('metadata.contentId', '==', contentId)
    )
    const duplicate = await getDocs(duplicateQuery)

    if (!duplicate.empty) {
      return null // Already shared this content
    }

    return this.awardPoints(memberId, {
      type: 'social',
      points: program.socialConfig.sharePoints,
      source: {
        type: 'social_share',
        referenceId: contentId,
        description: `Shared on ${platform}`,
      },
      metadata: {
        platform,
        contentId,
      },
    })
  }

  // ==================== ANALYTICS ====================

  async getMemberAnalytics(memberId: string): Promise<{
    member: LoyaltyMember
    tierProgress: { current: string; next: string | null; progressPercentage: number }
    earningsSummary: { thisMonth: number; lastMonth: number; allTime: number }
    redemptionsSummary: { total: number; pending: number; used: number }
    referralsSummary: { total: number; converted: number; pointsEarned: number }
  }> {
    const member = await this.getMember(memberId)
    if (!member) throw new Error('Member not found')

    const program = await this.getProgram(member.programId)
    if (!program) throw new Error('Program not found')

    // Tier progress
    const sortedTiers = [...program.tiers].sort((a, b) => a.level - b.level)
    const currentTierIndex = sortedTiers.findIndex((t) => t.id === member.currentTier)
    const currentTier = sortedTiers[currentTierIndex]
    const nextTier = currentTierIndex < sortedTiers.length - 1 ? sortedTiers[currentTierIndex + 1] : null

    let progressPercentage = 100
    if (nextTier) {
      const tierRange = nextTier.minPoints - currentTier.minPoints
      const memberProgress = member.currentPoints - currentTier.minPoints
      progressPercentage = Math.min(100, Math.max(0, (memberProgress / tierRange) * 100))
    }

    // Earnings summary
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    const transactions = await this.getPointsHistory(memberId, { type: ['earn', 'bonus', 'referral', 'social'] })

    const thisMonth = transactions
      .filter((t) => t.createdAt >= startOfMonth)
      .reduce((sum, t) => sum + t.points, 0)

    const lastMonth = transactions
      .filter((t) => t.createdAt >= startOfLastMonth && t.createdAt <= endOfLastMonth)
      .reduce((sum, t) => sum + t.points, 0)

    // Redemptions summary
    const redemptions = await this.getRedemptions(memberId)

    // Referrals summary
    const referrals = await this.getReferrals(memberId)

    return {
      member,
      tierProgress: {
        current: currentTier.name,
        next: nextTier?.name || null,
        progressPercentage,
      },
      earningsSummary: {
        thisMonth,
        lastMonth,
        allTime: member.totalPointsEarned,
      },
      redemptionsSummary: {
        total: redemptions.length,
        pending: redemptions.filter((r) => r.status === 'pending' || r.status === 'confirmed').length,
        used: redemptions.filter((r) => r.status === 'used').length,
      },
      referralsSummary: {
        total: referrals.length,
        converted: referrals.filter((r) => r.status === 'rewarded').length,
        pointsEarned: referrals
          .filter((r) => r.pointsAwarded)
          .reduce((sum, r) => sum + (r.pointsAwarded || 0), 0),
      },
    }
  }

  async getProgramAnalytics(programId: string): Promise<{
    totalMembers: number
    membersByTier: { tier: string; count: number }[]
    totalPointsIssued: number
    totalPointsRedeemed: number
    activeMembers: number
    averagePointsPerMember: number
    topEarners: { memberId: string; points: number }[]
    redemptionRate: number
  }> {
    const program = await this.getProgram(programId)
    if (!program) throw new Error('Program not found')

    // Get all members
    const membersQuery = query(
      collection(db, 'loyaltyMembers'),
      where('programId', '==', programId)
    )
    const membersSnapshot = await getDocs(membersQuery)
    const members = membersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      lastActivityAt: doc.data().lastActivityAt?.toDate(),
    }))

    // Members by tier
    const tierCounts: Record<string, number> = {}
    program.tiers.forEach((t) => {
      tierCounts[t.name] = 0
    })
    members.forEach((m: any) => {
      const tier = program.tiers.find((t) => t.id === m.currentTier)
      if (tier) {
        tierCounts[tier.name] = (tierCounts[tier.name] || 0) + 1
      }
    })

    // Calculate totals
    const totalPointsIssued = members.reduce((sum: number, m: any) => sum + m.totalPointsEarned, 0)
    const totalPointsRedeemed = totalPointsIssued - members.reduce((sum: number, m: any) => sum + m.currentPoints, 0)

    // Active members (activity in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const activeMembers = members.filter((m: any) => m.lastActivityAt && m.lastActivityAt >= thirtyDaysAgo).length

    // Top earners
    const topEarners = members
      .sort((a: any, b: any) => b.totalPointsEarned - a.totalPointsEarned)
      .slice(0, 10)
      .map((m: any) => ({ memberId: m.id, points: m.totalPointsEarned }))

    return {
      totalMembers: members.length,
      membersByTier: Object.entries(tierCounts).map(([tier, count]) => ({ tier, count })),
      totalPointsIssued,
      totalPointsRedeemed,
      activeMembers,
      averagePointsPerMember: members.length > 0 ? totalPointsIssued / members.length : 0,
      topEarners,
      redemptionRate: totalPointsIssued > 0 ? (totalPointsRedeemed / totalPointsIssued) * 100 : 0,
    }
  }
}

export const LoyaltyService = new LoyaltyServiceClass()
