'use client'

import { useState, useEffect } from 'react'

interface Dashboard {
  id: string
  name: string
  description: string
  widgets: number
  lastViewed: string
  shared: boolean
}

interface Report {
  id: string
  name: string
  type: 'scheduled' | 'on-demand'
  frequency?: string
  lastRun: string
  recipients?: number
  format: string
}

export default function BIDashboardPage() {
  const [activeTab, setActiveTab] = useState<'dashboards' | 'reports' | 'metrics' | 'alerts'>('dashboards')
  const [loading, setLoading] = useState(true)
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'ytd'>('30d')

  const metrics = {
    revenue: { current: 285400, previous: 248200, change: 15.0 },
    orders: { current: 4520, previous: 4180, change: 8.1 },
    customers: { current: 12840, previous: 11650, change: 10.2 },
    avgTicketPrice: { current: 63.15, previous: 59.38, change: 6.3 },
    conversionRate: { current: 4.2, previous: 3.8, change: 10.5 },
    eventCapacity: { current: 78, previous: 72, change: 8.3 },
  }

  useEffect(() => {
    setTimeout(() => {
      setDashboards([
        { id: '1', name: 'Executive Overview', description: 'High-level KPIs and trends', widgets: 8, lastViewed: '2024-01-08T10:30:00', shared: true },
        { id: '2', name: 'Sales Performance', description: 'Revenue, orders, and conversion metrics', widgets: 12, lastViewed: '2024-01-08T09:15:00', shared: true },
        { id: '3', name: 'Customer Analytics', description: 'Customer segments and behavior', widgets: 10, lastViewed: '2024-01-07T16:45:00', shared: false },
        { id: '4', name: 'Event Performance', description: 'Event-level metrics and comparisons', widgets: 9, lastViewed: '2024-01-06T14:20:00', shared: true },
        { id: '5', name: 'Marketing ROI', description: 'Campaign performance and attribution', widgets: 7, lastViewed: '2024-01-05T11:00:00', shared: false },
      ])
      setReports([
        { id: '1', name: 'Weekly Sales Report', type: 'scheduled', frequency: 'Weekly', lastRun: '2024-01-07', recipients: 5, format: 'PDF' },
        { id: '2', name: 'Monthly Revenue Summary', type: 'scheduled', frequency: 'Monthly', lastRun: '2024-01-01', recipients: 12, format: 'Excel' },
        { id: '3', name: 'Customer Churn Analysis', type: 'on-demand', lastRun: '2024-01-05', format: 'PDF' },
        { id: '4', name: 'Event Performance Breakdown', type: 'scheduled', frequency: 'Daily', lastRun: '2024-01-08', recipients: 3, format: 'Email' },
        { id: '5', name: 'Financial Reconciliation', type: 'scheduled', frequency: 'Monthly', lastRun: '2024-01-01', recipients: 2, format: 'Excel' },
      ])
      setLoading(false)
    }, 500)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Business Intelligence</h1>
          <p className="text-gray-400 mt-1">Dashboards, reports, and advanced analytics</p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="ytd">Year to Date</option>
          </select>
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + New Dashboard
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(metrics).map(([key, value]) => (
          <div key={key} className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
            <p className="text-gray-400 text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
            <p className="text-xl font-bold text-white mt-1">
              {key === 'revenue' ? `$${(value.current / 1000).toFixed(0)}K` :
               key === 'avgTicketPrice' ? `$${value.current}` :
               key === 'conversionRate' || key === 'eventCapacity' ? `${value.current}%` :
               value.current.toLocaleString()}
            </p>
            <p className={`text-xs mt-1 ${value.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {value.change >= 0 ? '+' : ''}{value.change}%
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit">
        {(['dashboards', 'reports', 'metrics', 'alerts'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Dashboards Tab */}
      {activeTab === 'dashboards' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboards.map((dashboard) => (
              <div key={dashboard.id} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-semibold">{dashboard.name}</h3>
                    <p className="text-gray-400 text-sm mt-1">{dashboard.description}</p>
                  </div>
                  {dashboard.shared && (
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">Shared</span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{dashboard.widgets} widgets</span>
                    <span>Viewed {new Date(dashboard.lastViewed).toLocaleDateString()}</span>
                  </div>
                  <button className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                    Open
                  </button>
                </div>
              </div>
            ))}

            {/* Create New Dashboard Card */}
            <button className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border-2 border-dashed border-white/20 hover:border-purple-500 transition-colors flex flex-col items-center justify-center min-h-[180px]">
              <span className="text-4xl mb-2">+</span>
              <span className="text-gray-400">Create New Dashboard</span>
            </button>
          </div>

          {/* Sample Dashboard Preview */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Executive Overview Preview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Mini Charts */}
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">Revenue Trend</p>
                <div className="h-20 flex items-end gap-1">
                  {[65, 72, 68, 78, 82, 75, 88, 92].map((h, i) => (
                    <div key={i} className="flex-1 bg-green-500 rounded-t" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">Orders by Channel</p>
                <div className="h-20 flex items-center justify-center">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-8 border-purple-500" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }} />
                    <div className="absolute inset-0 rounded-full border-8 border-blue-500" style={{ clipPath: 'polygon(50% 50%, 100% 0, 100% 100%)' }} />
                    <div className="absolute inset-0 rounded-full border-8 border-green-500" style={{ clipPath: 'polygon(50% 50%, 100% 100%, 0 100%)' }} />
                  </div>
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">Customer Growth</p>
                <div className="h-20 flex items-end gap-1">
                  {[45, 52, 58, 55, 62, 68, 72, 78].map((h, i) => (
                    <div key={i} className="flex-1 bg-blue-500 rounded-t" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">Event Fill Rate</p>
                <div className="h-20 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">78%</p>
                    <p className="text-green-400 text-xs">+6% vs last month</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Scheduled & On-Demand Reports</h3>
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
              + New Report
            </button>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-gray-400 font-medium">Report Name</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Type</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Frequency</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Last Run</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Format</th>
                  <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4">
                      <p className="text-white font-medium">{report.name}</p>
                      {report.recipients && (
                        <p className="text-gray-400 text-sm">{report.recipients} recipients</p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        report.type === 'scheduled' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {report.type}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400">{report.frequency || '-'}</td>
                    <td className="p-4 text-gray-400">{report.lastRun}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-white/10 text-white rounded text-xs">{report.format}</span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors mr-2">
                        Run Now
                      </button>
                      <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cohort Analysis */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Customer Cohort Retention</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-2 text-gray-400">Cohort</th>
                    <th className="text-center p-2 text-gray-400">M0</th>
                    <th className="text-center p-2 text-gray-400">M1</th>
                    <th className="text-center p-2 text-gray-400">M2</th>
                    <th className="text-center p-2 text-gray-400">M3</th>
                    <th className="text-center p-2 text-gray-400">M4</th>
                    <th className="text-center p-2 text-gray-400">M5</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { month: 'Jul 23', values: [100, 45, 38, 32, 28, 25] },
                    { month: 'Aug 23', values: [100, 48, 40, 35, 30, null] },
                    { month: 'Sep 23', values: [100, 52, 42, 36, null, null] },
                    { month: 'Oct 23', values: [100, 50, 44, null, null, null] },
                    { month: 'Nov 23', values: [100, 55, null, null, null, null] },
                    { month: 'Dec 23', values: [100, null, null, null, null, null] },
                  ].map((row, i) => (
                    <tr key={i}>
                      <td className="p-2 text-white">{row.month}</td>
                      {row.values.map((val, j) => (
                        <td key={j} className="p-2 text-center">
                          {val !== null ? (
                            <span className={`px-2 py-1 rounded ${
                              val >= 50 ? 'bg-green-500/30 text-green-400' :
                              val >= 30 ? 'bg-yellow-500/30 text-yellow-400' :
                              'bg-red-500/30 text-red-400'
                            }`}>
                              {val}%
                            </span>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Funnel Analysis */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Conversion Funnel</h3>
            <div className="space-y-4">
              {[
                { stage: 'Page Views', value: 125000, percentage: 100 },
                { stage: 'Event Views', value: 45000, percentage: 36 },
                { stage: 'Add to Cart', value: 12500, percentage: 10 },
                { stage: 'Checkout Started', value: 8200, percentage: 6.6 },
                { stage: 'Purchase Complete', value: 5250, percentage: 4.2 },
              ].map((step, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white">{step.stage}</span>
                    <span className="text-gray-400">{step.value.toLocaleString()} ({step.percentage}%)</span>
                  </div>
                  <div className="h-8 bg-white/10 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded flex items-center justify-end pr-2"
                      style={{ width: `${step.percentage}%` }}
                    >
                      {step.percentage > 15 && (
                        <span className="text-white text-xs font-medium">{step.percentage}%</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue by Source */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Revenue by Source</h3>
            <div className="space-y-3">
              {[
                { source: 'Direct', revenue: 125000, percentage: 44 },
                { source: 'Organic Search', revenue: 68000, percentage: 24 },
                { source: 'Paid Ads', revenue: 45000, percentage: 16 },
                { source: 'Social Media', revenue: 28000, percentage: 10 },
                { source: 'Email', revenue: 17000, percentage: 6 },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-32 text-white text-sm">{item.source}</div>
                  <div className="flex-1 h-6 bg-white/10 rounded overflow-hidden">
                    <div
                      className={`h-full rounded ${
                        i === 0 ? 'bg-purple-500' :
                        i === 1 ? 'bg-blue-500' :
                        i === 2 ? 'bg-green-500' :
                        i === 3 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <div className="w-24 text-right text-gray-400 text-sm">${(item.revenue / 1000).toFixed(0)}K</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Performing Events */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Top Performing Events</h3>
            <div className="space-y-3">
              {[
                { name: 'Summer Music Festival', revenue: 85000, tickets: 2500, fillRate: 98 },
                { name: 'Jazz Night Live', revenue: 42000, tickets: 1200, fillRate: 95 },
                { name: 'Comedy Gala 2024', revenue: 38000, tickets: 950, fillRate: 88 },
                { name: 'Rock Concert Series', revenue: 35000, tickets: 1100, fillRate: 82 },
                { name: 'Classical Evening', revenue: 28000, tickets: 600, fillRate: 75 },
              ].map((event, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{event.name}</p>
                    <p className="text-gray-400 text-sm">{event.tickets.toLocaleString()} tickets sold</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-medium">${(event.revenue / 1000).toFixed(0)}K</p>
                    <p className="text-gray-400 text-sm">{event.fillRate}% filled</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Metric Alerts</h3>
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
              + New Alert
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              { name: 'Low Conversion Rate', metric: 'Conversion Rate', condition: 'drops below 3%', status: 'active', triggered: false },
              { name: 'High Refund Rate', metric: 'Refund Rate', condition: 'exceeds 5%', status: 'active', triggered: true },
              { name: 'Revenue Target', metric: 'Daily Revenue', condition: 'drops below $5,000', status: 'active', triggered: false },
              { name: 'Event Sellout', metric: 'Event Capacity', condition: 'reaches 95%', status: 'active', triggered: true },
              { name: 'Customer Churn', metric: 'Monthly Churn', condition: 'exceeds 3%', status: 'paused', triggered: false },
            ].map((alert, i) => (
              <div key={i} className={`bg-white/5 backdrop-blur-xl rounded-xl p-4 border ${
                alert.triggered ? 'border-red-500/50' : 'border-white/10'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-white font-medium">{alert.name}</h4>
                    <p className="text-gray-400 text-sm">{alert.metric} {alert.condition}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {alert.triggered && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs animate-pulse">Triggered</span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      alert.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {alert.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                    Edit
                  </button>
                  <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                    {alert.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
