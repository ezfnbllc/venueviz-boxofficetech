'use client'
import { useState } from 'react'
import { EventAI, AIExtractedData } from '@/lib/ai/eventAI'
import AILoadingState from './AILoadingState'
import ConfidenceBadge from './ConfidenceBadge'

interface URLImportModalProps {
  onClose: () => void
  onImport: (data: AIExtractedData) => void
}

export default function URLImportModal({ onClose, onImport }: URLImportModalProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [extractedData, setExtractedData] = useState<AIExtractedData | null>(null)

  const handleExtract = async () => {
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }

    if (!url.startsWith('http')) {
      setError('Please enter a valid URL starting with http:// or https://')
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await EventAI.extractFromURL(url)
      setExtractedData(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (extractedData) {
      onImport(extractedData)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <div>
            <h3 className="text-xl font-bold text-white">📋 Import from URL</h3>
            <p className="text-sm text-gray-400 mt-1">
              Paste a URL from Sulekha, StubHub, Fandango, TicketMaster, or similar
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!extractedData ? (
            <>
              {/* URL Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.stubhub.com/event/..."
                  className="w-full px-4 py-3 bg-gray-850 border border-gray-800 rounded-lg 
                           focus:bg-gray-800 focus:border-purple-500 focus:outline-none 
                           text-white placeholder-gray-500"
                  disabled={loading}
                  onKeyPress={(e) => e.key === 'Enter' && handleExtract()}
                />
              </div>

              {/* Supported Sites */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-500">Supported:</span>
                {['Sulekha', 'StubHub', 'Fandango', 'TicketMaster'].map(site => (
                  <span key={site} className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 rounded">
                    {site}
                  </span>
                ))}
              </div>

              {/* Loading State */}
              {loading && <AILoadingState message="Extracting data from URL..." />}

              {/* Error */}
              {error && (
                <div className="p-4 bg-red-600/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Extract Button */}
              <button
                onClick={handleExtract}
                disabled={loading || !url.trim()}
                className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 
                         disabled:opacity-50 disabled:cursor-not-allowed 
                         rounded-lg font-medium transition-colors text-white"
              >
                {loading ? '🔄 Extracting...' : '🚀 Extract Event Data'}
              </button>
            </>
          ) : (
            <>
              {/* Preview Extracted Data */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-white">Extracted Data</h4>
                  <ConfidenceBadge confidence={extractedData.confidence} />
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-gray-850 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Event Name</p>
                    <p className="text-white">{extractedData.name}</p>
                  </div>

                  <div className="p-3 bg-gray-850 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Description</p>
                    <p className="text-white text-sm line-clamp-3">{extractedData.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-850 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Category</p>
                      <p className="text-white capitalize">{extractedData.category}</p>
                    </div>

                    {extractedData.date && (
                      <div className="p-3 bg-gray-850 rounded-lg">
                        <p className="text-xs text-gray-400 mb-1">Date</p>
                        <p className="text-white">{extractedData.date}</p>
                      </div>
                    )}
                  </div>

                  {extractedData.performers && extractedData.performers.length > 0 && (
                    <div className="p-3 bg-gray-850 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Performers</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {extractedData.performers.map((performer, i) => (
                          <span key={i} className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs">
                            {performer}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {extractedData.venue && (
                    <div className="p-3 bg-gray-850 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Venue</p>
                      <p className="text-white">{extractedData.venue.name}</p>
                      {extractedData.venue.address && (
                        <p className="text-gray-400 text-xs mt-1">{extractedData.venue.address}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setExtractedData(null)}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 
                           rounded-lg font-medium transition-colors text-white"
                >
                  ← Try Another URL
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 
                           rounded-lg font-medium transition-colors text-white"
                >
                  Apply to Form →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
