'use client'
import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { AdminService } from '@/lib/admin/adminService'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<any[]>([])
  const [venues, setVenues] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [promotions, setPromotions] = useState<any[]>([])
  const [promoters, setPromoters] = useState<any[]>([])
  const [orderStats, setOrderStats] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        await loadDashboardData()
      } else {
        window.location.href = '/admin/login'
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [eventsData, venuesData, ordersData, customersData, promotionsData, promotersData, statsData] = await Promise.all([
        AdminService.getEvents(),
        AdminService.getVenues(),
        AdminService.getOrders(),
        AdminService.getCustomers(),
        AdminService.getPromotions(),
        AdminService.getPromoters(),
        AdminService.getOrderStats()
      ])

      setEvents(eventsData)
      setVenues(venuesData)
      setOrders(ordersData)
      setCustomers(customersData)
      setPromotions(promotionsData)
      setPromoters(promotersData)
      setOrderStats(statsData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const monthlyRevenueData = [
    { name: 'Jan', revenue: 0 },
    { name: 'Feb', revenue: 0 },
    { name: 'Mar', revenue: 0 },
    { name: 'Apr', revenue: 0 },
    { name: 'May', revenue: 0 },
    { name: 'Jun', revenue: 0 },
    { name: 'Jul', revenue: 0 },
    { name: 'Aug', revenue: 0 },
    { name: 'Sep', revenue: 0 },
    { name: 'Oct', revenue: 0 },
    { name: 'Nov', revenue: 0 },
    { name: 'Dec', revenue: 0 },
  ]

  const orderStatusData = [
    { name: 'Confirmed', value: orderStats?.confirmed || 0, color: '#10B981' },
    { name: 'Pending', value: orderStats?.pending || 0, color: '#F59E0B' },
    { name: 'Cancelled', value: orderStats?.cancelled || 0, color: '#EF4444' },
  ]

  const totalRevenue = orderStats?.totalRevenue || 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Overview Tabs */}
      <div className="p-8 border-b border-white/10">
        <div className="flex gap-4">
          <button className="px-6 py-2 bg-purple-600 rounded-lg">Overview</button>
          <button className="px-6 py-2 bg-white/10 rounded-lg hover:bg-white/20">Analytics</button>
          <button className="px-6 py-2 bg-white/10 rounded-lg hover:bg-white/20">AI Assistant</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          {/* Events Card */}
          <div className="bg-gradient-to-br from-purple-900/50 to-purple-700/30 rounded-xl p-6 border border-purple-500/20">
            <p className="text-gray-300 text-sm mb-2">Events</p>
            <p className="text-4xl font-bold mb-4">{events.length}</p>
            <Link href="/admin/events" className="text-purple-400 hover:text-purple-300">
              Manage →
            </Link>
          </div>

          {/* Venues Card */}
          <div className="bg-gradient-to-br from-blue-900/50 to-blue-700/30 rounded-xl p-6 border border-blue-500/20">
            <p className="text-gray-300 text-sm mb-2">Venues</p>
            <p className="text-4xl font-bold mb-4">{venues.length}</p>
            <Link href="/admin/venues" className="text-blue-400 hover:text-blue-300">
              View →
            </Link>
          </div>

          {/* Orders Card */}
          <div className="bg-gradient-to-br from-green-900/50 to-green-700/30 rounded-xl p-6 border border-green-500/20">
            <p className="text-gray-300 text-sm mb-2">Orders</p>
            <p className="text-4xl font-bold mb-4">{orders.length}</p>
            <Link href="/admin/orders" className="text-green-400 hover:text-green-300">
              Details →
            </Link>
          </div>

          {/* Customers Card */}
          <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-700/30 rounded-xl p-6 border border-yellow-500/20">
            <p className="text-gray-300 text-sm mb-2">Customers</p>
            <p className="text-4xl font-bold mb-4">{customers.length}</p>
            <Link href="/admin/customers" className="text-yellow-400 hover:text-yellow-300">
              View →
            </Link>
          </div>

          {/* Promotions Card */}
          <div className="bg-gradient-to-br from-pink-900/50 to-pink-700/30 rounded-xl p-6 border border-pink-500/20">
            <p className="text-gray-300 text-sm mb-2">Promotions</p>
            <p className="text-4xl font-bold mb-4">{promotions.length}</p>
            <Link href="/admin/promotions" className="text-pink-400 hover:text-pink-300">
              Manage →
            </Link>
          </div>

          {/* Promoters Card */}
          <div className="bg-gradient-to-br from-indigo-900/50 to-indigo-700/30 rounded-xl p-6 border border-indigo-500/20">
            <p className="text-gray-300 text-sm mb-2">Promoters</p>
            <p className="text-4xl font-bold mb-4">{promoters.length}</p>
            <Link href="/admin/promoters" className="text-indigo-400 hover:text-indigo-300">
              View →
            </Link>
          </div>

          {/* Revenue Card */}
          <div className="bg-gradient-to-br from-emerald-900/50 to-emerald-700/30 rounded-xl p-6 border border-emerald-500/20 md:col-span-2">
            <p className="text-gray-300 text-sm mb-2">Revenue</p>
            <p className="text-4xl font-bold mb-2">${totalRevenue.toFixed(2)}</p>
            <p className="text-sm text-gray-400">Total</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Revenue Chart */}
          <div className="bg-gray-900 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4">Monthly Revenue</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                  labelStyle={{ color: '#9CA3AF' }}
                />
                <Bar dataKey="revenue" fill="#A855F7" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Order Status Chart */}
          <div className="bg-gray-900 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4">Order Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                  labelStyle={{ color: '#9CA3AF' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              {orderStatusData.map((status) => (
                <div key={status.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                  <span className="text-sm text-gray-400">
                    {status.name}: {status.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <div className="bg-gray-900 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4">Recent Orders</h3>
            {orders.length > 0 ? (
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-semibold">{order.customerName}</p>
                      <p className="text-sm text-gray-400">{order.eventName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${order.total?.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">{order.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No recent orders</p>
            )}
          </div>

          {/* Recent Customers */}
          <div className="bg-gray-900 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4">Recent Customers</h3>
            {customers.length > 0 ? (
              <div className="space-y-3">
                {customers.slice(0, 5).map((customer) => (
                  <div key={customer.id} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-semibold">{customer.name}</p>
                      <p className="text-sm text-gray-400">{customer.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No recent customers</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
