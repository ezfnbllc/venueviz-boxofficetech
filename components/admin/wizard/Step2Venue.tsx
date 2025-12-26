'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
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

// Venue suggestion type from autocomplete API
interface VenueSuggestion {
  placeId: string
  name: string
  address: string
  fullDescription: string
  types: string[]
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

interface LayoutWizardFormData {
  name: string
  type: 'seating_chart' | 'general_admission'
  gaLevels: Array<{
    id: string
    name: string
    capacity: number
    type: 'standing' | 'seated' | 'mixed'
    price: number
  }>
  sections: Array<{
    id: string
    name: string
    rows: number
    seatsPerRow: number
    price: number
  }>
  priceCategories: Array<{
    id: string
    name: string
    price: number
    color: string
  }>
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
  const [lookingUpVenue, setLookingUpVenue] = useState(false)
  const [lookupMessage, setLookupMessage] = useState('')

  // Venue autocomplete state
  const [venueNameQuery, setVenueNameQuery] = useState('')
  const [venueSuggestions, setVenueSuggestions] = useState<VenueSuggestion[]>([])
  const [showVenueSuggestions, setShowVenueSuggestions] = useState(false)
  const [loadingVenueSuggestions, setLoadingVenueSuggestions] = useState(false)
  const venueAutocompleteRef = useRef<HTMLDivElement>(null)
  const venueDebounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Create layout sub-wizard state
  const [showLayoutWizard, setShowLayoutWizard] = useState(false)
  const [layoutWizardStep, setLayoutWizardStep] = useState(1)
  const [layoutFormData, setLayoutFormData] = useState<LayoutWizardFormData>({
    name: '',
    type: 'general_admission',
    gaLevels: [
      { id: 'ga-1', name: 'General Admission', capacity: 500, type: 'standing', price: 50 }
    ],
    sections: [
      { id: 'sec-1', name: 'Section A', rows: 10, seatsPerRow: 20, price: 75 }
    ],
    priceCategories: [
      { id: 'cat-1', name: 'Standard', price: 50, color: '#8B5CF6' }
    ]
  })
  const [savingLayout, setSavingLayout] = useState(false)

  // Confirmation dialogs for auto-create
  const [pendingVenueCreate, setPendingVenueCreate] = useState<any>(null)
  const [pendingLayoutCreate, setPendingLayoutCreate] = useState<{ venueId: string; ticketLevels: any[] } | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const initializedRef = useRef(false)

  // For portal mounting (SSR compatibility)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    loadVenues()
  }, [])

  // Auto-populate search query from existing venue (when editing) or scraped venue data
  // Also auto-create venue and layout if scraped data is available
  useEffect(() => {
    if (initializedRef.current) return
    if (venues.length === 0) return

    // First check if we're editing an existing event with a venue already selected
    if (formData.venue.venueId) {
      const existingVenue = venues.find(v => v.id === formData.venue.venueId)
      if (existingVenue) {
        initializedRef.current = true
        setSearchQuery(existingVenue.name)
        return
      }
    }

    // Otherwise check for scraped venue data (new event from URL scraping)
    const scrapedVenue = (formData.basics as any)?.scrapedVenue
    if (scrapedVenue?.name || scrapedVenue?.city) {
      initializedRef.current = true
      setSearchQuery(scrapedVenue.name || '')

      // Try to find a matching venue (fuzzy match on name OR city match)
      let matchedVenue = null
      if (scrapedVenue.name) {
        matchedVenue = venues.find(v => fuzzyMatch(v.name, scrapedVenue.name) > 0.7)
      }
      // If no name match, try city + type matching
      if (!matchedVenue && scrapedVenue.city) {
        matchedVenue = venues.find(v =>
          v.city?.toLowerCase() === scrapedVenue.city?.toLowerCase() &&
          fuzzyMatch(v.name, scrapedVenue.name || scrapedVenue.city) > 0.4
        )
      }

      if (matchedVenue) {
        // Found a match - select it
        handleVenueChange(matchedVenue.id)

        // Also check for scraped ticket levels to offer layout creation
        const scrapedTicketLevels = (formData.basics as any)?.scrapedTicketLevels
        if (scrapedTicketLevels && scrapedTicketLevels.length > 0) {
          // Show layout creation confirmation after a brief delay for venue to load
          setTimeout(() => {
            setPendingLayoutCreate({ venueId: matchedVenue.id, ticketLevels: scrapedTicketLevels })
          }, 800)
        }
      } else if (scrapedVenue.name) {
        // No match found - show confirmation dialog before creating
        setPendingVenueCreate(scrapedVenue)
      }
    }
  }, [venues, formData.basics, formData.venue.venueId])

  // Confirm and create venue from scraped data
  const confirmCreateVenue = async () => {
    if (!pendingVenueCreate) return

    try {
      console.log('Creating venue from scraped data:', pendingVenueCreate)

      const venueData = {
        name: pendingVenueCreate.name || `${pendingVenueCreate.city || 'Event'} Venue`,
        streetAddress1: pendingVenueCreate.address || '',
        streetAddress2: '',
        city: pendingVenueCreate.city || 'Dallas',
        state: pendingVenueCreate.state || 'TX',
        zipCode: '',
        capacity: 5000,
        type: 'convention_center',
        amenities: ['Parking', 'Wheelchair Accessible'],
        parkingCapacity: 500,
        contactEmail: '',
        contactPhone: '',
        website: '',
        description: `Venue for events in ${pendingVenueCreate.city || 'the area'}`,
        images: [],
        address: {
          street: pendingVenueCreate.address || '',
          city: pendingVenueCreate.city || 'Dallas',
          state: pendingVenueCreate.state || 'TX',
          zip: '',
          country: 'USA'
        }
      }

      const newVenueId = await AdminService.createVenue(venueData)
      console.log('Created venue with ID:', newVenueId)

      // Reload venues and select the new one
      const updatedVenues = await AdminService.getVenues()
      setVenues(updatedVenues)

      // Select the new venue
      handleVenueChange(newVenueId)

      // Check if we have scraped ticket levels - show layout confirmation
      const scrapedTicketLevels = (formData.basics as any)?.scrapedTicketLevels
      if (scrapedTicketLevels && scrapedTicketLevels.length > 0) {
        // Show layout creation confirmation after a brief delay
        setTimeout(() => {
          setPendingLayoutCreate({ venueId: newVenueId, ticketLevels: scrapedTicketLevels })
        }, 500)
      }

      setPendingVenueCreate(null)
    } catch (error) {
      console.error('Error creating venue:', error)
      alert('Failed to create venue. Please try again.')
    }
  }

  // Decline venue creation - user will create manually
  const declineCreateVenue = () => {
    setPendingVenueCreate(null)
  }

  // Confirm and create GA layout from scraped ticket levels
  const confirmCreateLayout = async () => {
    if (!pendingLayoutCreate) return

    try {
      const { venueId, ticketLevels } = pendingLayoutCreate
      console.log('Creating layout from ticket levels:', ticketLevels)

      let totalCapacity = 0
      const gaLevels = ticketLevels.map((ticket, idx) => {
        const capacity = ticket.capacity || 500
        totalCapacity += capacity
        return {
          id: `ga-auto-${idx + 1}`,
          name: ticket.level || ticket.name || `Level ${idx + 1}`,
          capacity,
          type: 'standing',
          standingCapacity: capacity,
          seatedCapacity: 0
        }
      })

      const priceCategories = ticketLevels.map((ticket, idx) => ({
        id: `cat-auto-${idx + 1}`,
        name: ticket.level || ticket.name || `Level ${idx + 1}`,
        price: ticket.price || 50,
        color: ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'][idx % 5]
      }))

      const layoutData = {
        venueId,
        name: 'General Admission',
        type: 'general_admission',
        gaLevels,
        priceCategories,
        totalCapacity
      }

      const newLayoutId = await AdminService.createLayout(layoutData)
      console.log('Created layout with ID:', newLayoutId)

      // Reload layouts and select the new one
      await loadLayouts(venueId)
      handleLayoutChange(newLayoutId)

      setPendingLayoutCreate(null)
    } catch (error) {
      console.error('Error creating layout:', error)
      alert('Failed to create layout. Please try again.')
    }
  }

  // Decline layout creation - user will create manually
  const declineCreateLayout = () => {
    setPendingLayoutCreate(null)
  }

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
      venueName: venue?.name || '',
      venueCity: venue?.city || '',
      venueState: venue?.state || '',
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

  // AI-powered venue lookup to auto-fill address and details
  const handleLookupVenue = async () => {
    if (!venueFormData.name.trim()) {
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
          venueName: venueFormData.name,
          city: venueFormData.city || undefined,
          state: venueFormData.state || undefined
        })
      })

      const data = await response.json()

      if (data.success && data.venue) {
        const venue = data.venue

        // Update form with AI-found details
        setVenueFormData(prev => ({
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

  // Close venue autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (venueAutocompleteRef.current && !venueAutocompleteRef.current.contains(event.target as Node)) {
        setShowVenueSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch venue autocomplete suggestions
  const fetchVenueSuggestions = async (query: string) => {
    if (query.length < 3) {
      setVenueSuggestions([])
      setShowVenueSuggestions(false)
      return
    }

    setLoadingVenueSuggestions(true)
    try {
      const response = await fetch(`/api/venue-autocomplete?query=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (data.success && data.suggestions) {
        setVenueSuggestions(data.suggestions)
        setShowVenueSuggestions(data.suggestions.length > 0)
      }
    } catch (error) {
      console.error('Venue autocomplete error:', error)
    }
    setLoadingVenueSuggestions(false)
  }

  // Handle venue name input change with debounce
  const handleVenueNameQueryChange = (value: string) => {
    setVenueNameQuery(value)
    setVenueFormData({ ...venueFormData, name: value })

    // Clear previous timer
    if (venueDebounceTimerRef.current) {
      clearTimeout(venueDebounceTimerRef.current)
    }

    // Debounce API call
    venueDebounceTimerRef.current = setTimeout(() => {
      fetchVenueSuggestions(value)
    }, 300)
  }

  // Handle selecting a venue from suggestions
  const handleSelectVenueSuggestion = async (suggestion: VenueSuggestion) => {
    setShowVenueSuggestions(false)
    setVenueNameQuery(suggestion.name)
    setVenueFormData({ ...venueFormData, name: suggestion.name })
    setLookingUpVenue(true)
    setLookupMessage('Fetching venue details...')

    try {
      const response = await fetch(`/api/venue-details?placeId=${encodeURIComponent(suggestion.placeId)}`)
      const data = await response.json()

      if (data.success && data.venue) {
        const venue = data.venue

        // Update form with all venue details
        setVenueFormData(prev => ({
          ...prev,
          name: venue.name || prev.name,
          streetAddress1: venue.streetAddress1 || prev.streetAddress1,
          city: venue.city || prev.city,
          state: venue.state || prev.state,
          zipCode: venue.zipCode || prev.zipCode,
          capacity: venue.capacity || prev.capacity,
          type: venue.type || prev.type,
          contactPhone: venue.contactPhone || prev.contactPhone,
          website: venue.website || prev.website,
          description: venue.description || prev.description,
          amenities: venue.amenities || prev.amenities,
          images: venue.images?.length ? venue.images : prev.images
        }))

        setLookupMessage(`✓ Found "${venue.name}" - All details loaded!`)
        setTimeout(() => setLookupMessage(''), 5000)
      } else {
        setLookupMessage('Could not fetch venue details. You can enter them manually.')
        setTimeout(() => setLookupMessage(''), 5000)
      }
    } catch (error) {
      console.error('Venue details error:', error)
      setLookupMessage('Error fetching venue details.')
      setTimeout(() => setLookupMessage(''), 5000)
    }

    setLookingUpVenue(false)
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

  // Layout wizard helper functions
  const addGALevel = () => {
    const newId = `ga-${Date.now()}`
    setLayoutFormData({
      ...layoutFormData,
      gaLevels: [...layoutFormData.gaLevels, {
        id: newId,
        name: `Level ${layoutFormData.gaLevels.length + 1}`,
        capacity: 100,
        type: 'standing',
        price: 50
      }]
    })
  }

  const removeGALevel = (id: string) => {
    if (layoutFormData.gaLevels.length > 1) {
      setLayoutFormData({
        ...layoutFormData,
        gaLevels: layoutFormData.gaLevels.filter(l => l.id !== id)
      })
    }
  }

  const updateGALevel = (id: string, field: string, value: any) => {
    setLayoutFormData({
      ...layoutFormData,
      gaLevels: layoutFormData.gaLevels.map(l =>
        l.id === id ? { ...l, [field]: value } : l
      )
    })
  }

  const addSection = () => {
    const newId = `sec-${Date.now()}`
    setLayoutFormData({
      ...layoutFormData,
      sections: [...layoutFormData.sections, {
        id: newId,
        name: `Section ${String.fromCharCode(65 + layoutFormData.sections.length)}`,
        rows: 10,
        seatsPerRow: 20,
        price: 75
      }]
    })
  }

  const removeSection = (id: string) => {
    if (layoutFormData.sections.length > 1) {
      setLayoutFormData({
        ...layoutFormData,
        sections: layoutFormData.sections.filter(s => s.id !== id)
      })
    }
  }

  const updateSection = (id: string, field: string, value: any) => {
    setLayoutFormData({
      ...layoutFormData,
      sections: layoutFormData.sections.map(s =>
        s.id === id ? { ...s, [field]: value } : s
      )
    })
  }

  const handleCreateLayout = async () => {
    if (!formData.venue.venueId) {
      alert('Please select a venue first')
      return
    }

    setSavingLayout(true)
    try {
      let totalCapacity = 0
      let layoutData: any = {
        venueId: formData.venue.venueId,
        name: layoutFormData.name || 'Default Layout',
        type: layoutFormData.type,
        priceCategories: layoutFormData.priceCategories
      }

      if (layoutFormData.type === 'general_admission') {
        // Build GA levels
        const gaLevels = layoutFormData.gaLevels.map(level => {
          totalCapacity += level.capacity
          return {
            id: level.id,
            name: level.name,
            capacity: level.capacity,
            type: level.type,
            standingCapacity: level.type === 'standing' ? level.capacity : 0,
            seatedCapacity: level.type === 'seated' ? level.capacity : 0
          }
        })
        layoutData.gaLevels = gaLevels

        // Update price categories based on GA levels
        layoutData.priceCategories = layoutFormData.gaLevels.map((level, idx) => ({
          id: `cat-${level.id}`,
          name: level.name,
          price: level.price,
          color: ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'][idx % 5]
        }))
      } else {
        // Build seating chart sections
        const sections = layoutFormData.sections.map(section => {
          const sectionCapacity = section.rows * section.seatsPerRow
          totalCapacity += sectionCapacity
          return {
            id: section.id,
            name: section.name,
            capacity: sectionCapacity,
            rows: Array.from({ length: section.rows }, (_, rowIdx) => ({
              id: `${section.id}-row-${rowIdx + 1}`,
              label: `Row ${rowIdx + 1}`,
              seatCount: section.seatsPerRow
            }))
          }
        })
        layoutData.sections = sections

        // Update price categories based on sections
        layoutData.priceCategories = layoutFormData.sections.map((section, idx) => ({
          id: `cat-${section.id}`,
          name: section.name,
          price: section.price,
          color: ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'][idx % 5]
        }))
      }

      layoutData.totalCapacity = totalCapacity

      const newLayoutId = await AdminService.createLayout(layoutData)

      // Reload layouts and select the new one
      await loadLayouts(formData.venue.venueId)
      handleLayoutChange(newLayoutId)
      setShowLayoutWizard(false)
      setLayoutWizardStep(1)
      setLayoutFormData({
        name: '',
        type: 'general_admission',
        gaLevels: [{ id: 'ga-1', name: 'General Admission', capacity: 500, type: 'standing', price: 50 }],
        sections: [{ id: 'sec-1', name: 'Section A', rows: 10, seatsPerRow: 20, price: 75 }],
        priceCategories: [{ id: 'cat-1', name: 'Standard', price: 50, color: '#8B5CF6' }]
      })
    } catch (error) {
      console.error('Error creating layout:', error)
      alert('Error creating layout')
    }
    setSavingLayout(false)
  }

  const totalAvailableCapacity = formData.venue.availableSections
    ?.filter((s: any) => s.available)
    ?.reduce((sum: number, s: any) => sum + (s.capacity || 0), 0) || 0

  return (
    <div>
      <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Venue & Layout Selection</h3>

      {/* Venue Search */}
      <div className="mb-6 relative">
        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
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
              className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg focus:bg-white dark:focus:bg-slate-700 outline-none text-slate-900 dark:text-white"
            />

            {/* Selected venue indicator */}
            {selectedVenue && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-sm">
                ✓ Selected
              </span>
            )}

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                {filteredVenues.length > 0 ? (
                  filteredVenues.map(venue => (
                    <button
                      key={venue.id}
                      onClick={() => handleVenueChange(venue.id)}
                      className={`w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-600/20 transition-colors
                        ${venue.id === formData.venue.venueId ? 'bg-blue-100 dark:bg-blue-600/30' : ''}`}
                    >
                      <div className="font-medium text-slate-900 dark:text-white">{venue.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {venue.city}, {venue.state} • Capacity: {venue.capacity}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm">
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
                  className="w-full px-4 py-3 text-left bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/30 border-t border-slate-200 dark:border-slate-700"
                >
                  <div className="font-medium text-blue-600 dark:text-blue-400">+ Create New Venue</div>
                  {searchQuery && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
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
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm whitespace-nowrap text-white"
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
          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
            Select Layout *
          </label>
          {layouts.length > 0 ? (
            <select
              value={formData.venue.layoutId}
              onChange={(e) => handleLayoutChange(e.target.value)}
              className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg focus:bg-white dark:focus:bg-slate-700 outline-none text-slate-900 dark:text-white"
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
            <div className="p-4 bg-amber-50 dark:bg-yellow-600/20 border border-amber-200 dark:border-yellow-600/30 rounded-lg">
              <p className="text-amber-700 dark:text-yellow-400 text-sm mb-2">No layouts available for this venue</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">
                Create a layout to define seating sections or general admission areas for this venue.
              </p>
              <button
                onClick={() => setShowLayoutWizard(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              >
                + Create Layout
              </button>
            </div>
          )}
        </div>
      )}

      {/* Layout Details */}
      {selectedLayout && formData.venue.availableSections && (
        <>
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-600/20 rounded-lg">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              <span className="font-semibold">Layout Type:</span> {
                selectedLayout.type === 'seating_chart'
                  ? 'Assigned Seating (Reserved seats with price categories)'
                  : 'General Admission (First come, first served)'
              }
            </p>
            {selectedLayout.priceCategories && selectedLayout.priceCategories.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Price Categories:</p>
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
                      ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-600'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60'
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
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
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

            <div className="mt-4 p-3 bg-blue-600/30 rounded-lg text-center">
              <p className="font-semibold">
                Total Available Capacity: {totalAvailableCapacity} {
                  selectedLayout.type === 'seating_chart' ? 'seats' : 'attendees'
                }
              </p>
            </div>
          </div>
        </>
      )}

      {/* Venue Creation Confirmation Dialog */}
      {mounted && pendingVenueCreate && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <span className="text-2xl">🏢</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create New Venue?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">We found venue info from your import</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg mb-4 space-y-2">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Venue Name</span>
                <p className="font-medium text-slate-900 dark:text-white">{pendingVenueCreate.name || 'Not specified'}</p>
              </div>
              {pendingVenueCreate.address && (
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Address</span>
                  <p className="text-slate-700 dark:text-slate-300">{pendingVenueCreate.address}</p>
                </div>
              )}
              <div className="flex gap-4">
                {pendingVenueCreate.city && (
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">City</span>
                    <p className="text-slate-700 dark:text-slate-300">{pendingVenueCreate.city}</p>
                  </div>
                )}
                {pendingVenueCreate.state && (
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">State</span>
                    <p className="text-slate-700 dark:text-slate-300">{pendingVenueCreate.state}</p>
                  </div>
                )}
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Would you like to create this venue automatically? You can also create it manually using the "+ New Venue" button.
            </p>

            <div className="flex gap-3">
              <button
                onClick={declineCreateVenue}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
              >
                No, I'll Do It Manually
              </button>
              <button
                onClick={confirmCreateVenue}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Yes, Create Venue
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Layout Creation Confirmation Dialog - Editable */}
      {mounted && pendingLayoutCreate && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-8 z-[9999] overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto my-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="text-2xl">🎫</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create GA Layout</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Review and edit ticket levels before creating</p>
                </div>
              </div>
              <button
                onClick={declineCreateLayout}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg mb-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Ticket Levels</p>
                <button
                  onClick={() => {
                    setPendingLayoutCreate({
                      ...pendingLayoutCreate,
                      ticketLevels: [
                        ...pendingLayoutCreate.ticketLevels,
                        { level: 'New Level', price: 50, capacity: 500 }
                      ]
                    })
                  }}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700"
                >
                  + Add Level
                </button>
              </div>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {pendingLayoutCreate.ticketLevels.map((ticket, idx) => (
                  <div key={idx} className="p-3 bg-white dark:bg-slate-700 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Level {idx + 1}</span>
                      {pendingLayoutCreate.ticketLevels.length > 1 && (
                        <button
                          onClick={() => {
                            setPendingLayoutCreate({
                              ...pendingLayoutCreate,
                              ticketLevels: pendingLayoutCreate.ticketLevels.filter((_, i) => i !== idx)
                            })
                          }}
                          className="text-red-400 hover:text-red-500 text-xs"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-5">
                        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Level Name</label>
                        <input
                          type="text"
                          value={ticket.level || ticket.name || ''}
                          onChange={(e) => {
                            const newLevels = [...pendingLayoutCreate.ticketLevels]
                            newLevels[idx] = { ...newLevels[idx], level: e.target.value }
                            setPendingLayoutCreate({ ...pendingLayoutCreate, ticketLevels: newLevels })
                          }}
                          className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded text-sm text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Capacity</label>
                        <input
                          type="number"
                          value={ticket.capacity || 500}
                          onChange={(e) => {
                            const newLevels = [...pendingLayoutCreate.ticketLevels]
                            newLevels[idx] = { ...newLevels[idx], capacity: parseInt(e.target.value) || 0 }
                            setPendingLayoutCreate({ ...pendingLayoutCreate, ticketLevels: newLevels })
                          }}
                          className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded text-sm text-slate-900 dark:text-white"
                          placeholder="500"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Price</label>
                        <div className="flex items-center">
                          <span className="px-2 py-1.5 bg-slate-200 dark:bg-slate-500 border border-r-0 border-slate-200 dark:border-slate-500 rounded-l text-sm text-slate-500 dark:text-slate-300">$</span>
                          <input
                            type="number"
                            value={ticket.price || 0}
                            onChange={(e) => {
                              const newLevels = [...pendingLayoutCreate.ticketLevels]
                              newLevels[idx] = { ...newLevels[idx], price: parseFloat(e.target.value) || 0 }
                              setPendingLayoutCreate({ ...pendingLayoutCreate, ticketLevels: newLevels })
                            }}
                            className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-r text-sm text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Total capacity summary */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Capacity: <span className="font-semibold text-slate-900 dark:text-white">
                    {pendingLayoutCreate.ticketLevels.reduce((sum, t) => sum + (t.capacity || 500), 0)}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={declineCreateLayout}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
              >
                Skip / Do Manually
              </button>
              <button
                onClick={confirmCreateLayout}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Create Layout
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Venue Creation Sub-Wizard Modal - Using Portal to escape parent CSS constraints */}
      {mounted && showVenueWizard && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-8 z-[9999] overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto my-4 shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create New Venue</h2>
              <button
                onClick={() => {
                  setShowVenueWizard(false)
                  setVenueWizardStep(1)
                  // Reset form data
                  setVenueNameQuery('')
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
                    contactEmail: '',
                    contactPhone: '',
                    website: '',
                    description: '',
                    images: []
                  })
                }}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-2xl leading-none"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex justify-between mb-6">
              {['Basic Info', 'Location', 'Features', 'Images'].map((step, idx) => (
                <div
                  key={idx}
                  className={`flex-1 text-center ${idx + 1 <= venueWizardStep ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  <div className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center text-sm ${
                    idx + 1 <= venueWizardStep ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
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
                <div ref={venueAutocompleteRef} className="relative">
                  <label className="block text-sm mb-2">Venue Name *</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={venueNameQuery || venueFormData.name}
                        onChange={(e) => handleVenueNameQueryChange(e.target.value)}
                        onFocus={() => {
                          if (venueNameQuery.length >= 3 && venueSuggestions.length > 0) {
                            setShowVenueSuggestions(true)
                          }
                        }}
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                        placeholder="Start typing venue name..."
                      />
                      {loadingVenueSuggestions && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                      )}

                      {/* Autocomplete Dropdown */}
                      {showVenueSuggestions && venueSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                          {venueSuggestions.map((suggestion, index) => (
                            <button
                              key={suggestion.placeId || index}
                              type="button"
                              onClick={() => handleSelectVenueSuggestion(suggestion)}
                              className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors"
                            >
                              <div className="font-medium text-slate-900 dark:text-white">{suggestion.name}</div>
                              <div className="text-sm text-slate-500 dark:text-slate-400">{suggestion.address}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleLookupVenue}
                      disabled={lookingUpVenue || !venueFormData.name.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 rounded-lg text-sm whitespace-nowrap flex items-center gap-2"
                    >
                      {lookingUpVenue ? (
                        <>
                          <span className="animate-spin">⟳</span>
                          Looking up...
                        </>
                      ) : (
                        <>🔍 Lookup</>
                      )}
                    </button>
                  </div>
                  {lookupMessage && (
                    <p className={`text-xs mt-2 ${lookupMessage.includes('✓') || lookupMessage.includes('Found') ? 'text-green-400' : lookupMessage.includes('Error') || lookupMessage.includes('not find') || lookupMessage.includes('Could not') ? 'text-yellow-400' : 'text-blue-400'}`}>
                      {lookupMessage}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Type 3+ characters to see suggestions. Select a venue to auto-fill all details including address, phone, website, and photos.
                  </p>
                </div>

                <div>
                  <label className="block text-sm mb-2">Description</label>
                  <textarea
                    value={venueFormData.description}
                    onChange={(e) => setVenueFormData({ ...venueFormData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white h-24"
                    placeholder="Enter venue description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Venue Type</label>
                    <select
                      value={venueFormData.type}
                      onChange={(e) => setVenueFormData({ ...venueFormData, type: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
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
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                      placeholder="1000"
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => {
                      setShowVenueWizard(false)
                      setVenueWizardStep(1)
                      setVenueNameQuery('')
                    }}
                    className="px-6 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setVenueWizardStep(2)}
                    disabled={!venueFormData.name.trim()}
                    className="px-6 py-2 bg-blue-600 rounded-lg disabled:opacity-50"
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
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
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
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2">State *</label>
                    <input
                      type="text"
                      value={venueFormData.state}
                      onChange={(e) => setVenueFormData({ ...venueFormData, state: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2">ZIP Code</label>
                    <input
                      type="text"
                      value={venueFormData.zipCode}
                      onChange={(e) => setVenueFormData({ ...venueFormData, zipCode: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
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
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                      placeholder="venue@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Contact Phone</label>
                    <input
                      type="tel"
                      value={venueFormData.contactPhone}
                      onChange={(e) => setVenueFormData({ ...venueFormData, contactPhone: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setVenueWizardStep(1)}
                    className="px-6 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setVenueWizardStep(3)}
                    className="px-6 py-2 bg-blue-600 rounded-lg"
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
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                    placeholder="500"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">Website</label>
                  <input
                    type="url"
                    value={venueFormData.website}
                    onChange={(e) => setVenueFormData({ ...venueFormData, website: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
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
                    className="px-6 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setVenueWizardStep(4)}
                    className="px-6 py-2 bg-blue-600 rounded-lg"
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
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                    disabled={uploadingImages}
                  />
                  {uploadingImages && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">Uploading images...</p>
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
                <div className="p-4 bg-blue-50 dark:bg-blue-600/20 rounded-lg">
                  <h4 className="font-semibold mb-2">Venue Summary</h4>
                  <div className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                    <p><strong>Name:</strong> {venueFormData.name}</p>
                    <p><strong>Type:</strong> {venueFormData.type}</p>
                    <p><strong>Capacity:</strong> {venueFormData.capacity}</p>
                    <p><strong>Location:</strong> {venueFormData.city}, {venueFormData.state}</p>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setVenueWizardStep(3)}
                    className="px-6 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
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
        </div>,
        document.body
      )}

      {/* Layout Creation Sub-Wizard Modal - Using Portal to escape parent CSS constraints */}
      {mounted && showLayoutWizard && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-8 z-[9999] overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto my-4 shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create New Layout</h2>
              <button
                onClick={() => {
                  setShowLayoutWizard(false)
                  setLayoutWizardStep(1)
                }}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-2xl leading-none"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex justify-between mb-6">
              {['Layout Type', 'Configure', 'Review'].map((step, idx) => (
                <div
                  key={idx}
                  className={`flex-1 text-center ${idx + 1 <= layoutWizardStep ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  <div className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center text-sm ${
                    idx + 1 <= layoutWizardStep ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`}>
                    {idx + 1}
                  </div>
                  <span className="text-xs">{step}</span>
                </div>
              ))}
            </div>

            {/* Step 1: Layout Type */}
            {layoutWizardStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Layout Name *</label>
                  <input
                    type="text"
                    value={layoutFormData.name}
                    onChange={(e) => setLayoutFormData({ ...layoutFormData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                    placeholder="e.g., Main Hall, Concert Setup"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-3">Layout Type *</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setLayoutFormData({ ...layoutFormData, type: 'general_admission' })}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        layoutFormData.type === 'general_admission'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="text-2xl mb-2">🎫</div>
                      <div className="font-semibold">General Admission</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        First come, first served. Define capacity levels/areas.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLayoutFormData({ ...layoutFormData, type: 'seating_chart' })}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        layoutFormData.type === 'seating_chart'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="text-2xl mb-2">💺</div>
                      <div className="font-semibold">Assigned Seating</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Reserved seats with sections, rows, and seat numbers.
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => {
                      setShowLayoutWizard(false)
                      setLayoutWizardStep(1)
                    }}
                    className="px-6 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setLayoutWizardStep(2)}
                    disabled={!layoutFormData.name.trim()}
                    className="px-6 py-2 bg-blue-600 rounded-lg disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Configure */}
            {layoutWizardStep === 2 && (
              <div className="space-y-4">
                {layoutFormData.type === 'general_admission' ? (
                  <>
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">GA Levels / Areas</label>
                      <button
                        type="button"
                        onClick={addGALevel}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-purple-300"
                      >
                        + Add Level
                      </button>
                    </div>

                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {layoutFormData.gaLevels.map((level, idx) => (
                        <div key={level.id} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Level {idx + 1}</span>
                            {layoutFormData.gaLevels.length > 1 && (
                              <button
                                onClick={() => removeGALevel(level.id)}
                                className="text-red-400 hover:text-red-300 text-xs"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Level Name</label>
                              <input
                                type="text"
                                value={level.name}
                                onChange={(e) => updateGALevel(level.id, 'name', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm text-slate-900 dark:text-white"
                                placeholder="e.g., General Admission"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Capacity</label>
                              <input
                                type="number"
                                value={level.capacity}
                                onChange={(e) => updateGALevel(level.id, 'capacity', parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm text-slate-900 dark:text-white"
                                placeholder="500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Type</label>
                              <select
                                value={level.type}
                                onChange={(e) => updateGALevel(level.id, 'type', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm text-slate-900 dark:text-white"
                              >
                                <option value="standing">Standing</option>
                                <option value="seated">Seated</option>
                                <option value="mixed">Mixed</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Ticket Price</label>
                              <div className="flex items-center">
                                <span className="px-3 py-2 bg-slate-200 dark:bg-slate-600 border border-r-0 border-slate-200 dark:border-slate-600 rounded-l text-sm text-slate-500 dark:text-slate-400">$</span>
                                <input
                                  type="number"
                                  value={level.price}
                                  onChange={(e) => updateGALevel(level.id, 'price', parseInt(e.target.value) || 0)}
                                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-r text-sm text-slate-900 dark:text-white"
                                  placeholder="50"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Seating Sections</label>
                      <button
                        type="button"
                        onClick={addSection}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-purple-300"
                      >
                        + Add Section
                      </button>
                    </div>

                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {layoutFormData.sections.map((section, idx) => (
                        <div key={section.id} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Section {idx + 1}</span>
                            {layoutFormData.sections.length > 1 && (
                              <button
                                onClick={() => removeSection(section.id)}
                                className="text-red-400 hover:text-red-300 text-xs"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Section Name</label>
                              <input
                                type="text"
                                value={section.name}
                                onChange={(e) => updateSection(section.id, 'name', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm text-slate-900 dark:text-white"
                                placeholder="e.g., Section A"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Ticket Price</label>
                              <div className="flex items-center">
                                <span className="px-3 py-2 bg-slate-200 dark:bg-slate-600 border border-r-0 border-slate-200 dark:border-slate-600 rounded-l text-sm text-slate-500 dark:text-slate-400">$</span>
                                <input
                                  type="number"
                                  value={section.price}
                                  onChange={(e) => updateSection(section.id, 'price', parseInt(e.target.value) || 0)}
                                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-r text-sm text-slate-900 dark:text-white"
                                  placeholder="75"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Number of Rows</label>
                              <input
                                type="number"
                                value={section.rows}
                                onChange={(e) => updateSection(section.id, 'rows', parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm text-slate-900 dark:text-white"
                                placeholder="10"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Seats per Row</label>
                              <input
                                type="number"
                                value={section.seatsPerRow}
                                onChange={(e) => updateSection(section.id, 'seatsPerRow', parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm text-slate-900 dark:text-white"
                                placeholder="20"
                              />
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                            Total Capacity: {section.rows * section.seatsPerRow} seats
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={() => setLayoutWizardStep(1)}
                    className="px-6 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setLayoutWizardStep(3)}
                    className="px-6 py-2 bg-blue-600 rounded-lg"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Create */}
            {layoutWizardStep === 3 && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-600/20 rounded-lg">
                  <h4 className="font-semibold mb-3">Layout Summary</h4>
                  <div className="text-sm text-slate-700 dark:text-slate-300 space-y-2">
                    <p><strong>Name:</strong> {layoutFormData.name}</p>
                    <p><strong>Type:</strong> {layoutFormData.type === 'general_admission' ? 'General Admission' : 'Assigned Seating'}</p>
                    <p><strong>Total Capacity:</strong> {
                      layoutFormData.type === 'general_admission'
                        ? layoutFormData.gaLevels.reduce((sum, l) => sum + l.capacity, 0)
                        : layoutFormData.sections.reduce((sum, s) => sum + (s.rows * s.seatsPerRow), 0)
                    }</p>
                  </div>
                </div>

                {layoutFormData.type === 'general_admission' ? (
                  <div>
                    <h5 className="text-sm font-medium mb-2">GA Levels</h5>
                    <div className="space-y-2">
                      {layoutFormData.gaLevels.map(level => (
                        <div key={level.id} className="flex justify-between text-sm p-2 bg-slate-100 dark:bg-slate-800 rounded">
                          <span>{level.name}</span>
                          <span className="text-slate-500 dark:text-slate-400">{level.capacity} capacity • ${level.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h5 className="text-sm font-medium mb-2">Sections</h5>
                    <div className="space-y-2">
                      {layoutFormData.sections.map(section => (
                        <div key={section.id} className="flex justify-between text-sm p-2 bg-slate-100 dark:bg-slate-800 rounded">
                          <span>{section.name}</span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {section.rows * section.seatsPerRow} seats ({section.rows} rows × {section.seatsPerRow}) • ${section.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={() => setLayoutWizardStep(2)}
                    className="px-6 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCreateLayout}
                    disabled={savingLayout}
                    className="px-6 py-2 bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {savingLayout ? 'Creating...' : 'Create Layout'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
