'use client'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'
import {db} from '@/lib/firebase'
import {collection, getDocs, query, where, Timestamp} from 'firebase/firestore'
import {auth} from '@/lib/firebase'
import {onAuthStateChanged} from 'firebase/auth'
import AdminLayout from '@/components/AdminLayout'

export default function PromotersManagement() {
  const router = useRouter()
  const [promoters, setPromoters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPromoter, setEditingPromoter] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    website: '',
    commission: 10,
    active: true,
    description: '',
    socialMedia: {
      facebook: '',
      twitter: '',
      instagram: ''
    }
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        loadPromoters()
      } else {
        router.push('/login')
      }
    })
    
    return () => unsubscribe()
  }, [router])

  const loadPromoters = async () => {
    try {
      const promotersData = await AdminService.getPromoters()
      
      // Get additional data for each promoter
      const promotersWithStats = await Promise.all(
        promotersData.map(async (promoter) => {
          // Get event count
          const eventsQuery = query(collection(db, 'events'), where('promoterId', '==', promoter.id))
          const eventsSnap = await getDocs(eventsQuery)
          
          // Get total revenue
          const ordersQuery = query(collection(db, 'orders'), where('promoterId', '==', promoter.id))
          const ordersSnap = await getDocs(ordersQuery)
          
          let totalRevenue = 0
          ordersSnap.docs.forEach(orderDoc => {
            const orderData = orderDoc.data()
            totalRevenue += orderData.pricing?.total || orderData.totalAmount || orderData.total || 0
          })
          
          return {
            ...promoter,
            eventCount: eventsSnap.size,
            totalRevenue,
            commission: promoter.commission || 10
          }
        })
      )
      
      setPromoters(promotersWithStats)
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
      setShowForm(false)
      resetForm()
      await loadPromoters()
    } catch (error) {
      console.error('Error saving promoter:', error)
    }
  }

  const handleEdit = (promoter: any) => {
    setEditingPromoter(promoter)
    setFormData({
      name: promoter.name || '',
      email: promoter.email || '',
      phone: promoter.phone || '',
      company: promoter.company || '',
      website: promoter.website || '',
      commission: promoter.commission || 10,
      active: promoter.active !== false,
      description: promoter.description || '',
      socialMedia: promoter.socialMedia || {
        facebook: '',
        twitter: '',
        instagram: ''
      }
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this promoter?')) {
      try {
        await AdminService.deletePromoter(id)
        await loadPromoters()
      } catch (error) {
        console.error('Error deleting promoter:', error)
      }
    }
  }

  const handleToggleActive = async (promoter: any) => {
    try {
      await AdminService.updatePromoter(promoter.id, {
        ...promoter,
        active: !promoter.active
      })
      await loadPromoters()
    } catch (error) {
      console.error('Error toggling promoter:', error)
    }
  }

  const resetForm = () => {
    setEditingPromoter(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      website: '',
      commission: 10,
      active: true,
      description: '',
      socialMedia: {
        facebook: '',
        twitter: '',
        instagram: ''
      }
    })
  }

  const calculateEarnings = (promoter: any) => {
    return (promoter.totalRevenue * (promoter.commission / 100)).toFixed(2)
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Promoters</h1>
            <p className="text-gray-400">Manage event promoters and partners</p>
          </div>
          <button 
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700"
          >
            + Add Promoter
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Total Promoters</p>
            <p className="text-2xl font-bold">{promoters.length}</p>
          </div>
          <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Active</p>
            <p className="text-2xl font-bold text-green-400">
              {promoters.filter(p => p.active).length}
            </p>
          </div>
          <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Total Events</p>
            <p className="text-2xl font-bold">
              {promoters.reduce((sum, p) => sum + (p.eventCount || 0), 0)}
            </p>
          </div>
          <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
            <p className="text-2xl font-bold">
              ${promoters.reduce((sum, p) => sum + (p.totalRevenue || 0), 0).toFixed(2)}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
          </div>
        ) : promoters.length === 0 ? (
          <div className="text-center py-12 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <div className="text-6xl mb-4">🤝</div>
            <p className="text-gray-400 mb-4">No promoters yet. Add your first promoter!</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              Add First Promoter
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {promoters.map(promoter => (
              <div key={promoter.id} className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6 hover:scale-105 transition-transform">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {promoter.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{promoter.name}</h3>
                      {promoter.company && (
                        <p className="text-sm text-gray-400">{promoter.company}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleActive(promoter)}
                    className={`px-2 py-1 rounded-full text-xs ${
                      promoter.active 
                        ? 'bg-green-600/20 text-green-400' 
                        : 'bg-gray-600/20 text-gray-400'
                    }`}
                  >
                    {promoter.active ? 'Active' : 'Inactive'}
                  </button>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <span>📧</span>
                    <span className="truncate">{promoter.email}</span>
                  </div>
                  {promoter.phone && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <span>📱</span>
                      <span>{promoter.phone}</span>
                    </div>
                  )}
                  {promoter.website && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <span>🌐</span>
                      <a href={promoter.website} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline truncate">
                        {promoter.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/5 p-3 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Events</p>
                    <p className="text-xl font-bold">{promoter.eventCount || 0}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Revenue</p>
                    <p className="text-xl font-bold">${(promoter.totalRevenue || 0).toFixed(0)}</p>
                  </div>
                </div>

                {/* Commission Info */}
                <div className="p-3 bg-purple-600/10 rounded-lg mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Commission</span>
                    <span className="text-lg font-bold text-purple-400">{promoter.commission}%</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500">Earnings</span>
                    <span className="text-sm font-semibold text-green-400">${calculateEarnings(promoter)}</span>
                  </div>
                </div>

                {/* Social Media */}
                {promoter.socialMedia && Object.values(promoter.socialMedia).some(v => v) && (
                  <div className="flex gap-2 mb-4">
                    {promoter.socialMedia.facebook && (
                      <a href={promoter.socialMedia.facebook} target="_blank" rel="noopener noreferrer" 
                         className="text-gray-400 hover:text-blue-400">
                        📘
                      </a>
                    )}
                    {promoter.socialMedia.twitter && (
                      <a href={promoter.socialMedia.twitter} target="_blank" rel="noopener noreferrer"
                         className="text-gray-400 hover:text-blue-400">
                        🐦
                      </a>
                    )}
                    {promoter.socialMedia.instagram && (
                      <a href={promoter.socialMedia.instagram} target="_blank" rel="noopener noreferrer"
                         className="text-gray-400 hover:text-pink-400">
                        📷
                      </a>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(promoter)}
                    className="flex-1 px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(promoter.id)}
                    className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-2xl my-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  {editingPromoter ? 'Edit Promoter' : 'Add New Promoter'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm mb-2">Company (Optional)</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="Events Inc."
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="promoter@example.com"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Website (Optional)</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="https://example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm mb-2">Commission (%)</label>
                    <input
                      type="number"
                      value={formData.commission}
                      onChange={(e) => setFormData({...formData, commission: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm mb-2">Description (Optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 bg-white/10 rounded-lg h-20"
                    placeholder="Notes about this promoter..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm mb-2">Social Media (Optional)</label>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="url"
                      value={formData.socialMedia.facebook}
                      onChange={(e) => setFormData({...formData, socialMedia: {...formData.socialMedia, facebook: e.target.value}})}
                      className="px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="Facebook URL"
                    />
                    <input
                      type="url"
                      value={formData.socialMedia.twitter}
                      onChange={(e) => setFormData({...formData, socialMedia: {...formData.socialMedia, twitter: e.target.value}})}
                      className="px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="Twitter URL"
                    />
                    <input
                      type="url"
                      value={formData.socialMedia.instagram}
                      onChange={(e) => setFormData({...formData, socialMedia: {...formData.socialMedia, instagram: e.target.value}})}
                      className="px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="Instagram URL"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({...formData, active: e.target.checked})}
                      className="rounded"
                    />
                    <span>Active (Can manage events)</span>
                  </label>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      resetForm()
                    }}
                    className="px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700"
                  >
                    {editingPromoter ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
