'use client'
import { useState, useEffect } from 'react'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'
import { StorageService } from '@/lib/storage/storageService'

export default function Step1Basics() {
  const { formData, updateFormData } = useEventWizardStore()
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [performerInput, setPerformerInput] = useState('')
  
  const gallery = formData.basics?.images?.gallery || []
  const performers = formData.basics?.performers || []
  
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploadingCover(true)
    try {
      const eventName = formData.basics?.name || 'temp-event'
      const url = await StorageService.uploadEventImage(file, eventName)
      updateFormData('basics', {
        images: {
          ...formData.basics?.images,
          cover: url,
          thumbnail: formData.basics?.images?.thumbnail || '',
          gallery: gallery
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
      const eventName = formData.basics?.name || 'temp-event'
      const uploadPromises = Array.from(files).map(file => 
        StorageService.uploadEventImage(file, eventName)
      )
      const urls = await Promise.all(uploadPromises)
      
      updateFormData('basics', {
        images: {
          ...formData.basics?.images,
          cover: formData.basics?.images?.cover || '',
          thumbnail: formData.basics?.images?.thumbnail || '',
          gallery: [...gallery, ...urls]
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
        performers: [...performers, performerInput.trim()]
      })
      setPerformerInput('')
    }
  }
  
  const handleRemovePerformer = (index: number) => {
    updateFormData('basics', {
      performers: performers.filter((_, i) => i !== index)
    })
  }
  
  const handleRemoveGalleryImage = (index: number) => {
    updateFormData('basics', {
      images: {
        ...formData.basics?.images,
        cover: formData.basics?.images?.cover || '',
        thumbnail: formData.basics?.images?.thumbnail || '',
        gallery: gallery.filter((_, i) => i !== index)
      }
    })
  }
  
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="border-b border-gray-800 pb-3">
        <h3 className="text-xl font-semibold text-white">Basic Information</h3>
        <p className="text-gray-500 text-sm mt-1">Set up the foundational details of your event</p>
      </div>
      
      {/* Event Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Event Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={formData.basics?.name || ''}
          onChange={(e) => updateFormData('basics', { name: e.target.value })}
          className="w-full px-4 py-2.5 bg-gray-850 border border-gray-800 rounded-lg 
                   focus:bg-gray-800 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50
                   transition-all text-white placeholder-gray-500"
          placeholder="Enter event name..."
        />
      </div>
      
      {/* Event Type */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Event Type <span className="text-red-400">*</span>
        </label>
        <select
          value={formData.basics?.type || formData.basics?.category || 'concert'}
          onChange={(e) => updateFormData('basics', { type: e.target.value, category: e.target.value })}
          className="w-full px-4 py-2.5 bg-gray-850 border border-gray-800 rounded-lg 
                   focus:bg-gray-800 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50
                   transition-all text-white cursor-pointer"
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
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Description <span className="text-red-400">*</span>
        </label>
        <textarea
          value={formData.basics?.description || ''}
          onChange={(e) => updateFormData('basics', { description: e.target.value })}
          className="w-full px-4 py-2.5 bg-gray-850 border border-gray-800 rounded-lg 
                   focus:bg-gray-800 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50
                   transition-all text-white placeholder-gray-500 h-28 resize-none"
          placeholder="Describe your event..."
        />
        <p className="text-xs text-gray-500 mt-1">
          This will appear on the event page. HTML formatting supported.
        </p>
      </div>
      
      {/* Performers */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Performers / Artists
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={performerInput}
            onChange={(e) => setPerformerInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPerformer())}
            className="flex-1 px-4 py-2.5 bg-gray-850 border border-gray-800 rounded-lg 
                     focus:bg-gray-800 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50
                     transition-all text-white placeholder-gray-500"
            placeholder="Add performer name..."
          />
          <button
            type="button"
            onClick={handleAddPerformer}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg
                     transition-all font-medium"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {performers.map((performer, index) => (
            <span
              key={index}
              className="px-3 py-1.5 bg-purple-950/30 border border-purple-900/30 text-purple-400 
                       rounded-lg flex items-center gap-2 group"
            >
              <span className="text-sm">{performer}</span>
              <button
                onClick={() => handleRemovePerformer(index)}
                className="text-gray-500 hover:text-red-400 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      </div>
      
      {/* Cover Image */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Cover Image <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleCoverUpload}
            className="hidden"
            id="cover-upload"
            disabled={uploadingCover}
          />
          <label
            htmlFor="cover-upload"
            className="block w-full px-4 py-3 bg-gray-850 border border-gray-800 rounded-lg 
                     hover:bg-gray-800 hover:border-purple-500/50 transition-all
                     text-gray-400 cursor-pointer text-center"
          >
            {uploadingCover ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Uploading...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Click to upload cover image</span>
              </div>
            )}
          </label>
        </div>
        {formData.basics?.images?.cover && (
          <div className="mt-3">
            <img
              src={formData.basics.images.cover}
              alt="Cover"
              className="w-full max-w-sm h-40 object-cover rounded-lg border border-gray-800"
            />
          </div>
        )}
      </div>
      
      {/* Gallery Images */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Gallery Images
        </label>
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleGalleryUpload}
            className="hidden"
            id="gallery-upload"
            disabled={uploadingGallery}
          />
          <label
            htmlFor="gallery-upload"
            className="block w-full px-4 py-3 bg-gray-850 border border-gray-800 rounded-lg 
                     hover:bg-gray-800 hover:border-purple-500/50 transition-all
                     text-gray-400 cursor-pointer text-center"
          >
            {uploadingGallery ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Uploading...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Add gallery images</span>
              </div>
            )}
          </label>
        </div>
        {gallery.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mt-3">
            {gallery.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image}
                  alt={`Gallery ${index + 1}`}
                  className="w-full h-20 object-cover rounded-lg border border-gray-800"
                />
                <button
                  onClick={() => handleRemoveGalleryImage(index)}
                  className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 
                           transition-opacity rounded-lg flex items-center justify-center"
                >
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Status
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { value: 'draft', label: 'Draft', color: 'gray' },
            { value: 'active', label: 'Active', color: 'green' },
            { value: 'paused', label: 'Paused', color: 'yellow' },
            { value: 'completed', label: 'Completed', color: 'blue' }
          ].map((status) => (
            <button
              key={status.value}
              type="button"
              onClick={() => updateFormData('basics', { status: status.value })}
              className={`px-3 py-2 rounded-lg border transition-all text-sm font-medium
                ${formData.basics?.status === status.value
                  ? status.color === 'green' ? 'bg-green-950/50 border-green-500 text-green-400' :
                    status.color === 'yellow' ? 'bg-yellow-950/50 border-yellow-500 text-yellow-400' :
                    status.color === 'blue' ? 'bg-blue-950/50 border-blue-500 text-blue-400' :
                    'bg-gray-850 border-gray-600 text-gray-300'
                  : 'bg-gray-900 border-gray-800 text-gray-500 hover:bg-gray-850 hover:border-gray-700'
                }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Featured Event */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-900 rounded-lg border border-gray-800
                      hover:bg-gray-850 hover:border-gray-700 transition-all">
          <input
            type="checkbox"
            checked={formData.basics?.featured || false}
            onChange={(e) => updateFormData('basics', { featured: e.target.checked })}
            className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-purple-600 
                     focus:ring-purple-500 focus:ring-offset-0"
          />
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-200">Feature this event</span>
            <p className="text-xs text-gray-500">Display prominently on the homepage</p>
          </div>
          {formData.basics?.featured && (
            <span className="px-2 py-1 bg-purple-950/30 border border-purple-900/30 rounded text-xs text-purple-400">
              Featured
            </span>
          )}
        </label>
      </div>
    </div>
  )
}
