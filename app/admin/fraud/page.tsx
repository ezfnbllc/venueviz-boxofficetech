'use client'

import { useState, useEffect } from 'react'

interface FraudAlert {
  id: string
  type: string
  severity: 'high' | 'medium' | 'low'
  order: string
  customer: string
  amount: number
  reason: string
  status: 'pending' | 'reviewed' | 'blocked' | 'cleared'
  createdAt: string
}

export default function FraudDetectionPage() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'rules' | 'blocked' | 'analytics'>('alerts')
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<FraudAlert[]>([])

  const stats = {
    activeAlerts: 12,
    blockedToday: 5,
    reviewRate: 98,
    falsePositiveRate: 3.2,
    amountProtected: 45800,
    riskScore: 'Low',
  }

  useEffect(() => {
    setTimeout(() => {
      setAlerts([
        { id: 'FA001', type: 'Velocity', severity: 'high', order: 'ORD-12345', customer: 'suspicious@email.com', amount: 2500, reason: '15 orders in 5 minutes', status: 'pending', createdAt: '2024-01-08T11:30:00' },
        { id: 'FA002', type: 'Card Test', severity: 'high', order: 'ORD-12346', customer: 'test@example.com', amount: 1, reason: 'Multiple failed CVV attempts', status: 'blocked', createdAt: '2024-01-08T11:25:00' },
        { id: 'FA003', type: 'Address Mismatch', severity: 'medium', order: 'ORD-12347', customer: 'john@example.com', amount: 450, reason: 'Billing/shipping address mismatch', status: 'reviewed', createdAt: '2024-01-08T11:20:00' },
        { id: 'FA004', type: 'High Value', severity: 'medium', order: 'ORD-12348', customer: 'buyer@example.com', amount: 5000, reason: 'Order exceeds $2000 threshold', status: 'cleared', createdAt: '2024-01-08T10:15:00' },
        { id: 'FA005', type: 'Proxy/VPN', severity: 'low', order: 'ORD-12349', customer: 'customer@example.com', amount: 150, reason: 'VPN detected', status: 'pending', createdAt: '2024-01-08T09:45:00' },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500/20 text-red-400'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400'
      case 'low': return 'bg-blue-500/20 text-blue-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400'
      case 'reviewed': return 'bg-blue-500/20 text-blue-400'
      case 'blocked': return 'bg-red-500/20 text-red-400'
      case 'cleared': return 'bg-green-500/20 text-green-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

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
          <h1 className="text-2xl font-bold text-white">Fraud Detection</h1>
          <p className="text-gray-400 mt-1">Monitor and manage suspicious activities</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + Add Rule
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-red-500/10 backdrop-blur-xl rounded-xl p-4 border border-red-500/20">
          <p className="text-red-400 text-xs">Active Alerts</p>
          <p className="text-2xl font-bold text-white">{stats.activeAlerts}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Blocked Today</p>
          <p className="text-2xl font-bold text-red-400">{stats.blockedToday}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Review Rate</p>
          <p className="text-2xl font-bold text-green-400">{stats.reviewRate}%</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">False Positive</p>
          <p className="text-2xl font-bold text-white">{stats.falsePositiveRate}%</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Protected</p>
          <p className="text-2xl font-bold text-green-400">${(stats.amountProtected / 1000).toFixed(1)}K</p>
        </div>
        <div className="bg-green-500/10 backdrop-blur-xl rounded-xl p-4 border border-green-500/20">
          <p className="text-green-400 text-xs">Risk Score</p>
          <p className="text-2xl font-bold text-white">{stats.riskScore}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit">
        {(['alerts', 'rules', 'blocked', 'analytics'] as const).map((tab) => (
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

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div key={alert.id} className={`bg-white/5 backdrop-blur-xl rounded-xl p-6 border ${
              alert.severity === 'high' ? 'border-red-500/30' : 'border-white/10'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className={`text-2xl ${alert.severity === 'high' ? 'animate-pulse' : ''}`}>
                    {alert.severity === 'high' ? '🚨' : alert.severity === 'medium' ? '⚠️' : 'ℹ️'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">{alert.type}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(alert.status)}`}>
                        {alert.status}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">{alert.reason}</p>
                  </div>
                </div>
                {alert.status === 'pending' && (
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors">
                      Block
                    </button>
                    <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors">
                      Clear
                    </button>
                    <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                      Review
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Order:</span>
                  <span className="text-white ml-2">{alert.order}</span>
                </div>
                <div>
                  <span className="text-gray-400">Customer:</span>
                  <span className="text-white ml-2">{alert.customer}</span>
                </div>
                <div>
                  <span className="text-gray-400">Amount:</span>
                  <span className="text-white ml-2">${alert.amount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400">Time:</span>
                  <span className="text-white ml-2">{new Date(alert.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {[
            { name: 'Velocity Check', description: 'Block >10 orders per IP in 5 minutes', status: 'active', blocked: 45 },
            { name: 'Card Testing', description: 'Block after 3 failed CVV attempts', status: 'active', blocked: 128 },
            { name: 'High Value Alert', description: 'Flag orders over $2,000', status: 'active', blocked: 0 },
            { name: 'Address Mismatch', description: 'Flag when billing != shipping address', status: 'active', blocked: 12 },
            { name: 'Proxy/VPN Detection', description: 'Flag orders from known VPN IPs', status: 'active', blocked: 28 },
            { name: 'New Account + High Value', description: 'Flag new accounts with >$500 orders', status: 'paused', blocked: 8 },
          ].map((rule, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold">{rule.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      rule.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {rule.status}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">{rule.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-white font-medium">{rule.blocked}</p>
                    <p className="text-gray-400 text-sm">blocked</p>
                  </div>
                  <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Blocked Tab */}
      {activeTab === 'blocked' && (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-gray-400 font-medium">Identifier</th>
                <th className="text-left p-4 text-gray-400 font-medium">Type</th>
                <th className="text-left p-4 text-gray-400 font-medium">Reason</th>
                <th className="text-left p-4 text-gray-400 font-medium">Blocked On</th>
                <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { identifier: '192.168.1.100', type: 'IP Address', reason: 'Velocity violation', blockedOn: '2024-01-08' },
                { identifier: '**** **** **** 4242', type: 'Card', reason: 'Card testing', blockedOn: '2024-01-07' },
                { identifier: 'fraud@example.com', type: 'Email', reason: 'Chargeback history', blockedOn: '2024-01-05' },
              ].map((item, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4 text-white font-mono">{item.identifier}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-white/10 text-gray-400 rounded text-sm">{item.type}</span>
                  </td>
                  <td className="p-4 text-gray-400">{item.reason}</td>
                  <td className="p-4 text-gray-400">{item.blockedOn}</td>
                  <td className="p-4 text-right">
                    <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                      Unblock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Fraud Attempts Over Time</h3>
            <div className="h-48 flex items-end gap-2">
              {[5, 8, 12, 6, 15, 9, 7].map((count, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-red-600 to-red-400 rounded-t"
                    style={{ height: `${(count / 20) * 100}%` }}
                  />
                  <span className="text-gray-500 text-xs mt-2">Day {i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Fraud by Type</h3>
            <div className="space-y-4">
              {[
                { type: 'Velocity', count: 45, percentage: 35 },
                { type: 'Card Testing', count: 38, percentage: 30 },
                { type: 'Address Mismatch', count: 25, percentage: 20 },
                { type: 'Proxy/VPN', count: 19, percentage: 15 },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white">{item.type}</span>
                    <span className="text-gray-400">{item.count} ({item.percentage}%)</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
