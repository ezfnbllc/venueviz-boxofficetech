'use client'

import { useState, useEffect } from 'react'

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'gdpr' | 'ccpa' | 'dsr' | 'consent'>('overview')
  const [loading, setLoading] = useState(true)

  const stats = {
    complianceScore: 94,
    pendingDSRs: 3,
    consentRate: 78,
    dataRetentionCompliant: true,
    lastAudit: '2024-01-05',
    openIssues: 2,
  }

  useEffect(() => {
    setTimeout(() => setLoading(false), 500)
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
          <h1 className="text-2xl font-bold text-white">Compliance & Legal</h1>
          <p className="text-gray-400 mt-1">GDPR, CCPA, and data privacy management</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            Run Audit
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            Export Report
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-xl rounded-xl p-4 border border-green-500/20">
          <p className="text-green-400 text-xs">Compliance Score</p>
          <p className="text-2xl font-bold text-white">{stats.complianceScore}%</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Pending DSRs</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.pendingDSRs}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Consent Rate</p>
          <p className="text-2xl font-bold text-white">{stats.consentRate}%</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Data Retention</p>
          <p className="text-2xl font-bold text-green-400">Compliant</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Last Audit</p>
          <p className="text-2xl font-bold text-white">{stats.lastAudit}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Open Issues</p>
          <p className="text-2xl font-bold text-red-400">{stats.openIssues}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit">
        {(['overview', 'gdpr', 'ccpa', 'dsr', 'consent'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors uppercase ${
              activeTab === tab
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Compliance Checklist</h3>
            <div className="space-y-3">
              {[
                { item: 'Privacy Policy Published', status: 'complete' },
                { item: 'Cookie Consent Banner', status: 'complete' },
                { item: 'Data Processing Agreement', status: 'complete' },
                { item: 'User Data Export', status: 'complete' },
                { item: 'Data Deletion Process', status: 'complete' },
                { item: 'Breach Notification Plan', status: 'pending' },
                { item: 'DPO Appointment', status: 'na' },
              ].map((check, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-white">{check.item}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    check.status === 'complete' ? 'bg-green-500/20 text-green-400' :
                    check.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {check.status === 'complete' ? '✓ Complete' : check.status === 'pending' ? '⏳ Pending' : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Compliance Events</h3>
            <div className="space-y-3">
              {[
                { event: 'DSR Export Completed', user: 'john@example.com', time: '2 hours ago', type: 'info' },
                { event: 'Privacy Policy Updated', user: 'Admin', time: '1 day ago', type: 'success' },
                { event: 'New Data Processing Agreement', user: 'Partner XYZ', time: '3 days ago', type: 'success' },
                { event: 'DSR Deletion Request', user: 'sarah@example.com', time: '5 days ago', type: 'warning' },
              ].map((event, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                  <span className={`text-lg ${
                    event.type === 'success' ? 'text-green-400' :
                    event.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                  }`}>
                    {event.type === 'success' ? '✓' : event.type === 'warning' ? '⚠️' : 'ℹ️'}
                  </span>
                  <div className="flex-1">
                    <p className="text-white">{event.event}</p>
                    <p className="text-gray-400 text-sm">{event.user} • {event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GDPR Tab */}
      {activeTab === 'gdpr' && (
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">GDPR Compliance Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'Lawful Basis', status: 'Documented', color: 'green' },
                { title: 'Data Mapping', status: 'Complete', color: 'green' },
                { title: 'Right to Erasure', status: 'Implemented', color: 'green' },
                { title: 'Data Portability', status: 'Implemented', color: 'green' },
              ].map((item, i) => (
                <div key={i} className="bg-white/5 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm">{item.title}</p>
                  <p className={`text-lg font-semibold mt-1 text-${item.color}-400`}>{item.status}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Data Processing Activities</h3>
            <div className="space-y-3">
              {[
                { activity: 'Customer Order Processing', basis: 'Contract', retention: '7 years' },
                { activity: 'Marketing Communications', basis: 'Consent', retention: 'Until withdrawn' },
                { activity: 'Analytics & Reporting', basis: 'Legitimate Interest', retention: '2 years' },
                { activity: 'Customer Support', basis: 'Contract', retention: '3 years' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-white">{item.activity}</span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-400">Basis: <span className="text-white">{item.basis}</span></span>
                    <span className="text-gray-400">Retention: <span className="text-white">{item.retention}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CCPA Tab */}
      {activeTab === 'ccpa' && (
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">CCPA Compliance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: 'Do Not Sell Link', status: 'Active', icon: '🔗' },
                { title: 'Privacy Notice', status: 'Updated', icon: '📄' },
                { title: 'Opt-Out Mechanism', status: 'Functional', icon: '⚙️' },
              ].map((item, i) => (
                <div key={i} className="bg-white/5 rounded-lg p-4 text-center">
                  <span className="text-3xl">{item.icon}</span>
                  <p className="text-white font-medium mt-2">{item.title}</p>
                  <p className="text-green-400 text-sm">{item.status}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">California Consumer Requests</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">45</p>
                <p className="text-gray-400 text-sm">Know Requests</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">23</p>
                <p className="text-gray-400 text-sm">Delete Requests</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">156</p>
                <p className="text-gray-400 text-sm">Opt-Out Requests</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-400">98%</p>
                <p className="text-gray-400 text-sm">Completion Rate</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DSR Tab */}
      {activeTab === 'dsr' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Data Subject Requests</h3>
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
              + New Request
            </button>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-gray-400 font-medium">Request ID</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Type</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Subject</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Due Date</th>
                  <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: 'DSR-001', type: 'Access', subject: 'john@example.com', status: 'pending', dueDate: '2024-01-15' },
                  { id: 'DSR-002', type: 'Deletion', subject: 'sarah@example.com', status: 'in_progress', dueDate: '2024-01-12' },
                  { id: 'DSR-003', type: 'Export', subject: 'mike@example.com', status: 'pending', dueDate: '2024-01-18' },
                  { id: 'DSR-004', type: 'Rectification', subject: 'emily@example.com', status: 'completed', dueDate: '2024-01-05' },
                ].map((dsr, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white font-medium">{dsr.id}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-white/10 text-gray-400 rounded text-sm">{dsr.type}</span>
                    </td>
                    <td className="p-4 text-gray-400">{dsr.subject}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        dsr.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        dsr.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {dsr.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400">{dsr.dueDate}</td>
                    <td className="p-4 text-right">
                      <button className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                        Process
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Consent Tab */}
      {activeTab === 'consent' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Consent Categories</h3>
            <div className="space-y-4">
              {[
                { category: 'Essential Cookies', rate: 100, required: true },
                { category: 'Analytics', rate: 72, required: false },
                { category: 'Marketing', rate: 58, required: false },
                { category: 'Personalization', rate: 65, required: false },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white">{item.category}</span>
                    <span className="text-gray-400">
                      {item.required ? 'Required' : `${item.rate}% consent`}
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.required ? 'bg-gray-500' : 'bg-purple-500'}`}
                      style={{ width: `${item.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Cookie Banner Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">Show Cookie Banner</p>
                  <p className="text-gray-400 text-sm">Display consent banner to visitors</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-green-600">
                    <div className="absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5" />
                  </div>
                </label>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">Granular Consent</p>
                  <p className="text-gray-400 text-sm">Allow per-category consent</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-green-600">
                    <div className="absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5" />
                  </div>
                </label>
              </div>
              <button className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                Update Banner Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
