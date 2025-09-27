'use client'
import {useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'
import {useFirebaseAuth} from '@/lib/firebase-auth'

export default function AdminDashboard() {
  const router = useRouter()
  const {user, userData, signOut, loading: authLoading} = useFirebaseAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
      } else {
        loadDashboard()
      }
    }
  }, [user, authLoading, router])

  const loadDashboard = async () => {
    try {
      console.log('Loading dashboard stats...')
      const dashboardStats = await AdminService.getDashboardStats()
      console.log('Dashboard stats loaded:', dashboardStats)
      setStats(dashboardStats)
    } catch (error) {
      console.error('Error loading dashboard:', error)
      // Set default stats if loading fails
      setStats({
        events: 0,
        venues: 0,
        orders: 0,
        customers: 0,
        promotions: 0,
        revenue: 0,
        tickets: 0,
        recentOrders: []
      })
    }
    setLoading(false)
  }

  const tabs = [
    {id: 'dashboard', label: 'Dashboard', icon: '📊'},
    {id: 'events', label: 'Events', icon: '🎭'},
    {id: 'venues', label: 'Venues', icon: '🏛️'},
    {id: 'orders', label: 'Orders', icon: '🎫'},
    {id: 'customers', label: 'Customers', icon: '👥'},
    {id: 'promotions', label: 'Promotions', icon: '🎁'},
    {id: 'promoters', label: 'Promoters', icon: '🤝'}
  ]

  const navigateToSection = (section: string) => {
    if (section === 'dashboard') {
      setActiveTab('dashboard')
    } else {
      router.push(`/admin/${section}`)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              Admin CMS - VenueViz
            </h1>
            <div className="flex gap-4 items-center">
              <span className="text-sm text-gray-400">
                {userData?.email} ({userData?.role || 'user'})
              </span>
              <button onClick={() => router.push('/')} className="px-4 py-2 bg-purple-600 rounded-lg">
                View Site
              </button>
              <button 
                onClick={signOut}
                className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-black/20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => navigateToSection(tab.id)}
                className={`py-4 px-2 border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
                  activeTab === tab.id 
                    ? 'border-purple-500 text-white' 
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-3xl font-bold">${(stats?.revenue || 0).toLocaleString()}</p>
            <p className="text-gray-400">Total Revenue</p>
          </div>
          <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-3xl font-bold">{stats?.orders || 0}</p>
            <p className="text-gray-400">Total Orders</p>
          </div>
          <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-3xl font-bold">{stats?.customers || 0}</p>
            <p className="text-gray-400">Customers</p>
          </div>
          <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-3xl font-bold">{stats?.events || 0}</p>
            <p className="text-gray-400">Active Events</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <button 
            onClick={() => router.push('/admin/events')}
            className="p-6 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl border border-purple-500/30 text-left hover:scale-105 transition"
          >
            <div className="text-3xl mb-3">🎭</div>
            <h3 className="font-bold mb-2">Manage Events</h3>
            <p className="text-sm text-gray-400">Create and manage events</p>
          </button>
          <button 
            onClick={() => router.push('/admin/orders')}
            className="p-6 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-xl border border-blue-500/30 text-left hover:scale-105 transition"
          >
            <div className="text-3xl mb-3">🎫</div>
            <h3 className="font-bold mb-2">View Orders</h3>
            <p className="text-sm text-gray-400">Track all orders</p>
          </button>
          <button 
            onClick={() => router.push('/admin/promotions')}
            className="p-6 bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-xl border border-green-500/30 text-left hover:scale-105 transition"
          >
            <div className="text-3xl mb-3">🎁</div>
            <h3 className="font-bold mb-2">Promotions</h3>
            <p className="text-sm text-gray-400">Manage discount codes</p>
          </button>
        </div>
      </div>
    </div>
  )
}
