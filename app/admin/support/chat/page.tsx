'use client'

import { useState, useEffect } from 'react'

interface ChatSession {
  id: string
  customer: { name: string; email: string }
  status: 'waiting' | 'active' | 'ended'
  agent?: string
  startedAt: string
  lastMessage: string
  messages: number
  rating?: number
}

export default function LiveChatPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'queue' | 'history' | 'settings'>('active')
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)

  const stats = {
    activeChats: 8,
    inQueue: 3,
    avgWaitTime: 45,
    avgChatDuration: 8,
    satisfaction: 92,
    chatsTod: 156,
  }

  useEffect(() => {
    setTimeout(() => {
      setSessions([
        { id: 'chat1', customer: { name: 'John Smith', email: 'john@example.com' }, status: 'active', agent: 'Sarah A.', startedAt: '2024-01-08T11:30:00', lastMessage: 'I need help with my order', messages: 5, rating: undefined },
        { id: 'chat2', customer: { name: 'Emily Brown', email: 'emily@example.com' }, status: 'active', agent: 'Mike D.', startedAt: '2024-01-08T11:25:00', lastMessage: 'Thank you!', messages: 12, rating: undefined },
        { id: 'chat3', customer: { name: 'Alex Rivera', email: 'alex@example.com' }, status: 'waiting', startedAt: '2024-01-08T11:32:00', lastMessage: 'Hello?', messages: 1, rating: undefined },
        { id: 'chat4', customer: { name: 'Jordan Lee', email: 'jordan@example.com' }, status: 'waiting', startedAt: '2024-01-08T11:33:00', lastMessage: 'Need help with VIP tickets', messages: 1, rating: undefined },
        { id: 'chat5', customer: { name: 'Chris Wilson', email: 'chris@example.com' }, status: 'ended', agent: 'Sarah A.', startedAt: '2024-01-08T10:00:00', lastMessage: 'Thanks for the help!', messages: 18, rating: 5 },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400'
      case 'waiting': return 'bg-yellow-500/20 text-yellow-400'
      case 'ended': return 'bg-gray-500/20 text-gray-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const filteredSessions = sessions.filter(s => {
    if (activeTab === 'active') return s.status === 'active'
    if (activeTab === 'queue') return s.status === 'waiting'
    if (activeTab === 'history') return s.status === 'ended'
    return true
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
          <h1 className="text-2xl font-bold text-white">Live Chat</h1>
          <p className="text-gray-400 mt-1">Real-time customer support conversations</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400">Online - 4 Agents Available</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Active Chats</p>
          <p className="text-2xl font-bold text-green-400">{stats.activeChats}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">In Queue</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.inQueue}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Avg Wait Time</p>
          <p className="text-2xl font-bold text-white">{stats.avgWaitTime}s</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Avg Duration</p>
          <p className="text-2xl font-bold text-white">{stats.avgChatDuration}m</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Satisfaction</p>
          <p className="text-2xl font-bold text-green-400">{stats.satisfaction}%</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Chats Today</p>
          <p className="text-2xl font-bold text-white">{stats.chatsTod}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit">
        {(['active', 'queue', 'history', 'settings'] as const).map((tab) => (
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
            {tab === 'queue' && stats.inQueue > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-yellow-500 text-black rounded-full text-xs">{stats.inQueue}</span>
            )}
          </button>
        ))}
      </div>

      {/* Chat Content */}
      {activeTab !== 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat List */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="divide-y divide-white/5">
              {filteredSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session.id)}
                  className={`w-full p-4 text-left hover:bg-white/5 transition-colors ${
                    selectedSession === session.id ? 'bg-white/10' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{session.customer.name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm truncate">{session.lastMessage}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>{session.agent || 'Unassigned'}</span>
                    <span>{session.messages} messages</span>
                  </div>
                </button>
              ))}
              {filteredSessions.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  No conversations
                </div>
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 flex flex-col min-h-[500px]">
            {selectedSession ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      {sessions.find(s => s.id === selectedSession)?.customer.name}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {sessions.find(s => s.id === selectedSession)?.customer.email}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                      Transfer
                    </button>
                    <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors">
                      End Chat
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                  <div className="flex justify-start">
                    <div className="bg-white/10 rounded-lg p-3 max-w-[80%]">
                      <p className="text-white">Hello, I need help with my order</p>
                      <span className="text-gray-500 text-xs mt-1 block">11:30 AM</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-purple-600 rounded-lg p-3 max-w-[80%]">
                      <p className="text-white">Hi! I'd be happy to help. Can you please provide your order number?</p>
                      <span className="text-purple-300 text-xs mt-1 block">11:31 AM</span>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-white/10 rounded-lg p-3 max-w-[80%]">
                      <p className="text-white">Sure, it's ORD-12345</p>
                      <span className="text-gray-500 text-xs mt-1 block">11:32 AM</span>
                    </div>
                  </div>
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/10">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                      Send
                    </button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button className="px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded text-sm transition-colors">
                      📎 Attach
                    </button>
                    <button className="px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded text-sm transition-colors">
                      💬 Canned
                    </button>
                    <button className="px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded text-sm transition-colors">
                      📄 KB Article
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                Select a conversation to view
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Chat Widget Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">Enable Chat Widget</p>
                  <p className="text-gray-400 text-sm">Show chat on public website</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-green-600">
                    <div className="absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5" />
                  </div>
                </label>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Welcome Message</label>
                <textarea
                  defaultValue="Hi! How can we help you today?"
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Operating Hours</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <input
                    type="time"
                    defaultValue="09:00"
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="time"
                    defaultValue="18:00"
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Agent Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Max Concurrent Chats per Agent</label>
                <input
                  type="number"
                  defaultValue={5}
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Auto-assign Timeout (seconds)</label>
                <input
                  type="number"
                  defaultValue={30}
                  className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">Auto-routing</p>
                  <p className="text-gray-400 text-sm">Automatically assign chats to agents</p>
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
    </div>
  )
}
