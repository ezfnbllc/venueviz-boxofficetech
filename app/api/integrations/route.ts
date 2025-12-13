import { NextRequest, NextResponse } from 'next/server'
import { IntegrationHubService } from '@/lib/services/integrationHubService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const promoterId = searchParams.get('promoterId')
    const type = searchParams.get('type')

    let data: any

    switch (type) {
      case 'providers':
        data = IntegrationHubService.getAvailableProviders()
        break

      case 'providerConfig':
        const provider = searchParams.get('provider') as any
        if (!provider) return NextResponse.json({ error: 'provider required' }, { status: 400 })
        data = IntegrationHubService.getProviderConfig(provider)
        break

      case 'integrations':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const intFilters: any = {}
        if (searchParams.get('category')) intFilters.category = searchParams.get('category')
        if (searchParams.get('provider')) intFilters.provider = searchParams.get('provider')
        if (searchParams.get('status')) intFilters.status = searchParams.get('status')
        data = await IntegrationHubService.getIntegrations(promoterId, intFilters)
        break

      case 'integration':
        const integrationId = searchParams.get('integrationId')
        if (!integrationId) return NextResponse.json({ error: 'integrationId required' }, { status: 400 })
        data = await IntegrationHubService.getIntegration(integrationId)
        break

      case 'syncJobs':
        const syncIntegrationId = searchParams.get('integrationId')
        if (!syncIntegrationId) return NextResponse.json({ error: 'integrationId required' }, { status: 400 })
        const jobFilters: any = {}
        if (searchParams.get('status')) jobFilters.status = searchParams.get('status')
        if (searchParams.get('limit')) jobFilters.limit = parseInt(searchParams.get('limit')!)
        data = await IntegrationHubService.getSyncJobs(syncIntegrationId, jobFilters)
        break

      case 'syncJob':
        const jobId = searchParams.get('jobId')
        if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })
        data = await IntegrationHubService.getSyncJob(jobId)
        break

      case 'webhookEndpoints':
        const webhookIntegrationId = searchParams.get('integrationId')
        if (!webhookIntegrationId) return NextResponse.json({ error: 'integrationId required' }, { status: 400 })
        data = await IntegrationHubService.getWebhookEndpoints(webhookIntegrationId)
        break

      case 'webhookEndpoint':
        const endpointId = searchParams.get('endpointId')
        if (!endpointId) return NextResponse.json({ error: 'endpointId required' }, { status: 400 })
        data = await IntegrationHubService.getWebhookEndpoint(endpointId)
        break

      case 'webhookDeliveries':
        const deliveryEndpointId = searchParams.get('endpointId')
        if (!deliveryEndpointId) return NextResponse.json({ error: 'endpointId required' }, { status: 400 })
        const deliveryLimit = parseInt(searchParams.get('limit') || '50')
        data = await IntegrationHubService.getWebhookDeliveries(deliveryEndpointId, deliveryLimit)
        break

      case 'oauthApps':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        data = await IntegrationHubService.getOAuthApps(promoterId)
        break

      case 'oauthApp':
        const appId = searchParams.get('appId')
        const clientId = searchParams.get('clientId')
        if (appId) {
          data = await IntegrationHubService.getOAuthApp(appId)
        } else if (clientId) {
          data = await IntegrationHubService.getOAuthAppByClientId(clientId)
        } else {
          return NextResponse.json({ error: 'appId or clientId required' }, { status: 400 })
        }
        break

      case 'analytics':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        data = await IntegrationHubService.getIntegrationAnalytics(promoterId)
        break

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Integration hub error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    let result: any

    switch (action) {
      // Integration management
      case 'createIntegration':
        result = await IntegrationHubService.createIntegration({
          promoterId: data.promoterId,
          name: data.name,
          provider: data.provider,
          config: data.config || {},
          credentials: data.credentials,
        })
        break

      case 'updateIntegration':
        await IntegrationHubService.updateIntegration(data.integrationId, data.updates)
        result = { success: true }
        break

      case 'updateCredentials':
        await IntegrationHubService.updateCredentials(data.integrationId, data.credentials)
        result = { success: true }
        break

      case 'disableIntegration':
        await IntegrationHubService.disableIntegration(data.integrationId)
        result = { success: true }
        break

      case 'deleteIntegration':
        await IntegrationHubService.deleteIntegration(data.integrationId)
        result = { success: true }
        break

      case 'testConnection':
        result = await IntegrationHubService.testConnection(data.integrationId)
        break

      // Mapping
      case 'createMapping':
        result = await IntegrationHubService.createMapping(data.integrationId, data.mapping)
        break

      case 'updateMapping':
        await IntegrationHubService.updateMapping(data.integrationId, data.updates)
        result = { success: true }
        break

      case 'applyMapping':
        result = IntegrationHubService.applyMapping(data.sourceData, data.mapping)
        break

      // Sync jobs
      case 'createSyncJob':
        result = await IntegrationHubService.createSyncJob(data.integrationId, {
          type: data.type,
          direction: data.direction,
          entity: data.entity,
        })
        break

      case 'startSyncJob':
        await IntegrationHubService.startSyncJob(data.jobId)
        result = { success: true }
        break

      case 'updateSyncProgress':
        await IntegrationHubService.updateSyncProgress(data.jobId, data.progress, data.log)
        result = { success: true }
        break

      case 'completeSyncJob':
        await IntegrationHubService.completeSyncJob(data.jobId, data.status, data.error)
        result = { success: true }
        break

      // Webhooks
      case 'createWebhookEndpoint':
        result = await IntegrationHubService.createWebhookEndpoint({
          integrationId: data.integrationId,
          promoterId: data.promoterId,
          name: data.name,
          url: data.url,
          events: data.events,
          headers: data.headers,
          status: 'active',
        })
        break

      case 'updateWebhookEndpoint':
        await IntegrationHubService.updateWebhookEndpoint(data.endpointId, data.updates)
        result = { success: true }
        break

      case 'deleteWebhookEndpoint':
        await IntegrationHubService.deleteWebhookEndpoint(data.endpointId)
        result = { success: true }
        break

      case 'triggerWebhook':
        result = await IntegrationHubService.triggerWebhook(data.endpointId, data.event, data.payload)
        break

      // OAuth apps
      case 'createOAuthApp':
        result = await IntegrationHubService.createOAuthApp({
          promoterId: data.promoterId,
          name: data.name,
          description: data.description,
          redirectUris: data.redirectUris,
          scopes: data.scopes,
          grantTypes: data.grantTypes,
          status: 'active',
        })
        break

      case 'regenerateClientSecret':
        result = { clientSecret: await IntegrationHubService.regenerateClientSecret(data.appId) }
        break

      case 'deleteOAuthApp':
        await IntegrationHubService.deleteOAuthApp(data.appId)
        result = { success: true }
        break

      // Metrics
      case 'recordRequest':
        await IntegrationHubService.recordRequest(data.integrationId, data.success, data.responseTime)
        result = { success: true }
        break

      case 'clearCache':
        IntegrationHubService.clearCache()
        result = { success: true }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Integration hub error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
