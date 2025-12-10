'use client'

import { useState, useEffect } from 'react'

interface LoyaltyMember {
  id: string
  name: string
  email: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  points: number
  lifetimePoints: number
  joinedAt: string
  lastActivity: string
}

interface LoyaltyTier {
  name: string
  minPoints: number
  benefits: string[]
  memberCount: number
  color: string
}

interface Reward {
  id: string
  name: string
  description: string
  pointsCost: number
  category: string
  redemptions: number
  available: boolean
}

export default function LoyaltyPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'rewards' | 'tiers' | 'campaigns'>('overview')
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<LoyaltyMember[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTier, setSelectedTier] = useState<string>('all')

  const tiers: LoyaltyTier[] = [
    { name: 'Bronze', minPoints: 0, benefits: ['5% discount on tickets', 'Early access notifications'], memberCount: 1250, color: 'amber' },
    { name: 'Silver', minPoints: 1000, benefits: ['10% discount', 'Priority seating', 'Free drink voucher'], memberCount: 580, color: 'slate' },
    { name: 'Gold', minPoints: 5000, benefits: ['15% discount', 'VIP lounge access', 'Free merchandise'], memberCount: 185, color: 'yellow' },
    { name: 'Platinum', minPoints: 15000, benefits: ['20% discount', 'Backstage access', 'Personal concierge', 'Exclusive events'], memberCount: 42, color: 'purple' },
  ]

  const stats = {
    totalMembers: 2057,
    activeMembers: 1834,
    totalPointsIssued: 4250000,
    totalRedemptions: 12450,
    avgPointsPerMember: 2067,
    redemptionRate: 68,
  }

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setMembers([
        { id: '1', name: 'John Smith', email: 'john@example.com', tier: 'platinum', points: 18500, lifetimePoints: 45200, joinedAt: '2022-03-15', lastActivity: '2024-01-08' },
        { id: '2', name: 'Sarah Johnson', email: 'sarah@example.com', tier: 'gold', points: 7800, lifetimePoints: 22100, joinedAt: '2022-06-20', lastActivity: '2024-01-07' },
        { id: '3', name: 'Mike Davis', email: 'mike@example.com', tier: 'gold', points: 5200, lifetimePoints: 15800, joinedAt: '2023-01-10', lastActivity: '2024-01-05' },
        { id: '4', name: 'Emily Brown', email: 'emily@example.com', tier: 'silver', points: 2100, lifetimePoints: 8900, joinedAt: '2023-04-22', lastActivity: '2024-01-06' },
        { id: '5', name: 'Chris Wilson', email: 'chris@example.com', tier: 'bronze', points: 450, lifetimePoints: 1200, joinedAt: '2023-11-05', lastActivity: '2024-01-03' },
      ])
      setRewards([
        { id: '1', name: 'Free Ticket Upgrade', description: 'Upgrade to VIP seating', pointsCost: 500, category: 'Tickets', redemptions: 1250, available: true },
        { id: '2', name: 'Backstage Pass', description: 'Meet the artists', pointsCost: 2500, category: 'Experiences', redemptions: 85, available: true },
        { id: '3', name: 'Merchandise Credit', description: '$25 merch credit', pointsCost: 1000, category: 'Merchandise', redemptions: 3200, available: true },
        { id: '4', name: 'VIP Parking', description: 'Premium parking spot', pointsCost: 300, category: 'Services', redemptions: 890, available: true },
        { id: '5', name: 'Exclusive Event Access', description: 'Members-only events', pointsCost: 5000, category: 'Experiences', redemptions: 42, available: false },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      case 'silver': return 'bg-slate-400/20 text-slate-300 border-slate-400/30'
      case 'gold': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'platinum': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTier = selectedTier === 'all' || member.tier === selectedTier
    return matchesSearch && matchesTier
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
          <h1 className="text-2xl font-bold text-white">Loyalty & Rewards</h1>
          <p className="text-gray-400 mt-1">Manage your loyalty program and reward members</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + Add Reward
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            Export Data
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit">
        {(['overview', 'members', 'rewards', 'tiers', 'campaigns'] as const).map((tab) => (
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-sm">Total Members</p>
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-3xl font-bold text-white mt-2">{stats.totalMembers.toLocaleString()}</p>
              <p className="text-sm text-green-400 mt-1">+12% this month</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-sm">Active Members</p>
                <span className="text-2xl">⚡</span>
              </div>
              <p className="text-3xl font-bold text-white mt-2">{stats.activeMembers.toLocaleString()}</p>
              <p className="text-sm text-gray-400 mt-1">{((stats.activeMembers / stats.totalMembers) * 100).toFixed(1)}% engagement</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-sm">Points Issued</p>
                <span className="text-2xl">⭐</span>
              </div>
              <p className="text-3xl font-bold text-white mt-2">{(stats.totalPointsIssued / 1000000).toFixed(1)}M</p>
              <p className="text-sm text-gray-400 mt-1">{stats.avgPointsPerMember.toLocaleString()} avg/member</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-sm">Total Redemptions</p>
                <span className="text-2xl">🎁</span>
              </div>
              <p className="text-3xl font-bold text-white mt-2">{stats.totalRedemptions.toLocaleString()}</p>
              <p className="text-sm text-green-400 mt-1">{stats.redemptionRate}% redemption rate</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-sm">Revenue Impact</p>
                <span className="text-2xl">💰</span>
              </div>
              <p className="text-3xl font-bold text-white mt-2">$284K</p>
              <p className="text-sm text-green-400 mt-1">+23% from loyalty members</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-sm">Member LTV</p>
                <span className="text-2xl">📈</span>
              </div>
              <p className="text-3xl font-bold text-white mt-2">$425</p>
              <p className="text-sm text-green-400 mt-1">vs $180 non-members</p>
            </div>
          </div>

          {/* Tier Distribution */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Tier Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {tiers.map((tier) => (
                <div key={tier.name} className={`p-4 rounded-lg border ${getTierColor(tier.name.toLowerCase())}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{tier.name}</span>
                    <span className="text-2xl">{tier.name === 'Bronze' ? '🥉' : tier.name === 'Silver' ? '🥈' : tier.name === 'Gold' ? '🥇' : '💎'}</span>
                  </div>
                  <p className="text-2xl font-bold">{tier.memberCount.toLocaleString()}</p>
                  <p className="text-sm opacity-70">members</p>
                  <div className="mt-3 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-current rounded-full"
                      style={{ width: `${(tier.memberCount / stats.totalMembers) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {[
                { action: 'Points earned', member: 'John Smith', details: '+500 points from ticket purchase', time: '2 minutes ago', icon: '⭐' },
                { action: 'Reward redeemed', member: 'Sarah Johnson', details: 'Free Ticket Upgrade (500 pts)', time: '15 minutes ago', icon: '🎁' },
                { action: 'Tier upgrade', member: 'Mike Davis', details: 'Silver → Gold', time: '1 hour ago', icon: '⬆️' },
                { action: 'New member', member: 'Emily Brown', details: 'Joined loyalty program', time: '3 hours ago', icon: '👋' },
                { action: 'Points earned', member: 'Chris Wilson', details: '+200 points from referral', time: '5 hours ago', icon: '⭐' },
              ].map((activity, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                  <span className="text-2xl">{activity.icon}</span>
                  <div className="flex-1">
                    <p className="text-white font-medium">{activity.action}</p>
                    <p className="text-gray-400 text-sm">{activity.member} - {activity.details}</p>
                  </div>
                  <span className="text-gray-500 text-sm">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Tiers</option>
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
            </select>
          </div>

          {/* Members Table */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-gray-400 font-medium">Member</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Tier</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Points</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Lifetime Points</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Last Activity</th>
                  <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4">
                      <div>
                        <p className="text-white font-medium">{member.name}</p>
                        <p className="text-gray-400 text-sm">{member.email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${getTierColor(member.tier)}`}>
                        {member.tier}
                      </span>
                    </td>
                    <td className="p-4 text-white">{member.points.toLocaleString()}</td>
                    <td className="p-4 text-gray-400">{member.lifetimePoints.toLocaleString()}</td>
                    <td className="p-4 text-gray-400">{new Date(member.lastActivity).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rewards Tab */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => (
              <div key={reward.id} className={`bg-white/5 backdrop-blur-xl rounded-xl p-6 border ${reward.available ? 'border-white/10' : 'border-red-500/30'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold">{reward.name}</h3>
                    <p className="text-gray-400 text-sm mt-1">{reward.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${reward.available ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {reward.available ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div>
                    <p className="text-purple-400 font-bold text-lg">{reward.pointsCost.toLocaleString()} pts</p>
                    <p className="text-gray-500 text-sm">{reward.redemptions.toLocaleString()} redemptions</p>
                  </div>
                  <span className="px-2 py-1 bg-white/10 text-gray-400 rounded text-sm">{reward.category}</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                    Edit
                  </button>
                  <button className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                    {reward.available ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tiers Tab */}
      {activeTab === 'tiers' && (
        <div className="space-y-4">
          {tiers.map((tier) => (
            <div key={tier.name} className={`bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{tier.name === 'Bronze' ? '🥉' : tier.name === 'Silver' ? '🥈' : tier.name === 'Gold' ? '🥇' : '💎'}</span>
                  <div>
                    <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                    <p className="text-gray-400">{tier.minPoints.toLocaleString()}+ points required</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">{tier.memberCount.toLocaleString()}</p>
                  <p className="text-gray-400">members</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-gray-400 text-sm mb-2">Benefits:</p>
                <div className="flex flex-wrap gap-2">
                  {tier.benefits.map((benefit, i) => (
                    <span key={i} className="px-3 py-1 bg-white/10 text-white rounded-full text-sm">
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                  Edit Tier
                </button>
                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                  View Members
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Active Campaigns</h3>
            <div className="space-y-4">
              {[
                { name: 'Double Points Weekend', status: 'active', startDate: '2024-01-12', endDate: '2024-01-14', participants: 450 },
                { name: 'Referral Bonus', status: 'active', startDate: '2024-01-01', endDate: '2024-01-31', participants: 128 },
                { name: 'New Member Welcome', status: 'active', startDate: '2023-12-01', endDate: null, participants: 892 },
              ].map((campaign, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{campaign.name}</p>
                    <p className="text-gray-400 text-sm">
                      {campaign.startDate} - {campaign.endDate || 'Ongoing'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-white font-medium">{campaign.participants}</p>
                      <p className="text-gray-400 text-sm">participants</p>
                    </div>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">Active</span>
                    <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="w-full py-4 border-2 border-dashed border-white/20 rounded-xl text-gray-400 hover:text-white hover:border-purple-500 transition-colors">
            + Create New Campaign
          </button>
        </div>
      )}
    </div>
  )
}
