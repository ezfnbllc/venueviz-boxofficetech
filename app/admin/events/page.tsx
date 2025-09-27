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
    setFormData({
      name: event.name || '',
      description: event.description || '',
      venue: event.venue || event.venueName || '',
      venueId: event.venueId || '',
      layoutId: event.layoutId || '',
      date: event.date ? new Date(event.date).toISOString().split('T')[0] : '',
      time: event.startTime || event.time || '19:00',
      pricing: event.pricing || [],
      capacity: event.capacity || 500,
      performers: event.performers || [],
      type: event.type || 'concert',
      sourceUrl: event.sourceUrl || '',
      images: event.images || [],
      dynamicPricing: event.dynamicPricing || {
        earlyBird: { enabled: false, discount: 20, endDate: '' },
        lastMinute: { enabled: false, markup: 10 },
        groupDiscount: { enabled: false, minSize: 10, discount: 15 }
      }
    })
    setImageUrls(event.images || [])
    setShowWizard(true)
    setWizardStep(1)
  }

  const handleDelete = async (id: string, name: string) => {
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
    if (files.length + imageFiles.length > 3) {
      alert('Maximum 3 images allowed')
      return
    }
    setImageFiles([...imageFiles, ...files].slice(0, 3))
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + imageFiles.length > 3) {
      alert('Maximum 3 images allowed')
      return
    }
    setImageFiles([...imageFiles, ...files].slice(0, 3))
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
      setImageUrls(urls)
      return urls
    } catch (error) {
      console.error('Error uploading images:', error)
      alert('Failed to upload images')
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
          
          // Create default layout for the venue
          const layoutId = await AdminService.createLayout({
            venueId: newVenueId,
            name: 'Default Layout',
            type: 'seating_chart',
            configuration: data.layoutConfig || {}
          })
          
          existingVenue = {
            id: newVenueId,
            name: data.venueName,
            capacity: data.venueCapacity || 500
          }
          
          await loadData()
          alert(`New venue "${data.venueName}" created with layout`)
        }
        
        // Set form data with pricing tiers
        setFormData({
          ...formData,
          name: data.title || '',
          description: data.description || '',
          venue: existingVenue?.name || data.venueName || '',
          venueId: existingVenue?.id || '',
          date: data.date || '',
          time: data.time || '19:00',
          pricing: data.pricing || [{ level: 'General', price: 50, serviceFee: 5, tax: 8 }],
          capacity: existingVenue?.capacity || data.capacity || 500,
          performers: data.performers || [],
          type: data.type || 'concert',
          sourceUrl: scrapeUrl,
          images: data.imageUrls || []
        })
        
        if (data.imageUrls) {
          setImageUrls(data.imageUrls)
        }
        
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
          generateImages: true 
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({
          ...prev,
          description: data.description || prev.description,
          type: data.type || prev.type,
          pricing: data.pricing || prev.pricing,
          capacity: data.capacity || prev.capacity,
          performers: data.performers || prev.performers,
          images: data.suggestedImages || prev.images
        }))
      }
    } catch (error) {
      console.error('AI generation error:', error)
    }
    setAiLoading(false)
  }

  const handleSubmit = async () => {
    try {
      // Upload images first
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
      dynamicPricing: {
        earlyBird: { enabled: false, discount: 20, endDate: '' },
        lastMinute: { enabled: false, markup: 10 },
        groupDiscount: { enabled: false, minSize: 10, discount: 15 }
      }
    })
  }

  const nextStep = () => {
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

        {/* Events Grid */}
        {!loading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => (
              <div key={event.id} className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
                {event.images?.[0] && (
                  <img src={event.images[0]} alt={event.name} className="w-full h-48 object-cover" />
                )}
                {!event.images?.[0] && (
                  <div className="w-full h-48 bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center">
                    <span className="text-6xl opacity-20">🎭</span>
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{event.name}</h3>
                  <p className="text-gray-400 text-sm mb-1">{event.venue}</p>
                  <p className="text-gray-400 text-sm mb-1">
                    {event.date ? new Date(event.date).toLocaleDateString() : 'TBD'}
                  </p>
                  <div className="text-lg font-bold mb-4">
                    {event.pricing?.[0] ? `From $${event.pricing[0].price}` : `$${event.price || 0}`}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(event)}
                      className="flex-1 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(event.id, event.name)}
                      className="flex-1 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Event Wizard Modal - keeping existing wizard code */}
        {showWizard && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-4xl my-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  {editingEvent ? 'Edit Event' : 'Create New Event'}
                </h2>
                <button onClick={resetWizard} className="text-gray-400 hover:text-white">✕</button>
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

              {/* Step content remains the same */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  {/* URL Import */}
                  <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-4">
                    <label className="block text-sm mb-2 text-purple-400">Import from URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={scrapeUrl}
                        onChange={(e) => setScrapeUrl(e.target.value)}
                        className="flex-1 px-4 py-2 bg-white/10 rounded-lg text-sm"
                        placeholder="Paste event URL (Ticketmaster, Sulekha, Fandango, Eventbrite)"
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

                  {/* Keep rest of step 1 content */}
                  <div>
                    <label className="block text-sm mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      rows={4}
                    />
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
