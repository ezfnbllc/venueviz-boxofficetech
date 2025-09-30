'use client'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'

export default function Step9Review() {
  const { formData } = useEventWizardStore()
  
  const formatPrice = (price: number) => `$${price.toFixed(2)}`
  
  const isValid = formData.basics.name && formData.venue.venueId && formData.venue.layoutId
  
  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Event Review & Publish</h3>
      
      {/* Validation Status */}
      <div className="mb-6 p-4 rounded-lg bg-black/20">
        {isValid ? (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <p className="text-green-400">Event is ready to publish!</p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            <p className="text-red-400">Please complete all required fields</p>
          </div>
        )}
      </div>
      
      {/* Event Summary */}
      <div className="space-y-6">
        
        {/* Basic Info */}
        <div className="bg-black/20 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Basic Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Event Name:</span>
              <p className="font-medium">{formData.basics.name || 'Not set'}</p>
            </div>
            <div>
              <span className="text-gray-400">Category:</span>
              <p className="font-medium capitalize">{formData.basics.category || 'Not set'}</p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-400">Description:</span>
              <p className="font-medium">{formData.basics.description || 'Not set'}</p>
            </div>
          </div>
        </div>
        
        {/* Venue & Layout */}
        <div className="bg-black/20 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Venue Configuration</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Venue ID:</span>
              <p className="font-medium">{formData.venue.venueId || 'Not selected'}</p>
            </div>
            <div>
              <span className="text-gray-400">Layout ID:</span>
              <p className="font-medium">{formData.venue.layoutId || 'Not selected'}</p>
            </div>
            <div>
              <span className="text-gray-400">Seating Type:</span>
              <p className="font-medium capitalize">{formData.venue.seatingType || 'Not set'}</p>
            </div>
            <div>
              <span className="text-gray-400">Available Sections:</span>
              <p className="font-medium">{formData.venue.availableSections?.filter(s => s.available).length || 0}</p>
            </div>
          </div>
        </div>
        
        {/* Pricing */}
        <div className="bg-black/20 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Pricing Configuration</h4>
          
          {/* Tiers */}
          {formData.pricing.tiers && formData.pricing.tiers.length > 0 ? (
            <div className="mb-4">
              <span className="text-gray-400 text-sm">Pricing Tiers:</span>
              <div className="mt-2 space-y-2">
                {formData.pricing.tiers.map((tier: any) => (
                  <div key={tier.id} className="flex justify-between items-center p-2 bg-black/20 rounded">
                    <span>{tier.name}</span>
                    <span className="font-medium">{formatPrice(tier.basePrice || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm mb-4">No pricing tiers configured</p>
          )}
          
          {/* Fees */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Service Fee:</span>
              <p className="font-medium">
                {formData.pricing.fees?.serviceFee || 0}
                {formData.pricing.fees?.serviceFeeType === 'percentage' ? '%' : '$'} 
                per {formData.pricing.fees?.serviceFeePer || 'ticket'}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Processing Fee:</span>
              <p className="font-medium">
                {formData.pricing.fees?.processingFee || 0}
                {formData.pricing.fees?.processingFeeType === 'percentage' ? '%' : '$'} 
                per {formData.pricing.fees?.processingFeePer || 'transaction'}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Sales Tax:</span>
              <p className="font-medium">{formData.pricing.fees?.salesTax || 0}%</p>
            </div>
          </div>
        </div>
        
        {/* Promoter */}
        {formData.promoter.promoterId && (
          <div className="bg-black/20 rounded-lg p-4">
            <h4 className="font-semibold mb-3">Promoter</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Promoter:</span>
                <p className="font-medium">{formData.promoter.promoterName || formData.promoter.promoterId}</p>
              </div>
              <div>
                <span className="text-gray-400">Commission:</span>
                <p className="font-medium">{formData.promoter.commission || 0}%</p>
              </div>
              <div>
                <span className="text-gray-400">Payment Terms:</span>
                <p className="font-medium">{formData.promoter.paymentTerms || 'Not set'}</p>
              </div>
              <div>
                <span className="text-gray-400">Responsibilities:</span>
                <p className="font-medium">{formData.promoter.responsibilities?.length || 0} assigned</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Sales Configuration */}
        <div className="bg-black/20 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Sales Configuration</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Max Tickets Per Order:</span>
              <p className="font-medium">{formData.sales.maxTicketsPerOrder || 10}</p>
            </div>
            <div>
              <span className="text-gray-400">Refund Policy:</span>
              <p className="font-medium capitalize">{formData.sales.refundPolicy?.replace('-', ' ') || 'No refunds'}</p>
            </div>
            <div>
              <span className="text-gray-400">Will Call:</span>
              <p className="font-medium">{formData.sales.allowWillCall ? 'Enabled' : 'Disabled'}</p>
            </div>
            <div>
              <span className="text-gray-400">Mobile Tickets:</span>
              <p className="font-medium">{formData.sales.allowMobileTickets !== false ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
        </div>
        
        {/* Promotions */}
        <div className="bg-black/20 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Promotions</h4>
          <div className="text-sm">
            <div className="mb-2">
              <span className="text-gray-400">Linked Promotions:</span>
              <span className="ml-2 font-medium">{formData.promotions.linkedPromotions?.length || 0}</span>
            </div>
            <div className="mb-2">
              <span className="text-gray-400">Event-Specific Codes:</span>
              <span className="ml-2 font-medium">{formData.promotions.eventPromotions?.length || 0}</span>
            </div>
            <div>
              <span className="text-gray-400">Group Discount:</span>
              <span className="ml-2 font-medium">
                {formData.promotions.groupDiscount?.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Test Purchase Flow */}
      <div className="mt-6 p-4 bg-purple-600/20 rounded-lg border border-purple-600/40">
        <h4 className="font-semibold mb-2">Test Purchase Flow</h4>
        <p className="text-sm text-gray-300 mb-3">
          Before publishing, you can test the complete purchase flow in sandbox mode
        </p>
        <button
          type="button"
          className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50"
          disabled={!isValid}
        >
          Launch Test Purchase
        </button>
      </div>
    </div>
  )
}
