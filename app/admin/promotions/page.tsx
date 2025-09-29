'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminService } from '@/lib/admin/adminService'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import AdminLayout from '@/components/AdminLayout'

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
    active: true
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

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure?')) {
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
      active: true
    })
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Promotions</h1>
            <p className="text-gray-400">Manage discount codes</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
          >
            + New Promotion
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
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
                      {promo.type === 'percentage' ? `${promo.value}%` : `$${promo.value}`} off
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      promo.active ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                    }`}>
                      {promo.active ? 'Active' : 'Inactive'}
                    </span>
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
      </div>
    </AdminLayout>
  )
}
