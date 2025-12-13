'use client'

import { useState, useEffect } from 'react'

interface Influencer {
  id: string
  name: string
  handle: string
  platform: string
  avatar: string
  followers: number
  engagement: number
  campaigns: number
  revenue: number
  commission: number
  status: 'active' | 'pending' | 'inactive'
}

interface Campaign {
  id: string
  name: string
  influencer: string
  status: 'active' | 'completed' | 'pending'
  reach: number
  clicks: number
  conversions: number
  revenue: number
  startDate: string
  endDate?: string
}

export default function InfluencersPage() {
  const [activeTab, setActiveTab] = useState<'influencers' | 'campaigns' | 'affiliates' | 'payouts'>('influencers')
  const [loading, setLoading] = useState(true)
  const [influencers, setInfluencers] = useState<Influencer[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  const stats = {
    totalInfluencers: 48,
    activeInfluencers: 32,
    totalReach: 2500000,
    totalRevenue: 125000,
    avgROI: 4.2,
    pendingPayouts: 8500,
  }

  useEffect(() => {
    setTimeout(() => {
      setInfluencers([
        { id: '1', name: 'Alex Rivera', handle: '@alexrivera', platform: 'Instagram', avatar: '👤', followers: 250000, engagement: 4.8, campaigns: 12, revenue: 28500, commission: 2850, status: 'active' },
        { id: '2', name: 'Jordan Lee', handle: '@jordanlee', platform: 'TikTok', avatar: '👤', followers: 580000, engagement: 6.2, campaigns: 8, revenue: 42000, commission: 4200, status: 'active' },
        { id: '3', name: 'Sam Taylor', handle: '@samtaylor', platform: 'YouTube', avatar: '👤', followers: 125000, engagement: 3.5, campaigns: 5, revenue: 15800, commission: 1580, status: 'active' },
        { id: '4', name: 'Casey Morgan', handle: '@caseymorgan', platform: 'Instagram', avatar: '👤', followers: 89000, engagement: 5.1, campaigns: 3, revenue: 8200, commission: 820, status: 'pending' },
        { id: '5', name: 'Riley Quinn', handle: '@rileyquinn', platform: 'Twitter', avatar: '👤', followers: 45000, engagement: 2.8, campaigns: 2, revenue: 3500, commission: 350, status: 'inactive' },
      ])
      setCampaigns([
        { id: '1', name: 'Summer Festival Promo', influencer: 'Alex Rivera', status: 'active', reach: 125000, clicks: 8500, conversions: 425, revenue: 25500, startDate: '2024-01-01' },
        { id: '2', name: 'VIP Experience Launch', influencer: 'Jordan Lee', status: 'active', reach: 280000, clicks: 15000, conversions: 680, revenue: 40800, startDate: '2024-01-05' },
        { id: '3', name: 'Jazz Night Series', influencer: 'Sam Taylor', status: 'completed', reach: 62000, clicks: 4200, conversions: 210, revenue: 12600, startDate: '2023-12-15', endDate: '2024-01-05' },
        { id: '4', name: 'Flash Sale Announcement', influencer: 'Casey Morgan', status: 'pending', reach: 0, clicks: 0, conversions: 0, revenue: 0, startDate: '2024-01-10' },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram': return '📷'
      case 'tiktok': return '🎵'
      case 'youtube': return '▶️'
      case 'twitter': return '🐦'
      default: return '📱'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400'
      case 'pending': return 'bg-yellow-500/20 text-yellow-400'
      case 'inactive': return 'bg-gray-500/20 text-gray-400'
      case 'completed': return 'bg-blue-500/20 text-blue-400'
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
          <h1 className="text-2xl font-bold text-white">Influencer Marketing</h1>
          <p className="text-gray-400 mt-1">Manage influencer partnerships and affiliate programs</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + Add Influencer
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            Create Campaign
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Total Influencers</p>
          <p className="text-2xl font-bold text-white">{stats.totalInfluencers}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Active</p>
          <p className="text-2xl font-bold text-green-400">{stats.activeInfluencers}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Total Reach</p>
          <p className="text-2xl font-bold text-white">{(stats.totalReach / 1000000).toFixed(1)}M</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Revenue Generated</p>
          <p className="text-2xl font-bold text-green-400">${(stats.totalRevenue / 1000).toFixed(0)}K</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Avg ROI</p>
          <p className="text-2xl font-bold text-purple-400">{stats.avgROI}x</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Pending Payouts</p>
          <p className="text-2xl font-bold text-yellow-400">${(stats.pendingPayouts / 1000).toFixed(1)}K</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit">
        {(['influencers', 'campaigns', 'affiliates', 'payouts'] as const).map((tab) => (
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

      {/* Influencers Tab */}
      {activeTab === 'influencers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {influencers.map((influencer) => (
            <div key={influencer.id} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center text-2xl">
                    {influencer.avatar}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{influencer.name}</h3>
                    <p className="text-gray-400 text-sm">{influencer.handle}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(influencer.status)}`}>
                  {influencer.status}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">{getPlatformIcon(influencer.platform)}</span>
                <span className="text-gray-400">{influencer.platform}</span>
                <span className="text-white ml-auto">{(influencer.followers / 1000).toFixed(0)}K followers</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-gray-400 text-xs">Engagement</p>
                  <p className="text-white font-semibold">{influencer.engagement}%</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-gray-400 text-xs">Campaigns</p>
                  <p className="text-white font-semibold">{influencer.campaigns}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-gray-400 text-xs">Revenue</p>
                  <p className="text-green-400 font-semibold">${(influencer.revenue / 1000).toFixed(1)}K</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                  View Profile
                </button>
                <button className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                  Message
                </button>
              </div>
            </div>
          ))}

          <button className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border-2 border-dashed border-white/20 hover:border-purple-500 transition-colors flex flex-col items-center justify-center min-h-[280px]">
            <span className="text-4xl mb-2">+</span>
            <span className="text-gray-400">Add Influencer</span>
          </button>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">with {campaign.influencer}</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                    View Details
                  </button>
                  {campaign.status === 'active' && (
                    <button className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-colors">
                      Pause
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Reach</p>
                  <p className="text-white font-semibold">{(campaign.reach / 1000).toFixed(0)}K</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Clicks</p>
                  <p className="text-white font-semibold">{campaign.clicks.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">CTR</p>
                  <p className="text-blue-400 font-semibold">{campaign.reach > 0 ? ((campaign.clicks / campaign.reach) * 100).toFixed(1) : 0}%</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Conversions</p>
                  <p className="text-white font-semibold">{campaign.conversions}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Revenue</p>
                  <p className="text-green-400 font-semibold">${campaign.revenue.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex gap-4 mt-4 pt-4 border-t border-white/10 text-sm text-gray-400">
                <span>Started: {new Date(campaign.startDate).toLocaleDateString()}</span>
                {campaign.endDate && <span>Ended: {new Date(campaign.endDate).toLocaleDateString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Affiliates Tab */}
      {activeTab === 'affiliates' && (
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Affiliate Program Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm">Active Affiliates</p>
                <p className="text-2xl font-bold text-white">156</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm">Total Referrals</p>
                <p className="text-2xl font-bold text-white">2,450</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm">Commission Rate</p>
                <p className="text-2xl font-bold text-purple-400">10%</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm">Total Paid Out</p>
                <p className="text-2xl font-bold text-green-400">$45.2K</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Top Affiliates</h3>
            <div className="space-y-3">
              {[
                { name: 'EventPromo LLC', referrals: 450, revenue: 27000, commission: 2700 },
                { name: 'TicketMaster Pro', referrals: 320, revenue: 19200, commission: 1920 },
                { name: 'ConcertFans Blog', referrals: 280, revenue: 16800, commission: 1680 },
                { name: 'Local Events Weekly', referrals: 215, revenue: 12900, commission: 1290 },
              ].map((affiliate, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{affiliate.name}</p>
                    <p className="text-gray-400 text-sm">{affiliate.referrals} referrals</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-medium">${affiliate.revenue.toLocaleString()} revenue</p>
                    <p className="text-gray-400 text-sm">${affiliate.commission.toLocaleString()} earned</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payouts Tab */}
      {activeTab === 'payouts' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Pending Payouts</h3>
            <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
              Process All Payouts
            </button>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-gray-400 font-medium">Recipient</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Type</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Period</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Amount</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                  <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { recipient: 'Alex Rivera', type: 'Influencer', period: 'Jan 2024', amount: 2850, status: 'pending' },
                  { recipient: 'Jordan Lee', type: 'Influencer', period: 'Jan 2024', amount: 4200, status: 'pending' },
                  { recipient: 'EventPromo LLC', type: 'Affiliate', period: 'Jan 2024', amount: 2700, status: 'processing' },
                  { recipient: 'Sam Taylor', type: 'Influencer', period: 'Dec 2023', amount: 1580, status: 'completed' },
                ].map((payout, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white">{payout.recipient}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-white/10 text-gray-400 rounded text-xs">{payout.type}</span>
                    </td>
                    <td className="p-4 text-gray-400">{payout.period}</td>
                    <td className="p-4 text-white font-medium">${payout.amount.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        payout.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        payout.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {payout.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {payout.status === 'pending' && (
                        <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors">
                          Pay Now
                        </button>
                      )}
                      {payout.status === 'completed' && (
                        <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                          View Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
