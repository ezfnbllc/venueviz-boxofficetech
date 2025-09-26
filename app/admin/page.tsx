'use client'

import { useState } from 'react'
import { Brain, TrendingUp, Users, DollarSign, Calendar, Settings, ChevronRight, Zap, Target, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [aiMode, setAiMode] = useState(true)

  const metrics = [
    { title: 'Total Revenue', value: '$1.2M', change: '+22%', icon: DollarSign, color: 'purple' },
    { title: 'Active Users', value: '8,234', change: '+15%', icon: Users, color: 'pink' },
    { title: 'Events Scheduled', value: '42', change: '+8%', icon: Calendar, color: 'blue' },
    { title: 'Conversion Rate', value: '4.8%', change: '+0.5%', icon: Target, color: 'green' }
  ]

  const aiInsights = [
    { type: 'pricing', message: 'Increase Orchestra seats by 15% for weekend shows', impact: '+$12,500', confidence: 94 },
    { type: 'marketing', message: 'Target 25-45 demographic for Jazz Night', impact: '+180 tickets', confidence: 87 },
    { type: 'scheduling', message: 'Move matinee to 2 PM for better attendance', impact: '+23%', confidence: 91 }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                Admin Panel
              </h1>
              <div className="flex items-center gap-2 px-3 py-1 bg-purple-600/20 rounded-full">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-400">AI-Powered</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setAiMode(!aiMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  aiMode ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-400'
                }`}
              >
                <Zap className="w-4 h-4" />
                AI Mode
              </button>
              <Settings className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-6">
            {['overview', 'analytics', 'venues', 'events', 'customers', 'ai-insights'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 transition-all ${
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
        {/* AI Insights Bar */}
        {aiMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl backdrop-blur-xl border border-purple-500/30"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Predictions & Recommendations
              </h3>
              <span className="text-sm text-purple-400">Updated 2 minutes ago</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {aiInsights.map((insight, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-4 bg-black/30 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-purple-400 uppercase">{insight.type}</span>
                    <span className="text-xs text-green-400">{insight.confidence}% confidence</span>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{insight.message}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-green-400">{insight.impact}</span>
                    <button className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1">
                      Apply <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <metric.icon className={`w-8 h-8 text-${metric.color}-500`} />
                <span className={`text-sm font-semibold text-${metric.color}-400`}>
                  {metric.change}
                </span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{metric.value}</p>
              <p className="text-sm text-gray-400">{metric.title}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 text-left hover:bg-black/50 transition-colors">
            <h4 className="text-lg font-semibold text-white mb-2">Create Event</h4>
            <p className="text-sm text-gray-400">Set up a new event with AI-optimized pricing</p>
          </button>
          <button className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 text-left hover:bg-black/50 transition-colors">
            <h4 className="text-lg font-semibold text-white mb-2">View Analytics</h4>
            <p className="text-sm text-gray-400">Deep dive into performance metrics</p>
          </button>
          <button className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 text-left hover:bg-black/50 transition-colors">
            <h4 className="text-lg font-semibold text-white mb-2">Manage Venues</h4>
            <p className="text-sm text-gray-400">Configure venue layouts and sections</p>
          </button>
        </div>
      </div>
    </div>
  )
}
