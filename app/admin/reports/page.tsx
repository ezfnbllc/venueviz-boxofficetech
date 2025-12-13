'use client'

import { useState, useEffect } from 'react'

interface Report {
  id: string
  name: string
  category: string
  lastGenerated: string
  schedule?: string
  format: string
  recipients?: number
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'library' | 'scheduled' | 'custom'>('library')
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<Report[]>([])

  useEffect(() => {
    setTimeout(() => {
      setReports([
        { id: '1', name: 'Monthly Revenue Summary', category: 'Financial', lastGenerated: '2024-01-01', schedule: 'Monthly', format: 'PDF', recipients: 5 },
        { id: '2', name: 'Weekly Sales Report', category: 'Sales', lastGenerated: '2024-01-08', schedule: 'Weekly', format: 'Excel', recipients: 8 },
        { id: '3', name: 'Customer Acquisition Report', category: 'Marketing', lastGenerated: '2024-01-07', schedule: 'Weekly', format: 'PDF', recipients: 3 },
        { id: '4', name: 'Event Performance Analysis', category: 'Events', lastGenerated: '2024-01-05', format: 'PDF' },
        { id: '5', name: 'Refund & Chargeback Report', category: 'Financial', lastGenerated: '2024-01-08', schedule: 'Daily', format: 'Email', recipients: 2 },
        { id: '6', name: 'Inventory Status Report', category: 'Operations', lastGenerated: '2024-01-08', format: 'Excel' },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const reportCategories = ['Financial', 'Sales', 'Marketing', 'Events', 'Operations', 'Customers']

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
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-gray-400 mt-1">Generate and schedule business reports</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + Custom Report
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            Schedule
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit">
        {(['library', 'scheduled', 'custom'] as const).map((tab) => (
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

      {/* Library Tab */}
      {activeTab === 'library' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportCategories.map((category) => (
            <div key={category} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">{category}</h3>
              <div className="space-y-2">
                {reports.filter(r => r.category === category).map(report => (
                  <button
                    key={report.id}
                    className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-sm transition-colors flex items-center justify-between"
                  >
                    <span>{report.name}</span>
                    <span className="text-purple-400">→</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scheduled Tab */}
      {activeTab === 'scheduled' && (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-gray-400 font-medium">Report</th>
                <th className="text-left p-4 text-gray-400 font-medium">Category</th>
                <th className="text-left p-4 text-gray-400 font-medium">Schedule</th>
                <th className="text-left p-4 text-gray-400 font-medium">Format</th>
                <th className="text-left p-4 text-gray-400 font-medium">Recipients</th>
                <th className="text-left p-4 text-gray-400 font-medium">Last Run</th>
                <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.filter(r => r.schedule).map((report) => (
                <tr key={report.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4 text-white font-medium">{report.name}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-white/10 text-gray-400 rounded text-sm">{report.category}</span>
                  </td>
                  <td className="p-4 text-gray-400">{report.schedule}</td>
                  <td className="p-4 text-gray-400">{report.format}</td>
                  <td className="p-4 text-gray-400">{report.recipients || 0}</td>
                  <td className="p-4 text-gray-400">{report.lastGenerated}</td>
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
      )}

      {/* Custom Tab */}
      {activeTab === 'custom' && (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Build Custom Report</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Report Name</label>
                <input
                  type="text"
                  placeholder="My Custom Report"
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Data Source</label>
                <select className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option>Orders</option>
                  <option>Events</option>
                  <option>Customers</option>
                  <option>Revenue</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Date Range</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <input type="date" className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  <input type="date" className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Output Format</label>
                <select className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option>PDF</option>
                  <option>Excel</option>
                  <option>CSV</option>
                </select>
              </div>
              <button className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                Generate Report
              </button>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-white font-medium mb-4">Available Columns</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {['Order ID', 'Date', 'Customer', 'Event', 'Tickets', 'Amount', 'Status', 'Payment Method'].map(col => (
                  <label key={col} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded cursor-pointer">
                    <input type="checkbox" className="rounded bg-white/10 border-white/20 text-purple-600" />
                    <span className="text-gray-300">{col}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
