'use client'

import { useState, useEffect } from 'react'
import { usePromoterAccess } from '@/lib/hooks/usePromoterAccess'
import { LoyaltyService, LoyaltyProgram, LoyaltyMember, Reward } from '@/lib/services/loyaltyService'

export default function LoyaltyPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'rewards' | 'tiers' | 'campaigns'>('overview')
  const [loading, setLoading] = useState(true)
  const [program, setProgram] = useState<LoyaltyProgram | null>(null)
  const [members, setMembers] = useState<LoyaltyMember[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTier, setSelectedTier] = useState<string>('all')

  const { isAdmin, showAll, effectivePromoterId } = usePromoterAccess()
  const loyaltyService = new LoyaltyService()

  useEffect(() => {
    loadData()
  }, [effectivePromoterId, showAll])

  const loadData = async () => {
    setLoading(true)
    try {
      if (effectivePromoterId && effectivePromoterId !== 'all') {
        // Load program for specific promoter
        const loadedProgram = await loyaltyService.getProgramByPromoter(effectivePromoterId)
        setProgram(loadedProgram)

        if (loadedProgram?.id) {
          // Load members
          const loadedMembers = await loyaltyService.getMembers(loadedProgram.id, {})
          setMembers(loadedMembers)

          // Load rewards
          const loadedRewards = await loyaltyService.getRewards(loadedProgram.id)
          setRewards(loadedRewards)
        }
      }
    } catch (error) {
      console.error('Error loading loyalty data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate stats from real data
  const stats = {
    totalMembers: members.length,
    activeMembers: members.filter(m => {
      const lastActivity = new Date(m.lastActivityAt)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      return lastActivity > thirtyDaysAgo
    }).length,
    totalPointsIssued: members.reduce((sum, m) => sum + m.totalPointsEarned, 0),
    avgPointsPerMember: members.length > 0
      ? Math.round(members.reduce((sum, m) => sum + m.currentPoints, 0) / members.length)
      : 0,
    totalReferrals: members.reduce((sum, m) => sum + m.referralCount, 0),
  }

  // Get tier distribution from program or use defaults
  const tiers = program?.tiers || []

  // Count members per tier
  const tierCounts = members.reduce((acc, member) => {
    acc[member.currentTier] = (acc[member.currentTier] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const getTierColor = (tierName: string) => {
    const name = tierName.toLowerCase()
    if (name.includes('bronze') || name.includes('basic')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    if (name.includes('silver')) return 'bg-slate-400/20 text-slate-300 border-slate-400/30'
    if (name.includes('gold')) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    if (name.includes('platinum') || name.includes('vip')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  const filteredMembers = members.filter(member => {
    const matchesSearch = searchQuery === '' ||
      member.customerId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTier = selectedTier === 'all' || member.currentTier === selectedTier
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Loyalty & Rewards</h1>
          <p className="text-slate-600 dark:text-gray-400 mt-1">
            {program ? program.name : (showAll ? 'Manage loyalty programs across all promoters' : 'Manage your loyalty program and reward members')}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && !program && (
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
              + Create Program
            </button>
          )}
          {program && (
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
              + Add Reward
            </button>
          )}
          <button className="px-4 py-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-lg transition-colors">
            Export Data
          </button>
        </div>
      </div>

      {/* No Program State */}
      {!program && (
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-slate-200 dark:border-white/10 text-center">
          <div className="text-6xl mb-4">⭐</div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Loyalty Program</h2>
          <p className="text-slate-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {isAdmin
              ? 'Create a loyalty program to reward your customers and increase retention.'
              : 'No loyalty program has been set up yet. Contact your administrator to create one.'}
          </p>
          {isAdmin && (
            <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
              Create Loyalty Program
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      {program && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
              <p className="text-slate-500 dark:text-gray-400 text-xs">Total Members</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalMembers.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
              <p className="text-slate-500 dark:text-gray-400 text-xs">Active (30d)</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.activeMembers.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
              <p className="text-slate-500 dark:text-gray-400 text-xs">Points Issued</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalPointsIssued.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
              <p className="text-slate-500 dark:text-gray-400 text-xs">Avg Points/Member</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.avgPointsPerMember.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
              <p className="text-slate-500 dark:text-gray-400 text-xs">Total Referrals</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalReferrals.toLocaleString()}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-lg w-fit">
            {(['overview', 'members', 'rewards', 'tiers'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tier Distribution */}
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Tier Distribution</h3>
                <div className="space-y-4">
                  {tiers.map(tier => {
                    const count = tierCounts[tier.id] || 0
                    const percentage = stats.totalMembers > 0 ? Math.round((count / stats.totalMembers) * 100) : 0
                    return (
                      <div key={tier.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-900 dark:text-white font-medium">{tier.name}</span>
                          <span className="text-slate-600 dark:text-gray-400">{count} members ({percentage}%)</span>
                        </div>
                        <div className="h-3 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                  {tiers.length === 0 && (
                    <p className="text-slate-500 dark:text-gray-400 text-center py-4">No tiers configured</p>
                  )}
                </div>
              </div>

              {/* Program Configuration */}
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Program Configuration</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                    <span className="text-slate-600 dark:text-gray-400">Points per Dollar</span>
                    <span className="text-slate-900 dark:text-white font-medium">{program.pointsConfig.pointsPerDollar}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                    <span className="text-slate-600 dark:text-gray-400">Min. Redemption</span>
                    <span className="text-slate-900 dark:text-white font-medium">{program.pointsConfig.minimumRedemption} pts</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                    <span className="text-slate-600 dark:text-gray-400">Point Expiration</span>
                    <span className="text-slate-900 dark:text-white font-medium">
                      {program.pointsConfig.expirationMonths === 0 ? 'Never' : `${program.pointsConfig.expirationMonths} months`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                    <span className="text-slate-600 dark:text-gray-400">Referral Program</span>
                    <span className={`px-2 py-1 rounded text-xs ${program.referralConfig.enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {program.referralConfig.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                    <span className="text-slate-600 dark:text-gray-400">Status</span>
                    <span className={`px-2 py-1 rounded text-xs capitalize ${
                      program.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      program.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {program.status}
                    </span>
                  </div>
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
                    placeholder="Search by customer ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Tiers</option>
                  {tiers.map(tier => (
                    <option key={tier.id} value={tier.id}>{tier.name}</option>
                  ))}
                </select>
              </div>

              {/* Members Table */}
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10">
                      <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Customer</th>
                      <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Tier</th>
                      <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Points</th>
                      <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Lifetime</th>
                      <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Referrals</th>
                      <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Joined</th>
                      <th className="text-right p-4 text-slate-500 dark:text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((member) => (
                        <tr key={member.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                          <td className="p-4">
                            <p className="text-slate-900 dark:text-white font-medium">{member.customerId}</p>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getTierColor(member.currentTier)}`}>
                              {member.currentTier}
                            </span>
                          </td>
                          <td className="p-4 text-purple-600 dark:text-purple-400 font-medium">
                            {member.currentPoints.toLocaleString()}
                          </td>
                          <td className="p-4 text-slate-600 dark:text-gray-400">
                            {member.totalPointsEarned.toLocaleString()}
                          </td>
                          <td className="p-4 text-slate-600 dark:text-gray-400">
                            {member.referralCount}
                          </td>
                          <td className="p-4 text-slate-500 dark:text-gray-500 text-sm">
                            {new Date(member.joinedAt).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right">
                            <button className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-gray-400">
                          {members.length === 0 ? 'No members yet' : 'No members match your filters'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rewards Tab */}
          {activeTab === 'rewards' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rewards.length > 0 ? (
                  rewards.map((reward) => (
                    <div key={reward.id} className={`bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border ${reward.isActive ? 'border-slate-200 dark:border-white/10' : 'border-red-500/30'}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-slate-900 dark:text-white font-semibold">{reward.name}</h3>
                          <p className="text-slate-500 dark:text-gray-400 text-sm">{reward.description}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${reward.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {reward.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-purple-600 dark:text-purple-400 font-bold">{reward.pointsCost.toLocaleString()} pts</span>
                        <span className="text-slate-500 dark:text-gray-500 text-sm">{reward.category}</span>
                      </div>
                      {reward.maxRedemptions && (
                        <div className="mt-2 text-sm text-slate-500 dark:text-gray-400">
                          Limit: {reward.maxRedemptions} redemptions
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 text-slate-500 dark:text-gray-400">
                    No rewards configured. Create your first reward to get started.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tiers Tab */}
          {activeTab === 'tiers' && (
            <div className="space-y-4">
              {tiers.length > 0 ? (
                tiers.map((tier) => (
                  <div key={tier.id} className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{tier.icon || '⭐'}</span>
                        <div>
                          <h3 className="text-slate-900 dark:text-white font-semibold text-lg">{tier.name}</h3>
                          <p className="text-slate-500 dark:text-gray-400 text-sm">
                            {tier.minPoints.toLocaleString()} - {tier.maxPoints ? tier.maxPoints.toLocaleString() : '∞'} points
                          </p>
                        </div>
                      </div>
                      <span className="text-slate-600 dark:text-gray-400">
                        {tierCounts[tier.id] || 0} members
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tier.benefits.map((benefit, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-sm"
                        >
                          {benefit.description}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                      {isAdmin && (
                        <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                          Edit Tier
                        </button>
                      )}
                      <button className="px-4 py-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-lg text-sm transition-colors">
                        View Members
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-slate-200 dark:border-white/10 text-center">
                  <p className="text-slate-500 dark:text-gray-400 mb-4">No tiers configured yet</p>
                  {isAdmin && (
                    <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                      Add Tier
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
