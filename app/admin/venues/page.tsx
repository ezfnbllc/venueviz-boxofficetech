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
  const [lookingUpVenue, setLookingUpVenue] = useState(false)
  const [lookupMessage, setLookupMessage] = useState('')

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
      streetAddress1: venue.streetAddress1 || venue.address?.street || '',
      streetAddress2: venue.streetAddress2 || '',
      city: venue.city || venue.address?.city || 'Dallas',
      state: venue.state || venue.address?.state || 'TX',
      zipCode: venue.zipCode || venue.address?.zip || '',
      latitude: venue.latitude || venue.address?.coordinates?.lat || 32.7767,
      longitude: venue.longitude || venue.address?.coordinates?.lng || -96.7970,
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
    setShowWizard(true)
    setWizardStep(1)
  }

  const handleDelete = async (venueId: string) => {
    if (confirm('Are you sure you want to delete this venue?')) {
      try {
        await AdminService.deleteVenue(venueId)
        await loadVenues()
      } catch (error) {
        console.error('Error deleting venue:', error)
      }
    }
  }

  const handleOpenLayoutBuilder = (venue: any) => {
    setSelectedVenue(venue)
    setShowLayoutBuilder(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploadingImages(true)
    try {
      const uploadPromises = files.map(file => StorageService.uploadVenueImage(file))
      const urls = await Promise.all(uploadPromises)
      setImageUrls([...imageUrls, ...urls])
      setFormData({...formData, images: [...formData.images, ...urls]})
    } catch (error) {
      console.error('Error uploading images:', error)
    }
    setUploadingImages(false)
  }

  const handleSubmit = async () => {
    try {
      const venueData = {
        ...formData,
        address: {
          street: formData.streetAddress1,
          city: formData.city,
          state: formData.state,
          zip: formData.zipCode,
          country: 'USA',
          coordinates: {
            lat: formData.latitude,
            lng: formData.longitude
          }
        }
      }

      if (editingVenue) {
        await AdminService.updateVenue(editingVenue.id, venueData)
      } else {
        await AdminService.createVenue(venueData)
      }

      setShowWizard(false)
      resetForm()
      await loadVenues()
    } catch (error) {
      console.error('Error saving venue:', error)
    }
  }

  const resetForm = () => {
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
    setImageUrls([])
    setEditingVenue(null)
    setWizardStep(1)
  }

  const toggleAmenity = (amenity: string) => {
    const amenities = formData.amenities.includes(amenity)
      ? formData.amenities.filter(a => a !== amenity)
      : [...formData.amenities, amenity]
    setFormData({...formData, amenities})
  }

  // AI-powered venue lookup to auto-fill address and details
  const handleLookupVenue = async () => {
    if (!formData.name.trim()) {
      setLookupMessage('Please enter a venue name first')
      return
    }

    setLookingUpVenue(true)
    setLookupMessage('Looking up venue details...')

    try {
      const response = await fetch('/api/lookup-venue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueName: formData.name,
          city: formData.city || undefined,
          state: formData.state || undefined
        })
      })

      const data = await response.json()

      if (data.success && data.venue) {
        const venue = data.venue

        // Update form with AI-found details
        setFormData(prev => ({
          ...prev,
          name: venue.name || prev.name,
          streetAddress1: venue.address || prev.streetAddress1,
          city: venue.city || prev.city,
          state: venue.state || prev.state,
          zipCode: venue.zip || prev.zipCode,
          capacity: venue.capacity || prev.capacity,
          type: venue.type || prev.type,
          contactPhone: venue.phone || prev.contactPhone,
          website: venue.website || prev.website,
          description: venue.description || prev.description,
          amenities: [
            ...(venue.features?.hasParking ? ['Parking'] : []),
            ...(venue.features?.isAccessible ? ['Wheelchair Accessible'] : []),
            ...(venue.features?.hasVIP ? ['VIP Boxes'] : []),
            ...(venue.features?.hasFood ? ['Food Service'] : []),
            ...(venue.features?.hasBars ? ['Bar'] : [])
          ]
        }))

        const confidence = venue.confidence === 'high' ? '(High confidence)'
          : venue.confidence === 'medium' ? '(Medium confidence)'
          : '(Low confidence - please verify)'

        setLookupMessage(`Found venue details! ${confidence}`)
        setTimeout(() => setLookupMessage(''), 5000)
      } else {
        setLookupMessage('Could not find venue details. Please enter manually.')
        setTimeout(() => setLookupMessage(''), 5000)
      }
    } catch (error) {
      console.error('Venue lookup error:', error)
      setLookupMessage('Error looking up venue. Please enter details manually.')
      setTimeout(() => setLookupMessage(''), 5000)
    }

    setLookingUpVenue(false)
  }

  return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Venues Management</h1>
            <p className="text-slate-500 dark:text-slate-400">Configure venues and seating layouts</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowWizard(true)
            }}
            className="px-6 py-2 bg-accent-600 rounded-lg hover:bg-accent-700"
          >
            + Add Venue
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-accent-500"/>
          </div>
        ) : venues.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-6xl mb-4">🏛️</div>
            <p className="text-slate-500 dark:text-slate-400 mb-4">No venues yet. Add your first venue!</p>
            <button
              onClick={() => setShowWizard(true)}
              className="px-6 py-2 bg-accent-600 rounded-lg hover:bg-accent-700"
            >
              Add First Venue
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.map(venue => (
              <div key={venue.id} className="bg-white dark:bg-slate-800 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden group hover:scale-105 transition-transform">
                {/* Venue Image */}
                {venue.images && venue.images[0] && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={venue.images[0]}
                      alt={venue.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </div>
                )}

                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">{venue.name}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                    {venue.city || venue.address?.city}, {venue.state || venue.address?.state}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <span>👥</span>
                      <span>Capacity: {venue.capacity || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <span>🎭</span>
                      <span>Type: {venue.type || 'Theater'}</span>
                    </div>
                    {venue.layouts && venue.layouts.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <span>📐</span>
                        <span>{venue.layouts.length} Layout{venue.layouts.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Amenities */}
                  {venue.amenities && venue.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {venue.amenities.slice(0, 3).map((amenity: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-accent-600/20 text-accent-500 dark:text-accent-400 rounded text-xs">
                          {amenity}
                        </span>
                      ))}
                      {venue.amenities.length > 3 && (
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded text-xs">
                          +{venue.amenities.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(venue)}
                      className="flex-1 px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleOpenLayoutBuilder(venue)}
                      className="flex-1 px-3 py-2 bg-accent-600/20 text-accent-500 dark:text-accent-400 rounded-lg hover:bg-accent-600/30 text-sm"
                    >
                      Layouts
                    </button>
                    <button
                      onClick={() => handleDelete(venue.id)}
                      className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 text-sm"
                    >
                      Delete
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
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-4xl my-8">
              {/* Wizard Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {editingVenue ? 'Edit Venue' : 'Add New Venue'}
                </h2>
                <button
                  onClick={() => {
                    setShowWizard(false)
                    resetForm()
                  }}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Progress Steps */}
              <div className="flex justify-between mb-8">
                {['Basic Info', 'Location', 'Features', 'Images'].map((step, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 text-center ${idx + 1 <= wizardStep ? 'text-accent-500 dark:text-accent-400' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    <div className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center ${
                      idx + 1 <= wizardStep ? 'bg-accent-600' : 'bg-slate-200 dark:bg-slate-700'
                    }`}>
                      {idx + 1}
                    </div>
                    <span className="text-xs">{step}</span>
                  </div>
                ))}
              </div>

              {/* Step 1: Basic Info */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2 text-slate-900 dark:text-white">Venue Name</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                        placeholder="Enter venue name"
                      />
                      <button
                        type="button"
                        onClick={handleLookupVenue}
                        disabled={lookingUpVenue || !formData.name.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:opacity-50 rounded-lg text-sm whitespace-nowrap flex items-center gap-2"
                      >
                        {lookingUpVenue ? (
                          <>
                            <span className="animate-spin">⟳</span>
                            Looking up...
                          </>
                        ) : (
                          <>🔍 Lookup Details</>
                        )}
                      </button>
                    </div>
                    {lookupMessage && (
                      <p className={`text-xs mt-2 ${lookupMessage.includes('Found') ? 'text-green-400' : lookupMessage.includes('Error') || lookupMessage.includes('not find') ? 'text-yellow-400' : 'text-blue-400'}`}>
                        {lookupMessage}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Enter the venue name and click "Lookup Details" to auto-fill address and other information
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-slate-900 dark:text-white">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg h-32 text-slate-900 dark:text-white"
                      placeholder="Enter venue description"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-2 text-slate-900 dark:text-white">Venue Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                      >
                        <option value="theater">Theater</option>
                        <option value="arena">Arena</option>
                        <option value="stadium">Stadium</option>
                        <option value="club">Club</option>
                        <option value="hall">Hall</option>
                        <option value="outdoor">Outdoor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm mb-2 text-slate-900 dark:text-white">Capacity</label>
                      <input
                        type="number"
                        value={formData.capacity}
                        onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                        placeholder="1000"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setWizardStep(2)}
                      className="px-6 py-2 bg-accent-600 rounded-lg hover:bg-accent-700"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Location */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2 text-slate-900 dark:text-white">Street Address</label>
                    <input
                      type="text"
                      value={formData.streetAddress1}
                      onChange={(e) => setFormData({...formData, streetAddress1: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-slate-900 dark:text-white">Address Line 2 (Optional)</label>
                    <input
                      type="text"
                      value={formData.streetAddress2}
                      onChange={(e) => setFormData({...formData, streetAddress2: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                      placeholder="Suite, Floor, etc."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm mb-2 text-slate-900 dark:text-white">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-2 text-slate-900 dark:text-white">State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({...formData, state: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-2 text-slate-900 dark:text-white">ZIP Code</label>
                      <input
                        type="text"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-2 text-slate-900 dark:text-white">Contact Email</label>
                      <input
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                        placeholder="venue@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-2 text-slate-900 dark:text-white">Contact Phone</label>
                      <input
                        type="tel"
                        value={formData.contactPhone}
                        onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => setWizardStep(1)}
                      className="px-6 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setWizardStep(3)}
                      className="px-6 py-2 bg-accent-600 rounded-lg hover:bg-accent-700"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Features */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2 text-slate-900 dark:text-white">Parking Capacity</label>
                    <input
                      type="number"
                      value={formData.parkingCapacity}
                      onChange={(e) => setFormData({...formData, parkingCapacity: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                      placeholder="500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-slate-900 dark:text-white">Website</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                      placeholder="https://venue-website.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-4 text-slate-900 dark:text-white">Amenities</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        'Parking', 'WiFi', 'Wheelchair Accessible',
                        'Food Service', 'Bar', 'VIP Boxes',
                        'Coat Check', 'ATM', 'Merchandise Shop'
                      ].map(amenity => (
                        <label key={amenity} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.amenities.includes(amenity)}
                            onChange={() => toggleAmenity(amenity)}
                            className="rounded"
                          />
                          <span className="text-sm text-slate-900 dark:text-white">{amenity}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => setWizardStep(2)}
                      className="px-6 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setWizardStep(4)}
                      className="px-6 py-2 bg-accent-600 rounded-lg hover:bg-accent-700"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Images */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2 text-slate-900 dark:text-white">Venue Images</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                      disabled={uploadingImages}
                    />
                    {uploadingImages && (
                      <p className="text-xs text-accent-500 dark:text-accent-400 mt-2">Uploading images...</p>
                    )}
                  </div>

                  {imageUrls.length > 0 && (
                    <div className="grid grid-cols-4 gap-4">
                      {imageUrls.map((url, index) => (
                        <div key={index} className="relative">
                          <img src={url} alt="" className="w-full h-24 object-cover rounded" />
                          <button
                            onClick={() => {
                              const newUrls = imageUrls.filter((_, i) => i !== index)
                              setImageUrls(newUrls)
                              setFormData({...formData, images: newUrls})
                            }}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-600 rounded-full text-white text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button
                      onClick={() => setWizardStep(3)}
                      className="px-6 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="px-6 py-2 bg-green-600 rounded-lg hover:bg-green-700"
                    >
                      {editingVenue ? 'Update Venue' : 'Add Venue'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Layout Builder Modal */}
        {showLayoutBuilder && selectedVenue && (
          <EnhancedLayoutBuilder
            venue={selectedVenue}
            onClose={() => {
              setShowLayoutBuilder(false)
              setSelectedVenue(null)
              loadVenues()
            }}
          />
        )}
      </div>
  )
}
