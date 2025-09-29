'use client'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'
import {auth} from '@/lib/firebase'
import {onAuthStateChanged} from 'firebase/auth'
import AdminLayout from '@/components/AdminLayout'

export default function VenuesManagement() {
  const router = useRouter()
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [editingVenue, setEditingVenue] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    streetAddress1: '',
    city: 'Dallas',
    state: 'TX',
    zipCode: '',
    capacity: 1000,
    type: 'theater'
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        loadVenues()
      } else {
        router.push('/login')
      }
    })
    return () => unsubscribe()
  }, [router])

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
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Venues Management</h1>
            <p className="text-gray-400">Configure venues and layouts</p>
          </div>
          <button onClick={() => setShowWizard(true)} className="px-6 py-2 bg-purple-600 rounded-lg">
            + Add Venue
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
                <p className="text-gray-400 mb-4">{venue.city}, {venue.state}</p>
                <p className="text-sm text-gray-400">Capacity: {venue.capacity}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
