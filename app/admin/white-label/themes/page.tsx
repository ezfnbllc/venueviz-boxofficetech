'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePromoterAccess } from '@/lib/hooks/usePromoterAccess'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import { TenantTheme, TemplateParserResult, ParsedTemplate } from '@/lib/types/cms'
import { PromoterProfile } from '@/lib/types/promoter'

type ViewMode = 'list' | 'import' | 'preview'

interface ImportState {
  file: File | null
  themeName: string
  parseResult: TemplateParserResult | null
  importing: boolean
  parsing: boolean
  error: string | null
}

function ThemesPageContent() {
  const searchParams = useSearchParams()
  const urlTenantId = searchParams.get('tenantId')

  const [themes, setThemes] = useState<TenantTheme[]>([])
  const [tenant, setTenant] = useState<PromoterProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedTheme, setSelectedTheme] = useState<TenantTheme | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [importState, setImportState] = useState<ImportState>({
    file: null,
    themeName: '',
    parseResult: null,
    importing: false,
    parsing: false,
    error: null,
  })

  const { isAdmin, effectivePromoterId } = usePromoterAccess()
  const { user } = useFirebaseAuth()

  // Use URL tenantId if provided, otherwise fall back to effectivePromoterId
  const tenantId = urlTenantId || (effectivePromoterId !== 'all' ? effectivePromoterId : null)

  // Check if we have a valid tenant context
  const needsTenantSelection = !tenantId

  // Load tenant info
  const loadTenant = useCallback(async () => {
    if (!tenantId) return

    try {
      const response = await fetch(`/api/promoters/${tenantId}`)
      const data = await response.json()
      if (data.success && data.data) {
        setTenant(data.data)
      }
    } catch (error) {
      console.error('Error loading tenant:', error)
    }
  }, [tenantId])

  // Load themes
  const loadThemes = useCallback(async () => {
    if (!tenantId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/cms/themes?tenantId=${tenantId}`)
      const data = await response.json()
      if (data.themes) {
        setThemes(data.themes)
      }
    } catch (error) {
      console.error('Error loading themes:', error)
      setMessage({ type: 'error', text: 'Failed to load themes' })
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  // Load tenant info on mount
  useEffect(() => {
    loadTenant()
  }, [loadTenant])

  useEffect(() => {
    loadThemes()
  }, [loadThemes])

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportState(prev => ({
      ...prev,
      file,
      themeName: file.name.replace(/\.zip$/i, ''),
      parsing: true,
      error: null,
    }))

    // Parse ZIP to preview contents
    try {
      const formData = new FormData()
      formData.append('action', 'parseZip')
      formData.append('file', file)
      formData.append('userId', user?.uid || '')

      const response = await fetch('/api/cms/themes/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.result) {
        setImportState(prev => ({
          ...prev,
          parseResult: data.result,
          parsing: false,
        }))
        setViewMode('preview')
      } else {
        throw new Error(data.error || 'Failed to parse ZIP')
      }
    } catch (error) {
      setImportState(prev => ({
        ...prev,
        parsing: false,
        error: error instanceof Error ? error.message : 'Failed to parse ZIP',
      }))
    }
  }

  // Handle theme import
  const handleImport = async () => {
    if (!importState.file || !tenantId || !user) return

    setImportState(prev => ({ ...prev, importing: true, error: null }))

    try {
      const formData = new FormData()
      formData.append('action', 'importZip')
      formData.append('file', importState.file)
      formData.append('themeName', importState.themeName)
      formData.append('tenantId', tenantId)
      formData.append('userId', user.uid)

      const response = await fetch('/api/cms/themes/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.theme) {
        setMessage({ type: 'success', text: 'Theme imported successfully!' })
        setImportState({
          file: null,
          themeName: '',
          parseResult: null,
          importing: false,
          parsing: false,
          error: null,
        })
        setViewMode('list')
        loadThemes()
      } else {
        throw new Error(data.error || 'Failed to import theme')
      }
    } catch (error) {
      setImportState(prev => ({
        ...prev,
        importing: false,
        error: error instanceof Error ? error.message : 'Import failed',
      }))
    }
  }

  // Handle theme publish
  const handlePublish = async (themeId: string) => {
    if (!user) return

    try {
      const response = await fetch('/api/cms/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish',
          themeId,
          userId: user.uid,
        }),
      })

      const data = await response.json()
      if (data.theme) {
        setMessage({ type: 'success', text: 'Theme published successfully!' })
        loadThemes()
      } else {
        throw new Error(data.error || 'Failed to publish theme')
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Publish failed' })
    }
  }

  // Handle theme archive
  const handleArchive = async (themeId: string) => {
    if (!user || !confirm('Are you sure you want to archive this theme?')) return

    try {
      const response = await fetch('/api/cms/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'archive',
          themeId,
          userId: user.uid,
        }),
      })

      const data = await response.json()
      if (data.message) {
        setMessage({ type: 'success', text: 'Theme archived' })
        loadThemes()
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to archive theme' })
    }
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'draft':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'archived':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
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

  // Admin needs to select a specific tenant
  if (needsTenantSelection) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Theme Management
          </h1>
          <p className="text-slate-600 dark:text-gray-400 mt-1">
            Import and manage ThemeForest themes for your white-label portal
          </p>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-8 text-center">
          <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Select a Tenant
          </h3>
          <p className="text-slate-600 dark:text-gray-400 mb-4">
            Please select a specific tenant from the dropdown at the top of the page to manage their themes.
            <br />
            Themes are tenant-specific and cannot be viewed across all tenants.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tenant Context Banner */}
      {tenant && (
        <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center gap-4">
            {/* Tenant Logo */}
            <div className="w-14 h-14 rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {tenant.logo ? (
                <img src={tenant.logo} alt={tenant.name} className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {tenant.name?.charAt(0) || 'T'}
                </span>
              )}
            </div>
            {/* Tenant Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                  {tenant.name}
                </h2>
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded text-xs font-medium">
                  Advanced Plan
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-gray-400">
                {tenant.email && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {tenant.email}
                  </span>
                )}
                {tenant.slug && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    /{tenant.slug}
                  </span>
                )}
              </div>
            </div>
            {/* Back to White-Label Link */}
            <a
              href="/admin/white-label"
              className="px-3 py-2 bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-600 dark:text-gray-300 flex items-center gap-2 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Tenants
            </a>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Theme Management
          </h1>
          <p className="text-slate-600 dark:text-gray-400 mt-1">
            Import and manage ThemeForest themes for your white-label portal
          </p>
        </div>
        <div className="flex gap-2">
          {viewMode === 'list' && (
            <>
              <a
                href={`/admin/white-label/pages?tenantId=${tenantId}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Manage Pages
              </a>
              <button
                onClick={() => setViewMode('import')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import Theme
              </button>
            </>
          )}
          {viewMode !== 'list' && (
            <button
              onClick={() => {
                setViewMode('list')
                setImportState({
                  file: null,
                  themeName: '',
                  parseResult: null,
                  importing: false,
                  parsing: false,
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

      {/* Import View */}
      {viewMode === 'import' && (
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-8 border border-slate-200 dark:border-white/10">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
            Import ThemeForest Theme
          </h2>

          <div className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                Theme ZIP File
              </label>
              <div className="border-2 border-dashed border-slate-300 dark:border-white/20 rounded-xl p-8 text-center hover:border-purple-500 transition-colors">
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="theme-upload"
                  disabled={importState.parsing}
                />
                <label
                  htmlFor="theme-upload"
                  className="cursor-pointer"
                >
                  {importState.parsing ? (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500 mb-4"></div>
                      <p className="text-slate-600 dark:text-gray-400">Analyzing theme...</p>
                    </div>
                  ) : importState.file ? (
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-purple-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-slate-900 dark:text-white font-medium">{importState.file.name}</p>
                      <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
                        {(importState.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-slate-400 dark:text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-slate-600 dark:text-gray-400">
                        Drop your theme ZIP file here or click to browse
                      </p>
                      <p className="text-slate-400 dark:text-gray-500 text-sm mt-2">
                        Maximum file size: 100MB
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {importState.error && (
              <div className="p-4 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg">
                {importState.error}
              </div>
            )}

            <p className="text-sm text-slate-500 dark:text-gray-400">
              Upload a ZIP file from ThemeForest. The system will automatically detect
              templates, CSS, JavaScript, images, and fonts.
            </p>
          </div>
        </div>
      )}

      {/* Preview View */}
      {viewMode === 'preview' && importState.parseResult && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Theme Preview
            </h2>

            {/* Theme Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                Theme Name
              </label>
              <input
                type="text"
                value={importState.themeName}
                onChange={(e) => setImportState(prev => ({ ...prev, themeName: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter theme name"
              />
            </div>

            {/* Detected Assets Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {importState.parseResult.templates.length}
                </p>
                <p className="text-sm text-slate-600 dark:text-gray-400">Templates</p>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {importState.parseResult.assets.css.length}
                </p>
                <p className="text-sm text-slate-600 dark:text-gray-400">CSS Files</p>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {importState.parseResult.assets.js.length}
                </p>
                <p className="text-sm text-slate-600 dark:text-gray-400">JS Files</p>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4">
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {importState.parseResult.assets.images.length}
                </p>
                <p className="text-sm text-slate-600 dark:text-gray-400">Images</p>
              </div>
            </div>

            {/* Detected Dependencies */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                Detected Dependencies
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(importState.parseResult.dependencies)
                  .filter(([, detected]) => detected)
                  .map(([name]) => (
                    <span
                      key={name}
                      className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm"
                    >
                      {name}
                    </span>
                  ))}
                {Object.values(importState.parseResult.dependencies).every(v => !v) && (
                  <span className="text-slate-500 dark:text-gray-400 text-sm">
                    No common dependencies detected
                  </span>
                )}
              </div>
            </div>

            {/* Detected Templates */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                Detected Templates
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {importState.parseResult.templates.map((template, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-lg"
                  >
                    <div>
                      <p className="text-slate-900 dark:text-white font-medium">
                        {template.suggestedName}
                      </p>
                      <p className="text-slate-500 dark:text-gray-400 text-sm">
                        {template.filename} • {template.slots.length} editable slots detected
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {template.structure.hasHeader && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                          Header
                        </span>
                      )}
                      {template.structure.hasFooter && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                          Footer
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Warnings */}
            {importState.parseResult.warnings.length > 0 && (
              <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-400 mb-2">Warnings</h3>
                <ul className="text-sm text-yellow-300 space-y-1">
                  {importState.parseResult.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Import Button */}
            <div className="flex gap-4">
              <button
                onClick={handleImport}
                disabled={importState.importing || !importState.themeName.trim()}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                {importState.importing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Import Theme
                  </>
                )}
              </button>
              <button
                onClick={() => setViewMode('import')}
                className="px-6 py-3 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-lg transition-colors"
              >
                Choose Different File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theme List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {themes.length === 0 ? (
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-slate-200 dark:border-white/10 text-center">
              <svg className="w-16 h-16 text-slate-300 dark:text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No Themes Yet
              </h3>
              <p className="text-slate-600 dark:text-gray-400 mb-6">
                Import a ThemeForest theme to get started with your white-label portal.
              </p>
              <button
                onClick={() => setViewMode('import')}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Import Your First Theme
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {themes.map((theme) => (
                <div
                  key={theme.id}
                  className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden hover:border-purple-500/50 transition-colors"
                >
                  {/* Theme Preview */}
                  <div className="h-40 bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                    {theme.assets.images?.logo?.primary ? (
                      <img
                        src={theme.assets.images.logo.primary}
                        alt={theme.themeName}
                        className="max-h-24 max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-4xl font-bold text-purple-500/50">
                        {theme.themeName.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Theme Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {theme.themeName}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(theme.status)}`}>
                        {theme.status}
                      </span>
                    </div>

                    <p className="text-sm text-slate-500 dark:text-gray-400 mb-4">
                      v{theme.version} • {theme.templates.length} templates
                    </p>

                    <div className="flex gap-2">
                      <a
                        href={`/admin/white-label/themes/${theme.id}`}
                        className="flex-1 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-lg text-center text-sm transition-colors"
                      >
                        Configure
                      </a>
                      {theme.status === 'draft' && (
                        <button
                          onClick={() => handlePublish(theme.id)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                        >
                          Publish
                        </button>
                      )}
                      {theme.status !== 'archived' && (
                        <button
                          onClick={() => handleArchive(theme.id)}
                          className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
                          title="Archive theme"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Wrapper component with Suspense for useSearchParams
export default function ThemesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
      </div>
    }>
      <ThemesPageContent />
    </Suspense>
  )
}
