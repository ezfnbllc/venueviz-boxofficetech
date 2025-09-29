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
      time: event.schedule?.startTime || event.time || ''
    })
    setShowWizard(true)
    setWizardStep(1)
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Events Management</h1>
            <p className="text-gray-400">Create and manage events</p>
          </div>
          <button onClick={() => setShowWizard(true)} className="px-6 py-2 bg-purple-600 rounded-lg">
            + Create Event
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 bg-black/40 rounded-xl">
            <p className="text-gray-400 mb-4">No events yet</p>
            <button onClick={() => setShowWizard(true)} className="px-6 py-2 bg-purple-600 rounded-lg">
              Create First Event
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {events.map(event => (
              <div key={event.id} className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-xl font-bold mb-2">{event.name}</h3>
                    <p className="text-gray-400">{event.venueName || event.venue}</p>
                  </div>
                  <button onClick={() => handleEdit(event)} className="px-4 py-2 bg-blue-600 rounded-lg">
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
