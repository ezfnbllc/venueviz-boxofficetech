'use client'

import { useState, useEffect } from 'react'

interface APIKey {
  id: string
  name: string
  key: string
  permissions: string[]
  lastUsed?: string
  createdAt: string
  status: 'active' | 'revoked'
}

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState<'api-keys' | 'access-control' | 'audit-log' | 'settings'>('api-keys')
  const [loading, setLoading] = useState(true)
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])

  const stats = {
    activeKeys: 5,
    totalRequests: 125000,
    uniqueUsers: 24,
    failedAttempts: 12,
    avgResponseTime: 145,
    uptime: 99.98,
  }

  useEffect(() => {
    setTimeout(() => {
      setApiKeys([
        { id: '1', name: 'Production API', key: 'pk_live_****...abc123', permissions: ['read', 'write'], lastUsed: '2024-01-08T11:30:00', createdAt: '2023-06-15', status: 'active' },
        { id: '2', name: 'Mobile App', key: 'pk_live_****...def456', permissions: ['read'], lastUsed: '2024-01-08T11:25:00', createdAt: '2023-08-20', status: 'active' },
        { id: '3', name: 'Analytics Integration', key: 'pk_live_****...ghi789', permissions: ['read'], lastUsed: '2024-01-08T10:00:00', createdAt: '2023-09-10', status: 'active' },
        { id: '4', name: 'Legacy System', key: 'pk_live_****...jkl012', permissions: ['read', 'write'], lastUsed: '2023-12-15', createdAt: '2023-01-01', status: 'revoked' },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400'
      case 'revoked': return 'bg-red-500/20 text-red-400'
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
          <h1 className="text-2xl font-bold text-white">API & Security</h1>
          <p className="text-gray-400 mt-1">Manage API keys and security settings</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + Generate Key
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            Documentation
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Active Keys</p>
          <p className="text-2xl font-bold text-white">{stats.activeKeys}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">API Requests</p>
          <p className="text-2xl font-bold text-white">{(stats.totalRequests / 1000).toFixed(0)}K</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Users</p>
          <p className="text-2xl font-bold text-white">{stats.uniqueUsers}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Failed Auth</p>
          <p className="text-2xl font-bold text-red-400">{stats.failedAttempts}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Avg Response</p>
          <p className="text-2xl font-bold text-white">{stats.avgResponseTime}ms</p>
        </div>
        <div className="bg-green-500/10 backdrop-blur-xl rounded-xl p-4 border border-green-500/20">
          <p className="text-green-400 text-xs">Uptime</p>
          <p className="text-2xl font-bold text-white">{stats.uptime}%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit">
        {(['api-keys', 'access-control', 'audit-log', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* API Keys Tab */}
      {activeTab === 'api-keys' && (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{apiKey.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(apiKey.status)}`}>
                      {apiKey.status}
                    </span>
                  </div>
                  <code className="text-gray-400 text-sm">{apiKey.key}</code>
                </div>
                <div className="flex gap-2">
                  {apiKey.status === 'active' && (
                    <>
                      <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                        Copy
                      </button>
                      <button className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors">
                        Revoke
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {apiKey.permissions.map((perm) => (
                  <span key={perm} className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs capitalize">
                    {perm}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-white/10">
                <div>
                  <span className="text-gray-400">Last Used:</span>
                  <span className="text-white ml-2">
                    {apiKey.lastUsed ? new Date(apiKey.lastUsed).toLocaleString() : 'Never'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Created:</span>
                  <span className="text-white ml-2">{apiKey.createdAt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Access Control Tab */}
      {activeTab === 'access-control' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">User Roles</h3>
            <div className="space-y-3">
              {[
                { role: 'Admin', users: 3, permissions: 'Full access' },
                { role: 'Manager', users: 8, permissions: 'Events, Orders, Reports' },
                { role: 'Support', users: 12, permissions: 'Orders, Customers' },
                { role: 'Viewer', users: 5, permissions: 'Read-only access' },
              ].map((role, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{role.role}</p>
                    <p className="text-gray-400 text-sm">{role.permissions}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">{role.users} users</span>
                    <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">IP Whitelist</h3>
            <div className="space-y-3 mb-4">
              {[
                { ip: '192.168.1.0/24', label: 'Office Network' },
                { ip: '10.0.0.0/8', label: 'Internal Services' },
                { ip: '203.0.113.50', label: 'VPN Gateway' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <code className="text-white">{item.ip}</code>
                    <p className="text-gray-400 text-sm">{item.label}</p>
                  </div>
                  <button className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors">
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button className="w-full py-2 border border-dashed border-white/20 rounded-lg text-gray-400 hover:text-white hover:border-purple-500 transition-colors">
              + Add IP Address
            </button>
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit-log' && (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-gray-400 font-medium">Action</th>
                <th className="text-left p-4 text-gray-400 font-medium">User</th>
                <th className="text-left p-4 text-gray-400 font-medium">Resource</th>
                <th className="text-left p-4 text-gray-400 font-medium">IP Address</th>
                <th className="text-left p-4 text-gray-400 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {[
                { action: 'API Key Created', user: 'admin@example.com', resource: 'API Key: Mobile App', ip: '192.168.1.100', time: '2024-01-08 11:30' },
                { action: 'User Login', user: 'manager@example.com', resource: '-', ip: '203.0.113.50', time: '2024-01-08 11:25' },
                { action: 'Settings Updated', user: 'admin@example.com', resource: 'Security Settings', ip: '192.168.1.100', time: '2024-01-08 10:15' },
                { action: 'Role Changed', user: 'admin@example.com', resource: 'user: support@example.com', ip: '192.168.1.100', time: '2024-01-08 09:45' },
                { action: 'Failed Login', user: 'unknown@example.com', resource: '-', ip: '45.33.32.156', time: '2024-01-08 08:30' },
              ].map((log, i) => (
                <tr key={i} className={`border-b border-white/5 hover:bg-white/5 ${
                  log.action === 'Failed Login' ? 'bg-red-500/5' : ''
                }`}>
                  <td className="p-4">
                    <span className={`${log.action === 'Failed Login' ? 'text-red-400' : 'text-white'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400">{log.user}</td>
                  <td className="p-4 text-gray-400">{log.resource}</td>
                  <td className="p-4 font-mono text-gray-400">{log.ip}</td>
                  <td className="p-4 text-gray-400">{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Authentication</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">Two-Factor Authentication</p>
                  <p className="text-gray-400 text-sm">Require 2FA for all admin users</p>
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
                  <p className="text-white font-medium">Session Timeout</p>
                  <p className="text-gray-400 text-sm">Auto-logout after inactivity</p>
                </div>
                <select className="px-3 py-1 bg-white/10 border border-white/10 rounded-lg text-white text-sm">
                  <option>30 minutes</option>
                  <option>1 hour</option>
                  <option>4 hours</option>
                  <option>8 hours</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">Password Policy</p>
                  <p className="text-gray-400 text-sm">Minimum requirements</p>
                </div>
                <select className="px-3 py-1 bg-white/10 border border-white/10 rounded-lg text-white text-sm">
                  <option>Strong (12+ chars)</option>
                  <option>Medium (8+ chars)</option>
                  <option>Basic (6+ chars)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">API Rate Limiting</h3>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Requests per minute</label>
                <input
                  type="number"
                  defaultValue={1000}
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Requests per day</label>
                <input
                  type="number"
                  defaultValue={100000}
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">Burst Limit</p>
                  <p className="text-gray-400 text-sm">Allow temporary bursts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-green-600">
                    <div className="absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5" />
                  </div>
                </label>
              </div>
              <button className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
