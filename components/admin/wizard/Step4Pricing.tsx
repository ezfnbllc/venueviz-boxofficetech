'use client'
import { useState, useEffect, useRef } from 'react'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'

export default function Step4Pricing() {
  const { formData, updateFormData } = useEventWizardStore()
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  // Prevent scroll on number inputs
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (document.activeElement?.getAttribute('type') === 'number') {
        e.preventDefault()
      }
    }
    
    // Add listener to all number inputs
    inputRefs.current.forEach(input => {
      if (input) {
        input.addEventListener('wheel', handleWheel, { passive: false })
      }
    })
    
    // Cleanup
    return () => {
      inputRefs.current.forEach(input => {
        if (input) {
          input.removeEventListener('wheel', handleWheel)
        }
      })
    }
  }, [formData.pricing?.tiers])
  
  useEffect(() => {
    console.log('Step4Pricing - Price Categories:', formData.venue?.priceCategories)
    console.log('Step4Pricing - Available Sections:', formData.venue?.availableSections)
    
    if (formData.venue?.availableSections?.length > 0) {
      const isSeatingChart = formData.venue?.layoutType === 'seating_chart'
      const priceCategories = formData.venue?.priceCategories || []
      const availableSections = formData.venue.availableSections?.filter((s: any) => s.available) || []

      if (availableSections.length > 0) {
        // Use price categories for both seating charts AND GA layouts with price categories
        const hasPriceCategories = priceCategories.length > 0
        const sectionsHavePriceCategories = availableSections.some((s: any) => s.priceCategoryId || s.priceCategory)

        if (hasPriceCategories && (isSeatingChart || sectionsHavePriceCategories)) {
          console.log('Creating price category based tiers for', isSeatingChart ? 'seating chart' : 'GA layout')
          
          const tiersByCategory = new Map()
          
          // Create tiers from price categories
          priceCategories.forEach((category: any) => {
            tiersByCategory.set(category.id, {
              id: category.id,
              name: category.name,
              basePrice: category.price || 0,
              categoryId: category.id,
              color: category.color || '#666666',
              sections: [],
              capacity: 0,
              isFromLayout: true
            })
          })
          
          // Assign sections to their categories
          availableSections.forEach((section: any) => {
            const categoryId = section.priceCategoryId || 
                             section.priceCategory?.id || 
                             section.priceCategory ||
                             section.pricing ||
                             'standard'
            
            const tier = tiersByCategory.get(categoryId)
            if (tier) {
              tier.sections.push({
                sectionId: section.sectionId,
                sectionName: section.sectionName,
                capacity: section.capacity || 0
              })
              tier.capacity += section.capacity || 0
            }
          })
          
          const newTiers = Array.from(tiersByCategory.values()).filter(tier => tier.capacity > 0)
          
          updateFormData('pricing', {
            ...formData.pricing,
            tiers: newTiers,
            usePriceCategories: true,
            layoutId: formData.venue.layoutId,
            isSeatingChart: isSeatingChart
          })
        } else {
          // Per-section pricing fallback
          const newTiers = availableSections.map((section: any) => {
            const existingTier = formData.pricing?.tiers?.find((t: any) => 
              t.id === section.sectionId || t.sectionId === section.sectionId
            )
            
            return {
              id: section.sectionId,
              name: section.sectionName,
              basePrice: existingTier?.basePrice || 0,
              sectionId: section.sectionId,
              capacity: section.capacity || 0,
              isFromLayout: false
            }
          })
          
          updateFormData('pricing', {
            ...formData.pricing,
            tiers: newTiers,
            usePriceCategories: false,
            layoutId: formData.venue.layoutId,
            isSeatingChart: isSeatingChart
          })
        }
      }
    }
  }, [formData.venue?.availableSections, formData.venue?.priceCategories, formData.venue?.layoutId])
  
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
  const usePriceCategories = formData.pricing?.usePriceCategories
  
  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Ticket Pricing & Fees</h3>
      
      {isSeatingChart && formData.venue?.priceCategories?.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-600/30 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            💡 Pricing is based on price categories from your seating chart layout.
          </p>
        </div>
      )}
      
      {hasTiers ? (
        <div className="mb-6">
          <h4 className="font-semibold mb-4">
            {usePriceCategories ? 'Price Categories' : 'Section Pricing'}
          </h4>
          
          <div className="space-y-3">
            {formData.pricing.tiers.map((tier: any, index: number) => (
              <div key={tier.id} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {tier.color && (
                        <div 
                          className="w-5 h-5 rounded"
                          style={{ backgroundColor: tier.color }}
                        />
                      )}
                      <div>
                        <p className="font-semibold text-lg">{tier.name}</p>
                        {tier.isFromLayout && (
                          <span className="text-xs text-blue-600 dark:text-blue-400">From Layout</span>
                        )}
                      </div>
                    </div>
                    
                    {tier.sections && tier.sections.length > 0 && (
                      <div className="mt-2 pl-8">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Sections:</p>
                        <div className="flex flex-wrap gap-1">
                          {tier.sections.map((section: any) => (
                            <span 
                              key={section.sectionId} 
                              className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded text-xs"
                            >
                              {section.sectionName} • {section.capacity} seats
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 pl-8">
                      Total Capacity: <span className="font-semibold">{tier.capacity}</span> seats
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-slate-500 dark:text-slate-400">$</span>
                    <input
                      ref={el => inputRefs.current[index] = el}
                      type="number"
                      value={tier.basePrice || ''}
                      onChange={(e) => updateTierPrice(tier.id, parseFloat(e.target.value) || 0)}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-32 px-3 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg focus:bg-white/20 outline-none text-right"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                    <span className="text-sm text-slate-500 dark:text-slate-400">per ticket</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-600/30 border border-blue-200 dark:border-blue-600/40 rounded-lg text-center">
            <p className="font-semibold">
              Total Event Capacity: {
                formData.pricing.tiers.reduce((sum: number, tier: any) => sum + (tier.capacity || 0), 0)
              } seats
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-yellow-600/20 border border-amber-200 dark:border-yellow-600/30 rounded-lg text-amber-700 dark:text-yellow-400">
          No venue sections available. Please go back to Step 2 and select a venue layout.
        </div>
      )}
      
      <div className="mb-6">
        <h4 className="font-semibold mb-4">Service & Transaction Fees</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
            <label className="w-32 text-sm">Convenience Fee</label>
            <select
              value={formData.pricing?.fees?.serviceFeeType || 'percentage'}
              onChange={(e) => updateFees('serviceFeeType', e.target.value)}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed ($)</option>
            </select>
            <input
              type="number"
              value={formData.pricing?.fees?.serviceFee ?? 0}
              onChange={(e) => updateFees('serviceFee', parseFloat(e.target.value) || 0)}
              onWheel={(e) => e.currentTarget.blur()}
              className="w-20 px-3 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg text-center"
              placeholder="0"
              step={formData.pricing?.fees?.serviceFeeType === 'percentage' ? '0.1' : '0.01'}
              min="0"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
