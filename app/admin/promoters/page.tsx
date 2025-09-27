'use client'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'
import ProtectedRoute from '@/components/ProtectedRoute'
import {useFirebaseAuth} from '@/lib/firebase-auth'

function PromotersManagementContent() {
  const router = useRouter()
  const {userData, isAdmin} = useFirebaseAuth()
  const [promoters, setPromoters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPromoter, setEditingPromoter] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    website: '',
    address: '',
    commissionRate: 10
  })

  useEffect(() => {
    loadPromoters()
  }, [])

  const loadPromoters = async () => {
    try {
      const promotersData = await AdminService.getPromoters()
      setPromoters(promotersData)
    } catch (error) {
      console.error('Error loading promoters:', error)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingPromoter) {
        await AdminService.updatePromoter(editingPromoter.id, formData)
      } else {
        await AdminService.createPromoter(formData)
      }
      setShowModal(false)
      setEditingPromoter(null)
      loadPromoters()
      alert(`Promoter ${editingPromoter ? 'updated' : 'created'} successfully!`)
    } catch (error) {
      alert('Error saving promoter')
    }
  }

  const handleEdit = (promoter: any) => {
    setEditingPromoter(promoter)
    setFormData(promoter)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this promoter?')) {
      try {
        await AdminService.deletePromoter(id)
        loadPromoters()
      } catch (error) {
        alert('Error deleting promoter')
      }
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <h2 className="text-xl font-bold mb-4">Your Promoter Information</h2>
          <p>Promoter ID: {userData?.promoterId}</p>
          <p>Email: {userData?.email}</p>
          <p>Role: {userData?.role}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Promoters Management</h1>
            <p className="text-gray-400">Manage event promoters and their access</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => router.push('/admin')} className="px-4 py-2 bg-gray-600 rounded-lg">
              Back to Dashboard
            </button>
            <button onClick={() => {setShowModal(true); setEditingPromoter(null); setFormData({name:'',email:'',phone:'',company:'',website:'',address:'',commissionRate:10})}} className="px-6 py-2 bg-purple-600 rounded-lg">
              + New Promoter
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {promoters.map(promoter => (
              <div key={promoter.id} className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <h3 className="text-xl font-bold mb-2">{promoter.name}</h3>
                <p className="text-gray-400 text-sm mb-1">{promoter.email}</p>
                <p className="text-gray-400 text-sm mb-1">{promoter.phone}</p>
                <p className="text-gray-400 text-sm mb-4">ID: {promoter.id}</p>
                
                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                  <div>
                    <p className="text-gray-400">Events</p>
                    <p className="font-bold">{promoter.eventCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Revenue</p>
                    <p className="font-bold">${promoter.totalRevenue || 0}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(promoter)} className="flex-1 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(promoter.id)} className="flex-1 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4">{editingPromoter ? 'Edit' : 'Create'} Promoter</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  placeholder="Promoter Name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
                <input
                  type="url"
                  placeholder="Website"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Commission Rate (%)"
                  min="0"
                  max="100"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({...formData, commissionRate: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
                
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-700 rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 py-2 bg-purple-600 rounded-lg">
                    {editingPromoter ? 'Update' : 'Create'}
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

export default function PromotersManagement() {
  return (
    <ProtectedRoute requirePromoter>
      <PromotersManagementContent />
    </ProtectedRoute>
  )
}
