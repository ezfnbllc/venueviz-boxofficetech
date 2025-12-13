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
export interface Influencer {
  id: string
  promoterId: string
  userId?: string
  name: string
  email: string
  phone?: string
  socialProfiles: SocialProfile[]
  tier: 'micro' | 'mid' | 'macro' | 'mega' | 'celebrity'
  status: 'pending' | 'approved' | 'active' | 'paused' | 'terminated'
  metrics: InfluencerMetrics
  commission: CommissionStructure
  referralCode: string
  affiliateLink: string
  paymentDetails?: PaymentDetails
  contractStart?: Date
  contractEnd?: Date
  notes?: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export interface SocialProfile {
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook' | 'twitch' | 'linkedin'
  handle: string
  url: string
  followers: number
  engagementRate?: number
  verified: boolean
  lastSynced?: Date
}

export interface InfluencerMetrics {
  totalReach: number
  totalImpressions: number
  totalClicks: number
  totalConversions: number
  totalRevenue: number
  totalCommissionEarned: number
  totalCommissionPaid: number
  averageOrderValue: number
  conversionRate: number
  lastActivityAt?: Date
}

export interface CommissionStructure {
  type: 'percentage' | 'fixed' | 'tiered'
  baseRate: number
  tiers?: CommissionTier[]
  bonuses?: CommissionBonus[]
  minPayout: number
  payoutSchedule: 'weekly' | 'biweekly' | 'monthly'
}

export interface CommissionTier {
  minSales: number
  maxSales?: number
  rate: number
}

export interface CommissionBonus {
  type: 'milestone' | 'seasonal' | 'performance'
  condition: string
  amount: number
  active: boolean
}

export interface PaymentDetails {
  method: 'bank_transfer' | 'paypal' | 'venmo' | 'check'
  accountInfo: Record<string, string>
  taxInfo?: {
    taxId?: string
    w9OnFile: boolean
  }
}

export interface Campaign {
  id: string
  promoterId: string
  name: string
  description: string
  type: 'influencer' | 'affiliate' | 'ugc' | 'referral' | 'viral'
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled'
  targetAudience?: string[]
  eventIds?: string[]
  budget?: CampaignBudget
  goals: CampaignGoals
  incentives: CampaignIncentive[]
  content?: CampaignContent
  tracking: CampaignTracking
  influencerIds?: string[]
  startDate: Date
  endDate: Date
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface CampaignBudget {
  total: number
  spent: number
  influencerPayouts: number
  adSpend: number
  incentives: number
}

export interface CampaignGoals {
  impressions?: number
  clicks?: number
  conversions?: number
  revenue?: number
  newCustomers?: number
  socialShares?: number
}

export interface CampaignIncentive {
  type: 'discount' | 'freeTicket' | 'cashback' | 'points' | 'exclusive_access'
  value: number
  code?: string
  maxRedemptions?: number
  redemptionCount: number
  expiresAt?: Date
}

export interface CampaignContent {
  hashtags: string[]
  mentions: string[]
  guidelines: string
  assets: CampaignAsset[]
  approvalRequired: boolean
}

export interface CampaignAsset {
  id: string
  type: 'image' | 'video' | 'story' | 'reel' | 'post_template'
  url: string
  thumbnail?: string
  caption?: string
  platform?: string
}

export interface CampaignTracking {
  utmSource: string
  utmMedium: string
  utmCampaign: string
  customParams?: Record<string, string>
}

export interface SocialShare {
  id: string
  promoterId: string
  customerId: string
  customerName?: string
  eventId: string
  eventName: string
  platform: string
  shareType: 'ticket_purchase' | 'event_interest' | 'review' | 'photo' | 'check_in'
  url?: string
  content?: string
  reach?: number
  engagement?: number
  clicks: number
  conversions: number
  rewardEarned?: number
  rewardType?: string
  campaignId?: string
  referralCode?: string
  createdAt: Date
}

export interface Review {
  id: string
  promoterId: string
  eventId: string
  eventName: string
  customerId: string
  customerName: string
  orderId?: string
  rating: number
  title?: string
  content: string
  photos?: string[]
  verified: boolean
  helpful: number
  reported: number
  status: 'pending' | 'approved' | 'rejected' | 'flagged'
  response?: {
    content: string
    respondedBy: string
    respondedAt: Date
  }
  createdAt: Date
  updatedAt: Date
}

export interface UserGeneratedContent {
  id: string
  promoterId: string
  eventId: string
  customerId: string
  customerName: string
  type: 'photo' | 'video' | 'story' | 'testimonial'
  url: string
  thumbnail?: string
  caption?: string
  platform?: string
  platformUrl?: string
  tags: string[]
  featured: boolean
  approved: boolean
  approvedBy?: string
  approvedAt?: Date
  engagement: {
    likes: number
    comments: number
    shares: number
  }
  rights: {
    granted: boolean
    grantedAt?: Date
    expiresAt?: Date
    usageTypes: string[]
  }
  createdAt: Date
}

export interface ReferralProgram {
  id: string
  promoterId: string
  name: string
  status: 'active' | 'paused' | 'ended'
  referrerReward: RewardConfig
  refereeReward: RewardConfig
  rules: ReferralRules
  tracking: ReferralTracking
  createdAt: Date
  updatedAt: Date
}

export interface RewardConfig {
  type: 'discount_percent' | 'discount_fixed' | 'free_ticket' | 'points' | 'cash'
  value: number
  maxValue?: number
  minPurchase?: number
  applicableEvents?: string[]
  expiryDays?: number
}

export interface ReferralRules {
  maxReferralsPerCustomer?: number
  minPurchaseAmount?: number
  eligibleEvents?: string[]
  excludedEvents?: string[]
  requirePurchase: boolean
  cooldownDays?: number
}

export interface ReferralTracking {
  totalReferrals: number
  successfulReferrals: number
  totalRewardsIssued: number
  totalRewardValue: number
}

export interface Referral {
  id: string
  programId: string
  promoterId: string
  referrerId: string
  referrerName: string
  referrerCode: string
  refereeId?: string
  refereeName?: string
  refereeEmail: string
  status: 'pending' | 'signed_up' | 'purchased' | 'rewarded' | 'expired'
  referrerReward?: {
    type: string
    value: number
    code?: string
    issuedAt?: Date
    redeemedAt?: Date
  }
  refereeReward?: {
    type: string
    value: number
    code?: string
    issuedAt?: Date
    redeemedAt?: Date
  }
  purchaseAmount?: number
  orderId?: string
  eventId?: string
  createdAt: Date
  convertedAt?: Date
}

export interface AffiliateLink {
  id: string
  promoterId: string
  influencerId?: string
  affiliateId: string
  affiliateName: string
  code: string
  url: string
  targetUrl: string
  eventIds?: string[]
  commission: number
  commissionType: 'percentage' | 'fixed'
  clicks: number
  conversions: number
  revenue: number
  commissionEarned: number
  status: 'active' | 'paused' | 'expired'
  expiresAt?: Date
  createdAt: Date
}

// Caching
const cache = new Map<string, { data: any; expiry: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

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
function generateReferralCode(prefix: string = ''): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = prefix
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function generateAffiliateUrl(baseUrl: string, code: string, utm: CampaignTracking): string {
  const url = new URL(baseUrl)
  url.searchParams.set('ref', code)
  url.searchParams.set('utm_source', utm.utmSource)
  url.searchParams.set('utm_medium', utm.utmMedium)
  url.searchParams.set('utm_campaign', utm.utmCampaign)
  if (utm.customParams) {
    Object.entries(utm.customParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return url.toString()
}

function determineInfluencerTier(followers: number): Influencer['tier'] {
  if (followers >= 1000000) return 'celebrity'
  if (followers >= 500000) return 'mega'
  if (followers >= 100000) return 'macro'
  if (followers >= 10000) return 'mid'
  return 'micro'
}

// Main Service Class
export class SocialCommerceService {
  // ==================== INFLUENCER MANAGEMENT ====================

  static async createInfluencer(
    data: Omit<Influencer, 'id' | 'metrics' | 'referralCode' | 'affiliateLink' | 'createdAt' | 'updatedAt'>
  ): Promise<Influencer> {
    const influencerId = `inf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const referralCode = generateReferralCode('INF')

    const totalFollowers = data.socialProfiles.reduce((sum, p) => sum + p.followers, 0)
    const tier = data.tier || determineInfluencerTier(totalFollowers)

    const influencer: Influencer = {
      ...data,
      id: influencerId,
      tier,
      referralCode,
      affiliateLink: `https://tickets.example.com/ref/${referralCode}`,
      metrics: {
        totalReach: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        totalRevenue: 0,
        totalCommissionEarned: 0,
        totalCommissionPaid: 0,
        averageOrderValue: 0,
        conversionRate: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await setDoc(doc(db, 'influencers', influencerId), {
      ...influencer,
      contractStart: influencer.contractStart ? Timestamp.fromDate(influencer.contractStart) : null,
      contractEnd: influencer.contractEnd ? Timestamp.fromDate(influencer.contractEnd) : null,
      createdAt: Timestamp.fromDate(influencer.createdAt),
      updatedAt: Timestamp.fromDate(influencer.updatedAt),
    })

    return influencer
  }

  static async getInfluencer(influencerId: string): Promise<Influencer | null> {
    const cached = getCached<Influencer>(`influencer:${influencerId}`)
    if (cached) return cached

    const docRef = await getDoc(doc(db, 'influencers', influencerId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    const influencer: Influencer = {
      ...data,
      id: docRef.id,
      contractStart: data.contractStart?.toDate(),
      contractEnd: data.contractEnd?.toDate(),
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      metrics: {
        ...data.metrics,
        lastActivityAt: data.metrics?.lastActivityAt?.toDate(),
      },
    } as Influencer

    setCache(`influencer:${influencerId}`, influencer)
    return influencer
  }

  static async getInfluencers(
    promoterId: string,
    filters?: {
      status?: Influencer['status']
      tier?: Influencer['tier']
      platform?: string
    }
  ): Promise<Influencer[]> {
    let q = query(
      collection(db, 'influencers'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status))
    }
    if (filters?.tier) {
      q = query(q, where('tier', '==', filters.tier))
    }

    const snapshot = await getDocs(q)
    let influencers = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        contractStart: data.contractStart?.toDate(),
        contractEnd: data.contractEnd?.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as Influencer
    })

    if (filters?.platform) {
      influencers = influencers.filter((inf) =>
        inf.socialProfiles.some((p) => p.platform === filters.platform)
      )
    }

    return influencers
  }

  static async updateInfluencer(
    influencerId: string,
    updates: Partial<Influencer>
  ): Promise<void> {
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }

    if (updates.contractStart) {
      updateData.contractStart = Timestamp.fromDate(updates.contractStart)
    }
    if (updates.contractEnd) {
      updateData.contractEnd = Timestamp.fromDate(updates.contractEnd)
    }

    delete updateData.id
    delete updateData.createdAt

    await updateDoc(doc(db, 'influencers', influencerId), updateData)
    cache.delete(`influencer:${influencerId}`)
  }

  static async approveInfluencer(influencerId: string): Promise<void> {
    await this.updateInfluencer(influencerId, { status: 'approved' })
  }

  static async activateInfluencer(influencerId: string): Promise<void> {
    await this.updateInfluencer(influencerId, { status: 'active' })
  }

  static async pauseInfluencer(influencerId: string): Promise<void> {
    await this.updateInfluencer(influencerId, { status: 'paused' })
  }

  static async terminateInfluencer(influencerId: string): Promise<void> {
    await this.updateInfluencer(influencerId, { status: 'terminated' })
  }

  static async recordInfluencerActivity(
    influencerId: string,
    activity: {
      type: 'impression' | 'click' | 'conversion'
      value?: number
      orderId?: string
    }
  ): Promise<void> {
    const updates: any = {
      'metrics.lastActivityAt': Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    }

    switch (activity.type) {
      case 'impression':
        updates['metrics.totalImpressions'] = increment(1)
        break
      case 'click':
        updates['metrics.totalClicks'] = increment(1)
        break
      case 'conversion':
        updates['metrics.totalConversions'] = increment(1)
        if (activity.value) {
          updates['metrics.totalRevenue'] = increment(activity.value)
        }
        break
    }

    await updateDoc(doc(db, 'influencers', influencerId), updates)
    cache.delete(`influencer:${influencerId}`)
  }

  static async calculateInfluencerCommission(
    influencerId: string,
    orderAmount: number
  ): Promise<number> {
    const influencer = await this.getInfluencer(influencerId)
    if (!influencer) return 0

    const { commission } = influencer
    let commissionAmount = 0

    switch (commission.type) {
      case 'fixed':
        commissionAmount = commission.baseRate
        break
      case 'percentage':
        commissionAmount = orderAmount * (commission.baseRate / 100)
        break
      case 'tiered':
        if (commission.tiers && commission.tiers.length > 0) {
          const totalSales = influencer.metrics.totalRevenue + orderAmount
          const applicableTier = commission.tiers
            .sort((a, b) => b.minSales - a.minSales)
            .find((t) => totalSales >= t.minSales)

          if (applicableTier) {
            commissionAmount = orderAmount * (applicableTier.rate / 100)
          } else {
            commissionAmount = orderAmount * (commission.baseRate / 100)
          }
        }
        break
    }

    // Add bonuses
    if (commission.bonuses) {
      for (const bonus of commission.bonuses) {
        if (bonus.active) {
          commissionAmount += bonus.amount
        }
      }
    }

    return Math.round(commissionAmount * 100) / 100
  }

  static async getInfluencerLeaderboard(
    promoterId: string,
    metric: 'revenue' | 'conversions' | 'clicks' = 'revenue',
    limit_count: number = 10
  ): Promise<Influencer[]> {
    const influencers = await this.getInfluencers(promoterId, { status: 'active' })

    const sortField = metric === 'revenue'
      ? 'totalRevenue'
      : metric === 'conversions'
        ? 'totalConversions'
        : 'totalClicks'

    return influencers
      .sort((a, b) => (b.metrics as any)[sortField] - (a.metrics as any)[sortField])
      .slice(0, limit_count)
  }

  // ==================== CAMPAIGN MANAGEMENT ====================

  static async createCampaign(
    data: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Campaign> {
    const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const campaign: Campaign = {
      ...data,
      id: campaignId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await setDoc(doc(db, 'campaigns', campaignId), {
      ...campaign,
      startDate: Timestamp.fromDate(campaign.startDate),
      endDate: Timestamp.fromDate(campaign.endDate),
      createdAt: Timestamp.fromDate(campaign.createdAt),
      updatedAt: Timestamp.fromDate(campaign.updatedAt),
      incentives: campaign.incentives.map((i) => ({
        ...i,
        expiresAt: i.expiresAt ? Timestamp.fromDate(i.expiresAt) : null,
      })),
    })

    return campaign
  }

  static async getCampaign(campaignId: string): Promise<Campaign | null> {
    const docRef = await getDoc(doc(db, 'campaigns', campaignId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    return {
      ...data,
      id: docRef.id,
      startDate: data.startDate.toDate(),
      endDate: data.endDate.toDate(),
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      incentives: data.incentives?.map((i: any) => ({
        ...i,
        expiresAt: i.expiresAt?.toDate(),
      })) || [],
    } as Campaign
  }

  static async getCampaigns(
    promoterId: string,
    filters?: {
      status?: Campaign['status']
      type?: Campaign['type']
    }
  ): Promise<Campaign[]> {
    let q = query(
      collection(db, 'campaigns'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status))
    }
    if (filters?.type) {
      q = query(q, where('type', '==', filters.type))
    }

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        startDate: data.startDate.toDate(),
        endDate: data.endDate.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as Campaign
    })
  }

  static async updateCampaign(
    campaignId: string,
    updates: Partial<Campaign>
  ): Promise<void> {
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }

    if (updates.startDate) {
      updateData.startDate = Timestamp.fromDate(updates.startDate)
    }
    if (updates.endDate) {
      updateData.endDate = Timestamp.fromDate(updates.endDate)
    }

    delete updateData.id
    delete updateData.createdAt

    await updateDoc(doc(db, 'campaigns', campaignId), updateData)
  }

  static async activateCampaign(campaignId: string): Promise<void> {
    await this.updateCampaign(campaignId, { status: 'active' })
  }

  static async pauseCampaign(campaignId: string): Promise<void> {
    await this.updateCampaign(campaignId, { status: 'paused' })
  }

  static async completeCampaign(campaignId: string): Promise<void> {
    await this.updateCampaign(campaignId, { status: 'completed' })
  }

  static async getCampaignPerformance(campaignId: string): Promise<{
    campaign: Campaign
    metrics: {
      impressions: number
      clicks: number
      conversions: number
      revenue: number
      roi: number
      cpc: number
      cpa: number
      goalProgress: Record<string, number>
    }
    influencerBreakdown?: Array<{
      influencerId: string
      name: string
      clicks: number
      conversions: number
      revenue: number
    }>
  }> {
    const campaign = await this.getCampaign(campaignId)
    if (!campaign) {
      throw new Error('Campaign not found')
    }

    // Get affiliate links for this campaign
    const linksQuery = query(
      collection(db, 'affiliateLinks'),
      where('promoterId', '==', campaign.promoterId)
    )
    const linksSnapshot = await getDocs(linksQuery)

    let totalImpressions = 0
    let totalClicks = 0
    let totalConversions = 0
    let totalRevenue = 0

    const influencerBreakdown: Array<{
      influencerId: string
      name: string
      clicks: number
      conversions: number
      revenue: number
    }> = []

    for (const linkDoc of linksSnapshot.docs) {
      const link = linkDoc.data() as AffiliateLink
      totalClicks += link.clicks
      totalConversions += link.conversions
      totalRevenue += link.revenue

      if (link.influencerId) {
        influencerBreakdown.push({
          influencerId: link.influencerId,
          name: link.affiliateName,
          clicks: link.clicks,
          conversions: link.conversions,
          revenue: link.revenue,
        })
      }
    }

    // Get social shares for reach
    const sharesQuery = query(
      collection(db, 'socialShares'),
      where('campaignId', '==', campaignId)
    )
    const sharesSnapshot = await getDocs(sharesQuery)
    for (const shareDoc of sharesSnapshot.docs) {
      const share = shareDoc.data() as SocialShare
      totalImpressions += share.reach || 0
    }

    const spent = campaign.budget?.spent || 0
    const roi = spent > 0 ? ((totalRevenue - spent) / spent) * 100 : 0
    const cpc = totalClicks > 0 ? spent / totalClicks : 0
    const cpa = totalConversions > 0 ? spent / totalConversions : 0

    const goalProgress: Record<string, number> = {}
    if (campaign.goals.impressions) {
      goalProgress.impressions = (totalImpressions / campaign.goals.impressions) * 100
    }
    if (campaign.goals.clicks) {
      goalProgress.clicks = (totalClicks / campaign.goals.clicks) * 100
    }
    if (campaign.goals.conversions) {
      goalProgress.conversions = (totalConversions / campaign.goals.conversions) * 100
    }
    if (campaign.goals.revenue) {
      goalProgress.revenue = (totalRevenue / campaign.goals.revenue) * 100
    }

    return {
      campaign,
      metrics: {
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        revenue: totalRevenue,
        roi: Math.round(roi * 100) / 100,
        cpc: Math.round(cpc * 100) / 100,
        cpa: Math.round(cpa * 100) / 100,
        goalProgress,
      },
      influencerBreakdown: influencerBreakdown.length > 0 ? influencerBreakdown : undefined,
    }
  }

  // ==================== SOCIAL SHARING ====================

  static async recordSocialShare(
    data: Omit<SocialShare, 'id' | 'clicks' | 'conversions' | 'createdAt'>
  ): Promise<SocialShare> {
    const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const share: SocialShare = {
      ...data,
      id: shareId,
      clicks: 0,
      conversions: 0,
      createdAt: new Date(),
    }

    await setDoc(doc(db, 'socialShares', shareId), {
      ...share,
      createdAt: Timestamp.fromDate(share.createdAt),
    })

    // Issue reward if configured
    if (data.rewardEarned && data.rewardEarned > 0) {
      // This would integrate with loyalty service to credit points
      console.log(`Rewarding ${data.customerId} with ${data.rewardEarned} ${data.rewardType}`)
    }

    return share
  }

  static async trackShareClick(shareId: string): Promise<void> {
    await updateDoc(doc(db, 'socialShares', shareId), {
      clicks: increment(1),
    })
  }

  static async trackShareConversion(shareId: string): Promise<void> {
    await updateDoc(doc(db, 'socialShares', shareId), {
      conversions: increment(1),
    })
  }

  static async getSocialShares(
    promoterId: string,
    filters?: {
      customerId?: string
      eventId?: string
      platform?: string
      shareType?: SocialShare['shareType']
      startDate?: Date
      endDate?: Date
    }
  ): Promise<SocialShare[]> {
    let q = query(
      collection(db, 'socialShares'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc'),
      limit(500)
    )

    if (filters?.customerId) {
      q = query(q, where('customerId', '==', filters.customerId))
    }
    if (filters?.eventId) {
      q = query(q, where('eventId', '==', filters.eventId))
    }
    if (filters?.platform) {
      q = query(q, where('platform', '==', filters.platform))
    }

    const snapshot = await getDocs(q)
    let shares = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt.toDate(),
      } as SocialShare
    })

    // Apply date filters
    if (filters?.startDate) {
      shares = shares.filter((s) => s.createdAt >= filters.startDate!)
    }
    if (filters?.endDate) {
      shares = shares.filter((s) => s.createdAt <= filters.endDate!)
    }

    return shares
  }

  static async getSocialShareStats(
    promoterId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    totalShares: number
    totalReach: number
    totalClicks: number
    totalConversions: number
    byPlatform: Record<string, { shares: number; clicks: number; conversions: number }>
    byType: Record<string, number>
    topSharers: Array<{ customerId: string; name: string; shares: number }>
  }> {
    const shares = await this.getSocialShares(promoterId, {
      startDate: dateRange?.start,
      endDate: dateRange?.end,
    })

    const stats = {
      totalShares: shares.length,
      totalReach: 0,
      totalClicks: 0,
      totalConversions: 0,
      byPlatform: {} as Record<string, { shares: number; clicks: number; conversions: number }>,
      byType: {} as Record<string, number>,
      topSharers: [] as Array<{ customerId: string; name: string; shares: number }>,
    }

    const sharerCounts: Record<string, { name: string; count: number }> = {}

    for (const share of shares) {
      stats.totalReach += share.reach || 0
      stats.totalClicks += share.clicks
      stats.totalConversions += share.conversions

      // By platform
      if (!stats.byPlatform[share.platform]) {
        stats.byPlatform[share.platform] = { shares: 0, clicks: 0, conversions: 0 }
      }
      stats.byPlatform[share.platform].shares++
      stats.byPlatform[share.platform].clicks += share.clicks
      stats.byPlatform[share.platform].conversions += share.conversions

      // By type
      stats.byType[share.shareType] = (stats.byType[share.shareType] || 0) + 1

      // Top sharers
      if (!sharerCounts[share.customerId]) {
        sharerCounts[share.customerId] = { name: share.customerName || 'Unknown', count: 0 }
      }
      sharerCounts[share.customerId].count++
    }

    stats.topSharers = Object.entries(sharerCounts)
      .map(([customerId, data]) => ({
        customerId,
        name: data.name,
        shares: data.count,
      }))
      .sort((a, b) => b.shares - a.shares)
      .slice(0, 10)

    return stats
  }

  // ==================== REVIEWS & RATINGS ====================

  static async createReview(
    data: Omit<Review, 'id' | 'helpful' | 'reported' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<Review> {
    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const review: Review = {
      ...data,
      id: reviewId,
      helpful: 0,
      reported: 0,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await setDoc(doc(db, 'reviews', reviewId), {
      ...review,
      createdAt: Timestamp.fromDate(review.createdAt),
      updatedAt: Timestamp.fromDate(review.updatedAt),
    })

    return review
  }

  static async getReview(reviewId: string): Promise<Review | null> {
    const docRef = await getDoc(doc(db, 'reviews', reviewId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    return {
      ...data,
      id: docRef.id,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      response: data.response
        ? { ...data.response, respondedAt: data.response.respondedAt?.toDate() }
        : undefined,
    } as Review
  }

  static async getReviews(
    filters: {
      promoterId?: string
      eventId?: string
      customerId?: string
      status?: Review['status']
      minRating?: number
      verified?: boolean
    }
  ): Promise<Review[]> {
    let q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'))

    if (filters.promoterId) {
      q = query(q, where('promoterId', '==', filters.promoterId))
    }
    if (filters.eventId) {
      q = query(q, where('eventId', '==', filters.eventId))
    }
    if (filters.customerId) {
      q = query(q, where('customerId', '==', filters.customerId))
    }
    if (filters.status) {
      q = query(q, where('status', '==', filters.status))
    }

    const snapshot = await getDocs(q)
    let reviews = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as Review
    })

    if (filters.minRating) {
      reviews = reviews.filter((r) => r.rating >= filters.minRating!)
    }
    if (filters.verified !== undefined) {
      reviews = reviews.filter((r) => r.verified === filters.verified)
    }

    return reviews
  }

  static async approveReview(reviewId: string): Promise<void> {
    await updateDoc(doc(db, 'reviews', reviewId), {
      status: 'approved',
      updatedAt: Timestamp.fromDate(new Date()),
    })
  }

  static async rejectReview(reviewId: string): Promise<void> {
    await updateDoc(doc(db, 'reviews', reviewId), {
      status: 'rejected',
      updatedAt: Timestamp.fromDate(new Date()),
    })
  }

  static async markReviewHelpful(reviewId: string): Promise<void> {
    await updateDoc(doc(db, 'reviews', reviewId), {
      helpful: increment(1),
    })
  }

  static async reportReview(reviewId: string): Promise<void> {
    await updateDoc(doc(db, 'reviews', reviewId), {
      reported: increment(1),
      status: 'flagged',
      updatedAt: Timestamp.fromDate(new Date()),
    })
  }

  static async respondToReview(
    reviewId: string,
    response: string,
    respondedBy: string
  ): Promise<void> {
    await updateDoc(doc(db, 'reviews', reviewId), {
      response: {
        content: response,
        respondedBy,
        respondedAt: Timestamp.fromDate(new Date()),
      },
      updatedAt: Timestamp.fromDate(new Date()),
    })
  }

  static async getEventRatingSummary(eventId: string): Promise<{
    averageRating: number
    totalReviews: number
    ratingDistribution: Record<number, number>
    verifiedReviews: number
    recommendationRate: number
  }> {
    const reviews = await this.getReviews({ eventId, status: 'approved' })

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        verifiedReviews: 0,
        recommendationRate: 0,
      }
    }

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let totalRating = 0
    let verifiedCount = 0

    for (const review of reviews) {
      totalRating += review.rating
      ratingDistribution[review.rating] = (ratingDistribution[review.rating] || 0) + 1
      if (review.verified) verifiedCount++
    }

    const positiveReviews = reviews.filter((r) => r.rating >= 4).length
    const recommendationRate = (positiveReviews / reviews.length) * 100

    return {
      averageRating: Math.round((totalRating / reviews.length) * 10) / 10,
      totalReviews: reviews.length,
      ratingDistribution,
      verifiedReviews: verifiedCount,
      recommendationRate: Math.round(recommendationRate),
    }
  }

  // ==================== USER GENERATED CONTENT ====================

  static async submitUGC(
    data: Omit<UserGeneratedContent, 'id' | 'featured' | 'approved' | 'engagement' | 'rights' | 'createdAt'>
  ): Promise<UserGeneratedContent> {
    const ugcId = `ugc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const ugc: UserGeneratedContent = {
      ...data,
      id: ugcId,
      featured: false,
      approved: false,
      engagement: { likes: 0, comments: 0, shares: 0 },
      rights: { granted: false, usageTypes: [] },
      createdAt: new Date(),
    }

    await setDoc(doc(db, 'ugc', ugcId), {
      ...ugc,
      createdAt: Timestamp.fromDate(ugc.createdAt),
    })

    return ugc
  }

  static async getUGC(
    filters: {
      promoterId?: string
      eventId?: string
      customerId?: string
      type?: UserGeneratedContent['type']
      approved?: boolean
      featured?: boolean
    }
  ): Promise<UserGeneratedContent[]> {
    let q = query(collection(db, 'ugc'), orderBy('createdAt', 'desc'))

    if (filters.promoterId) {
      q = query(q, where('promoterId', '==', filters.promoterId))
    }
    if (filters.eventId) {
      q = query(q, where('eventId', '==', filters.eventId))
    }
    if (filters.approved !== undefined) {
      q = query(q, where('approved', '==', filters.approved))
    }
    if (filters.featured !== undefined) {
      q = query(q, where('featured', '==', filters.featured))
    }

    const snapshot = await getDocs(q)
    let content = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt.toDate(),
        approvedAt: data.approvedAt?.toDate(),
        rights: {
          ...data.rights,
          grantedAt: data.rights?.grantedAt?.toDate(),
          expiresAt: data.rights?.expiresAt?.toDate(),
        },
      } as UserGeneratedContent
    })

    if (filters.type) {
      content = content.filter((c) => c.type === filters.type)
    }

    return content
  }

  static async approveUGC(ugcId: string, approvedBy: string): Promise<void> {
    await updateDoc(doc(db, 'ugc', ugcId), {
      approved: true,
      approvedBy,
      approvedAt: Timestamp.fromDate(new Date()),
    })
  }

  static async featureUGC(ugcId: string): Promise<void> {
    await updateDoc(doc(db, 'ugc', ugcId), {
      featured: true,
    })
  }

  static async grantUGCRights(
    ugcId: string,
    usageTypes: string[],
    expiresAt?: Date
  ): Promise<void> {
    await updateDoc(doc(db, 'ugc', ugcId), {
      'rights.granted': true,
      'rights.grantedAt': Timestamp.fromDate(new Date()),
      'rights.expiresAt': expiresAt ? Timestamp.fromDate(expiresAt) : null,
      'rights.usageTypes': usageTypes,
    })
  }

  // ==================== REFERRAL PROGRAM ====================

  static async createReferralProgram(
    data: Omit<ReferralProgram, 'id' | 'tracking' | 'createdAt' | 'updatedAt'>
  ): Promise<ReferralProgram> {
    const programId = `refprog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const program: ReferralProgram = {
      ...data,
      id: programId,
      tracking: {
        totalReferrals: 0,
        successfulReferrals: 0,
        totalRewardsIssued: 0,
        totalRewardValue: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await setDoc(doc(db, 'referralPrograms', programId), {
      ...program,
      createdAt: Timestamp.fromDate(program.createdAt),
      updatedAt: Timestamp.fromDate(program.updatedAt),
    })

    return program
  }

  static async getReferralProgram(programId: string): Promise<ReferralProgram | null> {
    const docRef = await getDoc(doc(db, 'referralPrograms', programId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    return {
      ...data,
      id: docRef.id,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as ReferralProgram
  }

  static async getActiveReferralProgram(promoterId: string): Promise<ReferralProgram | null> {
    const q = query(
      collection(db, 'referralPrograms'),
      where('promoterId', '==', promoterId),
      where('status', '==', 'active'),
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
    } as ReferralProgram
  }

  static async createReferral(
    data: Omit<Referral, 'id' | 'status' | 'createdAt'>
  ): Promise<Referral> {
    const referralId = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const referral: Referral = {
      ...data,
      id: referralId,
      status: 'pending',
      createdAt: new Date(),
    }

    await setDoc(doc(db, 'referrals', referralId), {
      ...referral,
      createdAt: Timestamp.fromDate(referral.createdAt),
    })

    // Update program tracking
    await updateDoc(doc(db, 'referralPrograms', data.programId), {
      'tracking.totalReferrals': increment(1),
      updatedAt: Timestamp.fromDate(new Date()),
    })

    return referral
  }

  static async getReferral(referralId: string): Promise<Referral | null> {
    const docRef = await getDoc(doc(db, 'referrals', referralId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    return {
      ...data,
      id: docRef.id,
      createdAt: data.createdAt.toDate(),
      convertedAt: data.convertedAt?.toDate(),
      referrerReward: data.referrerReward
        ? {
            ...data.referrerReward,
            issuedAt: data.referrerReward.issuedAt?.toDate(),
            redeemedAt: data.referrerReward.redeemedAt?.toDate(),
          }
        : undefined,
      refereeReward: data.refereeReward
        ? {
            ...data.refereeReward,
            issuedAt: data.refereeReward.issuedAt?.toDate(),
            redeemedAt: data.refereeReward.redeemedAt?.toDate(),
          }
        : undefined,
    } as Referral
  }

  static async getReferralByCode(referralCode: string): Promise<Referral | null> {
    const q = query(
      collection(db, 'referrals'),
      where('referrerCode', '==', referralCode),
      where('status', '==', 'pending'),
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
    } as Referral
  }

  static async convertReferral(
    referralId: string,
    refereeId: string,
    refereeName: string,
    orderId: string,
    purchaseAmount: number,
    eventId?: string
  ): Promise<Referral> {
    const referral = await this.getReferral(referralId)
    if (!referral) {
      throw new Error('Referral not found')
    }

    const program = await this.getReferralProgram(referral.programId)
    if (!program) {
      throw new Error('Referral program not found')
    }

    // Generate rewards
    const referrerRewardCode = generateReferralCode('RWD')
    const refereeRewardCode = generateReferralCode('RWD')

    const updates: Partial<Referral> = {
      status: 'purchased',
      refereeId,
      refereeName,
      orderId,
      purchaseAmount,
      eventId,
      convertedAt: new Date(),
      referrerReward: {
        type: program.referrerReward.type,
        value: program.referrerReward.value,
        code: referrerRewardCode,
        issuedAt: new Date(),
      },
      refereeReward: {
        type: program.refereeReward.type,
        value: program.refereeReward.value,
        code: refereeRewardCode,
        issuedAt: new Date(),
      },
    }

    await updateDoc(doc(db, 'referrals', referralId), {
      ...updates,
      convertedAt: Timestamp.fromDate(updates.convertedAt!),
      'referrerReward.issuedAt': Timestamp.fromDate(updates.referrerReward!.issuedAt!),
      'refereeReward.issuedAt': Timestamp.fromDate(updates.refereeReward!.issuedAt!),
    })

    // Update program tracking
    const totalRewardValue = program.referrerReward.value + program.refereeReward.value
    await updateDoc(doc(db, 'referralPrograms', referral.programId), {
      'tracking.successfulReferrals': increment(1),
      'tracking.totalRewardsIssued': increment(2),
      'tracking.totalRewardValue': increment(totalRewardValue),
      updatedAt: Timestamp.fromDate(new Date()),
    })

    return { ...referral, ...updates } as Referral
  }

  static async getReferrals(
    promoterId: string,
    filters?: {
      referrerId?: string
      programId?: string
      status?: Referral['status']
    }
  ): Promise<Referral[]> {
    let q = query(
      collection(db, 'referrals'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    if (filters?.referrerId) {
      q = query(q, where('referrerId', '==', filters.referrerId))
    }
    if (filters?.programId) {
      q = query(q, where('programId', '==', filters.programId))
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
        createdAt: data.createdAt.toDate(),
        convertedAt: data.convertedAt?.toDate(),
      } as Referral
    })
  }

  static async getCustomerReferralCode(
    promoterId: string,
    customerId: string
  ): Promise<string> {
    // Check if customer already has a referral code
    const q = query(
      collection(db, 'customerReferralCodes'),
      where('promoterId', '==', promoterId),
      where('customerId', '==', customerId),
      limit(1)
    )

    const snapshot = await getDocs(q)
    if (!snapshot.empty) {
      return snapshot.docs[0].data().code
    }

    // Generate new code
    const code = generateReferralCode('REF')
    await setDoc(doc(db, 'customerReferralCodes', `${promoterId}_${customerId}`), {
      promoterId,
      customerId,
      code,
      createdAt: Timestamp.fromDate(new Date()),
    })

    return code
  }

  // ==================== AFFILIATE LINKS ====================

  static async createAffiliateLink(
    data: Omit<AffiliateLink, 'id' | 'url' | 'clicks' | 'conversions' | 'revenue' | 'commissionEarned' | 'createdAt'>
  ): Promise<AffiliateLink> {
    const linkId = `aff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const url = generateAffiliateUrl(data.targetUrl, data.code, {
      utmSource: data.affiliateName.toLowerCase().replace(/\s+/g, '_'),
      utmMedium: 'affiliate',
      utmCampaign: data.code,
    })

    const link: AffiliateLink = {
      ...data,
      id: linkId,
      url,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      commissionEarned: 0,
      createdAt: new Date(),
    }

    await setDoc(doc(db, 'affiliateLinks', linkId), {
      ...link,
      createdAt: Timestamp.fromDate(link.createdAt),
      expiresAt: link.expiresAt ? Timestamp.fromDate(link.expiresAt) : null,
    })

    return link
  }

  static async getAffiliateLink(linkId: string): Promise<AffiliateLink | null> {
    const docRef = await getDoc(doc(db, 'affiliateLinks', linkId))
    if (!docRef.exists()) return null

    const data = docRef.data()
    return {
      ...data,
      id: docRef.id,
      createdAt: data.createdAt.toDate(),
      expiresAt: data.expiresAt?.toDate(),
    } as AffiliateLink
  }

  static async getAffiliateLinkByCode(code: string): Promise<AffiliateLink | null> {
    const q = query(
      collection(db, 'affiliateLinks'),
      where('code', '==', code),
      where('status', '==', 'active'),
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
      expiresAt: data.expiresAt?.toDate(),
    } as AffiliateLink
  }

  static async trackAffiliateLinkClick(code: string): Promise<void> {
    const link = await this.getAffiliateLinkByCode(code)
    if (!link) return

    await updateDoc(doc(db, 'affiliateLinks', link.id), {
      clicks: increment(1),
    })

    // Also update influencer if linked
    if (link.influencerId) {
      await this.recordInfluencerActivity(link.influencerId, { type: 'click' })
    }
  }

  static async trackAffiliateConversion(
    code: string,
    orderAmount: number,
    orderId: string
  ): Promise<{ commission: number }> {
    const link = await this.getAffiliateLinkByCode(code)
    if (!link) return { commission: 0 }

    const commission = link.commissionType === 'percentage'
      ? orderAmount * (link.commission / 100)
      : link.commission

    await updateDoc(doc(db, 'affiliateLinks', link.id), {
      conversions: increment(1),
      revenue: increment(orderAmount),
      commissionEarned: increment(commission),
    })

    // Also update influencer if linked
    if (link.influencerId) {
      await this.recordInfluencerActivity(link.influencerId, {
        type: 'conversion',
        value: orderAmount,
        orderId,
      })

      await updateDoc(doc(db, 'influencers', link.influencerId), {
        'metrics.totalCommissionEarned': increment(commission),
      })
    }

    return { commission: Math.round(commission * 100) / 100 }
  }

  static async getAffiliateLinks(
    promoterId: string,
    filters?: {
      influencerId?: string
      affiliateId?: string
      status?: AffiliateLink['status']
    }
  ): Promise<AffiliateLink[]> {
    let q = query(
      collection(db, 'affiliateLinks'),
      where('promoterId', '==', promoterId),
      orderBy('createdAt', 'desc')
    )

    if (filters?.influencerId) {
      q = query(q, where('influencerId', '==', filters.influencerId))
    }
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status))
    }

    const snapshot = await getDocs(q)
    let links = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt.toDate(),
        expiresAt: data.expiresAt?.toDate(),
      } as AffiliateLink
    })

    if (filters?.affiliateId) {
      links = links.filter((l) => l.affiliateId === filters.affiliateId)
    }

    return links
  }

  // ==================== VIRAL MARKETING ====================

  static async generateViralShareContent(
    eventId: string,
    customerId: string,
    platform: string
  ): Promise<{
    message: string
    hashtags: string[]
    referralLink: string
  }> {
    // Get event details (simplified - would fetch from events collection)
    const referralCode = await this.getCustomerReferralCode('promoter_id', customerId)
    const referralLink = `https://tickets.example.com/events/${eventId}?ref=${referralCode}`

    // Platform-specific content
    const platformContent: Record<string, { message: string; hashtags: string[] }> = {
      twitter: {
        message: `Just got my tickets! 🎟️ Don't miss out on this amazing event. Get yours now:`,
        hashtags: ['Events', 'LiveMusic', 'GetTickets'],
      },
      instagram: {
        message: `🎉 So excited! Just secured my spot at this incredible event. Link in bio to grab your tickets before they're gone! Who's coming with me?`,
        hashtags: ['Events', 'NightOut', 'LiveEntertainment', 'WeekendPlans'],
      },
      facebook: {
        message: `I just got my tickets and I'm so excited! 🎊 If you want to join me, use my link for a special discount:`,
        hashtags: ['Events', 'JoinMe'],
      },
      whatsapp: {
        message: `Hey! I just got tickets to an amazing event. Want to come? Here's my referral link for a discount:`,
        hashtags: [],
      },
    }

    const content = platformContent[platform] || platformContent.twitter

    return {
      message: content.message,
      hashtags: content.hashtags,
      referralLink,
    }
  }

  static async getViralCampaignMetrics(
    promoterId: string
  ): Promise<{
    totalShares: number
    viralCoefficient: number
    averageSharesPerCustomer: number
    topViralEvents: Array<{ eventId: string; shares: number; conversions: number }>
    shareVelocity: number
  }> {
    const shares = await this.getSocialShares(promoterId)
    const uniqueCustomers = new Set(shares.map((s) => s.customerId)).size

    // Calculate viral coefficient (k-factor)
    const totalConversions = shares.reduce((sum, s) => sum + s.conversions, 0)
    const viralCoefficient = uniqueCustomers > 0 ? totalConversions / uniqueCustomers : 0

    // Group by event
    const eventShares: Record<string, { shares: number; conversions: number }> = {}
    for (const share of shares) {
      if (!eventShares[share.eventId]) {
        eventShares[share.eventId] = { shares: 0, conversions: 0 }
      }
      eventShares[share.eventId].shares++
      eventShares[share.eventId].conversions += share.conversions
    }

    const topViralEvents = Object.entries(eventShares)
      .map(([eventId, data]) => ({ eventId, ...data }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 5)

    // Share velocity (shares per day in last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentShares = shares.filter((s) => s.createdAt >= sevenDaysAgo).length
    const shareVelocity = recentShares / 7

    return {
      totalShares: shares.length,
      viralCoefficient: Math.round(viralCoefficient * 100) / 100,
      averageSharesPerCustomer: uniqueCustomers > 0
        ? Math.round((shares.length / uniqueCustomers) * 100) / 100
        : 0,
      topViralEvents,
      shareVelocity: Math.round(shareVelocity * 100) / 100,
    }
  }

  // ==================== CACHE MANAGEMENT ====================

  static clearCache(): void {
    cache.clear()
  }
}
