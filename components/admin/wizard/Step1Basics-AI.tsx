'use client'
import { useState } from 'react'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'
import { EventAI, AIExtractedData } from '@/lib/ai/eventAI'
import AIButton from '../AIButton'
import AILoadingState from '../AILoadingState'
import ConfidenceBadge from '../ConfidenceBadge'
import URLImportModal from '../URLImportModal'
import PosterScanModal from '../PosterScanModal'

export default function Step1Basics({ data, updateData }: any) {
  const { formData, updateFormData } = useEventWizardStore()
  const [aiLoading, setAiLoading] = useState(false)
  const [aiConfidence, setAiConfidence] = useState<number | null>(null)
  const [showURLModal, setShowURLModal] = useState(false)
  const [showPosterModal, setShowPosterModal] = useState(false)

  const performers = formData.basics?.performers || []
  const gallery = formData.basics?.images?.gallery || []

  const handleSmartFill = async () => {
    const eventName = formData.basics?.name
    if (!eventName?.trim()) {
      throw new Error('Please enter an event name first')
    }

    setAiLoading(true)
    try {
      const result = await EventAI.smartFill(eventName)
      
      // Update form with AI results
      updateFormData('basics', {
        description: result.description,
        category: result.category,
        type: result.category,
        tags: result.tags,
        performers: result.performers
      })
      
      setAiConfidence(result.confidence)
      
      // Clear confidence after 10 seconds
      setTimeout(() => setAiConfidence(null), 10000)
    } finally {
      setAiLoading(false)
    }
  }

  const handleURLImport = (data: AIExtractedData) => {
    // Apply all extracted data
    updateFormData('basics', {
      name: data.name,
      description: data.description,
      category: data.category,
      type: data.category,
      tags: data.tags,
      performers: data.performers
    })
    
    setAiConfidence(data.confidence)
    setTimeout(() => setAiConfidence(null), 10000)
  }

  const handlePosterImport = (data: AIExtractedData) => {
    // Apply all extracted data
    updateFormData('basics', {
      name: data.name,
      description: data.description,
      category: data.category,
      type: data.category,
      tags: data.tags,
      performers: data.performers
    })
    
    setAiConfidence(data.confidence)
    setTimeout(() => setAiConfidence(null), 10000)
  }

  const handleAddPerformer = () => {
    updateFormData('basics', {
      performers: [...performers, '']
    })
  }

  const handleUpdatePerformer = (index: number, value: string) => {
    const updated = [...performers]
    updated[index] = value
    updateFormData('basics', { performers: updated })
  }

  const handleRemovePerformer = (index: number) => {
    updateFormData('basics', {
      performers: performers.filter((_: any, i: number) => i !== index)
    })
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="border-b border-gray-800 pb-3">
        <h3 className="text-xl font-semibold text-white">Basic Information</h3>
        <p className="text-gray-500 text-sm mt-1">Set up the foundational details of your event</p>
      </div>

      {/* AI Import Buttons - Top Section */}
      <div className="flex flex-wrap gap-3 p-4 bg-purple-600/5 border border-purple-500/20 rounded-lg">
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm text-gray-300 mb-2">🤖 <strong>AI-Powered Import</strong></p>
          <p className="text-xs text-gray-400">Let AI fill in event details automatically</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowURLModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors"
          >
            📋 Import from URL
          </button>
          <button
            onClick={() => setShowPosterModal(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm font-medium transition-colors"
          >
            🖼️ Scan Poster
          </button>
        </div>
      </div>

      {/* AI Loading State */}
      {aiLoading && <AILoadingState message="AI is generating event details..." />}

      {/* AI Confidence Badge */}
      {aiConfidence && !aiLoading && (
        <div className="flex items-center gap-2 p-3 bg-green-600/10 border border-green-500/20 rounded-lg">
          <ConfidenceBadge confidence={aiConfidence} />
          <p className="text-sm text-gray-300">
            AI has filled in the details below. Please review and edit as needed.
          </p>
        </div>
      )}

      {/* Event Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Event Name <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={formData.basics?.name || ''}
            onChange={(e) => updateFormData('basics', { name: e.target.value })}
            className="flex-1 px-4 py-2.5 bg-gray-850 border border-gray-800 rounded-lg 
                     focus:bg-gray-800 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50
                     transition-all text-white placeholder-gray-500"
            placeholder="Enter event name..."
          />
          <AIButton
            onClick={handleSmartFill}
            label="Smart Fill"
            icon="✨"
            disabled={!formData.basics?.name?.trim() || aiLoading}
            loadingText="Generating..."
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          💡 Enter event name, then click Smart Fill to auto-generate description, category, and tags
        </p>
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
          <option value="festival">Festival</option>
          <option value="conference">Conference</option>
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
                   transition-all text-white placeholder-gray-500 h-32 resize-none"
          placeholder="Describe your event..."
        />
        <p className="text-xs text-gray-500 mt-1">
          This will appear on the event page. HTML formatting supported.
        </p>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Tags
        </label>
        <input
          type="text"
          value={formData.basics?.tags?.join(', ') || ''}
          onChange={(e) => updateFormData('basics', { 
            tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) 
          })}
          className="w-full px-4 py-2.5 bg-gray-850 border border-gray-800 rounded-lg 
                   focus:bg-gray-800 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50
                   transition-all text-white placeholder-gray-500"
          placeholder="music, live, concert (comma-separated)"
        />
        <p className="text-xs text-gray-500 mt-1">
          Separate tags with commas for better searchability
        </p>
      </div>

      {/* Performers */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Performers / Artists
        </label>
        <div className="space-y-2">
          {performers.map((performer: string, index: number) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={performer}
                onChange={(e) => handleUpdatePerformer(index, e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-850 border border-gray-800 rounded-lg 
                         focus:bg-gray-800 focus:border-purple-500 focus:outline-none 
                         text-white placeholder-gray-500"
                placeholder="Performer name"
              />
              <button
                onClick={() => handleRemovePerformer(index)}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={handleAddPerformer}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
          >
            + Add Performer
          </button>
        </div>
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
