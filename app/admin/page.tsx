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
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'analytics', 'ai'
  
  // Stats
  const [stats, setStats] = useState<any>({
    events: 0,
    venues: 0,
    orders: 0,
    customers: 0,
    promotions: 0,
    promoters: 0,
    revenue: 0
  })
  
  // Raw data for analytics
  const [rawData, setRawData] = useState<any>({
    events: [],
    venues: [],
    orders: [],
    customers: [],
    promotions: [],
    promoters: []
  })
  
  // Chart data
  const [chartData, setChartData] = useState<any>({
    revenueByMonth: [],
    eventsByVenue: [],
    orderStatus: [],
    topEvents: [],
    customerGrowth: [],
    promotionUsage: []
  })
  
  // AI Assistant
  const [aiMessages, setAiMessages] = useState<any[]>([
    { role: 'assistant', content: 'Hello! I can help you analyze your data. Try asking questions like:\n• "What are my top selling events?"\n• "Show me revenue trends"\n• "Which venues are most popular?"\n• "How many orders this month?"' }
  ])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  
  const [errors, setErrors] = useState<string[]>([])
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log('Admin dashboard - User authenticated:', firebaseUser.email)
        setUser(firebaseUser)
        await loadDashboardData()
      } else {
        console.log('Admin dashboard - No user, redirecting to login')
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
    const loadErrors: string[] = []
    
    try {
      console.log('Loading dashboard data...')
      
      // Load all data
      let events: any[] = []
      let venues: any[] = []
      let orders: any[] = []
      let customers: any[] = []
      let promotions: any[] = []
      let promoters: any[] = []
      let orderStats: any = { totalRevenue: 0 }
      
      // Load all resources
      try {
        [events, venues, orders, customers, promotions, promoters, orderStats] = await Promise.all([
          AdminService.getEvents(),
          AdminService.getVenues(),
          AdminService.getOrders(),
          AdminService.getCustomers(),
          AdminService.getPromotions(),
          AdminService.getPromoters(),
          AdminService.getOrderStats()
        ])
        
        console.log('All data loaded successfully')
      } catch (error) {
        console.error('Error loading data:', error)
      }
      
      // Store raw data for AI queries
      setRawData({
        events,
        venues,
        orders,
        customers,
        promotions,
        promoters
      })
      
      // Set basic stats
      setStats({
        events: events.length,
        venues: venues.length,
        orders: orders.length,
        customers: customers.length,
        promotions: promotions.length,
        promoters: promoters.length,
        revenue: orderStats.totalRevenue || 0
      })
      
      // Process chart data
      processChartData(events, venues, orders, customers, promotions)
      
    } catch (error) {
      console.error('Critical error loading dashboard:', error)
      setErrors(['Critical error loading dashboard data'])
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
    
    // Order status distribution
    const orderStatus = [
      { name: 'Confirmed', value: orders.filter(o => o.status === 'confirmed' || o.status === 'completed').length, color: '#10B981' },
      { name: 'Pending', value: orders.filter(o => o.status === 'pending').length, color: '#F59E0B' },
      { name: 'Cancelled', value: orders.filter(o => o.status === 'cancelled' || o.status === 'refunded').length, color: '#EF4444' }
    ]
    
    // Top events by orders
    const eventOrderCounts: any = {}
    orders.forEach(order => {
      const eventName = order.eventName || 'Unknown'
      eventOrderCounts[eventName] = (eventOrderCounts[eventName] || 0) + 1
    })
    
    const topEvents = Object.entries(eventOrderCounts)
      .map(([name, count]) => ({ name, orders: count as number }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5)
    
    // Customer growth (mock data for now)
    const customerGrowth = generateCustomerGrowthData(customers)
    
    // Promotion usage
    const promotionUsage = promotions.map(promo => ({
      name: promo.code || promo.name,
      used: promo.usedCount || 0,
      remaining: (promo.maxUses || 100) - (promo.usedCount || 0)
    }))
    
    setChartData({
      revenueByMonth,
      eventsByVenue,
      orderStatus,
      topEvents,
      customerGrowth,
      promotionUsage
    })
  }
  
  const processRevenueByMonth = (orders: any[]) => {
    const monthlyRevenue: any = {}
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    // Initialize all months with 0
    months.forEach(month => {
      monthlyRevenue[month] = 0
    })
    
    // Process orders
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
  
  const generateCustomerGrowthData = (customers: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']
    let cumulative = 0
    
    return months.map((month, index) => {
      cumulative += Math.floor(customers.length / 8) + (index < customers.length % 8 ? 1 : 0)
      return {
        month,
        customers: cumulative
      }
    })
  }
  
  // AI Assistant Functions
  const processAIQuery = async () => {
    if (!aiInput.trim()) return
    
    setAiLoading(true)
    const query = aiInput.toLowerCase()
    
    // Add user message
    setAiMessages(prev => [...prev, { role: 'user', content: aiInput }])
    setAiInput('')
    
    try {
      let response = ''
      
      // Process different types of queries
      if (query.includes('revenue') || query.includes('money') || query.includes('sales')) {
        const totalRevenue = stats.revenue
        const avgOrderValue = totalRevenue / (rawData.orders.length || 1)
        response = `💰 **Revenue Analytics:**\n\n• Total Revenue: $${formatCurrency(totalRevenue)}\n• Total Orders: ${rawData.orders.length}\n• Average Order Value: $${formatCurrency(avgOrderValue)}\n\nTop revenue events:\n`
        
        // Calculate revenue by event
        const eventRevenue: any = {}
        rawData.orders.forEach((order: any) => {
          const eventName = order.eventName || 'Unknown'
          const amount = order.pricing?.total || order.totalAmount || order.total || 0
          eventRevenue[eventName] = (eventRevenue[eventName] || 0) + amount
        })
        
        Object.entries(eventRevenue)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 3)
          .forEach(([event, revenue]) => {
            response += `• ${event}: $${formatCurrency(revenue as number)}\n`
          })
      }
      
      else if (query.includes('event') || query.includes('show') || query.includes('performance')) {
        response = `🎭 **Events Overview:**\n\n• Total Events: ${rawData.events.length}\n• Active Venues: ${rawData.venues.length}\n\nUpcoming Events:\n`
        
        rawData.events.slice(0, 5).forEach((event: any) => {
          response += `• ${event.name} - ${event.venueName || 'TBD'}\n`
        })
        
        if (rawData.events.length > 5) {
          response += `\n...and ${rawData.events.length - 5} more events`
        }
      }
      
      else if (query.includes('venue') || query.includes('location')) {
        response = `🏛️ **Venues Analysis:**\n\n• Total Venues: ${rawData.venues.length}\n\nMost Active Venues:\n`
        
        chartData.eventsByVenue.forEach((venue: any) => {
          response += `• ${venue.name}: ${venue.events} events\n`
        })
      }
      
      else if (query.includes('customer') || query.includes('user')) {
        response = `👥 **Customer Insights:**\n\n• Total Customers: ${rawData.customers.length}\n• Average Orders per Customer: ${(rawData.orders.length / (rawData.customers.length || 1)).toFixed(1)}\n`
        
        // Find top customers
        const customerOrders: any = {}
        rawData.orders.forEach((order: any) => {
          const email = order.customerEmail || 'Unknown'
          customerOrders[email] = (customerOrders[email] || 0) + 1
        })
        
        response += '\nTop Customers:\n'
        Object.entries(customerOrders)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 3)
          .forEach(([email, count]) => {
            response += `• ${email}: ${count} orders\n`
          })
      }
      
      else if (query.includes('promotion') || query.includes('discount') || query.includes('code')) {
        response = `🎟️ **Promotions Report:**\n\n• Active Promotions: ${rawData.promotions.filter((p: any) => p.active).length}\n• Total Promotions: ${rawData.promotions.length}\n\nPromotion Codes:\n`
        
        rawData.promotions.forEach((promo: any) => {
          const usage = `${promo.usedCount || 0}/${promo.maxUses || 100}`
          const discount = promo.type === 'percentage' ? `${promo.value}%` : `$${promo.value}`
          response += `• ${promo.code}: ${discount} off (Used: ${usage})\n`
        })
      }
      
      else if (query.includes('order') || query.includes('ticket')) {
        const confirmedOrders = rawData.orders.filter((o: any) => o.status === 'confirmed' || o.status === 'completed').length
        const pendingOrders = rawData.orders.filter((o: any) => o.status === 'pending').length
        
        response = `🎫 **Orders Summary:**\n\n• Total Orders: ${rawData.orders.length}\n• Confirmed: ${confirmedOrders}\n• Pending: ${pendingOrders}\n• Total Revenue: $${formatCurrency(stats.revenue)}\n\nRecent Orders:\n`
        
        rawData.orders.slice(0, 3).forEach((order: any) => {
          const amount = order.pricing?.total || order.totalAmount || order.total || 0
          response += `• ${order.customerName || 'Guest'} - ${order.eventName || 'Unknown'} - $${formatCurrency(amount)}\n`
        })
      }
      
      else if (query.includes('help') || query.includes('what can')) {
        response = `🤖 **I can help you with:**\n\n• Revenue analysis and trends\n• Event performance metrics\n• Venue utilization stats\n• Customer insights and behavior\n• Order and ticket analytics\n• Promotion effectiveness\n• Promoter performance\n\nTry asking:\n• "What are my top revenue events?"\n• "Show customer growth"\n• "Which venues are most popular?"\n• "How many pending orders?"\n• "What promotions are active?"`
      }
      
      else {
        // Default analytical response
        response = `📊 **Quick Analytics Summary:**\n\n• Total Events: ${stats.events}\n• Active Venues: ${stats.venues}\n• Total Orders: ${stats.orders}\n• Customers: ${stats.customers}\n• Revenue: $${formatCurrency(stats.revenue)}\n• Active Promotions: ${stats.promotions}\n\nWould you like me to dive deeper into any specific area?`
      }
      
      setAiMessages(prev => [...prev, { role: 'assistant', content: response }])
      
    } catch (error) {
      console.error('AI query error:', error)
      setAiMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I encountered an error processing your request. Please try rephrasing your question.' 
      }])
    }
    
    setAiLoading(false)
  }
  
  const formatCurrency = (amount: any) => {
    const value = parseFloat(amount) || 0
    return value.toFixed(2)
  }
  
  const formatAIMessage = (content: string) => {
    // Convert markdown-like formatting to JSX
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500 mx-auto"/>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-gray-400">Welcome back, {user?.email}</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-white/10">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-4 transition-all ${
              activeTab === 'overview' 
                ? 'text-purple-400 border-b-2 border-purple-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 px-4 transition-all ${
              activeTab === 'analytics' 
                ? 'text-purple-400 border-b-2 border-purple-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`pb-3 px-4 transition-all ${
              activeTab === 'ai' 
                ? 'text-purple-400 border-b-2 border-purple-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            AI Assistant
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
              <div className="p-4 bg-gradient-to-br from-purple-600/20 to-purple-600/10 backdrop-blur-xl rounded-xl border border-purple-500/20">
                <p className="text-gray-400 text-xs mb-1">Events</p>
                <p className="text-2xl font-bold">{stats.events}</p>
                <p className="text-xs text-purple-400 mt-1">Active</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-600/20 to-blue-600/10 backdrop-blur-xl rounded-xl border border-blue-500/20">
                <p className="text-gray-400 text-xs mb-1">Venues</p>
                <p className="text-2xl font-bold">{stats.venues}</p>
                <p className="text-xs text-blue-400 mt-1">Locations</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-600/20 to-green-600/10 backdrop-blur-xl rounded-xl border border-green-500/20">
                <p className="text-gray-400 text-xs mb-1">Orders</p>
                <p className="text-2xl font-bold">{stats.orders}</p>
                <p className="text-xs text-green-400 mt-1">Total</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-yellow-600/20 to-yellow-600/10 backdrop-blur-xl rounded-xl border border-yellow-500/20">
                <p className="text-gray-400 text-xs mb-1">Customers</p>
                <p className="text-2xl font-bold">{stats.customers}</p>
                <p className="text-xs text-yellow-400 mt-1">Registered</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-pink-600/20 to-pink-600/10 backdrop-blur-xl rounded-xl border border-pink-500/20">
                <p className="text-gray-400 text-xs mb-1">Promotions</p>
                <p className="text-2xl font-bold">{stats.promotions}</p>
                <p className="text-xs text-pink-400 mt-1">Active</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-indigo-600/20 to-indigo-600/10 backdrop-blur-xl rounded-xl border border-indigo-500/20">
                <p className="text-gray-400 text-xs mb-1">Promoters</p>
                <p className="text-2xl font-bold">{stats.promoters}</p>
                <p className="text-xs text-indigo-400 mt-1">Partners</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-emerald-600/20 to-emerald-600/10 backdrop-blur-xl rounded-xl border border-emerald-500/20">
                <p className="text-gray-400 text-xs mb-1">Revenue</p>
                <p className="text-xl font-bold">${formatCurrency(stats.revenue)}</p>
                <p className="text-xs text-emerald-400 mt-1">Total</p>
              </div>
            </div>

            {/* Quick Charts */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {/* Revenue Chart */}
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
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#9CA3AF' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#A855F7" 
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Order Status */}
              <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-4">Order Status</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={chartData.orderStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.orderStatus.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-4">
                  {chartData.orderStatus.map((status: any) => (
                    <div key={status.name} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: status.color }}></div>
                      <span className="text-sm text-gray-400">{status.name}: {status.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Navigation Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              <button 
                onClick={() => router.push('/admin/events')}
                className="p-6 bg-purple-600/20 rounded-xl border border-purple-500/30 hover:bg-purple-600/30 transition-all group"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🎭</div>
                <h3 className="font-semibold mb-1">Events</h3>
                <p className="text-sm text-gray-400">Manage events</p>
              </button>
              
              <button 
                onClick={() => router.push('/admin/venues')}
                className="p-6 bg-blue-600/20 rounded-xl border border-blue-500/30 hover:bg-blue-600/30 transition-all group"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🏛️</div>
                <h3 className="font-semibold mb-1">Venues</h3>
                <p className="text-sm text-gray-400">Configure venues</p>
              </button>
              
              <button 
                onClick={() => router.push('/admin/orders')}
                className="p-6 bg-green-600/20 rounded-xl border border-green-500/30 hover:bg-green-600/30 transition-all group"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🎫</div>
                <h3 className="font-semibold mb-1">Orders</h3>
                <p className="text-sm text-gray-400">View orders</p>
              </button>
              
              <button 
                onClick={() => router.push('/admin/customers')}
                className="p-6 bg-yellow-600/20 rounded-xl border border-yellow-500/30 hover:bg-yellow-600/30 transition-all group"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">👥</div>
                <h3 className="font-semibold mb-1">Customers</h3>
                <p className="text-sm text-gray-400">Customer data</p>
              </button>
              
              <button 
                onClick={() => router.push('/admin/promotions')}
                className="p-6 bg-pink-600/20 rounded-xl border border-pink-500/30 hover:bg-pink-600/30 transition-all group"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🎟️</div>
                <h3 className="font-semibold mb-1">Promotions</h3>
                <p className="text-sm text-gray-400">Discount codes</p>
              </button>
              
              <button 
                onClick={() => router.push('/admin/promoters')}
                className="p-6 bg-indigo-600/20 rounded-xl border border-indigo-500/30 hover:bg-indigo-600/30 transition-all group"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🤝</div>
                <h3 className="font-semibold mb-1">Promoters</h3>
                <p className="text-sm text-gray-400">Partner management</p>
              </button>
            </div>
          </>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Top Row - Revenue and Events */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Revenue Trend */}
              <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                      formatter={(value: any) => `$${value.toFixed(2)}`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#A855F7" 
                      strokeWidth={2}
                      dot={{ fill: '#A855F7', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Events by Venue */}
              <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-4">Events by Venue</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData.eventsByVenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    />
                    <Bar dataKey="events" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Second Row - Top Events and Customer Growth */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Top Events */}
              <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-4">Top Events by Orders</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData.topEvents} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9CA3AF" />
                    <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={100} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    />
                    <Bar dataKey="orders" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Customer Growth */}
              <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-4">Customer Growth</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={chartData.customerGrowth}>
                    <defs>
                      <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="customers" 
                      stroke="#F59E0B" 
                      fillOpacity={1} 
                      fill="url(#colorCustomers)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Third Row - Full Width Promotions */}
            <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold mb-4">Promotion Usage</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData.promotionUsage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  />
                  <Legend />
                  <Bar dataKey="used" stackId="a" fill="#EC4899" />
                  <Bar dataKey="remaining" stackId="a" fill="#EC489950" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* AI Assistant Tab */}
        {activeTab === 'ai' && (
          <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-xl">🤖</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">AI Data Assistant</h3>
                <p className="text-xs text-gray-400">Ask questions about your data</p>
              </div>
            </div>
            
            {/* Chat Messages */}
            <div className="h-96 overflow-y-auto mb-4 space-y-4 p-4 bg-black/20 rounded-lg">
              {aiMessages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3xl p-3 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-purple-600/20 border border-purple-500/30' 
                      : 'bg-gray-800/50 border border-gray-700/30'
                  }`}>
                    {message.role === 'assistant' ? (
                      <div>{formatAIMessage(message.content)}</div>
                    ) : (
                      <div className="text-gray-200">{message.content}</div>
                    )}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800/50 border border-gray-700/30 p-3 rounded-lg">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && processAIQuery()}
                placeholder="Ask about revenue, events, customers, venues..."
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500"
                disabled={aiLoading}
              />
              <button
                onClick={processAIQuery}
                disabled={aiLoading || !aiInput.trim()}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 flex justify-center gap-4">
          <button 
            onClick={loadDashboardData}
            disabled={dataLoading}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {dataLoading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>
      </div>
    </div>
  )
}
