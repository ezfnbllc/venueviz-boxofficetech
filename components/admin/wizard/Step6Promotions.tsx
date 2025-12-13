'use client'

import React, { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'

export default function Step6Promotions() {
  const { formData, updateFormData } = useEventWizardStore()
  
  const [promotions, setPromotions] = useState<any[]>([])
  const [newPromoCode, setNewPromoCode] = useState('')
  const [newPromoType, setNewPromoType] = useState<'percentage' | 'fixed'>('percentage')
  const [newPromoValue, setNewPromoValue] = useState(0)
  const [newPromoMaxUses, setNewPromoMaxUses] = useState<number | null>(null)
  
  // Get promotions data from the promotions section
  const promotionsData = formData.promotions || {}
  const eventPromotions = promotionsData.eventPromotions || []
  const linkedPromotions = promotionsData.linkedPromotions || []

  // Update promotions section in store
  const handleUpdate = (updates: any) => {
    console.log('[Step6] Updating promotions section:', updates)
    updateFormData('promotions', updates)
  }

  useEffect(() => {
    fetchPromotions()
  }, [])

  const fetchPromotions = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'promotions'))
      const promos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setPromotions(promos)
    } catch (error) {
      console.error('Error fetching promotions:', error)
    }
  }

  const toggleLinkedPromotion = (promoId: string) => {
    let updated: string[]
    
    if (linkedPromotions.includes(promoId)) {
      updated = linkedPromotions.filter(id => id !== promoId)
    } else {
      updated = [...linkedPromotions, promoId]
    }
    
    handleUpdate({ linkedPromotions: updated })
  }

  const addEventPromo = () => {
    if (!newPromoCode || newPromoValue <= 0) return

    const newPromo = {
      id: `promo-${Date.now()}`,
      code: newPromoCode,
      type: newPromoType,
      value: newPromoValue,
      maxUses: newPromoMaxUses,
      usedCount: 0
    }

    handleUpdate({ 
      eventPromotions: [...eventPromotions, newPromo] 
    })

    // Reset form
    setNewPromoCode('')
    setNewPromoValue(0)
    setNewPromoMaxUses(null)
  }

  const removeEventPromo = (promoId: string) => {
    const updated = eventPromotions.filter(p => p.id !== promoId)
    handleUpdate({ eventPromotions: updated })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Promotions & Discounts</h2>
        <p className="text-slate-500 dark:text-slate-400">Configure promotional codes</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Link Existing Promotions</h3>
        <div className="space-y-3">
          {promotions.length > 0 ? (
            promotions.map((promo) => (
              <div key={promo.id} className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <label className="flex items-center gap-3 flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkedPromotions.includes(promo.id)}
                    onChange={() => toggleLinkedPromotion(promo.id)}
                    className="w-4 h-4 text-blue-600 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{promo.code || 'PROMO'}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {promo.type === 'percentage' ? `${promo.value}% off` : `$${promo.value} off`}
                    </div>
                  </div>
                </label>
                <span className={`px-3 py-1 rounded-full text-xs ${
                  promo.active !== false ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-slate-500 dark:text-slate-400'
                }`}>
                  {promo.active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))
          ) : (
            <div className="p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 text-center">
              No promotions available
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Event-Specific Promotions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            value={newPromoCode}
            onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg"
            placeholder="Promo code"
          />
          
          <select
            value={newPromoType}
            onChange={(e) => setNewPromoType(e.target.value as any)}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg"
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed Amount</option>
          </select>
          
          <input
            type="number"
            value={newPromoValue}
            onChange={(e) => setNewPromoValue(parseFloat(e.target.value) || 0)}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg"
            placeholder={newPromoType === 'percentage' ? 'Discount %' : 'Discount $'}
            min="0"
          />
          
          <input
            type="number"
            value={newPromoMaxUses || ''}
            onChange={(e) => setNewPromoMaxUses(e.target.value ? parseInt(e.target.value) : null)}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg"
            placeholder="Max uses (optional)"
            min="1"
          />
        </div>

        <button
          onClick={addEventPromo}
          disabled={!newPromoCode || newPromoValue <= 0}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-600"
        >
          Add Code
        </button>

        <div className="space-y-2">
          {eventPromotions.map((promo) => (
            <div key={promo.id} className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div>
                <span className="font-bold">{promo.code}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400 ml-3">
                  {promo.type === 'percentage' ? `${promo.value}% off` : `$${promo.value} off`}
                  {promo.maxUses && ` • Max ${promo.maxUses} uses`}
                </span>
              </div>
              <button
                onClick={() => removeEventPromo(promo.id)}
                className="text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
