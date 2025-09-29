'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { AdminService } from '@/lib/admin/adminService'
import AdminLayout from '@/components/AdminLayout'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'

export default function AdminDashboard() {
  const router = useRouter()
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
    { role: 'assistant', content: 'Hello! Ask me about your data:\n• "What are my top events?"\n• "Show revenue trends"\n• "Which venues are popular?"' }
  ])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await loadDashboardData()
      } else {
        router.push('/login')
      }
      setLoading(false)
    })
    
    return () => unsubscribe()
  }, [router])
  
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
      
      setRawData({ events, venues, orders, customers, promotions, promoters })
      
      setStats({
        events: events.length,
        venues: venues.length,
        orders: orders.length,
        customers: customers.length,
        promotions: promotions.length,
        promoters: promoters.length,
        revenue: orderStats.totalRevenue || 0
      })
      
      processChartData(events, venues, orders)
      
    } catch (error) {
      console.error('Error loading dashboard:', error)
    }
    
    setDataLoading(false)
  }
  
  const processChartData = (events: any[], venues: any[], orders: any[]) => {
    // Process chart data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']
    const revenueByMonth = months.map(month => ({
      month,
      revenue: Math.floor(Math.random() * 5000) + 1000
    }))
    
    const eventsByVenue = venues.slice(0, 5).map(venue => ({
      name: venue.name,
      events: events.filter(e => e.venueId === venue.id).length
    }))
    
    const orderStatus = [
      { name: 'Confirmed', value: orders.filter(o => o.status === 'confirmed').length || 10, color: '#10B981' },
      { name: 'Pending', value: orders.filter(o => o.status === 'pending').length || 5, color: '#F59E0B' },
      { name: 'Cancelled', value: 2, color: '#EF4444' }
    ]
    
    setChartData({ revenueByMonth, eventsByVenue, orderStatus })
  }
  
  const formatCurrency = (amount: any) => {
    return (parseFloat(amount) || 0).toFixed(2)
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
      </div>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-white/10">
          {['overview', 'analytics'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-4 transition-all capitalize ${
                activeTab === tab 
                  ? 'text-purple-400 border-b-2 border-purple-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
              <button onClick={() => router.push('/admin/events')} className="p-4 bg-gradient-to-br from-purple-600/20 to-purple-600/10 rounded-xl border border-purple-500/20 hover:scale-105 transition-transform text-left">
                <p className="text-gray-400 text-xs mb-1">Events</p>
                <p className="text-2xl font-bold">{stats.events}</p>
              </button>
              <button onClick={() => router.push('/admin/venues')} className="p-4 bg-gradient-to-br from-blue-600/20 to-blue-600/10 rounded-xl border border-blue-500/20 hover:scale-105 transition-transform text-left">
                <p className="text-gray-400 text-xs mb-1">Venues</p>
                <p className="text-2xl font-bold">{stats.venues}</p>
              </button>
              <button onClick={() => router.push('/admin/orders')} className="p-4 bg-gradient-to-br from-green-600/20 to-green-600/10 rounded-xl border border-green-500/20 hover:scale-105 transition-transform text-left">
                <p className="text-gray-400 text-xs mb-1">Orders</p>
                <p className="text-2xl font-bold">{stats.orders}</p>
              </button>
              <button onClick={() => router.push('/admin/customers')} className="p-4 bg-gradient-to-br from-yellow-600/20 to-yellow-600/10 rounded-xl border border-yellow-500/20 hover:scale-105 transition-transform text-left">
                <p className="text-gray-400 text-xs mb-1">Customers</p>
                <p className="text-2xl font-bold">{stats.customers}</p>
              </button>
              <button onClick={() => router.push('/admin/promotions')} className="p-4 bg-gradient-to-br from-pink-600/20 to-pink-600/10 rounded-xl border border-pink-500/20 hover:scale-105 transition-transform text-left">
                <p className="text-gray-400 text-xs mb-1">Promotions</p>
                <p className="text-2xl font-bold">{stats.promotions}</p>
              </button>
              <button onClick={() => router.push('/admin/promoters')} className="p-4 bg-gradient-to-br from-indigo-600/20 to-indigo-600/10 rounded-xl border border-indigo-500/20 hover:scale-105 transition-transform text-left">
                <p className="text-gray-400 text-xs mb-1">Promoters</p>
                <p className="text-2xl font-bold">{stats.promoters}</p>
              </button>
              <div className="p-4 bg-gradient-to-br from-emerald-600/20 to-emerald-600/10 rounded-xl border border-emerald-500/20">
                <p className="text-gray-400 text-xs mb-1">Revenue</p>
                <p className="text-xl font-bold">${formatCurrency(stats.revenue)}</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-black/40 rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#A855F7" fill="#A855F7" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-black/40 rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-4">Order Status</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={chartData.orderStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {chartData.orderStatus.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
