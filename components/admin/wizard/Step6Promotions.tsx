'use client'
import { useState, useEffect } from 'react'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'
import { AdminService } from '@/lib/admin/adminService'

export default function Step6Promotions() {
  const { formData, updateFormData } = useEventWizardStore()
  const [existingPromotions, setExistingPromotions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newPromotion, setNewPromotion] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: 0,
    maxUses: 100,
    validFrom: '',
    validTo: '',
    applicableToTiers: [] as string[]
  })
  
  useEffect(() => {
    loadPromotions()
  }, [])
  
  const loadPromotions = async () => {
    setLoading(true)
    try {
      const promotionsData = await AdminService.getPromotions()
      setExistingPromotions(promotionsData.filter((p: any) => p.active !== false))
    } catch (error) {
      console.error('Error loading promotions:', error)
    }
    setLoading(false)
  }
  
  const toggleLinkedPromotion = (promotionId: string) => {
    const currentLinked = formData.promotions?.linkedPromotions || []
    const linked = currentLinked.includes(promotionId)
      ? currentLinked.filter(id => id !== promotionId)
      : [...currentLinked, promotionId]
    
    updateFormData('promotions', { 
      ...formData.promotions,
      linkedPromotions: linked 
    })
  }
  
  const addEventPromotion = () => {
    if (!newPromotion.code || newPromotion.value <= 0) return
    
    const promotion = {
      ...newPromotion,
      id: Date.now().toString(),
      code: newPromotion.code.toUpperCase(),
      applicableToTiers: formData.pricing?.tiers?.map(t => t.id) || []
    }
    
    const currentEventPromotions = formData.promotions?.eventPromotions || []
    updateFormData('promotions', {
      ...formData.promotions,
      eventPromotions: [...currentEventPromotions, promotion]
    })
    
    // Reset form
    setNewPromotion({
      code: '',
      type: 'percentage',
      value: 0,
      maxUses: 100,
      validFrom: '',
      validTo: '',
      applicableToTiers: []
    })
  }
  
  const removeEventPromotion = (id: string) => {
    const eventPromotions = formData.promotions?.eventPromotions?.filter(p => p.id !== id) || []
    updateFormData('promotions', {
      ...formData.promotions,
      eventPromotions
    })
  }
  
  const testPromoCode = (code: string) => {
    if (!code) {
      alert('Please enter a code to test')
      return
    }
    
    const upperCode = code.toUpperCase()
    
    // Check event-specific promotions first
    const eventPromo = formData.promotions?.eventPromotions?.find(
      p => p.code === upperCode
    )
    
    if (eventPromo) {
      alert(`✅ Valid! ${eventPromo.type === 'percentage' ? 
        `${eventPromo.value}% off` : 
        `$${eventPromo.value} off`}`)
      return
    }
    
    // Check linked existing promotions
    const linkedPromoIds = formData.promotions?.linkedPromotions || []
    const linkedPromo = existingPromotions.find(
      p => linkedPromoIds.includes(p.id) && p.code === upperCode
    )
    
    if (linkedPromo) {
      alert(`✅ Valid! ${linkedPromo.discountType === 'percentage' ? 
        `${linkedPromo.discountValue}% off` : 
        `$${linkedPromo.discountValue} off`} (System-wide promotion)`)
      return
    }
    
    alert('❌ Invalid code for this event')
  }
  
  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Promotions & Discounts</h3>
      
      {/* Link Existing Promotions */}
      <div className="mb-6">
        <h4 className="font-semibold mb-3">Link Existing Promotions</h4>
        {loading ? (
          <p className="text-gray-400">Loading promotions...</p>
        ) : existingPromotions.length > 0 ? (
          <div className="space-y-2">
            {existingPromotions.map((promo) => (
              <div 
                key={promo.id} 
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  formData.promotions?.linkedPromotions?.includes(promo.id)
                    ? 'bg-purple-600/20 border-purple-600'
                    : 'bg-black/20 border-gray-600 hover:border-gray-500'
                }`}
                onClick={() => toggleLinkedPromotion(promo.id)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.promotions?.linkedPromotions?.includes(promo.id) || false}
                      onChange={() => {}}
                      className="w-5 h-5"
                    />
                    <div>
                      <p className="font-semibold">{promo.code}</p>
                      <p className="text-sm text-gray-400">
                        {promo.discountType === 'percentage' ? `${promo.discountValue || promo.value || promo.discount}% off` : `$${promo.discountValue || promo.value || promo.discount} off`}
                        • {promo.maxUses ? `${promo.maxUses} uses remaining` : 'Unlimited'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    promo.active ? 'bg-green-600' : 'bg-gray-600'
                  }`}>
                    {promo.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No existing promotions available</p>
        )}
      </div>
      
      {/* Event-Specific Promotions */}
      <div className="mb-6">
        <h4 className="font-semibold mb-3">Event-Specific Promotions</h4>
        
        {/* Add New Promotion Form */}
        <div className="bg-black/20 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              placeholder="Promo code"
              value={newPromotion.code}
              onChange={(e) => setNewPromotion({...newPromotion, code: e.target.value})}
              className="px-3 py-2 bg-white/10 rounded"
            />
            <div className="flex gap-2">
              <select
                value={newPromotion.type}
                onChange={(e) => setNewPromotion({...newPromotion, type: e.target.value as 'percentage' | 'fixed'})}
                className="px-3 py-2 bg-white/10 rounded flex-1"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
              <input
                type="number"
                placeholder="Value"
                value={newPromotion.value}
                onChange={(e) => setNewPromotion({...newPromotion, value: parseFloat(e.target.value) || 0})}
                className="w-24 px-3 py-2 bg-white/10 rounded"
                min="0"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mb-3">
            <input
              type="number"
              placeholder="Max uses"
              value={newPromotion.maxUses}
              onChange={(e) => setNewPromotion({...newPromotion, maxUses: parseInt(e.target.value) || 0})}
              className="px-3 py-2 bg-white/10 rounded"
              min="0"
            />
            <input
              type="date"
              placeholder="Valid from"
              value={newPromotion.validFrom}
              onChange={(e) => setNewPromotion({...newPromotion, validFrom: e.target.value})}
              className="px-3 py-2 bg-white/10 rounded"
            />
            <input
              type="date"
              placeholder="Valid to"
              value={newPromotion.validTo}
              onChange={(e) => setNewPromotion({...newPromotion, validTo: e.target.value})}
              className="px-3 py-2 bg-white/10 rounded"
            />
          </div>
          
          <button
            type="button"
            onClick={addEventPromotion}
            className="w-full px-4 py-2 bg-purple-600 rounded hover:bg-purple-700 transition-colors"
          >
            Add Code
          </button>
        </div>
        
        {/* List Event Promotions */}
        {formData.promotions?.eventPromotions?.length > 0 && (
          <div className="space-y-2">
            {formData.promotions.eventPromotions.map((promo: any) => (
              <div key={promo.id} className="flex justify-between items-center p-3 bg-black/20 rounded-lg">
                <div>
                  <span className="font-semibold">{promo.code}</span>
                  <span className="text-sm text-gray-400 ml-3">
                    {promo.type === 'percentage' ? `${promo.value}%` : `$${promo.value}`} off
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeEventPromotion(promo.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Test Promo Code */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3">Test Promo Code</label>
        <div className="bg-black/20 rounded-lg p-4">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter code to test"
              className="flex-1 px-3 py-2 bg-white/10 rounded"
              id="test-code"
            />
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById('test-code') as HTMLInputElement
                if (input) {
                  testPromoCode(input.value)
                }
              }}
              className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              Test Code
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
