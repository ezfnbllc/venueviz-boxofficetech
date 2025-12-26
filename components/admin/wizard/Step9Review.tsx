'use client'

import React, { useEffect, useState } from 'react'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

export default function Step9Review() {
  const { formData } = useEventWizardStore()
  const [linkedPromotionDetails, setLinkedPromotionDetails] = useState<any[]>([])
  const [venueDetails, setVenueDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAdditionalData = async () => {
      try {
        // Fetch venue details
        if (formData.venue?.venueId) {
          const venueDoc = await getDoc(doc(db, 'venues', formData.venue.venueId))
          if (venueDoc.exists()) {
            setVenueDetails(venueDoc.data())
          }
        }

        // Fetch linked promotion details
        if (formData.promotions?.linkedPromotions?.length > 0) {
          const promoDetails = []
          for (const promoId of formData.promotions.linkedPromotions) {
            const promoDoc = await getDoc(doc(db, 'promotions', promoId))
            if (promoDoc.exists()) {
              promoDetails.push({ id: promoId, ...promoDoc.data() })
            }
          }
          setLinkedPromotionDetails(promoDetails)
        }
      } catch (error) {
        console.error('Error fetching additional data:', error)
      }
      setLoading(false)
    }

    fetchAdditionalData()
  }, [formData])

  // Format address object to string
  const formatAddress = (address: any) => {
    if (!address) return 'Not available'
    if (typeof address === 'string') return address
    
    // Handle address object
    const parts = []
    if (address.street) parts.push(address.street)
    if (address.city) parts.push(address.city)
    if (address.state) parts.push(address.state)
    if (address.zip) parts.push(address.zip)
    if (address.country) parts.push(address.country)
    
    return parts.join(', ') || 'Not available'
  }

  // Format date for display
  const formatDate = (date: any) => {
    if (!date) return 'Not set'
    try {
      const d = new Date(date)
      return d.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (e) {
      return date.toString()
    }
  }

  // Calculate total capacity
  const getTotalCapacity = () => {
    if (formData.venue?.availableSections?.length > 0) {
      return formData.venue.availableSections.reduce((sum: number, section: any) => 
        sum + (section.capacity || 0), 0
      )
    }
    return 0
  }

  if (loading) {
    return <div className="p-8 text-center animate-pulse">Preparing review...</div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-purple-600/20 dark:to-blue-600/20 rounded-lg p-6 border border-blue-200 dark:border-transparent">
        <h2 className="text-3xl font-bold mb-2">{formData.basics?.name || 'Untitled Event'}</h2>
        <p className="text-slate-600 dark:text-slate-300">{formData.basics?.description || 'No description provided'}</p>
        <div className="flex gap-3 mt-4">
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm">
            {formData.basics?.category || 'General'}
          </span>
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm">
            {formData.basics?.status || 'Draft'}
          </span>
          {formData.basics?.featured && (
            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
              ⭐ Featured
            </span>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column */}
        <div className="space-y-6">
          
          {/* Venue & Location */}
          <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              📍 Venue & Location
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Venue</span>
                <p className="font-medium">{venueDetails?.name || formData.venue?.venueId || 'Not selected'}</p>
              </div>
              {venueDetails?.address && (
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Address</span>
                  <p className="text-sm">{formatAddress(venueDetails.address)}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Layout Type</span>
                  <p className="text-sm">{formData.venue?.layoutType || 'General'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Total Capacity</span>
                  <p className="text-sm">{getTotalCapacity().toLocaleString() || 'Not set'}</p>
                </div>
              </div>
              {formData.venue?.availableSections?.length > 0 && (
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Sections ({formData.venue.availableSections.length})</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {formData.venue.availableSections.slice(0, 5).map((section: any, idx: number) => (
                      <span key={idx} className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
                        {section.name} ({section.capacity})
                      </span>
                    ))}
                    {formData.venue.availableSections.length > 5 && (
                      <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
                        +{formData.venue.availableSections.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              📅 Schedule
            </h3>
            <div className="space-y-3">
              {formData.schedule?.performances?.length > 0 ? (
                <>
                  {formData.schedule.performances.slice(0, 3).map((perf: any, idx: number) => {
                    // Format date with time
                    const dateStr = perf.date ? new Date(perf.date).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                    }) : 'TBD'
                    const startTime = perf.startTime || perf.showTime
                    const doorsTime = perf.doorsOpen || perf.doorTime

                    return (
                      <div key={idx} className="pb-3 border-b border-slate-200 dark:border-slate-700 last:border-0">
                        <p className="font-medium text-sm">
                          {dateStr}{startTime ? `, ${startTime}` : ''}
                        </p>
                        {(doorsTime || startTime) && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {doorsTime ? `Doors: ${doorsTime}` : ''}{doorsTime && startTime ? ' | ' : ''}{startTime ? `Show: ${startTime}` : ''}
                            {perf.endTime ? ` | End: ${perf.endTime}` : ''}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            perf.status === 'onsale' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-slate-500 dark:text-slate-400'
                          }`}>
                            {perf.status || 'Scheduled'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  {formData.schedule.performances.length > 3 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      +{formData.schedule.performances.length - 3} more performances
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No performances scheduled</p>
              )}
            </div>
          </div>

          {/* Promoter */}
          <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              🤝 Promoter
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Company/Name</span>
                <p className="font-medium">{formData.promoter?.promoterName || 'Not assigned'}</p>
              </div>
              {formData.promoter?.promoterEmail && (
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Email</span>
                  <p className="text-sm">{formData.promoter.promoterEmail}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Commission</span>
                  <p className="text-sm font-medium">{formData.promoter?.commission || 0}%</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Payment Terms</span>
                  <p className="text-sm">{formData.promoter?.paymentTerms || 'Net-30'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* Pricing */}
          <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              💰 Pricing & Fees
            </h3>
            <div className="space-y-3">
              {formData.pricing?.tiers?.length > 0 ? (
                <>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Price Tiers ({formData.pricing.tiers.length})</span>
                    <div className="space-y-2 mt-2">
                      {formData.pricing.tiers.slice(0, 5).map((tier: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span>{tier.name || `Tier ${idx + 1}`}</span>
                          <span className="font-medium">${tier.basePrice || tier.price || 0}</span>
                        </div>
                      ))}
                      {formData.pricing.tiers.length > 5 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">+{formData.pricing.tiers.length - 5} more tiers</p>
                      )}
                    </div>
                  </div>
                  {formData.pricing?.fees && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Fees & Taxes</span>
                      <div className="space-y-1 mt-2">
                        {/* Convenience/Service Fee */}
                        {formData.pricing.fees.serviceFee > 0 && (
                          <div className="text-xs flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Convenience Fee:</span>
                            <span>
                              {formData.pricing.fees.serviceFeeType === 'percentage'
                                ? `${formData.pricing.fees.serviceFee}%`
                                : `$${formData.pricing.fees.serviceFee}`}
                              <span className="text-slate-400 ml-1">
                                ({formData.pricing.fees.serviceFeeScope === 'per_transaction' ? 'per order' : 'per ticket'})
                              </span>
                            </span>
                          </div>
                        )}
                        {/* Parking Fee */}
                        {formData.pricing.fees.parkingFee > 0 && (
                          <div className="text-xs flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Parking Fee:</span>
                            <span>
                              {formData.pricing.fees.parkingFeeType === 'percentage'
                                ? `${formData.pricing.fees.parkingFee}%`
                                : `$${formData.pricing.fees.parkingFee}`}
                              <span className="text-slate-400 ml-1">
                                ({formData.pricing.fees.parkingFeeScope === 'per_transaction' ? 'per order' : 'per ticket'})
                              </span>
                            </span>
                          </div>
                        )}
                        {/* Venue Fee */}
                        {formData.pricing.fees.venueFee > 0 && (
                          <div className="text-xs flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Venue Fee:</span>
                            <span>
                              {formData.pricing.fees.venueFeeType === 'percentage'
                                ? `${formData.pricing.fees.venueFee}%`
                                : `$${formData.pricing.fees.venueFee}`}
                              <span className="text-slate-400 ml-1">
                                ({formData.pricing.fees.venueFeeScope === 'per_transaction' ? 'per order' : 'per ticket'})
                              </span>
                            </span>
                          </div>
                        )}
                        {/* Custom Fees */}
                        {formData.pricing.fees.customFees?.map((fee: any, idx: number) => (
                          fee.amount > 0 && (
                            <div key={idx} className="text-xs flex justify-between">
                              <span className="text-slate-500 dark:text-slate-400">{fee.name || `Custom Fee ${idx + 1}`}:</span>
                              <span>
                                {fee.type === 'percentage' ? `${fee.amount}%` : `$${fee.amount}`}
                                <span className="text-slate-400 ml-1">
                                  ({fee.scope === 'per_transaction' ? 'per order' : 'per ticket'})
                                </span>
                              </span>
                            </div>
                          )
                        ))}
                        {/* Sales Tax */}
                        {formData.pricing.fees.salesTax > 0 && (
                          <div className="text-xs flex justify-between pt-1 border-t border-slate-200 dark:border-slate-600 mt-1">
                            <span className="text-slate-500 dark:text-slate-400">Sales Tax:</span>
                            <span>{formData.pricing.fees.salesTax}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No pricing configured</p>
              )}
            </div>
          </div>

          {/* Promotions */}
          <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              🎟️ Active Promotions
            </h3>
            <div className="space-y-3">
              {linkedPromotionDetails.length > 0 && (
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Linked Promotions</span>
                  <div className="space-y-2 mt-2">
                    {linkedPromotionDetails.map((promo) => (
                      <div key={promo.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">{promo.code}</span>
                          <span className="text-slate-500 dark:text-slate-400 ml-2">
                            {promo.type === 'percentage' ? `${promo.value}%` : `$${promo.value}`} off
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          promo.active !== false 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-500/20 text-slate-500 dark:text-slate-400'
                        }`}>
                          {promo.active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {formData.promotions?.eventPromotions?.length > 0 && (
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Event-Specific</span>
                  <div className="space-y-2 mt-2">
                    {formData.promotions.eventPromotions.map((promo: any) => (
                      <div key={promo.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">{promo.code}</span>
                          <span className="text-slate-500 dark:text-slate-400 ml-2">
                            {promo.type === 'percentage' ? `${promo.value}%` : `$${promo.value}`} off
                          </span>
                        </div>
                        <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                          Event
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!linkedPromotionDetails.length && !formData.promotions?.eventPromotions?.length && (
                <p className="text-sm text-slate-500 dark:text-slate-400">No promotions configured</p>
              )}
            </div>
          </div>

          {/* Sales & Communications */}
          <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              ⚙️ Sales & Communications
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Sales Channels</span>
                <p className="text-sm">
                  {formData.sales?.salesChannels?.length > 0 
                    ? formData.sales.salesChannels.join(', ')
                    : 'Standard channels'}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Refund Policy</span>
                <p className="text-sm">{formData.sales?.refundPolicy || 'Standard policy'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Status Bar */}
      <div className="bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-600/20 dark:to-blue-600/20 rounded-lg p-4 border border-green-200 dark:border-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-green-400">✓</span>
            <span className="text-sm">Review complete - Ready to publish</span>
          </div>
          <div className="flex gap-3 text-xs">
            <span>📍 Venue set</span>
            <span>📅 {formData.schedule?.performances?.length || 0} shows</span>
            <span>💰 {formData.pricing?.tiers?.length || 0} tiers</span>
            <span>🎟️ {(linkedPromotionDetails.length + (formData.promotions?.eventPromotions?.length || 0))} promos</span>
          </div>
        </div>
      </div>
    </div>
  )
}
