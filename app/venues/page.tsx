'use client'

import { useState } from 'react'
import { Users, MapPin, Star, Eye, Edit, Plus } from 'lucide-react'
import Link from 'next/link'

export default function VenuesPage() {
  const [venues] = useState([
    {
      id: '1',
      name: 'Main Theater',
      address: '123 Broadway Ave',
      capacity: 500,
      sections: 3,
      rating: 4.8,
      image: '/api/placeholder/400/300',
      occupancyRate: 85,
      upcomingEvents: 12
    },
    {
      id: '2',
      name: 'Concert Hall',
      address: '456 Symphony Blvd',
      capacity: 800,
      sections: 4,
      rating: 4.9,
      image: '/api/placeholder/400/300',
      occupancyRate: 92,
      upcomingEvents: 8
    },
    {
      id: '3',
      name: 'Jazz Club',
      address: '789 Melody Lane',
      capacity: 200,
      sections: 2,
      rating: 4.7,
      image: '/api/placeholder/400/300',
      occupancyRate: 78,
      upcomingEvents: 15
    },
    {
      id: '4',
      name: 'Amphitheater',
      address: '321 Park Road',
      capacity: 2000,
      sections: 5,
      rating: 4.6,
      image: '/api/placeholder/400/300',
      occupancyRate: 70,
      upcomingEvents: 6
    }
  ])

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-purple-400 hover:text-purple-300 mb-4 inline-block">
            ← Back to Home
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Venue Management</h1>
              <p className="text-gray-400">Configure and manage your venue spaces</p>
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold">
              <Plus className="w-5 h-5" />
              Add Venue
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass p-6 rounded-xl">
            <h3 className="text-sm text-gray-400 mb-2">Total Venues</h3>
            <p className="text-3xl font-bold">4</p>
          </div>
          <div className="glass p-6 rounded-xl">
            <h3 className="text-sm text-gray-400 mb-2">Total Capacity</h3>
            <p className="text-3xl font-bold">3,500</p>
          </div>
          <div className="glass p-6 rounded-xl">
            <h3 className="text-sm text-gray-400 mb-2">Avg Occupancy</h3>
            <p className="text-3xl font-bold">81%</p>
          </div>
          <div className="glass p-6 rounded-xl">
            <h3 className="text-sm text-gray-400 mb-2">Active Events</h3>
            <p className="text-3xl font-bold">41</p>
          </div>
        </div>

        {/* Venues Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map(venue => (
            <div key={venue.id} className="glass rounded-xl overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-purple-600/20 to-pink-600/20 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl opacity-20">🏛️</span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{venue.name}</h3>
                    <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {venue.address}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-1 rounded">
                    <Star className="w-3 h-3 text-yellow-400" />
                    <span className="text-sm text-yellow-400">{venue.rating}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-400">Capacity</p>
                    <p className="text-lg font-semibold flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {venue.capacity}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Sections</p>
                    <p className="text-lg font-semibold">{venue.sections}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Occupancy</p>
                    <p className="text-lg font-semibold">{venue.occupancyRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Events</p>
                    <p className="text-lg font-semibold">{venue.upcomingEvents}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
