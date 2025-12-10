'use client'

import { useState, useEffect } from 'react'

interface Ticket {
  id: string
  subject: string
  customer: { name: string; email: string }
  status: 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string
  assignee?: { name: string }
  createdAt: string
  lastUpdated: string
  slaStatus: 'on_track' | 'at_risk' | 'breached'
}

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'queue' | 'metrics' | 'settings'>('tickets')
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const stats = {
    openTickets: 24,
    pendingTickets: 18,
    avgResponseTime: '2.5 hrs',
    avgResolutionTime: '18 hrs',
    customerSatisfaction: 94,
    slaCompliance: 96,
    ticketsToday: 12,
    resolvedToday: 8,
  }

  useEffect(() => {
    setTimeout(() => {
      setTickets([
        { id: 'TKT-1001', subject: 'Unable to download tickets', customer: { name: 'John Smith', email: 'john@example.com' }, status: 'open', priority: 'high', category: 'Technical', assignee: { name: 'Support Agent 1' }, createdAt: '2024-01-08T10:30:00', lastUpdated: '2024-01-08T11:45:00', slaStatus: 'on_track' },
        { id: 'TKT-1002', subject: 'Refund request for cancelled event', customer: { name: 'Sarah Johnson', email: 'sarah@example.com' }, status: 'pending', priority: 'medium', category: 'Billing', assignee: { name: 'Support Agent 2' }, createdAt: '2024-01-08T09:15:00', lastUpdated: '2024-01-08T10:30:00', slaStatus: 'at_risk' },
        { id: 'TKT-1003', subject: 'VIP upgrade inquiry', customer: { name: 'Mike Davis', email: 'mike@example.com' }, status: 'open', priority: 'low', category: 'Sales', createdAt: '2024-01-08T08:00:00', lastUpdated: '2024-01-08T08:00:00', slaStatus: 'on_track' },
        { id: 'TKT-1004', subject: 'Group booking assistance needed', customer: { name: 'Emily Brown', email: 'emily@example.com' }, status: 'resolved', priority: 'medium', category: 'Booking', assignee: { name: 'Support Agent 1' }, createdAt: '2024-01-07T14:20:00', lastUpdated: '2024-01-08T09:00:00', slaStatus: 'on_track' },
        { id: 'TKT-1005', subject: 'Accessibility requirements', customer: { name: 'Chris Wilson', email: 'chris@example.com' }, status: 'open', priority: 'urgent', category: 'Accessibility', createdAt: '2024-01-08T11:00:00', lastUpdated: '2024-01-08T11:00:00', slaStatus: 'breached' },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'closed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400'
      case 'high': return 'bg-orange-500/20 text-orange-400'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400'
      case 'low': return 'bg-gray-500/20 text-gray-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getSlaColor = (slaStatus: string) => {
    switch (slaStatus) {
      case 'on_track': return 'text-green-400'
      case 'at_risk': return 'text-yellow-400'
      case 'breached': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || ticket.status === selectedStatus
    const matchesPriority = selectedPriority === 'all' || ticket.priority === selectedPriority
    return matchesSearch && matchesStatus && matchesPriority
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
          <h1 className="text-2xl font-bold text-white">Help Desk</h1>
          <p className="text-gray-400 mt-1">Manage support tickets and customer inquiries</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + New Ticket
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            Export
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Open</p>
          <p className="text-2xl font-bold text-white">{stats.openTickets}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Pending</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.pendingTickets}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Avg Response</p>
          <p className="text-2xl font-bold text-white">{stats.avgResponseTime}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Avg Resolution</p>
          <p className="text-2xl font-bold text-white">{stats.avgResolutionTime}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">CSAT</p>
          <p className="text-2xl font-bold text-green-400">{stats.customerSatisfaction}%</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">SLA</p>
          <p className="text-2xl font-bold text-green-400">{stats.slaCompliance}%</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Today</p>
          <p className="text-2xl font-bold text-white">{stats.ticketsToday}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Resolved Today</p>
          <p className="text-2xl font-bold text-green-400">{stats.resolvedToday}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit">
        {(['tickets', 'queue', 'metrics', 'settings'] as const).map((tab) => (
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

      {/* Tickets Tab */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Tickets List */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-gray-400 font-medium">Ticket</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Customer</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Priority</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Category</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Assignee</th>
                  <th className="text-left p-4 text-gray-400 font-medium">SLA</th>
                  <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4">
                      <div>
                        <p className="text-white font-medium">{ticket.id}</p>
                        <p className="text-gray-400 text-sm truncate max-w-[200px]">{ticket.subject}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-white">{ticket.customer.name}</p>
                        <p className="text-gray-400 text-sm">{ticket.customer.email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400">{ticket.category}</td>
                    <td className="p-4 text-gray-400">{ticket.assignee?.name || 'Unassigned'}</td>
                    <td className="p-4">
                      <span className={`text-sm ${getSlaColor(ticket.slaStatus)}`}>
                        {ticket.slaStatus === 'on_track' ? '✓ On Track' : ticket.slaStatus === 'at_risk' ? '⚠ At Risk' : '✕ Breached'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Queue Tab */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Unassigned Queue */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-semibold">Unassigned</h3>
              <p className="text-gray-400 text-sm">3 tickets waiting</p>
            </div>
            <div className="p-4 space-y-3">
              {tickets.filter(t => !t.assignee).map(ticket => (
                <div key={ticket.id} className="p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium text-sm">{ticket.id}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span>
                  </div>
                  <p className="text-gray-400 text-sm truncate">{ticket.subject}</p>
                  <div className="flex justify-between mt-2">
                    <span className="text-gray-500 text-xs">{ticket.customer.name}</span>
                    <button className="text-purple-400 text-xs hover:text-purple-300">Assign</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Agent 1 Queue */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-semibold">Support Agent 1</h3>
              <p className="text-gray-400 text-sm">2 active tickets</p>
            </div>
            <div className="p-4 space-y-3">
              {tickets.filter(t => t.assignee?.name === 'Support Agent 1').map(ticket => (
                <div key={ticket.id} className="p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium text-sm">{ticket.id}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span>
                  </div>
                  <p className="text-gray-400 text-sm truncate">{ticket.subject}</p>
                  <div className="flex justify-between mt-2">
                    <span className={`text-xs ${getSlaColor(ticket.slaStatus)}`}>{ticket.slaStatus.replace('_', ' ')}</span>
                    <span className={`text-xs ${getStatusColor(ticket.status)} px-1 rounded`}>{ticket.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Agent 2 Queue */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-semibold">Support Agent 2</h3>
              <p className="text-gray-400 text-sm">1 active ticket</p>
            </div>
            <div className="p-4 space-y-3">
              {tickets.filter(t => t.assignee?.name === 'Support Agent 2').map(ticket => (
                <div key={ticket.id} className="p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium text-sm">{ticket.id}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span>
                  </div>
                  <p className="text-gray-400 text-sm truncate">{ticket.subject}</p>
                  <div className="flex justify-between mt-2">
                    <span className={`text-xs ${getSlaColor(ticket.slaStatus)}`}>{ticket.slaStatus.replace('_', ' ')}</span>
                    <span className={`text-xs ${getStatusColor(ticket.status)} px-1 rounded`}>{ticket.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Response Time Trends</h3>
            <div className="h-48 flex items-end gap-2">
              {[2.1, 2.8, 2.4, 3.2, 2.5, 2.0, 2.3].map((hours, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-purple-500 rounded-t"
                    style={{ height: `${(hours / 4) * 100}%` }}
                  />
                  <span className="text-gray-500 text-xs mt-2">Day {i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Ticket Volume</h3>
            <div className="h-48 flex items-end gap-2">
              {[15, 22, 18, 25, 20, 12, 16].map((count, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-blue-500 rounded-t"
                    style={{ height: `${(count / 30) * 100}%` }}
                  />
                  <span className="text-gray-500 text-xs mt-2">Day {i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Category Distribution</h3>
            <div className="space-y-3">
              {[
                { category: 'Technical', count: 35, percentage: 28 },
                { category: 'Billing', count: 28, percentage: 22 },
                { category: 'Booking', count: 25, percentage: 20 },
                { category: 'Sales', count: 20, percentage: 16 },
                { category: 'Other', count: 17, percentage: 14 },
              ].map(item => (
                <div key={item.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">{item.category}</span>
                    <span className="text-white">{item.count} ({item.percentage}%)</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Agent Performance</h3>
            <div className="space-y-4">
              {[
                { name: 'Support Agent 1', resolved: 45, satisfaction: 96, avgTime: '1.8 hrs' },
                { name: 'Support Agent 2', resolved: 38, satisfaction: 94, avgTime: '2.2 hrs' },
                { name: 'Support Agent 3', resolved: 42, satisfaction: 92, avgTime: '2.0 hrs' },
              ].map(agent => (
                <div key={agent.name} className="p-3 bg-white/5 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">{agent.name}</span>
                    <span className="text-green-400 text-sm">{agent.satisfaction}% CSAT</span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-400">{agent.resolved} resolved</span>
                    <span className="text-gray-400">{agent.avgTime} avg</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">SLA Policies</h3>
            <div className="space-y-3">
              {[
                { priority: 'Urgent', firstResponse: '15 min', resolution: '4 hrs' },
                { priority: 'High', firstResponse: '1 hr', resolution: '8 hrs' },
                { priority: 'Medium', firstResponse: '4 hrs', resolution: '24 hrs' },
                { priority: 'Low', firstResponse: '8 hrs', resolution: '48 hrs' },
              ].map(sla => (
                <div key={sla.priority} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span className={`font-medium ${getPriorityColor(sla.priority.toLowerCase())} px-2 py-0.5 rounded`}>{sla.priority}</span>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-gray-400">First Response:</span>
                      <span className="text-white ml-2">{sla.firstResponse}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Resolution:</span>
                      <span className="text-white ml-2">{sla.resolution}</span>
                    </div>
                  </div>
                  <button className="text-purple-400 text-sm hover:text-purple-300">Edit</button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Canned Responses</h3>
            <div className="space-y-3">
              {[
                { name: 'Ticket Received', usage: 245 },
                { name: 'Refund Processing', usage: 128 },
                { name: 'Event Cancelled', usage: 89 },
                { name: 'Technical Support', usage: 156 },
              ].map(response => (
                <div key={response.name} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-white">{response.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400 text-sm">{response.usage} uses</span>
                    <button className="text-purple-400 text-sm hover:text-purple-300">Edit</button>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-2 border border-dashed border-white/20 rounded-lg text-gray-400 hover:text-white hover:border-purple-500 transition-colors">
              + Add Response
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
