import { NextRequest, NextResponse } from 'next/server'
import { DataExportService } from '@/lib/services/dataExportService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const promoterId = searchParams.get('promoterId')
    const type = searchParams.get('type') // 'exports' | 'imports' | 'scheduled' | 'schema' | 'sample'

    if (!promoterId && type !== 'schema' && type !== 'sample') {
      return NextResponse.json({ error: 'promoterId is required' }, { status: 400 })
    }

    let data: any

    switch (type) {
      case 'exports':
        const exportFilters: any = {}
        if (searchParams.get('status')) exportFilters.status = [searchParams.get('status')]
        if (searchParams.get('exportType')) exportFilters.type = [searchParams.get('exportType')]
        data = await DataExportService.getExportJobs(promoterId!, exportFilters)
        break

      case 'imports':
        const importFilters: any = {}
        if (searchParams.get('status')) importFilters.status = [searchParams.get('status')]
        if (searchParams.get('importType')) importFilters.type = [searchParams.get('importType')]
        data = await DataExportService.getImportJobs(promoterId!, importFilters)
        break

      case 'scheduled':
        data = await DataExportService.getScheduledExports(promoterId!)
        break

      case 'schema':
        const schemaType = searchParams.get('schemaType') || 'events'
        data = DataExportService.getDataSchema(schemaType)
        break

      case 'sample':
        const sampleType = searchParams.get('sampleType') || 'events'
        const count = parseInt(searchParams.get('count') || '10')
        data = DataExportService.generateSampleData(sampleType, count)
        break

      case 'exportJob':
        const jobId = searchParams.get('jobId')
        if (!jobId) {
          return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
        }
        data = await DataExportService.getExportJob(jobId)
        break

      case 'importJob':
        const importJobId = searchParams.get('jobId')
        if (!importJobId) {
          return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
        }
        data = await DataExportService.getImportJob(importJobId)
        break

      case 'downloadUrl':
        const downloadJobId = searchParams.get('jobId')
        if (!downloadJobId) {
          return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
        }
        data = { url: await DataExportService.getExportDownloadUrl(downloadJobId) }
        break

      default:
        data = await DataExportService.getExportJobs(promoterId!)
        break
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Data export error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, promoterId, userId, ...data } = body

    if (!promoterId || !userId) {
      return NextResponse.json({ error: 'promoterId and userId are required' }, { status: 400 })
    }

    let result: any

    switch (action) {
      case 'createExport':
        result = await DataExportService.createExportJob({
          promoterId,
          requestedBy: userId,
          ...data.export,
        }, userId)
        break

      case 'createImport':
        result = await DataExportService.createImportJob({
          promoterId,
          requestedBy: userId,
          ...data.import,
        }, userId)
        break

      case 'processImport':
        await DataExportService.processImportJob(data.jobId, userId)
        result = { success: true }
        break

      case 'createScheduledExport':
        result = await DataExportService.createScheduledExport({
          promoterId,
          ...data.schedule,
        }, userId)
        break

      case 'updateScheduledExport':
        await DataExportService.updateScheduledExport(
          data.scheduleId,
          data.updates,
          userId
        )
        result = { success: true }
        break

      case 'pauseScheduledExport':
        await DataExportService.pauseScheduledExport(data.scheduleId, userId)
        result = { success: true }
        break

      case 'resumeScheduledExport':
        await DataExportService.resumeScheduledExport(data.scheduleId, userId)
        result = { success: true }
        break

      case 'runScheduledExportNow':
        result = await DataExportService.runScheduledExportNow(data.scheduleId, userId)
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Data export error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
