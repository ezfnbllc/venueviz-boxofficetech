'use client'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'

export default function CustomersManagement() {
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!document.cookie.includes('auth=true')) {
      router.push('/login')
      return
    }
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      const customersData = await AdminService.getCustomers()
      setCustomers(customersData.sort((a, b) => b.totalSpent - a.totalSpent))
    } catch (error) {
      console.error('Error loading customers:', error)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Customers</h1>
            <p className="text-gray-400">View customer information and purchase history</p>
          </div>
          <button onClick={() => router.push('/admin')} className="px-4 py-2 bg-gray-600 rounded-lg">
            Back to Dashboard
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
          </div>
        ) : (
          <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="text-left py-2">Name</th>
                    <th className="text-left py-2">Email</th>
                    <th className="text-left py-2">Orders</th>
                    <th className="text-left py-2">Total Spent</th>
                    <th className="text-left py-2">Customer Type</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-2">{customer.name}</td>
                      <td className="py-2">{customer.email}</td>
                      <td className="py-2">{customer.orders.length}</td>
                      <td className="py-2">${customer.totalSpent.toFixed(2)}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          customer.totalSpent > 500 
                            ? 'bg-purple-600/20 text-purple-400' 
                            : 'bg-blue-600/20 text-blue-400'
                        }`}>
                          {customer.totalSpent > 500 ? 'VIP' : 'Regular'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
