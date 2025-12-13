'use client'

import { useState, useEffect } from 'react'

interface Queue {
  id: string
  name: string
  type: 'general' | 'vip' | 'presale' | 'waitlist'
  status: 'active' | 'paused' | 'closed'
  currentPosition: number
  totalInQueue: number
  avgWaitTime: number
  processedPerHour: number
}

interface WaitlistEntry {
  id: string
  customer: string
  email: string
  event: string
  position: number
  joinedAt: string
  status: 'waiting' | 'notified' | 'converted' | 'expired'
}

export default function QueueManagementPage() {
  const [activeTab, setActiveTab] = useState<'queues' | 'waitlists' | 'capacity' | 'settings'>('queues')
  const [loading, setLoading] = useState(true)
  const [queues, setQueues] = useState<Queue[]>([])
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])

  const stats = {
    activeQueues: 4,
    totalInQueues: 1250,
    avgWaitTime: 12,
    waitlistSize: 856,
    conversionRate: 42,
    capacityUtilization: 78,
  }

  useEffect(() => {
    setTimeout(() => {
      setQueues([
        { id: 'q1', name: 'Summer Festival - General', type: 'general', status: 'active', currentPosition: 1250, totalInQueue: 1250, avgWaitTime: 15, processedPerHour: 450 },
        { id: 'q2', name: 'Summer Festival - VIP', type: 'vip', status: 'active', currentPosition: 85, totalInQueue: 85, avgWaitTime: 3, processedPerHour: 120 },
        { id: 'q3', name: 'Jazz Night - Presale', type: 'presale', status: 'paused', currentPosition: 320, totalInQueue: 320, avgWaitTime: 8, processedPerHour: 200 },
        { id: 'q4', name: 'Comedy Gala - Waitlist', type: 'waitlist', status: 'active', currentPosition: 156, totalInQueue: 156, avgWaitTime: 0, processedPerHour: 0 },
      ])
      setWaitlist([
        { id: 'w1', customer: 'John Smith', email: 'john@example.com', event: 'Summer Festival', position: 1, joinedAt: '2024-01-01T10:00:00', status: 'waiting' },
        { id: 'w2', customer: 'Sarah Johnson', email: 'sarah@example.com', event: 'Summer Festival', position: 2, joinedAt: '2024-01-01T10:05:00', status: 'notified' },
        { id: 'w3', customer: 'Mike Davis', email: 'mike@example.com', event: 'Jazz Night', position: 1, joinedAt: '2024-01-02T14:30:00', status: 'converted' },
        { id: 'w4', customer: 'Emily Brown', email: 'emily@example.com', event: 'Comedy Gala', position: 1, joinedAt: '2024-01-03T09:15:00', status: 'waiting' },
        { id: 'w5', customer: 'Chris Wilson', email: 'chris@example.com', event: 'Summer Festival', position: 3, joinedAt: '2024-01-01T10:10:00', status: 'expired' },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const getQueueTypeColor = (type: string) => {
    switch (type) {
      case 'general': return 'bg-blue-500/20 text-blue-400'
      case 'vip': return 'bg-purple-500/20 text-purple-400'
      case 'presale': return 'bg-green-500/20 text-green-400'
      case 'waitlist': return 'bg-yellow-500/20 text-yellow-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400'
      case 'paused': return 'bg-yellow-500/20 text-yellow-400'
      case 'closed': return 'bg-red-500/20 text-red-400'
      case 'waiting': return 'bg-blue-500/20 text-blue-400'
      case 'notified': return 'bg-purple-500/20 text-purple-400'
      case 'converted': return 'bg-green-500/20 text-green-400'
      case 'expired': return 'bg-gray-500/20 text-gray-400'
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
          <h1 className="text-2xl font-bold text-white">Queue Management</h1>
          <p className="text-gray-400 mt-1">Manage virtual queues and waitlists</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + Create Queue
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            Settings
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Active Queues</p>
          <p className="text-2xl font-bold text-white">{stats.activeQueues}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">In Queues</p>
          <p className="text-2xl font-bold text-blue-400">{stats.totalInQueues.toLocaleString()}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Avg Wait Time</p>
          <p className="text-2xl font-bold text-white">{stats.avgWaitTime} min</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Waitlist Size</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.waitlistSize}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Conversion Rate</p>
          <p className="text-2xl font-bold text-green-400">{stats.conversionRate}%</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Capacity</p>
          <p className="text-2xl font-bold text-purple-400">{stats.capacityUtilization}%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit">
        {(['queues', 'waitlists', 'capacity', 'settings'] as const).map((tab) => (
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

      {/* Queues Tab */}
      {activeTab === 'queues' && (
        <div className="space-y-4">
          {queues.map((queue) => (
            <div key={queue.id} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{queue.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-xs ${getQueueTypeColor(queue.type)}`}>
                        {queue.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(queue.status)}`}>
                        {queue.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {queue.status === 'active' && (
                    <button className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-colors">
                      Pause
                    </button>
                  )}
                  {queue.status === 'paused' && (
                    <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors">
                      Resume
                    </button>
                  )}
                  <button className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                    Manage
                  </button>
                  <button className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors">
                    Close
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">In Queue</p>
                  <p className="text-white font-semibold text-lg">{queue.totalInQueue.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Avg Wait</p>
                  <p className="text-white font-semibold text-lg">{queue.avgWaitTime} min</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Processed/hr</p>
                  <p className="text-white font-semibold text-lg">{queue.processedPerHour}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">Status</p>
                  <p className={`font-semibold text-lg ${
                    queue.status === 'active' ? 'text-green-400' :
                    queue.status === 'paused' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {queue.status.charAt(0).toUpperCase() + queue.status.slice(1)}
                  </p>
                </div>
              </div>

              {/* Queue Progress */}
              <div className="mt-4">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full animate-pulse"
                    style={{ width: queue.status === 'active' ? '100%' : '0%' }}
                  />
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  {queue.status === 'active' ? 'Processing queue...' : 'Queue paused'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Waitlists Tab */}
      {activeTab === 'waitlists' && (
        <div className="space-y-4">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-gray-400 font-medium">#</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Customer</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Event</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Joined</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                  <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {waitlist.map((entry) => (
                  <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white font-medium">{entry.position}</td>
                    <td className="p-4">
                      <div>
                        <p className="text-white">{entry.customer}</p>
                        <p className="text-gray-400 text-sm">{entry.email}</p>
                      </div>
                    </td>
                    <td className="p-4 text-gray-400">{entry.event}</td>
                    <td className="p-4 text-gray-400">{new Date(entry.joinedAt).toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {entry.status === 'waiting' && (
                        <button className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors mr-2">
                          Notify
                        </button>
                      )}
                      <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Capacity Tab */}
      {activeTab === 'capacity' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Capacity Pools</h3>
            <div className="space-y-4">
              {[
                { name: 'General Admission', allocated: 2500, used: 1950, color: 'blue' },
                { name: 'VIP Section', allocated: 200, used: 156, color: 'purple' },
                { name: 'Premium Seats', allocated: 500, used: 425, color: 'green' },
                { name: 'Accessible', allocated: 50, used: 32, color: 'yellow' },
              ].map((pool, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white">{pool.name}</span>
                    <span className="text-gray-400">{pool.used} / {pool.allocated}</span>
                  </div>
                  <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-${pool.color}-500`}
                      style={{ width: `${(pool.used / pool.allocated) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Anti-Bot Protection</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">CAPTCHA Verification</p>
                  <p className="text-gray-400 text-sm">Require CAPTCHA before joining queue</p>
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
                  <p className="text-white font-medium">Rate Limiting</p>
                  <p className="text-gray-400 text-sm">Limit requests per IP address</p>
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
                  <p className="text-white font-medium">Device Fingerprinting</p>
                  <p className="text-gray-400 text-sm">Detect duplicate devices</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-green-600">
                    <div className="absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5" />
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Queue Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Max Queue Size</label>
                <input
                  type="number"
                  defaultValue={5000}
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Queue Timeout (minutes)</label>
                <input
                  type="number"
                  defaultValue={30}
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Processing Rate (per minute)</label>
                <input
                  type="number"
                  defaultValue={100}
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Waitlist Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Notification Expiry (hours)</label>
                <input
                  type="number"
                  defaultValue={24}
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Auto-notify batch size</label>
                <input
                  type="number"
                  defaultValue={50}
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
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
