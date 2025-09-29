'use client'
import { useState, useEffect } from 'react'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'
import { AdminService } from '@/lib/admin/adminService'

export default function Step5Promoter() {
  const { formData, updateFormData } = useEventWizardStore()
  const [promoters, setPromoters] = useState<any[]>([])
  const [selectedPromoter, setSelectedPromoter] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadPromoters()
  }, [])
  
  useEffect(() => {
    if (formData.promoter.promoterId) {
      const promoter = promoters.find(p => p.id === formData.promoter.promoterId)
      if (promoter) {
        setSelectedPromoter(promoter)
        // Set default commission if not already set
        if (!formData.promoter.commission) {
          updateFormData('promoter', { commission: promoter.commission || 10 })
        }
      }
    }
  }, [formData.promoter.promoterId, promoters])
  
  const loadPromoters = async () => {
    setLoading(true)
    try {
      const promotersData = await AdminService.getPromoters()
      setPromoters(promotersData.filter((p: any) => p.active !== false))
    } catch (error) {
      console.error('Error loading promoters:', error)
    }
    setLoading(false)
  }
  
  const handlePromoterChange = (promoterId: string) => {
    const promoter = promoters.find(p => p.id === promoterId)
    updateFormData('promoter', {
      promoterId,
      commission: promoter?.commission || 10,
      portalCustomization: {
        usePromoterBranding: !!promoter?.brandingType && promoter.brandingType === 'advanced',
        customSlug: ''
      }
    })
  }
  
  const updatePromoterSettings = (field: string, value: any) => {
    updateFormData('promoter', {
      [field]: value
    })
  }
  
  const updateRestriction = (field: string, value: boolean) => {
    updateFormData('promoter', {
      restrictions: {
        ...formData.promoter.restrictions,
        [field]: value
      }
    })
  }
  
  const updatePortalCustomization = (field: string, value: any) => {
    updateFormData('promoter', {
      portalCustomization: {
        ...formData.promoter.portalCustomization,
        [field]: value
      }
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
      {/* Promoter Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">Assign to Promoter</label>
        <select
          value={formData.promoter.promoterId}
          onChange={(e) => handlePromoterChange(e.target.value)}
          className="w-full px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
        >
          <option value="">No Promoter (Direct Management)</option>
          {promoters.map(promoter => (
            <option key={promoter.id} value={promoter.id}>
              {promoter.name} - {promoter.commission}% commission
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          Leave empty to manage this event directly without a promoter
        </p>
      </div>
      
      {/* Promoter Details */}
      {selectedPromoter && (
        <div className="bg-black/20 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Promoter Details</h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Name</p>
              <p className="font-semibold">{selectedPromoter.name}</p>
            </div>
            <div>
              <p className="text-gray-400">Email</p>
              <p className="font-semibold">{selectedPromoter.email}</p>
            </div>
            <div>
              <p className="text-gray-400">Phone</p>
              <p className="font-semibold">{selectedPromoter.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400">Branding Type</p>
              <p className="font-semibold capitalize">{selectedPromoter.brandingType || 'basic'}</p>
            </div>
            {selectedPromoter.website && (
              <div className="md:col-span-2">
                <p className="text-gray-400">Website</p>
                <a href={selectedPromoter.website} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                  {selectedPromoter.website}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
      
      {formData.promoter.promoterId && (
        <>
          {/* Commission Settings */}
          <div>
            <label className="block text-sm font-medium mb-2">Commission Rate (%)</label>
            <input
              type="number"
              value={formData.promoter.commission}
              onChange={(e) => updatePromoterSettings('commission', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
              min="0"
              max="100"
              step="0.5"
            />
            <p className="text-xs text-gray-400 mt-1">
              Override the promoter's default commission rate for this event
            </p>
          </div>
          
          {/* Approval Settings */}
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.promoter.approvalRequired}
                onChange={(e) => updatePromoterSettings('approvalRequired', e.target.checked)}
                className="w-5 h-5 rounded"
              />
              <div>
                <span className="font-medium">Require Admin Approval</span>
                <p className="text-xs text-gray-400">
                  Promoter changes must be approved before going live
                </p>
              </div>
            </label>
          </div>
          
          {/* Portal Customization */}
          <div>
            <label className="block text-sm font-medium mb-3">Portal Customization</label>
            <div className="bg-black/20 rounded-lg p-4 space-y-3">
              {selectedPromoter?.brandingType === 'advanced' && (
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.promoter.portalCustomization.usePromoterBranding}
                    onChange={(e) => updatePortalCustomization('usePromoterBranding', e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                  <div>
                    <span className="font-medium">Use Promoter Branding</span>
                    <p className="text-xs text-gray-400">
                      Apply promoter's colors and logo to the event page
                    </p>
                  </div>
                </label>
              )}
              
              <div>
                <label className="block text-xs mb-1">Custom URL Slug (Optional)</label>
                <div className="flex items-center">
                  <span className="text-gray-400 mr-2">/p/{selectedPromoter?.slug}/</span>
                  <input
                    type="text"
                    value={formData.promoter.portalCustomization.customSlug}
                    onChange={(e) => updatePortalCustomization('customSlug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 px-3 py-2 bg-white/10 rounded"
                    placeholder="event-custom-url"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Leave empty to use auto-generated URL
                </p>
              </div>
            </div>
          </div>
          
          {/* Permissions & Restrictions */}
          <div>
            <label className="block text-sm font-medium mb-3">Permissions & Restrictions</label>
            <div className="bg-black/20 rounded-lg p-4 space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.promoter.restrictions.canEditAfterPublish}
                  onChange={(e) => updateRestriction('canEditAfterPublish', e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <div>
                  <span className="font-medium">Can Edit After Publish</span>
                  <p className="text-xs text-gray-400">
                    Allow promoter to modify event after it's published
                  </p>
                </div>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.promoter.restrictions.canAccessCustomerData}
                  onChange={(e) => updateRestriction('canAccessCustomerData', e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <div>
                  <span className="font-medium">Can Access Customer Data</span>
                  <p className="text-xs text-gray-400">
                    View customer names, emails, and phone numbers
                  </p>
                </div>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.promoter.restrictions.canIssueRefunds}
                  onChange={(e) => updateRestriction('canIssueRefunds', e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <div>
                  <span className="font-medium">Can Issue Refunds</span>
                  <p className="text-xs text-gray-400">
                    Process refunds without admin approval
                  </p>
                </div>
              </label>
            </div>
          </div>
        </>
      )}
      
      {/* Commission Calculation Preview */}
      {formData.promoter.promoterId && formData.pricing.tiers.length > 0 && (
        <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Commission Preview</h4>
          <div className="space-y-2 text-sm">
            {formData.pricing.tiers.map(tier => (
              <div key={tier.id} className="flex justify-between">
                <span>{tier.name} (${tier.basePrice})</span>
                <span className="text-green-400">
                  ${((tier.basePrice * formData.promoter.commission) / 100).toFixed(2)} per ticket
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-xs text-gray-400">
              Promoter earns {formData.promoter.commission}% commission on ticket sales
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
