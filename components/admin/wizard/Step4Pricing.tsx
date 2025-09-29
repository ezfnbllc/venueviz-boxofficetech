'use client'
import { useState, useEffect } from 'react'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'

export default function Step4Pricing() {
  const { formData, updateFormData } = useEventWizardStore()
  
  // Initialize pricing for each section/level from venue configuration
  useEffect(() => {
    if (formData.venue?.availableSections && formData.pricing?.tiers?.length === 0) {
      const initialTiers = formData.venue.availableSections
        .filter((s: any) => s.available)
        .map((section: any) => ({
          id: section.sectionId,
          name: section.sectionName,
          basePrice: section.basePrice || 0,
          sectionId: section.sectionId,
          capacity: section.capacity || 0,
          sold: 0
        }))
      
      if (initialTiers.length > 0) {
        updateFormData('pricing', { tiers: initialTiers })
      }
    }
  }, [formData.venue?.availableSections])
  
  const updateTierPrice = (tierId: string, price: number) => {
    const tiers = formData.pricing?.tiers?.map((tier: any) => 
      tier.id === tierId ? { ...tier, basePrice: price } : tier
    ) || []
    updateFormData('pricing', { tiers })
  }
  
  const updateFees = (field: string, value: any) => {
    const currentFees = formData.pricing?.fees || {}
    updateFormData('pricing', {
      fees: {
        ...currentFees,
        [field]: value
      }
    })
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
          ...currentDynamicPricing[type],
          [field]: value
        }
      }
    })
  }
  
  const isSeatingChart = formData.venue?.layoutType === 'seating_chart'
  const isGA = formData.venue?.layoutType === 'general_admission'
  
  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Ticket Pricing & Fees</h3>
      
      {/* Ticket Pricing by Section/Level */}
      <div className="mb-6">
        <h4 className="font-semibold mb-4">
          {isSeatingChart ? 'Section' : 'Level'} Pricing
        </h4>
        <div className="space-y-3">
          {formData.pricing?.tiers?.map((tier: any) => (
            <div key={tier.id} className="p-4 bg-black/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{tier.name}</p>
                  <p className="text-sm text-gray-400">
                    Capacity: {tier.capacity} {isSeatingChart ? 'seats' : 'tickets'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">$</span>
                  <input
                    type="number"
                    value={tier.basePrice || 0}
                    onChange={(e) => updateTierPrice(tier.id, parseFloat(e.target.value) || 0)}
                    className="w-32 px-3 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none text-right"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                  <span className="text-sm text-gray-400">per ticket</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Service Fees */}
      <div className="mb-6">
        <h4 className="font-semibold mb-4">Service & Transaction Fees</h4>
        <div className="space-y-4 p-4 bg-black/20 rounded-lg">
          {/* Convenience/Service Fee */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Convenience Fee
            </label>
            <div className="flex gap-3">
              <select
                value={formData.pricing?.fees?.serviceFeeType || 'fixed'}
                onChange={(e) => updateFees('serviceFeeType', e.target.value)}
                className="px-3 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
              >
                <option value="fixed">Fixed ($)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
              <input
                type="number"
                value={formData.pricing?.fees?.serviceFee || 0}
                onChange={(e) => updateFees('serviceFee', parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
                placeholder={formData.pricing?.fees?.serviceFeeType === 'percentage' ? '0%' : '$0.00'}
                step="0.01"
                min="0"
              />
              <select
                value={formData.pricing?.fees?.serviceFeePer || 'ticket'}
                onChange={(e) => updateFees('serviceFeePer', e.target.value)}
                className="px-3 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
              >
                <option value="ticket">Per Ticket</option>
                <option value="transaction">Per Transaction</option>
              </select>
            </div>
          </div>
          
          {/* Processing Fee */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Processing Fee
            </label>
            <div className="flex gap-3">
              <select
                value={formData.pricing?.fees?.processingFeeType || 'percentage'}
                onChange={(e) => updateFees('processingFeeType', e.target.value)}
                className="px-3 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
              >
                <option value="fixed">Fixed ($)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
              <input
                type="number"
                value={formData.pricing?.fees?.processingFee || 2.5}
                onChange={(e) => updateFees('processingFee', parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
                placeholder={formData.pricing?.fees?.processingFeeType === 'percentage' ? '0%' : '$0.00'}
                step="0.01"
                min="0"
              />
              <select
                value={formData.pricing?.fees?.processingFeePer || 'transaction'}
                onChange={(e) => updateFees('processingFeePer', e.target.value)}
                className="px-3 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
              >
                <option value="ticket">Per Ticket</option>
                <option value="transaction">Per Transaction</option>
              </select>
            </div>
          </div>
          
          {/* Facility Fee */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Facility Fee (Optional)
            </label>
            <div className="flex gap-3">
              <select
                value={formData.pricing?.fees?.facilityFeeType || 'fixed'}
                onChange={(e) => updateFees('facilityFeeType', e.target.value)}
                className="px-3 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
              >
                <option value="fixed">Fixed ($)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
              <input
                type="number"
                value={formData.pricing?.fees?.facilityFee || 0}
                onChange={(e) => updateFees('facilityFee', parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
                placeholder={formData.pricing?.fees?.facilityFeeType === 'percentage' ? '0%' : '$0.00'}
                step="0.01"
                min="0"
              />
              <select
                value={formData.pricing?.fees?.facilityFeePer || 'ticket'}
                onChange={(e) => updateFees('facilityFeePer', e.target.value)}
                className="px-3 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
              >
                <option value="ticket">Per Ticket</option>
                <option value="transaction">Per Transaction</option>
              </select>
            </div>
          </div>
          
          {/* Sales Tax */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Sales Tax
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                value={formData.pricing?.fees?.salesTax || 8.25}
                onChange={(e) => updateFees('salesTax', parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
                placeholder="0%"
                step="0.01"
                min="0"
                max="100"
              />
              <span className="px-3 py-2 text-gray-400">% (Applied to subtotal)</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dynamic Pricing (Optional) */}
      <div className="mb-6">
        <h4 className="font-semibold mb-4">Dynamic Pricing (Optional)</h4>
        <div className="space-y-4">
          {/* Early Bird Discount */}
          <div className="p-4 bg-black/20 rounded-lg">
            <label className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={formData.pricing?.dynamicPricing?.earlyBird?.enabled || false}
                onChange={(e) => updateDynamicPricing('earlyBird', 'enabled', e.target.checked)}
                className="w-5 h-5"
              />
              <span className="font-semibold">Early Bird Discount</span>
            </label>
            
            {formData.pricing?.dynamicPricing?.earlyBird?.enabled && (
              <div className="grid grid-cols-2 gap-3 ml-8">
                <div>
                  <label className="block text-xs mb-1">Discount %</label>
                  <input
                    type="number"
                    value={formData.pricing?.dynamicPricing?.earlyBird?.discount || 10}
                    onChange={(e) => updateDynamicPricing('earlyBird', 'discount', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white/10 rounded"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.pricing?.dynamicPricing?.earlyBird?.endDate || ''}
                    onChange={(e) => updateDynamicPricing('earlyBird', 'endDate', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 rounded"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Last Minute Markup */}
          <div className="p-4 bg-black/20 rounded-lg">
            <label className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={formData.pricing?.dynamicPricing?.lastMinute?.enabled || false}
                onChange={(e) => updateDynamicPricing('lastMinute', 'enabled', e.target.checked)}
                className="w-5 h-5"
              />
              <span className="font-semibold">Last Minute Pricing</span>
            </label>
            
            {formData.pricing?.dynamicPricing?.lastMinute?.enabled && (
              <div className="grid grid-cols-2 gap-3 ml-8">
                <div>
                  <label className="block text-xs mb-1">Markup %</label>
                  <input
                    type="number"
                    value={formData.pricing?.dynamicPricing?.lastMinute?.markup || 20}
                    onChange={(e) => updateDynamicPricing('lastMinute', 'markup', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white/10 rounded"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Days Before Event</label>
                  <input
                    type="number"
                    value={formData.pricing?.dynamicPricing?.lastMinute?.daysBeforeEvent || 2}
                    onChange={(e) => updateDynamicPricing('lastMinute', 'daysBeforeEvent', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white/10 rounded"
                    min="0"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
