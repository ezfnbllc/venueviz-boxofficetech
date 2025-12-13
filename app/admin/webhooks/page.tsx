'use client'

import { useState, useEffect } from 'react'

interface Webhook {
  id: string
  url: string
  events: string[]
  status: 'active' | 'failing' | 'disabled'
  lastTriggered?: string
  successRate: number
  secret: string
}

export default function WebhooksPage() {
  const [loading, setLoading] = useState(true)
  const [webhooks, setWebhooks] = useState<Webhook[]>([])

  const stats = {
    totalWebhooks: 8,
    activeWebhooks: 6,
    deliveriesToday: 1250,
    successRate: 98.5,
    avgResponseTime: 245,
    failedToday: 12,
  }

  useEffect(() => {
    setTimeout(() => {
      setWebhooks([
        { id: '1', url: 'https://api.partner.com/webhooks/orders', events: ['order.created', 'order.updated'], status: 'active', lastTriggered: '2024-01-08T11:30:00', successRate: 99.8, secret: 'whsec_...' },
        { id: '2', url: 'https://analytics.example.com/events', events: ['event.published', 'event.sold_out'], status: 'active', lastTriggered: '2024-01-08T10:15:00', successRate: 100, secret: 'whsec_...' },
        { id: '3', url: 'https://crm.company.com/hooks', events: ['customer.created', 'customer.updated'], status: 'failing', lastTriggered: '2024-01-08T09:00:00', successRate: 45.2, secret: 'whsec_...' },
        { id: '4', url: 'https://accounting.internal/api/webhooks', events: ['payment.completed', 'refund.processed'], status: 'active', lastTriggered: '2024-01-08T11:25:00', successRate: 98.5, secret: 'whsec_...' },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400'
      case 'failing': return 'bg-red-500/20 text-red-400'
      case 'disabled': return 'bg-gray-500/20 text-gray-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const allEvents = [
    'order.created', 'order.updated', 'order.cancelled', 'order.completed',
    'payment.completed', 'payment.failed', 'refund.processed',
    'event.published', 'event.updated', 'event.sold_out', 'event.cancelled',
    'customer.created', 'customer.updated', 'ticket.transferred'
  ]

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
          <h1 className="text-2xl font-bold text-white">Webhooks</h1>
          <p className="text-gray-400 mt-1">Configure and monitor webhook integrations</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + Add Webhook
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            View Logs
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Total Webhooks</p>
          <p className="text-2xl font-bold text-white">{stats.totalWebhooks}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Active</p>
          <p className="text-2xl font-bold text-green-400">{stats.activeWebhooks}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Deliveries Today</p>
          <p className="text-2xl font-bold text-white">{stats.deliveriesToday.toLocaleString()}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Success Rate</p>
          <p className="text-2xl font-bold text-green-400">{stats.successRate}%</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Avg Response</p>
          <p className="text-2xl font-bold text-white">{stats.avgResponseTime}ms</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Failed Today</p>
          <p className="text-2xl font-bold text-red-400">{stats.failedToday}</p>
        </div>
      </div>

      {/* Webhooks List */}
      <div className="space-y-4">
        {webhooks.map((webhook) => (
          <div key={webhook.id} className={`bg-white/5 backdrop-blur-xl rounded-xl p-6 border ${
            webhook.status === 'failing' ? 'border-red-500/30' : 'border-white/10'
          }`}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(webhook.status)}`}>
                    {webhook.status}
                  </span>
                  {webhook.status === 'failing' && (
                    <span className="text-red-400 text-sm">⚠️ Connection issues</span>
                  )}
                </div>
                <code className="text-purple-400 text-sm break-all">{webhook.url}</code>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                  Test
                </button>
                <button className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                  Edit
                </button>
                <button className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors">
                  Delete
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {webhook.events.map((event) => (
                <span key={event} className="px-2 py-1 bg-white/10 text-gray-400 rounded text-xs">
                  {event}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-4 border-t border-white/10">
              <div>
                <span className="text-gray-400">Last Triggered:</span>
                <span className="text-white ml-2">
                  {webhook.lastTriggered ? new Date(webhook.lastTriggered).toLocaleString() : 'Never'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Success Rate:</span>
                <span className={`ml-2 ${webhook.successRate >= 95 ? 'text-green-400' : 'text-red-400'}`}>
                  {webhook.successRate}%
                </span>
              </div>
              <div>
                <span className="text-gray-400">Events:</span>
                <span className="text-white ml-2">{webhook.events.length}</span>
              </div>
              <div>
                <span className="text-gray-400">Secret:</span>
                <code className="text-gray-500 ml-2">whsec_****</code>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Available Events */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Available Events</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {allEvents.map((event) => (
            <div key={event} className="px-3 py-2 bg-white/5 rounded-lg text-gray-400 text-sm">
              {event}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Deliveries */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Deliveries</h3>
        <div className="space-y-2">
          {[
            { event: 'order.created', url: 'api.partner.com', status: 'success', time: '2 min ago', duration: '156ms' },
            { event: 'payment.completed', url: 'accounting.internal', status: 'success', time: '5 min ago', duration: '234ms' },
            { event: 'customer.created', url: 'crm.company.com', status: 'failed', time: '8 min ago', duration: '5000ms' },
            { event: 'event.sold_out', url: 'analytics.example.com', status: 'success', time: '15 min ago', duration: '189ms' },
          ].map((delivery, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${delivery.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-white">{delivery.event}</span>
                <span className="text-gray-500">→</span>
                <span className="text-gray-400">{delivery.url}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-400">{delivery.duration}</span>
                <span className="text-gray-500">{delivery.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
