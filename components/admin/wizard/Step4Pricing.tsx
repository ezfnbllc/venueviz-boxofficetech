'use client'
import { useState, useEffect } from 'react'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'

export default function Step4Pricing() {
  const { formData, updateFormData } = useEventWizardStore()
  
  // Initialize pricing tiers from venue configuration
  useEffect(() => {
    if (formData.venue?.availableSections?.length > 0 && (!formData.pricing?.tiers || formData.pricing.tiers.length === 0)) {
      const availableSections = formData.venue.availableSections.filter((s: any) => s.available)
      
      if (availableSections.length > 0) {
        const newTiers = availableSections.map((section: any) => ({
          id: section.sectionId,
          name: section.sectionName,
          basePrice: 0,
          sectionId: section.sectionId,
          capacity: section.capacity || 0
        }))
        
        updateFormData('pricing', {
          ...formData.pricing,
          tiers: newTiers
        })
      }
    }
  }, [formData.venue?.availableSections])
  
  const updateTierPrice = (tierId: string, price: number) => {
    const tiers = (formData.pricing?.tiers || []).map((tier: any) => 
      tier.id === tierId ? { ...tier, basePrice: price } : tier
    )
    updateFormData('pricing', {
      ...formData.pricing,
      tiers
    })
  }
  
  const updateFees = (field: string, value: any) => {
    updateFormData('pricing', {
      ...formData.pricing,
      fees: {
        ...formData.pricing?.fees,
        [field]: value
      }
    })
  }
  
  const isSeatingChart = formData.venue?.layoutType === 'seating_chart'
  const hasTiers = formData.pricing?.tiers?.length > 0
  
  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Ticket Pricing & Fees</h3>
      
      {/* Level/Section Pricing */}
      {hasTiers ? (
        <div className="mb-6">
          <h4 className="font-semibold mb-4">
            {isSeatingChart ? 'Section' : 'Level'} Pricing
          </h4>
          <div className="space-y-3">
            {formData.pricing.tiers.map((tier: any) => (
              <div key={tier.id} className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
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
                    value={tier.basePrice || ''}
                    onChange={(e) => updateTierPrice(tier.id, parseFloat(e.target.value) || 0)}
                    className="w-32 px-3 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none text-right"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                  <span className="text-sm text-gray-400">per ticket</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-yellow-600/20 rounded-lg text-yellow-300">
          No venue levels/sections available. Please go back to Step 2 and select a venue layout.
        </div>
      )}
      
      {/* Service & Transaction Fees - Compact Layout */}
      <div className="mb-6">
        <h4 className="font-semibold mb-4">Service & Transaction Fees</h4>
        <div className="space-y-3">
          {/* Convenience Fee */}
          <div className="flex items-center gap-3 p-4 bg-black/20 rounded-lg">
            <label className="w-32 text-sm">Convenience Fee</label>
            <select
              value={formData.pricing?.fees?.serviceFeeType || 'percentage'}
              onChange={(e) => updateFees('serviceFeeType', e.target.value)}
              className="px-3 py-2 bg-white/10 rounded-lg"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed ($)</option>
            </select>
            <input
              type="number"
              value={formData.pricing?.fees?.serviceFee ?? 4}
              onChange={(e) => updateFees('serviceFee', parseFloat(e.target.value) || 0)}
              className="w-24 px-3 py-2 bg-white/10 rounded-lg"
              placeholder="0"
              step="0.01"
              min="0"
            />
            <select
              value={formData.pricing?.fees?.serviceFeePer || 'ticket'}
              onChange={(e) => updateFees('serviceFeePer', e.target.value)}
              className="px-3 py-2 bg-white/10 rounded-lg"
            >
              <option value="ticket">Per Ticket</option>
              <option value="transaction">Per Transaction</option>
            </select>
          </div>
          
          {/* Processing Fee */}
          <div className="flex items-center gap-3 p-4 bg-black/20 rounded-lg">
            <label className="w-32 text-sm">Processing Fee</label>
            <select
              value={formData.pricing?.fees?.processingFeeType || 'percentage'}
              onChange={(e) => updateFees('processingFeeType', e.target.value)}
              className="px-3 py-2 bg-white/10 rounded-lg"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed ($)</option>
            </select>
            <input
              type="number"
              value={formData.pricing?.fees?.processingFee ?? 2.5}
              onChange={(e) => updateFees('processingFee', parseFloat(e.target.value) || 0)}
              className="w-24 px-3 py-2 bg-white/10 rounded-lg"
              placeholder="0"
              step="0.01"
              min="0"
            />
            <select
              value={formData.pricing?.fees?.processingFeePer || 'transaction'}
              onChange={(e) => updateFees('processingFeePer', e.target.value)}
              className="px-3 py-2 bg-white/10 rounded-lg"
            >
              <option value="ticket">Per Ticket</option>
              <option value="transaction">Per Transaction</option>
            </select>
          </div>
          
          {/* Facility Fee */}
          <div className="flex items-center gap-3 p-4 bg-black/20 rounded-lg">
            <label className="w-32 text-sm">Facility Fee</label>
            <select
              value={formData.pricing?.fees?.facilityFeeType || 'fixed'}
              onChange={(e) => updateFees('facilityFeeType', e.target.value)}
              className="px-3 py-2 bg-white/10 rounded-lg"
            >
              <option value="fixed">Fixed ($)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
            <input
              type="number"
              value={formData.pricing?.fees?.facilityFee ?? 0}
              onChange={(e) => updateFees('facilityFee', parseFloat(e.target.value) || 0)}
              className="w-24 px-3 py-2 bg-white/10 rounded-lg"
              placeholder="0"
              step="0.01"
              min="0"
            />
            <select
              value={formData.pricing?.fees?.facilityFeePer || 'ticket'}
              onChange={(e) => updateFees('facilityFeePer', e.target.value)}
              className="px-3 py-2 bg-white/10 rounded-lg"
            >
              <option value="ticket">Per Ticket</option>
              <option value="transaction">Per Transaction</option>
            </select>
          </div>
          
          {/* Sales Tax */}
          <div className="flex items-center gap-3 p-4 bg-black/20 rounded-lg">
            <label className="w-32 text-sm">Sales Tax</label>
            <input
              type="number"
              value={formData.pricing?.fees?.salesTax ?? 8.25}
              onChange={(e) => updateFees('salesTax', parseFloat(e.target.value) || 0)}
              className="w-24 px-3 py-2 bg-white/10 rounded-lg"
              placeholder="0"
              step="0.01"
              min="0"
              max="100"
            />
            <span className="text-gray-400">% (Applied to subtotal)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
