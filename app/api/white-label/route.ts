import { NextRequest, NextResponse } from 'next/server'
import { WhiteLabelService } from '@/lib/services/whiteLabelService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')

    let data: any

    switch (type) {
      case 'tenant':
        const tenantId = searchParams.get('tenantId')
        if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
        data = await WhiteLabelService.getTenant(tenantId)
        break

      case 'tenantBySlug':
        const slug = searchParams.get('slug')
        if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })
        data = await WhiteLabelService.getTenantBySlug(slug)
        break

      case 'tenantByDomain':
        const domain = searchParams.get('domain')
        if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 })
        data = await WhiteLabelService.getTenantByDomain(domain)
        break

      case 'tenants':
        const tenantFilters: any = {}
        if (searchParams.get('status')) tenantFilters.status = searchParams.get('status')
        if (searchParams.get('tenantType')) tenantFilters.type = searchParams.get('tenantType')
        if (searchParams.get('planId')) tenantFilters.planId = searchParams.get('planId')
        data = await WhiteLabelService.getTenants(tenantFilters)
        break

      case 'brandingCSS':
        const cssTenantId = searchParams.get('tenantId')
        if (!cssTenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
        data = await WhiteLabelService.getBrandingCSS(cssTenantId)
        break

      case 'tenantUsers':
        const usersTenantId = searchParams.get('tenantId')
        if (!usersTenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
        data = await WhiteLabelService.getTenantUsers(usersTenantId)
        break

      case 'invite':
        const token = searchParams.get('token')
        if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })
        data = await WhiteLabelService.getInviteByToken(token)
        break

      case 'checkLimit':
        const limitTenantId = searchParams.get('tenantId')
        const limitType = searchParams.get('limitType') as any
        const incrementAmount = parseInt(searchParams.get('increment') || '1')
        if (!limitTenantId || !limitType) {
          return NextResponse.json({ error: 'tenantId and limitType required' }, { status: 400 })
        }
        data = await WhiteLabelService.checkLimit(limitTenantId, limitType, incrementAmount)
        break

      case 'auditLogs':
        const auditTenantId = searchParams.get('tenantId')
        if (!auditTenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
        const auditFilters: any = {}
        if (searchParams.get('userId')) auditFilters.userId = searchParams.get('userId')
        if (searchParams.get('action')) auditFilters.action = searchParams.get('action')
        if (searchParams.get('resource')) auditFilters.resource = searchParams.get('resource')
        if (searchParams.get('startDate')) auditFilters.startDate = new Date(searchParams.get('startDate')!)
        if (searchParams.get('endDate')) auditFilters.endDate = new Date(searchParams.get('endDate')!)
        if (searchParams.get('limit')) auditFilters.limit = parseInt(searchParams.get('limit')!)
        data = await WhiteLabelService.getAuditLogs(auditTenantId, auditFilters)
        break

      case 'plans':
        const includeHidden = searchParams.get('includeHidden') === 'true'
        data = await WhiteLabelService.getPlans(includeHidden)
        break

      case 'plan':
        const planId = searchParams.get('planId')
        if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 })
        data = await WhiteLabelService.getPlan(planId)
        break

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('White-label error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    let result: any

    switch (action) {
      // Tenant management
      case 'createTenant':
        result = await WhiteLabelService.createTenant({
          name: data.name,
          owner: data.owner,
          planId: data.planId,
          type: data.type,
          branding: data.branding,
          settings: data.settings,
        })
        break

      case 'updateTenant':
        await WhiteLabelService.updateTenant(data.tenantId, data.updates)
        result = { success: true }
        break

      case 'suspendTenant':
        await WhiteLabelService.suspendTenant(data.tenantId, data.reason)
        result = { success: true }
        break

      case 'activateTenant':
        await WhiteLabelService.activateTenant(data.tenantId)
        result = { success: true }
        break

      case 'terminateTenant':
        await WhiteLabelService.terminateTenant(data.tenantId)
        result = { success: true }
        break

      // Branding
      case 'updateBranding':
        await WhiteLabelService.updateBranding(data.tenantId, data.branding)
        result = { success: true }
        break

      // Domains
      case 'addDomain':
        result = await WhiteLabelService.addDomain(data.tenantId, data.domain, data.domainType)
        break

      case 'verifyDomain':
        result = await WhiteLabelService.verifyDomain(data.tenantId, data.domainId)
        break

      case 'removeDomain':
        await WhiteLabelService.removeDomain(data.tenantId, data.domainId)
        result = { success: true }
        break

      // Subscription & billing
      case 'changePlan':
        await WhiteLabelService.changePlan(data.tenantId, data.planId, data.billingCycle)
        result = { success: true }
        break

      case 'updatePaymentMethod':
        await WhiteLabelService.updatePaymentMethod(data.tenantId, data.paymentMethod)
        result = { success: true }
        break

      case 'cancelSubscription':
        await WhiteLabelService.cancelSubscription(data.tenantId)
        result = { success: true }
        break

      case 'reactivateSubscription':
        await WhiteLabelService.reactivateSubscription(data.tenantId)
        result = { success: true }
        break

      // Features & limits
      case 'updateFeatures':
        await WhiteLabelService.updateFeatures(data.tenantId, data.features)
        result = { success: true }
        break

      case 'setFeatureFlag':
        await WhiteLabelService.setFeatureFlag(data.tenantId, data.flag, data.enabled)
        result = { success: true }
        break

      case 'updateLimits':
        await WhiteLabelService.updateLimits(data.tenantId, data.limits)
        result = { success: true }
        break

      case 'incrementUsage':
        await WhiteLabelService.incrementUsage(data.tenantId, data.limitType, data.amount)
        result = { success: true }
        break

      // Users
      case 'addTenantUser':
        result = await WhiteLabelService.addTenantUser(data.tenantId, data.user)
        break

      case 'updateTenantUser':
        await WhiteLabelService.updateTenantUser(data.userId, data.updates)
        result = { success: true }
        break

      case 'removeTenantUser':
        await WhiteLabelService.removeTenantUser(data.userId)
        result = { success: true }
        break

      // Invitations
      case 'createInvite':
        result = await WhiteLabelService.createInvite(
          data.tenantId, data.email, data.role, data.invitedBy
        )
        break

      case 'acceptInvite':
        result = await WhiteLabelService.acceptInvite(data.token, data.userId, data.name)
        break

      // Audit logging
      case 'logAudit':
        await WhiteLabelService.logAudit(data.log)
        result = { success: true }
        break

      // Plans
      case 'createPlan':
        result = await WhiteLabelService.createPlan(data.plan)
        break

      case 'clearCache':
        WhiteLabelService.clearCache()
        result = { success: true }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('White-label error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
