'use client'

import { useState, useEffect } from 'react'

interface Transfer {
  id: string
  ticketId: string
  event: string
  from: { name: string; email: string }
  to: { name: string; email: string }
  status: 'pending' | 'completed' | 'cancelled' | 'expired'
  type: 'transfer' | 'resale'
  price?: number
  createdAt: string
  expiresAt?: string
}

export default function TransfersPage() {
  const [activeTab, setActiveTab] = useState<'transfers' | 'resale' | 'policies'>('transfers')
  const [loading, setLoading] = useState(true)
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const stats = {
    totalTransfers: 1256,
    pendingTransfers: 45,
    completedToday: 28,
    resaleVolume: 45800,
    avgResalePrice: 85,
    transferRate: 8.5,
  }

  useEffect(() => {
    setTimeout(() => {
      setTransfers([
        { id: 'TRF001', ticketId: 'TKT-12345', event: 'Summer Music Festival', from: { name: 'John Smith', email: 'john@example.com' }, to: { name: 'Sarah Johnson', email: 'sarah@example.com' }, status: 'pending', type: 'transfer', createdAt: '2024-01-08T10:30:00', expiresAt: '2024-01-10T10:30:00' },
        { id: 'TRF002', ticketId: 'TKT-12346', event: 'Jazz Night Live', from: { name: 'Mike Davis', email: 'mike@example.com' }, to: { name: 'Emily Brown', email: 'emily@example.com' }, status: 'completed', type: 'transfer', createdAt: '2024-01-07T15:00:00' },
        { id: 'TRF003', ticketId: 'TKT-12347', event: 'Summer Music Festival', from: { name: 'Chris Wilson', email: 'chris@example.com' }, to: { name: 'Alex Rivera', email: 'alex@example.com' }, status: 'completed', type: 'resale', price: 125, createdAt: '2024-01-06T09:00:00' },
        { id: 'TRF004', ticketId: 'TKT-12348', event: 'Comedy Gala 2024', from: { name: 'Jordan Lee', email: 'jordan@example.com' }, to: { name: 'Taylor Swift', email: 'taylor@example.com' }, status: 'cancelled', type: 'transfer', createdAt: '2024-01-05T14:30:00' },
        { id: 'TRF005', ticketId: 'TKT-12349', event: 'Rock Concert Series', from: { name: 'Casey Morgan', email: 'casey@example.com' }, to: { name: 'Riley Quinn', email: 'riley@example.com' }, status: 'expired', type: 'resale', price: 95, createdAt: '2024-01-04T11:00:00', expiresAt: '2024-01-06T11:00:00' },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400'
      case 'completed': return 'bg-green-500/20 text-green-400'
      case 'cancelled': return 'bg-red-500/20 text-red-400'
      case 'expired': return 'bg-gray-500/20 text-gray-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const filteredTransfers = transfers.filter(t => {
    const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus
    const matchesTab = activeTab === 'transfers' ? t.type === 'transfer' : activeTab === 'resale' ? t.type === 'resale' : true
    return matchesStatus && (activeTab === 'policies' || matchesTab)
  })

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
          <h1 className="text-2xl font-bold text-white">Ticket Transfers & Resale</h1>
          <p className="text-gray-400 mt-1">Manage ticket transfers and secondary market</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + Manual Transfer
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Total Transfers</p>
          <p className="text-2xl font-bold text-white">{stats.totalTransfers.toLocaleString()}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Pending</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.pendingTransfers}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Today</p>
          <p className="text-2xl font-bold text-green-400">{stats.completedToday}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Resale Volume</p>
          <p className="text-2xl font-bold text-white">${(stats.resaleVolume / 1000).toFixed(1)}K</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Avg Resale Price</p>
          <p className="text-2xl font-bold text-purple-400">${stats.avgResalePrice}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Transfer Rate</p>
          <p className="text-2xl font-bold text-blue-400">{stats.transferRate}%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
          {(['transfers', 'resale', 'policies'] as const).map((tab) => (
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

        {activeTab !== 'policies' && (
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
        )}
      </div>

      {/* Transfers/Resale Tab */}
      {(activeTab === 'transfers' || activeTab === 'resale') && (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-gray-400 font-medium">Transfer ID</th>
                <th className="text-left p-4 text-gray-400 font-medium">Event</th>
                <th className="text-left p-4 text-gray-400 font-medium">From</th>
                <th className="text-left p-4 text-gray-400 font-medium">To</th>
                {activeTab === 'resale' && <th className="text-left p-4 text-gray-400 font-medium">Price</th>}
                <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                <th className="text-left p-4 text-gray-400 font-medium">Date</th>
                <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransfers.map((transfer) => (
                <tr key={transfer.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4">
                    <p className="text-white font-medium">{transfer.id}</p>
                    <p className="text-gray-400 text-sm">{transfer.ticketId}</p>
                  </td>
                  <td className="p-4 text-gray-400">{transfer.event}</td>
                  <td className="p-4">
                    <p className="text-white">{transfer.from.name}</p>
                    <p className="text-gray-400 text-sm">{transfer.from.email}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-white">{transfer.to.name}</p>
                    <p className="text-gray-400 text-sm">{transfer.to.email}</p>
                  </td>
                  {activeTab === 'resale' && (
                    <td className="p-4 text-green-400 font-medium">${transfer.price}</td>
                  )}
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(transfer.status)}`}>
                      {transfer.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400">{new Date(transfer.createdAt).toLocaleDateString()}</td>
                  <td className="p-4 text-right">
                    {transfer.status === 'pending' && (
                      <>
                        <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors mr-2">
                          Approve
                        </button>
                        <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors">
                          Cancel
                        </button>
                      </>
                    )}
                    {transfer.status !== 'pending' && (
                      <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Policies Tab */}
      {activeTab === 'policies' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Transfer Policies</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">Allow Transfers</p>
                  <p className="text-gray-400 text-sm">Enable ticket transfers between users</p>
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
                  <p className="text-white font-medium">Require Approval</p>
                  <p className="text-gray-400 text-sm">Manual approval for all transfers</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-green-600">
                    <div className="absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5" />
                  </div>
                </label>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Transfer Deadline (hours before event)</label>
                <input
                  type="number"
                  defaultValue={24}
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Max Transfers Per Ticket</label>
                <input
                  type="number"
                  defaultValue={3}
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Resale Policies</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">Allow Resale</p>
                  <p className="text-gray-400 text-sm">Enable ticket resale marketplace</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-green-600">
                    <div className="absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5" />
                  </div>
                </label>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Max Resale Price (% of original)</label>
                <input
                  type="number"
                  defaultValue={150}
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Platform Fee (%)</label>
                <input
                  type="number"
                  defaultValue={10}
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Seller Payout Delay (days)</label>
                <input
                  type="number"
                  defaultValue={7}
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <button className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
              Save Policy Settings
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
