'use client'

import { useState, useEffect } from 'react'

interface Automation {
  id: string
  name: string
  trigger: string
  actions: string[]
  status: 'active' | 'paused' | 'draft'
  executions: number
  lastRun?: string
  successRate: number
}

export default function AutomationPage() {
  const [activeTab, setActiveTab] = useState<'workflows' | 'triggers' | 'logs'>('workflows')
  const [loading, setLoading] = useState(true)
  const [automations, setAutomations] = useState<Automation[]>([])

  const stats = {
    totalWorkflows: 24,
    activeWorkflows: 18,
    executionsToday: 1250,
    successRate: 98.5,
    timeSaved: 45,
    errorsToday: 8,
  }

  useEffect(() => {
    setTimeout(() => {
      setAutomations([
        { id: '1', name: 'Send Confirmation Email', trigger: 'Order Completed', actions: ['Send Email', 'Create Ticket PDF', 'Update CRM'], status: 'active', executions: 15420, lastRun: '2024-01-08T11:30:00', successRate: 99.8 },
        { id: '2', name: 'Abandoned Cart Recovery', trigger: 'Cart Abandoned (1 hour)', actions: ['Send Reminder Email', 'Apply Discount Code'], status: 'active', executions: 2450, lastRun: '2024-01-08T11:25:00', successRate: 97.2 },
        { id: '3', name: 'Event Reminder', trigger: '24 Hours Before Event', actions: ['Send Push Notification', 'Send SMS', 'Send Email'], status: 'active', executions: 8920, lastRun: '2024-01-08T10:00:00', successRate: 99.5 },
        { id: '4', name: 'Low Inventory Alert', trigger: 'Tickets < 10% Remaining', actions: ['Send Slack Notification', 'Update Dashboard'], status: 'active', executions: 156, lastRun: '2024-01-07T18:00:00', successRate: 100 },
        { id: '5', name: 'Refund Processing', trigger: 'Refund Requested', actions: ['Validate Request', 'Process Refund', 'Send Confirmation'], status: 'paused', executions: 892, lastRun: '2024-01-06T14:00:00', successRate: 95.8 },
        { id: '6', name: 'VIP Welcome', trigger: 'VIP Tier Reached', actions: ['Send Welcome Package', 'Assign Account Manager'], status: 'draft', executions: 0, successRate: 0 },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400'
      case 'paused': return 'bg-yellow-500/20 text-yellow-400'
      case 'draft': return 'bg-gray-500/20 text-gray-400'
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
          <h1 className="text-2xl font-bold text-white">Automation Center</h1>
          <p className="text-gray-400 mt-1">Create and manage automated workflows</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + Create Workflow
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            Templates
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Total Workflows</p>
          <p className="text-2xl font-bold text-white">{stats.totalWorkflows}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Active</p>
          <p className="text-2xl font-bold text-green-400">{stats.activeWorkflows}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Executions Today</p>
          <p className="text-2xl font-bold text-white">{stats.executionsToday.toLocaleString()}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Success Rate</p>
          <p className="text-2xl font-bold text-green-400">{stats.successRate}%</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Time Saved</p>
          <p className="text-2xl font-bold text-purple-400">{stats.timeSaved}h</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Errors Today</p>
          <p className="text-2xl font-bold text-red-400">{stats.errorsToday}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit">
        {(['workflows', 'triggers', 'logs'] as const).map((tab) => (
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

      {/* Workflows Tab */}
      {activeTab === 'workflows' && (
        <div className="space-y-4">
          {automations.map((automation) => (
            <div key={automation.id} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{automation.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(automation.status)}`}>
                      {automation.status}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">Trigger: {automation.trigger}</p>
                </div>
                <div className="flex gap-2">
                  {automation.status === 'active' && (
                    <button className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-colors">
                      Pause
                    </button>
                  )}
                  {automation.status === 'paused' && (
                    <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors">
                      Resume
                    </button>
                  )}
                  {automation.status === 'draft' && (
                    <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors">
                      Activate
                    </button>
                  )}
                  <button className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                    Edit
                  </button>
                  <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                    Test
                  </button>
                </div>
              </div>

              {/* Actions Flow */}
              <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                <div className="px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm whitespace-nowrap">
                  🎯 {automation.trigger}
                </div>
                <span className="text-gray-500">→</span>
                {automation.actions.map((action, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm whitespace-nowrap">
                      ⚡ {action}
                    </div>
                    {i < automation.actions.length - 1 && <span className="text-gray-500">→</span>}
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-gray-400 text-xs">Total Executions</p>
                  <p className="text-white font-semibold">{automation.executions.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Success Rate</p>
                  <p className={`font-semibold ${automation.successRate >= 98 ? 'text-green-400' : automation.successRate >= 95 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {automation.successRate}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Last Run</p>
                  <p className="text-white font-semibold">
                    {automation.lastRun ? new Date(automation.lastRun).toLocaleString() : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Status</p>
                  <p className={`font-semibold ${
                    automation.status === 'active' ? 'text-green-400' :
                    automation.status === 'paused' ? 'text-yellow-400' : 'text-gray-400'
                  }`}>
                    {automation.status.charAt(0).toUpperCase() + automation.status.slice(1)}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Create New */}
          <button className="w-full py-6 border-2 border-dashed border-white/20 rounded-xl text-gray-400 hover:text-white hover:border-purple-500 transition-colors">
            + Create New Workflow
          </button>
        </div>
      )}

      {/* Triggers Tab */}
      {activeTab === 'triggers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { category: 'Orders', triggers: ['Order Created', 'Order Completed', 'Order Cancelled', 'Refund Requested'] },
            { category: 'Customers', triggers: ['Customer Signed Up', 'Customer Updated', 'VIP Tier Reached', 'Birthday'] },
            { category: 'Events', triggers: ['Event Published', 'Event Sold Out', 'Low Inventory', '24 Hours Before'] },
            { category: 'Marketing', triggers: ['Cart Abandoned', 'Email Opened', 'Link Clicked', 'Unsubscribed'] },
            { category: 'Support', triggers: ['Ticket Created', 'Ticket Resolved', 'SLA Breach', 'Feedback Received'] },
            { category: 'Scheduled', triggers: ['Daily at Time', 'Weekly', 'Monthly', 'Custom Schedule'] },
          ].map((group, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">{group.category}</h3>
              <div className="space-y-2">
                {group.triggers.map((trigger, j) => (
                  <button key={j} className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-sm transition-colors">
                    {trigger}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-gray-400 font-medium">Workflow</th>
                <th className="text-left p-4 text-gray-400 font-medium">Trigger</th>
                <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                <th className="text-left p-4 text-gray-400 font-medium">Duration</th>
                <th className="text-left p-4 text-gray-400 font-medium">Time</th>
                <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { workflow: 'Send Confirmation Email', trigger: 'Order #12345', status: 'success', duration: '1.2s', time: '2 min ago' },
                { workflow: 'Event Reminder', trigger: 'Summer Festival', status: 'success', duration: '2.8s', time: '5 min ago' },
                { workflow: 'Abandoned Cart Recovery', trigger: 'Cart #789', status: 'success', duration: '0.8s', time: '12 min ago' },
                { workflow: 'Low Inventory Alert', trigger: 'Jazz Night', status: 'success', duration: '0.3s', time: '1 hour ago' },
                { workflow: 'Send Confirmation Email', trigger: 'Order #12344', status: 'error', duration: '5.2s', time: '2 hours ago' },
              ].map((log, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4 text-white">{log.workflow}</td>
                  <td className="p-4 text-gray-400">{log.trigger}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      log.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400">{log.duration}</td>
                  <td className="p-4 text-gray-400">{log.time}</td>
                  <td className="p-4 text-right">
                    <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
