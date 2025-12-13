import { NextRequest, NextResponse } from 'next/server'
import { AuditService } from '@/lib/services/auditService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    // Get stats
    if (action === 'stats') {
      const promoterId = searchParams.get('promoterId') || undefined
      const days = parseInt(searchParams.get('days') || '30')
      const stats = await AuditService.getStats({ promoterId, days })

      return NextResponse.json({
        success: true,
        stats
      })
    }

    // Get user activity
    if (action === 'userActivity') {
      const userId = searchParams.get('userId')
      if (!userId) {
        return NextResponse.json({
          success: false,
          error: 'userId is required'
        }, { status: 400 })
      }

      const days = parseInt(searchParams.get('days') || '30')
      const activity = await AuditService.getUserActivity(userId, days)

      return NextResponse.json({
        success: true,
        activity
      })
    }

    // Get resource history
    if (action === 'resourceHistory') {
      const resource = searchParams.get('resource') as any
      const resourceId = searchParams.get('resourceId')

      if (!resource || !resourceId) {
        return NextResponse.json({
          success: false,
          error: 'resource and resourceId are required'
        }, { status: 400 })
      }

      const history = await AuditService.getResourceHistory(resource, resourceId)

      return NextResponse.json({
        success: true,
        history
      })
    }

    // Detect suspicious activity
    if (action === 'suspicious') {
      const failedLoginThreshold = parseInt(searchParams.get('threshold') || '5')
      const timeWindowMinutes = parseInt(searchParams.get('window') || '30')

      const result = await AuditService.detectSuspiciousActivity({
        failedLoginThreshold,
        timeWindowMinutes
      })

      return NextResponse.json({
        success: true,
        ...result
      })
    }

    // Get logs with filters
    const limit = parseInt(searchParams.get('limit') || '100')
    const userId = searchParams.get('userId') || undefined
    const promoterId = searchParams.get('promoterId') || undefined
    const actionFilter = searchParams.get('actionFilter')
    const resource = searchParams.get('resource')
    const severity = searchParams.get('severity')
    const status = searchParams.get('status') as any
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const searchTerm = searchParams.get('searchTerm') || undefined

    const logs = await AuditService.getLogs({
      limit,
      userId,
      promoterId,
      action: actionFilter ? actionFilter.split(',') as any : undefined,
      resource: resource ? resource.split(',') as any : undefined,
      severity: severity ? severity.split(',') as any : undefined,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      searchTerm
    })

    return NextResponse.json({
      success: true,
      logs,
      count: logs.length
    })
  } catch (error: any) {
    console.error('[API] Audit error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch audit logs'
    }, { status: 500 })
  }
}
