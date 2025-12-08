'use client'
import { useState } from 'react'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'
import { EventAI, AIExtractedData } from '@/lib/ai/eventAI'
import { StorageService } from '@/lib/storage/storageService'
import AIButton from '../AIButton'
import AILoadingState from '../AILoadingState'
import ConfidenceBadge from '../ConfidenceBadge'
import URLImportModal from '../URLImportModal'
import PosterScanModal from '../PosterScanModal'

export default function Step1Basics() {
  const { formData, updateFormData } = useEventWizardStore()
  const [aiLoading, setAiLoading] = useState(false)
  const [aiConfidence, setAiConfidence] = useState<number | null>(null)
  const [showURLModal, setShowURLModal] = useState(false)
  const [showPosterModal, setShowPosterModal] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [performerInput, setPerformerInput] = useState('')
  const [adjustingDescription, setAdjustingDescription] = useState(false)

  const performers = formData.basics?.performers || []
  const gallery = formData.basics?.images?.gallery || []
  const coverImage = formData.basics?.images?.cover

  // AI Features
  const handleSmartFill = async () => {
    const eventName = formData.basics?.name
    if (!eventName?.trim()) {
      alert('Please enter an event name first')
      return
    }

    setAiLoading(true)
    try {
      const result = await EventAI.smartFill(eventName)
      
      updateFormData('basics', {
        description: result.description,
        category: result.category,
        type: result.category,
        tags: result.tags,
        performers: result.performers
      })
      
      setAiConfidence(result.confidence)
      setTimeout(() => setAiConfidence(null), 10000)
    } catch (error: any) {
      alert(error.message)
    } finally {
      setAiLoading(false)
    }
  }

  const handleURLImport = (data: AIExtractedData) => {
    updateFormData('basics', {
      name: data.name,
      description: data.description,
      category: data.category,
      type: data.category,
      tags: data.tags,
      performers: data.performers,
      images: data.images || formData.basics?.images
    })
    
    setAiConfidence(data.confidence)
    setTimeout(() => setAiConfidence(null), 10000)
  }

  const handlePosterImport = (data: AIExtractedData) => {
    updateFormData('basics', {
      name: data.name,
      description: data.description,
      category: data.category,
      type: data.category,
      tags: data.tags,
      performers: data.performers,
      images: data.images || formData.basics?.images
    })

    setAiConfidence(data.confidence)
    setTimeout(() => setAiConfidence(null), 10000)
  }

  // Description Adjustment
  const handleAdjustDescription = async (action: 'lengthen' | 'shorten' | 'professional') => {
    const description = formData.basics?.description
    if (!description?.trim()) {
      alert('Please enter a description first')
      return
    }

    setAdjustingDescription(true)
    try {
      const response = await fetch('/api/ai/adjust-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, action })
      })

      if (response.ok) {
        const data = await response.json()
        updateFormData('basics', { description: data.description })
      } else {
        throw new Error('Failed to adjust description')
      }
    } catch (error) {
      console.error('Description adjustment error:', error)
      alert('Failed to adjust description')
    } finally {
      setAdjustingDescription(false)
    }
  }

  // Manual Image Upload
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
          thumbnail: formData.basics?.images?.thumbnail || url,
          gallery: gallery
        }
      })
    } catch (error) {
      console.error('Error uploading cover:', error)
      alert('Failed to upload image')
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
      alert('Failed to upload images')
    }
    setUploadingGallery(false)
  }

  const handleRemoveGalleryImage = (index: number) => {
    updateFormData('basics', {
      images: {
        ...formData.basics?.images,
        cover: formData.basics?.images?.cover || '',
        thumbnail: formData.basics?.images?.thumbnail || '',
        gallery: gallery.filter((_: string, i: number) => i !== index)
      }
    })
  }

  // Performers
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
      performers: performers.filter((_: string, i: number) => i !== index)
    })
  }

  return (
    <div className="space-y-6">
      {/* Header with AI Tools */}
      <div className="border-b border-gray-800 pb-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-semibold text-white">Basic Information</h3>
            <p className="text-gray-500 text-sm mt-1">Set up the foundational details of your event</p>
          </div>
          <div className="flex gap-2">
            <AIButton onClick={handleSmartFill} label="✨ Smart Fill" />
            <AIButton onClick={() => setShowURLModal(true)} label="🔗 Import URL" />
            <AIButton onClick={() => setShowPosterModal(true)} label="🖼️ Scan Poster" />
          </div>
        </div>
        {aiConfidence && (
          <div className="mt-3">
            <ConfidenceBadge confidence={aiConfidence} />
          </div>
        )}
      </div>

      {aiLoading && <AILoadingState message="AI is generating content..." />}

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

      {/* Description */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-300">
            Description <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleAdjustDescription('shorten')}
              disabled={adjustingDescription || !formData.basics?.description}
              className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {adjustingDescription ? '...' : '↓ Shorten'}
            </button>
            <button
              type="button"
              onClick={() => handleAdjustDescription('lengthen')}
              disabled={adjustingDescription || !formData.basics?.description}
              className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {adjustingDescription ? '...' : '↑ Lengthen'}
            </button>
            <button
              type="button"
              onClick={() => handleAdjustDescription('professional')}
              disabled={adjustingDescription || !formData.basics?.description}
              className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded text-white
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {adjustingDescription ? '...' : '✨ Polish'}
            </button>
          </div>
        </div>
        <textarea
          value={formData.basics?.description || ''}
          onChange={(e) => updateFormData('basics', { description: e.target.value })}
          rows={5}
          className="w-full px-4 py-2.5 bg-gray-850 border border-gray-800 rounded-lg
                   focus:bg-gray-800 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50
                   transition-all text-white placeholder-gray-500"
          placeholder="Enter event description..."
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Category <span className="text-red-400">*</span>
        </label>
        <select
          value={formData.basics?.category || ''}
          onChange={(e) => updateFormData('basics', { category: e.target.value, type: e.target.value })}
          className="w-full px-4 py-2.5 bg-gray-850 border border-gray-800 rounded-lg 
                   focus:bg-gray-800 focus:border-purple-500 focus:outline-none text-white"
        >
          <option value="">Select category...</option>
          <option value="concert">Concert</option>
          <option value="theater">Theater</option>
          <option value="sports">Sports</option>
          <option value="comedy">Comedy</option>
          <option value="festival">Festival</option>
          <option value="conference">Conference</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
        <input
          type="text"
          value={formData.basics?.tags?.join(', ') || ''}
          onChange={(e) => updateFormData('basics', { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
          className="w-full px-4 py-2.5 bg-gray-850 border border-gray-800 rounded-lg 
                   focus:bg-gray-800 focus:border-purple-500 focus:outline-none text-white"
          placeholder="indie, rock, live music (comma-separated)"
        />
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
                     focus:bg-gray-800 focus:border-purple-500 focus:outline-none text-white"
            placeholder="Add performer name..."
          />
          <button
            type="button"
            onClick={handleAddPerformer}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {performers.map((performer: string, index: number) => (
            <span
              key={index}
              className="px-3 py-1.5 bg-purple-950/30 border border-purple-900/30 text-purple-400 
                       rounded-lg flex items-center gap-2"
            >
              {performer}
              <button
                onClick={() => handleRemovePerformer(index)}
                className="text-gray-500 hover:text-red-400"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Cover Image */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Cover Image
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
        {coverImage && (
          <div className="mt-3 relative">
            <img
              src={coverImage}
              alt="Cover"
              className="w-full max-w-sm h-40 object-cover rounded-lg border border-gray-800"
            />
            <button
              onClick={() => updateFormData('basics', { images: { ...formData.basics?.images, cover: '', thumbnail: '' } })}
              className="absolute top-2 right-2 px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-xs"
            >
              Remove
            </button>
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
            {gallery.map((image: string, index: number) => (
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

      {/* Modals */}
      {showURLModal && (
        <URLImportModal
          onClose={() => setShowURLModal(false)}
          onImport={handleURLImport}
        />
      )}
      
      {showPosterModal && (
        <PosterScanModal
          onClose={() => setShowPosterModal(false)}
          onImport={handlePosterImport}
        />
      )}
    </div>
  )
}
