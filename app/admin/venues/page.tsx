'use client'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'

export default function VenuesManagement() {
  const router = useRouter()
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadVenues()
  }, [])

  const loadVenues = async () => {
    try {
      const venuesData = await AdminService.getVenues()
      setVenues(venuesData)
    } catch (error) {
      console.error('Error loading venues:', error)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Venues Management</h1>
            <p className="text-gray-400">Manage your venue locations</p>
          </div>
          <button onClick={() => router.push('/admin')} className="px-4 py-2 bg-gray-600 rounded-lg">
            Back to Dashboard
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.map(venue => (
              <div key={venue.id} className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <h3 className="text-xl font-bold mb-2">{venue.name}</h3>
                <p className="text-gray-400 text-sm mb-2">{venue.address}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Capacity</p>
                    <p className="text-lg font-bold">{venue.capacity || 500}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">City</p>
                    <p className="text-lg font-bold">{venue.city || 'N/A'}</p>
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
