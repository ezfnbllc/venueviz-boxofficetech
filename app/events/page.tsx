'use client'

import { useState, useEffect } from 'react'
import { Calendar, MapPin, Clock, Search, Filter, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function EventsPage() {
  const [events, setEvents] = useState([])
  const [filteredEvents, setFilteredEvents] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [priceRange, setPriceRange] = useState([0, 500])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events')
      const data = await res.json()
      setEvents(data.events)
      setFilteredEvents(data.events)
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    filterEvents(term, selectedCategory, priceRange)
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    filterEvents(searchTerm, category, priceRange)
  }

  const filterEvents = (search: string, category: string, price: number[]) => {
    let filtered = events

    if (search) {
      filtered = filtered.filter(event => 
        event.name.toLowerCase().includes(search.toLowerCase()) ||
        event.venue.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (category !== 'all') {
      filtered = filtered.filter(event => event.category === category)
    }

    filtered = filtered.filter(event => 
      event.minPrice >= price[0] && event.maxPrice <= price[1]
    )

    setFilteredEvents(filtered)
  }

  const categories = ['all', 'Musical', 'Classical', 'Jazz', 'Comedy', 'Drama']

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <Link href="/" className="text-purple-400 hover:text-purple-300 mb-4 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-4xl font-bold mb-4">Upcoming Events</h1>
        <p className="text-gray-400">Discover amazing performances and book your seats</p>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="glass p-6 rounded-xl">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search events or venues..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    selectedCategory === cat
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {cat === 'all' ? 'All Events' : cat}
                </button>
              ))}
            </div>

            {/* AI Recommendations */}
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
              <Sparkles className="w-4 h-4" />
              AI Picks
            </button>
          </div>

          {/* Price Range */}
          <div className="mt-4">
            <label className="text-sm text-gray-400">Price Range: ${priceRange[0]} - ${priceRange[1]}</label>
            <input
              type="range"
              min="0"
              max="500"
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
              className="w-full mt-2"
            />
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass rounded-xl overflow-hidden hover:scale-105 transition-transform"
              >
                <div className="aspect-[3/4] bg-gradient-to-br from-purple-600/20 to-pink-600/20 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl opacity-20">🎭</span>
                  </div>
                  {event.availableSeats < 50 && (
                    <div className="absolute top-2 right-2 bg-red-500 px-2 py-1 rounded text-xs">
                      Only {event.availableSeats} left!
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-bold mb-2">{event.name}</h3>
                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {event.date}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {event.time}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {event.venue}
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-400">From</p>
                      <p className="text-lg font-bold">${event.minPrice}</p>
                    </div>
                    <Link 
                      href={`/box-office?event=${event.id}`}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-semibold"
                    >
                      Book Now
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {filteredEvents.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-400">No events found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  )
}
