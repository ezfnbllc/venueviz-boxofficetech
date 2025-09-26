'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [activeView, setActiveView] = useState('dashboard')
  
  const stats = [
    { label: "Today's Revenue", value: '$24,580', change: '+12%' },
    { label: 'Tickets Sold', value: '342', change: '+8%' },
    { label: 'Occupancy Rate', value: '78%', change: '+5%' },
    { label: 'Active Events', value: '12', change: '5 this week' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <nav className="bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            VenueViz
          </h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Admin Login
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-white mb-4">
            AI-Powered Venue Management
          </h2>
          <p className="text-xl text-gray-300">
            Transform your venue operations with intelligent ticketing and analytics
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, i) => (
            <div key={i} className="p-6 bg-black/30 backdrop-blur-xl rounded-xl border border-white/10">
              <p className="text-3xl font-bold text-white mb-2">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
              <p className="text-sm text-green-400 mt-2">{stat.change}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push('/login')}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:opacity-90 text-lg"
          >
            Access Admin Dashboard
          </button>
          <p className="text-sm text-gray-400 mt-4">
            Demo: admin@venueviz.com / ChangeMeNow!
          </p>
        </div>
      </div>
    </div>
  )
}
