'use client'
import { useState } from 'react'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'

export default function Step9Review() {
  const { formData } = useEventWizardStore()
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  
  const getValidationStatus = () => {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Critical errors
    if (!formData.basics.name) errors.push('Event name is required')
    if (!formData.basics.description) errors.push('Event description is required')
    if (!formData.venue.venueId) errors.push('Venue selection is required')
    if (!formData.venue.layoutId) errors.push('Layout selection is required')
    if (formData.schedule.performances.length === 0) errors.push('At least one performance date is required')
    if (formData.pricing.tiers.length === 0) errors.push('At least one pricing tier is required')
    
    // Warnings
    if (!formData.basics.images.cover) warnings.push('No cover image uploaded')
    if (!formData.communications.seo.metaTitle) warnings.push('SEO title not set')
    if (!formData.communications.seo.metaDescription) warnings.push('SEO description not set')
    if (!formData.promoter.promoterId) warnings.push('No promoter assigned')
    if (formData.promotions.linkedPromotions.length === 0 && formData.promotions.eventPromotions.length === 0) {
      warnings.push('No promotions configured')
    }
    
    return { errors, warnings }
  }
  
  const { errors, warnings } = getValidationStatus()
  const isValid = errors.length === 0
  
  const getTotalCapacity = () => {
    return formData.venue.availableSections
      .filter(s => s.available)
      .reduce((total, section) => total + section.capacity, 0)
  }
  
  const calculateRevenuePotential = () => {
    let total = 0
    formData.pricing.tiers.forEach(tier => {
      total += tier.basePrice * tier.inventory
    })
    return total
  }
  
  return (
    <div className="space-y-6">
      {/* Validation Status */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Validation Status</h3>
        
        {errors.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-3">
            <h4 className="font-semibold text-red-400 mb-2">Errors (Must Fix)</h4>
            <ul className="list-disc list-inside text-red-400 text-sm">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        {warnings.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-3">
            <h4 className="font-semibold text-yellow-400 mb-2">Warnings (Optional)</h4>
            <ul className="list-disc list-inside text-yellow-400 text-sm">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        
        {isValid && warnings.length === 0 && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="text-green-400">✅ Event is ready to publish!</p>
          </div>
        )}
      </div>
      
      {/* Event Summary */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Event Summary</h3>
        <div className="bg-black/20 rounded-lg p-4 space-y-4">
          {/* Basic Info */}
          <div>
            <h4 className="font-semibold text-purple-400 mb-2">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Name:</span>
                <p className="font-semibold">{formData.basics.name || 'Not set'}</p>
              </div>
              <div>
                <span className="text-gray-400">Type:</span>
                <p className="font-semibold capitalize">{formData.basics.type}</p>
              </div>
              <div>
                <span className="text-gray-400">Max per customer:</span>
                <p className="font-semibold">{formData.basics.maxTicketsPerCustomer} tickets</p>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <p className="font-semibold capitalize">{formData.basics.status}</p>
              </div>
            </div>
          </div>
          
          {/* Venue Info */}
          <div>
            <h4 className="font-semibold text-purple-400 mb-2">Venue & Capacity</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Venue:</span>
                <p className="font-semibold">
                  {formData.venue.venueId ? 'Selected' : 'Not selected'}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Total Capacity:</span>
                <p className="font-semibold">{getTotalCapacity()} seats</p>
              </div>
              <div>
                <span className="text-gray-400">Seating Type:</span>
                <p className="font-semibold capitalize">{formData.venue.seatingType}</p>
              </div>
              <div>
                <span className="text-gray-400">Active Sections:</span>
                <p className="font-semibold">
                  {formData.venue.availableSections.filter(s => s.available).length}
                </p>
              </div>
            </div>
          </div>
          
          {/* Schedule */}
          <div>
            <h4 className="font-semibold text-purple-400 mb-2">Schedule</h4>
            <div className="space-y-2">
              {formData.schedule.performances.map((perf, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>
                    {perf.date ? new Date(perf.date).toLocaleDateString() : 'Date not set'}
                  </span>
                  <span className="text-gray-400">
                    {perf.startTime || 'Time not set'}
                    {perf.pricingModifier !== 0 && (
                      <span className="ml-2 text-purple-400">
                        ({perf.pricingModifier > 0 ? '+' : ''}{perf.pricingModifier}%)
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Pricing */}
          <div>
            <h4 className="font-semibold text-purple-400 mb-2">Pricing Tiers</h4>
            <div className="space-y-2">
              {formData.pricing.tiers.map(tier => (
                <div key={tier.id} className="flex justify-between text-sm">
                  <span>{tier.name}</span>
                  <span>
                    ${tier.basePrice} ({tier.inventory} tickets)
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex justify-between font-semibold">
                <span>Revenue Potential:</span>
                <span className="text-green-400">${calculateRevenuePotential().toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {/* Promoter */}
          {formData.promoter.promoterId && (
            <div>
              <h4 className="font-semibold text-purple-400 mb-2">Promoter</h4>
              <div className="text-sm">
                <p>Assigned with {formData.promoter.commission}% commission</p>
                {formData.promoter.approvalRequired && (
                  <p className="text-yellow-400">Requires admin approval for changes</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Preview */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Event Page Preview</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPreviewMode('desktop')}
              className={`px-3 py-1 rounded ${
                previewMode === 'desktop' ? 'bg-purple-600' : 'bg-gray-600'
              }`}
            >
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('mobile')}
              className={`px-3 py-1 rounded ${
                previewMode === 'mobile' ? 'bg-purple-600' : 'bg-gray-600'
              }`}
            >
              Mobile
            </button>
          </div>
        </div>
        
        <div className={`bg-white rounded-lg overflow-hidden ${
          previewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
        }`}>
          <div className="bg-gray-100 p-4 text-gray-900">
            {formData.basics.images.cover ? (
              <img 
                src={formData.basics.images.cover} 
                alt={formData.basics.name}
                className="w-full h-48 object-cover rounded mb-4"
              />
            ) : (
              <div className="w-full h-48 bg-gray-300 rounded mb-4 flex items-center justify-center">
                <span className="text-gray-500">No cover image</span>
              </div>
            )}
            
            <h1 className="text-2xl font-bold mb-2">{formData.basics.name || 'Event Name'}</h1>
            <p className="text-gray-600 mb-4">{formData.basics.description || 'Event description will appear here'}</p>
            
            <div className="space-y-2 mb-4">
              <p><strong>Date:</strong> {formData.schedule.performances[0]?.date || 'TBD'}</p>
              <p><strong>Time:</strong> {formData.schedule.performances[0]?.startTime || 'TBD'}</p>
              <p><strong>Venue:</strong> {formData.venue.venueId ? 'Venue Name' : 'TBD'}</p>
            </div>
            
            <div className="border-t pt-4">
              <p className="font-semibold mb-2">Ticket Prices:</p>
              {formData.pricing.tiers.map(tier => (
                <div key={tier.id} className="flex justify-between mb-1">
                  <span>{tier.name}:</span>
                  <span>${tier.basePrice}</span>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-4 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold">
              Buy Tickets
            </button>
          </div>
        </div>
      </div>
      
      {/* Test Mode */}
      <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-4">
        <h4 className="font-semibold mb-2">Test Mode</h4>
        <p className="text-sm text-gray-400 mb-3">
          Before publishing, you can test the complete purchase flow in sandbox mode
        </p>
        <button
          type="button"
          className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700"
          disabled={!isValid}
        >
          Launch Test Purchase
        </button>
      </div>
      
      {/* Publishing Notes */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="font-semibold mb-2">Publishing Notes</h4>
        <textarea
          className="w-full px-3 py-2 bg-white/10 rounded h-20"
          placeholder="Add any notes for admin review or future reference..."
        />
      </div>
    </div>
  )
}
