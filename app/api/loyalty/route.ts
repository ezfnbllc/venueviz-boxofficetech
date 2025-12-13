import { NextRequest, NextResponse } from 'next/server'
import { LoyaltyService } from '@/lib/services/loyaltyService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const promoterId = searchParams.get('promoterId')
    const type = searchParams.get('type')

    let data: any

    switch (type) {
      case 'program':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        data = await LoyaltyService.getProgramByPromoter(promoterId)
        break

      case 'member':
        const memberId = searchParams.get('memberId')
        if (memberId) {
          data = await LoyaltyService.getMember(memberId)
        } else if (promoterId && searchParams.get('customerId')) {
          data = await LoyaltyService.getMemberByCustomer(promoterId, searchParams.get('customerId')!)
        }
        break

      case 'members':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const memberFilters: any = {}
        if (searchParams.get('tier')) memberFilters.tier = searchParams.get('tier')
        data = await LoyaltyService.getMembers(promoterId, memberFilters)
        break

      case 'rewards':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        data = await LoyaltyService.getRewards(promoterId, { status: 'active' })
        break

      case 'availableRewards':
        const rewardMemberId = searchParams.get('memberId')
        if (!rewardMemberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 })
        data = await LoyaltyService.getAvailableRewards(rewardMemberId)
        break

      case 'pointsHistory':
        const historyMemberId = searchParams.get('memberId')
        if (!historyMemberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 })
        data = await LoyaltyService.getPointsHistory(historyMemberId)
        break

      case 'redemptions':
        const redemptionMemberId = searchParams.get('memberId')
        if (!redemptionMemberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 })
        data = await LoyaltyService.getRedemptions(redemptionMemberId)
        break

      case 'referrals':
        const referralMemberId = searchParams.get('memberId')
        if (!referralMemberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 })
        data = await LoyaltyService.getReferrals(referralMemberId)
        break

      case 'memberAnalytics':
        const analyticsMemberId = searchParams.get('memberId')
        if (!analyticsMemberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 })
        data = await LoyaltyService.getMemberAnalytics(analyticsMemberId)
        break

      case 'programAnalytics':
        const programId = searchParams.get('programId')
        if (!programId) return NextResponse.json({ error: 'programId required' }, { status: 400 })
        data = await LoyaltyService.getProgramAnalytics(programId)
        break

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    let result: any

    switch (action) {
      case 'createProgram':
        result = await LoyaltyService.createProgram(data.program, data.userId)
        break
      case 'updateProgram':
        await LoyaltyService.updateProgram(data.programId, data.updates, data.userId)
        result = { success: true }
        break
      case 'enrollMember':
        result = await LoyaltyService.enrollMember(data)
        break
      case 'awardPoints':
        result = await LoyaltyService.awardPoints(data.memberId, data.transaction)
        break
      case 'processPurchasePoints':
        result = await LoyaltyService.processPurchasePoints(
          data.memberId, data.orderId, data.purchaseAmount, data.categories
        )
        break
      case 'createReward':
        result = await LoyaltyService.createReward(data.reward)
        break
      case 'redeemReward':
        result = await LoyaltyService.redeemReward(data.memberId, data.rewardId)
        break
      case 'useRedemption':
        await LoyaltyService.useRedemption(data.redemptionId, data.orderId)
        result = { success: true }
        break
      case 'validateRedemptionCode':
        result = await LoyaltyService.validateRedemptionCode(data.code)
        break
      case 'createReferral':
        result = await LoyaltyService.createReferral(
          data.promoterId, data.programId, data.referrerId, data.refereeEmail
        )
        break
      case 'processReferralPurchase':
        await LoyaltyService.processReferralPurchase(data.memberId, data.purchaseAmount, data.orderId)
        result = { success: true }
        break
      case 'awardSocialShare':
        result = await LoyaltyService.awardSocialShare(data.memberId, data.platform, data.contentId)
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
