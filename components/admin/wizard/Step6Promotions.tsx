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
    const linked = formData.promotions?.linkedPromotions?.includes(promotionId)
      ? formData.promotions?.linkedPromotions?.filter(id => id !== promotionId)
      : [...formData.promotions.linkedPromotions, promotionId]
    
    updateFormData('promotions', { linkedPromotions: linked })
  }
  
  const addEventPromotion = () => {
    if (!newPromotion.code || newPromotion.value <= 0) return
    
    const promotion = {
      ...newPromotion,
      code: newPromotion.code.toUpperCase(),
      applicableToTiers: formData.pricing?.tiers?.map(t => t.id) // Apply to all tiers by default
    }
    
    updateFormData('promotions', {
      eventPromotions: [...formData.promotions.eventPromotions, promotion]
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
  
  const removeEventPromotion = (index: number) => {
    updateFormData('promotions', {
      eventPromotions: formData.promotions?.eventPromotions?.filter((_, i) => i !== index)
    })
  }
  
  const toggleAutomaticDiscount = (type: string) => {
    updateFormData('promotions', {
      automaticDiscounts: {
        ...formData.promotions.automaticDiscounts,
        [type]: !formData.promotions.automaticDiscounts[type as keyof typeof formData.promotions.automaticDiscounts]
      }
    })
  }
  
  const generateBulkCodes = () => {
    const prefix = prompt('Enter prefix for codes (e.g., VIP):')
    const count = parseInt(prompt('How many codes to generate?') || '0')
    
    if (!prefix || count <= 0) return
    
    const bulkCodes = []
    for (let i = 1; i <= count; i++) {
      bulkCodes.push({
        code: `${prefix}${i.toString().padStart(4, '0')}`,
        type: 'percentage' as const,
        value: 10,
        maxUses: 1,
        validFrom: '',
        validTo: '',
        applicableToTiers: formData.pricing?.tiers?.map(t => t.id)
      })
    }
    
    updateFormData('promotions', {
      eventPromotions: [...formData.promotions.eventPromotions, ...bulkCodes]
    })
  }
  
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Link Existing Promotions */}
      <div>
        <label className="block text-sm font-medium mb-3">Link Existing Promotions</label>
        <div className="bg-black/20 rounded-lg p-4">
          {existingPromotions.length > 0 ? (
            <div className="space-y-2">
              {existingPromotions.map(promo => (
                <label key={promo.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.promotions?.linkedPromotions?.includes(promo.id)}
                      onChange={() => toggleLinkedPromotion(promo.id)}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <p className="font-semibold">{promo.code}</p>
                      <p className="text-xs text-gray-400">
                        {promo.type === 'percentage' ? `${promo.value}% off` : `$${promo.value} off`}
                        {promo.maxUses && ` • ${promo.maxUses - (promo.usedCount || 0)} uses remaining`}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    promo.active ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-gray-400'
                  }`}>
                    {promo.active ? 'Active' : 'Inactive'}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center">No existing promotions available</p>
          )}
        </div>
      </div>
      
      {/* Create Event-Specific Promotions */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="text-sm font-medium">Event-Specific Promotions</label>
          <button
            type="button"
            onClick={generateBulkCodes}
            className="px-3 py-1 bg-purple-600 rounded text-sm"
          >
            Generate Bulk Codes
          </button>
        </div>
        
        <div className="bg-black/20 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <input
              type="text"
              value={newPromotion.code}
              onChange={(e) => setNewPromotion({...newPromotion, code: e.target.value.toUpperCase()})}
              className="px-3 py-2 bg-white/10 rounded"
              placeholder="Code"
            />
            <select
              value={newPromotion.type}
              onChange={(e) => setNewPromotion({...newPromotion, type: e.target.value as 'percentage' | 'fixed'})}
              className="px-3 py-2 bg-white/10 rounded"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
            <input
              type="number"
              value={newPromotion.value}
              onChange={(e) => setNewPromotion({...newPromotion, value: parseFloat(e.target.value) || 0})}
              className="px-3 py-2 bg-white/10 rounded"
              placeholder="Value"
            />
            <button
              type="button"
              onClick={addEventPromotion}
              className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700"
            >
              Add Code
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1">Max Uses</label>
              <input
                type="number"
                value={newPromotion.maxUses}
                onChange={(e) => setNewPromotion({...newPromotion, maxUses: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 bg-white/10 rounded"
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Valid From</label>
              <input
                type="date"
                value={newPromotion.validFrom}
                onChange={(e) => setNewPromotion({...newPromotion, validFrom: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 rounded"
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Valid To</label>
              <input
                type="date"
                value={newPromotion.validTo}
                onChange={(e) => setNewPromotion({...newPromotion, validTo: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 rounded"
              />
            </div>
          </div>
        </div>
        
        {/* List of Event Promotions */}
        {(formData.promotions?.eventPromotions?.length || 0) > 0 && (
          <div className="mt-4 space-y-2">
            {formData.promotions?.eventPromotions?.map((promo, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="font-semibold">{promo.code}</p>
                  <p className="text-xs text-gray-400">
                    {promo.type === 'percentage' ? `${promo.value}% off` : `$${promo.value} off`}
                    {promo.maxUses && ` • ${promo.maxUses} uses`}
                    {promo.validFrom && ` • Valid from ${promo.validFrom}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeEventPromotion(index)}
                  className="text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Automatic Discounts */}
      <div>
        <label className="block text-sm font-medium mb-3">Automatic Discounts</label>
        <div className="bg-black/20 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-3">
            These will create automatic promo codes that customers can use at checkout
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.promotions?.automaticDiscounts?.student}
                onChange={() => toggleAutomaticDiscount('student')}
                className="w-5 h-5 rounded"
              />
              <div>
                <span className="font-medium">Student Discount</span>
                <p className="text-xs text-gray-400">Code: STUDENT - 15% off with valid student ID</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.promotions?.automaticDiscounts?.senior}
                onChange={() => toggleAutomaticDiscount('senior')}
                className="w-5 h-5 rounded"
              />
              <div>
                <span className="font-medium">Senior Discount</span>
                <p className="text-xs text-gray-400">Code: SENIOR - 10% off for 65+ years</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.promotions?.automaticDiscounts?.military}
                onChange={() => toggleAutomaticDiscount('military')}
                className="w-5 h-5 rounded"
              />
              <div>
                <span className="font-medium">Military Discount</span>
                <p className="text-xs text-gray-400">Code: MILITARY - 20% off with valid military ID</p>
              </div>
            </label>
          </div>
        </div>
      </div>
      
      {/* Promo Code Testing */}
      <div>
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
                const code = (document.getElementById('test-code') as HTMLInputElement)?.value
                if (code) {
                  // Test the code
                  const eventPromo = formData.promotions?.eventPromotions?.find(p => p.code === code.toUpperCase())
                  if (eventPromo) {
                    alert(`✅ Valid! ${eventPromo.type === 'percentage' ? `${eventPromo.value}% off` : `$${eventPromo.value} off`}`)
                  } else {
                    alert('❌ Invalid code for this event')
                  }
                }
              }}
              className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700"
            >
              Test Code
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
