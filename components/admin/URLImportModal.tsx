'use client'
import { useState } from 'react'
import { EventAI, AIExtractedData } from '@/lib/ai/eventAI'
import { StorageService } from '@/lib/storage/storageService'
import AILoadingState from './AILoadingState'
import ConfidenceBadge from './ConfidenceBadge'

interface URLImportModalProps {
  onClose: () => void
  onImport: (data: AIExtractedData) => void
}

export default function URLImportModal({ onClose, onImport }: URLImportModalProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [error, setError] = useState('')
  const [extractedData, setExtractedData] = useState<AIExtractedData | null>(null)
  const [imageStatus, setImageStatus] = useState<string>('')

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

  const handleApply = async () => {
    if (!extractedData) return

    // Check if there are image URLs to import
    const imageUrls = extractedData.images?.gallery || []
    const coverUrl = extractedData.images?.cover

    // Collect all image URLs
    const allImageUrls: string[] = []
    if (coverUrl && coverUrl.startsWith('http')) allImageUrls.push(coverUrl)
    imageUrls.forEach(url => {
      if (url && url.startsWith('http') && !allImageUrls.includes(url)) {
        allImageUrls.push(url)
      }
    })

    let finalData = { ...extractedData }

    // If there are images to import, upload them
    if (allImageUrls.length > 0) {
      setUploadingImages(true)
      setImageStatus(`Importing ${allImageUrls.length} image(s)...`)

      try {
        const eventName = extractedData.name || 'imported-event'
        const uploadedUrls = await StorageService.uploadMultipleFromUrls(allImageUrls, eventName)

        if (uploadedUrls.length > 0) {
          // Update the data with uploaded image URLs
          finalData = {
            ...extractedData,
            images: {
              cover: uploadedUrls[0] || '', // First image as cover
              thumbnail: uploadedUrls[0] || '', // Same as cover for now
              gallery: uploadedUrls.slice(1) // Rest as gallery
            }
          }
          setImageStatus(`✓ Imported ${uploadedUrls.length} image(s)`)
        } else {
          setImageStatus('⚠ Could not import images')
        }
      } catch (err) {
        console.error('Error uploading images:', err)
        setImageStatus('⚠ Image import failed')
      }

      setUploadingImages(false)
    }

    onImport(finalData)
    onClose()
  }

  // Check if there are importable images
  const hasImages = extractedData?.images?.cover ||
                   (extractedData?.images?.gallery && extractedData.images.gallery.length > 0)

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-start justify-center p-4 pt-16 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full max-h-[80vh] overflow-y-auto my-4">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Import from URL</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Paste a URL from Sulekha, StubHub, Fandango, TicketMaster, or similar
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
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
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                  Event URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.stubhub.com/event/..."
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg
                           focus:bg-white dark:focus:bg-slate-600 focus:border-accent-500 focus:outline-none
                           text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  disabled={loading}
                  onKeyPress={(e) => e.key === 'Enter' && handleExtract()}
                />
              </div>

              {/* Supported Sites */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Supported:</span>
                {['Sulekha', 'StubHub', 'Fandango', 'TicketMaster'].map(site => (
                  <span key={site} className="text-xs px-2 py-1 bg-accent-600/20 text-accent-500 dark:text-accent-400 rounded">
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
                className="w-full px-6 py-3 bg-accent-600 hover:bg-accent-700
                         disabled:opacity-50 disabled:cursor-not-allowed
                         rounded-lg font-medium transition-colors text-white"
              >
                {loading ? 'Extracting...' : 'Extract Event Data'}
              </button>
            </>
          ) : (
            <>
              {/* Preview Extracted Data */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-900 dark:text-white">Extracted Data</h4>
                  <ConfidenceBadge confidence={extractedData.confidence} />
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Event Name</p>
                    <p className="text-slate-900 dark:text-white">{extractedData.name}</p>
                  </div>

                  <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Description</p>
                    <p className="text-slate-900 dark:text-white text-sm line-clamp-3">{extractedData.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Category</p>
                      <p className="text-slate-900 dark:text-white capitalize">{extractedData.category}</p>
                    </div>

                    {extractedData.date && (
                      <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Date</p>
                        <p className="text-slate-900 dark:text-white">{extractedData.date}</p>
                      </div>
                    )}

                    {extractedData.time && (
                      <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Time</p>
                        <p className="text-slate-900 dark:text-white">{extractedData.time}</p>
                      </div>
                    )}
                  </div>

                  {extractedData.performers && extractedData.performers.length > 0 && (
                    <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Performers</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {extractedData.performers.map((performer, i) => (
                          <span key={i} className="px-2 py-1 bg-accent-600/20 text-accent-500 dark:text-accent-400 rounded text-xs">
                            {performer}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {extractedData.venue && extractedData.venue.name ? (
                    <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Venue</p>
                      <p className="text-slate-900 dark:text-white">{extractedData.venue.name}</p>
                      {extractedData.venue.address && (
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{extractedData.venue.address}</p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-600/20 rounded-lg">
                      <p className="text-xs text-yellow-400 mb-1">Venue (Not Found)</p>
                      <p className="text-yellow-300 text-sm">
                        Venue could not be extracted from the URL.
                        You can search for it in Step 2 using the venue search feature.
                      </p>
                    </div>
                  )}

                  {/* Images Section */}
                  {hasImages && (
                    <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Images Found</p>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-green-400 text-sm">✓</span>
                        <span className="text-slate-900 dark:text-white text-sm">
                          {(extractedData.images?.gallery?.length || 0) +
                            (extractedData.images?.cover ? 1 : 0)} image(s) will be imported
                        </span>
                      </div>
                      {/* Image previews */}
                      <div className="flex gap-2 flex-wrap">
                        {extractedData.images?.cover && (
                          <img
                            src={extractedData.images.cover}
                            alt="Cover"
                            className="w-16 h-16 object-cover rounded border border-slate-200 dark:border-slate-700"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        )}
                        {extractedData.images?.gallery?.slice(0, 4).map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Gallery ${idx + 1}`}
                            className="w-16 h-16 object-cover rounded border border-slate-200 dark:border-slate-700"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        ))}
                        {(extractedData.images?.gallery?.length || 0) > 4 && (
                          <div className="w-16 h-16 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                            +{(extractedData.images?.gallery?.length || 0) - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Image upload status */}
                  {imageStatus && (
                    <div className="p-3 bg-blue-600/20 rounded-lg">
                      <p className="text-blue-400 text-sm">{imageStatus}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Uploading indicator */}
              {uploadingImages && (
                <AILoadingState message="Importing images to your storage..." />
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setExtractedData(null)
                    setImageStatus('')
                  }}
                  disabled={uploadingImages}
                  className="flex-1 px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600
                           disabled:opacity-50 rounded-lg font-medium transition-colors text-white"
                >
                  ← Try Another URL
                </button>
                <button
                  onClick={handleApply}
                  disabled={uploadingImages}
                  className="flex-1 px-6 py-3 bg-accent-600 hover:bg-accent-700
                           disabled:opacity-50 rounded-lg font-medium transition-colors text-white"
                >
                  {uploadingImages ? 'Importing...' : hasImages ? 'Apply & Import Images →' : 'Apply to Form →'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
