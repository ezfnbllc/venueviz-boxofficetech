import { NextRequest, NextResponse } from 'next/server'
import { SocialCommerceService } from '@/lib/services/socialCommerceService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const promoterId = searchParams.get('promoterId')
    const type = searchParams.get('type')

    let data: any

    switch (type) {
      case 'influencers':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const influencerFilters: any = {}
        if (searchParams.get('status')) influencerFilters.status = searchParams.get('status')
        if (searchParams.get('tier')) influencerFilters.tier = searchParams.get('tier')
        if (searchParams.get('platform')) influencerFilters.platform = searchParams.get('platform')
        data = await SocialCommerceService.getInfluencers(promoterId, influencerFilters)
        break

      case 'influencer':
        const influencerId = searchParams.get('influencerId')
        if (!influencerId) return NextResponse.json({ error: 'influencerId required' }, { status: 400 })
        data = await SocialCommerceService.getInfluencer(influencerId)
        break

      case 'leaderboard':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const metric = (searchParams.get('metric') || 'revenue') as 'revenue' | 'conversions' | 'clicks'
        const leaderboardLimit = parseInt(searchParams.get('limit') || '10')
        data = await SocialCommerceService.getInfluencerLeaderboard(promoterId, metric, leaderboardLimit)
        break

      case 'campaigns':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const campaignFilters: any = {}
        if (searchParams.get('status')) campaignFilters.status = searchParams.get('status')
        if (searchParams.get('campaignType')) campaignFilters.type = searchParams.get('campaignType')
        data = await SocialCommerceService.getCampaigns(promoterId, campaignFilters)
        break

      case 'campaign':
        const campaignId = searchParams.get('campaignId')
        if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
        data = await SocialCommerceService.getCampaign(campaignId)
        break

      case 'campaignPerformance':
        const perfCampaignId = searchParams.get('campaignId')
        if (!perfCampaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
        data = await SocialCommerceService.getCampaignPerformance(perfCampaignId)
        break

      case 'socialShares':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const shareFilters: any = {}
        if (searchParams.get('customerId')) shareFilters.customerId = searchParams.get('customerId')
        if (searchParams.get('eventId')) shareFilters.eventId = searchParams.get('eventId')
        if (searchParams.get('platform')) shareFilters.platform = searchParams.get('platform')
        if (searchParams.get('startDate')) shareFilters.startDate = new Date(searchParams.get('startDate')!)
        if (searchParams.get('endDate')) shareFilters.endDate = new Date(searchParams.get('endDate')!)
        data = await SocialCommerceService.getSocialShares(promoterId, shareFilters)
        break

      case 'socialShareStats':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const statsDateRange = searchParams.get('startDate') && searchParams.get('endDate')
          ? {
              start: new Date(searchParams.get('startDate')!),
              end: new Date(searchParams.get('endDate')!),
            }
          : undefined
        data = await SocialCommerceService.getSocialShareStats(promoterId, statsDateRange)
        break

      case 'reviews':
        const reviewFilters: any = {}
        if (promoterId) reviewFilters.promoterId = promoterId
        if (searchParams.get('eventId')) reviewFilters.eventId = searchParams.get('eventId')
        if (searchParams.get('customerId')) reviewFilters.customerId = searchParams.get('customerId')
        if (searchParams.get('status')) reviewFilters.status = searchParams.get('status')
        if (searchParams.get('minRating')) reviewFilters.minRating = parseInt(searchParams.get('minRating')!)
        if (searchParams.get('verified')) reviewFilters.verified = searchParams.get('verified') === 'true'
        data = await SocialCommerceService.getReviews(reviewFilters)
        break

      case 'review':
        const reviewId = searchParams.get('reviewId')
        if (!reviewId) return NextResponse.json({ error: 'reviewId required' }, { status: 400 })
        data = await SocialCommerceService.getReview(reviewId)
        break

      case 'eventRatings':
        const eventId = searchParams.get('eventId')
        if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })
        data = await SocialCommerceService.getEventRatingSummary(eventId)
        break

      case 'ugc':
        const ugcFilters: any = {}
        if (promoterId) ugcFilters.promoterId = promoterId
        if (searchParams.get('eventId')) ugcFilters.eventId = searchParams.get('eventId')
        if (searchParams.get('approved')) ugcFilters.approved = searchParams.get('approved') === 'true'
        if (searchParams.get('featured')) ugcFilters.featured = searchParams.get('featured') === 'true'
        if (searchParams.get('ugcType')) ugcFilters.type = searchParams.get('ugcType')
        data = await SocialCommerceService.getUGC(ugcFilters)
        break

      case 'referralProgram':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        data = await SocialCommerceService.getActiveReferralProgram(promoterId)
        break

      case 'referrals':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const referralFilters: any = {}
        if (searchParams.get('referrerId')) referralFilters.referrerId = searchParams.get('referrerId')
        if (searchParams.get('programId')) referralFilters.programId = searchParams.get('programId')
        if (searchParams.get('status')) referralFilters.status = searchParams.get('status')
        data = await SocialCommerceService.getReferrals(promoterId, referralFilters)
        break

      case 'referral':
        const referralId = searchParams.get('referralId')
        if (!referralId) return NextResponse.json({ error: 'referralId required' }, { status: 400 })
        data = await SocialCommerceService.getReferral(referralId)
        break

      case 'referralCode':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const codeCustomerId = searchParams.get('customerId')
        if (!codeCustomerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 })
        data = { code: await SocialCommerceService.getCustomerReferralCode(promoterId, codeCustomerId) }
        break

      case 'affiliateLinks':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const affiliateFilters: any = {}
        if (searchParams.get('influencerId')) affiliateFilters.influencerId = searchParams.get('influencerId')
        if (searchParams.get('affiliateId')) affiliateFilters.affiliateId = searchParams.get('affiliateId')
        if (searchParams.get('status')) affiliateFilters.status = searchParams.get('status')
        data = await SocialCommerceService.getAffiliateLinks(promoterId, affiliateFilters)
        break

      case 'affiliateLink':
        const linkId = searchParams.get('linkId')
        const linkCode = searchParams.get('code')
        if (linkId) {
          data = await SocialCommerceService.getAffiliateLink(linkId)
        } else if (linkCode) {
          data = await SocialCommerceService.getAffiliateLinkByCode(linkCode)
        } else {
          return NextResponse.json({ error: 'linkId or code required' }, { status: 400 })
        }
        break

      case 'viralShareContent':
        const viralEventId = searchParams.get('eventId')
        const viralCustomerId = searchParams.get('customerId')
        const viralPlatform = searchParams.get('platform') || 'twitter'
        if (!viralEventId || !viralCustomerId) {
          return NextResponse.json({ error: 'eventId and customerId required' }, { status: 400 })
        }
        data = await SocialCommerceService.generateViralShareContent(viralEventId, viralCustomerId, viralPlatform)
        break

      case 'viralMetrics':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        data = await SocialCommerceService.getViralCampaignMetrics(promoterId)
        break

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Social commerce error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    let result: any

    switch (action) {
      // Influencer management
      case 'createInfluencer':
        result = await SocialCommerceService.createInfluencer(data.influencer)
        break

      case 'updateInfluencer':
        await SocialCommerceService.updateInfluencer(data.influencerId, data.updates)
        result = { success: true }
        break

      case 'approveInfluencer':
        await SocialCommerceService.approveInfluencer(data.influencerId)
        result = { success: true }
        break

      case 'activateInfluencer':
        await SocialCommerceService.activateInfluencer(data.influencerId)
        result = { success: true }
        break

      case 'pauseInfluencer':
        await SocialCommerceService.pauseInfluencer(data.influencerId)
        result = { success: true }
        break

      case 'terminateInfluencer':
        await SocialCommerceService.terminateInfluencer(data.influencerId)
        result = { success: true }
        break

      case 'recordInfluencerActivity':
        await SocialCommerceService.recordInfluencerActivity(data.influencerId, data.activity)
        result = { success: true }
        break

      case 'calculateCommission':
        result = {
          commission: await SocialCommerceService.calculateInfluencerCommission(
            data.influencerId, data.orderAmount
          )
        }
        break

      // Campaign management
      case 'createCampaign':
        result = await SocialCommerceService.createCampaign({
          ...data.campaign,
          startDate: new Date(data.campaign.startDate),
          endDate: new Date(data.campaign.endDate),
        })
        break

      case 'updateCampaign':
        const campaignUpdates = { ...data.updates }
        if (campaignUpdates.startDate) campaignUpdates.startDate = new Date(campaignUpdates.startDate)
        if (campaignUpdates.endDate) campaignUpdates.endDate = new Date(campaignUpdates.endDate)
        await SocialCommerceService.updateCampaign(data.campaignId, campaignUpdates)
        result = { success: true }
        break

      case 'activateCampaign':
        await SocialCommerceService.activateCampaign(data.campaignId)
        result = { success: true }
        break

      case 'pauseCampaign':
        await SocialCommerceService.pauseCampaign(data.campaignId)
        result = { success: true }
        break

      case 'completeCampaign':
        await SocialCommerceService.completeCampaign(data.campaignId)
        result = { success: true }
        break

      // Social sharing
      case 'recordSocialShare':
        result = await SocialCommerceService.recordSocialShare(data.share)
        break

      case 'trackShareClick':
        await SocialCommerceService.trackShareClick(data.shareId)
        result = { success: true }
        break

      case 'trackShareConversion':
        await SocialCommerceService.trackShareConversion(data.shareId)
        result = { success: true }
        break

      // Reviews
      case 'createReview':
        result = await SocialCommerceService.createReview(data.review)
        break

      case 'approveReview':
        await SocialCommerceService.approveReview(data.reviewId)
        result = { success: true }
        break

      case 'rejectReview':
        await SocialCommerceService.rejectReview(data.reviewId)
        result = { success: true }
        break

      case 'markReviewHelpful':
        await SocialCommerceService.markReviewHelpful(data.reviewId)
        result = { success: true }
        break

      case 'reportReview':
        await SocialCommerceService.reportReview(data.reviewId)
        result = { success: true }
        break

      case 'respondToReview':
        await SocialCommerceService.respondToReview(data.reviewId, data.response, data.respondedBy)
        result = { success: true }
        break

      // UGC
      case 'submitUGC':
        result = await SocialCommerceService.submitUGC(data.ugc)
        break

      case 'approveUGC':
        await SocialCommerceService.approveUGC(data.ugcId, data.approvedBy)
        result = { success: true }
        break

      case 'featureUGC':
        await SocialCommerceService.featureUGC(data.ugcId)
        result = { success: true }
        break

      case 'grantUGCRights':
        await SocialCommerceService.grantUGCRights(
          data.ugcId, data.usageTypes, data.expiresAt ? new Date(data.expiresAt) : undefined
        )
        result = { success: true }
        break

      // Referral program
      case 'createReferralProgram':
        result = await SocialCommerceService.createReferralProgram(data.program)
        break

      case 'createReferral':
        result = await SocialCommerceService.createReferral(data.referral)
        break

      case 'convertReferral':
        result = await SocialCommerceService.convertReferral(
          data.referralId, data.refereeId, data.refereeName,
          data.orderId, data.purchaseAmount, data.eventId
        )
        break

      // Affiliate links
      case 'createAffiliateLink':
        result = await SocialCommerceService.createAffiliateLink(data.link)
        break

      case 'trackAffiliateLinkClick':
        await SocialCommerceService.trackAffiliateLinkClick(data.code)
        result = { success: true }
        break

      case 'trackAffiliateConversion':
        result = await SocialCommerceService.trackAffiliateConversion(
          data.code, data.orderAmount, data.orderId
        )
        break

      case 'clearCache':
        SocialCommerceService.clearCache()
        result = { success: true }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Social commerce error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
