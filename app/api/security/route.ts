import { NextRequest, NextResponse } from 'next/server'
import { ApiSecurityService } from '@/lib/services/apiSecurityService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const promoterId = searchParams.get('promoterId')
    const type = searchParams.get('type')

    let data: any

    switch (type) {
      case 'apiKeys':
        if (!promoterId) {
          return NextResponse.json({ error: 'promoterId is required' }, { status: 400 })
        }
        data = await ApiSecurityService.getApiKeys(promoterId)
        break

      case 'blockedIps':
        data = await ApiSecurityService.getBlockedIps(promoterId || undefined)
        break

      case 'incidents':
        const incidentFilters: any = {}
        if (promoterId) incidentFilters.promoterId = promoterId
        if (searchParams.get('severity')) incidentFilters.severity = [searchParams.get('severity')]
        if (searchParams.get('status')) incidentFilters.status = [searchParams.get('status')]
        if (searchParams.get('incidentType')) incidentFilters.type = [searchParams.get('incidentType')]
        data = await ApiSecurityService.getIncidents(incidentFilters)
        break

      case 'rateLimitStats':
        const keyId = searchParams.get('keyId')
        if (!keyId) {
          return NextResponse.json({ error: 'keyId is required' }, { status: 400 })
        }
        data = await ApiSecurityService.getRateLimitStats(keyId)
        break

      case 'dashboard':
        if (!promoterId) {
          return NextResponse.json({ error: 'promoterId is required' }, { status: 400 })
        }
        data = await ApiSecurityService.getSecurityDashboard(promoterId)
        break

      case 'securityHeaders':
        data = ApiSecurityService.getSecurityHeaders()
        break

      default:
        if (!promoterId) {
          return NextResponse.json({ error: 'promoterId is required' }, { status: 400 })
        }
        data = await ApiSecurityService.getSecurityDashboard(promoterId)
        break
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Security API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userId, ...data } = body

    let result: any

    switch (action) {
      case 'createApiKey':
        if (!userId) {
          return NextResponse.json({ error: 'userId is required' }, { status: 400 })
        }
        result = await ApiSecurityService.createApiKey(data.keyData, userId)
        break

      case 'validateApiKey':
        result = await ApiSecurityService.validateApiKey(data.rawKey)
        break

      case 'updateApiKey':
        if (!userId) {
          return NextResponse.json({ error: 'userId is required' }, { status: 400 })
        }
        await ApiSecurityService.updateApiKey(data.keyId, data.updates, userId)
        result = { success: true }
        break

      case 'revokeApiKey':
        if (!userId) {
          return NextResponse.json({ error: 'userId is required' }, { status: 400 })
        }
        await ApiSecurityService.revokeApiKey(data.keyId, userId)
        result = { success: true }
        break

      case 'rotateApiKey':
        if (!userId) {
          return NextResponse.json({ error: 'userId is required' }, { status: 400 })
        }
        result = await ApiSecurityService.rotateApiKey(data.keyId, userId)
        break

      case 'checkRateLimit':
        result = await ApiSecurityService.checkRateLimit(data.apiKey, data.ipAddress)
        break

      case 'checkIpBlocked':
        result = await ApiSecurityService.checkIpBlocked(data.ip, data.promoterId)
        break

      case 'blockIp':
        if (!userId) {
          return NextResponse.json({ error: 'userId is required' }, { status: 400 })
        }
        result = await ApiSecurityService.blockIp(data.blockData, userId)
        break

      case 'unblockIp':
        if (!userId) {
          return NextResponse.json({ error: 'userId is required' }, { status: 400 })
        }
        await ApiSecurityService.unblockIp(data.ruleId, userId)
        result = { success: true }
        break

      case 'reportIncident':
        result = await ApiSecurityService.reportIncident(data.incident)
        break

      case 'resolveIncident':
        if (!userId) {
          return NextResponse.json({ error: 'userId is required' }, { status: 400 })
        }
        await ApiSecurityService.resolveIncident(data.incidentId, data.resolution, userId)
        result = { success: true }
        break

      case 'createWebhookSignature':
        result = await ApiSecurityService.createWebhookSignature(data.promoterId, data.webhookId)
        break

      case 'verifyWebhookSignature':
        result = {
          valid: ApiSecurityService.verifyWebhookSignature(data.payload, data.signature, data.secret),
        }
        break

      case 'createSecurityPolicy':
        if (!userId) {
          return NextResponse.json({ error: 'userId is required' }, { status: 400 })
        }
        result = await ApiSecurityService.createSecurityPolicy(data.policy, userId)
        break

      case 'evaluateSecurityPolicies':
        result = await ApiSecurityService.evaluateSecurityPolicies(data.promoterId, data.request)
        break

      case 'validateRequestBody':
        result = ApiSecurityService.validateRequestBody(data.body, data.maxSize)
        break

      case 'sanitizeInput':
        result = { sanitized: ApiSecurityService.sanitizeInput(data.input) }
        break

      case 'clearCache':
        ApiSecurityService.clearCache()
        result = { success: true }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Security API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
