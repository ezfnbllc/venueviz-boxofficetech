'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminService } from '@/lib/admin/adminService'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

export default function PromotionsManagement() {
  const router = useRouter()
  const [promotions, setPromotions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'percentage',
    value: 10,
    minPurchase: 0,
    maxUses: 100,
    usedCount: 0,
    active: true,
    startDate: '',
    endDate: '',
    description: '',
    applicableEvents: [] as string[],
    applicableVenues: [] as string[]
  })
  
  const [events, setEvents] = useState<any[]>([])
  const [venues, setVenues] = useState<any[]>([])

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
      const [promotionsData, eventsData, venuesData] = await Promise.all([
        AdminService.getPromotions(),
        AdminService.getEvents(),
        AdminService.getVenues()
      ])
      setPromotions(promotionsData)
      setEvents(eventsData)
      setVenues(venuesData)
    } catch (error) {
      console.error('Error loading data:', error)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingPromotion) {
        await AdminService.updatePromotion(editingPromotion.id, formData)
      } else {
        await AdminService.createPromotion(formData)
      }
      setShowForm(false)
      resetForm()
      await loadData()
    } catch (error) {
      console.error('Error saving promotion:', error)
    }
  }

  const handleEdit = (promotion: any) => {
    setEditingPromotion(promotion)
    setFormData({
      name: promotion.name || '',
      code: promotion.code || '',
      type: promotion.type || 'percentage',
      value: promotion.value || 10,
      minPurchase: promotion.minPurchase || 0,
      maxUses: promotion.maxUses || 100,
      usedCount: promotion.usedCount || 0,
      active: promotion.active !== false,
      startDate: promotion.startDate || '',
      endDate: promotion.endDate || '',
      description: promotion.description || '',
      applicableEvents: promotion.applicableEvents || [],
      applicableVenues: promotion.applicableVenues || []
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this promotion?')) {
      try {
        await AdminService.deletePromotion(id)
        await loadData()
      } catch (error) {
        console.error('Error deleting promotion:', error)
      }
    }
  }

  const handleToggleActive = async (promotion: any) => {
    try {
      await AdminService.updatePromotion(promotion.id, {
        ...promotion,
        active: !promotion.active
      })
      await loadData()
    } catch (error) {
      console.error('Error toggling promotion:', error)
    }
  }

  const resetForm = () => {
    setEditingPromotion(null)
    setFormData({
      name: '',
      code: '',
      type: 'percentage',
      value: 10,
      minPurchase: 0,
      maxUses: 100,
      usedCount: 0,
      active: true,
      startDate: '',
      endDate: '',
      description: '',
      applicableEvents: [],
      applicableVenues: []
    })
  }

  const generatePromoCode = () => {
    const code = `PROMO${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    setFormData({...formData, code})
  }

  const getUsagePercentage = (promotion: any) => {
    const used = promotion.usedCount || 0
    const max = promotion.maxUses || 100
    return (used / max) * 100
  }

  return (
    <>
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Promotions</h1>
            <p className="text-gray-400">Manage discount codes and special offers</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700"
          >
            + New Promotion
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Total Promotions</p>
            <p className="text-2xl font-bold">{promotions.length}</p>
          </div>
          <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Active</p>
            <p className="text-2xl font-bold text-green-400">
              {promotions.filter(p => p.active).length}
            </p>
          </div>
          <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Total Uses</p>
            <p className="text-2xl font-bold">
              {promotions.reduce((sum, p) => sum + (p.usedCount || 0), 0)}
            </p>
          </div>
          <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Avg. Discount</p>
            <p className="text-2xl font-bold">
              {promotions.length > 0 
                ? Math.round(promotions.reduce((sum, p) => sum + (p.value || 0), 0) / promotions.length) 
                : 0}%
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
          </div>
        ) : promotions.length === 0 ? (
          <div className="text-center py-12 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <div className="text-6xl mb-4">🎟️</div>
            <p className="text-gray-400 mb-4">No promotions yet. Create your first promotion!</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              Create First Promotion
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {promotions.map(promo => (
              <div key={promo.id} className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6 hover:scale-105 transition-transform">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{promo.name}</h3>
                    <p className="text-purple-400 font-mono text-lg">{promo.code}</p>
                  </div>
                  <button
                    onClick={() => handleToggleActive(promo)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      promo.active 
                        ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30' 
                        : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                    }`}
                  >
                    {promo.active ? 'Active' : 'Inactive'}
                  </button>
                </div>

                {/* Discount Info */}
                <div className="mb-4 p-3 bg-purple-600/10 rounded-lg">
                  <p className="text-3xl font-bold text-purple-400">
                    {promo.type === 'percentage' ? `${promo.value}%` : `$${promo.value}`}
                    <span className="text-sm font-normal text-gray-400 ml-2">OFF</span>
                  </p>
                  {promo.minPurchase > 0 && (
                    <p className="text-sm text-gray-400 mt-1">
                      Min. purchase: ${promo.minPurchase}
                    </p>
                  )}
                </div>

                {/* Usage Stats */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Usage</span>
                    <span className="text-gray-300">
                      {promo.usedCount || 0} / {promo.maxUses || 100}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                      style={{ width: `${getUsagePercentage(promo)}%` }}
                    />
                  </div>
                </div>

                {/* Description */}
                {promo.description && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                    {promo.description}
                  </p>
                )}

                {/* Validity Dates */}
                {(promo.startDate || promo.endDate) && (
                  <div className="text-xs text-gray-500 mb-4">
                    {promo.startDate && (
                      <p>Starts: {new Date(promo.startDate).toLocaleDateString()}</p>
                    )}
                    {promo.endDate && (
                      <p>Ends: {new Date(promo.endDate).toLocaleDateString()}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(promo)}
                    className="flex-1 px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(promo.code)}
                    className="px-3 py-2 bg-gray-600/20 text-gray-400 rounded-lg hover:bg-gray-600/30 text-sm"
                    title="Copy code"
                  >
                    📋
                  </button>
                  <button
                    onClick={() => handleDelete(promo.id)}
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
                  {editingPromotion ? 'Edit Promotion' : 'Create Promotion'}
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
                    <label className="block text-sm mb-2">Promotion Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="Summer Sale"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm mb-2">Promo Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                        className="flex-1 px-4 py-2 bg-white/10 rounded-lg font-mono"
                        placeholder="SUMMER20"
                        required
                      />
                      <button
                        type="button"
                        onClick={generatePromoCode}
                        className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
                        title="Generate code"
                      >
                        🎲
                      </button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 bg-white/10 rounded-lg h-20"
                    placeholder="Special discount for summer events..."
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Discount Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm mb-2">
                      {formData.type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
                    </label>
                    <input
                      type="number"
                      value={formData.value}
                      onChange={(e) => setFormData({...formData, value: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      min="0"
                      max={formData.type === 'percentage' ? '100' : undefined}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm mb-2">Min. Purchase ($)</label>
                    <input
                      type="number"
                      value={formData.minPurchase}
                      onChange={(e) => setFormData({...formData, minPurchase: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      min="0"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Max Uses</label>
                    <input
                      type="number"
                      value={formData.maxUses}
                      onChange={(e) => setFormData({...formData, maxUses: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      min="1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm mb-2">Current Uses</label>
                    <input
                      type="number"
                      value={formData.usedCount}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg opacity-50"
                      disabled
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Start Date (Optional)</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm mb-2">End Date (Optional)</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
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
                    <span>Active (Promotion can be used)</span>
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
                    {editingPromotion ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
