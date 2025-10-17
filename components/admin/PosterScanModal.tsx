'use client'
import { useState } from 'react'
import { EventAI, AIExtractedData } from '@/lib/ai/eventAI'
import AILoadingState from './AILoadingState'
import ConfidenceBadge from './ConfidenceBadge'
import { AdminService } from '@/lib/admin/adminService'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'

interface PosterScanModalProps {
  onClose: () => void
  onImport: (data: AIExtractedData) => void
}

// Helper to format address for display
function formatAddress(address: any): string {
  if (typeof address === 'string') return address
  if (!address) return ''
  
  const parts = []
  if (address.street) parts.push(address.street)
  if (address.city) parts.push(address.city)
  if (address.state) parts.push(address.state)
  if (address.zip) parts.push(address.zip)
  
  return parts.join(', ')
}

export default function PosterScanModal({ onClose, onImport }: PosterScanModalProps) {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [error, setError] = useState('')
  const [extractedData, setExtractedData] = useState<any>(null)
  const [venueMatches, setVenueMatches] = useState<any[]>([])
  const [selectedVenueId, setSelectedVenueId] = useState<string>('')
  const [adjustingDescription, setAdjustingDescription] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file')
        return
      }
      
      setImageFile(file)
      setError('')
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImagesToFirebase = async (imageData: any) => {
    const storage = getStorage()
    const urls: any = {}

    try {
      for (const [key, img] of Object.entries<any>(imageData)) {
        const base64Data = img.data
        const blob = await fetch(`data:${img.type};base64,${base64Data}`).then(r => r.blob())
        
        const storageRef = ref(storage, `events/${img.name}`)
        await uploadBytes(storageRef, blob, { contentType: img.type })
        const url = await getDownloadURL(storageRef)
        
        urls[key] = url
      }

      return {
        cover: urls.cover,
        thumbnail: urls.thumbnail,
        gallery: [urls.gallery]
      }
    } catch (error) {
      console.error('Upload error:', error)
      throw new Error('Failed to upload images to Firebase')
    }
  }

  const handleScan = async () => {
    if (!imageFile) {
      setError('Please upload a poster image')
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await EventAI.extractFromPoster(imageFile)
      
      // Upload images client-side if we got base64 data
      if (data.imageData) {
        setUploadingImages(true)
        const imageUrls = await uploadImagesToFirebase(data.imageData)
        data.images = imageUrls
        delete data.imageData
        setUploadingImages(false)
      }
      
      setExtractedData(data)
      
      // Auto-match venue
      if (data.venue?.name || data.venue?.address) {
        await matchVenue(data.venue.name, data.venue.address)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setUploadingImages(false)
    }
  }

  const matchVenue = async (venueName?: string, venueAddress?: string) => {
    try {
      const response = await fetch('/api/ai/match-venue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueName, venueAddress })
      })
      
      if (response.ok) {
        const data = await response.json()
        setVenueMatches(data.matches || [])
        if (data.matches && data.matches.length > 0) {
          setSelectedVenueId(data.matches[0].venue.id)
        }
      }
    } catch (error) {
      console.error('Venue matching error:', error)
    }
  }

  const adjustDescription = async (action: 'lengthen' | 'shorten' | 'professional') => {
    if (!extractedData?.description) return
    
    setAdjustingDescription(true)
    try {
      const response = await fetch('/api/ai/adjust-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: extractedData.description,
          action
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setExtractedData({
          ...extractedData,
          description: data.description
        })
      }
    } catch (error) {
      console.error('Description adjustment error:', error)
    } finally {
      setAdjustingDescription(false)
    }
  }

  const handleAddNewVenue = async () => {
    if (!extractedData?.venue) return
    
    try {
      const newVenueId = await AdminService.createVenue({
        name: extractedData.venue.name,
        address: extractedData.venue.address || '',
        capacity: 500,
        type: 'other'
      })
      
      setSelectedVenueId(newVenueId)
      alert('✅ New venue added!')
    } catch (error) {
      alert('Failed to add venue')
    }
  }

  const handleApply = () => {
    if (extractedData) {
      onImport({ ...extractedData, venueId: selectedVenueId })
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <div>
            <h3 className="text-xl font-bold text-white">🖼️ Scan Event Poster</h3>
            <p className="text-sm text-gray-400 mt-1">
              AI extracts info + auto-uploads images
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">✕</button>
        </div>

        <div className="p-6">
          {!extractedData ? (
            <div className="space-y-4">
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-[500px] object-contain rounded-lg border border-gray-800" />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview('') }}
                    className="absolute top-2 right-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="block w-full p-16 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-purple-500 text-center">
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={loading} />
                  <div className="text-gray-400">
                    <div className="text-6xl mb-4">📤</div>
                    <p className="text-lg mb-2">Click to upload</p>
                    <p className="text-sm opacity-75">All formats supported</p>
                  </div>
                </label>
              )}

              {(loading || uploadingImages) && (
                <AILoadingState message={uploadingImages ? "Uploading images to Firebase..." : "Scanning poster..."} />
              )}
              
              {error && <div className="p-4 bg-red-600/20 border border-red-500/30 rounded-lg text-red-400">{error}</div>}

              {imageFile && !loading && (
                <button onClick={handleScan} className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-white text-lg">
                  🚀 Scan Poster
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex gap-3 items-center">
                <h4 className="text-xl font-bold text-white">{extractedData.name}</h4>
                <ConfidenceBadge confidence={extractedData.confidence} />
              </div>

              {extractedData.images && (
                <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-4">
                  <h5 className="font-semibold text-blue-400 mb-3">📸 Images Uploaded</h5>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Cover</p>
                      <img src={extractedData.images.cover} alt="Cover" className="w-full h-32 object-cover rounded border border-gray-700" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Thumbnail</p>
                      <img src={extractedData.images.thumbnail} alt="Thumb" className="w-full h-32 object-cover rounded border border-gray-700" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Gallery</p>
                      <img src={extractedData.images.gallery[0]} alt="Gallery" className="w-full h-32 object-cover rounded border border-gray-700" />
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-850 rounded-lg p-4 border border-gray-800">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-gray-300">Description</label>
                  <div className="flex gap-2">
                    <button onClick={() => adjustDescription('shorten')} disabled={adjustingDescription} className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50">↓ Shorten</button>
                    <button onClick={() => adjustDescription('lengthen')} disabled={adjustingDescription} className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50">↑ Lengthen</button>
                    <button onClick={() => adjustDescription('professional')} disabled={adjustingDescription} className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded disabled:opacity-50">✨ Polish</button>
                  </div>
                </div>
                <textarea
                  value={extractedData.description}
                  onChange={(e) => setExtractedData({ ...extractedData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded text-white text-sm"
                />
              </div>

              {venueMatches.length > 0 && (
                <div className="bg-green-600/10 border border-green-500/30 rounded-lg p-4">
                  <h5 className="font-semibold text-green-400 mb-3">✅ Venue Matches</h5>
                  {venueMatches.map((match: any) => (
                    <label key={match.venue.id} className="flex items-center gap-3 p-3 bg-gray-850 rounded mb-2 cursor-pointer hover:bg-gray-800">
                      <input type="radio" name="venue" checked={selectedVenueId === match.venue.id} onChange={() => setSelectedVenueId(match.venue.id)} />
                      <div className="flex-1">
                        <p className="font-medium text-white">{match.venue.name}</p>
                        <p className="text-xs text-gray-400">{formatAddress(match.venue.address)}</p>
                      </div>
                      <span className="text-sm font-semibold text-purple-400">{Math.round(match.score)}%</span>
                    </label>
                  ))}
                  <button onClick={handleAddNewVenue} className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm mt-2">
                    + Add New Venue
                  </button>
                </div>
              )}

              {extractedData.pricing && extractedData.pricing.length > 0 && (
                <div className="bg-gray-850 rounded-lg p-4 border border-gray-800">
                  <h5 className="font-semibold text-white mb-3">💰 Ticket Pricing</h5>
                  <div className="grid grid-cols-2 gap-3">
                    {extractedData.pricing.map((tier: any, i: number) => (
                      <div key={i} className="p-3 bg-gray-900 rounded border border-gray-700">
                        <p className="font-medium text-white">{tier.name}</p>
                        <p className="text-2xl font-bold text-purple-400">${tier.price}</p>
                        {tier.description && <p className="text-xs text-gray-400 mt-1">{tier.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {extractedData.promotions && extractedData.promotions.length > 0 && (
                <div className="bg-purple-600/10 border border-purple-500/30 rounded-lg p-4">
                  <h5 className="font-semibold text-purple-400 mb-3">🎁 Promotions</h5>
                  <div className="space-y-2">
                    {extractedData.promotions.map((promo: any, i: number) => (
                      <div key={i} className="p-3 bg-gray-850 rounded flex justify-between items-center">
                        <div>
                          <p className="font-mono text-yellow-400 font-bold">{promo.code || 'N/A'}</p>
                          <p className="text-sm text-gray-400">{promo.description}</p>
                        </div>
                        <span className="text-lg font-bold text-green-400">
                          {promo.type === 'percentage' ? `${promo.discount}%` : `$${promo.discount}`} OFF
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <button onClick={() => { setExtractedData(null); setImageFile(null); setImagePreview(''); setVenueMatches([]) }} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white">← Scan Another</button>
                <button onClick={handleApply} disabled={venueMatches.length > 0 && !selectedVenueId} className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg font-medium text-white">Apply →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
