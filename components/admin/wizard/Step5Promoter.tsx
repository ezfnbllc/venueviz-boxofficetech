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
    if (formData.promoter?.promoterId && promoters.length > 0) {
      const promoter = promoters.find(p => p.id === formData.promoter.promoterId)
      if (promoter) {
        setSelectedPromoter(promoter)
      }
    }
  }, [formData.promoter?.promoterId, promoters])
  
  const loadPromoters = async () => {
    try {
      const promotersData = await AdminService.getPromoters()
      setPromoters(promotersData)
    } catch (error) {
      console.error('Error loading promoters:', error)
    }
    setLoading(false)
  }
  
  const handlePromoterSelect = (promoterId: string) => {
    const promoter = promoters.find(p => p.id === promoterId)
    setSelectedPromoter(promoter)
    
    // Update all promoter data at once
    updateFormData('promoter', {
      promoterId: promoterId,
      promoterName: promoter?.name || '',
      commission: formData.promoter?.commission || promoter?.defaultCommission || 10,
      paymentTerms: formData.promoter?.paymentTerms || 'net-30',
      responsibilities: formData.promoter?.responsibilities || []
    })
  }
  
  const updatePromoterField = (field: string, value: any) => {
    updateFormData('promoter', {
      ...formData.promoter,
      [field]: value
    })
  }
  
  const toggleResponsibility = (responsibility: string) => {
    const current = formData.promoter?.responsibilities || []
    const updated = current.includes(responsibility)
      ? current.filter(r => r !== responsibility)
      : [...current, responsibility]
    
    updatePromoterField('responsibilities', updated)
  }
  
  const availableResponsibilities = [
    'Marketing & Promotion',
    'Ticket Sales',
    'Venue Management',
    'Artist Coordination',
    'Security',
    'Concessions',
    'Merchandising',
    'Sponsorships'
  ]
  
  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Promoter Configuration</h3>
      
      {/* Promoter Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Select Promoter
        </label>
        {loading ? (
          <p className="text-gray-400">Loading promoters...</p>
        ) : (
          <select
            value={formData.promoter?.promoterId || ''}
            onChange={(e) => handlePromoterSelect(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
          >
            <option value="">Select a promoter</option>
            {promoters.map(promoter => (
              <option key={promoter.id} value={promoter.id}>
                {promoter.name} - {promoter.company || 'Independent'}
              </option>
            ))}
          </select>
        )}
      </div>
      
      {selectedPromoter && (
        <>
          {/* Promoter Details */}
          <div className="mb-6 p-4 bg-purple-600/20 rounded-lg">
            <h4 className="font-semibold mb-2">{selectedPromoter.name}</h4>
            <p className="text-sm text-gray-300">
              {selectedPromoter.company && `Company: ${selectedPromoter.company}`}
              {selectedPromoter.email && ` • Email: ${selectedPromoter.email}`}
              {selectedPromoter.phone && ` • Phone: ${selectedPromoter.phone}`}
            </p>
          </div>
          
          {/* Commission & Payment Terms */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Commission (%)
              </label>
              <input
                type="number"
                value={formData.promoter?.commission || 10}
                onChange={(e) => updatePromoterField('commission', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Payment Terms
              </label>
              <select
                value={formData.promoter?.paymentTerms || 'net-30'}
                onChange={(e) => updatePromoterField('paymentTerms', e.target.value)}
                className="w-full px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
              >
                <option value="immediate">Immediate</option>
                <option value="net-15">Net 15</option>
                <option value="net-30">Net 30</option>
                <option value="net-45">Net 45</option>
                <option value="net-60">Net 60</option>
                <option value="custom">Custom Terms</option>
              </select>
            </div>
          </div>
          
          {/* Responsibilities */}
          <div className="mb-6">
            <h4 className="font-semibold mb-3">Promoter Responsibilities</h4>
            <div className="grid grid-cols-2 gap-3">
              {availableResponsibilities.map(resp => (
                <label
                  key={resp}
                  className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${
                    formData.promoter?.responsibilities?.includes(resp)
                      ? 'bg-purple-600/30 border border-purple-600'
                      : 'bg-black/20 border border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.promoter?.responsibilities?.includes(resp) || false}
                    onChange={() => toggleResponsibility(resp)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{resp}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
