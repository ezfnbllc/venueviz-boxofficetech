'use client'

import { useState } from 'react'
import PromoterService from '@/lib/services/promoterService'
import { PromoterProfile } from '@/lib/types/promoter'

interface PromoterProfileFormProps {
  profile: PromoterProfile | null
  onUpdate: () => void
}

export default function PromoterProfileForm({ profile, onUpdate }: PromoterProfileFormProps) {
  const [formData, setFormData] = useState({
    companyName: profile?.companyName || '',
    phone: profile?.phone || '',
    email: profile?.email || '',
    website: profile?.website || ''
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!profile?.id) return
    
    setSaving(true)
    try {
      await PromoterService.updatePromoterProfile(profile.id, formData)
      onUpdate()
      alert('Profile updated successfully')
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-black/40 rounded-xl p-6">
      <h3 className="text-lg font-bold mb-6">Company Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Company Name</label>
          <input
            type="text"
            value={formData.companyName}
            onChange={(e) => setFormData({...formData, companyName: e.target.value})}
            className="w-full px-4 py-2 bg-white/10 rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            className="w-full px-4 py-2 bg-white/10 rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full px-4 py-2 bg-white/10 rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Website</label>
          <input
            type="url"
            value={formData.website}
            onChange={(e) => setFormData({...formData, website: e.target.value})}
            className="w-full px-4 py-2 bg-white/10 rounded-lg"
          />
        </div>
      </div>
      
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-600"
      >
        {saving ? 'Saving...' : 'Save Profile'}
      </button>
    </div>
  )
}
