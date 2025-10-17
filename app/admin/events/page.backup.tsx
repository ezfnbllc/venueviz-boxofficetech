'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminService } from '@/lib/admin/adminService'

export default function EventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [venues, setVenues] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [eventsData, venuesData] = await Promise.all([
        AdminService.getEvents(),
        AdminService.getVenues()
      ])
      
      const venueMap = new Map()
      venuesData.forEach((venue: any) => {
        venueMap.set(venue.id, venue.name)
      })
      
      setEvents(eventsData)
      setVenues(venueMap)
    } catch (error) {
      console.error('Error loading data:', error)
    }
    setLoading(false)
  }

  const handleDelete = async (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await AdminService.deleteEvent(eventId)
        await loadData()
      } catch (error) {
        console.error('Error deleting event:', error)
        alert('Error deleting event')
      }
    }
  }

  const toggleEventSelection = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    )
  }

  const handleBulkDelete = async () => {
    if (selectedEvents.length === 0) return
    
    if (confirm(`Delete ${selectedEvents.length} selected events?`)) {
      try {
        await Promise.all(selectedEvents.map(id => AdminService.deleteEvent(id)))
        setSelectedEvents([])
        await loadData()
      } catch (error) {
        console.error('Error deleting events:', error)
        alert('Error deleting some events')
      }
    }
  }

  const getVenueName = (event: any) => {
    if (event.venue && event.venue !== 'TBD' && !event.venue.includes('UDVBOF')) {
      return event.venue
    }
    
    if (event.venueId && venues.has(event.venueId)) {
      return venues.get(event.venueId)
    }
    
    if (event.venueName) {
      return event.venueName
    }
    
    return 'Venue TBD'
  }

  const formatEventDate = (event: any) => {
    const dateValue = event.date || 
                     event.schedule?.performances?.[0]?.date || 
                     event.performances?.[0]?.date
    
    if (!dateValue) return 'Date TBD'
    
    try {
      const date = new Date(dateValue)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    } catch {
      return 'Date TBD'
    }
  }

  const formatPrice = (event: any) => {
    if (event.price && typeof event.price === 'string') {
      return event.price
    }
    
    if (event.pricing?.tiers?.length > 0) {
      const prices = event.pricing.tiers
        .map((t: any) => t.basePrice || 0)
        .filter((p: number) => p > 0)
      
      if (prices.length > 0) {
        const min = Math.min(...prices)
        const max = Math.max(...prices)
        return min === max ? `$${min}` : `$${min} - $${max}`
      }
    }
    
    return '$0'
  }

  // Get the event image URL
  const getEventImage = (event: any) => {
    // Check various possible image fields
    if (event.images?.cover) return event.images.cover
    if (event.images?.[0]) return event.images[0]
    if (event.image) return event.image
    if (event.coverImage) return event.coverImage
    if (event.thumbnail) return event.thumbnail
    if (event.imageUrl) return event.imageUrl
    if (event.scrapeUrl) return event.scrapeUrl
    return null
  }

  // Apply filters
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          getVenueName(event).toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && (event.status === 'active' || event.status === 'published')) ||
                         (statusFilter === 'draft' && event.status === 'draft') ||
                         (statusFilter === 'cancelled' && event.status === 'cancelled')
    
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Events Management</h1>
        <p className="text-gray-400">Create and manage events</p>
      </div>

      <div className="mb-6 flex flex-col lg:flex-row gap-4">
        <input
          type="text"
          placeholder="Search events..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
        />
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="active">Active/Published</option>
          <option value="draft">Draft</option>
          <option value="cancelled">Cancelled</option>
        </select>
        
        {selectedEvents.length > 0 && (
          <button
            onClick={handleBulkDelete}
            className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700"
          >
            Delete {selectedEvents.length} selected
          </button>
        )}
        
        <button
          onClick={() => router.push('/admin/events/new')}
          className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700"
        >
          + Create Event
        </button>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 bg-black/40 rounded-xl">
          <p className="text-gray-400">
            {searchTerm || statusFilter !== 'all' 
              ? 'No events found matching your filters' 
              : 'No events found. Create your first event!'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const eventImage = getEventImage(event)
            const isSelected = selectedEvents.includes(event.id)
            
            return (
              <div key={event.id} className={`bg-black/40 backdrop-blur-xl rounded-xl overflow-hidden hover:bg-black/50 transition-all ${
                isSelected ? 'ring-2 ring-purple-500' : ''
              }`}>
                <div className="relative">
                  {eventImage ? (
                    <img 
                      src={eventImage} 
                      alt={event.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        // Fallback if image fails to load
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-48 bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center ${
                    eventImage ? 'hidden' : ''
                  }`}>
                    <span className="text-4xl">🎭</span>
                  </div>
                  
                  {/* Selection checkbox */}
                  <div className="absolute top-2 left-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleEventSelection(event.id)}
                      className="w-5 h-5 accent-purple-600 cursor-pointer"
                    />
                  </div>
                  
                  {/* Status badge */}
                  <div className="absolute top-2 right-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      event.status === 'published' || event.status === 'active'
                        ? 'bg-green-600 text-white'
                        : event.status === 'draft'
                        ? 'bg-gray-600 text-white'
                        : event.status === 'cancelled'
                        ? 'bg-red-600 text-white'
                        : 'bg-yellow-600 text-white'
                    }`}>
                      {event.status?.charAt(0).toUpperCase() + event.status?.slice(1) || 'Active'}
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-3 line-clamp-1">{event.name}</h3>
                  
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex items-center gap-2">
                      <span>📍</span>
                      <span className="truncate">{getVenueName(event)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      <span>{formatEventDate(event)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span>💰</span>
                      <span>{formatPrice(event)}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-400 text-sm mt-3 line-clamp-2">
                    {event.description || 'No description available'}
                  </p>
                  
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => router.push(`/admin/events/edit/${event.id}`)}
                      className="flex-1 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="flex-1 px-4 py-2 bg-red-600/80 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
