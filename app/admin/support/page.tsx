'use client'

import { useState, useEffect } from 'react'
import { usePromoterAccess } from '@/lib/hooks/usePromoterAccess'
import { HelpDeskService, Ticket, SLAPolicy, CannedResponse } from '@/lib/services/helpDeskService'

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'queue' | 'metrics' | 'settings'>('tickets')
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [slaPolicies, setSlaPolicies] = useState<SLAPolicy[]>([])
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { isAdmin, effectivePromoterId, showAll } = usePromoterAccess()

  useEffect(() => {
    loadData()
  }, [effectivePromoterId, showAll])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load tickets - filter by promoter if not admin with 'all' selected
      const ticketFilters = showAll ? {} : { promoterId: effectivePromoterId }
      const loadedTickets = await HelpDeskService.getTickets(
        showAll ? undefined : effectivePromoterId,
        {}
      )
      setTickets(loadedTickets)

      // Load SLA policies
      if (effectivePromoterId && effectivePromoterId !== 'all') {
        const policies = await HelpDeskService.getSLAPolicies(effectivePromoterId)
        setSlaPolicies(policies)

        const responses = await HelpDeskService.getCannedResponses({
          promoterId: effectivePromoterId,
        })
        setCannedResponses(responses)
      }
    } catch (error) {
      console.error('Error loading support data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate stats from real data
  const stats = {
    openTickets: tickets.filter(t => t.status === 'open' || t.status === 'new').length,
    pendingTickets: tickets.filter(t => t.status === 'pending' || t.status === 'on_hold').length,
    resolvedTickets: tickets.filter(t => t.status === 'resolved').length,
    closedTickets: tickets.filter(t => t.status === 'closed').length,
    urgentTickets: tickets.filter(t => t.priority === 'urgent').length,
    highPriorityTickets: tickets.filter(t => t.priority === 'high').length,
    totalTickets: tickets.length,
    slaBreached: tickets.filter(t => t.sla?.firstResponseBreached || t.sla?.resolutionBreached).length,
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'open': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'on_hold': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'closed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400'
      case 'high': return 'bg-orange-500/20 text-orange-400'
      case 'normal': return 'bg-yellow-500/20 text-yellow-400'
      case 'low': return 'bg-gray-500/20 text-gray-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getSlaColor = (ticket: Ticket) => {
    if (ticket.sla?.firstResponseBreached || ticket.sla?.resolutionBreached) {
      return 'text-red-400'
    }
    if (ticket.sla?.nextBreachAt && new Date(ticket.sla.nextBreachAt) < new Date(Date.now() + 60 * 60 * 1000)) {
      return 'text-yellow-400'
    }
    return 'text-green-400'
  }

  const getSlaStatus = (ticket: Ticket) => {
    if (ticket.sla?.firstResponseBreached || ticket.sla?.resolutionBreached) {
      return '✕ Breached'
    }
    if (ticket.sla?.nextBreachAt && new Date(ticket.sla.nextBreachAt) < new Date(Date.now() + 60 * 60 * 1000)) {
      return '⚠ At Risk'
    }
    return '✓ On Track'
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.number.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || ticket.status === selectedStatus
    const matchesPriority = selectedPriority === 'all' || ticket.priority === selectedPriority
    return matchesSearch && matchesStatus && matchesPriority
  })

  // Group tickets by assignee for queue view
  const unassignedTickets = tickets.filter(t => !t.assignee && t.status !== 'closed' && t.status !== 'resolved')
  const assigneeGroups = tickets.reduce((acc, ticket) => {
    if (ticket.assignee && ticket.status !== 'closed' && ticket.status !== 'resolved') {
      const key = ticket.assignee.id
      if (!acc[key]) {
        acc[key] = { assignee: ticket.assignee, tickets: [] }
      }
      acc[key].tickets.push(ticket)
    }
    return acc
  }, {} as Record<string, { assignee: NonNullable<Ticket['assignee']>; tickets: Ticket[] }>)

  // Category distribution for metrics
  const categoryDistribution = tickets.reduce((acc, ticket) => {
    acc[ticket.category] = (acc[ticket.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const categoryStats = Object.entries(categoryDistribution)
    .map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / tickets.length) * 100) || 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Help Desk</h1>
          <p className="text-slate-600 dark:text-gray-400 mt-1">
            {showAll ? 'Manage all support tickets' : 'Manage your support tickets and customer inquiries'}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + New Ticket
          </button>
          <button className="px-4 py-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-lg transition-colors">
            Export
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
          <p className="text-slate-500 dark:text-gray-400 text-xs">Total</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalTickets}</p>
        </div>
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
          <p className="text-slate-500 dark:text-gray-400 text-xs">Open</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.openTickets}</p>
        </div>
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
          <p className="text-slate-500 dark:text-gray-400 text-xs">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingTickets}</p>
        </div>
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
          <p className="text-slate-500 dark:text-gray-400 text-xs">Resolved</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.resolvedTickets}</p>
        </div>
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
          <p className="text-slate-500 dark:text-gray-400 text-xs">Urgent</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.urgentTickets}</p>
        </div>
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
          <p className="text-slate-500 dark:text-gray-400 text-xs">High Priority</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.highPriorityTickets}</p>
        </div>
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
          <p className="text-slate-500 dark:text-gray-400 text-xs">SLA Breached</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.slaBreached}</p>
        </div>
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
          <p className="text-slate-500 dark:text-gray-400 text-xs">Closed</p>
          <p className="text-2xl font-bold text-slate-600 dark:text-gray-400">{stats.closedTickets}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-lg w-fit">
        {(['tickets', 'queue', 'metrics', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'bg-purple-600 text-white'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10'
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
                className="w-full px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="on_hold">On Hold</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Tickets List */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Ticket</th>
                  <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Customer</th>
                  <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Status</th>
                  <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Priority</th>
                  <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Category</th>
                  <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Assignee</th>
                  <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">SLA</th>
                  <th className="text-right p-4 text-slate-500 dark:text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="p-4">
                        <div>
                          <p className="text-slate-900 dark:text-white font-medium">{ticket.number}</p>
                          <p className="text-slate-500 dark:text-gray-400 text-sm truncate max-w-[200px]">{ticket.subject}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-slate-900 dark:text-white">{ticket.customer.name}</p>
                          <p className="text-slate-500 dark:text-gray-400 text-sm">{ticket.customer.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-gray-400">{ticket.category}</td>
                      <td className="p-4 text-slate-600 dark:text-gray-400">{ticket.assignee?.name || 'Unassigned'}</td>
                      <td className="p-4">
                        <span className={`text-sm ${getSlaColor(ticket)}`}>
                          {getSlaStatus(ticket)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 dark:text-gray-400">
                      {tickets.length === 0 ? 'No tickets found' : 'No tickets match your filters'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Queue Tab */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Unassigned Queue */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-white/10">
            <div className="p-4 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-slate-900 dark:text-white font-semibold">Unassigned</h3>
              <p className="text-slate-500 dark:text-gray-400 text-sm">{unassignedTickets.length} tickets waiting</p>
            </div>
            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
              {unassignedTickets.length > 0 ? (
                unassignedTickets.map(ticket => (
                  <div key={ticket.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-900 dark:text-white font-medium text-sm">{ticket.number}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span>
                    </div>
                    <p className="text-slate-500 dark:text-gray-400 text-sm truncate">{ticket.subject}</p>
                    <div className="flex justify-between mt-2">
                      <span className="text-slate-400 dark:text-gray-500 text-xs">{ticket.customer.name}</span>
                      <button className="text-purple-600 dark:text-purple-400 text-xs hover:text-purple-500">Assign</button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 dark:text-gray-500 text-sm text-center py-4">No unassigned tickets</p>
              )}
            </div>
          </div>

          {/* Agent Queues */}
          {Object.values(assigneeGroups).slice(0, 2).map(({ assignee, tickets: agentTickets }) => (
            <div key={assignee.id} className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-white/10">
              <div className="p-4 border-b border-slate-200 dark:border-white/10">
                <h3 className="text-slate-900 dark:text-white font-semibold">{assignee.name}</h3>
                <p className="text-slate-500 dark:text-gray-400 text-sm">{agentTickets.length} active tickets</p>
              </div>
              <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                {agentTickets.map(ticket => (
                  <div key={ticket.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-900 dark:text-white font-medium text-sm">{ticket.number}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span>
                    </div>
                    <p className="text-slate-500 dark:text-gray-400 text-sm truncate">{ticket.subject}</p>
                    <div className="flex justify-between mt-2">
                      <span className={`text-xs ${getSlaColor(ticket)}`}>{getSlaStatus(ticket)}</span>
                      <span className={`text-xs ${getStatusColor(ticket.status)} px-1 rounded`}>{ticket.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Ticket Status Distribution</h3>
            <div className="space-y-3">
              {[
                { status: 'Open', count: stats.openTickets, color: 'bg-blue-500' },
                { status: 'Pending', count: stats.pendingTickets, color: 'bg-yellow-500' },
                { status: 'Resolved', count: stats.resolvedTickets, color: 'bg-green-500' },
                { status: 'Closed', count: stats.closedTickets, color: 'bg-gray-500' },
              ].map(item => (
                <div key={item.status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-gray-400">{item.status}</span>
                    <span className="text-slate-900 dark:text-white">{item.count} ({stats.totalTickets > 0 ? Math.round((item.count / stats.totalTickets) * 100) : 0}%)</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${stats.totalTickets > 0 ? (item.count / stats.totalTickets) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Category Distribution</h3>
            <div className="space-y-3">
              {categoryStats.length > 0 ? (
                categoryStats.map(item => (
                  <div key={item.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 dark:text-gray-400">{item.category}</span>
                      <span className="text-slate-900 dark:text-white">{item.count} ({item.percentage}%)</span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${item.percentage}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 dark:text-gray-400 text-center py-4">No ticket data available</p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Priority Breakdown</h3>
            <div className="space-y-3">
              {[
                { priority: 'Urgent', count: stats.urgentTickets, color: 'bg-red-500' },
                { priority: 'High', count: stats.highPriorityTickets, color: 'bg-orange-500' },
                { priority: 'Normal', count: tickets.filter(t => t.priority === 'normal').length, color: 'bg-yellow-500' },
                { priority: 'Low', count: tickets.filter(t => t.priority === 'low').length, color: 'bg-gray-500' },
              ].map(item => (
                <div key={item.priority}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-gray-400">{item.priority}</span>
                    <span className="text-slate-900 dark:text-white">{item.count}</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${stats.totalTickets > 0 ? (item.count / stats.totalTickets) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">SLA Compliance</h3>
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                  {stats.totalTickets > 0 ? Math.round(((stats.totalTickets - stats.slaBreached) / stats.totalTickets) * 100) : 100}%
                </p>
                <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">Compliance Rate</p>
                <p className="text-red-500 text-sm mt-2">{stats.slaBreached} tickets breached SLA</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">SLA Policies</h3>
            <div className="space-y-3">
              {slaPolicies.length > 0 ? (
                slaPolicies.map(policy => (
                  <div key={policy.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                    <div>
                      <span className="text-slate-900 dark:text-white font-medium">{policy.name}</span>
                      {policy.isDefault && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">Default</span>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-slate-500 dark:text-gray-400">
                        Status: {policy.status}
                      </span>
                      {isAdmin && (
                        <button className="text-purple-600 dark:text-purple-400 text-sm hover:text-purple-500">Edit</button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500 dark:text-gray-400 mb-4">No SLA policies configured</p>
                  {isAdmin && (
                    <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                      Create SLA Policy
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Canned Responses</h3>
            <div className="space-y-3">
              {cannedResponses.length > 0 ? (
                cannedResponses.map(response => (
                  <div key={response.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                    <div>
                      <span className="text-slate-900 dark:text-white">{response.name}</span>
                      <p className="text-slate-500 dark:text-gray-400 text-sm truncate max-w-xs">{response.category}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-400 dark:text-gray-500 text-sm">{response.usageCount || 0} uses</span>
                      <button className="text-purple-600 dark:text-purple-400 text-sm hover:text-purple-500">Edit</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500 dark:text-gray-400 mb-4">No canned responses yet</p>
                </div>
              )}
            </div>
            <button className="w-full mt-4 py-2 border border-dashed border-slate-300 dark:border-white/20 rounded-lg text-slate-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-white hover:border-purple-500 transition-colors">
              + Add Response
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
