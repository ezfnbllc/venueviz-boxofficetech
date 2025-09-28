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
    endDate: ''
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        loadPromotions()
      } else {
        router.push('/login')
      }
    })
    return () => unsubscribe()
  }, [router])

  const loadPromotions = async () => {
    try {
      const data = await AdminService.getPromotions()
      setPromotions(data)
    } catch (error) {
      console.error('Error loading promotions:', error)
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
      await loadPromotions()
    } catch (error) {
      console.error('Error saving promotion:', error)
    }
  }

  const handleEdit = (promotion: any) => {
    setEditingPromotion(promotion)
    setFormData(promotion)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this promotion?')) {
      try {
        await AdminService.deletePromotion(id)
        await loadPromotions()
      } catch (error) {
        console.error('Error deleting promotion:', error)
      }
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
      endDate: ''
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Promotions</h1>
            <p className="text-gray-400">Manage discount codes and promotions</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              + New Promotion
            </button>
            <button 
              onClick={() => router.push('/admin')} 
              className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
          </div>
        ) : promotions.length === 0 ? (
          <div className="text-center py-12 bg-black/40 rounded-xl">
            <div className="text-6xl mb-4">🎟️</div>
            <p className="text-gray-400 mb-4">No promotions yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              Create First Promotion
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {promotions.map(promo => (
              <div key={promo.id} className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold mb-2">{promo.name}</h3>
                    <p className="text-purple-400 font-mono mb-2">{promo.code}</p>
                    <p className="text-gray-400">
                      {promo.type === 'percentage' ? `${promo.value}% off` : `$${promo.value} off`}
                      {promo.minPurchase > 0 && ` (min. $${promo.minPurchase})`}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Used {promo.usedCount || 0} / {promo.maxUses} times
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      promo.active ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                    }`}>
                      {promo.active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => handleEdit(promo)}
                      className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(promo.id)}
                      className="px-3 py-1 bg-red-600 rounded hover:bg-red-700"
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
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4">
                {editingPromotion ? 'Edit Promotion' : 'Create Promotion'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Promotion Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm mb-2">Promo Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    className="w-full px-4 py-2 bg-white/10 rounded-lg font-mono"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
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
                      {formData.type === 'percentage' ? 'Percentage' : 'Amount'}
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
                </div>
                
                <div className="grid grid-cols-2 gap-4">
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
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({...formData, active: e.target.checked})}
                      className="mr-2"
                    />
                    <span>Active</span>
                  </label>
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      resetForm()
                    }}
                    className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
                  >
                    {editingPromotion ? 'Update' : 'Create'}
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
