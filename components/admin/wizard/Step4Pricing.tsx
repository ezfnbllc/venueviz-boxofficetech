'use client'
import { useState, useEffect } from 'react'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'

export default function Step4Pricing() {
  const { formData, updateFormData } = useEventWizardStore()
  const [newTier, setNewTier] = useState({
    name: '',
    basePrice: 0,
    serviceFee: 5,
    inventory: 0
  })
  
  const addPricingTier = () => {
    if (!newTier.name || newTier.basePrice <= 0) return
    
    const tier = {
      id: Date.now().toString(),
      name: newTier.name,
      basePrice: newTier.basePrice,
      sections: [],
      inventory: newTier.inventory,
      serviceFee: newTier.serviceFee
    }
    
    updateFormData('pricing', {
      tiers: [...formData.pricing.tiers, tier]
    })
    
    setNewTier({ name: '', basePrice: 0, serviceFee: 5, inventory: 0 })
  }
  
  const removeTier = (tierId: string) => {
    updateFormData('pricing', {
      tiers: formData.pricing.tiers.filter(t => t.id !== tierId)
    })
  }
  
  const assignSectionToTier = (tierId: string, sectionId: string) => {
    const tiers = formData.pricing.tiers.map(tier => {
      // Remove section from all tiers first
      const sections = tier.sections.filter(s => s !== sectionId)
      
      // Add to selected tier
      if (tier.id === tierId && !tier.sections.includes(sectionId)) {
        sections.push(sectionId)
      }
      
      return { ...tier, sections }
    })
    
    updateFormData('pricing', { tiers })
  }
  
  const updateDynamicPricing = (type: string, field: string, value: any) => {
    const currentDynamicPricing = formData.pricing?.dynamicPricing || {
      earlyBird: { enabled: false, discount: 10, endDate: '' },
      lastMinute: { enabled: false, markup: 20, startDate: '' }
    }
    
    updateFormData('pricing', {
      dynamicPricing: {
        ...currentDynamicPricing,
        [type]: {
          ...currentDynamicPricing[type as keyof typeof currentDynamicPricing],
          [field]: value
        }
      }
    })
  }
  
  const updateFees = (field: string, value: number) => {
    updateFormData('pricing', {
      fees: {
        ...formData.pricing?.fees,
        [field]: value
      }
    })
  }
  
  return (
    <div className="space-y-6">
      {/* Pricing Tiers */}
      <div>
        <label className="block text-sm font-medium mb-3">Pricing Tiers</label>
        
        <div className="bg-black/20 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-5 gap-3 mb-3">
            <input
              type="text"
              value={newTier.name}
              onChange={(e) => setNewTier({...newTier, name: e.target.value})}
              className="px-3 py-2 bg-white/10 rounded"
              placeholder="Tier name"
            />
            <input
              type="number"
              value={newTier.basePrice}
              onChange={(e) => setNewTier({...newTier, basePrice: parseFloat(e.target.value) || 0})}
              className="px-3 py-2 bg-white/10 rounded"
              placeholder="Base price"
            />
            <input
              type="number"
              value={newTier.inventory}
              onChange={(e) => setNewTier({...newTier, inventory: parseInt(e.target.value) || 0})}
              className="px-3 py-2 bg-white/10 rounded"
              placeholder="Inventory"
            />
            <input
              type="number"
              value={newTier.serviceFee}
              onChange={(e) => setNewTier({...newTier, serviceFee: parseFloat(e.target.value) || 0})}
              className="px-3 py-2 bg-white/10 rounded"
              placeholder="Service fee"
            />
            <button
              type="button"
              onClick={addPricingTier}
              className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700"
            >
              Add Tier
            </button>
          </div>
        </div>
        
        {(formData.pricing?.tiers?.length || 0) > 0 && (
          <div className="space-y-3">
            {formData.pricing.tiers.map(tier => (
              <div key={tier.id} className="bg-white/5 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">{tier.name}</h4>
                    <p className="text-sm text-gray-400">
                      ${tier.basePrice} + ${tier.serviceFee} fee | Inventory: {tier.inventory}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTier(tier.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
                
                {/* Section Assignment */}
                {(formData.venue?.availableSections?.length || 0) > 0 && (
                  <div>
                    <p className="text-sm mb-2">Assigned Sections:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.venue.availableSections
                        .filter(s => s.available)
                        .map(section => (
                          <button
                            key={section.sectionId}
                            type="button"
                            onClick={() => assignSectionToTier(tier.id, section.sectionId)}
                            className={`px-3 py-1 rounded text-sm ${
                              tier.sections.includes(section.sectionId)
                                ? 'bg-purple-600'
                                : 'bg-gray-600 hover:bg-gray-500'
                            }`}
                          >
                            {section.sectionName}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Dynamic Pricing */}
      <div>
        <label className="block text-sm font-medium mb-3">Dynamic Pricing</label>
        
        <div className="space-y-4">
          {/* Early Bird */}
          <div className="bg-black/20 rounded-lg p-4">
            <label className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={formData.pricing?.dynamicPricing?.earlyBird.enabled}
                onChange={(e) => updateDynamicPricing('earlyBird', 'enabled', e.target.checked)}
                className="w-5 h-5"
              />
              <span className="font-semibold">Early Bird Discount</span>
            </label>
            
            {formData.pricing?.dynamicPricing?.earlyBird.enabled && (
              <div className="grid grid-cols-2 gap-3 ml-8">
                <div>
                  <label className="block text-xs mb-1">Discount %</label>
                  <input
                    type="number"
                    value={formData.pricing?.dynamicPricing?.earlyBird.discount}
                    onChange={(e) => updateDynamicPricing('earlyBird', 'discount', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white/10 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.pricing?.dynamicPricing?.earlyBird.endDate}
                    onChange={(e) => updateDynamicPricing('earlyBird', 'endDate', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 rounded"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Last Minute */}
          <div className="bg-black/20 rounded-lg p-4">
            <label className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={formData.pricing?.dynamicPricing?.lastMinute.enabled}
                onChange={(e) => updateDynamicPricing('lastMinute', 'enabled', e.target.checked)}
                className="w-5 h-5"
              />
              <span className="font-semibold">Last Minute Markup</span>
            </label>
            
            {formData.pricing?.dynamicPricing?.lastMinute.enabled && (
              <div className="grid grid-cols-2 gap-3 ml-8">
                <div>
                  <label className="block text-xs mb-1">Markup %</label>
                  <input
                    type="number"
                    value={formData.pricing?.dynamicPricing?.lastMinute.markup}
                    onChange={(e) => updateDynamicPricing('lastMinute', 'markup', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white/10 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Days Before Event</label>
                  <input
                    type="number"
                    value={formData.pricing?.dynamicPricing?.lastMinute.daysBeforeEvent}
                    onChange={(e) => updateDynamicPricing('lastMinute', 'daysBeforeEvent', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white/10 rounded"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Group Discount */}
          <div className="bg-black/20 rounded-lg p-4">
            <label className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={formData.pricing?.dynamicPricing.groupDiscount.enabled}
                onChange={(e) => updateDynamicPricing('groupDiscount', 'enabled', e.target.checked)}
                className="w-5 h-5"
              />
              <span className="font-semibold">Group Discount</span>
            </label>
            
            {formData.pricing?.dynamicPricing.groupDiscount.enabled && (
              <div className="grid grid-cols-2 gap-3 ml-8">
                <div>
                  <label className="block text-xs mb-1">Min Group Size</label>
                  <input
                    type="number"
                    value={formData.pricing?.dynamicPricing.groupDiscount.minSize}
                    onChange={(e) => updateDynamicPricing('groupDiscount', 'minSize', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white/10 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Discount %</label>
                  <input
                    type="number"
                    value={formData.pricing?.dynamicPricing.groupDiscount.discount}
                    onChange={(e) => updateDynamicPricing('groupDiscount', 'discount', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white/10 rounded"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Platform Fees */}
      <div>
        <label className="block text-sm font-medium mb-3">Platform Fees</label>
        <div className="bg-black/20 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1">Processing Fee (%)</label>
              <input
                type="number"
                value={formData.pricing?.fees.processingFee}
                onChange={(e) => updateFees('processingFee', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-white/10 rounded"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Platform Fee (%)</label>
              <input
                type="number"
                value={formData.pricing?.fees.platformFee}
                onChange={(e) => updateFees('platformFee', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-white/10 rounded"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Tax Rate (%)</label>
              <input
                type="number"
                value={formData.pricing?.fees.taxRate}
                onChange={(e) => updateFees('taxRate', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-white/10 rounded"
                step="0.1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
