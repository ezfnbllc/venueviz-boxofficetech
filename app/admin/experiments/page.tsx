'use client'

import { useState, useEffect } from 'react'

interface Experiment {
  id: string
  name: string
  description: string
  type: 'a/b' | 'multivariate' | 'split_url'
  status: 'draft' | 'running' | 'paused' | 'completed'
  variants: { id: string; name: string; traffic: number; conversions: number; conversionRate: number }[]
  traffic: number
  startDate: string
  endDate?: string
  metric: string
  confidence: number
  winner?: string
}

interface FeatureFlag {
  id: string
  key: string
  name: string
  description: string
  enabled: boolean
  rollout: number
  environments: string[]
  lastModified: string
}

export default function ExperimentsPage() {
  const [activeTab, setActiveTab] = useState<'experiments' | 'feature-flags' | 'personalization'>('experiments')
  const [loading, setLoading] = useState(true)
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const stats = {
    activeExperiments: 4,
    totalVariants: 12,
    avgLift: 15.3,
    testsCompleted: 28,
    featureFlagsActive: 8,
    totalFlags: 15,
  }

  useEffect(() => {
    setTimeout(() => {
      setExperiments([
        {
          id: 'exp-1',
          name: 'Checkout Button Color',
          description: 'Testing green vs blue checkout button',
          type: 'a/b',
          status: 'running',
          variants: [
            { id: 'control', name: 'Control (Blue)', traffic: 50, conversions: 245, conversionRate: 4.2 },
            { id: 'variant-a', name: 'Variant A (Green)', traffic: 50, conversions: 298, conversionRate: 5.1 },
          ],
          traffic: 100,
          startDate: '2024-01-01',
          metric: 'Purchase Conversion',
          confidence: 94,
        },
        {
          id: 'exp-2',
          name: 'Pricing Page Layout',
          description: 'Testing horizontal vs vertical pricing cards',
          type: 'a/b',
          status: 'running',
          variants: [
            { id: 'control', name: 'Horizontal', traffic: 50, conversions: 189, conversionRate: 3.8 },
            { id: 'variant-a', name: 'Vertical', traffic: 50, conversions: 212, conversionRate: 4.3 },
          ],
          traffic: 100,
          startDate: '2024-01-03',
          metric: 'Plan Selection',
          confidence: 87,
        },
        {
          id: 'exp-3',
          name: 'Homepage Hero',
          description: 'Testing different hero messages',
          type: 'multivariate',
          status: 'completed',
          variants: [
            { id: 'control', name: 'Original', traffic: 33, conversions: 156, conversionRate: 2.1 },
            { id: 'variant-a', name: 'Urgency Focus', traffic: 33, conversions: 198, conversionRate: 2.7 },
            { id: 'variant-b', name: 'Social Proof', traffic: 34, conversions: 234, conversionRate: 3.2 },
          ],
          traffic: 100,
          startDate: '2023-12-01',
          endDate: '2023-12-31',
          metric: 'Click-through Rate',
          confidence: 98,
          winner: 'variant-b',
        },
        {
          id: 'exp-4',
          name: 'Mobile Navigation',
          description: 'Bottom nav vs hamburger menu',
          type: 'a/b',
          status: 'paused',
          variants: [
            { id: 'control', name: 'Hamburger Menu', traffic: 50, conversions: 89, conversionRate: 1.8 },
            { id: 'variant-a', name: 'Bottom Nav', traffic: 50, conversions: 112, conversionRate: 2.3 },
          ],
          traffic: 100,
          startDate: '2024-01-05',
          metric: 'Page Views',
          confidence: 72,
        },
      ])
      setFeatureFlags([
        { id: 'ff-1', key: 'new_checkout_flow', name: 'New Checkout Flow', description: 'Streamlined 2-step checkout', enabled: true, rollout: 100, environments: ['production', 'staging'], lastModified: '2024-01-05' },
        { id: 'ff-2', key: 'dark_mode', name: 'Dark Mode', description: 'Enable dark mode toggle', enabled: true, rollout: 50, environments: ['production', 'staging', 'development'], lastModified: '2024-01-03' },
        { id: 'ff-3', key: 'ai_recommendations', name: 'AI Recommendations', description: 'ML-powered event recommendations', enabled: true, rollout: 25, environments: ['staging'], lastModified: '2024-01-07' },
        { id: 'ff-4', key: 'social_sharing', name: 'Social Sharing', description: 'Enhanced social sharing options', enabled: false, rollout: 0, environments: ['development'], lastModified: '2024-01-02' },
        { id: 'ff-5', key: 'express_checkout', name: 'Express Checkout', description: 'One-click purchase for returning customers', enabled: true, rollout: 75, environments: ['production'], lastModified: '2024-01-06' },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'paused': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'draft': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const filteredExperiments = experiments.filter(exp => {
    return selectedStatus === 'all' || exp.status === selectedStatus
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
          <h1 className="text-2xl font-bold text-white">A/B Testing & Experiments</h1>
          <p className="text-gray-400 mt-1">Run experiments and manage feature flags</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + New Experiment
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            + New Flag
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Active Tests</p>
          <p className="text-2xl font-bold text-white">{stats.activeExperiments}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Total Variants</p>
          <p className="text-2xl font-bold text-white">{stats.totalVariants}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Avg Lift</p>
          <p className="text-2xl font-bold text-green-400">+{stats.avgLift}%</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Tests Completed</p>
          <p className="text-2xl font-bold text-white">{stats.testsCompleted}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Active Flags</p>
          <p className="text-2xl font-bold text-white">{stats.featureFlagsActive}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Total Flags</p>
          <p className="text-2xl font-bold text-white">{stats.totalFlags}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit">
        {(['experiments', 'feature-flags', 'personalization'] as const).map((tab) => (
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

      {/* Experiments Tab */}
      {activeTab === 'experiments' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2">
            {['all', 'running', 'paused', 'completed', 'draft'].map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                  selectedStatus === status
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Experiments List */}
          <div className="space-y-4">
            {filteredExperiments.map((exp) => (
              <div key={exp.id} className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">{exp.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(exp.status)}`}>
                          {exp.status}
                        </span>
                        <span className="px-2 py-1 bg-white/10 text-gray-400 rounded text-xs uppercase">
                          {exp.type}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{exp.description}</p>
                    </div>
                    <div className="flex gap-2">
                      {exp.status === 'running' && (
                        <button className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-colors">
                          Pause
                        </button>
                      )}
                      {exp.status === 'paused' && (
                        <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors">
                          Resume
                        </button>
                      )}
                      <button className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>

                  {/* Variants */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {exp.variants.map((variant) => (
                      <div
                        key={variant.id}
                        className={`p-4 rounded-lg border ${
                          exp.winner === variant.id
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">{variant.name}</span>
                          {exp.winner === variant.id && (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">Winner</span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-gray-400 text-xs">Traffic</p>
                            <p className="text-white font-semibold">{variant.traffic}%</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Conversions</p>
                            <p className="text-white font-semibold">{variant.conversions}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Rate</p>
                            <p className={`font-semibold ${
                              variant.conversionRate > exp.variants[0].conversionRate && variant.id !== 'control'
                                ? 'text-green-400'
                                : 'text-white'
                            }`}>{variant.conversionRate}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer Stats */}
                  <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-white/10 text-sm">
                    <div>
                      <span className="text-gray-400">Metric:</span>
                      <span className="text-white ml-2">{exp.metric}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Confidence:</span>
                      <span className={`ml-2 ${exp.confidence >= 95 ? 'text-green-400' : exp.confidence >= 90 ? 'text-yellow-400' : 'text-gray-400'}`}>
                        {exp.confidence}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Started:</span>
                      <span className="text-white ml-2">{new Date(exp.startDate).toLocaleDateString()}</span>
                    </div>
                    {exp.endDate && (
                      <div>
                        <span className="text-gray-400">Ended:</span>
                        <span className="text-white ml-2">{new Date(exp.endDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature Flags Tab */}
      {activeTab === 'feature-flags' && (
        <div className="space-y-4">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-gray-400 font-medium">Flag</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Key</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Rollout</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Environments</th>
                  <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {featureFlags.map((flag) => (
                  <tr key={flag.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4">
                      <div>
                        <p className="text-white font-medium">{flag.name}</p>
                        <p className="text-gray-400 text-sm">{flag.description}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <code className="px-2 py-1 bg-white/10 text-purple-400 rounded text-sm">{flag.key}</code>
                    </td>
                    <td className="p-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={flag.enabled} className="sr-only peer" readOnly />
                        <div className={`w-11 h-6 rounded-full peer ${flag.enabled ? 'bg-green-600' : 'bg-gray-600'}`}>
                          <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${flag.enabled ? 'translate-x-5' : ''}`} />
                        </div>
                      </label>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${flag.rollout}%` }} />
                        </div>
                        <span className="text-white text-sm">{flag.rollout}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1 flex-wrap">
                        {flag.environments.map(env => (
                          <span key={env} className={`px-2 py-0.5 rounded text-xs ${
                            env === 'production' ? 'bg-green-500/20 text-green-400' :
                            env === 'staging' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {env}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Personalization Tab */}
      {activeTab === 'personalization' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Active Personalization Rules</h3>
              <div className="space-y-3">
                {[
                  { name: 'VIP Customer Banner', audience: 'High-value customers', status: 'active', impressions: 12450 },
                  { name: 'New User Welcome', audience: 'First-time visitors', status: 'active', impressions: 8920 },
                  { name: 'Returning Customer Discount', audience: 'Repeat buyers', status: 'active', impressions: 5680 },
                  { name: 'Location-based Events', audience: 'By geo-location', status: 'paused', impressions: 3240 },
                ].map((rule, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{rule.name}</p>
                      <p className="text-gray-400 text-sm">{rule.audience}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-sm">{rule.impressions.toLocaleString()} views</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        rule.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {rule.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 py-2 border border-dashed border-white/20 rounded-lg text-gray-400 hover:text-white hover:border-purple-500 transition-colors">
                + Add Rule
              </button>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Audience Segments</h3>
              <div className="space-y-3">
                {[
                  { name: 'High-Value Customers', size: 2450, criteria: 'LTV > $500' },
                  { name: 'New Users', size: 8920, criteria: 'Signed up < 30 days' },
                  { name: 'Repeat Buyers', size: 5680, criteria: 'Orders >= 2' },
                  { name: 'Concert Enthusiasts', size: 3420, criteria: 'Attended concerts >= 3' },
                  { name: 'VIP Members', size: 890, criteria: 'Loyalty tier = Gold/Platinum' },
                ].map((segment, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{segment.name}</p>
                      <p className="text-gray-400 text-sm">{segment.criteria}</p>
                    </div>
                    <span className="text-purple-400 font-medium">{segment.size.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 py-2 border border-dashed border-white/20 rounded-lg text-gray-400 hover:text-white hover:border-purple-500 transition-colors">
                + Create Segment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
