'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useFirebaseAuth } from '@/lib/firebase-auth'

export default function NewPromotionPage() {
  const router = useRouter()
  const { user, isAdmin } = useFirebaseAuth()

  const [saving, setSaving] = useState(false)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    discountType: 'percentage',
    value: 10,
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
    loadEvents()
    // Set default dates
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
    setFormData(prev => ({
      ...prev,
      validFrom: now.toISOString().slice(0, 16),
      validTo: nextMonth.toISOString().slice(0, 16)
    }))
  }, [])

  const loadEvents = async () => {
    try {
      const eventsSnapshot = await getDocs(collection(db, 'events'))
      const eventsData = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setEvents(eventsData)
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  const generatePromoCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData(prev => ({ ...prev, code }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.code) {
      alert('Please fill in all required fields')
      return
    }

    setSaving(true)

    try {
      await addDoc(collection(db, 'promotions'), {
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
        validFrom: Timestamp.fromDate(new Date(formData.validFrom)),
        validTo: Timestamp.fromDate(new Date(formData.validTo)),
        active: formData.active,
        eventIds: formData.eventIds,
        applicableCategories: formData.applicableCategories,
        minimumPurchase: parseFloat(formData.minimumPurchase.toString()),
        usedCount: 0,
        createdAt: Timestamp.now(),
        createdBy: user?.uid || null
      })

      alert('Promotion created successfully!')
      router.push('/admin/promotions')
    } catch (error) {
      console.error('Error creating promotion:', error)
      alert('Failed to create promotion')
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
      <div className="flex items-center justify-center min-h-[400px]">
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
        <h1 className="text-3xl font-bold">Create New Promotion</h1>
        <p className="text-gray-400 mt-1">Set up a new discount code or special offer</p>
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
                placeholder="e.g., Summer Sale, Early Bird Discount"
                className="w-full px-4 py-2 bg-white/10 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Promo Code *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="e.g., SUMMER20"
                  className="flex-1 px-4 py-2 bg-white/10 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase"
                />
                <button
                  type="button"
                  onClick={generatePromoCode}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              placeholder="Describe the promotion for internal reference..."
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
                onChange={(e) => setFormData({...formData, discountType: e.target.value})}
                className="w-full px-4 py-2 bg-white/10 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="percentage">Percentage Off (%)</option>
                <option value="fixed">Fixed Amount Off ($)</option>
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
                max={formData.discountType === 'percentage' ? '100' : undefined}
                value={formData.value}
                onChange={(e) => setFormData({...formData, value: parseFloat(e.target.value)})}
                className="w-full px-4 py-2 bg-white/10 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="mt-4 p-4 bg-purple-600/20 rounded-lg">
            <p className="text-sm text-gray-300">Discount Preview:</p>
            <p className="text-2xl font-bold text-purple-400">
              {formData.discountType === 'percentage'
                ? `${formData.value}% OFF`
                : `$${formData.value.toFixed(2)} OFF`}
            </p>
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
                placeholder="0 = Unlimited"
                className="w-full px-4 py-2 bg-white/10 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-400 mt-1">0 = Unlimited uses</p>
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
              <p className="text-xs text-gray-400 mt-1">0 = No minimum</p>
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
          <h2 className="text-xl font-bold mb-2">Applicable Events</h2>
          <p className="text-sm text-gray-400 mb-4">
            Leave empty to apply to ALL events (Master Promotion).
            Or select specific events below.
          </p>

          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No events found. This promotion will apply to all future events.</p>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, eventIds: [] }))}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, eventIds: events.map(e => e.id) }))}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm"
                >
                  Select All
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {events.map(event => (
                  <label
                    key={event.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      formData.eventIds.includes(event.id)
                        ? 'bg-purple-600/30 border border-purple-500'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.eventIds.includes(event.id)}
                      onChange={() => toggleEvent(event.id)}
                      className="w-4 h-4 accent-purple-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.name}</p>
                      <p className="text-xs text-gray-400 truncate">{event.venueName || 'No venue'}</p>
                    </div>
                  </label>
                ))}
              </div>

              {formData.eventIds.length > 0 && (
                <p className="text-sm text-purple-400 mt-3">
                  {formData.eventIds.length} event(s) selected
                </p>
              )}
            </>
          )}
        </div>

        {/* Status */}
        <div className="bg-white/5 rounded-xl p-6 border border-gray-800">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({...formData, active: e.target.checked})}
              className="w-5 h-5 accent-purple-500"
            />
            <div>
              <p className="font-medium">Active Promotion</p>
              <p className="text-sm text-gray-400">Enable this promotion immediately after creation</p>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 rounded-lg font-medium transition-all"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Creating...
              </span>
            ) : (
              'Create Promotion'
            )}
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
