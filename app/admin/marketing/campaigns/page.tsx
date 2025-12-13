'use client'

import { useState, useEffect } from 'react'
import { usePromoterAccess } from '@/lib/hooks/usePromoterAccess'
import { EmailCampaignService, EmailCampaign } from '@/lib/services/emailCampaignService'

export default function CampaignsPage() {
  const {
    effectivePromoterId,
    showAll,
    loading: accessLoading,
  } = usePromoterAccess()

  const [activeTab, setActiveTab] = useState<'all' | 'email' | 'scheduled' | 'sent'>('all')
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)

  // Calculate stats from real data
  const stats = {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(c => c.status === 'sending' || c.status === 'scheduled').length,
    totalSent: campaigns.reduce((sum, c) => sum + c.metrics.sent, 0),
    avgOpenRate: campaigns.length > 0
      ? campaigns.reduce((sum, c) => {
          const rate = c.metrics.sent > 0 ? (c.metrics.opened / c.metrics.sent) * 100 : 0
          return sum + rate
        }, 0) / campaigns.length
      : 0,
    avgClickRate: campaigns.length > 0
      ? campaigns.reduce((sum, c) => {
          const rate = c.metrics.sent > 0 ? (c.metrics.clicked / c.metrics.sent) * 100 : 0
          return sum + rate
        }, 0) / campaigns.length
      : 0,
    totalRevenue: campaigns.reduce((sum, c) => sum + c.metrics.revenue, 0),
  }

  const emailCampaignService = new EmailCampaignService()

  useEffect(() => {
    loadData()
  }, [effectivePromoterId, showAll])

  const loadData = async () => {
    if (accessLoading || !effectivePromoterId) return

    setLoading(true)
    setError(null)

    try {
      if (showAll) {
        // Admin viewing all - show empty with message
        setCampaigns([])
      } else {
        const loadedCampaigns = await emailCampaignService.getCampaigns(effectivePromoterId)
        setCampaigns(loadedCampaigns)
      }
    } catch (err) {
      console.error('Error loading campaigns:', err)
      setError('Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sending': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'scheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'sent': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      case 'paused': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'draft': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'promotional': return '📧'
      case 'transactional': return '📋'
      case 'newsletter': return '📰'
      case 'reminder': return '⏰'
      case 'follow_up': return '📬'
      default: return '📧'
    }
  }

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'email') ||
      (activeTab === 'scheduled' && campaign.status === 'scheduled') ||
      (activeTab === 'sent' && campaign.status === 'sent')
    const matchesStatus = selectedStatus === 'all' || campaign.status === selectedStatus
    return matchesTab && matchesStatus
  })

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      await emailCampaignService.pauseCampaign(campaignId, 'admin')
      loadData()
    } catch (err) {
      console.error('Error pausing campaign:', err)
    }
  }

  if (loading || accessLoading) {
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
          <p className="text-gray-400 mt-1">Create and manage email marketing campaigns</p>
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

      {/* Admin All-Promoters Notice */}
      {showAll && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-400">
            Select a specific promoter from the dropdown to view their marketing campaigns.
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

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
          <p className="text-2xl font-bold text-white">
            {stats.totalSent >= 1000 ? `${(stats.totalSent / 1000).toFixed(0)}K` : stats.totalSent}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Avg Open Rate</p>
          <p className="text-2xl font-bold text-blue-400">{stats.avgOpenRate.toFixed(1)}%</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Avg Click Rate</p>
          <p className="text-2xl font-bold text-purple-400">{stats.avgClickRate.toFixed(1)}%</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Revenue Generated</p>
          <p className="text-2xl font-bold text-green-400">
            ${stats.totalRevenue >= 1000 ? `${(stats.totalRevenue / 1000).toFixed(1)}K` : stats.totalRevenue}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
          {(['all', 'email', 'scheduled', 'sent'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab === 'all' ? 'All Campaigns' : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
          <option value="sending">Sending</option>
          <option value="sent">Sent</option>
          <option value="paused">Paused</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Empty State */}
      {filteredCampaigns.length === 0 && !showAll && (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-white/10 text-center">
          <div className="text-6xl mb-4">📧</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Campaigns Yet</h3>
          <p className="text-gray-400 mb-6">
            Create your first email marketing campaign to engage with your customers.
          </p>
          <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            Create First Campaign
          </button>
        </div>
      )}

      {/* Campaigns List */}
      <div className="space-y-4">
        {filteredCampaigns.map((campaign) => (
          <div key={campaign.id} className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getTypeIcon(campaign.targetAudience.type)}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                      <span className="px-2 py-0.5 bg-white/10 text-gray-400 rounded text-xs uppercase">
                        {campaign.targetAudience.type}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {campaign.status === 'sending' && (
                    <button
                      onClick={() => campaign.id && handlePauseCampaign(campaign.id)}
                      className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-colors"
                    >
                      Pause
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
                  <p className="text-gray-400 text-xs">Recipients</p>
                  <p className="text-white font-semibold">{campaign.metrics.totalRecipients.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Sent</p>
                  <p className="text-white font-semibold">{campaign.metrics.sent.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Opened</p>
                  <p className="text-white font-semibold">
                    {campaign.metrics.opened.toLocaleString()}
                    <span className="text-blue-400 text-xs ml-1">
                      ({campaign.metrics.sent > 0 ? ((campaign.metrics.opened / campaign.metrics.sent) * 100).toFixed(1) : 0}%)
                    </span>
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Clicked</p>
                  <p className="text-white font-semibold">
                    {campaign.metrics.clicked.toLocaleString()}
                    <span className="text-purple-400 text-xs ml-1">
                      ({campaign.metrics.sent > 0 ? ((campaign.metrics.clicked / campaign.metrics.sent) * 100).toFixed(1) : 0}%)
                    </span>
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Converted</p>
                  <p className="text-white font-semibold">
                    {campaign.metrics.converted.toLocaleString()}
                    <span className="text-green-400 text-xs ml-1">
                      ({campaign.metrics.clicked > 0 ? ((campaign.metrics.converted / campaign.metrics.clicked) * 100).toFixed(1) : 0}%)
                    </span>
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Revenue</p>
                  <p className="text-green-400 font-semibold">${campaign.metrics.revenue.toLocaleString()}</p>
                </div>
              </div>

              {/* Date Info */}
              <div className="flex gap-4 mt-4 pt-4 border-t border-white/10 text-sm text-gray-400">
                <span>Created: {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : 'N/A'}</span>
                {campaign.sentAt && <span>Sent: {new Date(campaign.sentAt).toLocaleDateString()}</span>}
                {campaign.schedule?.scheduledAt && (
                  <span>Scheduled: {new Date(campaign.schedule.scheduledAt).toLocaleDateString()}</span>
                )}
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
          <span className="text-3xl mb-2 block">📝</span>
          <h4 className="text-white font-semibold">Email Templates</h4>
          <p className="text-gray-400 text-sm mt-1">Manage reusable email templates</p>
        </button>
        <button className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border-2 border-dashed border-white/20 hover:border-purple-500 transition-colors text-left">
          <span className="text-3xl mb-2 block">🤖</span>
          <h4 className="text-white font-semibold">Automation</h4>
          <p className="text-gray-400 text-sm mt-1">Set up automated email workflows</p>
        </button>
      </div>
    </div>
  )
}
