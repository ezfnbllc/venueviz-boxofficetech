'use client'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'
import {StorageService} from '@/lib/storage/storageService'
import {db, auth} from '@/lib/firebase'
import {collection, getDocs, query, where, Timestamp} from 'firebase/firestore'
import {createUserWithEmailAndPassword, onAuthStateChanged} from 'firebase/auth'
import AdminLayout from '@/components/AdminLayout'

export default function PromotersManagement() {
  const router = useRouter()
  const [promoters, setPromoters] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showEventsModal, setShowEventsModal] = useState(false)
  const [showUsersModal, setShowUsersModal] = useState(false)
  const [selectedPromoter, setSelectedPromoter] = useState<any>(null)
  const [editingPromoter, setEditingPromoter] = useState<any>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    slug: '',
    brandingType: 'basic' as 'basic' | 'advanced',
    colorScheme: {
      primary: '#9333EA',
      secondary: '#EC4899',
      accent: '#F59E0B',
      background: '#1F2937',
      text: '#F3F4F6'
    },
    logo: '',
    commission: 10,
    active: true,
    users: [] as string[],
    website: '',
    description: ''
  })

  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    name: ''
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        loadData()
      } else {
        router.push('/login')
      }
    })
    
    return () => unsubscribe()
  }, [router])

  const loadData = async () => {
    try {
      const [promotersData, eventsData] = await Promise.all([
        AdminService.getPromoters(),
        AdminService.getEvents()
      ])
      
      // Get additional stats for each promoter
      const promotersWithStats = await Promise.all(
        promotersData.map(async (promoter) => {
          // Get events for this promoter
          const promoterEvents = eventsData.filter(e => e.promoterId === promoter.id)
          
          // Get orders for this promoter's events
          let totalRevenue = 0
          let totalOrders = 0
          
          for (const event of promoterEvents) {
            const ordersQuery = query(collection(db, 'orders'), where('eventId', '==', event.id))
            const ordersSnap = await getDocs(ordersQuery)
            
            ordersSnap.docs.forEach(orderDoc => {
              const orderData = orderDoc.data()
              totalRevenue += orderData.pricing?.total || orderData.totalAmount || orderData.total || 0
              totalOrders++
            })
          }
          
          return {
            ...promoter,
            eventCount: promoterEvents.length,
            totalRevenue,
            totalOrders,
            commission: promoter.commission || 10
          }
        })
      )
      
      setPromoters(promotersWithStats)
      setEvents(eventsData)
    } catch (error) {
      console.error('Error loading data:', error)
    }
    setLoading(false)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploadingLogo(true)
    try {
      const url = await StorageService.uploadPromoterLogo(file)
      setLogoUrl(url)
      setFormData({...formData, logo: url})
    } catch (error) {
      console.error('Error uploading logo:', error)
    }
    setUploadingLogo(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Generate slug if not provided
      const finalData = {
        ...formData,
        slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      }
      
      if (editingPromoter) {
        await AdminService.updatePromoter(editingPromoter.id, finalData)
      } else {
        await AdminService.createPromoter(finalData)
      }
      
      setShowForm(false)
      resetForm()
      await loadData()
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
      slug: promoter.slug || '',
      brandingType: promoter.brandingType || 'basic',
      colorScheme: promoter.colorScheme || {
        primary: '#9333EA',
        secondary: '#EC4899',
        accent: '#F59E0B',
        background: '#1F2937',
        text: '#F3F4F6'
      },
      logo: promoter.logo || '',
      commission: promoter.commission || 10,
      active: promoter.active !== false,
      users: promoter.users || [],
      website: promoter.website || '',
      description: promoter.description || ''
    })
    setLogoUrl(promoter.logo || '')
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this promoter?')) {
      try {
        await AdminService.deletePromoter(id)
        await loadData()
      } catch (error) {
        console.error('Error deleting promoter:', error)
      }
    }
  }

  const handleShowEvents = (promoter: any) => {
    setSelectedPromoter(promoter)
    setShowEventsModal(true)
  }

  const handleShowUsers = (promoter: any) => {
    setSelectedPromoter(promoter)
    setShowUsersModal(true)
  }

  const handleAddUser = async () => {
    if (!selectedPromoter || !newUserData.email || !newUserData.password) return
    
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        newUserData.email, 
        newUserData.password
      )
      
      // Add user ID to promoter's users array
      const updatedUsers = [...(selectedPromoter.users || []), userCredential.user.uid]
      await AdminService.updatePromoter(selectedPromoter.id, {
        users: updatedUsers
      })
      
      // Store user details in users collection
      await AdminService.createUser({
        uid: userCredential.user.uid,
        email: newUserData.email,
        name: newUserData.name,
        role: 'promoter',
        promoterId: selectedPromoter.id,
        createdAt: Timestamp.now()
      })
      
      alert('User created successfully!')
      setNewUserData({ email: '', password: '', name: '' })
      await loadData()
      
    } catch (error: any) {
      console.error('Error creating user:', error)
      alert(error.message || 'Error creating user')
    }
  }

  const resetForm = () => {
    setEditingPromoter(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      slug: '',
      brandingType: 'basic',
      colorScheme: {
        primary: '#9333EA',
        secondary: '#EC4899',
        accent: '#F59E0B',
        background: '#1F2937',
        text: '#F3F4F6'
      },
      logo: '',
      commission: 10,
      active: true,
      users: [],
      website: '',
      description: ''
    })
    setLogoUrl('')
  }

  const calculateEarnings = (promoter: any) => {
    return (promoter.totalRevenue * (promoter.commission / 100)).toFixed(2)
  }

  const getPromoterEvents = (promoterId: string) => {
    return events.filter(e => e.promoterId === promoterId)
  }

  const getPromoterPortalUrl = (slug: string) => {
    return `${window.location.origin}/p/${slug}`
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Promoters</h1>
            <p className="text-gray-400">Manage promoters and their branded portals</p>
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
        <div className="grid md:grid-cols-5 gap-4 mb-8">
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
              ${promoters.reduce((sum, p) => sum + (p.totalRevenue || 0), 0).toFixed(0)}
            </p>
          </div>
          <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Total Commissions</p>
            <p className="text-2xl font-bold text-green-400">
              ${promoters.reduce((sum, p) => sum + parseFloat(calculateEarnings(p)), 0).toFixed(0)}
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
              <div key={promoter.id} className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden hover:scale-105 transition-transform">
                {/* Header with Logo and Branding */}
                <div className="p-6 pb-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      {promoter.logo ? (
                        <img src={promoter.logo} alt={promoter.name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                          {promoter.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-bold">{promoter.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            promoter.brandingType === 'advanced' 
                              ? 'bg-purple-600/20 text-purple-400' 
                              : 'bg-gray-600/20 text-gray-400'
                          }`}>
                            {promoter.brandingType || 'basic'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            promoter.active 
                              ? 'bg-green-600/20 text-green-400' 
                              : 'bg-red-600/20 text-red-400'
                          }`}>
                            {promoter.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Color Scheme Preview */}
                  {promoter.colorScheme && (
                    <div className="flex gap-1 mb-3">
                      <div 
                        className="w-8 h-8 rounded"
                        style={{ backgroundColor: promoter.colorScheme.primary }}
                        title="Primary"
                      />
                      <div 
                        className="w-8 h-8 rounded"
                        style={{ backgroundColor: promoter.colorScheme.secondary }}
                        title="Secondary"
                      />
                      <div 
                        className="w-8 h-8 rounded"
                        style={{ backgroundColor: promoter.colorScheme.accent }}
                        title="Accent"
                      />
                    </div>
                  )}

                  {/* Portal URL */}
                  {promoter.slug && (
                    <div className="mb-3 p-2 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Portal URL</p>
                      <a 
                        href={getPromoterPortalUrl(promoter.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-purple-400 hover:underline truncate block"
                      >
                        /p/{promoter.slug}
                      </a>
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-1 mb-3 text-sm">
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
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-white/5 p-2 rounded text-center">
                      <p className="text-xs text-gray-400">Events</p>
                      <p className="text-lg font-bold">{promoter.eventCount || 0}</p>
                    </div>
                    <div className="bg-white/5 p-2 rounded text-center">
                      <p className="text-xs text-gray-400">Orders</p>
                      <p className="text-lg font-bold">{promoter.totalOrders || 0}</p>
                    </div>
                    <div className="bg-white/5 p-2 rounded text-center">
                      <p className="text-xs text-gray-400">Users</p>
                      <p className="text-lg font-bold">{promoter.users?.length || 0}</p>
                    </div>
                  </div>

                  {/* Commission Info */}
                  <div className="p-3 bg-purple-600/10 rounded-lg mb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs text-gray-400">Revenue</span>
                        <p className="text-lg font-bold">${(promoter.totalRevenue || 0).toFixed(0)}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-400">Commission ({promoter.commission}%)</span>
                        <p className="text-lg font-bold text-green-400">${calculateEarnings(promoter)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleEdit(promoter)}
                      className="px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleShowEvents(promoter)}
                      className="px-3 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 text-sm"
                    >
                      Events ({promoter.eventCount})
                    </button>
                    <button
                      onClick={() => handleShowUsers(promoter)}
                      className="px-3 py-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 text-sm"
                    >
                      Users ({promoter.users?.length || 0})
                    </button>
                    <button
                      onClick={() => handleDelete(promoter.id)}
                      className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-3xl my-8">
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
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="Promoter Name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm mb-2">Portal Slug *</label>
                    <div className="flex items-center">
                      <span className="text-gray-400 mr-2">/p/</span>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                        className="flex-1 px-4 py-2 bg-white/10 rounded-lg"
                        placeholder="promoter-name"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Auto-generated if left empty</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Email *</label>
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
                
                {/* Branding */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Branding Type</label>
                    <select
                      value={formData.brandingType}
                      onChange={(e) => setFormData({...formData, brandingType: e.target.value as 'basic' | 'advanced'})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    >
                      <option value="basic">Basic</option>
                      <option value="advanced">Advanced</option>
                    </select>
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
                
                {/* Logo Upload */}
                <div>
                  <label className="block text-sm mb-2">Logo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    disabled={uploadingLogo}
                  />
                  {uploadingLogo && (
                    <p className="text-xs text-purple-400 mt-2">Uploading logo...</p>
                  )}
                  {logoUrl && (
                    <div className="mt-2">
                      <img src={logoUrl} alt="Logo preview" className="h-20 object-contain rounded" />
                    </div>
                  )}
                </div>
                
                {/* Color Scheme */}
                <div>
                  <label className="block text-sm mb-2">Color Scheme</label>
                  <div className="grid grid-cols-5 gap-3">
                    <div>
                      <label className="text-xs text-gray-400">Primary</label>
                      <input
                        type="color"
                        value={formData.colorScheme.primary}
                        onChange={(e) => setFormData({
                          ...formData, 
                          colorScheme: {...formData.colorScheme, primary: e.target.value}
                        })}
                        className="w-full h-10 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Secondary</label>
                      <input
                        type="color"
                        value={formData.colorScheme.secondary}
                        onChange={(e) => setFormData({
                          ...formData, 
                          colorScheme: {...formData.colorScheme, secondary: e.target.value}
                        })}
                        className="w-full h-10 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Accent</label>
                      <input
                        type="color"
                        value={formData.colorScheme.accent}
                        onChange={(e) => setFormData({
                          ...formData, 
                          colorScheme: {...formData.colorScheme, accent: e.target.value}
                        })}
                        className="w-full h-10 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Background</label>
                      <input
                        type="color"
                        value={formData.colorScheme.background}
                        onChange={(e) => setFormData({
                          ...formData, 
                          colorScheme: {...formData.colorScheme, background: e.target.value}
                        })}
                        className="w-full h-10 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Text</label>
                      <input
                        type="color"
                        value={formData.colorScheme.text}
                        onChange={(e) => setFormData({
                          ...formData, 
                          colorScheme: {...formData.colorScheme, text: e.target.value}
                        })}
                        className="w-full h-10 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Website</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="https://example.com"
                    />
                  </div>
                  
                  <div className="flex items-end">
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
                </div>
                
                <div>
                  <label className="block text-sm mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 bg-white/10 rounded-lg h-20"
                    placeholder="Notes about this promoter..."
                  />
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

        {/* Events Modal */}
        {showEventsModal && selectedPromoter && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-4xl my-8 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  Events for {selectedPromoter.name}
                </h2>
                <button
                  onClick={() => {
                    setShowEventsModal(false)
                    setSelectedPromoter(null)
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              {getPromoterEvents(selectedPromoter.id).length === 0 ? (
                <p className="text-gray-400 text-center py-8">No events yet</p>
              ) : (
                <div className="grid gap-4">
                  {getPromoterEvents(selectedPromoter.id).map(event => (
                    <div key={event.id} className="bg-black/40 rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold">{event.name}</h3>
                        <p className="text-sm text-gray-400">
                          {event.venueName || event.venue} • {
                            event.schedule?.date ? 
                              new Date(event.schedule.date.toDate ? event.schedule.date.toDate() : event.schedule.date).toLocaleDateString() : 
                              'Date TBD'
                          }
                        </p>
                      </div>
                      <button
                        onClick={() => router.push(`/admin/events?edit=${event.id}`)}
                        className="px-4 py-2 bg-purple-600 rounded-lg text-sm"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Management Modal */}
        {showUsersModal && selectedPromoter && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-2xl my-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  Manage Users for {selectedPromoter.name}
                </h2>
                <button
                  onClick={() => {
                    setShowUsersModal(false)
                    setSelectedPromoter(null)
                    setNewUserData({ email: '', password: '', name: '' })
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Current Users</h3>
                {selectedPromoter.users?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedPromoter.users.map((userId: string) => (
                      <div key={userId} className="bg-black/40 rounded-lg p-3">
                        <p className="text-sm font-mono">{userId}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No users assigned yet</p>
                )}
              </div>
              
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-lg font-semibold mb-3">Add New User</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm mb-2">Name</label>
                    <input
                      type="text"
                      value={newUserData.name}
                      onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="User Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Email</label>
                    <input
                      type="email"
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Password</label>
                    <input
                      type="password"
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="••••••••"
                    />
                  </div>
                  <button
                    onClick={handleAddUser}
                    className="w-full px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
                  >
                    Create User
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
