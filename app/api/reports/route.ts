import { NextRequest, NextResponse } from 'next/server'
import { ReportService, ReportType } from '@/lib/services/reportService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      type,
      title,
      startDate,
      endDate,
      filters,
      format = 'json',
      includeCharts = false
    } = body

    if (!type) {
      return NextResponse.json({
        success: false,
        error: 'Report type is required'
      }, { status: 400 })
    }

    const validTypes: ReportType[] = [
      'sales_summary',
      'event_performance',
      'customer_analysis',
      'revenue_breakdown',
      'promoter_performance',
      'venue_utilization',
      'ticket_inventory',
      'refund_analysis',
      'commission_report',
      'marketing_effectiveness'
    ]

    if (!validTypes.includes(type)) {
      return NextResponse.json({
        success: false,
        error: `Invalid report type. Valid types: ${validTypes.join(', ')}`
      }, { status: 400 })
    }

    const report = await ReportService.generateReport({
      type,
      title,
      dateRange: startDate && endDate ? {
        start: new Date(startDate),
        end: new Date(endDate)
      } : undefined,
      filters,
      format,
      includeCharts
    })

    if (!report) {
      return NextResponse.json({
        success: false,
        error: 'Failed to generate report'
      }, { status: 500 })
    }

    // Return CSV if requested
    if (format === 'csv') {
      const csv = ReportService.exportToCsv(report)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${report.type}_${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    return NextResponse.json({
      success: true,
      report
    })
  } catch (error: any) {
    console.error('[API] Report generation error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate report'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return available report types and their descriptions
    const reportTypes = [
      { type: 'sales_summary', name: 'Sales Summary', description: 'Overview of sales performance' },
      { type: 'event_performance', name: 'Event Performance', description: 'Detailed event metrics and comparisons' },
      { type: 'customer_analysis', name: 'Customer Analysis', description: 'Customer behavior and lifetime value' },
      { type: 'revenue_breakdown', name: 'Revenue Breakdown', description: 'Revenue by category, venue, and time' },
      { type: 'promoter_performance', name: 'Promoter Performance', description: 'Promoter sales and commission data' },
      { type: 'venue_utilization', name: 'Venue Utilization', description: 'Venue capacity and usage metrics' },
      { type: 'ticket_inventory', name: 'Ticket Inventory', description: 'Available tickets and sell-through rates' },
      { type: 'refund_analysis', name: 'Refund Analysis', description: 'Refund patterns and trends' },
      { type: 'commission_report', name: 'Commission Report', description: 'Promoter commission calculations' },
      { type: 'marketing_effectiveness', name: 'Marketing Effectiveness', description: 'Promo code usage and ROI' }
    ]

    return NextResponse.json({
      success: true,
      reportTypes
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
