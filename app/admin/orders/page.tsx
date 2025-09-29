'use client'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'
import {auth} from '@/lib/firebase'
import {onAuthStateChanged} from 'firebase/auth'
import AdminLayout from '@/components/AdminLayout'

export default function OrdersManagement() {
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        loadOrders()
      } else {
        router.push('/login')
      }
    })
    return () => unsubscribe()
  }, [router])

  const loadOrders = async () => {
    try {
      const [ordersData, orderStats] = await Promise.all([
        AdminService.getOrders(),
        AdminService.getOrderStats()
      ])
      setOrders(ordersData)
      setStats(orderStats)
    } catch (error) {
      console.error('Error loading orders:', error)
    }
    setLoading(false)
  }

  const formatCurrency = (amount: any) => {
    return (parseFloat(amount) || 0).toFixed(2)
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Orders Management</h1>
          <p className="text-gray-400">View and manage customer orders</p>
        </div>

        {stats && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
              <p className="text-gray-400 text-sm mb-1">Total Orders</p>
              <p className="text-3xl font-bold">{stats.totalOrders || 0}</p>
            </div>
            <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
              <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
              <p className="text-3xl font-bold">${formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
              <p className="text-gray-400 text-sm mb-1">Avg Order Value</p>
              <p className="text-3xl font-bold">${formatCurrency(stats.averageOrderValue)}</p>
            </div>
            <div className="p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
              <p className="text-gray-400 text-sm mb-1">Completed</p>
              <p className="text-3xl font-bold">{stats.completedOrders || 0}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-gray-400">No orders yet</p>
          </div>
        ) : (
          <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-white/10">
                <tr>
                  <th className="text-left p-4">Order ID</th>
                  <th className="text-left p-4">Customer</th>
                  <th className="text-left p-4">Event</th>
                  <th className="text-left p-4">Amount</th>
                  <th className="text-left p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 font-mono text-sm">
                      {order.orderNumber || order.id.slice(0, 8)}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold">{order.customerName || 'N/A'}</div>
                      <div className="text-sm text-gray-400">{order.customerEmail || ''}</div>
                    </td>
                    <td className="p-4 text-sm">{order.eventName || 'N/A'}</td>
                    <td className="p-4 font-semibold">
                      ${formatCurrency(order.pricing?.total || order.totalAmount || order.total || 0)}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        order.status === 'confirmed' ? 'bg-green-600/20 text-green-400' :
                        order.status === 'cancelled' ? 'bg-red-600/20 text-red-400' :
                        'bg-yellow-600/20 text-yellow-400'
                      }`}>
                        {order.status || 'pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
