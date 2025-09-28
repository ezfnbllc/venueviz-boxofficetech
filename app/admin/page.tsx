'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { AdminService } from '@/lib/admin/adminService'

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)
  const [stats, setStats] = useState<any>({
    events: 0,
    venues: 0,
    orders: 0,
    customers: 0,
    promotions: 0,
    revenue: 0
  })
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

  const loadDashboardData = async () => {
    setDataLoading(true)
    const loadErrors: string[] = []
    
    try {
      console.log('Loading dashboard data...')
      
      // Load each resource separately to handle failures gracefully
      let events: any[] = []
      let venues: any[] = []
      let orders: any[] = []
      let customers: any[] = []
      let promotions: any[] = []
      let orderStats: any = { totalRevenue: 0 }
      
      // Load venues
      try {
        venues = await AdminService.getVenues()
        console.log(`Loaded ${venues.length} venues`)
      } catch (error) {
        console.error('Error loading venues:', error)
        loadErrors.push('Failed to load venues')
      }
      
      // Load events
      try {
        events = await AdminService.getEvents()
        console.log(`Loaded ${events.length} events`)
      } catch (error) {
        console.error('Error loading events:', error)
        loadErrors.push('Failed to load events')
      }
      
      // Load orders and stats
      try {
        orders = await AdminService.getOrders()
        console.log(`Loaded ${orders.length} orders`)
      } catch (error) {
        console.error('Error loading orders:', error)
        loadErrors.push('Failed to load orders')
      }
      
      try {
        orderStats = await AdminService.getOrderStats()
        console.log('Loaded order stats:', orderStats)
      } catch (error) {
        console.error('Error loading order stats:', error)
        loadErrors.push('Failed to load order statistics')
      }
      
      // Load customers
      try {
        customers = await AdminService.getCustomers()
        console.log(`Loaded ${customers.length} customers`)
      } catch (error) {
        console.error('Error loading customers:', error)
        loadErrors.push('Failed to load customers')
      }
      
      // Load promotions
      try {
        promotions = await AdminService.getPromotions()
        console.log(`Loaded ${promotions.length} promotions`)
      } catch (error) {
        console.error('Error loading promotions:', error)
        loadErrors.push('Failed to load promotions')
      }
      
      setStats({
        events: events.length,
        venues: venues.length,
        orders: orders.length,
        customers: customers.length,
        promotions: promotions.length,
        revenue: orderStats.totalRevenue || 0
      })
      
      setErrors(loadErrors)
      console.log('Dashboard data loaded successfully')
      
    } catch (error) {
      console.error('Critical error loading dashboard:', error)
      setErrors(['Critical error loading dashboard data'])
    }
    
    setDataLoading(false)
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">Welcome back, {user?.email}</p>
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg">
            <h3 className="text-red-400 font-semibold mb-2">Some data could not be loaded:</h3>
            <ul className="list-disc list-inside text-red-300 text-sm">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Stats Grid */}
        {dataLoading ? (
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 animate-pulse">
                <div className="h-4 bg-gray-700 rounded mb-2"></div>
                <div className="h-8 bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
            <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
              <p className="text-gray-400 text-sm mb-1">Total Events</p>
              <p className="text-3xl font-bold">{stats.events}</p>
            </div>
            <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
              <p className="text-gray-400 text-sm mb-1">Venues</p>
              <p className="text-3xl font-bold">{stats.venues}</p>
            </div>
            <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
              <p className="text-gray-400 text-sm mb-1">Orders</p>
              <p className="text-3xl font-bold">{stats.orders}</p>
            </div>
            <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
              <p className="text-gray-400 text-sm mb-1">Customers</p>
              <p className="text-3xl font-bold">{stats.customers}</p>
            </div>
            <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
              <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
              <p className="text-3xl font-bold">${stats.revenue.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-6">
          <button 
            onClick={() => router.push('/admin/events')}
            className="p-6 bg-purple-600/20 rounded-xl border border-purple-500/30 hover:bg-purple-600/30 transition-all"
          >
            <div className="text-4xl mb-3">🎭</div>
            <h3 className="font-semibold mb-1">Events</h3>
            <p className="text-sm text-gray-400">Manage events</p>
          </button>
          
          <button 
            onClick={() => router.push('/admin/venues')}
            className="p-6 bg-blue-600/20 rounded-xl border border-blue-500/30 hover:bg-blue-600/30 transition-all"
          >
            <div className="text-4xl mb-3">🏛️</div>
            <h3 className="font-semibold mb-1">Venues</h3>
            <p className="text-sm text-gray-400">Configure venues</p>
          </button>
          
          <button 
            onClick={() => router.push('/admin/orders')}
            className="p-6 bg-green-600/20 rounded-xl border border-green-500/30 hover:bg-green-600/30 transition-all"
          >
            <div className="text-4xl mb-3">🎫</div>
            <h3 className="font-semibold mb-1">Orders</h3>
            <p className="text-sm text-gray-400">View orders</p>
          </button>
          
          <button 
            onClick={() => router.push('/admin/customers')}
            className="p-6 bg-yellow-600/20 rounded-xl border border-yellow-500/30 hover:bg-yellow-600/30 transition-all"
          >
            <div className="text-4xl mb-3">��</div>
            <h3 className="font-semibold mb-1">Customers</h3>
            <p className="text-sm text-gray-400">Customer data</p>
          </button>
        </div>

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button 
            onClick={loadDashboardData}
            disabled={dataLoading}
            className="px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {dataLoading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>
      </div>
    </div>
  )
}
