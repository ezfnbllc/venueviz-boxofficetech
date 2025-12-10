'use client'

import { useState, useEffect } from 'react'

interface Campaign {
  id: string
  name: string
  type: 'email' | 'sms' | 'push' | 'multi-channel'
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused'
  audience: number
  sent: number
  opened: number
  clicked: number
  converted: number
  revenue: number
  startDate: string
  endDate?: string
}

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'email' | 'sms' | 'push'>('all')
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const stats = {
    totalCampaigns: 24,
    activeCampaigns: 5,
    totalSent: 125000,
    avgOpenRate: 28.5,
    avgClickRate: 4.2,
    totalRevenue: 45800,
  }

  useEffect(() => {
    setTimeout(() => {
      setCampaigns([
        { id: '1', name: 'Winter Sale Announcement', type: 'email', status: 'completed', audience: 15000, sent: 14850, opened: 4455, clicked: 892, converted: 156, revenue: 12480, startDate: '2024-01-01', endDate: '2024-01-05' },
        { id: '2', name: 'New Event Alert - Jazz Night', type: 'email', status: 'running', audience: 8500, sent: 8420, opened: 2526, clicked: 505, converted: 89, revenue: 5340, startDate: '2024-01-06' },
        { id: '3', name: 'Flash Sale - 24 Hours Only', type: 'multi-channel', status: 'running', audience: 25000, sent: 24800, opened: 8680, clicked: 1984, converted: 312, revenue: 18720, startDate: '2024-01-07' },
        { id: '4', name: 'VIP Early Access', type: 'sms', status: 'scheduled', audience: 2500, sent: 0, opened: 0, clicked: 0, converted: 0, revenue: 0, startDate: '2024-01-10' },
        { id: '5', name: 'Abandoned Cart Reminder', type: 'email', status: 'running', audience: 1200, sent: 1180, opened: 472, clicked: 118, converted: 45, revenue: 2700, startDate: '2024-01-01' },
        { id: '6', name: 'Push Notification - Last Chance', type: 'push', status: 'completed', audience: 18000, sent: 17500, opened: 3500, clicked: 700, converted: 98, revenue: 5880, startDate: '2024-01-03', endDate: '2024-01-04' },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'scheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'completed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      case 'paused': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'draft': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return '📧'
      case 'sms': return '📱'
      case 'push': return '🔔'
      case 'multi-channel': return '📣'
      default: return '📧'
    }
  }

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesTab = activeTab === 'all' || campaign.type === activeTab
    const matchesStatus = selectedStatus === 'all' || campaign.status === selectedStatus
    return matchesTab && matchesStatus
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
          <h1 className="text-2xl font-bold text-white">Marketing Campaigns</h1>
          <p className="text-gray-400 mt-1">Create and manage email, SMS, and push campaigns</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + New Campaign
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            Templates
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Total Campaigns</p>
          <p className="text-2xl font-bold text-white">{stats.totalCampaigns}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Active</p>
          <p className="text-2xl font-bold text-green-400">{stats.activeCampaigns}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Total Sent</p>
          <p className="text-2xl font-bold text-white">{(stats.totalSent / 1000).toFixed(0)}K</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Avg Open Rate</p>
          <p className="text-2xl font-bold text-blue-400">{stats.avgOpenRate}%</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Avg Click Rate</p>
          <p className="text-2xl font-bold text-purple-400">{stats.avgClickRate}%</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Revenue Generated</p>
          <p className="text-2xl font-bold text-green-400">${(stats.totalRevenue / 1000).toFixed(1)}K</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
          {(['all', 'email', 'sms', 'push'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab === 'all' ? 'All Channels' : tab.toUpperCase()}
            </button>
          ))}
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="paused">Paused</option>
        </select>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {filteredCampaigns.map((campaign) => (
          <div key={campaign.id} className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getTypeIcon(campaign.type)}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                      <span className="px-2 py-0.5 bg-white/10 text-gray-400 rounded text-xs uppercase">
                        {campaign.type}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {campaign.status === 'running' && (
                    <button className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-colors">
                      Pause
                    </button>
                  )}
                  {campaign.status === 'paused' && (
                    <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors">
                      Resume
                    </button>
                  )}
                  <button className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                    View Details
                  </button>
                  <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                    Duplicate
                  </button>
                </div>
              </div>

              {/* Campaign Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Audience</p>
                  <p className="text-white font-semibold">{campaign.audience.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Sent</p>
                  <p className="text-white font-semibold">{campaign.sent.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Opened</p>
                  <p className="text-white font-semibold">
                    {campaign.opened.toLocaleString()}
                    <span className="text-blue-400 text-xs ml-1">
                      ({campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(1) : 0}%)
                    </span>
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Clicked</p>
                  <p className="text-white font-semibold">
                    {campaign.clicked.toLocaleString()}
                    <span className="text-purple-400 text-xs ml-1">
                      ({campaign.sent > 0 ? ((campaign.clicked / campaign.sent) * 100).toFixed(1) : 0}%)
                    </span>
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Converted</p>
                  <p className="text-white font-semibold">
                    {campaign.converted.toLocaleString()}
                    <span className="text-green-400 text-xs ml-1">
                      ({campaign.clicked > 0 ? ((campaign.converted / campaign.clicked) * 100).toFixed(1) : 0}%)
                    </span>
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Revenue</p>
                  <p className="text-green-400 font-semibold">${campaign.revenue.toLocaleString()}</p>
                </div>
              </div>

              {/* Date Info */}
              <div className="flex gap-4 mt-4 pt-4 border-t border-white/10 text-sm text-gray-400">
                <span>Started: {new Date(campaign.startDate).toLocaleDateString()}</span>
                {campaign.endDate && <span>Ended: {new Date(campaign.endDate).toLocaleDateString()}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border-2 border-dashed border-white/20 hover:border-purple-500 transition-colors text-left">
          <span className="text-3xl mb-2 block">📧</span>
          <h4 className="text-white font-semibold">Email Campaign</h4>
          <p className="text-gray-400 text-sm mt-1">Create a new email marketing campaign</p>
        </button>
        <button className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border-2 border-dashed border-white/20 hover:border-purple-500 transition-colors text-left">
          <span className="text-3xl mb-2 block">📱</span>
          <h4 className="text-white font-semibold">SMS Campaign</h4>
          <p className="text-gray-400 text-sm mt-1">Send targeted SMS messages</p>
        </button>
        <button className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border-2 border-dashed border-white/20 hover:border-purple-500 transition-colors text-left">
          <span className="text-3xl mb-2 block">🤖</span>
          <h4 className="text-white font-semibold">Automation</h4>
          <p className="text-gray-400 text-sm mt-1">Set up automated campaigns</p>
        </button>
      </div>
    </div>
  )
}
