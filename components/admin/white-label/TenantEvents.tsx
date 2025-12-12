'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

interface TenantEventsProps {
  tenantId: string
}

export default function TenantEvents({ tenantId }: TenantEventsProps) {
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
  }, [tenantId])

  const loadEvents = async () => {
    try {
      const eventsRef = collection(db, 'events')
      const q = query(eventsRef, where('promoter.promoterId', '==', tenantId))
      const snapshot = await getDocs(q)

      const eventsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      setEvents(eventsList)
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse">Loading events...</div>
  }

  return (
    <div className="space-y-6">
      {events.length === 0 ? (
        <div className="text-center py-12 bg-black/40 rounded-xl">
          <p className="text-gray-400">No events found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => (
            <div key={event.id} className="bg-black/40 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-2">{event.name}</h3>
              <p className="text-sm text-gray-400 mb-4">
                Status: <span className={event.status === 'active' ? 'text-green-400' : 'text-gray-400'}>
                  {event.status}
                </span>
              </p>
              <button
                onClick={() => router.push(`/admin/events/edit/${event.id}`)}
                className="w-full px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
              >
                Edit Event
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
