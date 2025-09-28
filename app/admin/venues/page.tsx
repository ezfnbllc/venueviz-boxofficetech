'use client'
import {useState, useEffect, useCallback} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'
import {StorageService} from '@/lib/storage/storageService'
import {auth} from '@/lib/firebase'
import {onAuthStateChanged} from 'firebase/auth'
import EnhancedLayoutBuilder from '@/components/EnhancedLayoutBuilder'

export default function VenuesManagement() {
  const router = useRouter()
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [showLayoutBuilder, setShowLayoutBuilder] = useState(false)
  const [editingVenue, setEditingVenue] = useState<any>(null)
  const [selectedVenue, setSelectedVenue] = useState<any>(null)
  const [wizardStep, setWizardStep] = useState(1)
  const [aiLoading, setAiLoading] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  
  const [formData, setFormData] = useState({
    name: '',
    streetAddress1: '',
    streetAddress2: '',
    city: 'Dallas',
    state: 'TX',
    zipCode: '75001',
    latitude: 32.7767,
    longitude: -96.7970,
    capacity: 1000,
    type: 'theater',
    amenities: [] as string[],
    parkingCapacity: 500,
    images: [] as string[],
    layouts: [] as any[],
    defaultLayoutId: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    description: ''
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        loadVenues()
      } else {
        router.push('/login')
      }
    })
    return () => unsubscribe()
  }, [router])

  const loadVenues = async () => {
    try {
      const venuesData = await AdminService.getVenues()
      const venuesWithLayouts = await Promise.all(
        venuesData.map(async (venue) => {
          const layouts = await AdminService.getLayoutsByVenueId(venue.id)
          return { ...venue, layouts }
        })
      )
      setVenues(venuesWithLayouts)
    } catch (error) {
      console.error('Error loading venues:', error)
    }
    setLoading(false)
  }

  const handleEdit = (venue: any) => {
    setEditingVenue(venue)
    setFormData({
      name: venue.name || '',
      streetAddress1: venue.streetAddress1 || '',
      streetAddress2: venue.streetAddress2 || '',
      city: venue.city || 'Dallas',
      state: venue.state || 'TX',
      zipCode: venue.zipCode || '75001',
      latitude: venue.latitude || 32.7767,
      longitude: venue.longitude || -96.7970,
      capacity: venue.capacity || 1000,
      type: venue.type || 'theater',
      amenities: venue.amenities || [],
      parkingCapacity: venue.parkingCapacity || 500,
      images: venue.images || [],
      layouts: venue.layouts || [],
      defaultLayoutId: venue.defaultLayoutId || '',
      contactEmail: venue.contactEmail || '',
      contactPhone: venue.contactPhone || '',
      website: venue.website || '',
      description: venue.description || ''
    })
    setImageUrls(venue.images || [])
    setImageFiles([])
    setShowWizard(true)
    setWizardStep(1)
  }

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    if (confirm(`Are you sure you want to delete "${name}"? All associated layouts will also be deleted.`)) {
      try {
        await AdminService.deleteVenue(id)
        await loadVenues()
        alert('Venue deleted successfully')
      } catch (error) {
        console.error('Error deleting venue:', error)
        alert('Error deleting venue')
      }
    }
  }

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    const totalImages = imageFiles.length + imageUrls.length + files.length
    
    if (totalImages > 3) {
      alert(`You can only add ${3 - imageFiles.length - imageUrls.length} more image(s)`)
      return
    }
    setImageFiles([...imageFiles, ...files])
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const totalImages = imageFiles.length + imageUrls.length + files.length
    
    if (totalImages > 3) {
      alert(`You can only add ${3 - imageFiles.length - imageUrls.length} more image(s)`)
      return
    }
    setImageFiles([...imageFiles, ...files])
    e.target.value = ''
  }

  const removeImage = (index: number, isUrl: boolean) => {
    if (isUrl) {
      setImageUrls(imageUrls.filter((_, i) => i !== index))
    } else {
      setImageFiles(imageFiles.filter((_, i) => i !== index))
    }
  }

  const uploadImages = async () => {
    if (imageFiles.length === 0) return []
    
    setUploadingImages(true)
    const urls: string[] = []
    
    try {
      for (const file of imageFiles) {
        const url = await StorageService.uploadVenueImage(file, formData.name)
        urls.push(url)
      }
      return urls
    } catch (error) {
      console.error('Error uploading images:', error)
      return []
    } finally {
      setUploadingImages(false)
    }
  }

  const generateWithAI = async () => {
    if (!formData.name) {
      alert('Please enter venue name first')
      return
    }
    
    setAiLoading(true)
    try {
      const response = await fetch('/api/generate-venue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          venueName: formData.name,
          venueType: formData.type,
          capacity: formData.capacity
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({
          ...prev,
          description: data.description || prev.description,
          amenities: data.amenities || prev.amenities,
          parkingCapacity: data.parkingCapacity || prev.parkingCapacity,
          layouts: data.suggestedLayouts || prev.layouts
        }))
      }
    } catch (error) {
      console.error('AI generation error:', error)
    }
    setAiLoading(false)
  }

  const handleSubmit = async () => {
    try {
      const uploadedUrls = await uploadImages()
      
      const venueData = {
        ...formData,
        images: [...imageUrls, ...uploadedUrls]
      }
      
      let venueId: string
      if (editingVenue) {
        await AdminService.updateVenue(editingVenue.id, venueData)
        venueId = editingVenue.id
      } else {
        venueId = await AdminService.createVenue(venueData)
      }
      
      if (formData.layouts.length > 0 && !editingVenue) {
        for (const layout of formData.layouts) {
          await AdminService.createLayout({
            ...layout,
            venueId: venueId
          })
        }
      }
      
      resetWizard()
      await loadVenues()
      alert(`Venue ${editingVenue ? 'updated' : 'created'} successfully!`)
    } catch (error) {
      console.error('Error saving venue:', error)
      alert('Error saving venue')
    }
  }

  const resetWizard = () => {
    setShowWizard(false)
    setEditingVenue(null)
    setWizardStep(1)
    setImageFiles([])
    setImageUrls([])
    setFormData({
      name: '',
      streetAddress1: '',
      streetAddress2: '',
      city: 'Dallas',
      state: 'TX',
      zipCode: '75001',
      latitude: 32.7767,
      longitude: -96.7970,
      capacity: 1000,
      type: 'theater',
      amenities: [],
      parkingCapacity: 500,
      images: [],
      layouts: [],
      defaultLayoutId: '',
      contactEmail: '',
      contactPhone: '',
      website: '',
      description: ''
    })
  }

  const nextStep = () => {
    if (wizardStep === 1 && !formData.name) {
      alert('Please enter venue name')
      return
    }
    if (wizardStep === 2 && !formData.streetAddress1) {
      alert('Please enter venue address')
      return
    }
    
    if (wizardStep < 4) {
      setWizardStep(wizardStep + 1)
    } else {
      handleSubmit()
    }
  }

  const prevStep = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1)
    }
  }

  const openLayoutBuilder = useCallback((venue: any) => {
    setSelectedVenue(venue)
    setShowLayoutBuilder(true)
  }, [])

  const closeLayoutBuilder = useCallback(() => {
    setShowLayoutBuilder(false)
    setSelectedVenue(null)
    loadVenues()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Venue Management</h1>
          <div className="flex gap-4">
            <button onClick={() => router.push('/admin')} className="px-4 py-2 bg-gray-600 rounded-lg">
              Back
            </button>
            <button onClick={() => setShowWizard(true)} className="px-6 py-2 bg-purple-600 rounded-lg">
              + New Venue
            </button>
          </div>
        </div>

        {/* Venues Grid */}
        {!loading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.map(venue => (
              <div key={venue.id} className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden group">
                <div className="relative">
                  {venue.images?.[0] ? (
                    <img src={venue.images[0]} alt={venue.name} className="w-full h-48 object-cover" />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center">
                      <span className="text-6xl opacity-20">🏛️</span>
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        openLayoutBuilder(venue)
                      }}
                      className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center hover:bg-green-700 transition"
                      title="Manage Layouts"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(venue)
                      }}
                      className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition"
                      title="Edit Venue"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, venue.id, venue.name)}
                      className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition"
                      title="Delete Venue"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{venue.name}</h3>
                  <p className="text-gray-400 text-sm mb-1">
                    {venue.city}, {venue.state}
                  </p>
                  <p className="text-gray-400 text-sm mb-4">
                    Capacity: {venue.capacity}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">
                      {venue.layouts?.length || 0} Layouts
                    </span>
                    <button 
                      onClick={() => openLayoutBuilder(venue)}
                      className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded text-sm hover:bg-purple-600/30 transition-colors"
                    >
                      Manage Layouts
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Venue Wizard Modal */}
        {showWizard && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-4xl my-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  {editingVenue ? 'Edit Venue' : 'Create New Venue'}
                </h2>
                <button onClick={resetWizard} className="text-gray-400 hover:text-white text-2xl">✕</button>
              </div>

              {/* Progress Steps */}
              <div className="flex mb-8">
                {['Basic Info', 'Location', 'Details', 'Review'].map((label, i) => (
                  <div key={i} className="flex-1">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        wizardStep > i + 1 ? 'bg-green-600' : 
                        wizardStep === i + 1 ? 'bg-purple-600' : 'bg-gray-600'
                      }`}>
                        {wizardStep > i + 1 ? '✓' : i + 1}
                      </div>
                      {i < 3 && <div className={`flex-1 h-1 mx-2 ${
                        wizardStep > i + 1 ? 'bg-green-600' : 'bg-gray-600'
                      }`}/>}
                    </div>
                    <p className="text-xs mt-2">{label}</p>
                  </div>
                ))}
              </div>

              {/* Step 1: Basic Info */}
              {wizardStep === 1 && (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  <div>
                    <label className="block text-sm mb-2">Venue Name *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="flex-1 px-4 py-2 bg-white/10 rounded-lg"
                        placeholder="e.g., Madison Square Garden"
                      />
                      <button
                        onClick={generateWithAI}
                        disabled={aiLoading}
                        className="px-4 py-2 bg-purple-600 rounded-lg disabled:opacity-50"
                      >
                        {aiLoading ? '...' : '✨ AI Generate'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Venue Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    >
                      <option value="theater">Theater</option>
                      <option value="arena">Arena</option>
                      <option value="stadium">Stadium</option>
                      <option value="club">Club</option>
                      <option value="outdoor">Outdoor</option>
                      <option value="convention">Convention Center</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-2">Capacity</label>
                      <input
                        type="number"
                        value={formData.capacity}
                        onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Parking Capacity</label>
                      <input
                        type="number"
                        value={formData.parkingCapacity}
                        onChange={(e) => setFormData({...formData, parkingCapacity: parseInt(e.target.value)})}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      rows={4}
                      placeholder="Venue description"
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm mb-2">
                      Venue Images ({imageFiles.length + imageUrls.length}/3)
                    </label>
                    
                    {(imageUrls.length > 0 || imageFiles.length > 0) && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {imageUrls.map((url, i) => (
                          <div key={`url-${i}`} className="relative">
                            <img src={url} className="w-full h-24 object-cover rounded" alt="" />
                            <button
                              onClick={() => removeImage(i, true)}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-sm"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {imageFiles.map((file, i) => (
                          <div key={`file-${i}`} className="relative">
                            <div className="w-full h-24 bg-white/10 rounded flex items-center justify-center p-2">
                              <span className="text-xs text-center truncate">{file.name}</span>
                            </div>
                            <button
                              onClick={() => removeImage(i, false)}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-sm"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {imageFiles.length + imageUrls.length < 3 && (
                      <div 
                        onDrop={handleImageDrop}
                        onDragOver={(e) => e.preventDefault()}
                        className="border-2 border-dashed border-white/20 rounded-lg p-4 text-center"
                      >
                        <p className="text-gray-400 mb-2">
                          Drag & drop image here or
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageSelect}
                          className="hidden"
                          id="venue-image-upload"
                        />
                        <label htmlFor="venue-image-upload" className="px-4 py-2 bg-purple-600/20 rounded-lg cursor-pointer inline-block hover:bg-purple-600/30">
                          Browse Files
                        </label>
                        <p className="text-xs text-gray-500 mt-2">
                          You can add {3 - imageFiles.length - imageUrls.length} more image(s)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Location */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2">Street Address *</label>
                    <input
                      type="text"
                      required
                      value={formData.streetAddress1}
                      onChange={(e) => setFormData({...formData, streetAddress1: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Address Line 2</label>
                    <input
                      type="text"
                      value={formData.streetAddress2}
                      onChange={(e) => setFormData({...formData, streetAddress2: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="Suite 100"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm mb-2">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({...formData, state: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">ZIP Code</label>
                      <input
                        type="text"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-2">Latitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={formData.latitude}
                        onChange={(e) => setFormData({...formData, latitude: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Longitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={formData.longitude}
                        onChange={(e) => setFormData({...formData, longitude: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Details */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2">Contact Email</label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Contact Phone</label>
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Website</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Amenities</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Parking', 'WiFi', 'Food Service', 'Bar', 'VIP Lounge', 'Accessible', 'Air Conditioning', 'Coat Check'].map(amenity => (
                        <label key={amenity} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.amenities.includes(amenity)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({...formData, amenities: [...formData.amenities, amenity]})
                              } else {
                                setFormData({...formData, amenities: formData.amenities.filter(a => a !== amenity)})
                              }
                            }}
                          />
                          <span className="text-sm">{amenity}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {wizardStep === 4 && (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  <h3 className="text-xl font-bold mb-4">Review Venue Details</h3>
                  
                  <div className="bg-white/5 rounded-lg p-4 space-y-3">
                    <div className="pb-3 border-b border-white/10">
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">Basic Information</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p><span className="text-gray-500">Name:</span> {formData.name}</p>
                        <p><span className="text-gray-500">Type:</span> {formData.type}</p>
                        <p><span className="text-gray-500">Capacity:</span> {formData.capacity}</p>
                        <p><span className="text-gray-500">Parking:</span> {formData.parkingCapacity}</p>
                      </div>
                    </div>

                    <div className="pb-3 border-b border-white/10">
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">Location</h4>
                      <p className="text-sm">
                        {formData.streetAddress1}
                        {formData.streetAddress2 && `, ${formData.streetAddress2}`}
                      </p>
                      <p className="text-sm">
                        {formData.city}, {formData.state} {formData.zipCode}
                      </p>
                    </div>

                    {formData.amenities.length > 0 && (
                      <div className="pb-3 border-b border-white/10">
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Amenities</h4>
                        <p className="text-sm">{formData.amenities.join(', ')}</p>
                      </div>
                    )}

                    {(imageUrls.length > 0 || imageFiles.length > 0) && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Images ({imageUrls.length + imageFiles.length})</h4>
                        <div className="grid grid-cols-3 gap-2">
                          {imageUrls.map((url, i) => (
                            <img key={i} src={url} className="w-full h-16 object-cover rounded" alt="" />
                          ))}
                          {imageFiles.map((file, i) => (
                            <div key={i} className="w-full h-16 bg-white/10 rounded flex items-center justify-center">
                              <span className="text-xs">{file.name.substring(0, 10)}...</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-8">
                <button
                  onClick={prevStep}
                  disabled={wizardStep === 1}
                  className="px-6 py-2 bg-gray-700 rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={nextStep}
                  className="px-6 py-2 bg-purple-600 rounded-lg"
                >
                  {wizardStep === 4 ? (editingVenue ? 'Update Venue' : 'Create Venue') : 'Next'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Layout Builder Modal - Render only when both conditions are true */}
        {showLayoutBuilder && selectedVenue && (
          <EnhancedLayoutBuilder
            key={selectedVenue.id} // Force remount when venue changes
            venue={selectedVenue}
            onClose={closeLayoutBuilder}
          />
        )}
      </div>
    </div>
  )
}
