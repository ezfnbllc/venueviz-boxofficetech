'use client'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'
import {StorageService} from '@/lib/storage/storageService'
import {auth} from '@/lib/firebase'
import {onAuthStateChanged} from 'firebase/auth'
import AdminLayout from '@/components/AdminLayout'

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
    
    const normalizedPricing = (event.pricing || []).map((tier: any) => ({
      ...tier,
      fees: tier.fees || (tier.serviceFee ? [{ name: 'Service Fee', amount: tier.serviceFee, type: 'percentage' }] : [])
    }))
    
    setFormData({
      ...event,
      pricing: normalizedPricing,
      venue: event.venueName || event.venue || '',
      date: event.schedule?.date ? new Date(event.schedule.date.toDate()).toISOString().split('T')[0] : '',
      time: event.schedule?.startTime || event.time || '',
      images: event.images || []
    })
    setImageUrls(event.images || [])
    setShowWizard(true)
    setWizardStep(1)
  }

  const handleDelete = async (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await AdminService.deleteEvent(eventId)
        await loadData()
      } catch (error) {
        console.error('Error deleting event:', error)
      }
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    
    setUploadingImages(true)
    try {
      const uploadPromises = files.map(file => StorageService.uploadEventImage(file))
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
      const eventData = {
        ...formData,
        schedule: {
          date: new Date(formData.date),
          startTime: formData.time,
          doorsOpen: '',
          endTime: '',
          timezone: 'America/Chicago'
        }
      }
      
      if (editingEvent) {
        await AdminService.updateEvent(editingEvent.id, eventData)
      } else {
        await AdminService.createEvent(eventData)
      }
      
      setShowWizard(false)
      resetForm()
      await loadData()
    } catch (error) {
      console.error('Error saving event:', error)
    }
  }

  const resetForm = () => {
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
    setImageUrls([])
    setEditingEvent(null)
    setWizardStep(1)
  }

  const addPricingTier = () => {
    setFormData({
      ...formData,
      pricing: [...formData.pricing, { 
        name: '', 
        price: 0, 
        available: 100,
        fees: [{ name: 'Service Fee', amount: 10, type: 'percentage' }]
      }]
    })
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Events Management</h1>
            <p className="text-gray-400">Create and manage events</p>
          </div>
          <button 
            onClick={() => {
              resetForm()
              setShowWizard(true)
            }}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700"
          >
            + Create Event
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <div className="text-6xl mb-4">🎭</div>
            <p className="text-gray-400 mb-4">No events yet. Create your first event!</p>
            <button 
              onClick={() => setShowWizard(true)}
              className="px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              Create First Event
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => (
              <div key={event.id} className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden group hover:scale-105 transition-transform">
                {/* Event Image */}
                {event.images && event.images[0] && (
                  <div className="h-48 overflow-hidden">
                    <img 
                      src={event.images[0]} 
                      alt={event.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </div>
                )}
                
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{event.name}</h3>
                  <p className="text-gray-400 text-sm mb-2">{event.venueName || event.venue}</p>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                    <span>📅</span>
                    <span>
                      {event.schedule?.date ? 
                        new Date(event.schedule.date.toDate ? event.schedule.date.toDate() : event.schedule.date).toLocaleDateString() : 
                        event.date ? new Date(event.date.toDate ? event.date.toDate() : event.date).toLocaleDateString() : 
                        'Date TBD'}
                    </span>
                  </div>
                  
                  {event.pricing && event.pricing.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-400">Starting from</p>
                      <p className="text-2xl font-bold text-purple-400">
                        ${Math.min(...event.pricing.map((p: any) => p.price))}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(event)}
                      className="flex-1 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(event.id)}
                      className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30"
                    >
                      Delete
                    </button>
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
              {/* Wizard Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  {editingEvent ? 'Edit Event' : 'Create New Event'}
                </h2>
                <button 
                  onClick={() => {
                    setShowWizard(false)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Progress Steps */}
              <div className="flex justify-between mb-8">
                {['Basic Info', 'Venue & Date', 'Pricing', 'Images'].map((step, idx) => (
                  <div 
                    key={idx}
                    className={`flex-1 text-center ${idx + 1 <= wizardStep ? 'text-purple-400' : 'text-gray-600'}`}
                  >
                    <div className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center ${
                      idx + 1 <= wizardStep ? 'bg-purple-600' : 'bg-gray-700'
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
                    <label className="block text-sm mb-2">Event Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="Enter event name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg h-32"
                      placeholder="Enter event description"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm mb-2">Event Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    >
                      <option value="concert">Concert</option>
                      <option value="theater">Theater</option>
                      <option value="sports">Sports</option>
                      <option value="comedy">Comedy</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => setWizardStep(2)}
                      className="px-6 py-2 bg-purple-600 rounded-lg"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Venue & Date */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2">Venue</label>
                    <select
                      value={formData.venueId}
                      onChange={(e) => {
                        const venue = venues.find(v => v.id === e.target.value)
                        setFormData({
                          ...formData, 
                          venueId: e.target.value,
                          venue: venue?.name || ''
                        })
                      }}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    >
                      <option value="">Select a venue</option>
                      {venues.map(venue => (
                        <option key={venue.id} value={venue.id}>{venue.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-2">Date</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm mb-2">Start Time</label>
                      <input
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({...formData, time: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm mb-2">Capacity</label>
                    <input
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    />
                  </div>
                  
                  <div className="flex justify-between">
                    <button 
                      onClick={() => setWizardStep(1)}
                      className="px-6 py-2 bg-gray-700 rounded-lg"
                    >
                      Back
                    </button>
                    <button 
                      onClick={() => setWizardStep(3)}
                      className="px-6 py-2 bg-purple-600 rounded-lg"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Pricing */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-sm">Pricing Tiers</label>
                    <button 
                      onClick={addPricingTier}
                      className="px-4 py-2 bg-purple-600 rounded-lg text-sm"
                    >
                      + Add Tier
                    </button>
                  </div>
                  
                  {formData.pricing.map((tier, index) => (
                    <div key={index} className="p-4 bg-white/5 rounded-lg space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={tier.name}
                          onChange={(e) => {
                            const newPricing = [...formData.pricing]
                            newPricing[index].name = e.target.value
                            setFormData({...formData, pricing: newPricing})
                          }}
                          className="px-3 py-2 bg-white/10 rounded"
                          placeholder="Tier name"
                        />
                        <input
                          type="number"
                          value={tier.price}
                          onChange={(e) => {
                            const newPricing = [...formData.pricing]
                            newPricing[index].price = parseFloat(e.target.value)
                            setFormData({...formData, pricing: newPricing})
                          }}
                          className="px-3 py-2 bg-white/10 rounded"
                          placeholder="Price"
                        />
                        <input
                          type="number"
                          value={tier.available}
                          onChange={(e) => {
                            const newPricing = [...formData.pricing]
                            newPricing[index].available = parseInt(e.target.value)
                            setFormData({...formData, pricing: newPricing})
                          }}
                          className="px-3 py-2 bg-white/10 rounded"
                          placeholder="Available"
                        />
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-between">
                    <button 
                      onClick={() => setWizardStep(2)}
                      className="px-6 py-2 bg-gray-700 rounded-lg"
                    >
                      Back
                    </button>
                    <button 
                      onClick={() => setWizardStep(4)}
                      className="px-6 py-2 bg-purple-600 rounded-lg"
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
                    <label className="block text-sm mb-2">Event Images</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    />
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
                      className="px-6 py-2 bg-gray-700 rounded-lg"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleSubmit}
                      className="px-6 py-2 bg-green-600 rounded-lg"
                    >
                      {editingEvent ? 'Update Event' : 'Create Event'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
