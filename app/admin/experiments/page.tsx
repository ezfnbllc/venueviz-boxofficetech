'use client'

import { useState, useEffect } from 'react'
import { usePromoterAccess } from '@/lib/hooks/usePromoterAccess'
import {
  ABTestingService,
  Experiment,
  FeatureFlag,
  PersonalizationCampaign,
} from '@/lib/services/abTestingService'

export default function ExperimentsPage() {
  const {
    effectivePromoterId,
    showAll,
    isAdmin,
    loading: accessLoading,
  } = usePromoterAccess()

  const [activeTab, setActiveTab] = useState<'experiments' | 'feature-flags' | 'personalization'>('experiments')
  const [loading, setLoading] = useState(true)
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([])
  const [personalizationCampaigns, setPersonalizationCampaigns] = useState<PersonalizationCampaign[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)

  // Calculate stats from real data
  const stats = {
    activeExperiments: experiments.filter(e => e.status === 'running').length,
    totalVariants: experiments.reduce((sum, e) => sum + e.variants.length, 0),
    avgLift: experiments
      .filter(e => e.results?.analysis?.length)
      .reduce((sum, e) => {
        const maxImprovement = Math.max(
          ...e.results!.analysis.map(a => Math.abs(a.improvement))
        )
        return sum + maxImprovement
      }, 0) / Math.max(experiments.filter(e => e.results).length, 1) || 0,
    testsCompleted: experiments.filter(e => e.status === 'completed').length,
    featureFlagsActive: featureFlags.filter(f => f.status === 'active').length,
    totalFlags: featureFlags.length,
  }

  useEffect(() => {
    loadData()
  }, [effectivePromoterId, showAll])

  const loadData = async () => {
    if (accessLoading || !effectivePromoterId) return

    setLoading(true)
    setError(null)

    try {
      if (showAll) {
        // Admin viewing all - would need to aggregate from all promoters
        // For now, show empty with a message
        setExperiments([])
        setFeatureFlags([])
        setPersonalizationCampaigns([])
      } else {
        // Load experiments for specific promoter
        const [loadedExperiments, loadedFlags] = await Promise.all([
          ABTestingService.getExperiments(effectivePromoterId),
          ABTestingService.getFeatureFlags(effectivePromoterId),
        ])

        setExperiments(loadedExperiments)
        setFeatureFlags(loadedFlags)

        // Personalization campaigns would come from a separate query
        // For now we'll handle them when implemented
      }
    } catch (err) {
      console.error('Error loading A/B testing data:', err)
      setError('Failed to load experiments data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'paused': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'draft': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      case 'archived': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getExperimentTypeLabel = (type: string) => {
    switch (type) {
      case 'ab_test': return 'A/B'
      case 'multivariate': return 'MVT'
      case 'split_url': return 'Split URL'
      case 'personalization': return 'Personalization'
      case 'feature_flag': return 'Feature'
      case 'holdout': return 'Holdout'
      default: return type
    }
  }

  const filteredExperiments = experiments.filter(exp => {
    return selectedStatus === 'all' || exp.status === selectedStatus
  })

  const handlePauseExperiment = async (experimentId: string) => {
    try {
      await ABTestingService.pauseExperiment(experimentId)
      loadData()
    } catch (err) {
      console.error('Error pausing experiment:', err)
    }
  }

  const handleResumeExperiment = async (experimentId: string) => {
    try {
      await ABTestingService.resumeExperiment(experimentId)
      loadData()
    } catch (err) {
      console.error('Error resuming experiment:', err)
    }
  }

  const handleToggleFlag = async (flagId: string, currentStatus: string) => {
    try {
      await ABTestingService.toggleFeatureFlag(flagId, currentStatus !== 'active')
      loadData()
    } catch (err) {
      console.error('Error toggling feature flag:', err)
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

      {/* Admin All-Promoters Notice */}
      {showAll && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-400">
            Select a specific promoter from the dropdown to view their experiments and feature flags.
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
          <p className="text-gray-400 text-xs">Active Tests</p>
          <p className="text-2xl font-bold text-white">{stats.activeExperiments}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Total Variants</p>
          <p className="text-2xl font-bold text-white">{stats.totalVariants}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Avg Lift</p>
          <p className="text-2xl font-bold text-green-400">
            {stats.avgLift > 0 ? `+${stats.avgLift.toFixed(1)}%` : '—'}
          </p>
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

          {/* Empty State */}
          {filteredExperiments.length === 0 && !showAll && (
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-white/10 text-center">
              <div className="text-6xl mb-4">🧪</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Experiments Yet</h3>
              <p className="text-gray-400 mb-6">
                Create your first A/B test to start optimizing your conversion rates.
              </p>
              <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                Create First Experiment
              </button>
            </div>
          )}

          {/* Experiments List */}
          <div className="space-y-4">
            {filteredExperiments.map((exp) => {
              const controlVariant = exp.variants.find(v => v.isControl)
              const treatmentVariants = exp.variants.filter(v => !v.isControl)

              return (
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
                            {getExperimentTypeLabel(exp.type)}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">
                          {exp.description || exp.hypothesis}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {exp.status === 'running' && (
                          <button
                            onClick={() => handlePauseExperiment(exp.id)}
                            className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-colors"
                          >
                            Pause
                          </button>
                        )}
                        {exp.status === 'paused' && (
                          <button
                            onClick={() => handleResumeExperiment(exp.id)}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                          >
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
                      {exp.variants.map((variant) => {
                        const conversionRate = variant.metrics.visitors > 0
                          ? (variant.metrics.conversions / variant.metrics.visitors) * 100
                          : 0
                        const controlRate = controlVariant && controlVariant.metrics.visitors > 0
                          ? (controlVariant.metrics.conversions / controlVariant.metrics.visitors) * 100
                          : 0
                        const isWinner = exp.results?.winner === variant.id

                        return (
                          <div
                            key={variant.id}
                            className={`p-4 rounded-lg border ${
                              isWinner
                                ? 'bg-green-500/10 border-green-500/30'
                                : 'bg-white/5 border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-medium">
                                {variant.name}
                                {variant.isControl && (
                                  <span className="ml-2 text-xs text-gray-400">(Control)</span>
                                )}
                              </span>
                              {isWinner && (
                                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">Winner</span>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div>
                                <p className="text-gray-400 text-xs">Traffic</p>
                                <p className="text-white font-semibold">{variant.weight}%</p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-xs">Visitors</p>
                                <p className="text-white font-semibold">{variant.metrics.visitors.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-xs">Conv. Rate</p>
                                <p className={`font-semibold ${
                                  !variant.isControl && conversionRate > controlRate
                                    ? 'text-green-400'
                                    : 'text-white'
                                }`}>
                                  {conversionRate.toFixed(2)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Footer Stats */}
                    <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-white/10 text-sm">
                      <div>
                        <span className="text-gray-400">Primary Goal:</span>
                        <span className="text-white ml-2">
                          {exp.goals.find(g => g.primary)?.name || exp.goals[0]?.name || 'N/A'}
                        </span>
                      </div>
                      {exp.results && (
                        <div>
                          <span className="text-gray-400">Confidence:</span>
                          <span className={`ml-2 ${
                            exp.results.confidence >= 95 ? 'text-green-400' :
                            exp.results.confidence >= 90 ? 'text-yellow-400' :
                            'text-gray-400'
                          }`}>
                            {exp.results.confidence}%
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-400">Started:</span>
                        <span className="text-white ml-2">
                          {exp.startedAt
                            ? new Date(exp.startedAt).toLocaleDateString()
                            : 'Not started'}
                        </span>
                      </div>
                      {exp.completedAt && (
                        <div>
                          <span className="text-gray-400">Ended:</span>
                          <span className="text-white ml-2">{new Date(exp.completedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-400">Traffic:</span>
                        <span className="text-white ml-2">{exp.traffic.percentage}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Feature Flags Tab */}
      {activeTab === 'feature-flags' && (
        <div className="space-y-4">
          {/* Empty State */}
          {featureFlags.length === 0 && !showAll && (
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-white/10 text-center">
              <div className="text-6xl mb-4">🚩</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Feature Flags</h3>
              <p className="text-gray-400 mb-6">
                Create feature flags to control feature rollouts and enable/disable functionality.
              </p>
              <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                Create First Flag
              </button>
            </div>
          )}

          {featureFlags.length > 0 && (
            <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-gray-400 font-medium">Flag</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Key</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Type</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Rollout</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {featureFlags.map((flag) => (
                    <tr key={flag.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-4">
                        <div>
                          <p className="text-white font-medium">{flag.name}</p>
                          <p className="text-gray-400 text-sm">{flag.description || 'No description'}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <code className="px-2 py-1 bg-white/10 text-purple-400 rounded text-sm">{flag.key}</code>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-white/10 text-gray-400 rounded text-xs uppercase">
                          {flag.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleFlag(flag.id, flag.status)}
                          className="relative inline-flex items-center cursor-pointer"
                        >
                          <div className={`w-11 h-6 rounded-full transition-colors ${
                            flag.status === 'active' ? 'bg-green-600' : 'bg-gray-600'
                          }`}>
                            <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${
                              flag.status === 'active' ? 'translate-x-5' : ''
                            }`} />
                          </div>
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${flag.targeting.percentage || 100}%` }}
                            />
                          </div>
                          <span className="text-white text-sm">{flag.targeting.percentage || 100}%</span>
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
          )}
        </div>
      )}

      {/* Personalization Tab */}
      {activeTab === 'personalization' && (
        <div className="space-y-6">
          {/* Empty State for Personalization */}
          {personalizationCampaigns.length === 0 && !showAll && (
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-white/10 text-center">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Personalization Campaigns</h3>
              <p className="text-gray-400 mb-6">
                Create personalization campaigns to deliver targeted experiences to different audience segments.
              </p>
              <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                Create Campaign
              </button>
            </div>
          )}

          {/* Campaign list would go here when data is available */}
          {personalizationCampaigns.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Active Personalization Rules</h3>
                <div className="space-y-3">
                  {personalizationCampaigns
                    .filter(c => c.status === 'active')
                    .map((campaign) => (
                      <div key={campaign.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{campaign.name}</p>
                          <p className="text-gray-400 text-sm">{campaign.description}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-sm">
                            {campaign.metrics.impressions.toLocaleString()} views
                          </span>
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                            {campaign.status}
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
                <p className="text-gray-400 text-center py-8">
                  Configure audience segments in Analytics & BI to use here.
                </p>
                <button className="w-full mt-4 py-2 border border-dashed border-white/20 rounded-lg text-gray-400 hover:text-white hover:border-purple-500 transition-colors">
                  + Create Segment
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
