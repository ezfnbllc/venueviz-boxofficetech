'use client'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'
import {auth} from '@/lib/firebase'
import {onAuthStateChanged} from 'firebase/auth'

export default function EventsManagement() {
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [editingEvent, setEditingEvent] = useState<any>(null)
  const [wizardStep, setWizardStep] = useState(1)
  const [aiLoading, setAiLoading] = useState(false)
  const [scrapeUrl, setScrapeUrl] = useState('')
  const [scraping, setScraping] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    venue: '',
    venueId: '',
    date: '',
    time: '',
    price: 100,
    capacity: 500,
    performers: [] as string[],
    type: 'concert',
    sourceUrl: ''
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
      const [eventsData, venuesData] = await Promise.all([
        AdminService.getEvents(),
        AdminService.getVenues()
      ])
      setEvents(eventsData)
      setVenues(venuesData)
    } catch (error) {
      console.error('Error loading data:', error)
    }
    setLoading(false)
  }

  const scrapeEventUrl = async () => {
    if (!scrapeUrl) {
      alert('Please enter a URL')
      return
    }
    
    setScraping(true)
    try {
      const response = await fetch('/api/scrape-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeUrl })
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Check if venue exists
        let existingVenue = venues.find(v => 
          v.name?.toLowerCase() === data.venueName?.toLowerCase() ||
          v.address?.includes(data.venueAddress)
        )
        
        // If venue doesn't exist, create it
        if (!existingVenue && data.venueName) {
          const newVenueId = await AdminService.createVenue({
            name: data.venueName,
            address: data.venueAddress || '',
            city: data.venueCity || 'Unknown',
            state: data.venueState || 'TX',
            capacity: data.venueCapacity || 500
          })
          
          existingVenue = {
            id: newVenueId,
            name: data.venueName,
            capacity: data.venueCapacity || 500
          }
          
          // Reload venues
          const updatedVenues = await AdminService.getVenues()
          setVenues(updatedVenues)
          
          alert(`New venue "${data.venueName}" was added to the database`)
        }
        
        // Update form with scraped data
        setFormData({
          name: data.title || '',
          description: data.description || '',
          venue: existingVenue?.name || data.venueName || '',
          venueId: existingVenue?.id || '',
          date: data.date || '',
          time: data.time || '19:00',
          price: data.price || 100,
          capacity: existingVenue?.capacity || data.capacity || 500,
          performers: data.performers || [],
          type: data.type || 'concert',
          sourceUrl: scrapeUrl
        })
        
        alert('Event details loaded successfully!')
      } else {
        alert('Could not extract event details from this URL')
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
      const response = await fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName: formData.name })
      })
      
      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({
          ...prev,
          description: data.description || prev.description,
          type: data.type || prev.type,
          price: data.price || prev.price,
          capacity: data.capacity || prev.capacity,
          performers: data.performers || prev.performers
        }))
      }
    } catch (error) {
      console.error('AI generation error:', error)
      alert('Error generating content with AI')
    }
    setAiLoading(false)
  }

  const handleSubmit = async () => {
    try {
      if (editingEvent) {
        await AdminService.updateEvent(editingEvent.id, {
          ...formData,
          date: `${formData.date}T${formData.time}:00`
        })
      } else {
        await AdminService.createEvent({
          ...formData,
          date: `${formData.date}T${formData.time}:00`
        })
      }
      resetWizard()
      loadData()
      alert(`Event ${editingEvent ? 'updated' : 'created'} successfully!`)
    } catch (error) {
      alert('Error saving event')
    }
  }

  const handleEdit = (event: any) => {
    setEditingEvent(event)
    setFormData({
      name: event.name,
      description: event.description || '',
      venue: event.venue || event.venueName || '',
      venueId: event.venueId || '',
      date: event.date ? new Date(event.date).toISOString().split('T')[0] : '',
      time: event.startTime || '19:00',
      price: event.price || 100,
      capacity: event.capacity || 500,
      performers: event.performers || [],
      type: event.type || 'concert',
      sourceUrl: event.sourceUrl || ''
    })
    setShowWizard(true)
    setWizardStep(1)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await AdminService.deleteEvent(id)
        loadData()
      } catch (error) {
        alert('Error deleting event')
      }
    }
  }

  const resetWizard = () => {
    setShowWizard(false)
    setEditingEvent(null)
    setWizardStep(1)
    setScrapeUrl('')
    setFormData({
      name: '',
      description: '',
      venue: '',
      venueId: '',
      date: '',
      time: '',
      price: 100,
      capacity: 500,
      performers: [],
      type: 'concert',
      sourceUrl: ''
    })
  }

  const nextStep = () => {
    if (wizardStep === 1 && !formData.name) {
      alert('Please enter event name or import from URL')
      return
    }
    if (wizardStep === 2 && !formData.venue) {
      alert('Please select a venue')
      return
    }
    if (wizardStep === 3 && (!formData.date || !formData.time)) {
      alert('Please select date and time')
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Events Management</h1>
            <p className="text-gray-400">Create and manage your events</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => router.push('/admin')} className="px-4 py-2 bg-gray-600 rounded-lg">
              Back
            </button>
            <button onClick={() => setShowWizard(true)} className="px-6 py-2 bg-purple-600 rounded-lg">
              + New Event
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => (
              <div key={event.id} className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <h3 className="text-xl font-bold mb-2">{event.name}</h3>
                <p className="text-gray-400 text-sm mb-1">{event.venue}</p>
                <p className="text-gray-400 text-sm mb-1">
                  {event.date ? new Date(event.date).toLocaleDateString() : 'TBD'}
                </p>
                <p className="text-lg font-bold mb-4">${event.price}</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEdit(event)} 
                    className="flex-1 py-2 bg-blue-600/20 text-blue-400 rounded-lg"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(event.id)} 
                    className="flex-1 py-2 bg-red-600/20 text-red-400 rounded-lg"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Event Wizard Modal */}
        {showWizard && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  {editingEvent ? 'Edit Event' : 'Create New Event'}
                </h2>
                <button onClick={resetWizard} className="text-gray-400 hover:text-white">✕</button>
              </div>

              {/* Progress Indicator */}
              <div className="flex mb-8">
                {['Basic Info', 'Venue', 'Schedule', 'Review'].map((label, i) => (
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
                <div className="space-y-4">
                  {/* URL Import Section */}
                  <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-4">
                    <label className="block text-sm mb-2 text-purple-400">Import from URL (Optional)</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={scrapeUrl}
                        onChange={(e) => setScrapeUrl(e.target.value)}
                        className="flex-1 px-4 py-2 bg-white/10 rounded-lg text-sm"
                        placeholder="Paste Ticketmaster, Sulekha, or Fandango URL"
                      />
                      <button
                        onClick={scrapeEventUrl}
                        disabled={scraping || !scrapeUrl}
                        className="px-4 py-2 bg-purple-600 rounded-lg disabled:opacity-50"
                      >
                        {scraping ? '...' : '📥 Import'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Supports: Ticketmaster, Sulekha Events, Fandango
                    </p>
                  </div>

                  <div className="border-t border-gray-700 pt-4">
                    <label className="block text-sm mb-2">Event Name *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="flex-1 px-4 py-2 bg-white/10 rounded-lg"
                        placeholder="e.g., Taylor Swift Concert, Hamilton Musical"
                      />
                      <button
                        onClick={generateWithAI}
                        disabled={aiLoading || !formData.name}
                        className="px-4 py-2 bg-purple-600 rounded-lg disabled:opacity-50"
                      >
                        {aiLoading ? '...' : '✨ AI Generate'}
                      </button>
                    </div>
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
                      <option value="comedy">Comedy</option>
                      <option value="sports">Sports</option>
                      <option value="festival">Festival</option>
                      <option value="movie">Movie</option>
                    </select>
                  </div>

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

                  {formData.sourceUrl && (
                    <div className="text-xs text-gray-400">
                      Source: <a href={formData.sourceUrl} target="_blank" className="text-purple-400 hover:underline">
                        {formData.sourceUrl.substring(0, 50)}...
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Venue */}
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

              {/* Step 3: Schedule & Pricing */}
              {wizardStep === 3 && (
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

                  <div>
                    <label className="block text-sm mb-2">Base Price ($)</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold mb-4">Review Event Details</h3>
                  <div className="bg-white/5 rounded-lg p-4 space-y-2">
                    <p><span className="text-gray-400">Name:</span> {formData.name}</p>
                    <p><span className="text-gray-400">Type:</span> {formData.type}</p>
                    <p><span className="text-gray-400">Venue:</span> {formData.venue}</p>
                    <p><span className="text-gray-400">Date:</span> {formData.date}</p>
                    <p><span className="text-gray-400">Time:</span> {formData.time}</p>
                    <p><span className="text-gray-400">Price:</span> ${formData.price}</p>
                    <p><span className="text-gray-400">Capacity:</span> {formData.capacity}</p>
                    {formData.performers.length > 0 && (
                      <p><span className="text-gray-400">Performers:</span> {formData.performers.join(', ')}</p>
                    )}
                    {formData.sourceUrl && (
                      <p><span className="text-gray-400">Source:</span> <span className="text-xs">{formData.sourceUrl}</span></p>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
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
                  {wizardStep === 4 ? (editingEvent ? 'Update Event' : 'Create Event') : 'Next'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
