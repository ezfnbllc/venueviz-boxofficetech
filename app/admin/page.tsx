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
  const [stats, setStats] = useState<any>({
    events: 0,
    venues: 0,
    orders: 0,
    promotions: 0,
    revenue: 0
  })
  
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
    try {
      console.log('Loading dashboard data...')
      
      const [events, venues, orders, promotions, orderStats] = await Promise.all([
        AdminService.getEvents(),
        AdminService.getVenues(),
        AdminService.getOrders(),
        AdminService.getPromotions(),
        AdminService.getOrderStats()
      ])
      
      console.log('Dashboard data loaded:', {
        events: events.length,
        venues: venues.length,
        orders: orders.length,
        promotions: promotions.length
      })
      
      setStats({
        events: events.length,
        venues: venues.length,
        orders: orders.length,
        promotions: promotions.length,
        revenue: orderStats.totalRevenue
      })
    } catch (error) {
      console.error('Error loading dashboard:', error)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }
  
  if (!user) {
    return null
  }
  
  const handleNavigation = (path: string) => {
    router.push(`/admin/${path}`)
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              VenueViz Admin
            </h1>
            <div className="flex gap-4 items-center">
              <span className="text-sm text-gray-400">{user.email}</span>
              <button 
                onClick={() => {
                  auth.signOut()
                  router.push('/login')
                }}
                className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-3xl font-bold">{stats.events}</p>
            <p className="text-gray-400">Events</p>
          </div>
          <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-3xl font-bold">{stats.venues}</p>
            <p className="text-gray-400">Venues</p>
          </div>
          <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-3xl font-bold">{stats.orders}</p>
            <p className="text-gray-400">Orders</p>
          </div>
          <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-3xl font-bold">{stats.promotions}</p>
            <p className="text-gray-400">Promotions</p>
          </div>
          <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-3xl font-bold">${stats.revenue.toLocaleString()}</p>
            <p className="text-gray-400">Revenue</p>
          </div>
        </div>
        
        {/* Navigation Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <button 
            onClick={() => handleNavigation('events')}
            className="p-6 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl border border-purple-500/30 text-left hover:scale-105 transition"
          >
            <div className="text-3xl mb-3">🎭</div>
            <h3 className="font-bold mb-2">Manage Events</h3>
            <p className="text-sm text-gray-400">Create and manage events</p>
          </button>
          
          <button 
            onClick={() => handleNavigation('venues')}
            className="p-6 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-xl border border-blue-500/30 text-left hover:scale-105 transition"
          >
            <div className="text-3xl mb-3">🏛️</div>
            <h3 className="font-bold mb-2">Manage Venues</h3>
            <p className="text-sm text-gray-400">Venue configurations</p>
          </button>
          
          <button 
            onClick={() => handleNavigation('orders')}
            className="p-6 bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-xl border border-green-500/30 text-left hover:scale-105 transition"
          >
            <div className="text-3xl mb-3">🎫</div>
            <h3 className="font-bold mb-2">View Orders</h3>
            <p className="text-sm text-gray-400">Track all orders</p>
          </button>
          
          <button 
            onClick={() => handleNavigation('customers')}
            className="p-6 bg-gradient-to-br from-yellow-600/20 to-orange-600/20 rounded-xl border border-yellow-500/30 text-left hover:scale-105 transition"
          >
            <div className="text-3xl mb-3">👥</div>
            <h3 className="font-bold mb-2">Customers</h3>
            <p className="text-sm text-gray-400">Customer management</p>
          </button>
          
          <button 
            onClick={() => handleNavigation('promotions')}
            className="p-6 bg-gradient-to-br from-red-600/20 to-pink-600/20 rounded-xl border border-red-500/30 text-left hover:scale-105 transition"
          >
            <div className="text-3xl mb-3">🎁</div>
            <h3 className="font-bold mb-2">Promotions</h3>
            <p className="text-sm text-gray-400">Discount codes</p>
          </button>
          
          <button 
            onClick={() => handleNavigation('promoters')}
            className="p-6 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-xl border border-indigo-500/30 text-left hover:scale-105 transition"
          >
            <div className="text-3xl mb-3">🤝</div>
            <h3 className="font-bold mb-2">Promoters</h3>
            <p className="text-sm text-gray-400">Manage promoters</p>
          </button>
        </div>
      </div>
    </div>
  )
}
