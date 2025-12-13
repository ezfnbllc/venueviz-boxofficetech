'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

interface PromoterEventsProps {
  promoterId: string
}

export default function PromoterEvents({ promoterId }: PromoterEventsProps) {
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
  }, [promoterId])

  const loadEvents = async () => {
    try {
      const eventsRef = collection(db, 'events')
      const q = query(eventsRef, where('promoter.promoterId', '==', promoterId))
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
    return <div className="animate-pulse text-secondary-contrast">Loading events...</div>
  }

  return (
    <div className="space-y-6">
      {events.length === 0 ? (
        <div className="text-center py-12 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-secondary-contrast">No events found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => (
            <div key={event.id} className="stat-card rounded-xl p-6">
              <h3 className="text-xl font-bold mb-2 text-primary-contrast">{event.name}</h3>
              <p className="text-sm text-secondary-contrast mb-4">
                Status: <span className={event.status === 'active' ? 'text-money' : 'text-secondary-contrast'}>
                  {event.status}
                </span>
              </p>
              <button
                onClick={() => router.push(`/admin/events/edit/${event.id}`)}
                className="w-full btn-accent px-4 py-2 rounded-lg"
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
