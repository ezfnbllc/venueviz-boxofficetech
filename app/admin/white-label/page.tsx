'use client'

import { useState, useEffect } from 'react'
import { usePromoterAccess } from '@/lib/hooks/usePromoterAccess'
import { AdminService } from '@/lib/admin/adminService'
import { PromoterProfile } from '@/lib/types/promoter'

type TabType = 'tenants' | 'branding' | 'domains' | 'billing'

export default function WhiteLabelPage() {
  const [activeTab, setActiveTab] = useState<TabType>('branding')
  const [loading, setLoading] = useState(true)
  const [promoters, setPromoters] = useState<PromoterProfile[]>([])
  const [selectedPromoter, setSelectedPromoter] = useState<PromoterProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Branding form state
  const [brandingForm, setBrandingForm] = useState({
    name: '',
    logo: '',
    brandingType: 'basic' as 'basic' | 'advanced',
    colorScheme: {
      primary: '#3B82F6',
      secondary: '#6366F1',
      accent: '#F59E0B',
      background: '#FFFFFF',
      text: '#111827',
    },
    website: '',
    description: '',
  })

  const { isAdmin, effectivePromoterId, showAll } = usePromoterAccess()

  useEffect(() => {
    loadData()
  }, [effectivePromoterId, showAll])

  const loadData = async () => {
    setLoading(true)
    try {
      const allPromoters = await AdminService.getPromoters()

      if (showAll) {
        // Admin sees all promoters
        setPromoters(allPromoters)
        if (allPromoters.length > 0) {
          setSelectedPromoter(allPromoters[0])
          populateForm(allPromoters[0])
        }
      } else {
        // Promoter sees only their own
        const myPromoter = allPromoters.find(p => p.id === effectivePromoterId)
        if (myPromoter) {
          setPromoters([myPromoter])
          setSelectedPromoter(myPromoter)
          populateForm(myPromoter)
        }
      }
    } catch (error) {
      console.error('Error loading promoters:', error)
      setMessage({ type: 'error', text: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  const populateForm = (promoter: PromoterProfile) => {
    setBrandingForm({
      name: promoter.name || '',
      logo: promoter.logo || '',
      brandingType: promoter.brandingType || 'basic',
      colorScheme: {
        primary: promoter.colorScheme?.primary || '#3B82F6',
        secondary: promoter.colorScheme?.secondary || '#6366F1',
        accent: promoter.colorScheme?.accent || '#F59E0B',
        background: promoter.colorScheme?.background || '#FFFFFF',
        text: promoter.colorScheme?.text || '#111827',
      },
      website: promoter.website || '',
      description: promoter.description || '',
    })
  }

  const handleSelectPromoter = (promoter: PromoterProfile) => {
    setSelectedPromoter(promoter)
    populateForm(promoter)
  }

  const handleSaveBranding = async () => {
    if (!selectedPromoter) return

    setSaving(true)
    setMessage(null)

    try {
      await AdminService.updatePromoter(selectedPromoter.id, {
        name: brandingForm.name,
        logo: brandingForm.logo,
        brandingType: brandingForm.brandingType,
        colorScheme: brandingForm.colorScheme,
        website: brandingForm.website,
        description: brandingForm.description,
      })

      setMessage({ type: 'success', text: 'Branding saved successfully!' })

      // Refresh data
      await loadData()
    } catch (error) {
      console.error('Error saving branding:', error)
      setMessage({ type: 'error', text: 'Failed to save branding' })
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (active: boolean) => {
    return active
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : 'bg-red-500/20 text-red-400 border-red-500/30'
  }

  const getPlanColor = (brandingType: string) => {
    return brandingType === 'advanced'
      ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  }

  // Stats calculated from real data
  const stats = {
    totalTenants: promoters.length,
    activeTenants: promoters.filter(p => p.active).length,
    advancedPlans: promoters.filter(p => p.brandingType === 'advanced').length,
    basicPlans: promoters.filter(p => p.brandingType === 'basic').length,
    withLogos: promoters.filter(p => p.logo).length,
    withWebsites: promoters.filter(p => p.website).length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isAdmin ? 'White-Label Platform' : 'Your Branding'}
          </h1>
          <p className="text-slate-600 dark:text-gray-400 mt-1">
            {isAdmin
              ? 'Manage promoter branding and platform settings'
              : 'Customize your portal appearance and branding'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
              + Add Promoter
            </button>
          </div>
        )}
      </div>

      {/* Stats - Admin Only */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
            <p className="text-slate-500 dark:text-gray-400 text-xs">Total Promoters</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalTenants}</p>
          </div>
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
            <p className="text-slate-500 dark:text-gray-400 text-xs">Active</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.activeTenants}</p>
          </div>
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
            <p className="text-slate-500 dark:text-gray-400 text-xs">Advanced Plans</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.advancedPlans}</p>
          </div>
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
            <p className="text-slate-500 dark:text-gray-400 text-xs">Basic Plans</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.basicPlans}</p>
          </div>
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
            <p className="text-slate-500 dark:text-gray-400 text-xs">With Logos</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.withLogos}</p>
          </div>
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
            <p className="text-slate-500 dark:text-gray-400 text-xs">With Websites</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.withWebsites}</p>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs - Show different tabs based on role */}
      <div className="flex gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-lg w-fit">
        {(isAdmin ? ['tenants', 'branding', 'domains', 'billing'] as const : ['branding'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'bg-purple-600 text-white'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            {tab === 'tenants' ? 'Promoters' : tab}
          </button>
        ))}
      </div>

      {/* Tenants/Promoters Tab - Admin Only */}
      {activeTab === 'tenants' && isAdmin && (
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Promoter</th>
                <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Portal</th>
                <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Plan</th>
                <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Status</th>
                <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Commission</th>
                <th className="text-right p-4 text-slate-500 dark:text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promoters.map((promoter) => (
                <tr key={promoter.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {promoter.logo ? (
                        <img
                          src={promoter.logo}
                          alt={promoter.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-gray-400">
                          {promoter.name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        <p className="text-slate-900 dark:text-white font-medium">{promoter.name}</p>
                        <p className="text-slate-500 dark:text-gray-400 text-sm">{promoter.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {promoter.slug ? (
                      <a
                        href={`/p/${promoter.slug}`}
                        target="_blank"
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-500"
                      >
                        /p/{promoter.slug}
                      </a>
                    ) : (
                      <span className="text-slate-400">Not configured</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs border capitalize ${getPlanColor(promoter.brandingType)}`}>
                      {promoter.brandingType || 'Basic'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(promoter.active)}`}>
                      {promoter.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-900 dark:text-white">{promoter.commission}%</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        handleSelectPromoter(promoter)
                        setActiveTab('branding')
                      }}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors mr-2"
                    >
                      Edit Branding
                    </button>
                  </td>
                </tr>
              ))}
              {promoters.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-gray-400">
                    No promoters found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Branding Tab */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Promoter Selector - Admin Only */}
          {isAdmin && promoters.length > 1 && (
            <div className="lg:col-span-1 bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Select Promoter</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {promoters.map(promoter => (
                  <button
                    key={promoter.id}
                    onClick={() => handleSelectPromoter(promoter)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      selectedPromoter?.id === promoter.id
                        ? 'bg-purple-500/20 border border-purple-500/30'
                        : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    {promoter.logo ? (
                      <img src={promoter.logo} alt={promoter.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-gray-400">
                        {promoter.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 dark:text-white font-medium truncate">{promoter.name}</p>
                      <p className="text-slate-500 dark:text-gray-400 text-sm capitalize">{promoter.brandingType} Plan</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Branding Form */}
          <div className={`${isAdmin && promoters.length > 1 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {selectedPromoter ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Basic Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-slate-600 dark:text-gray-400 text-sm">Promoter Name</label>
                      <input
                        type="text"
                        value={brandingForm.name}
                        onChange={(e) => setBrandingForm({ ...brandingForm, name: e.target.value })}
                        className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-gray-400 text-sm">Logo URL</label>
                      <input
                        type="url"
                        value={brandingForm.logo}
                        onChange={(e) => setBrandingForm({ ...brandingForm, logo: e.target.value })}
                        placeholder="https://..."
                        className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      {brandingForm.logo && (
                        <div className="mt-2 p-2 bg-slate-100 dark:bg-white/5 rounded-lg inline-block">
                          <img src={brandingForm.logo} alt="Preview" className="h-12 object-contain" />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-gray-400 text-sm">Website</label>
                      <input
                        type="url"
                        value={brandingForm.website}
                        onChange={(e) => setBrandingForm({ ...brandingForm, website: e.target.value })}
                        placeholder="https://..."
                        className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-gray-400 text-sm">Description</label>
                      <textarea
                        value={brandingForm.description}
                        onChange={(e) => setBrandingForm({ ...brandingForm, description: e.target.value })}
                        rows={3}
                        className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-gray-400 text-sm">Plan Type</label>
                      <div className="flex gap-4 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="brandingType"
                            value="basic"
                            checked={brandingForm.brandingType === 'basic'}
                            onChange={(e) => setBrandingForm({ ...brandingForm, brandingType: 'basic' })}
                            className="text-purple-600"
                          />
                          <span className="text-slate-900 dark:text-white">Basic</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="brandingType"
                            value="advanced"
                            checked={brandingForm.brandingType === 'advanced'}
                            onChange={(e) => setBrandingForm({ ...brandingForm, brandingType: 'advanced' })}
                            className="text-purple-600"
                          />
                          <span className="text-slate-900 dark:text-white">Advanced</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Color Scheme */}
                <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Color Scheme</h3>
                  <div className="space-y-4">
                    {Object.entries(brandingForm.colorScheme).map(([key, value]) => (
                      <div key={key}>
                        <label className="text-slate-600 dark:text-gray-400 text-sm capitalize">{key} Color</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="color"
                            value={value}
                            onChange={(e) => setBrandingForm({
                              ...brandingForm,
                              colorScheme: { ...brandingForm.colorScheme, [key]: e.target.value }
                            })}
                            className="w-12 h-10 rounded cursor-pointer border-0"
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => setBrandingForm({
                              ...brandingForm,
                              colorScheme: { ...brandingForm.colorScheme, [key]: e.target.value }
                            })}
                            className="flex-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Preview */}
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10">
                    <h4 className="text-sm font-medium text-slate-600 dark:text-gray-400 mb-3">Preview</h4>
                    <div
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: brandingForm.colorScheme.background }}
                    >
                      <div
                        className="p-3 rounded"
                        style={{ backgroundColor: brandingForm.colorScheme.primary }}
                      >
                        <span style={{ color: '#fff' }}>Primary Button</span>
                      </div>
                      <p
                        className="mt-3 font-medium"
                        style={{ color: brandingForm.colorScheme.text }}
                      >
                        Sample Text
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: brandingForm.colorScheme.secondary }}
                      >
                        Secondary Element
                      </p>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="lg:col-span-2">
                  <button
                    onClick={handleSaveBranding}
                    disabled={saving}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-colors font-medium"
                  >
                    {saving ? 'Saving...' : 'Save Branding'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-slate-200 dark:border-white/10 text-center">
                <p className="text-slate-500 dark:text-gray-400">Select a promoter to edit their branding</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Domains Tab - Admin Only */}
      {activeTab === 'domains' && isAdmin && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Promoter Portals</h3>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Promoter</th>
                  <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Portal Slug</th>
                  <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Custom Domain</th>
                  <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Status</th>
                  <th className="text-right p-4 text-slate-500 dark:text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promoters.filter(p => p.active).map((promoter) => (
                  <tr key={promoter.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="p-4">
                      <p className="text-slate-900 dark:text-white font-medium">{promoter.name}</p>
                    </td>
                    <td className="p-4">
                      {promoter.slug ? (
                        <a
                          href={`/p/${promoter.slug}`}
                          target="_blank"
                          className="text-purple-600 dark:text-purple-400 hover:text-purple-500"
                        >
                          /p/{promoter.slug}
                        </a>
                      ) : (
                        <span className="text-slate-400">Not set</span>
                      )}
                    </td>
                    <td className="p-4">
                      {promoter.website ? (
                        <a
                          href={promoter.website}
                          target="_blank"
                          className="text-purple-600 dark:text-purple-400 hover:text-purple-500"
                        >
                          {promoter.website.replace('https://', '').replace('http://', '')}
                        </a>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(promoter.active)}`}>
                        {promoter.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="px-3 py-1 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-lg text-sm transition-colors">
                        Configure
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Billing Tab - Admin Only */}
      {activeTab === 'billing' && isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Promoters by Plan</h3>
            <div className="space-y-4">
              {[
                { plan: 'Advanced', count: stats.advancedPlans, color: 'bg-purple-500' },
                { plan: 'Basic', count: stats.basicPlans, color: 'bg-blue-500' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-900 dark:text-white">{item.plan}</span>
                    <span className="text-slate-500 dark:text-gray-400">{item.count} promoters</span>
                  </div>
                  <div className="h-4 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${stats.totalTenants > 0 ? (item.count / stats.totalTenants) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Commission Overview</h3>
            <div className="space-y-3">
              {promoters.slice(0, 5).map((promoter) => (
                <div key={promoter.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                  <div>
                    <p className="text-slate-900 dark:text-white font-medium">{promoter.name}</p>
                    <p className="text-slate-500 dark:text-gray-400 text-sm capitalize">{promoter.brandingType} Plan</p>
                  </div>
                  <span className="text-purple-600 dark:text-purple-400 font-medium">{promoter.commission}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
