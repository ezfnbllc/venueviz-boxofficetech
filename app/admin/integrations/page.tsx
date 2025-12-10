'use client'

import { useState, useEffect } from 'react'

interface Integration {
  id: string
  name: string
  category: string
  description: string
  status: 'connected' | 'disconnected' | 'error' | 'pending'
  icon: string
  lastSync?: string
  config?: Record<string, any>
}

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'connected' | 'available'>('all')
  const [loading, setLoading] = useState(true)
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const categories = ['CRM', 'Payment', 'Marketing', 'Analytics', 'Communication', 'Accounting', 'Social Media']

  useEffect(() => {
    setTimeout(() => {
      setIntegrations([
        { id: '1', name: 'Stripe', category: 'Payment', description: 'Process payments and manage subscriptions', status: 'connected', icon: '💳', lastSync: '2024-01-08T10:30:00' },
        { id: '2', name: 'PayPal', category: 'Payment', description: 'Accept PayPal payments', status: 'connected', icon: '💰', lastSync: '2024-01-08T09:15:00' },
        { id: '3', name: 'Salesforce', category: 'CRM', description: 'Sync customer data with Salesforce CRM', status: 'connected', icon: '☁️', lastSync: '2024-01-08T08:00:00' },
        { id: '4', name: 'HubSpot', category: 'CRM', description: 'Marketing automation and CRM', status: 'disconnected', icon: '🧲', },
        { id: '5', name: 'Mailchimp', category: 'Marketing', description: 'Email marketing campaigns', status: 'connected', icon: '📧', lastSync: '2024-01-07T22:00:00' },
        { id: '6', name: 'Google Analytics', category: 'Analytics', description: 'Track website and app analytics', status: 'connected', icon: '📊', lastSync: '2024-01-08T11:00:00' },
        { id: '7', name: 'Twilio', category: 'Communication', description: 'SMS and voice communications', status: 'connected', icon: '📱', lastSync: '2024-01-08T10:45:00' },
        { id: '8', name: 'SendGrid', category: 'Communication', description: 'Transactional email delivery', status: 'connected', icon: '✉️', lastSync: '2024-01-08T11:30:00' },
        { id: '9', name: 'QuickBooks', category: 'Accounting', description: 'Accounting and invoicing', status: 'disconnected', icon: '📝' },
        { id: '10', name: 'Xero', category: 'Accounting', description: 'Cloud accounting software', status: 'disconnected', icon: '💼' },
        { id: '11', name: 'Facebook', category: 'Social Media', description: 'Social media marketing', status: 'connected', icon: '📘', lastSync: '2024-01-08T06:00:00' },
        { id: '12', name: 'Instagram', category: 'Social Media', description: 'Visual marketing and engagement', status: 'connected', icon: '📷', lastSync: '2024-01-08T06:00:00' },
        { id: '13', name: 'Slack', category: 'Communication', description: 'Team notifications and alerts', status: 'error', icon: '💬', lastSync: '2024-01-07T18:00:00' },
        { id: '14', name: 'Zapier', category: 'Marketing', description: 'Connect with 5000+ apps', status: 'connected', icon: '⚡', lastSync: '2024-01-08T10:00:00' },
        { id: '15', name: 'Segment', category: 'Analytics', description: 'Customer data platform', status: 'pending', icon: '🔀' },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'disconnected': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      case 'error': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const filteredIntegrations = integrations.filter(int => {
    const matchesSearch = int.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         int.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || int.category === selectedCategory
    const matchesTab = activeTab === 'all' ||
                      (activeTab === 'connected' && int.status === 'connected') ||
                      (activeTab === 'available' && int.status !== 'connected')
    return matchesSearch && matchesCategory && matchesTab
  })

  const connectedCount = integrations.filter(i => i.status === 'connected').length
  const errorCount = integrations.filter(i => i.status === 'error').length

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
          <h1 className="text-2xl font-bold text-white">Integrations Hub</h1>
          <p className="text-gray-400 mt-1">Connect and manage third-party services</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + Add Integration
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            API Keys
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-sm">Total Integrations</p>
          <p className="text-2xl font-bold text-white">{integrations.length}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-sm">Connected</p>
          <p className="text-2xl font-bold text-green-400">{connectedCount}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-sm">Issues</p>
          <p className="text-2xl font-bold text-red-400">{errorCount}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-sm">Available</p>
          <p className="text-2xl font-bold text-gray-400">{integrations.length - connectedCount}</p>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit">
          {(['all', 'connected', 'available'] as const).map((tab) => (
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

        <div className="flex flex-1 gap-4">
          <input
            type="text"
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {errorCount > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-red-400 font-medium">{errorCount} integration(s) need attention</p>
              <p className="text-gray-400 text-sm">Some integrations have sync errors or require reconfiguration</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
            View Issues
          </button>
        </div>
      )}

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIntegrations.map((integration) => (
          <div key={integration.id} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 hover:border-white/20 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{integration.icon}</span>
                <div>
                  <h3 className="text-white font-semibold">{integration.name}</h3>
                  <span className="px-2 py-0.5 bg-white/10 text-gray-400 rounded text-xs">{integration.category}</span>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(integration.status)}`}>
                {integration.status}
              </span>
            </div>

            <p className="text-gray-400 text-sm mb-4">{integration.description}</p>

            {integration.lastSync && (
              <p className="text-gray-500 text-xs mb-4">
                Last synced: {new Date(integration.lastSync).toLocaleString()}
              </p>
            )}

            <div className="flex gap-2">
              {integration.status === 'connected' ? (
                <>
                  <button className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                    Configure
                  </button>
                  <button className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors">
                    Disconnect
                  </button>
                </>
              ) : integration.status === 'error' ? (
                <>
                  <button className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors">
                    Fix Issue
                  </button>
                  <button className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                    Logs
                  </button>
                </>
              ) : integration.status === 'pending' ? (
                <button className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-colors">
                  Complete Setup
                </button>
              ) : (
                <button className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                  Connect
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Webhooks Section */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Webhooks</h3>
            <p className="text-gray-400 text-sm">Configure outgoing webhooks for real-time data sync</p>
          </div>
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + Add Webhook
          </button>
        </div>
        <div className="space-y-3">
          {[
            { url: 'https://api.partner.com/webhooks/orders', events: ['order.created', 'order.updated'], status: 'active', lastTriggered: '2 min ago' },
            { url: 'https://analytics.example.com/events', events: ['event.published', 'event.sold_out'], status: 'active', lastTriggered: '15 min ago' },
            { url: 'https://crm.company.com/hooks', events: ['customer.created'], status: 'failing', lastTriggered: '1 hour ago' },
          ].map((webhook, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex-1">
                <code className="text-purple-400 text-sm">{webhook.url}</code>
                <div className="flex gap-2 mt-2">
                  {webhook.events.map(event => (
                    <span key={event} className="px-2 py-0.5 bg-white/10 text-gray-400 rounded text-xs">{event}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    webhook.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {webhook.status}
                  </span>
                  <p className="text-gray-500 text-xs mt-1">{webhook.lastTriggered}</p>
                </div>
                <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
