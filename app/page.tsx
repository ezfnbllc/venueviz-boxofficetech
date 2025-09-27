'use client'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {db, STORAGE_URL} from '@/lib/firebase'
import {collection, getDocs, query, orderBy} from 'firebase/firestore'

export default function HomePage() {
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      const q = query(collection(db, 'events'), orderBy('date', 'asc'))
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setEvents(data)
    } catch (e) {
      // Default events if DB fails
      setEvents([
        {
          id: '1',
          name: 'Hamilton',
          venue: 'Main Theater',
          date: '2025-09-28T19:30:00',
          price: 150,
          image: `${STORAGE_URL}hamilton.jpg?alt=media`,
          availableSeats: 75
        },
        {
          id: '2',
          name: 'The Lion King',
          venue: 'Grand Opera House',
          date: '2025-09-29T14:00:00',
          price: 125,
          image: `${STORAGE_URL}lionking.jpg?alt=media`,
          availableSeats: 120
        },
        {
          id: '3',
          name: 'Phantom of the Opera',
          venue: 'Royal Theater',
          date: '2025-09-30T20:00:00',
          price: 95,
          image: `${STORAGE_URL}phantom.jpg?alt=media`,
          availableSeats: 45
        }
      ])
    }
    setLoading(false)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <nav className="bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            VenueViz
          </h1>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/orders')}
              className="px-4 py-2 hover:bg-white/10 rounded-lg transition"
            >
              My Orders
            </button>
            <button 
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
            >
              Admin
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              Live Events & Entertainment
            </span>
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Book your seats for the best shows in town
          </p>
        </div>
      </div>

      {/* Events Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <h3 className="text-2xl font-bold mb-8">Upcoming Events</h3>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => (
              <div 
                key={event.id}
                className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden hover:scale-105 transition-transform cursor-pointer"
                onClick={() => router.push(`/box-office?event=${event.id}`)}
              >
                <div className="h-64 bg-gradient-to-br from-purple-600/20 to-pink-600/20 relative">
                  {event.image && (
                    <img src={event.image} alt={event.name} className="w-full h-full object-cover" />
                  )}
                  {event.availableSeats < 50 && (
                    <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                      Only {event.availableSeats} left!
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h4 className="text-xl font-bold mb-2">{event.name}</h4>
                  <p className="text-gray-400 text-sm mb-1">{event.venue}</p>
                  <p className="text-gray-400 text-sm mb-4">{formatDate(event.date)}</p>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-400">Starting from</p>
                      <p className="text-2xl font-bold">${event.price}</p>
                    </div>
                    <button className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition">
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
