'use client'

import { useState, useEffect } from 'react'

interface Tenant {
  id: string
  name: string
  domain: string
  status: 'active' | 'pending' | 'suspended'
  plan: string
  revenue: number
  events: number
  createdAt: string
}

export default function WhiteLabelPage() {
  const [activeTab, setActiveTab] = useState<'tenants' | 'branding' | 'domains' | 'billing'>('tenants')
  const [loading, setLoading] = useState(true)
  const [tenants, setTenants] = useState<Tenant[]>([])

  const stats = {
    totalTenants: 24,
    activeTenants: 21,
    totalRevenue: 285000,
    avgRevenuePerTenant: 11875,
    customDomains: 18,
    pendingSetups: 3,
  }

  useEffect(() => {
    setTimeout(() => {
      setTenants([
        { id: '1', name: 'CityTickets Pro', domain: 'citytickets.com', status: 'active', plan: 'Enterprise', revenue: 45000, events: 125, createdAt: '2023-06-15' },
        { id: '2', name: 'FestivalHub', domain: 'festivalhub.io', status: 'active', plan: 'Professional', revenue: 28000, events: 45, createdAt: '2023-08-20' },
        { id: '3', name: 'LocalEvents', domain: 'localevents.app', status: 'active', plan: 'Professional', revenue: 18500, events: 68, createdAt: '2023-09-10' },
        { id: '4', name: 'VenueBox', domain: 'venuebox.co', status: 'pending', plan: 'Enterprise', revenue: 0, events: 0, createdAt: '2024-01-05' },
        { id: '5', name: 'ShowTime', domain: 'showtime.events', status: 'suspended', plan: 'Starter', revenue: 5200, events: 15, createdAt: '2023-10-01' },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400'
      case 'pending': return 'bg-yellow-500/20 text-yellow-400'
      case 'suspended': return 'bg-red-500/20 text-red-400'
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
          <h1 className="text-2xl font-bold text-white">White-Label Platform</h1>
          <p className="text-gray-400 mt-1">Manage multi-tenant instances and branding</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + Add Tenant
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            Platform Settings
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Total Tenants</p>
          <p className="text-2xl font-bold text-white">{stats.totalTenants}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Active</p>
          <p className="text-2xl font-bold text-green-400">{stats.activeTenants}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Total Revenue</p>
          <p className="text-2xl font-bold text-white">${(stats.totalRevenue / 1000).toFixed(0)}K</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Avg Revenue</p>
          <p className="text-2xl font-bold text-purple-400">${(stats.avgRevenuePerTenant / 1000).toFixed(1)}K</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Custom Domains</p>
          <p className="text-2xl font-bold text-white">{stats.customDomains}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Pending Setup</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.pendingSetups}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit">
        {(['tenants', 'branding', 'domains', 'billing'] as const).map((tab) => (
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

      {/* Tenants Tab */}
      {activeTab === 'tenants' && (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-gray-400 font-medium">Tenant</th>
                <th className="text-left p-4 text-gray-400 font-medium">Domain</th>
                <th className="text-left p-4 text-gray-400 font-medium">Plan</th>
                <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                <th className="text-left p-4 text-gray-400 font-medium">Revenue</th>
                <th className="text-left p-4 text-gray-400 font-medium">Events</th>
                <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4">
                    <p className="text-white font-medium">{tenant.name}</p>
                    <p className="text-gray-400 text-sm">Since {tenant.createdAt}</p>
                  </td>
                  <td className="p-4">
                    <a href={`https://${tenant.domain}`} className="text-purple-400 hover:text-purple-300">
                      {tenant.domain}
                    </a>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-white/10 text-gray-400 rounded text-sm">{tenant.plan}</span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(tenant.status)}`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="p-4 text-green-400">${tenant.revenue.toLocaleString()}</td>
                  <td className="p-4 text-white">{tenant.events}</td>
                  <td className="p-4 text-right">
                    <button className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors mr-2">
                      Manage
                    </button>
                    <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                      Login As
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Branding Tab */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Default Branding</h3>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Platform Name</label>
                <input
                  type="text"
                  defaultValue="BoxOfficeTech"
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Primary Color</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    defaultValue="#9333ea"
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    defaultValue="#9333ea"
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Logo URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                Save Defaults
              </button>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Tenant Overrides</h3>
            <div className="space-y-3">
              {tenants.filter(t => t.status === 'active').map(tenant => (
                <div key={tenant.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{tenant.name}</p>
                    <p className="text-gray-400 text-sm">{tenant.domain}</p>
                  </div>
                  <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                    Edit Branding
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Domains Tab */}
      {activeTab === 'domains' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Custom Domains</h3>
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
              + Add Domain
            </button>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-gray-400 font-medium">Domain</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Tenant</th>
                  <th className="text-left p-4 text-gray-400 font-medium">SSL</th>
                  <th className="text-left p-4 text-gray-400 font-medium">DNS</th>
                  <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.filter(t => t.status === 'active').map((tenant) => (
                  <tr key={tenant.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white font-medium">{tenant.domain}</td>
                    <td className="p-4 text-gray-400">{tenant.name}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Active</span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Verified</span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                        Configure
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Revenue by Plan</h3>
            <div className="space-y-4">
              {[
                { plan: 'Enterprise', tenants: 8, revenue: 145000, color: 'purple' },
                { plan: 'Professional', tenants: 12, revenue: 98000, color: 'blue' },
                { plan: 'Starter', tenants: 4, revenue: 42000, color: 'green' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white">{item.plan}</span>
                    <span className="text-gray-400">{item.tenants} tenants • ${(item.revenue / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-${item.color}-500`}
                      style={{ width: `${(item.revenue / 150000) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>
            <div className="space-y-3">
              {[
                { tenant: 'CityTickets Pro', amount: 4990, type: 'Monthly', date: '2024-01-08' },
                { tenant: 'FestivalHub', amount: 1990, type: 'Monthly', date: '2024-01-07' },
                { tenant: 'LocalEvents', amount: 1990, type: 'Monthly', date: '2024-01-05' },
              ].map((tx, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{tx.tenant}</p>
                    <p className="text-gray-400 text-sm">{tx.type} • {tx.date}</p>
                  </div>
                  <span className="text-green-400 font-medium">${tx.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
