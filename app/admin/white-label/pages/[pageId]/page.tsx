'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import { TenantPage, PageSection, SectionType } from '@/lib/types/cms'
import PageBuilder from '@/components/cms/PageBuilder'

type TabType = 'builder' | 'settings' | 'seo' | 'languages'

interface PageSettings {
  title: string
  slug: string
  description: string
  showInNav: boolean
  navOrder: number
  navLabel: string
}

interface PageSEO {
  title: string
  description: string
  keywords: string[]
  ogImage: string
  canonicalUrl: string
  noIndex: boolean
  noFollow: boolean
}

export default function PageEditorPage() {
  const params = useParams()
  const router = useRouter()
  const pageId = params.pageId as string

  const [page, setPage] = useState<TenantPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('builder')
  const [hasChanges, setHasChanges] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [settings, setSettings] = useState<PageSettings>({
    title: '',
    slug: '',
    description: '',
    showInNav: false,
    navOrder: 0,
    navLabel: '',
  })

  const [seo, setSeo] = useState<PageSEO>({
    title: '',
    description: '',
    keywords: [],
    ogImage: '',
    canonicalUrl: '',
    noIndex: false,
    noFollow: false,
  })

  const { user } = useFirebaseAuth()

  // Auto-dismiss success messages after 3 seconds
  useEffect(() => {
    if (message?.type === 'success') {
      const timer = setTimeout(() => setMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [message])

  // Load page data
  const loadPage = useCallback(async () => {
    try {
      const response = await fetch(`/api/cms/pages?action=get&pageId=${pageId}`)
      const data = await response.json()

      if (data.page) {
        setPage(data.page)
        setSettings({
          title: data.page.title,
          slug: data.page.slug,
          description: data.page.description || '',
          showInNav: data.page.showInNav || false,
          navOrder: data.page.navOrder || 0,
          navLabel: data.page.navLabel || '',
        })
        setSeo({
          title: data.page.seo?.title || '',
          description: data.page.seo?.description || '',
          keywords: data.page.seo?.keywords || [],
          ogImage: data.page.seo?.ogImage || '',
          canonicalUrl: data.page.seo?.canonicalUrl || '',
          noIndex: data.page.seo?.noIndex || false,
          noFollow: data.page.seo?.noFollow || false,
        })
      } else {
        setMessage({ type: 'error', text: 'Page not found' })
      }
    } catch (error) {
      console.error('Error loading page:', error)
      setMessage({ type: 'error', text: 'Failed to load page' })
    } finally {
      setLoading(false)
    }
  }, [pageId])

  useEffect(() => {
    loadPage()
  }, [loadPage])

  // Handle sections update
  const handleUpdateSections = (sections: PageSection[]) => {
    if (!page) return
    setPage({ ...page, sections })
    setHasChanges(true)
  }

  // Handle add section
  const handleAddSection = async (type: SectionType, position?: number) => {
    if (!page || !user) return

    try {
      const response = await fetch('/api/cms/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addSection',
          pageId: page.id,
          sectionType: type,
          position,
          userId: user.uid,
        }),
      })

      const data = await response.json()
      if (data.page) {
        setPage(data.page)
        setMessage({ type: 'success', text: 'Section added' })
      } else {
        throw new Error(data.error || 'Failed to add section')
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to add section' })
    }
  }

  // Handle remove section
  const handleRemoveSection = async (sectionId: string) => {
    if (!page || !user) return

    try {
      const response = await fetch('/api/cms/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'removeSection',
          pageId: page.id,
          sectionId,
          userId: user.uid,
        }),
      })

      const data = await response.json()
      if (data.page) {
        setPage(data.page)
        setMessage({ type: 'success', text: 'Section removed' })
      } else {
        throw new Error(data.error || 'Failed to remove section')
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to remove section' })
    }
  }

  // Save sections
  const handleSaveSections = async () => {
    if (!page || !user) return

    setSaving(true)
    try {
      const response = await fetch('/api/cms/pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateSections',
          pageId: page.id,
          sections: page.sections,
          userId: user.uid,
        }),
      })

      const data = await response.json()
      if (data.page) {
        setPage(data.page)
        setHasChanges(false)
        setMessage({ type: 'success', text: 'Sections saved!' })
      } else {
        throw new Error(data.error || 'Failed to save sections')
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  // Save settings
  const handleSaveSettings = async () => {
    if (!page || !user) return

    setSaving(true)
    try {
      const response = await fetch('/api/cms/pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateInfo',
          pageId: page.id,
          ...settings,
          userId: user.uid,
        }),
      })

      const data = await response.json()
      if (data.page) {
        setPage(data.page)
        setMessage({ type: 'success', text: 'Settings saved!' })
      } else {
        throw new Error(data.error || 'Failed to save settings')
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  // Save SEO
  const handleSaveSEO = async () => {
    if (!page || !user) return

    setSaving(true)
    try {
      const response = await fetch('/api/cms/pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateSEO',
          pageId: page.id,
          seo,
          userId: user.uid,
        }),
      })

      const data = await response.json()
      if (data.page) {
        setPage(data.page)
        setMessage({ type: 'success', text: 'SEO settings saved!' })
      } else {
        throw new Error(data.error || 'Failed to save SEO')
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  // Toggle publish
  const handleTogglePublish = async () => {
    if (!page || !user) return

    setPublishing(true)
    try {
      const response = await fetch('/api/cms/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: page.isPublished ? 'unpublish' : 'publish',
          pageId: page.id,
          userId: user.uid,
        }),
      })

      const data = await response.json()
      if (data.page) {
        setPage(data.page)
        setMessage({
          type: 'success',
          text: page.isPublished ? 'Page unpublished successfully!' : 'Page published successfully! Changes are now live.',
        })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Operation failed' })
    } finally {
      setPublishing(false)
    }
  }

  // Add keyword
  const handleAddKeyword = (keyword: string) => {
    if (keyword && !seo.keywords.includes(keyword)) {
      setSeo({ ...seo, keywords: [...seo.keywords, keyword] })
    }
  }

  // Remove keyword
  const handleRemoveKeyword = (keyword: string) => {
    setSeo({ ...seo, keywords: seo.keywords.filter(k => k !== keyword) })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 dark:text-gray-400">Page not found</p>
        <button
          onClick={() => router.push('/admin/white-label/pages')}
          className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
        >
          Back to Pages
        </button>
      </div>
    )
  }

  // Block editing for locked/core business pages
  if (page.isLocked || page.isCmsEditable === false) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Core Page - Editing Locked
            </h2>
            <p className="text-slate-600 dark:text-gray-400 mb-4">
              <strong>{page.title}</strong> is a core business page that handles critical functionality
              like event listings, checkout, or user authentication.
            </p>
            <p className="text-slate-500 dark:text-gray-500 text-sm mb-6">
              These pages are managed by platform code to ensure proper functionality and cannot be
              edited via the CMS. If you need changes to this page, please contact platform support.
            </p>
            <button
              onClick={() => router.push('/admin/white-label/pages')}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Back to Pages
            </button>
          </div>

          <div className="mt-6 p-4 bg-slate-100 dark:bg-white/5 rounded-lg">
            <h3 className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
              Editable Pages (via CMS)
            </h3>
            <ul className="text-sm text-slate-600 dark:text-gray-400 space-y-1">
              <li>• About Us - Company information</li>
              <li>• Contact - Contact form and details</li>
              <li>• Terms of Service - Legal terms</li>
              <li>• Privacy Policy - Privacy information</li>
              <li>• FAQ - Frequently asked questions</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/white-label/pages')}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {page.title}
              </h1>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                /{page.slug}
                {page.type === 'system' && page.systemType && (
                  <span className="ml-2 px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                    {page.systemType}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Badge */}
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              page.isPublished
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            }`}>
              {page.isPublished ? 'Published' : 'Draft'}
            </span>

            {/* Publish/Unpublish Button */}
            <button
              onClick={handleTogglePublish}
              disabled={publishing}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                page.isPublished
                  ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 disabled:opacity-50'
                  : 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50'
              }`}
            >
              {publishing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-current"></div>
                  {page.isPublished ? 'Unpublishing...' : 'Publishing...'}
                </>
              ) : (
                page.isPublished ? 'Unpublish' : 'Publish'
              )}
            </button>

            {/* Save Button */}
            {activeTab === 'builder' && hasChanges && (
              <button
                onClick={handleSaveSections}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-4 border-b border-slate-200 dark:border-slate-700 -mb-[1px]">
          {(['builder', 'settings', 'seo', 'languages'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Message Toast */}
      {message && (
        <div className={`p-4 flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-green-500/20 text-green-400 border-b border-green-500/30'
            : 'bg-red-500/20 text-red-400 border-b border-red-500/30'
        }`}>
          {message.type === 'success' ? (
            <div className="w-6 h-6 rounded-full bg-green-500/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-red-500/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
          <span className="flex-1 font-medium">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-current hover:opacity-75 p-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Builder Tab */}
        {activeTab === 'builder' && (
          <PageBuilder
            page={page}
            onUpdateSections={handleUpdateSections}
            onAddSection={handleAddSection}
            onRemoveSection={handleRemoveSection}
            onSave={handleSaveSections}
            saving={saving}
          />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="p-6 overflow-y-auto h-full">
            <div className="max-w-2xl space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Page Title
                </label>
                <input
                  type="text"
                  value={settings.title}
                  onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  URL Slug
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-gray-400">/</span>
                  <input
                    type="text"
                    value={settings.slug}
                    onChange={(e) => setSettings({ ...settings, slug: e.target.value })}
                    className="flex-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={page.type === 'system'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={settings.description}
                  onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="border-t border-slate-200 dark:border-white/10 pt-6">
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                  Navigation Settings
                </h3>

                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.showInNav}
                      onChange={(e) => setSettings({ ...settings, showInNav: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-slate-700 dark:text-gray-300">
                      Show in navigation menu
                    </span>
                  </label>

                  {settings.showInNav && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                          Navigation Label (optional)
                        </label>
                        <input
                          type="text"
                          value={settings.navLabel}
                          onChange={(e) => setSettings({ ...settings, navLabel: e.target.value })}
                          placeholder={settings.title}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                          Navigation Order
                        </label>
                        <input
                          type="number"
                          value={settings.navOrder}
                          onChange={(e) => setSettings({ ...settings, navOrder: parseInt(e.target.value) || 0 })}
                          className="w-32 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SEO Tab */}
        {activeTab === 'seo' && (
          <div className="p-6 overflow-y-auto h-full">
            <div className="max-w-2xl space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  SEO Title
                </label>
                <input
                  type="text"
                  value={seo.title}
                  onChange={(e) => setSeo({ ...seo, title: e.target.value })}
                  placeholder={settings.title}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                  {seo.title.length}/60 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Meta Description
                </label>
                <textarea
                  value={seo.description}
                  onChange={(e) => setSeo({ ...seo, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                  {seo.description.length}/160 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Keywords
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {seo.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm flex items-center gap-1"
                    >
                      {keyword}
                      <button onClick={() => handleRemoveKeyword(keyword)}>&times;</button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add keyword and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddKeyword(e.currentTarget.value.trim())
                      e.currentTarget.value = ''
                    }
                  }}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Open Graph Image URL
                </label>
                <input
                  type="text"
                  value={seo.ogImage}
                  onChange={(e) => setSeo({ ...seo, ogImage: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Canonical URL (optional)
                </label>
                <input
                  type="text"
                  value={seo.canonicalUrl}
                  onChange={(e) => setSeo({ ...seo, canonicalUrl: e.target.value })}
                  placeholder="https://example.com/page"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="border-t border-slate-200 dark:border-white/10 pt-6">
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                  Search Engine Indexing
                </h3>

                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={seo.noIndex}
                      onChange={(e) => setSeo({ ...seo, noIndex: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-slate-700 dark:text-gray-300">
                      No Index (prevent search engines from indexing)
                    </span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={seo.noFollow}
                      onChange={(e) => setSeo({ ...seo, noFollow: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-slate-700 dark:text-gray-300">
                      No Follow (prevent search engines from following links)
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={handleSaveSEO}
                  disabled={saving}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-colors"
                >
                  {saving ? 'Saving...' : 'Save SEO Settings'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Languages Tab */}
        {activeTab === 'languages' && (
          <div className="p-6 overflow-y-auto h-full">
            <div className="max-w-2xl">
              <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-6">
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                  Page Languages
                </h3>

                <div className="space-y-4">
                  {/* Default Language */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {page.defaultLanguage === 'en' ? '🇺🇸' :
                         page.defaultLanguage === 'es' ? '🇪🇸' :
                         page.defaultLanguage === 'fr' ? '🇫🇷' : '🌐'}
                      </span>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {page.defaultLanguage.toUpperCase()}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-gray-400">
                          Default language
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                      Primary
                    </span>
                  </div>

                  {/* Additional Languages */}
                  {page.translations && Object.keys(page.translations).length > 0 ? (
                    Object.entries(page.translations).map(([langCode, translation]) => (
                      <div
                        key={langCode}
                        className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">
                            {langCode === 'en' ? '🇺🇸' :
                             langCode === 'es' ? '🇪🇸' :
                             langCode === 'fr' ? '🇫🇷' :
                             langCode === 'de' ? '🇩🇪' :
                             langCode === 'it' ? '🇮🇹' :
                             langCode === 'pt' ? '🇵🇹' :
                             langCode === 'zh' ? '🇨🇳' :
                             langCode === 'ja' ? '🇯🇵' :
                             langCode === 'ko' ? '🇰🇷' : '🌐'}
                          </span>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {langCode.toUpperCase()} - {translation.langName}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-gray-400">
                              {translation.isPublished ? 'Published' : 'Draft'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="px-3 py-1.5 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white rounded text-sm">
                            Edit
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 dark:text-gray-400 text-sm">
                      No additional languages configured
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10">
                  <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                    Add Language
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
