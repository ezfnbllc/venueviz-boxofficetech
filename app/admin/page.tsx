'use client'
import { useState, useEffect } from 'react'
import { AdminService } from '@/lib/admin/adminService'
import Link from 'next/link'

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const dashboardStats = await AdminService.getDashboardStats()
      setStats(dashboardStats)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    }
    setLoading(false)
  }

  const statCards = [
    { 
      title: 'Events', 
      value: stats?.totalEvents || 0, 
      color: 'purple',
      link: '/admin/events',
      subtext: `${stats?.activeEvents || 0} active`
    },
    { 
      title: 'Venues', 
      value: stats?.totalVenues || 0, 
      color: 'blue',
      link: '/admin/venues',
      subtext: `${stats?.activeVenues || 0} active`
    },
    { 
      title: 'Orders', 
      value: stats?.totalOrders || 0, 
      color: 'green',
      link: '/admin/orders',
      subtext: 'Total sales'
    },
    { 
      title: 'Customers', 
      value: stats?.totalCustomers || 0, 
      color: 'yellow',
      link: '/admin/customers',
      subtext: 'Registered users'
    },
    { 
      title: 'Promoters', 
      value: stats?.totalPromoters || 0, 
      color: 'pink',
      link: '/admin/promoters',
      subtext: 'Active partners'
    },
    { 
      title: 'Revenue', 
      value: `$${(stats?.monthlyRevenue || 0).toFixed(2)}`, 
      color: 'emerald',
      link: '/admin/analytics',
      subtext: `${stats?.revenueGrowth || 0}% growth`
    }
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
        <p className="text-gray-400">Welcome back! Here's what's happening with your events.</p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <Link href={stat.link} key={index}>
              <div className={`bg-gray-900 rounded-xl p-6 hover:bg-gray-800 transition-colors cursor-pointer border border-${stat.color}-500/20`}>
                <h3 className="text-gray-400 text-sm mb-2">{stat.title}</h3>
                <p className="text-3xl font-bold mb-1">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.subtext}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gray-900 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link href="/admin/events/new">
            <button className="w-full px-4 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors">
              + Create Event
            </button>
          </Link>
          <Link href="/admin/venues/new">
            <button className="w-full px-4 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              + Add Venue
            </button>
          </Link>
          <Link href="/admin/promoters">
            <button className="w-full px-4 py-3 bg-pink-600 rounded-lg hover:bg-pink-700 transition-colors">
              + Add Promoter
            </button>
          </Link>
          <Link href="/admin/promotions">
            <button className="w-full px-4 py-3 bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
              + Create Promotion
            </button>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-900 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
          <p className="text-gray-400">No recent orders</p>
        </div>
        
        <div className="bg-gray-900 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Recent Customers</h2>
          <p className="text-gray-400">No recent customers</p>
        </div>
      </div>
    </div>
  )
}
