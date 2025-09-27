'use client'
import {useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import {db} from '@/lib/firebase'
import {collection, getDocs, query, orderBy} from 'firebase/firestore'

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalEvents: 0,
    totalCustomers: 0
  })
  const [orders, setOrders] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!document.cookie.includes('auth=true')) {
      router.push('/login')
      return
    }
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [ordersSnap, eventsSnap] = await Promise.all([
        getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'events'), orderBy('date', 'asc')))
      ])

      const ordersData = ordersSnap.docs.map(doc => ({id: doc.id, ...doc.data()}))
      const eventsData = eventsSnap.docs.map(doc => ({id: doc.id, ...doc.data()}))

      setOrders(ordersData)
      setEvents(eventsData)
      
      const totalRevenue = ordersData.reduce((sum, order) => sum + (order.total || 0), 0)
      
      setStats({
        totalRevenue,
        totalOrders: ordersData.length,
        totalEvents: eventsData.length,
        totalCustomers: new Set(ordersData.map(o => o.customerEmail)).size
      })
    } catch (e) {
      console.error('Error loading data:', e)
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
    {id: 'analytics', label: 'Analytics', icon: '📈'}
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              Admin CMS
            </h1>
            <div className="flex gap-4">
              <button onClick={() => router.push('/')} className="px-4 py-2 bg-purple-600 rounded-lg">
                View Site
              </button>
              <button 
                onClick={() => {
                  document.cookie = 'auth=;max-age=0;path=/'
                  router.push('/login')
                }}
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
                onClick={() => setActiveTab(tab.id)}
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

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid md:grid-cols-4 gap-6">
                  <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
                    <p className="text-3xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
                    <p className="text-gray-400">Total Revenue</p>
                  </div>
                  <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
                    <p className="text-3xl font-bold">{stats.totalOrders}</p>
                    <p className="text-gray-400">Total Orders</p>
                  </div>
                  <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
                    <p className="text-3xl font-bold">{stats.totalEvents}</p>
                    <p className="text-gray-400">Active Events</p>
                  </div>
                  <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
                    <p className="text-3xl font-bold">{stats.totalCustomers}</p>
                    <p className="text-gray-400">Customers</p>
                  </div>
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
                          <th className="text-left py-2">Seats</th>
                          <th className="text-left py-2">Total</th>
                          <th className="text-left py-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 10).map(order => (
                          <tr key={order.id} className="border-b border-white/5">
                            <td className="py-2">{order.orderId}</td>
                            <td className="py-2">{order.customerEmail}</td>
                            <td className="py-2">{order.seats?.length || 0}</td>
                            <td className="py-2">${order.total?.toFixed(2)}</td>
                            <td className="py-2">{new Date(order.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'events' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Event Management</h2>
                  <button 
                    onClick={() => router.push('/admin/events/new')}
                    className="px-6 py-2 bg-purple-600 rounded-lg"
                  >
                    + Add Event
                  </button>
                </div>

                <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                  <div className="grid gap-4">
                    {events.map(event => (
                      <div key={event.id} className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                        <div>
                          <p className="font-bold">{event.name}</p>
                          <p className="text-sm text-gray-400">{event.venue} • {event.date}</p>
                        </div>
                        <div className="flex gap-2">
                          <button className="px-4 py-2 bg-purple-600/20 rounded-lg">Edit</button>
                          <button className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Order Management</h2>
                <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-white/10">
                        <tr>
                          <th className="text-left py-2">Order ID</th>
                          <th className="text-left py-2">Customer</th>
                          <th className="text-left py-2">Email</th>
                          <th className="text-left py-2">Phone</th>
                          <th className="text-left py-2">Total</th>
                          <th className="text-left py-2">Status</th>
                          <th className="text-left py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(order => (
                          <tr key={order.id} className="border-b border-white/5">
                            <td className="py-2">{order.orderId}</td>
                            <td className="py-2">{order.customerName}</td>
                            <td className="py-2">{order.customerEmail}</td>
                            <td className="py-2">{order.customerPhone}</td>
                            <td className="py-2">${order.total?.toFixed(2)}</td>
                            <td className="py-2">
                              <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">
                                {order.status}
                              </span>
                            </td>
                            <td className="py-2">
                              <button className="text-purple-400 hover:text-purple-300">View</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Add more tab content as needed */}
          </>
        )}
      </div>
    </div>
  )
}
