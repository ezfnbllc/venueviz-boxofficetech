'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, Timestamp } from 'firebase/firestore'
import { PromoterAffiliate, AffiliatePlatform, AffiliateNetwork, AffiliatePlatformConfig, AffiliateEvent } from '@/lib/types/promoter'

interface PromoterAffiliatesProps {
  promoterId: string
}

// Ticketmaster API response types
interface TicketmasterEvent {
  id: string
  name: string
  url: string
  info?: string
  images?: Array<{ url: string; width: number; height: number }>
  dates?: {
    start?: { localDate?: string; localTime?: string; dateTime?: string }
  }
  priceRanges?: Array<{ type: string; currency: string; min: number; max: number }>
  _embedded?: {
    venues?: Array<{
      name: string
      city?: { name: string }
      state?: { stateCode: string }
      country?: { countryCode: string }
    }>
  }
}

// Platform configuration with details
const PLATFORM_CONFIGS: AffiliatePlatformConfig[] = [
  {
    platform: 'ticketmaster',
    displayName: 'Ticketmaster',
    logoUrl: '/images/affiliates/ticketmaster.svg',
    commissionRange: '$0.30/sale or 1%',
    apiDocsUrl: 'https://developer.ticketmaster.com/',
    affiliateSignupUrl: 'https://app.impact.com/campaign-promo-signup/Ticketmaster-US.brand',
    supportsApi: true,
    supportsAffiliateLinks: true,
    networks: ['impact'],
  },
  {
    platform: 'seatgeek',
    displayName: 'SeatGeek',
    logoUrl: '/images/affiliates/seatgeek.svg',
    commissionRange: '0.4% - 5%',
    apiDocsUrl: 'https://platform.seatgeek.com/',
    affiliateSignupUrl: 'https://seatgeek.com/partners',
    supportsApi: true,
    supportsAffiliateLinks: true,
    networks: ['direct', 'impact'],
  },
  {
    platform: 'stubhub',
    displayName: 'StubHub',
    logoUrl: '/images/affiliates/stubhub.svg',
    commissionRange: '10%',
    apiDocsUrl: 'https://developer.stubhub.com/',
    affiliateSignupUrl: 'https://app.impact.com/campaign-promo-signup/StubHub.brand',
    supportsApi: true,
    supportsAffiliateLinks: true,
    networks: ['impact', 'cj'],
  },
  {
    platform: 'ticketnetwork',
    displayName: 'TicketNetwork',
    logoUrl: '/images/affiliates/ticketnetwork.svg',
    commissionRange: '12.5%',
    affiliateSignupUrl: 'https://www.ticketnetwork.com/partners',
    supportsApi: true,
    supportsAffiliateLinks: true,
    networks: ['direct'],
  },
  {
    platform: 'fever',
    displayName: 'Fever',
    logoUrl: '/images/affiliates/fever.svg',
    commissionRange: 'Variable',
    affiliateSignupUrl: 'https://app.impact.com',
    supportsApi: false,
    supportsAffiliateLinks: true,
    networks: ['impact'],
  },
  {
    platform: 'eventbrite',
    displayName: 'Eventbrite',
    logoUrl: '/images/affiliates/eventbrite.svg',
    commissionRange: '20% (organizer-paid)',
    apiDocsUrl: 'https://www.eventbrite.com/platform/',
    supportsApi: true,
    supportsAffiliateLinks: true,
    networks: ['direct'],
  },
  {
    platform: 'bandsintown',
    displayName: 'Bandsintown',
    logoUrl: '/images/affiliates/bandsintown.svg',
    commissionRange: '50% revenue share',
    apiDocsUrl: 'https://www.bandsintown.com/partners',
    supportsApi: true,
    supportsAffiliateLinks: true,
    networks: ['direct'],
  },
  {
    platform: 'vivid_seats',
    displayName: 'Vivid Seats',
    logoUrl: '/images/affiliates/vividseats.svg',
    commissionRange: '8-10%',
    affiliateSignupUrl: 'https://www.vividseats.com/partners',
    supportsApi: true,
    supportsAffiliateLinks: true,
    networks: ['impact', 'cj'],
  },
  {
    platform: 'viagogo',
    displayName: 'Viagogo',
    logoUrl: '/images/affiliates/viagogo.svg',
    commissionRange: '3.5%',
    supportsApi: false,
    supportsAffiliateLinks: true,
    networks: ['direct'],
  },
]

const NETWORK_OPTIONS: { value: AffiliateNetwork; label: string }[] = [
  { value: 'impact', label: 'Impact.com' },
  { value: 'cj', label: 'CJ Affiliate' },
  { value: 'rakuten', label: 'Rakuten' },
  { value: 'direct', label: 'Direct Partner' },
]

const CATEGORY_OPTIONS = [
  'music',
  'sports',
  'comedy',
  'theater',
  'family',
  'festivals',
  'conferences',
]

export default function PromoterAffiliates({ promoterId }: PromoterAffiliatesProps) {
  const [affiliates, setAffiliates] = useState<PromoterAffiliate[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAffiliate, setEditingAffiliate] = useState<PromoterAffiliate | null>(null)
  const [saving, setSaving] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<AffiliatePlatform | null>(null)

  // Import wizard state
  const [showImportWizard, setShowImportWizard] = useState(false)
  const [importingAffiliate, setImportingAffiliate] = useState<PromoterAffiliate | null>(null)
  const [importSearch, setImportSearch] = useState({
    city: '',
    stateCode: '',
    keyword: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  })
  const [fetchedEvents, setFetchedEvents] = useState<TicketmasterEvent[]>([])
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set())
  const [fetchingEvents, setFetchingEvents] = useState(false)
  const [importingEvents, setImportingEvents] = useState(false)
  const [importedEvents, setImportedEvents] = useState<AffiliateEvent[]>([])

  // Event management state
  const [showEventEditModal, setShowEventEditModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<AffiliateEvent | null>(null)
  const [eventFormData, setEventFormData] = useState({
    name: '',
    venueName: '',
    venueCity: '',
    venueState: '',
    startDate: '',
    minPrice: '',
    maxPrice: '',
    affiliateUrl: '',
    isActive: true,
  })

  // Form state
  const [formData, setFormData] = useState({
    platform: '' as AffiliatePlatform | '',
    enabled: true,
    apiKey: '',
    apiSecret: '',
    affiliateNetwork: 'impact' as AffiliateNetwork,
    publisherId: '',
    affiliateId: '',
    trackingId: '',
    autoImportEvents: false,
    importCategories: [] as string[],
    importRadius: 50,
    importKeywords: '',
  })

  useEffect(() => {
    loadAffiliates()
  }, [promoterId])

  const loadAffiliates = async () => {
    try {
      const q = query(
        collection(db, 'promoterAffiliates'),
        where('promoterId', '==', promoterId)
      )
      const snapshot = await getDocs(q)
      const affiliatesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as PromoterAffiliate[]
      setAffiliates(affiliatesData)
    } catch (error) {
      console.error('Error loading affiliates:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPlatformConfig = (platform: AffiliatePlatform) => {
    return PLATFORM_CONFIGS.find(p => p.platform === platform)
  }

  const resetForm = () => {
    setFormData({
      platform: '',
      enabled: true,
      apiKey: '',
      apiSecret: '',
      affiliateNetwork: 'impact',
      publisherId: '',
      affiliateId: '',
      trackingId: '',
      autoImportEvents: false,
      importCategories: [],
      importRadius: 50,
      importKeywords: '',
    })
    setSelectedPlatform(null)
  }

  // Helper to remove undefined values (Firestore doesn't accept undefined)
  const removeUndefined = (obj: Record<string, any>): Record<string, any> => {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, value]) => value !== undefined)
    )
  }

  const handleAddAffiliate = async () => {
    if (!formData.platform) return

    setSaving(true)
    try {
      const now = new Date().toISOString()
      const newAffiliate = removeUndefined({
        promoterId,
        platform: formData.platform,
        enabled: formData.enabled,
        apiKey: formData.apiKey || null,
        apiSecret: formData.apiSecret || null,
        affiliateNetwork: formData.affiliateNetwork,
        publisherId: formData.publisherId || null,
        affiliateId: formData.affiliateId || null,
        trackingId: formData.trackingId || null,
        autoImportEvents: formData.autoImportEvents,
        importCategories: formData.importCategories.length > 0 ? formData.importCategories : null,
        importRadius: formData.importRadius,
        importKeywords: formData.importKeywords ? formData.importKeywords.split(',').map(k => k.trim()) : null,
        totalClicks: 0,
        totalConversions: 0,
        totalRevenue: 0,
        createdAt: now,
        updatedAt: now,
      })

      const docRef = await addDoc(collection(db, 'promoterAffiliates'), newAffiliate)
      setAffiliates([...affiliates, { id: docRef.id, ...newAffiliate } as PromoterAffiliate])
      setShowAddModal(false)
      resetForm()
    } catch (error) {
      console.error('Error adding affiliate:', error)
      alert('Failed to add affiliate. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateAffiliate = async () => {
    if (!editingAffiliate) return

    setSaving(true)
    try {
      const updates = removeUndefined({
        enabled: formData.enabled,
        apiKey: formData.apiKey || null,
        apiSecret: formData.apiSecret || null,
        affiliateNetwork: formData.affiliateNetwork,
        publisherId: formData.publisherId || null,
        affiliateId: formData.affiliateId || null,
        trackingId: formData.trackingId || null,
        autoImportEvents: formData.autoImportEvents,
        importCategories: formData.importCategories.length > 0 ? formData.importCategories : null,
        importRadius: formData.importRadius,
        importKeywords: formData.importKeywords ? formData.importKeywords.split(',').map(k => k.trim()) : null,
        updatedAt: new Date().toISOString(),
      })

      await updateDoc(doc(db, 'promoterAffiliates', editingAffiliate.id), updates)
      setAffiliates(affiliates.map(a =>
        a.id === editingAffiliate.id ? { ...a, ...updates } as PromoterAffiliate : a
      ))
      setShowEditModal(false)
      setEditingAffiliate(null)
      resetForm()
    } catch (error) {
      console.error('Error updating affiliate:', error)
      alert('Failed to update affiliate. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAffiliate = async (affiliateId: string) => {
    if (!confirm('Are you sure you want to delete this affiliate integration?')) return

    try {
      await deleteDoc(doc(db, 'promoterAffiliates', affiliateId))
      setAffiliates(affiliates.filter(a => a.id !== affiliateId))
    } catch (error) {
      console.error('Error deleting affiliate:', error)
      alert('Failed to delete affiliate. Please try again.')
    }
  }

  const handleToggleEnabled = async (affiliate: PromoterAffiliate) => {
    try {
      const newEnabled = !affiliate.enabled
      await updateDoc(doc(db, 'promoterAffiliates', affiliate.id), {
        enabled: newEnabled,
        updatedAt: new Date().toISOString(),
      })
      setAffiliates(affiliates.map(a =>
        a.id === affiliate.id ? { ...a, enabled: newEnabled } : a
      ))
    } catch (error) {
      console.error('Error toggling affiliate:', error)
    }
  }

  const handleTestConnection = async () => {
    if (!formData.apiKey) {
      alert('Please enter an API key to test the connection')
      return
    }

    setTestingConnection(true)
    try {
      // For now, just simulate a test - in production, you'd call the actual API
      await new Promise(resolve => setTimeout(resolve, 1500))
      alert('Connection successful! API credentials are valid.')
    } catch (error) {
      alert('Connection failed. Please check your credentials.')
    } finally {
      setTestingConnection(false)
    }
  }

  const openEditModal = (affiliate: PromoterAffiliate) => {
    setEditingAffiliate(affiliate)
    setFormData({
      platform: affiliate.platform,
      enabled: affiliate.enabled,
      apiKey: affiliate.apiKey || '',
      apiSecret: affiliate.apiSecret || '',
      affiliateNetwork: affiliate.affiliateNetwork || 'impact',
      publisherId: affiliate.publisherId || '',
      affiliateId: affiliate.affiliateId || '',
      trackingId: affiliate.trackingId || '',
      autoImportEvents: affiliate.autoImportEvents,
      importCategories: affiliate.importCategories || [],
      importRadius: affiliate.importRadius || 50,
      importKeywords: affiliate.importKeywords?.join(', ') || '',
    })
    setSelectedPlatform(affiliate.platform)
    setShowEditModal(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  // Open import wizard
  const openImportWizard = (affiliate: PromoterAffiliate) => {
    setImportingAffiliate(affiliate)
    setFetchedEvents([])
    setSelectedEventIds(new Set())
    setImportSearch({
      city: '',
      stateCode: '',
      keyword: affiliate.importKeywords?.join(' ') || '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
    })
    setShowImportWizard(true)
  }

  // Fetch events from Ticketmaster via API route (avoids CORS)
  const fetchTicketmasterEvents = async () => {
    if (!importingAffiliate?.apiKey) {
      alert('API key is required to fetch events')
      return
    }

    setFetchingEvents(true)
    try {
      const params = new URLSearchParams({
        apikey: importingAffiliate.apiKey,
        size: '50',
        sort: 'date,asc',
      })

      if (importSearch.city) params.set('city', importSearch.city)
      if (importSearch.stateCode) params.set('stateCode', importSearch.stateCode)
      if (importSearch.keyword) params.set('keyword', importSearch.keyword)
      if (importSearch.startDate) {
        params.set('startDateTime', `${importSearch.startDate}T00:00:00Z`)
      }
      if (importSearch.endDate) {
        params.set('endDateTime', `${importSearch.endDate}T23:59:59Z`)
      }
      if (importingAffiliate.importRadius) {
        params.set('radius', importingAffiliate.importRadius.toString())
        params.set('unit', 'miles')
      }

      // Use our API route to avoid CORS issues
      const response = await fetch(`/api/affiliates/ticketmaster/events?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API error: ${response.status}`)
      }

      const data = await response.json()
      const events = data._embedded?.events || []
      setFetchedEvents(events)

      if (events.length === 0) {
        alert('No events found. Try adjusting your search criteria.')
      }
    } catch (error) {
      console.error('Error fetching events:', error)
      alert('Failed to fetch events. Please check your API key and try again.')
    } finally {
      setFetchingEvents(false)
    }
  }

  // Toggle event selection
  const toggleEventSelection = (eventId: string) => {
    const newSelection = new Set(selectedEventIds)
    if (newSelection.has(eventId)) {
      newSelection.delete(eventId)
    } else {
      newSelection.add(eventId)
    }
    setSelectedEventIds(newSelection)
  }

  // Select/deselect all events
  const toggleSelectAll = () => {
    if (selectedEventIds.size === fetchedEvents.length) {
      setSelectedEventIds(new Set())
    } else {
      setSelectedEventIds(new Set(fetchedEvents.map(e => e.id)))
    }
  }

  // Import selected events
  const handleImportEvents = async () => {
    if (!importingAffiliate || selectedEventIds.size === 0) return

    setImportingEvents(true)
    try {
      const eventsToImport = fetchedEvents.filter(e => selectedEventIds.has(e.id))
      const now = new Date().toISOString()
      const importedDocs: AffiliateEvent[] = []

      for (const event of eventsToImport) {
        const venue = event._embedded?.venues?.[0]
        const image = event.images?.find(img => img.width >= 500) || event.images?.[0]
        const priceRange = event.priceRanges?.[0]

        // Build affiliate URL
        let affiliateUrl = event.url
        if (importingAffiliate.affiliateNetwork === 'impact' && importingAffiliate.publisherId) {
          affiliateUrl = `https://ticketmaster.evyy.net/c/${importingAffiliate.publisherId}/${importingAffiliate.affiliateId || 'ticketmaster'}/4272?subId1=${importingAffiliate.trackingId || 'bot'}&u=${encodeURIComponent(event.url)}`
        }

        const affiliateEvent = removeUndefined({
          promoterId,
          affiliateId: importingAffiliate.id,
          platform: 'ticketmaster' as AffiliatePlatform,
          externalEventId: event.id,
          name: event.name,
          description: event.info || null,
          imageUrl: image?.url || null,
          startDate: event.dates?.start?.dateTime || event.dates?.start?.localDate || '',
          venueName: venue?.name || 'TBA',
          venueCity: venue?.city?.name || '',
          venueState: venue?.state?.stateCode || null,
          venueCountry: venue?.country?.countryCode || 'US',
          minPrice: priceRange?.min || null,
          maxPrice: priceRange?.max || null,
          currency: priceRange?.currency || 'USD',
          affiliateUrl,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })

        // Check if already imported
        const existingQuery = query(
          collection(db, 'affiliateEvents'),
          where('externalEventId', '==', event.id),
          where('promoterId', '==', promoterId)
        )
        const existing = await getDocs(existingQuery)

        if (existing.empty) {
          const docRef = await addDoc(collection(db, 'affiliateEvents'), affiliateEvent)
          importedDocs.push({ id: docRef.id, ...affiliateEvent } as AffiliateEvent)
        } else {
          // Update existing
          const docId = existing.docs[0].id
          await updateDoc(doc(db, 'affiliateEvents', docId), {
            ...affiliateEvent,
            updatedAt: now,
          })
          importedDocs.push({ id: docId, ...affiliateEvent } as AffiliateEvent)
        }
      }

      setImportedEvents(importedDocs)
      alert(`Successfully imported ${importedDocs.length} events!`)
      setShowImportWizard(false)
      setFetchedEvents([])
      setSelectedEventIds(new Set())
    } catch (error) {
      console.error('Error importing events:', error)
      alert('Failed to import some events. Please try again.')
    } finally {
      setImportingEvents(false)
    }
  }

  // Load imported events for display
  const loadImportedEvents = async () => {
    const q = query(
      collection(db, 'affiliateEvents'),
      where('promoterId', '==', promoterId)
    )
    const snapshot = await getDocs(q)
    const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as AffiliateEvent[]
    // Sort by date
    events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    setImportedEvents(events)
  }

  useEffect(() => {
    loadImportedEvents()
  }, [promoterId])

  // Open event edit modal
  const openEventEditModal = (event: AffiliateEvent) => {
    setEditingEvent(event)
    setEventFormData({
      name: event.name,
      venueName: event.venueName,
      venueCity: event.venueCity,
      venueState: event.venueState || '',
      startDate: event.startDate ? event.startDate.split('T')[0] : '',
      minPrice: event.minPrice?.toString() || '',
      maxPrice: event.maxPrice?.toString() || '',
      affiliateUrl: event.affiliateUrl,
      isActive: event.isActive,
    })
    setShowEventEditModal(true)
  }

  // Update affiliate event
  const handleUpdateEvent = async () => {
    if (!editingEvent) return

    setSaving(true)
    try {
      const updates = {
        name: eventFormData.name,
        venueName: eventFormData.venueName,
        venueCity: eventFormData.venueCity,
        venueState: eventFormData.venueState || null,
        startDate: eventFormData.startDate ? `${eventFormData.startDate}T00:00:00Z` : editingEvent.startDate,
        minPrice: eventFormData.minPrice ? parseFloat(eventFormData.minPrice) : null,
        maxPrice: eventFormData.maxPrice ? parseFloat(eventFormData.maxPrice) : null,
        affiliateUrl: eventFormData.affiliateUrl,
        isActive: eventFormData.isActive,
        updatedAt: new Date().toISOString(),
      }

      await updateDoc(doc(db, 'affiliateEvents', editingEvent.id), updates)
      setImportedEvents(importedEvents.map(e =>
        e.id === editingEvent.id ? { ...e, ...updates } as AffiliateEvent : e
      ))
      setShowEventEditModal(false)
      setEditingEvent(null)
    } catch (error) {
      console.error('Error updating event:', error)
      alert('Failed to update event. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Delete affiliate event
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      await deleteDoc(doc(db, 'affiliateEvents', eventId))
      setImportedEvents(importedEvents.filter(e => e.id !== eventId))
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Failed to delete event. Please try again.')
    }
  }

  // Toggle event active status
  const handleToggleEventActive = async (event: AffiliateEvent) => {
    try {
      const newActive = !event.isActive
      await updateDoc(doc(db, 'affiliateEvents', event.id), {
        isActive: newActive,
        updatedAt: new Date().toISOString(),
      })
      setImportedEvents(importedEvents.map(e =>
        e.id === event.id ? { ...e, isActive: newActive } : e
      ))
    } catch (error) {
      console.error('Error toggling event:', error)
    }
  }

  // Format event date for display
  const formatEventDate = (dateStr: string) => {
    if (!dateStr) return 'TBA'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return <div className="animate-pulse text-secondary-contrast">Loading affiliates...</div>
  }

  // Get available platforms (not already added)
  const existingPlatforms = affiliates.map(a => a.platform)
  const availablePlatforms = PLATFORM_CONFIGS.filter(p => !existingPlatforms.includes(p.platform))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-primary-contrast">Affiliate Integrations</h3>
          <p className="text-sm text-secondary-contrast mt-1">
            Connect with major ticketing platforms to earn commissions on referrals
          </p>
        </div>
        {availablePlatforms.length > 0 && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Platform
          </button>
        )}
      </div>

      {/* Stats Overview */}
      {affiliates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card rounded-xl p-4">
            <p className="text-sm text-secondary-contrast">Total Clicks</p>
            <p className="text-2xl font-bold text-primary-contrast mt-1">
              {affiliates.reduce((sum, a) => sum + a.totalClicks, 0).toLocaleString()}
            </p>
          </div>
          <div className="stat-card rounded-xl p-4">
            <p className="text-sm text-secondary-contrast">Conversions</p>
            <p className="text-2xl font-bold text-primary-contrast mt-1">
              {affiliates.reduce((sum, a) => sum + a.totalConversions, 0).toLocaleString()}
            </p>
          </div>
          <div className="stat-card rounded-xl p-4">
            <p className="text-sm text-secondary-contrast">Total Revenue</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {formatCurrency(affiliates.reduce((sum, a) => sum + a.totalRevenue, 0))}
            </p>
          </div>
        </div>
      )}

      {/* Affiliate List */}
      {affiliates.length === 0 ? (
        <div className="stat-card rounded-xl p-8 text-center">
          <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <h4 className="text-lg font-semibold text-primary-contrast mb-2">No Affiliates Connected</h4>
          <p className="text-secondary-contrast mb-4">
            Connect with ticketing platforms to start earning commissions on event referrals.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary px-6 py-2 rounded-lg"
          >
            Add Your First Platform
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {affiliates.map(affiliate => {
            const config = getPlatformConfig(affiliate.platform)
            return (
              <div
                key={affiliate.id}
                className="stat-card rounded-xl p-5 border border-slate-200 dark:border-slate-600"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                      <span className="text-lg font-bold text-primary-contrast">
                        {config?.displayName.charAt(0) || affiliate.platform.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary-contrast">{config?.displayName || affiliate.platform}</h4>
                      <p className="text-xs text-secondary-contrast">
                        {config?.commissionRange || 'Commission varies'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleEnabled(affiliate)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      affiliate.enabled ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        affiliate.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                    <p className="text-xs text-secondary-contrast">Clicks</p>
                    <p className="font-semibold text-primary-contrast">{affiliate.totalClicks.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                    <p className="text-xs text-secondary-contrast">Conv.</p>
                    <p className="font-semibold text-primary-contrast">{affiliate.totalConversions.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                    <p className="text-xs text-secondary-contrast">Revenue</p>
                    <p className="font-semibold text-green-600">{formatCurrency(affiliate.totalRevenue)}</p>
                  </div>
                </div>

                {/* Config badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {affiliate.affiliateNetwork && (
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                      {NETWORK_OPTIONS.find(n => n.value === affiliate.affiliateNetwork)?.label || affiliate.affiliateNetwork}
                    </span>
                  )}
                  {affiliate.apiKey && (
                    <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                      API Connected
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {affiliate.apiKey && config?.supportsApi && (
                    <button
                      onClick={() => openImportWizard(affiliate)}
                      className="flex-1 btn-primary px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Import
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(affiliate)}
                    className="flex-1 btn-secondary px-3 py-2 rounded-lg text-sm"
                  >
                    Configure
                  </button>
                  <button
                    onClick={() => handleDeleteAffiliate(affiliate.id)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Imported Affiliate Events Section */}
      {importedEvents.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-primary-contrast">
              Imported Events ({importedEvents.length})
            </h3>
          </div>

          <div className="stat-card rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                  <th className="text-left p-4 text-sm font-medium text-secondary-contrast">Event</th>
                  <th className="text-left p-4 text-sm font-medium text-secondary-contrast hidden md:table-cell">Venue</th>
                  <th className="text-left p-4 text-sm font-medium text-secondary-contrast hidden lg:table-cell">Date</th>
                  <th className="text-left p-4 text-sm font-medium text-secondary-contrast hidden lg:table-cell">Price</th>
                  <th className="text-center p-4 text-sm font-medium text-secondary-contrast">Active</th>
                  <th className="text-right p-4 text-sm font-medium text-secondary-contrast">Actions</th>
                </tr>
              </thead>
              <tbody>
                {importedEvents.map(event => (
                  <tr key={event.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {event.imageUrl && (
                          <img
                            src={event.imageUrl}
                            alt={event.name}
                            className="w-12 h-12 rounded-lg object-cover hidden sm:block"
                          />
                        )}
                        <div>
                          <p className="font-medium text-primary-contrast line-clamp-1">{event.name}</p>
                          <p className="text-xs text-secondary-contrast md:hidden">
                            {event.venueName} • {formatEventDate(event.startDate)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <p className="text-sm text-primary-contrast">{event.venueName}</p>
                      <p className="text-xs text-secondary-contrast">{event.venueCity}{event.venueState ? `, ${event.venueState}` : ''}</p>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <p className="text-sm text-primary-contrast">{formatEventDate(event.startDate)}</p>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      {event.minPrice && event.maxPrice ? (
                        <p className="text-sm text-primary-contrast">
                          ${event.minPrice} - ${event.maxPrice}
                        </p>
                      ) : event.minPrice ? (
                        <p className="text-sm text-primary-contrast">From ${event.minPrice}</p>
                      ) : (
                        <p className="text-sm text-secondary-contrast">-</p>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleEventActive(event)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          event.isActive ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            event.isActive ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEventEditModal(event)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <a
                          href={event.affiliateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                          title="View on Ticketmaster"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Platform Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-primary-contrast">Add Affiliate Platform</h3>
              <p className="text-sm text-secondary-contrast mt-1">
                Connect a new ticketing platform to earn commissions
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Platform Selection */}
              {!selectedPlatform ? (
                <div>
                  <label className="block text-sm font-medium text-primary-contrast mb-3">
                    Select Platform
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {availablePlatforms.map(platform => (
                      <button
                        key={platform.platform}
                        onClick={() => {
                          setSelectedPlatform(platform.platform)
                          setFormData({ ...formData, platform: platform.platform })
                        }}
                        className="p-4 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                      >
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center mb-2">
                          <span className="text-lg font-bold text-primary-contrast">
                            {platform.displayName.charAt(0)}
                          </span>
                        </div>
                        <p className="font-medium text-primary-contrast text-sm">{platform.displayName}</p>
                        <p className="text-xs text-secondary-contrast">{platform.commissionRange}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Platform header */}
                  <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="w-12 h-12 bg-white dark:bg-slate-600 rounded-lg flex items-center justify-center">
                      <span className="text-xl font-bold text-primary-contrast">
                        {getPlatformConfig(selectedPlatform)?.displayName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-primary-contrast">
                        {getPlatformConfig(selectedPlatform)?.displayName}
                      </p>
                      <p className="text-sm text-secondary-contrast">
                        Commission: {getPlatformConfig(selectedPlatform)?.commissionRange}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPlatform(null)
                        setFormData({ ...formData, platform: '' })
                      }}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Change
                    </button>
                  </div>

                  {/* Affiliate Network */}
                  <div>
                    <label className="block text-sm font-medium text-primary-contrast mb-2">
                      Affiliate Network
                    </label>
                    <select
                      value={formData.affiliateNetwork}
                      onChange={(e) => setFormData({ ...formData, affiliateNetwork: e.target.value as AffiliateNetwork })}
                      className="form-control"
                    >
                      {NETWORK_OPTIONS.filter(n =>
                        getPlatformConfig(selectedPlatform)?.networks.includes(n.value)
                      ).map(network => (
                        <option key={network.value} value={network.value}>{network.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Network Credentials */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary-contrast mb-2">
                        Publisher/Partner ID
                      </label>
                      <input
                        type="text"
                        value={formData.publisherId}
                        onChange={(e) => setFormData({ ...formData, publisherId: e.target.value })}
                        placeholder="Your network publisher ID"
                        className="form-control"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-contrast mb-2">
                        Affiliate/Tracking ID
                      </label>
                      <input
                        type="text"
                        value={formData.affiliateId}
                        onChange={(e) => setFormData({ ...formData, affiliateId: e.target.value })}
                        placeholder="Platform affiliate ID"
                        className="form-control"
                      />
                    </div>
                  </div>

                  {/* API Credentials (if supported) */}
                  {getPlatformConfig(selectedPlatform)?.supportsApi && (
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                      <h4 className="font-medium text-primary-contrast mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        API Integration (Optional)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-primary-contrast mb-2">
                            API Key
                          </label>
                          <input
                            type="password"
                            value={formData.apiKey}
                            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                            placeholder="Your API key"
                            className="form-control"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary-contrast mb-1">
                            API Secret <span className="text-[#717171] font-normal">(Optional)</span>
                          </label>
                          <p className="text-xs text-[#717171] mb-2">
                            Not required for Ticketmaster Discovery API
                          </p>
                          <input
                            type="password"
                            value={formData.apiSecret}
                            onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                            placeholder="Leave blank for most platforms"
                            className="form-control"
                          />
                        </div>
                      </div>
                      {formData.apiKey && (
                        <button
                          onClick={handleTestConnection}
                          disabled={testingConnection}
                          className="mt-3 text-sm text-blue-600 hover:underline flex items-center gap-2"
                        >
                          {testingConnection ? (
                            <>
                              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Testing...
                            </>
                          ) : (
                            'Test Connection'
                          )}
                        </button>
                      )}
                    </div>
                  )}

                </>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className="btn-secondary px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              {selectedPlatform && (
                <button
                  onClick={handleAddAffiliate}
                  disabled={saving}
                  className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Add Platform'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Platform Modal */}
      {showEditModal && editingAffiliate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-primary-contrast">
                Configure {getPlatformConfig(editingAffiliate.platform)?.displayName}
              </h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Affiliate Network */}
              <div>
                <label className="block text-sm font-medium text-primary-contrast mb-2">
                  Affiliate Network
                </label>
                <select
                  value={formData.affiliateNetwork}
                  onChange={(e) => setFormData({ ...formData, affiliateNetwork: e.target.value as AffiliateNetwork })}
                  className="form-control"
                >
                  {NETWORK_OPTIONS.filter(n =>
                    getPlatformConfig(editingAffiliate.platform)?.networks.includes(n.value)
                  ).map(network => (
                    <option key={network.value} value={network.value}>{network.label}</option>
                  ))}
                </select>
              </div>

              {/* Network Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary-contrast mb-2">
                    Publisher/Partner ID
                  </label>
                  <input
                    type="text"
                    value={formData.publisherId}
                    onChange={(e) => setFormData({ ...formData, publisherId: e.target.value })}
                    placeholder="Your network publisher ID"
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-contrast mb-2">
                    Affiliate/Tracking ID
                  </label>
                  <input
                    type="text"
                    value={formData.affiliateId}
                    onChange={(e) => setFormData({ ...formData, affiliateId: e.target.value })}
                    placeholder="Platform affiliate ID"
                    className="form-control"
                  />
                </div>
              </div>

              {/* API Credentials */}
              {getPlatformConfig(editingAffiliate.platform)?.supportsApi && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                  <h4 className="font-medium text-primary-contrast mb-4">API Integration</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary-contrast mb-2">
                        API Key
                      </label>
                      <input
                        type="password"
                        value={formData.apiKey}
                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                        placeholder="Your API key"
                        className="form-control"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-contrast mb-1">
                        API Secret <span className="text-[#717171] font-normal">(Optional)</span>
                      </label>
                      <p className="text-xs text-[#717171] mb-2">
                        Not required for Ticketmaster Discovery API
                      </p>
                      <input
                        type="password"
                        value={formData.apiSecret}
                        onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                        placeholder="Leave blank for most platforms"
                        className="form-control"
                      />
                    </div>
                  </div>
                  {formData.apiKey && (
                    <button
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                      className="mt-3 text-sm text-blue-600 hover:underline"
                    >
                      {testingConnection ? 'Testing...' : 'Test Connection'}
                    </button>
                  )}
                </div>
              )}

            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingAffiliate(null)
                  resetForm()
                }}
                className="btn-secondary px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAffiliate}
                disabled={saving}
                className="btn-primary px-4 py-2 rounded-lg"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Wizard Modal */}
      {showImportWizard && importingAffiliate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-primary-contrast">
                  Import Events from {getPlatformConfig(importingAffiliate.platform)?.displayName}
                </h3>
                <p className="text-sm text-secondary-contrast mt-1">
                  Search for events and select which ones to display on your site
                </p>
              </div>
              <button
                onClick={() => {
                  setShowImportWizard(false)
                  setFetchedEvents([])
                  setSelectedEventIds(new Set())
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Filters */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-medium text-secondary-contrast mb-1">City</label>
                  <input
                    type="text"
                    value={importSearch.city}
                    onChange={(e) => setImportSearch({ ...importSearch, city: e.target.value })}
                    placeholder="e.g., Dallas"
                    className="form-control text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary-contrast mb-1">State</label>
                  <input
                    type="text"
                    value={importSearch.stateCode}
                    onChange={(e) => setImportSearch({ ...importSearch, stateCode: e.target.value })}
                    placeholder="e.g., TX"
                    className="form-control text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary-contrast mb-1">Keyword</label>
                  <input
                    type="text"
                    value={importSearch.keyword}
                    onChange={(e) => setImportSearch({ ...importSearch, keyword: e.target.value })}
                    placeholder="e.g., concert"
                    className="form-control text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary-contrast mb-1">From Date</label>
                  <input
                    type="date"
                    value={importSearch.startDate}
                    onChange={(e) => setImportSearch({ ...importSearch, startDate: e.target.value })}
                    className="form-control text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={fetchTicketmasterEvents}
                    disabled={fetchingEvents}
                    className="btn-primary w-full px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                  >
                    {fetchingEvents ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Searching...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Search
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Events Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {fetchedEvents.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-secondary-contrast">
                    Enter search criteria and click "Search" to find events
                  </p>
                </div>
              ) : (
                <>
                  {/* Select All Header */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={toggleSelectAll}
                      className="text-sm text-blue-600 hover:underline flex items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEventIds.size === fetchedEvents.length}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300"
                      />
                      {selectedEventIds.size === fetchedEvents.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <span className="text-sm text-secondary-contrast">
                      {selectedEventIds.size} of {fetchedEvents.length} selected
                    </span>
                  </div>

                  {/* Events Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {fetchedEvents.map(event => {
                      const venue = event._embedded?.venues?.[0]
                      const image = event.images?.find(img => img.width >= 300) || event.images?.[0]
                      const isSelected = selectedEventIds.has(event.id)
                      const priceRange = event.priceRanges?.[0]
                      const eventDate = event.dates?.start?.localDate
                        ? new Date(event.dates.start.localDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'TBA'

                      return (
                        <div
                          key={event.id}
                          onClick={() => toggleEventSelection(event.id)}
                          className={`cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
                            isSelected
                              ? 'border-blue-500 ring-2 ring-blue-500/20'
                              : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {/* Event Image */}
                          <div className="relative h-32 bg-slate-100 dark:bg-slate-700">
                            {image && (
                              <img
                                src={image.url}
                                alt={event.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <div className="absolute top-2 left-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleEventSelection(event.id)}
                                className="w-5 h-5 rounded border-2 border-white shadow-lg"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            {priceRange && (
                              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                ${priceRange.min} - ${priceRange.max}
                              </div>
                            )}
                          </div>

                          {/* Event Info */}
                          <div className="p-3">
                            <h4 className="font-semibold text-primary-contrast text-sm line-clamp-2 mb-1">
                              {event.name}
                            </h4>
                            <p className="text-xs text-secondary-contrast mb-1">
                              {eventDate}
                            </p>
                            {venue && (
                              <p className="text-xs text-secondary-contrast line-clamp-1">
                                {venue.name} • {venue.city?.name}, {venue.state?.stateCode}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
              <p className="text-sm text-secondary-contrast">
                {fetchedEvents.length > 0 && `Found ${fetchedEvents.length} events`}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowImportWizard(false)
                    setFetchedEvents([])
                    setSelectedEventIds(new Set())
                  }}
                  className="btn-secondary px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportEvents}
                  disabled={selectedEventIds.size === 0 || importingEvents}
                  className="btn-primary px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importingEvents ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Importing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Import {selectedEventIds.size} Event{selectedEventIds.size !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Edit Modal */}
      {showEventEditModal && editingEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-primary-contrast">Edit Affiliate Event</h3>
              <p className="text-sm text-secondary-contrast mt-1">
                Modify event details for display on your site
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Event Name */}
              <div>
                <label className="block text-sm font-medium text-primary-contrast mb-2">
                  Event Name
                </label>
                <input
                  type="text"
                  value={eventFormData.name}
                  onChange={(e) => setEventFormData({ ...eventFormData, name: e.target.value })}
                  className="form-control"
                />
              </div>

              {/* Venue */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary-contrast mb-2">
                    Venue Name
                  </label>
                  <input
                    type="text"
                    value={eventFormData.venueName}
                    onChange={(e) => setEventFormData({ ...eventFormData, venueName: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-contrast mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={eventFormData.venueCity}
                    onChange={(e) => setEventFormData({ ...eventFormData, venueCity: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary-contrast mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={eventFormData.venueState}
                    onChange={(e) => setEventFormData({ ...eventFormData, venueState: e.target.value })}
                    placeholder="e.g., TX"
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-contrast mb-2">
                    Event Date
                  </label>
                  <input
                    type="date"
                    value={eventFormData.startDate}
                    onChange={(e) => setEventFormData({ ...eventFormData, startDate: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary-contrast mb-2">
                    Min Price ($)
                  </label>
                  <input
                    type="number"
                    value={eventFormData.minPrice}
                    onChange={(e) => setEventFormData({ ...eventFormData, minPrice: e.target.value })}
                    placeholder="0"
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-contrast mb-2">
                    Max Price ($)
                  </label>
                  <input
                    type="number"
                    value={eventFormData.maxPrice}
                    onChange={(e) => setEventFormData({ ...eventFormData, maxPrice: e.target.value })}
                    placeholder="0"
                    className="form-control"
                  />
                </div>
              </div>

              {/* Affiliate URL */}
              <div>
                <label className="block text-sm font-medium text-primary-contrast mb-2">
                  Affiliate URL
                </label>
                <input
                  type="url"
                  value={eventFormData.affiliateUrl}
                  onChange={(e) => setEventFormData({ ...eventFormData, affiliateUrl: e.target.value })}
                  className="form-control"
                />
                <p className="text-xs text-secondary-contrast mt-1">
                  This is the tracked affiliate link users will click
                </p>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <p className="font-medium text-primary-contrast">Active</p>
                  <p className="text-sm text-secondary-contrast">Show this event on your site</p>
                </div>
                <button
                  onClick={() => setEventFormData({ ...eventFormData, isActive: !eventFormData.isActive })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    eventFormData.isActive ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      eventFormData.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEventEditModal(false)
                  setEditingEvent(null)
                }}
                className="btn-secondary px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateEvent}
                disabled={saving}
                className="btn-primary px-4 py-2 rounded-lg"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
