'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'
import { AdminService } from '@/lib/admin/adminService'
import { StorageService } from '@/lib/storage/storageService'

// Fuzzy search function - returns match score 0-1
function fuzzyMatch(text: string, query: string): number {
  if (!text || !query) return 0
  const textLower = text.toLowerCase()
  const queryLower = query.toLowerCase()

  // Exact match
  if (textLower === queryLower) return 1

  // Contains match
  if (textLower.includes(queryLower)) return 0.8

  // Word match
  const textWords = textLower.split(/\s+/)
  const queryWords = queryLower.split(/\s+/)
  let matchedWords = 0
  for (const qWord of queryWords) {
    if (textWords.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))) {
      matchedWords++
    }
  }
  if (matchedWords > 0) return 0.5 + (matchedWords / queryWords.length) * 0.3

  // Character sequence match
  let queryIndex = 0
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) queryIndex++
  }
  return queryIndex / queryLower.length * 0.4
}

interface VenueWizardFormData {
  name: string
  streetAddress1: string
  streetAddress2: string
  city: string
  state: string
  zipCode: string
  capacity: number
  type: string
  amenities: string[]
  parkingCapacity: number
  contactEmail: string
  contactPhone: string
  website: string
  description: string
  images: string[]
}

export default function Step2Venue() {
  const { formData, updateFormData } = useEventWizardStore()
  const [venues, setVenues] = useState<any[]>([])
  const [layouts, setLayouts] = useState<any[]>([])
  const [selectedLayout, setSelectedLayout] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Fuzzy search state
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  // Create venue sub-wizard state
  const [showVenueWizard, setShowVenueWizard] = useState(false)
  const [venueWizardStep, setVenueWizardStep] = useState(1)
  const [venueFormData, setVenueFormData] = useState<VenueWizardFormData>({
    name: '',
    streetAddress1: '',
    streetAddress2: '',
    city: 'Dallas',
    state: 'TX',
    zipCode: '',
    capacity: 1000,
    type: 'theater',
    amenities: [],
    parkingCapacity: 500,
    contactEmail: '',
    contactPhone: '',
    website: '',
    description: '',
    images: []
  })
  const [uploadingImages, setUploadingImages] = useState(false)
  const [savingVenue, setSavingVenue] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    loadVenues()
  }, [])

  // Auto-populate from scraped venue data
  useEffect(() => {
    if (initializedRef.current) return
    if (venues.length === 0) return

    const scrapedVenue = (formData.basics as any)?.scrapedVenue
    if (scrapedVenue?.name) {
      initializedRef.current = true
      setSearchQuery(scrapedVenue.name)

      // Try to find a matching venue
      const matchedVenue = venues.find(v => fuzzyMatch(v.name, scrapedVenue.name) > 0.7)
      if (matchedVenue) {
        handleVenueChange(matchedVenue.id)
      }
    }
  }, [venues, formData.basics])

  useEffect(() => {
    if (formData.venue.venueId) {
      loadLayouts(formData.venue.venueId)
    }
  }, [formData.venue.venueId])

  useEffect(() => {
    if (layouts.length > 0) {
      if (!formData.venue.layoutId) {
        handleLayoutChange(layouts[0].id)
      } else {
        const existingLayout = layouts.find(l => l.id === formData.venue.layoutId)
        if (existingLayout) {
          setSelectedLayout(existingLayout)
          if (!formData.venue.availableSections || formData.venue.availableSections.length === 0) {
            handleLayoutChange(formData.venue.layoutId)
          }
        }
      }
    }
  }, [layouts])

  const loadVenues = async () => {
    try {
      const venuesData = await AdminService.getVenues()
      setVenues(venuesData)
    } catch (error) {
      console.error('Error loading venues:', error)
    }
    setLoading(false)
  }

  const loadLayouts = async (venueId: string) => {
    try {
      const layoutsData = await AdminService.getLayoutsByVenueId(venueId)
      setLayouts(layoutsData)
    } catch (error) {
      console.error('Error loading layouts:', error)
    }
  }

  // Filtered and sorted venues based on search query
  const filteredVenues = useMemo(() => {
    if (!searchQuery.trim()) return venues

    return venues
      .map(venue => ({
        ...venue,
        matchScore: Math.max(
          fuzzyMatch(venue.name, searchQuery),
          fuzzyMatch(venue.city || '', searchQuery) * 0.5
        )
      }))
      .filter(v => v.matchScore > 0.2)
      .sort((a, b) => b.matchScore - a.matchScore)
  }, [venues, searchQuery])

  const selectedVenue = venues.find(v => v.id === formData.venue.venueId)

  const handleVenueChange = (venueId: string) => {
    const venue = venues.find(v => v.id === venueId)
    if (venue) {
      setSearchQuery(venue.name)
    }
    updateFormData('venue', {
      venueId,
      layoutId: '',
      availableSections: []
    })
    setSelectedLayout(null)
    setShowDropdown(false)
    if (venueId) {
      loadLayouts(venueId)
    }
  }

  const calculateSectionCapacity = (section: any) => {
    if (section.capacity && typeof section.capacity === 'number') return section.capacity
    if (section.seats && Array.isArray(section.seats)) return section.seats.length
    if (section.rows && Array.isArray(section.rows)) {
      return section.rows.reduce((total: number, row: any) => {
        if (Array.isArray(row.seats)) return total + row.seats.length
        return total + (row.seatCount || row.capacity || 0)
      }, 0)
    }
    return section.totalSeats || section.totalCapacity || 0
  }

  const calculateGACapacity = (level: any) => {
    if (level.type === 'standing') return level.standingCapacity || level.capacity || 0
    if (level.type === 'seated') return level.seatedCapacity || level.capacity || 0
    if (level.type === 'mixed') {
      if (level.capacity) return level.capacity
      return (level.standingCapacity || 0) + (level.seatedCapacity || 0) || level.capacity || 0
    }
    return level.capacity || 0
  }

  const handleLayoutChange = (layoutId: string) => {
    const layout = layouts.find(l => l.id === layoutId)
    if (layout) {
      setSelectedLayout(layout)
      const isSeatingChart = layout.type === 'seating_chart'
      let availableSections = []
      let totalCalculatedCapacity = 0

      if (isSeatingChart && layout.sections) {
        availableSections = layout.sections.map((section: any) => {
          const capacity = calculateSectionCapacity(section)
          totalCalculatedCapacity += capacity
          const priceCategoryId = section.pricing || section.priceCategory || section.priceCategoryId || 'standard'
          const priceCategory = layout.priceCategories?.find((cat: any) => cat.id === priceCategoryId) || null

          return {
            sectionId: section.id,
            sectionName: section.name || section.label || `Section ${section.id}`,
            available: true,
            capacity,
            priceCategoryId,
            priceCategory,
            rows: section.rows || [],
            seats: section.seats || []
          }
        })
      } else if (layout.gaLevels) {
        availableSections = layout.gaLevels.map((level: any) => {
          const capacity = calculateGACapacity(level)
          totalCalculatedCapacity += capacity
          return {
            sectionId: level.id || level.name,
            sectionName: level.name,
            available: true,
            capacity,
            standingCapacity: level.standingCapacity || 0,
            seatedCapacity: level.seatedCapacity || 0,
            configurationType: level.type || 'mixed'
          }
        })
      }

      updateFormData('venue', {
        layoutId,
        layoutType: layout.type,
        seatingType: isSeatingChart ? 'reserved' : 'general',
        availableSections,
        totalCapacity: layout.totalCapacity || totalCalculatedCapacity,
        priceCategories: layout.priceCategories || [],
        layoutName: layout.name
      })
    }
  }

  const toggleSectionAvailability = (sectionId: string) => {
    const section = formData.venue.availableSections.find((s: any) => s.sectionId === sectionId)
    if (section) {
      const sections = formData.venue.availableSections.map((s: any) =>
        s.sectionId === sectionId ? { ...s, available: !s.available } : s
      )
      updateFormData('venue', { ...formData.venue, availableSections: sections })
    }
  }

  // Venue Wizard Functions
  const toggleAmenity = (amenity: string) => {
    const amenities = venueFormData.amenities.includes(amenity)
      ? venueFormData.amenities.filter(a => a !== amenity)
      : [...venueFormData.amenities, amenity]
    setVenueFormData({ ...venueFormData, amenities })
  }

  const handleVenueImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploadingImages(true)
    try {
      const uploadPromises = files.map(file => StorageService.uploadVenueImage(file, venueFormData.name))
      const urls = await Promise.all(uploadPromises)
      setVenueFormData({ ...venueFormData, images: [...venueFormData.images, ...urls] })
    } catch (error) {
      console.error('Error uploading images:', error)
    }
    setUploadingImages(false)
  }

  const handleCreateVenue = async () => {
    setSavingVenue(true)
    try {
      const venueData = {
        ...venueFormData,
        address: {
          street: venueFormData.streetAddress1,
          city: venueFormData.city,
          state: venueFormData.state,
          zip: venueFormData.zipCode,
          country: 'USA'
        }
      }

      const newVenueId = await AdminService.createVenue(venueData)

      // Reload venues and select the new one
      await loadVenues()
      handleVenueChange(newVenueId)
      setShowVenueWizard(false)
      setVenueWizardStep(1)
      setVenueFormData({
        name: '',
        streetAddress1: '',
        streetAddress2: '',
        city: 'Dallas',
        state: 'TX',
        zipCode: '',
        capacity: 1000,
        type: 'theater',
        amenities: [],
        parkingCapacity: 500,
        contactEmail: '',
        contactPhone: '',
        website: '',
        description: '',
        images: []
      })
    } catch (error) {
      console.error('Error creating venue:', error)
      alert('Error creating venue')
    }
    setSavingVenue(false)
  }

  const totalAvailableCapacity = formData.venue.availableSections
    ?.filter((s: any) => s.available)
    ?.reduce((sum: number, s: any) => sum + (s.capacity || 0), 0) || 0

  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Venue & Layout Selection</h3>

      {/* Venue Search */}
      <div className="mb-6 relative">
        <label className="block text-sm font-medium mb-2">
          Select Venue *
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search venues..."
              className="w-full px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
            />

            {/* Selected venue indicator */}
            {selectedVenue && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-sm">
                ✓ Selected
              </span>
            )}

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                {filteredVenues.length > 0 ? (
                  filteredVenues.map(venue => (
                    <button
                      key={venue.id}
                      onClick={() => handleVenueChange(venue.id)}
                      className={`w-full px-4 py-3 text-left hover:bg-purple-600/20 transition-colors
                        ${venue.id === formData.venue.venueId ? 'bg-purple-600/30' : ''}`}
                    >
                      <div className="font-medium">{venue.name}</div>
                      <div className="text-xs text-gray-400">
                        {venue.city}, {venue.state} • Capacity: {venue.capacity}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-gray-400 text-sm">
                    No venues found matching "{searchQuery}"
                  </div>
                )}

                {/* Create New Venue Option */}
                <button
                  onClick={() => {
                    setVenueFormData({ ...venueFormData, name: searchQuery })
                    setShowVenueWizard(true)
                    setShowDropdown(false)
                  }}
                  className="w-full px-4 py-3 text-left bg-purple-600/20 hover:bg-purple-600/30 border-t border-gray-700"
                >
                  <div className="font-medium text-purple-400">+ Create New Venue</div>
                  {searchQuery && (
                    <div className="text-xs text-gray-400">
                      Create "{searchQuery}" as a new venue
                    </div>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Create New Button */}
          <button
            onClick={() => {
              setShowVenueWizard(true)
              setShowDropdown(false)
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm whitespace-nowrap"
          >
            + New Venue
          </button>
        </div>

        {/* Click outside to close dropdown */}
        {showDropdown && (
          <div
            className="fixed inset-0 z-0"
            onClick={() => setShowDropdown(false)}
          />
        )}
      </div>

      {/* Layout Selection */}
      {formData.venue.venueId && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Select Layout *
          </label>
          {layouts.length > 0 ? (
            <select
              value={formData.venue.layoutId}
              onChange={(e) => handleLayoutChange(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
              required
            >
              <option value="">Select a layout</option>
              {layouts.map(layout => (
                <option key={layout.id} value={layout.id}>
                  {layout.name} - {layout.type === 'seating_chart' ? 'Assigned Seating' : 'GA'} - Capacity: {layout.totalCapacity || layout.capacity || 'N/A'}
                </option>
              ))}
            </select>
          ) : (
            <div className="p-4 bg-yellow-600/20 rounded-lg">
              <p className="text-yellow-400 text-sm mb-2">No layouts available for this venue</p>
              <p className="text-gray-400 text-xs">
                Go to Venues Management to create a layout for this venue, or select a different venue.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Layout Details */}
      {selectedLayout && formData.venue.availableSections && (
        <>
          <div className="mb-6 p-4 bg-purple-600/20 rounded-lg">
            <p className="text-sm text-gray-300">
              <span className="font-semibold">Layout Type:</span> {
                selectedLayout.type === 'seating_chart'
                  ? 'Assigned Seating (Reserved seats with price categories)'
                  : 'General Admission (First come, first served)'
              }
            </p>
            {selectedLayout.priceCategories && selectedLayout.priceCategories.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-semibold text-gray-300">Price Categories:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedLayout.priceCategories.map((cat: any) => (
                    <span
                      key={cat.id}
                      className="px-2 py-1 rounded text-xs"
                      style={{ backgroundColor: cat.color + '40', borderColor: cat.color, borderWidth: 1, borderStyle: 'solid' }}
                    >
                      {cat.name}: ${cat.price}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h4 className="font-semibold mb-3">
              {selectedLayout.type === 'seating_chart' ? 'Sections' : 'Levels'} Configuration
            </h4>

            <div className="space-y-3">
              {formData.venue.availableSections.map((section: any) => (
                <div
                  key={section.sectionId}
                  className={`p-4 rounded-lg border transition-all ${
                    section.available
                      ? 'bg-purple-600/20 border-purple-600'
                      : 'bg-gray-800 border-gray-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={section.available}
                        onChange={() => toggleSectionAvailability(section.sectionId)}
                        className="w-5 h-5 accent-purple-600"
                      />
                      <div>
                        <p className="font-semibold">{section.sectionName}</p>
                        <div className="text-sm text-gray-400 mt-1">
                          {selectedLayout.type === 'seating_chart' ? (
                            <>
                              Capacity: {section.capacity} seats
                              {section.priceCategory && (
                                <span
                                  className="ml-2 px-2 py-0.5 rounded text-xs"
                                  style={{
                                    backgroundColor: section.priceCategory.color + '40',
                                    borderColor: section.priceCategory.color,
                                    borderWidth: 1,
                                    borderStyle: 'solid'
                                  }}
                                >
                                  {section.priceCategory.name}: ${section.priceCategory.price}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              Total Capacity: {section.capacity}
                              {section.configurationType && ` • ${section.configurationType}`}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-purple-600/30 rounded-lg text-center">
              <p className="font-semibold">
                Total Available Capacity: {totalAvailableCapacity} {
                  selectedLayout.type === 'seating_chart' ? 'seats' : 'attendees'
                }
              </p>
            </div>
          </div>
        </>
      )}

      {/* Venue Creation Sub-Wizard Modal */}
      {showVenueWizard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-2xl my-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Create New Venue</h2>
              <button
                onClick={() => {
                  setShowVenueWizard(false)
                  setVenueWizardStep(1)
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex justify-between mb-6">
              {['Basic Info', 'Location', 'Features', 'Images'].map((step, idx) => (
                <div
                  key={idx}
                  className={`flex-1 text-center ${idx + 1 <= venueWizardStep ? 'text-purple-400' : 'text-gray-600'}`}
                >
                  <div className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center text-sm ${
                    idx + 1 <= venueWizardStep ? 'bg-purple-600' : 'bg-gray-700'
                  }`}>
                    {idx + 1}
                  </div>
                  <span className="text-xs">{step}</span>
                </div>
              ))}
            </div>

            {/* Step 1: Basic Info */}
            {venueWizardStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Venue Name *</label>
                  <input
                    type="text"
                    value={venueFormData.name}
                    onChange={(e) => setVenueFormData({ ...venueFormData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    placeholder="Enter venue name"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">Description</label>
                  <textarea
                    value={venueFormData.description}
                    onChange={(e) => setVenueFormData({ ...venueFormData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 rounded-lg h-24"
                    placeholder="Enter venue description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Venue Type</label>
                    <select
                      value={venueFormData.type}
                      onChange={(e) => setVenueFormData({ ...venueFormData, type: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
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
                    <label className="block text-sm mb-2">Capacity</label>
                    <input
                      type="number"
                      value={venueFormData.capacity}
                      onChange={(e) => setVenueFormData({ ...venueFormData, capacity: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="1000"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setVenueWizardStep(2)}
                    disabled={!venueFormData.name.trim()}
                    className="px-6 py-2 bg-purple-600 rounded-lg disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {venueWizardStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Street Address *</label>
                  <input
                    type="text"
                    value={venueFormData.streetAddress1}
                    onChange={(e) => setVenueFormData({ ...venueFormData, streetAddress1: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-2">City *</label>
                    <input
                      type="text"
                      value={venueFormData.city}
                      onChange={(e) => setVenueFormData({ ...venueFormData, city: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2">State *</label>
                    <input
                      type="text"
                      value={venueFormData.state}
                      onChange={(e) => setVenueFormData({ ...venueFormData, state: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2">ZIP Code</label>
                    <input
                      type="text"
                      value={venueFormData.zipCode}
                      onChange={(e) => setVenueFormData({ ...venueFormData, zipCode: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Contact Email</label>
                    <input
                      type="email"
                      value={venueFormData.contactEmail}
                      onChange={(e) => setVenueFormData({ ...venueFormData, contactEmail: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="venue@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Contact Phone</label>
                    <input
                      type="tel"
                      value={venueFormData.contactPhone}
                      onChange={(e) => setVenueFormData({ ...venueFormData, contactPhone: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setVenueWizardStep(1)}
                    className="px-6 py-2 bg-gray-700 rounded-lg"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setVenueWizardStep(3)}
                    className="px-6 py-2 bg-purple-600 rounded-lg"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Features */}
            {venueWizardStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Parking Capacity</label>
                  <input
                    type="number"
                    value={venueFormData.parkingCapacity}
                    onChange={(e) => setVenueFormData({ ...venueFormData, parkingCapacity: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    placeholder="500"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">Website</label>
                  <input
                    type="url"
                    value={venueFormData.website}
                    onChange={(e) => setVenueFormData({ ...venueFormData, website: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    placeholder="https://venue-website.com"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-3">Amenities</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      'Parking', 'WiFi', 'Wheelchair Accessible',
                      'Food Service', 'Bar', 'VIP Boxes',
                      'Coat Check', 'ATM', 'Merchandise Shop'
                    ].map(amenity => (
                      <label key={amenity} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={venueFormData.amenities.includes(amenity)}
                          onChange={() => toggleAmenity(amenity)}
                          className="rounded"
                        />
                        <span>{amenity}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setVenueWizardStep(2)}
                    className="px-6 py-2 bg-gray-700 rounded-lg"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setVenueWizardStep(4)}
                    className="px-6 py-2 bg-purple-600 rounded-lg"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Images & Create */}
            {venueWizardStep === 4 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Venue Images (Optional)</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleVenueImageUpload}
                    className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    disabled={uploadingImages}
                  />
                  {uploadingImages && (
                    <p className="text-xs text-purple-400 mt-2">Uploading images...</p>
                  )}
                </div>

                {venueFormData.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {venueFormData.images.map((url, index) => (
                      <div key={index} className="relative">
                        <img src={url} alt="" className="w-full h-20 object-cover rounded" />
                        <button
                          onClick={() => {
                            const newImages = venueFormData.images.filter((_, i) => i !== index)
                            setVenueFormData({ ...venueFormData, images: newImages })
                          }}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-600 rounded-full text-white text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Summary */}
                <div className="p-4 bg-purple-600/20 rounded-lg">
                  <h4 className="font-semibold mb-2">Venue Summary</h4>
                  <div className="text-sm text-gray-300 space-y-1">
                    <p><strong>Name:</strong> {venueFormData.name}</p>
                    <p><strong>Type:</strong> {venueFormData.type}</p>
                    <p><strong>Capacity:</strong> {venueFormData.capacity}</p>
                    <p><strong>Location:</strong> {venueFormData.city}, {venueFormData.state}</p>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setVenueWizardStep(3)}
                    className="px-6 py-2 bg-gray-700 rounded-lg"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCreateVenue}
                    disabled={savingVenue || !venueFormData.name.trim()}
                    className="px-6 py-2 bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {savingVenue ? 'Creating...' : 'Create Venue'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
