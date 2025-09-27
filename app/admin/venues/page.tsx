'use client'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'
import {AIService} from '@/lib/ai-service'

export default function VenuesManagement() {
  const router = useRouter()
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingVenue, setEditingVenue] = useState<any>(null)
  const [aiSuggestion, setAiSuggestion] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    capacity: 500,
    sections: 3,
    configuration: 'standard'
  })

  useEffect(() => {
    if (!document.cookie.includes('auth=true')) {
      router.push('/login')
      return
    }
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

  const getAIPricingSuggestion = async () => {
    const suggestion = await AIService.getPricingRecommendation({
      basePrice: formData.capacity * 0.3,
      venueSize: formData.capacity
    })
    setAiSuggestion(suggestion)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingVenue) {
        await AdminService.updateVenue(editingVenue.id, formData)
      } else {
        await AdminService.createVenue(formData)
      }
      setShowModal(false)
      setEditingVenue(null)
      loadVenues()
      alert(`Venue ${editingVenue ? 'updated' : 'created'} successfully!`)
    } catch (error) {
      alert('Error saving venue')
    }
  }

  const handleEdit = (venue: any) => {
    setEditingVenue(venue)
    setFormData(venue)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this venue?')) {
      try {
        await AdminService.deleteVenue(id)
        loadVenues()
      } catch (error) {
        alert('Error deleting venue')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Venue Management</h1>
            <p className="text-gray-400">Manage your venues with AI optimization</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => router.push('/admin')} className="px-4 py-2 bg-gray-600 rounded-lg">
              Back to Dashboard
            </button>
            <button onClick={() => {setShowModal(true); setEditingVenue(null); setFormData({name:'',address:'',capacity:500,sections:3,configuration:'standard'})}} className="px-6 py-2 bg-purple-600 rounded-lg">
              + New Venue
            </button>
          </div>
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
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-gray-400 text-xs">Capacity</p>
                    <p className="text-lg font-bold">{venue.capacity}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Sections</p>
                    <p className="text-lg font-bold">{venue.sections || 3}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(venue)} className="flex-1 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(venue.id)} className="flex-1 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30">
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {venues.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400">
                No venues yet. Create your first venue!
              </div>
            )}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4">{editingVenue ? 'Edit' : 'Create'} Venue</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  placeholder="Venue Name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Address"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Capacity"
                  required
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Number of Sections"
                  required
                  value={formData.sections}
                  onChange={(e) => setFormData({...formData, sections: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
                <select
                  value={formData.configuration}
                  onChange={(e) => setFormData({...formData, configuration: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                >
                  <option value="standard">Standard</option>
                  <option value="theater">Theater</option>
                  <option value="concert">Concert Hall</option>
                  <option value="stadium">Stadium</option>
                </select>
                
                <button type="button" onClick={getAIPricingSuggestion} className="w-full py-2 bg-purple-600/20 text-purple-400 rounded-lg">
                  Get AI Pricing Suggestion
                </button>
                
                {aiSuggestion && (
                  <div className="p-3 bg-purple-600/10 rounded-lg">
                    <p className="text-sm text-purple-400">AI Suggested Base Price: ${aiSuggestion.recommended}</p>
                    <p className="text-xs text-gray-400">Confidence: {aiSuggestion.confidence}%</p>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-700 rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 py-2 bg-purple-600 rounded-lg">
                    {editingVenue ? 'Update' : 'Create'}
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
