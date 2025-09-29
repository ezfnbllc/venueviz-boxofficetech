'use client'
import { useState, useEffect } from 'react'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'
import { StorageService } from '@/lib/storage/storageService'

export default function Step1Basics() {
  const { formData, updateFormData } = useEventWizardStore()
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [performerInput, setPerformerInput] = useState('')
  
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploadingCover(true)
    try {
      const url = await StorageService.uploadEventImage(file)
      updateFormData('basics', {
        images: {
          ...formData.basics.images,
          cover: url
        }
      })
    } catch (error) {
      console.error('Error uploading cover:', error)
    }
    setUploadingCover(false)
  }
  
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    
    setUploadingGallery(true)
    try {
      const uploadPromises = Array.from(files).map(file => 
        StorageService.uploadEventImage(file)
      )
      const urls = await Promise.all(uploadPromises)
      
      updateFormData('basics', {
        images: {
          ...formData.basics.images,
          gallery: [...formData.basics.images.gallery, ...urls]
        }
      })
    } catch (error) {
      console.error('Error uploading gallery:', error)
    }
    setUploadingGallery(false)
  }
  
  const handleAddPerformer = () => {
    if (performerInput.trim()) {
      updateFormData('basics', {
        performers: [...formData.basics.performers, performerInput.trim()]
      })
      setPerformerInput('')
    }
  }
  
  const handleRemovePerformer = (index: number) => {
    updateFormData('basics', {
      performers: formData.basics.performers.filter((_, i) => i !== index)
    })
  }
  
  const handleRemoveGalleryImage = (index: number) => {
    updateFormData('basics', {
      images: {
        ...formData.basics.images,
        gallery: formData.basics.images.gallery.filter((_, i) => i !== index)
      }
    })
  }
  
  return (
    <div className="space-y-6">
      {/* Event Name */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Event Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={formData.basics.name}
          onChange={(e) => updateFormData('basics', { name: e.target.value })}
          className="w-full px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
          placeholder="Enter event name"
        />
      </div>
      
      {/* Event Type */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Event Type <span className="text-red-400">*</span>
        </label>
        <select
          value={formData.basics.type}
          onChange={(e) => updateFormData('basics', { type: e.target.value })}
          className="w-full px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
        >
          <option value="concert">Concert</option>
          <option value="theater">Theater</option>
          <option value="sports">Sports</option>
          <option value="comedy">Comedy</option>
          <option value="other">Other</option>
        </select>
      </div>
      
      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Description <span className="text-red-400">*</span>
        </label>
        <textarea
          value={formData.basics.description}
          onChange={(e) => updateFormData('basics', { description: e.target.value })}
          className="w-full px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none h-32"
          placeholder="Describe your event..."
        />
        <p className="text-xs text-gray-400 mt-1">
          This will appear on the event page. You can format with basic HTML if needed.
        </p>
      </div>
      
      {/* Performers */}
      <div>
        <label className="block text-sm font-medium mb-2">Performers / Artists</label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={performerInput}
            onChange={(e) => setPerformerInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPerformer())}
            className="flex-1 px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
            placeholder="Add performer name"
          />
          <button
            type="button"
            onClick={handleAddPerformer}
            className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.basics.performers.map((performer, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full flex items-center gap-2"
            >
              {performer}
              <button
                onClick={() => handleRemovePerformer(index)}
                className="text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </div>
      
      {/* Cover Image */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Cover Image <span className="text-red-400">*</span>
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleCoverUpload}
          className="w-full px-4 py-2 bg-white/10 rounded-lg"
          disabled={uploadingCover}
        />
        {uploadingCover && (
          <p className="text-xs text-purple-400 mt-2">Uploading cover image...</p>
        )}
        {formData.basics.images.cover && (
          <div className="mt-3">
            <img
              src={formData.basics.images.cover}
              alt="Cover"
              className="w-full max-w-md h-48 object-cover rounded-lg"
            />
          </div>
        )}
      </div>
      
      {/* Gallery Images */}
      <div>
        <label className="block text-sm font-medium mb-2">Gallery Images</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleGalleryUpload}
          className="w-full px-4 py-2 bg-white/10 rounded-lg"
          disabled={uploadingGallery}
        />
        {uploadingGallery && (
          <p className="text-xs text-purple-400 mt-2">Uploading gallery images...</p>
        )}
        {formData.basics.images.gallery.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mt-3">
            {formData.basics.images.gallery.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image}
                  alt={`Gallery ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
                <button
                  onClick={() => handleRemoveGalleryImage(index)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Max Tickets Per Customer */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Max Tickets Per Customer
        </label>
        <input
          type="number"
          value={formData.basics.maxTicketsPerCustomer}
          onChange={(e) => updateFormData('basics', { 
            maxTicketsPerCustomer: parseInt(e.target.value) || 10 
          })}
          className="w-full px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
          min="1"
          max="50"
        />
        <p className="text-xs text-gray-400 mt-1">
          Limit the number of tickets a single customer can purchase
        </p>
      </div>
      
      {/* Status (Admin Only) */}
      <div>
        <label className="block text-sm font-medium mb-2">Status</label>
        <select
          value={formData.basics.status}
          onChange={(e) => updateFormData('basics', { status: e.target.value })}
          className="w-full px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
        >
          <option value="draft">Draft</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="published">Published</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </div>
  )
}
