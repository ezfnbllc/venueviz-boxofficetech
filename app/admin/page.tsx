'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

export default function AdminPanel() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [aiPredictions, setAiPredictions] = useState<any>(null)

  useEffect(() => {
    const token = Cookies.get('auth-token')
    if (!token) {
      router.push('/login')
    } else {
      setLoading(false)
      fetchAIPredictions()
    }
  }, [router])

  const fetchAIPredictions = async () => {
    // Simulate AI predictions using Anthropic API
    const predictions = {
      revenue: { next30Days: 285000, confidence: 92 },
      pricing: { 
        optimal: { orchestra: 165, mezzanine: 115, balcony: 85 },
        suggestedIncrease: 15
      },
      events: [
        { name: 'Hamilton', riskLevel: 'low', suggestedAction: 'Increase prices by 10%' },
        { name: 'Jazz Night', riskLevel: 'high', suggestedAction: 'Launch social media campaign' }
      ]
    }
    setAiPredictions(predictions)
  }

  const handleLogout = () => {
    Cookies.remove('auth-token')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  const metrics = [
    { title: 'Total Revenue', value: '$1.2M', change: '+22%', icon: '💰', aiInsight: 'Expected $1.5M by month end' },
    { title: 'Active Users', value: '8,234', change: '+15%', icon: '👥', aiInsight: '324 high-value customers' },
    { title: 'Events Scheduled', value: '42', change: '+8%', icon: '📅', aiInsight: '5 events need attention' },
    { title: 'Conversion Rate', value: '4.8%', change: '+0.5%', icon: '🎯', aiInsight: 'Optimize checkout for +1.2%' }
  ]

  const tabs = ['dashboard', 'analytics', 'venues', 'events', 'customers', 'ai-insights', 'settings']

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                VenueViz Admin
              </h1>
              <div className="flex items-center gap-2 px-3 py-1 bg-purple-600/20 rounded-full">
                <span className="text-purple-400">🤖 AI-Powered</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">Welcome, admin@venueviz.com</span>
              <button onClick={handleLogout} className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-6 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-purple-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* AI Predictions Banner */}
            {aiPredictions && (
              <div className="p-6 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl backdrop-blur-xl border border-purple-500/30">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>🧠</span> AI Predictions & Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-black/30 rounded-lg">
                    <p className="text-sm text-purple-400 mb-1">30-Day Revenue Forecast</p>
                    <p className="text-2xl font-bold text-white">${aiPredictions.revenue.next30Days.toLocaleString()}</p>
                    <p className="text-sm text-green-400 mt-1">{aiPredictions.revenue.confidence}% confidence</p>
                  </div>
                  <div className="p-4 bg-black/30 rounded-lg">
                    <p className="text-sm text-purple-400 mb-1">Optimal Price Adjustment</p>
                    <p className="text-lg font-semibold text-white">+{aiPredictions.pricing.suggestedIncrease}%</p>
                    <p className="text-sm text-gray-300 mt-1">Weekend shows only</p>
                  </div>
                  <div className="p-4 bg-black/30 rounded-lg">
                    <p className="text-sm text-purple-400 mb-1">Action Required</p>
                    <p className="text-sm text-white">{aiPredictions.events[1].suggestedAction}</p>
                    <p className="text-sm text-yellow-400 mt-1">High priority</p>
                  </div>
                </div>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {metrics.map((metric, i) => (
                <div key={i} className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 hover:border-purple-500/50 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl">{metric.icon}</span>
                    <span className="text-sm font-semibold text-green-400">{metric.change}</span>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{metric.value}</p>
                  <p className="text-sm text-gray-400 mb-3">{metric.title}</p>
                  <p className="text-xs text-purple-400 flex items-center gap-1">
                    <span>⚡</span> {metric.aiInsight}
                  </p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button className="p-6 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl border border-purple-500/30 text-left hover:from-purple-600/30 hover:to-pink-600/30 transition-all">
                <h4 className="text-lg font-semibold text-white mb-2">�� Create Event</h4>
                <p className="text-sm text-gray-300">Set up a new event with AI-optimized pricing</p>
              </button>
              <button className="p-6 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-xl border border-blue-500/30 text-left hover:from-blue-600/30 hover:to-cyan-600/30 transition-all">
                <h4 className="text-lg font-semibold text-white mb-2">📊 View Analytics</h4>
                <p className="text-sm text-gray-300">Deep dive into performance metrics</p>
              </button>
              <button className="p-6 bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-xl border border-green-500/30 text-left hover:from-green-600/30 hover:to-emerald-600/30 transition-all">
                <h4 className="text-lg font-semibold text-white mb-2">🏛️ Manage Venues</h4>
                <p className="text-sm text-gray-300">Configure venue layouts and sections</p>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'ai-insights' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4">AI-Powered Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">🎯 Recommendations</h3>
                <div className="space-y-4">
                  {[
                    { action: 'Increase Hamilton prices', impact: '+$12,500', confidence: '94%' },
                    { action: 'Target 25-45 demographic', impact: '+180 tickets', confidence: '87%' },
                    { action: 'Move matinee to 2 PM', impact: '+23% attendance', confidence: '91%' }
                  ].map((rec, i) => (
                    <div key={i} className="p-4 bg-white/5 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm text-white">{rec.action}</p>
                        <span className="text-xs px-2 py-1 bg-purple-600/20 text-purple-400 rounded">{rec.confidence}</span>
                      </div>
                      <p className="text-sm text-green-400">{rec.impact}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">📈 Predictions</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Next Week Revenue</p>
                    <p className="text-2xl font-bold text-white">$68,500</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Ticket Demand</p>
                    <p className="text-2xl font-bold text-white">High</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Optimal Capacity</p>
                    <p className="text-2xl font-bold text-white">82%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
