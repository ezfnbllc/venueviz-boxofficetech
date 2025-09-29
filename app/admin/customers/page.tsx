'use client'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'
import {auth} from '@/lib/firebase'
import {onAuthStateChanged} from 'firebase/auth'
import AdminLayout from '@/components/AdminLayout'

export default function CustomersManagement() {
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        loadCustomers()
      } else {
        router.push('/login')
      }
    })
    return () => unsubscribe()
  }, [router])

  const loadCustomers = async () => {
    try {
      const customersData = await AdminService.getCustomers()
      const normalizedCustomers = customersData.map(customer => ({
        ...customer,
        totalSpent: customer.totalSpent || 0,
        totalOrders: customer.totalOrders || 0,
        email: customer.email || '',
        name: customer.name || 'Unknown',
        phone: customer.phone || ''
      }))
      setCustomers(normalizedCustomers.sort((a, b) => b.totalSpent - a.totalSpent))
    } catch (error) {
      console.error('Error loading customers:', error)
    }
    setLoading(false)
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-gray-400">View customer information and purchase history</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
          </div>
        ) : customers.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-12 text-center">
            <p className="text-gray-400">No customers yet</p>
          </div>
        ) : (
          <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-white/10">
                <tr>
                  <th className="text-left p-4">Customer</th>
                  <th className="text-left p-4">Contact</th>
                  <th className="text-center p-4">Orders</th>
                  <th className="text-right p-4">Total Spent</th>
                  <th className="text-center p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer, idx) => (
                  <tr key={customer.id || idx} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4">
                      <div className="font-semibold">{customer.name}</div>
                      <div className="text-sm text-gray-400">{customer.email}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-400">
                      {customer.phone || 'No phone'}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-3 py-1 bg-purple-600/20 rounded-full text-sm">
                        {customer.totalOrders || 0}
                      </span>
                    </td>
                    <td className="p-4 text-right font-semibold">
                      ${(customer.totalSpent || 0).toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        (customer.totalSpent || 0) > 100 
                          ? 'bg-yellow-600/20 text-yellow-400' 
                          : 'bg-gray-600/20 text-gray-400'
                      }`}>
                        {(customer.totalSpent || 0) > 100 ? 'VIP' : 'Regular'}
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
