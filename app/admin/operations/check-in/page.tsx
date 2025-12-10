'use client'

import { useState, useEffect } from 'react'

interface CheckInStats {
  totalExpected: number
  checkedIn: number
  pending: number
  noShow: number
  vip: number
}

interface RecentCheckIn {
  id: string
  name: string
  ticketType: string
  time: string
  gate: string
  status: 'success' | 'vip' | 'issue'
}

export default function CheckInPage() {
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState('summer-festival')
  const [stats, setStats] = useState<CheckInStats>({ totalExpected: 0, checkedIn: 0, pending: 0, noShow: 0, vip: 0 })
  const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckIn[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const events = [
    { id: 'summer-festival', name: 'Summer Music Festival', date: '2024-01-15' },
    { id: 'jazz-night', name: 'Jazz Night Live', date: '2024-01-20' },
    { id: 'comedy-gala', name: 'Comedy Gala 2024', date: '2024-01-25' },
  ]

  const gates = [
    { id: 'A', name: 'Gate A - Main Entrance', checkedIn: 450, capacity: 600 },
    { id: 'B', name: 'Gate B - VIP Entrance', checkedIn: 85, capacity: 100 },
    { id: 'C', name: 'Gate C - Staff/Media', checkedIn: 45, capacity: 50 },
    { id: 'D', name: 'Gate D - Accessible', checkedIn: 32, capacity: 50 },
  ]

  useEffect(() => {
    setTimeout(() => {
      setStats({
        totalExpected: 2500,
        checkedIn: 1847,
        pending: 583,
        noShow: 70,
        vip: 156,
      })
      setRecentCheckIns([
        { id: 'CHK001', name: 'John Smith', ticketType: 'VIP', time: '2 min ago', gate: 'Gate B', status: 'vip' },
        { id: 'CHK002', name: 'Sarah Johnson', ticketType: 'General', time: '3 min ago', gate: 'Gate A', status: 'success' },
        { id: 'CHK003', name: 'Mike Davis', ticketType: 'General', time: '5 min ago', gate: 'Gate A', status: 'success' },
        { id: 'CHK004', name: 'Emily Brown', ticketType: 'Premium', time: '6 min ago', gate: 'Gate A', status: 'success' },
        { id: 'CHK005', name: 'Chris Wilson', ticketType: 'General', time: '8 min ago', gate: 'Gate D', status: 'issue' },
      ])
      setLoading(false)
    }, 500)
  }, [selectedEvent])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✓'
      case 'vip': return '⭐'
      case 'issue': return '⚠️'
      default: return '✓'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-400'
      case 'vip': return 'text-yellow-400'
      case 'issue': return 'text-red-400'
      default: return 'text-gray-400'
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
          <h1 className="text-2xl font-bold text-white">Check-In Management</h1>
          <p className="text-gray-400 mt-1">Real-time attendance tracking and entry management</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {events.map(event => (
              <option key={event.id} value={event.id}>{event.name}</option>
            ))}
          </select>
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            Manual Check-In
          </button>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-xl rounded-xl p-6 border border-blue-500/20">
          <p className="text-blue-400 text-sm font-medium">Expected</p>
          <p className="text-3xl font-bold text-white mt-2">{stats.totalExpected.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-xl rounded-xl p-6 border border-green-500/20">
          <p className="text-green-400 text-sm font-medium">Checked In</p>
          <p className="text-3xl font-bold text-white mt-2">{stats.checkedIn.toLocaleString()}</p>
          <p className="text-green-400 text-sm mt-1">{((stats.checkedIn / stats.totalExpected) * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 backdrop-blur-xl rounded-xl p-6 border border-yellow-500/20">
          <p className="text-yellow-400 text-sm font-medium">Pending</p>
          <p className="text-3xl font-bold text-white mt-2">{stats.pending.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-xl rounded-xl p-6 border border-purple-500/20">
          <p className="text-purple-400 text-sm font-medium">VIP</p>
          <p className="text-3xl font-bold text-white mt-2">{stats.vip}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 backdrop-blur-xl rounded-xl p-6 border border-red-500/20">
          <p className="text-red-400 text-sm font-medium">No-Show</p>
          <p className="text-3xl font-bold text-white mt-2">{stats.noShow}</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gate Status */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Gate Status</h3>
          <div className="space-y-4">
            {gates.map(gate => (
              <div key={gate.id} className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{gate.name}</span>
                  <span className="text-gray-400 text-sm">
                    {gate.checkedIn} / {gate.capacity}
                  </span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (gate.checkedIn / gate.capacity) > 0.9 ? 'bg-red-500' :
                      (gate.checkedIn / gate.capacity) > 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${(gate.checkedIn / gate.capacity) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className={`${
                    (gate.checkedIn / gate.capacity) > 0.9 ? 'text-red-400' :
                    (gate.checkedIn / gate.capacity) > 0.7 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {((gate.checkedIn / gate.capacity) * 100).toFixed(0)}% capacity
                  </span>
                  <span className="text-gray-400">{gate.capacity - gate.checkedIn} remaining</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Check-Ins */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Check-Ins</h3>
          <div className="space-y-3">
            {recentCheckIns.map(checkIn => (
              <div key={checkIn.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <span className={`text-xl ${getStatusColor(checkIn.status)}`}>
                  {getStatusIcon(checkIn.status)}
                </span>
                <div className="flex-1">
                  <p className="text-white font-medium">{checkIn.name}</p>
                  <p className="text-gray-400 text-sm">{checkIn.ticketType} - {checkIn.gate}</p>
                </div>
                <span className="text-gray-500 text-sm">{checkIn.time}</span>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
            View All Check-Ins
          </button>
        </div>
      </div>

      {/* Quick Check-In */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Check-In</h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Scan barcode or enter ticket ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
            />
          </div>
          <button className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
            Check In
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <button className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors text-sm">
            📷 Scan QR Code
          </button>
          <button className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors text-sm">
            🔍 Search by Name
          </button>
          <button className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors text-sm">
            📧 Search by Email
          </button>
          <button className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors text-sm">
            📋 Bulk Check-In
          </button>
        </div>
      </div>

      {/* Hourly Check-In Rate */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Check-In Rate (Today)</h3>
        <div className="h-32 flex items-end gap-1">
          {[45, 120, 280, 450, 380, 320, 180, 95, 42].map((count, i) => {
            const hour = 14 + i
            return (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t transition-all hover:from-green-500 hover:to-green-300"
                  style={{ height: `${(count / 500) * 100}%` }}
                  title={`${count} check-ins`}
                />
                <span className="text-gray-500 text-xs mt-2">{hour}:00</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
