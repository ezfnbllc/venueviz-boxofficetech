'use client'
import {useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'
import ProtectedRoute from '@/components/ProtectedRoute'
import {useFirebaseAuth} from '@/lib/firebase-auth'

function AdminDashboardContent() {
  const router = useRouter()
  const {signOut, userData} = useFirebaseAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const dashboardStats = await AdminService.getDashboardStats()
      setStats(dashboardStats)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    }
    setLoading(false)
  }

  const tabs = [
    {id: 'dashboard', label: 'Dashboard', icon: '📊'},
    {id: 'events', label: 'Events', icon: '🎭'},
    {id: 'venues', label: 'Venues', icon: '🏛️'},
    {id: 'orders', label: 'Orders', icon: '🎫'},
    {id: 'customers', label: 'Customers', icon: '👥'},
    {id: 'promotions', label: 'Promotions', icon: '🎁'}
  ]

  const navigateToSection = (section: string) => {
    if (section === 'dashboard') {
      setActiveTab('dashboard')
    } else {
      router.push(`/admin/${section}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
      </div>
    )
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
        <div className="grid md:grid-cols-3 gap-6 mb-8">
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

        {/* Recent Orders */}
        <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/10">
                <tr>
                  <th className="text-left py-2">Order ID</th>
                  <th className="text-left py-2">Customer</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentOrders?.map((order: any) => (
                  <tr key={order.id} className="border-b border-white/5">
                    <td className="py-2">{order.orderId || order.id.slice(0,8)}</td>
                    <td className="py-2">{order.customerEmail}</td>
                    <td className="py-2">${order.total?.toFixed(2)}</td>
                    <td className="py-2">
                      <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">
                        {order.status || 'confirmed'}
                      </span>
                    </td>
                    <td className="py-2">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <ProtectedRoute requirePromoter>
      <AdminDashboardContent />
    </ProtectedRoute>
  )
}
