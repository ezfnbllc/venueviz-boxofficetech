'use client'

import { useState, useEffect } from 'react'

interface PricingRule {
  id: string
  name: string
  type: 'surge' | 'early_bird' | 'last_minute' | 'demand'
  status: 'active' | 'paused' | 'scheduled'
  adjustment: number
  conditions: string
  appliedTo: number
  revenue: number
}

export default function DynamicPricingPage() {
  const [activeTab, setActiveTab] = useState<'rules' | 'analytics' | 'simulation' | 'settings'>('rules')
  const [loading, setLoading] = useState(true)
  const [rules, setRules] = useState<PricingRule[]>([])

  const stats = {
    activeRules: 8,
    avgPriceIncrease: 12.5,
    revenueImpact: 45800,
    dynamicPricedEvents: 24,
    priceChangesToday: 156,
    customerAcceptance: 94,
  }

  useEffect(() => {
    setTimeout(() => {
      setRules([
        { id: '1', name: 'Weekend Surge', type: 'surge', status: 'active', adjustment: 15, conditions: 'Fri-Sun, High Demand', appliedTo: 12, revenue: 18500 },
        { id: '2', name: 'Early Bird Discount', type: 'early_bird', status: 'active', adjustment: -20, conditions: '30+ days before event', appliedTo: 8, revenue: 12400 },
        { id: '3', name: 'Last Minute Premium', type: 'last_minute', status: 'active', adjustment: 25, conditions: '<48 hours, >80% sold', appliedTo: 5, revenue: 8900 },
        { id: '4', name: 'Demand-Based Pricing', type: 'demand', status: 'active', adjustment: 10, conditions: 'Sales velocity > 50/hr', appliedTo: 15, revenue: 22500 },
        { id: '5', name: 'Holiday Premium', type: 'surge', status: 'scheduled', adjustment: 30, conditions: 'Dec 24-Jan 1', appliedTo: 0, revenue: 0 },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'surge': return 'bg-red-500/20 text-red-400'
      case 'early_bird': return 'bg-green-500/20 text-green-400'
      case 'last_minute': return 'bg-orange-500/20 text-orange-400'
      case 'demand': return 'bg-purple-500/20 text-purple-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400'
      case 'paused': return 'bg-yellow-500/20 text-yellow-400'
      case 'scheduled': return 'bg-blue-500/20 text-blue-400'
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
          <h1 className="text-2xl font-bold text-white">Dynamic Pricing</h1>
          <p className="text-gray-400 mt-1">Optimize revenue with intelligent pricing rules</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + Create Rule
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            Simulate
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Active Rules</p>
          <p className="text-2xl font-bold text-white">{stats.activeRules}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Avg Price Change</p>
          <p className="text-2xl font-bold text-green-400">+{stats.avgPriceIncrease}%</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Revenue Impact</p>
          <p className="text-2xl font-bold text-white">${(stats.revenueImpact / 1000).toFixed(1)}K</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Events Enabled</p>
          <p className="text-2xl font-bold text-purple-400">{stats.dynamicPricedEvents}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Changes Today</p>
          <p className="text-2xl font-bold text-white">{stats.priceChangesToday}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Acceptance Rate</p>
          <p className="text-2xl font-bold text-green-400">{stats.customerAcceptance}%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit">
        {(['rules', 'analytics', 'simulation', 'settings'] as const).map((tab) => (
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

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{rule.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${getTypeColor(rule.type)}`}>
                      {rule.type.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(rule.status)}`}>
                      {rule.status}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">{rule.conditions}</p>
                </div>
                <div className="flex gap-2">
                  {rule.status === 'active' && (
                    <button className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-colors">
                      Pause
                    </button>
                  )}
                  {rule.status === 'paused' && (
                    <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors">
                      Activate
                    </button>
                  )}
                  <button className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                    Edit
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Adjustment</p>
                  <p className={`text-xl font-semibold ${rule.adjustment > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {rule.adjustment > 0 ? '+' : ''}{rule.adjustment}%
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Applied To</p>
                  <p className="text-white font-semibold">{rule.appliedTo} events</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Revenue Generated</p>
                  <p className="text-green-400 font-semibold">${rule.revenue.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Status</p>
                  <p className={`font-semibold ${
                    rule.status === 'active' ? 'text-green-400' :
                    rule.status === 'scheduled' ? 'text-blue-400' : 'text-yellow-400'
                  }`}>
                    {rule.status.charAt(0).toUpperCase() + rule.status.slice(1)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Price Changes Over Time</h3>
            <div className="h-48 flex items-end gap-2">
              {[8, 12, 15, 10, 18, 14, 20].map((changes, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t"
                    style={{ height: `${(changes / 25) * 100}%` }}
                  />
                  <span className="text-gray-500 text-xs mt-2">Day {i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Revenue by Rule Type</h3>
            <div className="space-y-4">
              {[
                { type: 'Demand-Based', revenue: 22500, percentage: 36 },
                { type: 'Surge Pricing', revenue: 18500, percentage: 30 },
                { type: 'Early Bird', revenue: 12400, percentage: 20 },
                { type: 'Last Minute', revenue: 8900, percentage: 14 },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white">{item.type}</span>
                    <span className="text-gray-400">${(item.revenue / 1000).toFixed(1)}K ({item.percentage}%)</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Top Performing Events</h3>
            <div className="space-y-3">
              {[
                { event: 'Summer Music Festival', basePrice: 75, avgSoldPrice: 92, lift: 23 },
                { event: 'Jazz Night Live', basePrice: 45, avgSoldPrice: 52, lift: 16 },
                { event: 'Comedy Gala 2024', basePrice: 60, avgSoldPrice: 68, lift: 13 },
                { event: 'Rock Concert Series', basePrice: 55, avgSoldPrice: 61, lift: 11 },
              ].map((event, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{event.event}</p>
                    <p className="text-gray-400 text-sm">Base: ${event.basePrice} → Avg: ${event.avgSoldPrice}</p>
                  </div>
                  <span className="text-green-400 font-bold text-lg">+{event.lift}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Simulation Tab */}
      {activeTab === 'simulation' && (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Price Simulation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Select Event</label>
                <select className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option>Summer Music Festival</option>
                  <option>Jazz Night Live</option>
                  <option>Comedy Gala 2024</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Base Price</label>
                <input
                  type="number"
                  defaultValue={75}
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Current Sold %</label>
                <input
                  type="number"
                  defaultValue={65}
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Days Until Event</label>
                <input
                  type="number"
                  defaultValue={14}
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                Run Simulation
              </button>
            </div>

            <div className="bg-white/5 rounded-xl p-6">
              <h4 className="text-white font-medium mb-4">Simulation Results</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Recommended Price</span>
                  <span className="text-2xl font-bold text-green-400">$89</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Price Adjustment</span>
                  <span className="text-green-400">+19%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Applied Rules</span>
                  <span className="text-white">Demand, Weekend</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Est. Additional Revenue</span>
                  <span className="text-green-400">$4,850</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Confidence Score</span>
                  <span className="text-purple-400">92%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Global Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Maximum Price Increase (%)</label>
                <input
                  type="number"
                  defaultValue={50}
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Maximum Price Decrease (%)</label>
                <input
                  type="number"
                  defaultValue={30}
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Minimum Time Between Changes (minutes)</label>
                <input
                  type="number"
                  defaultValue={15}
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">Price Change Alerts</p>
                  <p className="text-gray-400 text-sm">Get notified on price changes</p>
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
                  <p className="text-white font-medium">Revenue Reports</p>
                  <p className="text-gray-400 text-sm">Daily pricing performance</p>
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
