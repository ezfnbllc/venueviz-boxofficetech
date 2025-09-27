'use client'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'
import {StorageService} from '@/lib/storage/storageService'
import {auth} from '@/lib/firebase'
import {onAuthStateChanged} from 'firebase/auth'

export default function EventsManagement() {
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [venues, setVenues] = useState<any[]>([])
  const [layouts, setLayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [editingEvent, setEditingEvent] = useState<any>(null)
  const [wizardStep, setWizardStep] = useState(1)
  const [aiLoading, setAiLoading] = useState(false)
  const [scrapeUrl, setScrapeUrl] = useState('')
  const [scraping, setScraping] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    venue: '',
    venueId: '',
    layoutId: '',
    date: '',
    time: '',
    pricing: [] as any[],
    capacity: 500,
    performers: [] as string[],
    type: 'concert',
    sourceUrl: '',
    images: [] as string[],
    seo: {
      pageTitle: '',
      pageDescription: '',
      keywords: [] as string[],
      urlSlug: '',
      structuredData: {}
    },
    dynamicPricing: {
      earlyBird: { enabled: false, discount: 20, endDate: '' },
      lastMinute: { enabled: false, markup: 10 },
      groupDiscount: { enabled: false, minSize: 10, discount: 15 }
    }
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        loadData()
      } else {
        router.push('/login')
      }
    })
    return () => unsubscribe()
  }, [router])

  const loadData = async () => {
    try {
      const [eventsData, venuesData, layoutsData] = await Promise.all([
        AdminService.getEvents(),
        AdminService.getVenues(),
        AdminService.getLayouts()
      ])
      setEvents(eventsData)
      setVenues(venuesData)
      setLayouts(layoutsData)
    } catch (error) {
      console.error('Error loading data:', error)
    }
    setLoading(false)
  }

  const handleEdit = (event: any) => {
    setEditingEvent(event)
    
    // Ensure pricing has the correct structure with fees array
    const normalizedPricing = (event.pricing || []).map((tier: any) => ({
      ...tier,
      fees: tier.fees || (tier.serviceFee ? [{
        name: 'Service Fee',
        amount: tier.serviceFee,
        type: 'flat'
      }] : [])
    }))
    
    setFormData({
      name: event.name || '',
      description: event.description || '',
      venue: event.venue || event.venueName || '',
      venueId: event.venueId || '',
      layoutId: event.layoutId || '',
      date: event.date ? new Date(event.date).toISOString().split('T')[0] : '',
      time: event.startTime || event.time || '19:00',
      pricing: normalizedPricing,
      capacity: event.capacity || 500,
      performers: event.performers || [],
      type: event.type || 'concert',
      sourceUrl: event.sourceUrl || '',
      images: event.images || [],
      seo: event.seo || {
        pageTitle: '',
        pageDescription: '',
        keywords: [],
        urlSlug: '',
        structuredData: {}
      },
      dynamicPricing: event.dynamicPricing || {
        earlyBird: { enabled: false, discount: 20, endDate: '' },
        lastMinute: { enabled: false, markup: 10 },
        groupDiscount: { enabled: false, minSize: 10, discount: 15 }
      }
    })
    setImageUrls(event.images || [])
    setImageFiles([])
    setShowWizard(true)
    setWizardStep(1)
  }

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await AdminService.deleteEvent(id)
        await loadData()
        alert('Event deleted successfully')
      } catch (error) {
        console.error('Error deleting event:', error)
        alert('Error deleting event')
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
    e.target.value = '' // Reset input to allow selecting the same file again
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
        const url = await StorageService.uploadEventImage(file, formData.name)
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

  const scrapeEventUrl = async () => {
    if (!scrapeUrl) {
      alert('Please enter a URL')
      return
    }
    
    setScraping(true)
    try {
      const response = await fetch('/api/scrape-event-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeUrl })
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Check/create venue
        let existingVenue = venues.find(v => 
          v.name?.toLowerCase() === data.venueName?.toLowerCase()
        )
        
        if (!existingVenue && data.venueName) {
          const newVenueId = await AdminService.createVenue({
            name: data.venueName,
            address: data.venueAddress || '',
            city: data.venueCity || 'Dallas',
            state: data.venueState || 'TX',
            capacity: data.venueCapacity || 500
          })
          
          existingVenue = {
            id: newVenueId,
            name: data.venueName,
            capacity: data.venueCapacity || 500
          }
          
          await loadData()
          alert(`New venue "${data.venueName}" created`)
        }
        
        // Convert old pricing format to new format with fees array
        const convertedPricing = (data.pricing || []).map((tier: any) => ({
          level: tier.level,
          price: tier.price,
          tax: tier.tax || 8,
          fees: tier.serviceFee ? [{
            name: 'Service Fee',
            amount: tier.serviceFee,
            type: 'flat'
          }] : []
        }))
        
        setFormData({
          ...formData,
          name: data.title || '',
          description: data.description || '',
          venue: existingVenue?.name || data.venueName || '',
          venueId: existingVenue?.id || '',
          date: data.date || '',
          time: data.time || '19:00',
          pricing: convertedPricing,
          capacity: existingVenue?.capacity || data.capacity || 500,
          performers: data.performers || [],
          type: data.type || 'concert',
          sourceUrl: scrapeUrl,
          images: data.imageUrls || []
        })
        
        if (data.imageUrls) {
          setImageUrls(data.imageUrls)
        }
        
        // Generate SEO after scraping
        await generateSEO(data.title || formData.name)
        
        alert('Event details loaded successfully!')
      }
    } catch (error) {
      console.error('Scraping error:', error)
      alert('Error extracting event details')
    }
    setScraping(false)
  }

  const generateWithAI = async () => {
    if (!formData.name) {
      alert('Please enter an event name first')
      return
    }
    
    setAiLoading(true)
    try {
      const response = await fetch('/api/generate-event-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventName: formData.name,
          venueType: formData.venue,
          generateImages: true,
          generateSEO: true
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Convert old pricing format to new format with fees array
        const convertedPricing = (data.pricing || []).map((tier: any) => ({
          level: tier.level,
          price: tier.price,
          tax: tier.tax || 8,
          fees: tier.serviceFee ? [{
            name: 'Service Fee',
            amount: tier.serviceFee,
            type: 'flat'
          }] : []
        }))
        
        setFormData(prev => ({
          ...prev,
          description: data.description || prev.description,
          type: data.type || prev.type,
          pricing: convertedPricing,
          capacity: data.capacity || prev.capacity,
          performers: data.performers || prev.performers,
          images: data.suggestedImages || prev.images,
          seo: data.seo || prev.seo
        }))
      }
    } catch (error) {
      console.error('AI generation error:', error)
    }
    setAiLoading(false)
  }

  const generateSEO = async (eventName?: string) => {
    const name = eventName || formData.name
    if (!name) return
    
    try {
      const response = await fetch('/api/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventName: name,
          description: formData.description,
          venue: formData.venue,
          date: formData.date,
          type: formData.type
        })
      })
      
      if (response.ok) {
        const seoData = await response.json()
        setFormData(prev => ({
          ...prev,
          seo: seoData
        }))
      }
    } catch (error) {
      console.error('SEO generation error:', error)
    }
  }

  const handleSubmit = async () => {
    try {
      const uploadedUrls = await uploadImages()
      
      const eventData = {
        ...formData,
        images: [...imageUrls, ...uploadedUrls],
        date: `${formData.date}T${formData.time}:00`
      }
      
      if (editingEvent) {
        await AdminService.updateEvent(editingEvent.id, eventData)
      } else {
        await AdminService.createEvent(eventData)
      }
      
      resetWizard()
      await loadData()
      alert(`Event ${editingEvent ? 'updated' : 'created'} successfully!`)
    } catch (error) {
      console.error('Error saving event:', error)
      alert('Error saving event')
    }
  }

  const resetWizard = () => {
    setShowWizard(false)
    setEditingEvent(null)
    setWizardStep(1)
    setScrapeUrl('')
    setImageFiles([])
    setImageUrls([])
    setFormData({
      name: '',
      description: '',
      venue: '',
      venueId: '',
      layoutId: '',
      date: '',
      time: '',
      pricing: [],
      capacity: 500,
      performers: [],
      type: 'concert',
      sourceUrl: '',
      images: [],
      seo: {
        pageTitle: '',
        pageDescription: '',
        keywords: [],
        urlSlug: '',
        structuredData: {}
      },
      dynamicPricing: {
        earlyBird: { enabled: false, discount: 20, endDate: '' },
        lastMinute: { enabled: false, markup: 10 },
        groupDiscount: { enabled: false, minSize: 10, discount: 15 }
      }
    })
  }

  const calculateTotalPrice = (tier: any) => {
    const basePrice = tier.price || 0
    const totalFees = (tier.fees || []).reduce((sum: number, fee: any) => {
      if (fee.type === 'percentage') {
        return sum + (basePrice * fee.amount / 100)
      }
      return sum + (fee.amount || 0)
    }, 0)
    const subtotal = basePrice + totalFees
    const tax = subtotal * (tier.tax || 0) / 100
    return subtotal + tax
  }

  const nextStep = () => {
    if (wizardStep === 1 && !formData.name) {
      alert('Please enter event name')
      return
    }
    if (wizardStep === 2 && !formData.venue) {
      alert('Please select a venue')
      return
    }
    if (wizardStep === 3 && formData.pricing.length === 0) {
      alert('Please add at least one pricing tier')
      return
    }
    if (wizardStep === 4 && (!formData.date || !formData.time)) {
      alert('Please select date and time')
      return
    }
    
    if (wizardStep < 5) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Events Management</h1>
          <div className="flex gap-4">
            <button onClick={() => router.push('/admin')} className="px-4 py-2 bg-gray-600 rounded-lg">
              Back
            </button>
            <button onClick={() => setShowWizard(true)} className="px-6 py-2 bg-purple-600 rounded-lg">
              + New Event
            </button>
          </div>
        </div>

        {/* Events Grid with icon buttons */}
        {!loading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => (
              <div key={event.id} className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden group">
                <div className="relative">
                  {event.images?.[0] ? (
                    <img src={event.images[0]} alt={event.name} className="w-full h-48 object-cover" />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center">
                      <span className="text-6xl opacity-20">🎭</span>
                    </div>
                  )}
                  
                  {/* Action buttons overlay on top-right of image */}
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(event)
                      }}
                      className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition"
                      title="Edit Event"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, event.id, event.name)}
                      className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition"
                      title="Delete Event"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{event.name}</h3>
                  <p className="text-gray-400 text-sm mb-1">{event.venue}</p>
                  <p className="text-gray-400 text-sm mb-4">
                    {event.date ? new Date(event.date).toLocaleDateString() : 'TBD'}
                  </p>
                  <div className="text-lg font-bold">
                    {event.pricing?.[0] ? `From $${event.pricing[0].price}` : `$${event.price || 0}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Event Wizard Modal */}
        {showWizard && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-4xl my-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  {editingEvent ? 'Edit Event' : 'Create New Event'}
                </h2>
                <button onClick={resetWizard} className="text-gray-400 hover:text-white text-2xl">✕</button>
              </div>

              {/* Progress Steps */}
              <div className="flex mb-8">
                {['Basic Info', 'Venue & Layout', 'Pricing', 'Schedule', 'Review'].map((label, i) => (
                  <div key={i} className="flex-1">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        wizardStep > i + 1 ? 'bg-green-600' : 
                        wizardStep === i + 1 ? 'bg-purple-600' : 'bg-gray-600'
                      }`}>
                        {wizardStep > i + 1 ? '✓' : i + 1}
                      </div>
                      {i < 4 && <div className={`flex-1 h-1 mx-2 ${
                        wizardStep > i + 1 ? 'bg-green-600' : 'bg-gray-600'
                      }`}/>}
                    </div>
                    <p className="text-xs mt-2">{label}</p>
                  </div>
                ))}
              </div>

              {/* Step 1: Basic Info with improved image upload */}
              {wizardStep === 1 && (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {/* URL Import */}
                  <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-4">
                    <label className="block text-sm mb-2 text-purple-400">Import from URL (Optional)</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={scrapeUrl}
                        onChange={(e) => setScrapeUrl(e.target.value)}
                        className="flex-1 px-4 py-2 bg-white/10 rounded-lg text-sm"
                        placeholder="Paste event URL"
                      />
                      <button
                        onClick={scrapeEventUrl}
                        disabled={scraping}
                        className="px-4 py-2 bg-purple-600 rounded-lg disabled:opacity-50"
                      >
                        {scraping ? '...' : '📥 Import'}
                      </button>
                    </div>
                  </div>

                  {/* Event Name */}
                  <div>
                    <label className="block text-sm mb-2">Event Name *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="flex-1 px-4 py-2 bg-white/10 rounded-lg"
                        placeholder="e.g., Taylor Swift Concert"
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

                  {/* Event Type */}
                  <div>
                    <label className="block text-sm mb-2">Event Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    >
                      <option value="concert">Concert</option>
                      <option value="theater">Theater</option>
                      <option value="comedy">Comedy</option>
                      <option value="sports">Sports</option>
                      <option value="festival">Festival</option>
                      <option value="movie">Movie</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      rows={4}
                      placeholder="Event description"
                    />
                  </div>

                  {/* Performers */}
                  <div>
                    <label className="block text-sm mb-2">Performers (comma separated)</label>
                    <input
                      type="text"
                      value={formData.performers.join(', ')}
                      onChange={(e) => setFormData({
                        ...formData, 
                        performers: e.target.value.split(',').map(p => p.trim()).filter(p => p)
                      })}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="e.g., Artist Name, Opening Act"
                    />
                  </div>

                  {/* Improved Image Upload */}
                  <div>
                    <label className="block text-sm mb-2">
                      Event Images ({imageFiles.length + imageUrls.length}/3)
                    </label>
                    
                    {/* Show uploaded/selected images */}
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
                    
                    {/* Upload area - only show if less than 3 images */}
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
                          id="image-upload"
                        />
                        <label htmlFor="image-upload" className="px-4 py-2 bg-purple-600/20 rounded-lg cursor-pointer inline-block hover:bg-purple-600/30">
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

              {/* Step 2: Venue & Layout */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2">Select Venue *</label>
                    <select
                      required
                      value={formData.venue}
                      onChange={(e) => {
                        const venue = venues.find(v => v.name === e.target.value)
                        setFormData({
                          ...formData, 
                          venue: e.target.value,
                          venueId: venue?.id || '',
                          capacity: venue?.capacity || formData.capacity
                        })
                      }}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    >
                      <option value="">Select a venue</option>
                      {venues.map(venue => (
                        <option key={venue.id} value={venue.name}>
                          {venue.name} (Capacity: {venue.capacity})
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.venueId && (
                    <div>
                      <label className="block text-sm mb-2">Select Layout</label>
                      <select
                        value={formData.layoutId}
                        onChange={(e) => setFormData({...formData, layoutId: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      >
                        <option value="">Default Layout</option>
                        {layouts
                          .filter(l => l.venueId === formData.venueId)
                          .map(layout => (
                            <option key={layout.id} value={layout.id}>
                              {layout.name} ({layout.type === 'ga' ? 'General Admission' : 'Seating Chart'})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm mb-2">Capacity</label>
                    <input
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Improved Pricing with multiple fees */}
              {wizardStep === 3 && (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  <h3 className="text-lg font-semibold">Pricing Tiers</h3>
                  
                  {formData.pricing.map((tier, tierIndex) => (
                    <div key={tierIndex} className="bg-white/5 rounded-lg p-4">
                      {/* Tier Name */}
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-1">Tier Name</label>
                        <input
                          type="text"
                          placeholder="e.g., VIP, Orchestra, General"
                          value={tier.level}
                          onChange={(e) => {
                            const newPricing = [...formData.pricing]
                            newPricing[tierIndex].level = e.target.value
                            setFormData({...formData, pricing: newPricing})
                          }}
                          className="w-full px-3 py-2 bg-white/10 rounded-lg"
                        />
                      </div>

                      {/* Price, Tax on one line */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Base Price ($)</label>
                          <input
                            type="number"
                            placeholder="50"
                            value={tier.price}
                            onChange={(e) => {
                              const newPricing = [...formData.pricing]
                              newPricing[tierIndex].price = parseInt(e.target.value) || 0
                              setFormData({...formData, pricing: newPricing})
                            }}
                            className="w-full px-3 py-2 bg-white/10 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Tax (%)</label>
                          <input
                            type="number"
                            placeholder="8"
                            value={tier.tax}
                            onChange={(e) => {
                              const newPricing = [...formData.pricing]
                              newPricing[tierIndex].tax = parseInt(e.target.value) || 0
                              setFormData({...formData, pricing: newPricing})
                            }}
                            className="w-full px-3 py-2 bg-white/10 rounded-lg"
                          />
                        </div>
                      </div>

                      {/* Service Fees Section */}
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-2">Service Fees</label>
                        {(tier.fees || []).map((fee: any, feeIndex: number) => (
                          <div key={feeIndex} className="flex gap-2 mb-2">
                            <input
                              type="text"
                              placeholder="Fee name"
                              value={fee.name}
                              onChange={(e) => {
                                const newPricing = [...formData.pricing]
                                newPricing[tierIndex].fees[feeIndex].name = e.target.value
                                setFormData({...formData, pricing: newPricing})
                              }}
                              className="flex-1 px-2 py-1 bg-white/10 rounded text-sm"
                            />
                            <input
                              type="number"
                              placeholder="Amount"
                              value={fee.amount}
                              onChange={(e) => {
                                const newPricing = [...formData.pricing]
                                newPricing[tierIndex].fees[feeIndex].amount = parseFloat(e.target.value) || 0
                                setFormData({...formData, pricing: newPricing})
                              }}
                              className="w-20 px-2 py-1 bg-white/10 rounded text-sm"
                            />
                            <select
                              value={fee.type}
                              onChange={(e) => {
                                const newPricing = [...formData.pricing]
                                newPricing[tierIndex].fees[feeIndex].type = e.target.value
                                setFormData({...formData, pricing: newPricing})
                              }}
                              className="w-20 px-2 py-1 bg-white/10 rounded text-sm"
                            >
                              <option value="flat">$</option>
                              <option value="percentage">%</option>
                            </select>
                            <button
                              onClick={() => {
                                const newPricing = [...formData.pricing]
                                newPricing[tierIndex].fees = newPricing[tierIndex].fees.filter((_: any, i: number) => i !== feeIndex)
                                setFormData({...formData, pricing: newPricing})
                              }}
                              className="px-2 py-1 bg-red-600/20 text-red-400 rounded text-sm"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newPricing = [...formData.pricing]
                            if (!newPricing[tierIndex].fees) {
                              newPricing[tierIndex].fees = []
                            }
                            newPricing[tierIndex].fees.push({
                              name: '',
                              amount: 0,
                              type: 'flat'
                            })
                            setFormData({...formData, pricing: newPricing})
                          }}
                          className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded text-sm"
                        >
                          + Add Fee
                        </button>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-white/10">
                        <span className="text-sm text-gray-400">
                          Total per ticket: ${calculateTotalPrice(tier).toFixed(2)}
                        </span>
                        <button
                          onClick={() => {
                            const newPricing = formData.pricing.filter((_, i) => i !== tierIndex)
                            setFormData({...formData, pricing: newPricing})
                          }}
                          className="text-red-400 text-sm hover:text-red-300"
                        >
                          Remove Tier
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => setFormData({
                      ...formData,
                      pricing: [...formData.pricing, {
                        level: '',
                        price: 50,
                        tax: 8,
                        fees: [{
                          name: 'Service Fee',
                          amount: 5,
                          type: 'flat'
                        }]
                      }]
                    })}
                    className="px-4 py-2 bg-purple-600 rounded-lg"
                  >
                    + Add Pricing Tier
                  </button>

                  {/* Dynamic Pricing */}
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4">Dynamic Pricing</h3>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.dynamicPricing.earlyBird.enabled}
                          onChange={(e) => setFormData({
                            ...formData,
                            dynamicPricing: {
                              ...formData.dynamicPricing,
                              earlyBird: {
                                ...formData.dynamicPricing.earlyBird,
                                enabled: e.target.checked
                              }
                            }
                          })}
                        />
                        <span>Early Bird Discount ({formData.dynamicPricing.earlyBird.discount}% off)</span>
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.dynamicPricing.groupDiscount.enabled}
                          onChange={(e) => setFormData({
                            ...formData,
                            dynamicPricing: {
                              ...formData.dynamicPricing,
                              groupDiscount: {
                                ...formData.dynamicPricing.groupDiscount,
                                enabled: e.target.checked
                              }
                            }
                          })}
                        />
                        <span>Group Discount (Min {formData.dynamicPricing.groupDiscount.minSize}, {formData.dynamicPricing.groupDiscount.discount}% off)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4 & 5 remain the same */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-2">Date *</label>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Time *</label>
                      <input
                        type="time"
                        required
                        value={formData.time}
                        onChange={(e) => setFormData({...formData, time: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* SEO Section */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">SEO Settings</h3>
                      <button
                        onClick={() => generateSEO()}
                        className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded text-sm"
                      >
                        Generate SEO
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm mb-2">Page Title</label>
                        <input
                          type="text"
                          value={formData.seo.pageTitle}
                          onChange={(e) => setFormData({
                            ...formData,
                            seo: {...formData.seo, pageTitle: e.target.value}
                          })}
                          className="w-full px-4 py-2 bg-white/10 rounded-lg"
                          placeholder="SEO optimized title"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm mb-2">Meta Description</label>
                        <textarea
                          value={formData.seo.pageDescription}
                          onChange={(e) => setFormData({
                            ...formData,
                            seo: {...formData.seo, pageDescription: e.target.value}
                          })}
                          className="w-full px-4 py-2 bg-white/10 rounded-lg"
                          rows={2}
                          placeholder="SEO meta description"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm mb-2">URL Slug</label>
                        <input
                          type="text"
                          value={formData.seo.urlSlug}
                          onChange={(e) => setFormData({
                            ...formData,
                            seo: {...formData.seo, urlSlug: e.target.value}
                          })}
                          className="w-full px-4 py-2 bg-white/10 rounded-lg"
                          placeholder="url-friendly-slug"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm mb-2">Keywords (comma separated)</label>
                        <input
                          type="text"
                          value={formData.seo.keywords.join(', ')}
                          onChange={(e) => setFormData({
                            ...formData,
                            seo: {
                              ...formData.seo,
                              keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                            }
                          })}
                          className="w-full px-4 py-2 bg-white/10 rounded-lg"
                          placeholder="concert, live music, venue name"
                        />
                      </div>
                    </div>
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
                  {wizardStep === 5 ? (editingEvent ? 'Update Event' : 'Create Event') : 'Next'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
