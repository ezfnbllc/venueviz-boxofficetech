'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePromoterAccess } from '@/lib/hooks/usePromoterAccess'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import { TenantPage, TenantTheme, PageType, SystemPageType } from '@/lib/types/cms'

type ViewMode = 'list' | 'create'

interface CreatePageState {
  title: string
  slug: string
  type: PageType
  systemType?: SystemPageType
  creating: boolean
  error: string | null
}

const SYSTEM_PAGE_TYPES: { value: SystemPageType; label: string; description: string }[] = [
  { value: 'home', label: 'Home Page', description: 'Main landing page' },
  { value: 'events', label: 'Events Page', description: 'List of upcoming events' },
  { value: 'event-detail', label: 'Event Detail', description: 'Single event information' },
  { value: 'venues', label: 'Venues Page', description: 'List of venues' },
  { value: 'venue-detail', label: 'Venue Detail', description: 'Single venue information' },
  { value: 'about', label: 'About Page', description: 'About your organization' },
  { value: 'contact', label: 'Contact Page', description: 'Contact information and form' },
  { value: 'privacy', label: 'Privacy Policy', description: 'Privacy policy page' },
  { value: 'terms', label: 'Terms of Service', description: 'Terms and conditions' },
]

export default function PagesPage() {
  const router = useRouter()
  const [pages, setPages] = useState<TenantPage[]>([])
  const [themes, setThemes] = useState<TenantTheme[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [createState, setCreateState] = useState<CreatePageState>({
    title: '',
    slug: '',
    type: 'custom',
    creating: false,
    error: null,
  })

  const { effectivePromoterId } = usePromoterAccess()
  const { user } = useFirebaseAuth()

  // Load pages and themes
  const loadData = useCallback(async () => {
    if (!effectivePromoterId) return

    setLoading(true)
    try {
      // Load pages and themes in parallel
      const [pagesRes, themesRes] = await Promise.all([
        fetch(`/api/cms/pages?tenantId=${effectivePromoterId}`),
        fetch(`/api/cms/themes?tenantId=${effectivePromoterId}`),
      ])

      const pagesData = await pagesRes.json()
      const themesData = await themesRes.json()

      if (pagesData.pages) {
        setPages(pagesData.pages)
      }
      if (themesData.themes) {
        setThemes(themesData.themes)
        // Auto-select first active theme
        const activeTheme = themesData.themes.find((t: TenantTheme) => t.status === 'active')
        if (activeTheme) {
          setSelectedThemeId(activeTheme.id)
        } else if (themesData.themes.length > 0) {
          setSelectedThemeId(themesData.themes[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setMessage({ type: 'error', text: 'Failed to load pages' })
    } finally {
      setLoading(false)
    }
  }, [effectivePromoterId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  // Handle title change
  const handleTitleChange = (title: string) => {
    setCreateState(prev => ({
      ...prev,
      title,
      slug: generateSlug(title),
    }))
  }

  // Handle page type change
  const handleTypeChange = (type: PageType, systemType?: SystemPageType) => {
    if (type === 'system' && systemType) {
      const systemPage = SYSTEM_PAGE_TYPES.find(sp => sp.value === systemType)
      setCreateState(prev => ({
        ...prev,
        type,
        systemType,
        title: systemPage?.label || '',
        slug: systemType,
      }))
    } else {
      setCreateState(prev => ({
        ...prev,
        type,
        systemType: undefined,
      }))
    }
  }

  // Create new page
  const handleCreatePage = async () => {
    if (!effectivePromoterId || !user || !selectedThemeId) return

    setCreateState(prev => ({ ...prev, creating: true, error: null }))

    try {
      const response = await fetch('/api/cms/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          tenantId: effectivePromoterId,
          themeId: selectedThemeId,
          title: createState.title,
          slug: createState.slug,
          type: createState.type,
          systemType: createState.systemType,
          userId: user.uid,
        }),
      })

      const data = await response.json()
      if (data.page) {
        setMessage({ type: 'success', text: 'Page created successfully!' })
        setCreateState({
          title: '',
          slug: '',
          type: 'custom',
          creating: false,
          error: null,
        })
        setViewMode('list')
        loadData()
        // Navigate to page builder
        router.push(`/admin/white-label/pages/${data.page.id}`)
      } else {
        throw new Error(data.error || 'Failed to create page')
      }
    } catch (error) {
      setCreateState(prev => ({
        ...prev,
        creating: false,
        error: error instanceof Error ? error.message : 'Creation failed',
      }))
    }
  }

  // Handle page publish/unpublish
  const handleTogglePublish = async (pageId: string, isPublished: boolean) => {
    if (!user) return

    try {
      const response = await fetch('/api/cms/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isPublished ? 'unpublish' : 'publish',
          pageId,
          userId: user.uid,
        }),
      })

      const data = await response.json()
      if (data.page) {
        setMessage({ type: 'success', text: isPublished ? 'Page unpublished' : 'Page published' })
        loadData()
      } else {
        throw new Error(data.error || 'Operation failed')
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Operation failed' })
    }
  }

  // Handle page duplicate
  const handleDuplicate = async (pageId: string, title: string) => {
    if (!user) return

    const newSlug = generateSlug(`${title} copy`)
    try {
      const response = await fetch('/api/cms/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'duplicate',
          pageId,
          newSlug,
          userId: user.uid,
        }),
      })

      const data = await response.json()
      if (data.page) {
        setMessage({ type: 'success', text: 'Page duplicated' })
        loadData()
      } else {
        throw new Error(data.error || 'Duplication failed')
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Duplication failed' })
    }
  }

  // Handle page delete
  const handleDelete = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page? This action cannot be undone.')) return

    try {
      const response = await fetch(`/api/cms/pages?pageId=${pageId}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (data.message) {
        setMessage({ type: 'success', text: 'Page deleted' })
        loadData()
      } else {
        throw new Error(data.error || 'Delete failed')
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Delete failed' })
    }
  }

  // Get status badge color
  const getStatusColor = (isPublished: boolean) => {
    return isPublished
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  }

  // Get page type badge color
  const getTypeColor = (type: PageType) => {
    switch (type) {
      case 'system':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'landing':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
      </div>
    )
  }

  // Check if themes exist
  if (themes.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Page Management
          </h1>
          <p className="text-slate-600 dark:text-gray-400 mt-1">
            Create and manage custom pages for your white-label portal
          </p>
        </div>

        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-slate-200 dark:border-white/10 text-center">
          <svg className="w-16 h-16 text-slate-300 dark:text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            No Theme Available
          </h3>
          <p className="text-slate-600 dark:text-gray-400 mb-6">
            You need to import a theme before creating pages.
          </p>
          <a
            href="/admin/white-label/themes"
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors inline-block"
          >
            Import Theme First
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Page Management
          </h1>
          <p className="text-slate-600 dark:text-gray-400 mt-1">
            Create and manage custom pages for your white-label portal
          </p>
        </div>
        <div className="flex gap-2">
          {viewMode === 'list' && (
            <button
              onClick={() => setViewMode('create')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Page
            </button>
          )}
          {viewMode !== 'list' && (
            <button
              onClick={() => {
                setViewMode('list')
                setCreateState({
                  title: '',
                  slug: '',
                  type: 'custom',
                  creating: false,
                  error: null,
                })
              }}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Back to List
            </button>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="float-right text-current hover:opacity-75"
          >
            &times;
          </button>
        </div>
      )}

      {/* Create View */}
      {viewMode === 'create' && (
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-8 border border-slate-200 dark:border-white/10">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
            Create New Page
          </h2>

          <div className="space-y-6">
            {/* Theme Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                Theme
              </label>
              <select
                value={selectedThemeId || ''}
                onChange={(e) => setSelectedThemeId(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {themes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.themeName} {theme.status === 'active' ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Page Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                Page Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => handleTypeChange('custom')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    createState.type === 'custom'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-slate-200 dark:border-white/10 hover:border-purple-500/50'
                  }`}
                >
                  <h4 className="font-medium text-slate-900 dark:text-white">Custom Page</h4>
                  <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                    Create a unique page with custom content
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleTypeChange('landing')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    createState.type === 'landing'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-slate-200 dark:border-white/10 hover:border-purple-500/50'
                  }`}
                >
                  <h4 className="font-medium text-slate-900 dark:text-white">Landing Page</h4>
                  <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                    Marketing or promotional page
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateState(prev => ({ ...prev, type: 'system', systemType: undefined }))}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    createState.type === 'system'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-slate-200 dark:border-white/10 hover:border-purple-500/50'
                  }`}
                >
                  <h4 className="font-medium text-slate-900 dark:text-white">System Page</h4>
                  <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                    Pre-defined page with dynamic content
                  </p>
                </button>
              </div>
            </div>

            {/* System Page Type Selection */}
            {createState.type === 'system' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  System Page Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {SYSTEM_PAGE_TYPES.map((sp) => {
                    // Check if this system page already exists
                    const exists = pages.some(p => p.type === 'system' && p.systemType === sp.value)
                    return (
                      <button
                        key={sp.value}
                        type="button"
                        disabled={exists}
                        onClick={() => handleTypeChange('system', sp.value)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          exists
                            ? 'border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5 opacity-50 cursor-not-allowed'
                            : createState.systemType === sp.value
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-slate-200 dark:border-white/10 hover:border-purple-500/50'
                        }`}
                      >
                        <h4 className="font-medium text-slate-900 dark:text-white text-sm">
                          {sp.label}
                          {exists && <span className="text-xs text-slate-500 ml-2">(exists)</span>}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                          {sp.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Page Title */}
            {(createState.type !== 'system' || createState.systemType) && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    Page Title
                  </label>
                  <input
                    type="text"
                    value={createState.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter page title"
                    disabled={createState.type === 'system'}
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
                      value={createState.slug}
                      onChange={(e) => setCreateState(prev => ({ ...prev, slug: generateSlug(e.target.value) }))}
                      className="flex-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="page-url-slug"
                      disabled={createState.type === 'system'}
                    />
                  </div>
                </div>
              </>
            )}

            {createState.error && (
              <div className="p-4 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg">
                {createState.error}
              </div>
            )}

            {/* Create Button */}
            <div className="flex gap-4">
              <button
                onClick={handleCreatePage}
                disabled={
                  createState.creating ||
                  !createState.title.trim() ||
                  !createState.slug.trim() ||
                  !selectedThemeId
                }
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                {createState.creating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Page
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {pages.length === 0 ? (
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-slate-200 dark:border-white/10 text-center">
              <svg className="w-16 h-16 text-slate-300 dark:text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No Pages Yet
              </h3>
              <p className="text-slate-600 dark:text-gray-400 mb-6">
                Create your first page to get started.
              </p>
              <button
                onClick={() => setViewMode('create')}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Create Your First Page
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-500 dark:text-gray-400">
                      Page
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-500 dark:text-gray-400">
                      Slug
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-500 dark:text-gray-400">
                      Type
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-500 dark:text-gray-400">
                      Sections
                    </th>
                    <th className="text-right py-4 px-6 text-sm font-medium text-slate-500 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((page) => (
                    <tr
                      key={page.id}
                      className="border-b border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div>
                          <p className="text-slate-900 dark:text-white font-medium">
                            {page.title}
                          </p>
                          {page.showInNav && (
                            <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                              Shown in navigation
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <code className="text-sm text-slate-600 dark:text-gray-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded">
                          /{page.slug}
                        </code>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded text-xs border ${getTypeColor(page.type)}`}>
                          {page.type}
                          {page.systemType && ` (${page.systemType})`}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(page.isPublished)}`}>
                          {page.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-slate-600 dark:text-gray-400">
                          {page.sections.length}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-end gap-2">
                          <a
                            href={`/admin/white-label/pages/${page.id}`}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded text-sm transition-colors"
                          >
                            Edit
                          </a>
                          <button
                            onClick={() => handleTogglePublish(page.id, page.isPublished)}
                            className={`px-3 py-1.5 rounded text-sm transition-colors ${
                              page.isPublished
                                ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400'
                                : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                            }`}
                          >
                            {page.isPublished ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            onClick={() => handleDuplicate(page.id, page.title)}
                            className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-sm transition-colors"
                            title="Duplicate page"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(page.id)}
                            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
                            title="Delete page"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          )}
        </div>
      )}
    </div>
  )
}
