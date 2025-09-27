'use client'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'

export default function EventsManagement() {
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    venue: '',
    date: '',
    time: '',
    price: 100,
    capacity: 500,
    description: ''
  })

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      const eventsData = await AdminService.getEvents()
      setEvents(eventsData)
    } catch (error) {
      console.error('Error loading events:', error)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await AdminService.createEvent({
        ...formData,
        date: `${formData.date}T${formData.time}:00`
      })
      setShowModal(false)
      loadEvents()
      alert('Event created successfully!')
    } catch (error) {
      alert('Error creating event')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await AdminService.deleteEvent(id)
        loadEvents()
      } catch (error) {
        alert('Error deleting event')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Events Management</h1>
            <p className="text-gray-400">Create and manage your events</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => router.push('/admin')} className="px-4 py-2 bg-gray-600 rounded-lg">
              Back to Dashboard
            </button>
            <button onClick={() => setShowModal(true)} className="px-6 py-2 bg-purple-600 rounded-lg">
              + New Event
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
          </div>
        ) : (
          <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="text-left py-2">Event Name</th>
                    <th className="text-left py-2">Venue</th>
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Price</th>
                    <th className="text-left py-2">Capacity</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => (
                    <tr key={event.id} className="border-b border-white/5">
                      <td className="py-2">{event.name}</td>
                      <td className="py-2">{event.venue}</td>
                      <td className="py-2">{event.date ? new Date(event.date).toLocaleDateString() : 'N/A'}</td>
                      <td className="py-2">${event.price}</td>
                      <td className="py-2">{event.capacity || 500}</td>
                      <td className="py-2">
                        <button onClick={() => handleDelete(event.id)} className="text-red-400 hover:text-red-300">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4">Create New Event</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  placeholder="Event Name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
                <select
                  required
                  value={formData.venue}
                  onChange={(e) => setFormData({...formData, venue: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                >
                  <option value="">Select Venue</option>
                  <option value="Main Theater">Main Theater</option>
                  <option value="Concert Hall">Concert Hall</option>
                  <option value="Jazz Club">Jazz Club</option>
                </select>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
                <input
                  type="time"
                  required
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Price"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-700 rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 py-2 bg-purple-600 rounded-lg">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
