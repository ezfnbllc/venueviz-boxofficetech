'use client'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'
import {auth} from '@/lib/firebase'
import {onAuthStateChanged} from 'firebase/auth'

export default function OrdersManagement() {
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Wait for auth before fetching
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        console.log('Orders page - User authenticated:', firebaseUser.email)
        setUser(firebaseUser)
        loadOrders()
      } else {
        console.log('Orders page - No user')
        router.push('/login')
      }
    })
    
    return () => unsubscribe()
  }, [router])

  const loadOrders = async () => {
    try {
      console.log('Loading orders...')
      const [ordersData, orderStats] = await Promise.all([
        AdminService.getOrders(),
        AdminService.getOrderStats()
      ])
      console.log('Orders loaded:', ordersData.length)
      setOrders(ordersData)
      setStats(orderStats)
    } catch (error) {
      console.error('Error loading orders:', error)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Orders Management</h1>
            <p className="text-gray-400">View and manage customer orders</p>
          </div>
          <button onClick={() => router.push('/admin')} className="px-4 py-2 bg-gray-600 rounded-lg">
            Back to Dashboard
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
              <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
              <p className="text-gray-400">Total Revenue</p>
            </div>
            <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
              <p className="text-2xl font-bold">{stats.totalOrders}</p>
              <p className="text-gray-400">Total Orders</p>
            </div>
            <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
              <p className="text-2xl font-bold">{stats.totalTickets}</p>
              <p className="text-gray-400">Tickets Sold</p>
            </div>
            <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
              <p className="text-2xl font-bold">${stats.avgOrderValue.toFixed(2)}</p>
              <p className="text-gray-400">Avg Order Value</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
          </div>
        ) : (
          <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            {orders.length === 0 ? (
              <p className="text-center py-8 text-gray-400">
                No orders found. Orders will appear here once customers make purchases.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-white/10">
                    <tr>
                      <th className="text-left py-2">Order ID</th>
                      <th className="text-left py-2">Customer</th>
                      <th className="text-left py-2">Email</th>
                      <th className="text-left py-2">Event</th>
                      <th className="text-left py-2">Seats</th>
                      <th className="text-left py-2">Total</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id} className="border-b border-white/5">
                        <td className="py-2">{order.orderId || order.id.slice(0,8)}</td>
                        <td className="py-2">{order.customerName}</td>
                        <td className="py-2">{order.customerEmail}</td>
                        <td className="py-2">{order.eventName}</td>
                        <td className="py-2">{order.seats?.length || 0}</td>
                        <td className="py-2">${order.total?.toFixed(2)}</td>
                        <td className="py-2">
                          <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">
                            {order.status}
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
            )}
          </div>
        )}
      </div>
    </div>
  )
}
