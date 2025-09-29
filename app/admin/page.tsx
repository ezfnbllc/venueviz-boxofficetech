'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { AdminService } from '@/lib/admin/adminService'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  
  const [stats, setStats] = useState<any>({
    events: 0,
    venues: 0,
    orders: 0,
    customers: 0,
    promotions: 0,
    promoters: 0,
    revenue: 0
  })
  
  const [rawData, setRawData] = useState<any>({
    events: [],
    venues: [],
    orders: [],
    customers: [],
    promotions: [],
    promoters: []
  })
  
  const [chartData, setChartData] = useState<any>({
    revenueByMonth: [],
    eventsByVenue: [],
    orderStatus: [],
    topEvents: [],
    seatAvailability: []
  })
  
  const [aiMessages, setAiMessages] = useState<any[]>([
    { role: 'assistant', content: 'Hello! I can help you analyze your data. Try asking questions like:\n• "What are my top selling events?"\n• "Show me revenue trends"\n• "Which venues are most popular?"\n• "How many orders this month?"' }
  ])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log('Admin dashboard - User authenticated:', firebaseUser.email)
        setUser(firebaseUser)
        await loadDashboardData()
      } else {
        router.push('/login')
      }
      setLoading(false)
    })
    
    return () => unsubscribe()
  }, [router])
  
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [aiMessages])

  const loadDashboardData = async () => {
    setDataLoading(true)
    
    try {
      const [events, venues, orders, customers, promotions, promoters, orderStats] = await Promise.all([
        AdminService.getEvents(),
        AdminService.getVenues(),
        AdminService.getOrders(),
        AdminService.getCustomers(),
        AdminService.getPromotions(),
        AdminService.getPromoters(),
        AdminService.getOrderStats()
      ])
      
      setRawData({
        events,
        venues,
        orders,
        customers,
        promotions,
        promoters
      })
      
      setStats({
        events: events.length,
        venues: venues.length,
        orders: orders.length,
        customers: customers.length,
        promotions: promotions.length,
        promoters: promoters.length,
        revenue: orderStats.totalRevenue || 0
      })
      
      processChartData(events, venues, orders, customers, promotions)
      
    } catch (error) {
      console.error('Error loading dashboard:', error)
    }
    
    setDataLoading(false)
  }
  
  const processChartData = (events: any[], venues: any[], orders: any[], customers: any[], promotions: any[]) => {
    // Revenue by month
    const revenueByMonth = processRevenueByMonth(orders)
    
    // Events by venue
    const eventsByVenue = venues.map(venue => ({
      name: venue.name,
      events: events.filter(e => e.venueId === venue.id || e.venueName === venue.name).length
    })).sort((a, b) => b.events - a.events).slice(0, 5)
    
    // Order status
    const orderStatus = [
      { name: 'Confirmed', value: orders.filter(o => o.status === 'confirmed' || o.status === 'completed').length, color: '#10B981' },
      { name: 'Pending', value: orders.filter(o => o.status === 'pending').length, color: '#F59E0B' },
      { name: 'Cancelled', value: orders.filter(o => o.status === 'cancelled' || o.status === 'refunded').length, color: '#EF4444' }
    ]
    
    // Top events
    const eventOrderCounts: any = {}
    orders.forEach(order => {
      const eventName = order.eventName || 'Unknown'
      eventOrderCounts[eventName] = (eventOrderCounts[eventName] || 0) + 1
    })
    
    const topEvents = Object.entries(eventOrderCounts)
      .map(([name, count]) => ({ name, orders: count as number }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5)
    
    // Seat availability (mock data for now)
    const seatAvailability = events.slice(0, 5).map(event => ({
      name: event.name,
      available: Math.floor(Math.random() * 500) + 100,
      sold: Math.floor(Math.random() * 300) + 50
    }))
    
    setChartData({
      revenueByMonth,
      eventsByVenue,
      orderStatus,
      topEvents,
      seatAvailability
    })
  }
  
  const processRevenueByMonth = (orders: any[]) => {
    const monthlyRevenue: any = {}
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    months.forEach(month => {
      monthlyRevenue[month] = 0
    })
    
    orders.forEach(order => {
      let orderDate = null
      if (order.createdAt?.toDate) {
        orderDate = order.createdAt.toDate()
      } else if (order.purchaseDate?.toDate) {
        orderDate = order.purchaseDate.toDate()
      }
      
      if (orderDate) {
        const month = months[orderDate.getMonth()]
        const amount = order.pricing?.total || order.totalAmount || order.total || 0
        monthlyRevenue[month] += amount
      }
    })
    
    return months.map(month => ({
      month,
      revenue: monthlyRevenue[month]
    }))
  }
  
  const processAIQuery = async () => {
    if (!aiInput.trim()) return
    
    setAiLoading(true)
    const query = aiInput.toLowerCase()
    
    setAiMessages(prev => [...prev, { role: 'user', content: aiInput }])
    setAiInput('')
    
    try {
      let response = ''
      
      if (query.includes('revenue') || query.includes('money')) {
        const totalRevenue = stats.revenue
        response = `💰 **Revenue Analytics:**\n\n• Total Revenue: $${formatCurrency(totalRevenue)}\n• Total Orders: ${rawData.orders.length}\n• Average Order: $${formatCurrency(totalRevenue / (rawData.orders.length || 1))}`
      }
      else if (query.includes('event')) {
        response = `🎭 **Events Overview:**\n\n• Total Events: ${rawData.events.length}\n• Active Venues: ${rawData.venues.length}\n\nTop Events:\n`
        rawData.events.slice(0, 3).forEach((event: any) => {
          response += `• ${event.name} - ${event.venueName || 'TBD'}\n`
        })
      }
      else if (query.includes('customer')) {
        response = `👥 **Customer Insights:**\n\n• Total Customers: ${rawData.customers.length}\n• Avg Orders/Customer: ${(rawData.orders.length / (rawData.customers.length || 1)).toFixed(1)}`
      }
      else {
        response = `📊 **Quick Summary:**\n\n• Events: ${stats.events}\n• Venues: ${stats.venues}\n• Orders: ${stats.orders}\n• Revenue: $${formatCurrency(stats.revenue)}`
      }
      
      setAiMessages(prev => [...prev, { role: 'assistant', content: response }])
      
    } catch (error) {
      console.error('AI query error:', error)
    }
    
    setAiLoading(false)
  }
  
  const formatCurrency = (amount: any) => {
    const value = parseFloat(amount) || 0
    return value.toFixed(2)
  }
  
  const formatAIMessage = (content: string) => {
    const lines = content.split('\n')
    return lines.map((line, idx) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={idx} className="font-bold text-purple-400 mt-2">{line.slice(2, -2)}</div>
      }
      if (line.startsWith('• ')) {
        return <div key={idx} className="ml-4 text-gray-300">{line}</div>
      }
      return <div key={idx} className="text-gray-300">{line}</div>
    })
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-gray-400">Welcome back, {user?.email}</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-white/10">
          {['overview', 'analytics', 'ai'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-4 transition-all capitalize ${
                activeTab === tab 
                  ? 'text-purple-400 border-b-2 border-purple-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'ai' ? 'AI Assistant' : tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Clickable Stats Grid */}
            <div className="grid md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
              <button onClick={() => router.push('/admin/events')} className="p-4 bg-gradient-to-br from-purple-600/20 to-purple-600/10 backdrop-blur-xl rounded-xl border border-purple-500/20 hover:scale-105 transition-transform text-left">
                <p className="text-gray-400 text-xs mb-1">Events</p>
                <p className="text-2xl font-bold">{stats.events}</p>
                <p className="text-xs text-purple-400 mt-1">Manage →</p>
              </button>
              <button onClick={() => router.push('/admin/venues')} className="p-4 bg-gradient-to-br from-blue-600/20 to-blue-600/10 backdrop-blur-xl rounded-xl border border-blue-500/20 hover:scale-105 transition-transform text-left">
                <p className="text-gray-400 text-xs mb-1">Venues</p>
                <p className="text-2xl font-bold">{stats.venues}</p>
                <p className="text-xs text-blue-400 mt-1">View →</p>
              </button>
              <button onClick={() => router.push('/admin/orders')} className="p-4 bg-gradient-to-br from-green-600/20 to-green-600/10 backdrop-blur-xl rounded-xl border border-green-500/20 hover:scale-105 transition-transform text-left">
                <p className="text-gray-400 text-xs mb-1">Orders</p>
                <p className="text-2xl font-bold">{stats.orders}</p>
                <p className="text-xs text-green-400 mt-1">Details →</p>
              </button>
              <button onClick={() => router.push('/admin/customers')} className="p-4 bg-gradient-to-br from-yellow-600/20 to-yellow-600/10 backdrop-blur-xl rounded-xl border border-yellow-500/20 hover:scale-105 transition-transform text-left">
                <p className="text-gray-400 text-xs mb-1">Customers</p>
                <p className="text-2xl font-bold">{stats.customers}</p>
                <p className="text-xs text-yellow-400 mt-1">View →</p>
              </button>
              <button onClick={() => router.push('/admin/promotions')} className="p-4 bg-gradient-to-br from-pink-600/20 to-pink-600/10 backdrop-blur-xl rounded-xl border border-pink-500/20 hover:scale-105 transition-transform text-left">
                <p className="text-gray-400 text-xs mb-1">Promotions</p>
                <p className="text-2xl font-bold">{stats.promotions}</p>
                <p className="text-xs text-pink-400 mt-1">Manage →</p>
              </button>
              <button onClick={() => router.push('/admin/promoters')} className="p-4 bg-gradient-to-br from-indigo-600/20 to-indigo-600/10 backdrop-blur-xl rounded-xl border border-indigo-500/20 hover:scale-105 transition-transform text-left">
                <p className="text-gray-400 text-xs mb-1">Promoters</p>
                <p className="text-2xl font-bold">{stats.promoters}</p>
                <p className="text-xs text-indigo-400 mt-1">View →</p>
              </button>
              <div className="p-4 bg-gradient-to-br from-emerald-600/20 to-emerald-600/10 backdrop-blur-xl rounded-xl border border-emerald-500/20">
                <p className="text-gray-400 text-xs mb-1">Revenue</p>
                <p className="text-xl font-bold">${formatCurrency(stats.revenue)}</p>
                <p className="text-xs text-emerald-400 mt-1">Total</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-4">Monthly Revenue</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData.revenueByMonth}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#A855F7" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#A855F7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#A855F7" fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-4">Order Status</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={chartData.orderStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {chartData.orderStatus.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-4">
                  {chartData.orderStatus.map((status: any) => (
                    <div key={status.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }}></div>
                      <span className="text-sm text-gray-400">{status.name}: {status.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Orders & Customers */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {rawData.orders.slice(0, 5).map((order: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <div>
                        <p className="font-semibold text-sm">{order.customerName || 'Guest'}</p>
                        <p className="text-xs text-gray-400">{order.eventName || 'Unknown Event'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${formatCurrency(order.pricing?.total || order.totalAmount || order.total || 0)}</p>
                        <p className="text-xs text-gray-400">{order.status || 'pending'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Customers</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {rawData.customers.slice(0, 5).map((customer: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <div>
                        <p className="font-semibold text-sm">{customer.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{customer.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${formatCurrency(customer.totalSpent || 0)}</p>
                        <p className="text-xs text-gray-400">{customer.totalOrders || 0} orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-4">Events by Venue</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData.eventsByVenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                    <Bar dataKey="events" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-4">Seat Availability</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData.seatAvailability}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                    <Legend />
                    <Bar dataKey="sold" stackId="a" fill="#10B981" />
                    <Bar dataKey="available" stackId="a" fill="#374151" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* AI Assistant Tab */}
        {activeTab === 'ai' && (
          <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <div className="h-96 overflow-y-auto mb-4 space-y-4 p-4 bg-black/20 rounded-lg">
              {aiMessages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3xl p-3 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-purple-600/20 border border-purple-500/30' 
                      : 'bg-gray-800/50 border border-gray-700/30'
                  }`}>
                    {message.role === 'assistant' ? formatAIMessage(message.content) : message.content}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && processAIQuery()}
                placeholder="Ask about revenue, events, customers..."
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={processAIQuery}
                disabled={aiLoading || !aiInput.trim()}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
