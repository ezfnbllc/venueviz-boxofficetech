'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminService } from '@/lib/admin/adminService'
import AdminHeader from '@/components/admin/AdminHeader'

export default function EventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    setLoading(true)
    try {
      const eventsData = await AdminService.getEvents()
      setEvents(eventsData)
    } catch (error) {
      console.error('Error loading events:', error)
    }
    setLoading(false)
  }

  const handleCreateNew = () => {
    router.push('/admin/events/new')
  }

  const handleEdit = (eventId: string) => {
    router.push(`/admin/events/edit/${eventId}`)
  }

  const handleDelete = async (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await AdminService.deleteEvent(eventId)
        loadEvents()
      } catch (error) {
        console.error('Error deleting event:', error)
      }
    }
  }

  const filteredEvents = events.filter(event => {
    const matchesFilter = filter === 'all' || event.status === filter
    const matchesSearch = searchTerm === '' || 
      event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.venueName?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <>
      <AdminHeader />
      <div className="min-h-screen bg-gray-950 text-white p-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Events Management</h1>
              <p className="text-gray-400">Create and manage events, tickets, and performances</p>
            </div>
            <button
              onClick={handleCreateNew}
              className="px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
            >
              + Create Event
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 bg-white/10 rounded-lg flex-1 max-w-md focus:bg-white/20 outline-none"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="published">Published</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(event => (
              <div key={event.id} className="bg-gray-900 rounded-xl overflow-hidden hover:shadow-xl transition-shadow">
                {event.images?.cover ? (
                  <img 
                    src={event.images.cover} 
                    alt={event.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-purple-600/20 to-purple-800/20 flex items-center justify-center">
                    <span className="text-6xl opacity-30">🎭</span>
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold">{event.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      event.status === 'published' ? 'bg-green-600' :
                      event.status === 'draft' ? 'bg-gray-600' :
                      event.status === 'pending_approval' ? 'bg-yellow-600' :
                      'bg-red-600'
                    }`}>
                      {event.status?.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {event.description}
                  </p>
                  
                  <div className="space-y-2 text-sm text-gray-400 mb-4">
                    {event.venueName && (
                      <p>📍 {event.venueName}</p>
                    )}
                    {event.schedule?.performances?.[0]?.date && (
                      <p>�� {new Date(event.schedule.performances[0].date).toLocaleDateString()}</p>
                    )}
                    {event.pricing?.length > 0 && (
                      <p>💵 Starting from ${Math.min(...event.pricing.map((p: any) => p.basePrice))}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(event.id)}
                      className="flex-1 px-4 py-2 bg-purple-600 rounded hover:bg-purple-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No events found</p>
            <button
              onClick={handleCreateNew}
              className="px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create Your First Event
            </button>
          </div>
        )}
      </div>
    </>
  )
}
