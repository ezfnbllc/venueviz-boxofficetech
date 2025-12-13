import { NextRequest, NextResponse } from 'next/server'
import { ABTestingService } from '@/lib/services/abTestingService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const promoterId = searchParams.get('promoterId')
    const type = searchParams.get('type')

    let data: any

    switch (type) {
      case 'experiments':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const expFilters: any = {}
        if (searchParams.get('status')) expFilters.status = searchParams.get('status')
        if (searchParams.get('expType')) expFilters.type = searchParams.get('expType')
        data = await ABTestingService.getExperiments(promoterId, expFilters)
        break

      case 'experiment':
        const experimentId = searchParams.get('experimentId')
        if (!experimentId) return NextResponse.json({ error: 'experimentId required' }, { status: 400 })
        data = await ABTestingService.getExperiment(experimentId)
        break

      case 'experimentStats':
        const statsExpId = searchParams.get('experimentId')
        if (!statsExpId) return NextResponse.json({ error: 'experimentId required' }, { status: 400 })
        data = await ABTestingService.getExperimentStats(statsExpId)
        break

      case 'results':
        const resultsExpId = searchParams.get('experimentId')
        if (!resultsExpId) return NextResponse.json({ error: 'experimentId required' }, { status: 400 })
        data = await ABTestingService.calculateResults(resultsExpId)
        break

      case 'assignment':
        const assignExpId = searchParams.get('experimentId')
        const visitorId = searchParams.get('visitorId')
        if (!assignExpId || !visitorId) {
          return NextResponse.json({ error: 'experimentId and visitorId required' }, { status: 400 })
        }
        data = await ABTestingService.getAssignment(assignExpId, visitorId)
        break

      case 'featureFlags':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        data = await ABTestingService.getFeatureFlags(promoterId)
        break

      case 'featureFlag':
        const flagId = searchParams.get('flagId')
        if (!flagId) return NextResponse.json({ error: 'flagId required' }, { status: 400 })
        data = await ABTestingService.getFeatureFlag(flagId)
        break

      case 'evaluateFlag':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const flagKey = searchParams.get('flagKey')
        if (!flagKey) return NextResponse.json({ error: 'flagKey required' }, { status: 400 })
        const context: any = {}
        if (searchParams.get('visitorId')) context.visitorId = searchParams.get('visitorId')
        if (searchParams.get('customerId')) context.customerId = searchParams.get('customerId')
        data = { value: await ABTestingService.evaluateFeatureFlag(flagKey, promoterId, context) }
        break

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('A/B Testing error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    let result: any

    switch (action) {
      case 'createExperiment':
        const expData = {
          ...data.experiment,
          schedule: data.experiment.schedule ? {
            ...data.experiment.schedule,
            startDate: new Date(data.experiment.schedule.startDate),
            endDate: data.experiment.schedule.endDate
              ? new Date(data.experiment.schedule.endDate)
              : undefined,
          } : undefined,
        }
        result = await ABTestingService.createExperiment(expData)
        break

      case 'updateExperiment':
        await ABTestingService.updateExperiment(data.experimentId, data.updates)
        result = { success: true }
        break

      case 'startExperiment':
        await ABTestingService.startExperiment(data.experimentId)
        result = { success: true }
        break

      case 'pauseExperiment':
        await ABTestingService.pauseExperiment(data.experimentId)
        result = { success: true }
        break

      case 'resumeExperiment':
        await ABTestingService.resumeExperiment(data.experimentId)
        result = { success: true }
        break

      case 'completeExperiment':
        await ABTestingService.completeExperiment(data.experimentId, data.winnerId)
        result = { success: true }
        break

      case 'deleteExperiment':
        await ABTestingService.deleteExperiment(data.experimentId)
        result = { success: true }
        break

      case 'assignVariant':
        result = await ABTestingService.assignVariant(
          data.experimentId, data.visitorId, data.customerId, data.metadata
        )
        break

      case 'recordConversion':
        await ABTestingService.recordConversion(
          data.experimentId, data.visitorId, data.goalId, data.revenue, data.metadata
        )
        result = { success: true }
        break

      case 'createFeatureFlag':
        const flagData = {
          ...data.flag,
          schedule: data.flag.schedule ? {
            enableAt: data.flag.schedule.enableAt ? new Date(data.flag.schedule.enableAt) : undefined,
            disableAt: data.flag.schedule.disableAt ? new Date(data.flag.schedule.disableAt) : undefined,
          } : undefined,
        }
        result = await ABTestingService.createFeatureFlag(flagData)
        break

      case 'updateFeatureFlag':
        await ABTestingService.updateFeatureFlag(data.flagId, data.updates)
        result = { success: true }
        break

      case 'toggleFeatureFlag':
        await ABTestingService.toggleFeatureFlag(data.flagId, data.active)
        result = { success: true }
        break

      case 'createPersonalizationCampaign':
        const campaignData = {
          ...data.campaign,
          schedule: data.campaign.schedule ? {
            start: new Date(data.campaign.schedule.start),
            end: data.campaign.schedule.end ? new Date(data.campaign.schedule.end) : undefined,
          } : undefined,
        }
        result = await ABTestingService.createPersonalizationCampaign(campaignData)
        break

      case 'getPersonalizationExperience':
        result = await ABTestingService.getPersonalizationExperience(data.promoterId, data.audienceIds)
        break

      case 'clearCache':
        ABTestingService.clearCache()
        result = { success: true }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('A/B Testing error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
