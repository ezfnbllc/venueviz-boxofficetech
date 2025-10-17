'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function EditPromotionPage() {
  const router = useRouter()
  const params = useParams()
  const promotionId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [events, setEvents] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    type: 'percentage',
    discountType: 'percentage',
    value: 0,
    discountValue: 0,
    maxUses: 0,
    maxUsesPerCustomer: 1,
    validFrom: '',
    validTo: '',
    active: true,
    eventIds: [] as string[],
    applicableCategories: [] as string[],
    minimumPurchase: 0
  })

  useEffect(() => {
    loadData()
  }, [promotionId])

  const loadData = async () => {
    try {
      // Load promotion
      const promoDoc = await getDoc(doc(db, 'promotions', promotionId))
      if (!promoDoc.exists()) {
        alert('Promotion not found')
        router.push('/admin/promotions')
        return
      }

      const promoData = promoDoc.data()
      
      // Convert Firestore timestamps to ISO strings for input fields
      const validFrom = promoData.validFrom?.toDate?.() || new Date()
      const validTo = promoData.validTo?.toDate?.() || new Date()

      setFormData({
        name: promoData.name || '',
        code: promoData.code || '',
        description: promoData.description || '',
        type: promoData.type || 'percentage',
        discountType: promoData.discountType || 'percentage',
        value: promoData.value || 0,
        discountValue: promoData.discountValue || promoData.value || 0,
        maxUses: promoData.maxUses || 0,
        maxUsesPerCustomer: promoData.maxUsesPerCustomer || 1,
        validFrom: validFrom.toISOString().slice(0, 16),
        validTo: validTo.toISOString().slice(0, 16),
        active: promoData.active !== false,
        eventIds: promoData.eventIds || [],
        applicableCategories: promoData.applicableCategories || [],
        minimumPurchase: promoData.minimumPurchase || 0
      })

      // Load events for selection
      const eventsSnapshot = await getDocs(collection(db, 'events'))
      const eventsData = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setEvents(eventsData)

    } catch (error) {
      console.error('Error loading promotion:', error)
      alert('Failed to load promotion')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const promoRef = doc(db, 'promotions', promotionId)
      
      await updateDoc(promoRef, {
        name: formData.name,
        code: formData.code.toUpperCase(),
        description: formData.description,
        type: formData.discountType,
        discountType: formData.discountType,
        value: parseFloat(formData.value.toString()),
        discountValue: parseFloat(formData.value.toString()),
        discount: parseFloat(formData.value.toString()),
        maxUses: parseInt(formData.maxUses.toString()) || null,
        maxUsesPerCustomer: parseInt(formData.maxUsesPerCustomer.toString()),
        validFrom: new Date(formData.validFrom),
        validTo: new Date(formData.validTo),
        active: formData.active,
        eventIds: formData.eventIds,
        applicableCategories: formData.applicableCategories,
        minimumPurchase: parseFloat(formData.minimumPurchase.toString()),
        updatedAt: new Date()
      })

      alert('Promotion updated successfully!')
      router.push('/admin/promotions')
    } catch (error) {
      console.error('Error updating promotion:', error)
      alert('Failed to update promotion')
    } finally {
      setSaving(false)
    }
  }

  const toggleEvent = (eventId: string) => {
    setFormData(prev => ({
      ...prev,
      eventIds: prev.eventIds.includes(eventId)
        ? prev.eventIds.filter(id => id !== eventId)
        : [...prev.eventIds, eventId]
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/promotions')}
          className="text-purple-400 hover:text-purple-300 mb-4"
        >
          ← Back to Promotions
        </button>
        <h1 className="text-3xl font-bold">Edit Promotion</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white/5 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Promotion Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2 bg-white/10 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Promo Code *</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                className="w-full px-4 py-2 bg-white/10 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              className="w-full px-4 py-2 bg-white/10 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Discount Settings */}
        <div className="bg-white/5 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold mb-4">Discount Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Discount Type *</label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({...formData, discountType: e.target.value, type: e.target.value})}
                className="w-full px-4 py-2 bg-white/10 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="percentage">Percentage Off</option>
                <option value="fixed">Fixed Amount Off</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Discount Value * {formData.discountType === 'percentage' ? '(%)' : '($)'}
              </label>
              <input
                type="number"
                required
                min="0"
                step={formData.discountType === 'percentage' ? '1' : '0.01'}
                value={formData.value}
                onChange={(e) => setFormData({...formData, value: parseFloat(e.target.value)})}
                className="w-full px-4 py-2 bg-white/10 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Usage Limits */}
        <div className="bg-white/5 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold mb-4">Usage Limits</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Max Total Uses</label>
              <input
                type="number"
                min="0"
                value={formData.maxUses}
                onChange={(e) => setFormData({...formData, maxUses: parseInt(e.target.value)})}
                placeholder="Unlimited"
                className="w-full px-4 py-2 bg-white/10 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Max Uses Per Customer</label>
              <input
                type="number"
                min="1"
                value={formData.maxUsesPerCustomer}
                onChange={(e) => setFormData({...formData, maxUsesPerCustomer: parseInt(e.target.value)})}
                className="w-full px-4 py-2 bg-white/10 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Minimum Purchase ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.minimumPurchase}
                onChange={(e) => setFormData({...formData, minimumPurchase: parseFloat(e.target.value)})}
                className="w-full px-4 py-2 bg-white/10 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Validity Period */}
        <div className="bg-white/5 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold mb-4">Validity Period</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Valid From *</label>
              <input
                type="datetime-local"
                required
                value={formData.validFrom}
                onChange={(e) => setFormData({...formData, validFrom: e.target.value})}
                className="w-full px-4 py-2 bg-white/10 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Valid To *</label>
              <input
                type="datetime-local"
                required
                value={formData.validTo}
                onChange={(e) => setFormData({...formData, validTo: e.target.value})}
                className="w-full px-4 py-2 bg-white/10 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Applicable Events */}
        <div className="bg-white/5 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold mb-4">Applicable Events</h2>
          <p className="text-sm text-gray-400 mb-4">Leave empty for all events (Master Promotion)</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
            {events.map(event => (
              <label key={event.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10">
                <input
                  type="checkbox"
                  checked={formData.eventIds.includes(event.id)}
                  onChange={() => toggleEvent(event.id)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{event.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="bg-white/5 rounded-xl p-6 border border-gray-800">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({...formData, active: e.target.checked})}
              className="w-5 h-5"
            />
            <div>
              <p className="font-medium">Active Promotion</p>
              <p className="text-sm text-gray-400">Enable this promotion for use</p>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-medium"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/promotions')}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
