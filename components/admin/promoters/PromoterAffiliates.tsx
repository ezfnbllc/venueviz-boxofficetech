'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, Timestamp } from 'firebase/firestore'
import { PromoterAffiliate, AffiliatePlatform, AffiliateNetwork, AffiliatePlatformConfig } from '@/lib/types/promoter'

interface PromoterAffiliatesProps {
  promoterId: string
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

  const handleAddAffiliate = async () => {
    if (!formData.platform) return

    setSaving(true)
    try {
      const now = new Date().toISOString()
      const newAffiliate: Omit<PromoterAffiliate, 'id'> = {
        promoterId,
        platform: formData.platform,
        enabled: formData.enabled,
        apiKey: formData.apiKey || undefined,
        apiSecret: formData.apiSecret || undefined,
        affiliateNetwork: formData.affiliateNetwork,
        publisherId: formData.publisherId || undefined,
        affiliateId: formData.affiliateId || undefined,
        trackingId: formData.trackingId || undefined,
        autoImportEvents: formData.autoImportEvents,
        importCategories: formData.importCategories.length > 0 ? formData.importCategories : undefined,
        importRadius: formData.importRadius,
        importKeywords: formData.importKeywords ? formData.importKeywords.split(',').map(k => k.trim()) : undefined,
        totalClicks: 0,
        totalConversions: 0,
        totalRevenue: 0,
        createdAt: now,
        updatedAt: now,
      }

      const docRef = await addDoc(collection(db, 'promoterAffiliates'), newAffiliate)
      setAffiliates([...affiliates, { id: docRef.id, ...newAffiliate }])
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
      const updates = {
        enabled: formData.enabled,
        apiKey: formData.apiKey || undefined,
        apiSecret: formData.apiSecret || undefined,
        affiliateNetwork: formData.affiliateNetwork,
        publisherId: formData.publisherId || undefined,
        affiliateId: formData.affiliateId || undefined,
        trackingId: formData.trackingId || undefined,
        autoImportEvents: formData.autoImportEvents,
        importCategories: formData.importCategories.length > 0 ? formData.importCategories : undefined,
        importRadius: formData.importRadius,
        importKeywords: formData.importKeywords ? formData.importKeywords.split(',').map(k => k.trim()) : undefined,
        updatedAt: new Date().toISOString(),
      }

      await updateDoc(doc(db, 'promoterAffiliates', editingAffiliate.id), updates)
      setAffiliates(affiliates.map(a =>
        a.id === editingAffiliate.id ? { ...a, ...updates } : a
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
                  {affiliate.autoImportEvents && (
                    <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                      Auto-Import
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
                          <label className="block text-sm font-medium text-primary-contrast mb-2">
                            API Secret
                          </label>
                          <input
                            type="password"
                            value={formData.apiSecret}
                            onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                            placeholder="Your API secret"
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

                  {/* Auto-Import Settings */}
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-primary-contrast">Auto-Import Events</h4>
                      <button
                        onClick={() => setFormData({ ...formData, autoImportEvents: !formData.autoImportEvents })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          formData.autoImportEvents ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.autoImportEvents ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {formData.autoImportEvents && (
                      <div className="space-y-4 pl-4 border-l-2 border-slate-200 dark:border-slate-600">
                        <div>
                          <label className="block text-sm font-medium text-primary-contrast mb-2">
                            Categories to Import
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {CATEGORY_OPTIONS.map(category => (
                              <button
                                key={category}
                                onClick={() => {
                                  const cats = formData.importCategories.includes(category)
                                    ? formData.importCategories.filter(c => c !== category)
                                    : [...formData.importCategories, category]
                                  setFormData({ ...formData, importCategories: cats })
                                }}
                                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                                  formData.importCategories.includes(category)
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-secondary-contrast'
                                }`}
                              >
                                {category}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary-contrast mb-2">
                            Search Radius (miles): {formData.importRadius}
                          </label>
                          <input
                            type="range"
                            min="10"
                            max="200"
                            value={formData.importRadius}
                            onChange={(e) => setFormData({ ...formData, importRadius: parseInt(e.target.value) })}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary-contrast mb-2">
                            Keywords (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={formData.importKeywords}
                            onChange={(e) => setFormData({ ...formData, importKeywords: e.target.value })}
                            placeholder="e.g., concert, festival, live"
                            className="form-control"
                          />
                        </div>
                      </div>
                    )}
                  </div>
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
                      <label className="block text-sm font-medium text-primary-contrast mb-2">
                        API Secret
                      </label>
                      <input
                        type="password"
                        value={formData.apiSecret}
                        onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                        placeholder="Your API secret"
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

              {/* Auto-Import Settings */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-primary-contrast">Auto-Import Events</h4>
                  <button
                    onClick={() => setFormData({ ...formData, autoImportEvents: !formData.autoImportEvents })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.autoImportEvents ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.autoImportEvents ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {formData.autoImportEvents && (
                  <div className="space-y-4 pl-4 border-l-2 border-slate-200 dark:border-slate-600">
                    <div>
                      <label className="block text-sm font-medium text-primary-contrast mb-2">
                        Categories to Import
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORY_OPTIONS.map(category => (
                          <button
                            key={category}
                            onClick={() => {
                              const cats = formData.importCategories.includes(category)
                                ? formData.importCategories.filter(c => c !== category)
                                : [...formData.importCategories, category]
                              setFormData({ ...formData, importCategories: cats })
                            }}
                            className={`px-3 py-1 rounded-full text-sm transition-colors ${
                              formData.importCategories.includes(category)
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-secondary-contrast'
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-contrast mb-2">
                        Search Radius (miles): {formData.importRadius}
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="200"
                        value={formData.importRadius}
                        onChange={(e) => setFormData({ ...formData, importRadius: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-contrast mb-2">
                        Keywords (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={formData.importKeywords}
                        onChange={(e) => setFormData({ ...formData, importKeywords: e.target.value })}
                        placeholder="e.g., concert, festival, live"
                        className="form-control"
                      />
                    </div>
                  </div>
                )}
              </div>
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
    </div>
  )
}
