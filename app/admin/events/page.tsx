'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import { AdminService } from '@/lib/admin/adminService'
import { usePromoterFiltering } from '@/lib/hooks/usePromoterFiltering'
import StatusMultiSelect from '@/components/admin/StatusMultiSelect'

export default function EventsPage() {
  const router = useRouter()
  const { user, isAdmin } = useFirebaseAuth()
  const [allEvents, setAllEvents] = useState<any[]>([])
  const [filteredEvents, setFilteredEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPromoterId, setCurrentPromoterId] = useState<string>()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>(['active', 'published'])

  const { activePromoterIds, shouldFilter } = usePromoterFiltering(isAdmin, currentPromoterId)

  console.log('[Events] isAdmin:', isAdmin, 'activePromoterIds:', activePromoterIds)

  // Load ALL events using AdminService
  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true)
      try {
        const events = await AdminService.getEvents()
        console.log('[Events] Loaded from AdminService:', events.length, 'events')
        setAllEvents(events)
      } catch (error) {
        console.error('Error loading events:', error)
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [])

  // Apply filtering
  useEffect(() => {
    let events = allEvents

    // Apply search filter
    if (searchTerm) {
      events = events.filter(event =>
        event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.venueName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    events = events.filter(event =>
      statusFilter.includes(event.status)
    )

    // Apply promoter filter
    if (shouldFilter && activePromoterIds && activePromoterIds.length > 0) {
      events = events.filter(event => {
        const eventPromoterId = event.promoter?.promoterId || event.promoterId
        if (!eventPromoterId && isAdmin) return true
        return activePromoterIds.includes(eventPromoterId)
      })
      console.log('[Events] Filtered to', events.length, 'events')
    } else if (shouldFilter && (!activePromoterIds || activePromoterIds.length === 0)) {
      events = []
    }

    setFilteredEvents(events)
  }, [allEvents, searchTerm, statusFilter, activePromoterIds, shouldFilter, isAdmin])

  const handleCreateEvent = () => {
    router.push('/admin/events/new')
  }

  const handleEditEvent = (eventId: string) => {
    router.push(`/admin/events/edit/${eventId}`)
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      await AdminService.deleteEvent(eventId)
      setAllEvents(allEvents.filter(e => e.id !== eventId))
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Failed to delete event')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-accent-500"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Events</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Showing {filteredEvents.length} of {allEvents.length} events
          </p>
        </div>
        <button
          onClick={handleCreateEvent}
          className="px-6 py-3 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium transition-colors"
        >
          + Create Event
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search events..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 text-slate-900 dark:text-white placeholder-slate-400"
        />
        <StatusMultiSelect
          selectedStatuses={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

      {filteredEvents.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            {shouldFilter && activePromoterIds?.length === 0
              ? 'No promoters selected. Please select promoters from the filter above.'
              : searchTerm
              ? 'No events match your search.'
              : 'No events found. Create your first event to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(event => (
            <div
              key={event.id}
              className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-accent-500 dark:hover:border-accent-500 transition-all shadow-sm"
            >
              {event.images?.cover && (
                <div className="h-48 bg-slate-100 dark:bg-slate-700">
                  <img
                    src={event.images.cover}
                    alt={event.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{event.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${
                    event.status === 'published' || event.status === 'active'
                      ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                      : event.status === 'draft'
                      ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                      : 'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400'
                  }`}>
                    {event.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
                  {event.venueName && (
                    <p>📍 {event.venueName}</p>
                  )}
                  {event.schedule?.performances?.[0]?.date && (
                    <p>📅 {new Date(event.schedule.performances[0].date).toLocaleDateString()}</p>
                  )}
                  {event.promoter?.promoterName ? (
                    <p>🤝 {event.promoter.promoterName}</p>
                  ) : isAdmin && (
                    <p className="text-yellow-600 dark:text-yellow-400">🤝 Unassigned</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditEvent(event.id)}
                    className="flex-1 px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg text-sm transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
