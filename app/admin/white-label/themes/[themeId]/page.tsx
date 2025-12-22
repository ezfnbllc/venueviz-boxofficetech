'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import {
  TenantTheme,
  ThemeConfig,
  ThemeVersion,
  ThemeColors,
  ThemeTypography,
  ThemeLayout,
  ThemeComponentStyles,
  DEFAULT_THEME_CONFIG,
} from '@/lib/types/cms'

type TabType = 'colors' | 'typography' | 'layout' | 'components' | 'assets' | 'versions'

export default function ThemeConfigPage() {
  const params = useParams()
  const router = useRouter()
  const themeId = params.themeId as string

  const [theme, setTheme] = useState<TenantTheme | null>(null)
  const [versions, setVersions] = useState<ThemeVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('colors')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [config, setConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG)

  const { user } = useFirebaseAuth()

  // Load theme
  const loadTheme = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/cms/themes?action=get&themeId=${themeId}`)
      const data = await response.json()
      if (data.theme) {
        setTheme(data.theme)
        setConfig(data.theme.config || DEFAULT_THEME_CONFIG)
      }

      // Load versions
      const versionsResponse = await fetch(`/api/cms/themes?action=versions&themeId=${themeId}`)
      const versionsData = await versionsResponse.json()
      if (versionsData.versions) {
        setVersions(versionsData.versions)
      }
    } catch (error) {
      console.error('Error loading theme:', error)
      setMessage({ type: 'error', text: 'Failed to load theme' })
    } finally {
      setLoading(false)
    }
  }, [themeId])

  useEffect(() => {
    loadTheme()
  }, [loadTheme])

  // Save config
  const handleSave = async () => {
    if (!user || !theme) return

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/cms/themes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeId: theme.id,
          userId: user.uid,
          config,
        }),
      })

      const data = await response.json()
      if (data.theme) {
        setTheme(data.theme)
        setMessage({ type: 'success', text: 'Theme configuration saved!' })
      } else {
        throw new Error(data.error || 'Failed to save')
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  // Publish theme
  const handlePublish = async () => {
    if (!user || !theme) return

    try {
      const response = await fetch('/api/cms/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish',
          themeId: theme.id,
          userId: user.uid,
        }),
      })

      const data = await response.json()
      if (data.theme) {
        setTheme(data.theme)
        setMessage({ type: 'success', text: 'Theme published!' })
        loadTheme() // Reload to get new versions
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to publish theme' })
    }
  }

  // Rollback to version
  const handleRollback = async (versionId: string) => {
    if (!user || !theme || !confirm('Are you sure you want to rollback to this version?')) return

    try {
      const response = await fetch('/api/cms/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rollback',
          themeId: theme.id,
          versionId,
          userId: user.uid,
        }),
      })

      const data = await response.json()
      if (data.theme) {
        setTheme(data.theme)
        setConfig(data.theme.config)
        setMessage({ type: 'success', text: 'Rollback successful!' })
        loadTheme()
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Rollback failed' })
    }
  }

  // Update color
  const updateColor = (key: keyof ThemeColors, value: string) => {
    setConfig(prev => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }))
  }

  // Update typography
  const updateTypography = (key: keyof ThemeTypography, value: string | number) => {
    setConfig(prev => ({
      ...prev,
      typography: { ...prev.typography, [key]: value },
    }))
  }

  // Update layout
  const updateLayout = (key: keyof ThemeLayout, value: string) => {
    setConfig(prev => ({
      ...prev,
      layout: { ...prev.layout, [key]: value },
    }))
  }

  // Update components
  const updateComponents = (key: keyof ThemeComponentStyles, value: string) => {
    setConfig(prev => ({
      ...prev,
      components: { ...prev.components, [key]: value },
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
      </div>
    )
  }

  if (!theme) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 dark:text-gray-400">Theme not found</p>
        <button
          onClick={() => router.push('/admin/white-label/themes')}
          className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
        >
          Back to Themes
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.push('/admin/white-label/themes')}
              className="text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {theme.themeName}
            </h1>
            <span className={`px-2 py-1 rounded text-xs border ${
              theme.status === 'active'
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : theme.status === 'draft'
                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
            }`}>
              {theme.status}
            </span>
          </div>
          <p className="text-slate-600 dark:text-gray-400">
            Configure colors, typography, and layout settings
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-colors flex items-center gap-2"
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
          {theme.status === 'draft' && (
            <button
              onClick={handlePublish}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Publish
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
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-lg w-fit overflow-x-auto">
        {(['colors', 'typography', 'layout', 'components', 'assets', 'versions'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize whitespace-nowrap ${
              activeTab === tab
                ? 'bg-purple-600 text-white'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Colors Tab */}
      {activeTab === 'colors' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Brand Colors
            </h3>
            <div className="space-y-4">
              {(['primary', 'secondary', 'accent'] as const).map((key) => (
                <div key={key}>
                  <label className="text-slate-600 dark:text-gray-400 text-sm capitalize">{key}</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={config.colors[key]}
                      onChange={(e) => updateColor(key, e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={config.colors[key]}
                      onChange={(e) => updateColor(key, e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Text & Background
            </h3>
            <div className="space-y-4">
              {(['background', 'surface', 'text', 'textSecondary', 'heading'] as const).map((key) => (
                <div key={key}>
                  <label className="text-slate-600 dark:text-gray-400 text-sm capitalize">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={config.colors[key]}
                      onChange={(e) => updateColor(key, e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={config.colors[key]}
                      onChange={(e) => updateColor(key, e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Links & Borders
            </h3>
            <div className="space-y-4">
              {(['link', 'linkHover', 'border'] as const).map((key) => (
                <div key={key}>
                  <label className="text-slate-600 dark:text-gray-400 text-sm capitalize">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={config.colors[key]}
                      onChange={(e) => updateColor(key, e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={config.colors[key]}
                      onChange={(e) => updateColor(key, e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Status Colors
            </h3>
            <div className="space-y-4">
              {(['success', 'warning', 'error', 'info'] as const).map((key) => (
                <div key={key}>
                  <label className="text-slate-600 dark:text-gray-400 text-sm capitalize">{key}</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={config.colors[key]}
                      onChange={(e) => updateColor(key, e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={config.colors[key]}
                      onChange={(e) => updateColor(key, e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Typography Tab */}
      {activeTab === 'typography' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Font Families
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-slate-600 dark:text-gray-400 text-sm">Heading Font</label>
                <input
                  type="text"
                  value={config.typography.headingFont}
                  onChange={(e) => updateTypography('headingFont', e.target.value)}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Inter, sans-serif"
                />
              </div>
              <div>
                <label className="text-slate-600 dark:text-gray-400 text-sm">Body Font</label>
                <input
                  type="text"
                  value={config.typography.bodyFont}
                  onChange={(e) => updateTypography('bodyFont', e.target.value)}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Inter, sans-serif"
                />
              </div>
              <div>
                <label className="text-slate-600 dark:text-gray-400 text-sm">Monospace Font</label>
                <input
                  type="text"
                  value={config.typography.monoFont || ''}
                  onChange={(e) => updateTypography('monoFont', e.target.value)}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="JetBrains Mono, monospace"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Font Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-slate-600 dark:text-gray-400 text-sm">Base Font Size</label>
                <input
                  type="text"
                  value={config.typography.baseFontSize}
                  onChange={(e) => updateTypography('baseFontSize', e.target.value)}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="16px"
                />
              </div>
              <div>
                <label className="text-slate-600 dark:text-gray-400 text-sm">Line Height</label>
                <input
                  type="text"
                  value={config.typography.lineHeight}
                  onChange={(e) => updateTypography('lineHeight', e.target.value)}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="1.6"
                />
              </div>
              <div>
                <label className="text-slate-600 dark:text-gray-400 text-sm">Type Scale</label>
                <input
                  type="number"
                  step="0.05"
                  value={config.typography.scale}
                  onChange={(e) => updateTypography('scale', parseFloat(e.target.value))}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="1.25"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layout Tab */}
      {activeTab === 'layout' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Dimensions
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-slate-600 dark:text-gray-400 text-sm">Container Width</label>
                <input
                  type="text"
                  value={config.layout.containerWidth}
                  onChange={(e) => updateLayout('containerWidth', e.target.value)}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="1200px"
                />
              </div>
              <div>
                <label className="text-slate-600 dark:text-gray-400 text-sm">Header Height</label>
                <input
                  type="text"
                  value={config.layout.headerHeight}
                  onChange={(e) => updateLayout('headerHeight', e.target.value)}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="80px"
                />
              </div>
              <div>
                <label className="text-slate-600 dark:text-gray-400 text-sm">Footer Height</label>
                <input
                  type="text"
                  value={config.layout.footerHeight}
                  onChange={(e) => updateLayout('footerHeight', e.target.value)}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="200px"
                />
              </div>
              <div>
                <label className="text-slate-600 dark:text-gray-400 text-sm">Sidebar Width</label>
                <input
                  type="text"
                  value={config.layout.sidebarWidth}
                  onChange={(e) => updateLayout('sidebarWidth', e.target.value)}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="280px"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Spacing
            </h3>
            <div>
              <label className="text-slate-600 dark:text-gray-400 text-sm">Content Spacing</label>
              <div className="flex gap-2 mt-2">
                {(['compact', 'normal', 'relaxed'] as const).map((spacing) => (
                  <button
                    key={spacing}
                    onClick={() => updateLayout('spacing', spacing)}
                    className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors capitalize ${
                      config.layout.spacing === spacing
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/20'
                    }`}
                  >
                    {spacing}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Components Tab */}
      {activeTab === 'components' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Button Style
            </h3>
            <div className="space-y-2">
              {(['rounded', 'square', 'pill'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => updateComponents('buttonStyle', style)}
                  className={`w-full py-3 rounded-lg text-sm font-medium transition-colors capitalize ${
                    config.components.buttonStyle === style
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/20'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Card Style
            </h3>
            <div className="space-y-2">
              {(['flat', 'raised', 'bordered'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => updateComponents('cardStyle', style)}
                  className={`w-full py-3 rounded-lg text-sm font-medium transition-colors capitalize ${
                    config.components.cardStyle === style
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/20'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Input Style
            </h3>
            <div className="space-y-2">
              {(['underline', 'outlined', 'filled'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => updateComponents('inputStyle', style)}
                  className={`w-full py-3 rounded-lg text-sm font-medium transition-colors capitalize ${
                    config.components.inputStyle === style
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/20'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assets Tab */}
      {activeTab === 'assets' && (
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Theme Assets
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {theme.assets.css?.main?.length || 0}
              </p>
              <p className="text-sm text-slate-600 dark:text-gray-400">CSS Files</p>
            </div>
            <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {theme.assets.js?.main?.length || 0}
              </p>
              <p className="text-sm text-slate-600 dark:text-gray-400">JS Files</p>
            </div>
            <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {(theme.assets.images?.backgrounds?.length || 0) +
                  (theme.assets.images?.gallery?.length || 0)}
              </p>
              <p className="text-sm text-slate-600 dark:text-gray-400">Images</p>
            </div>
            <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {theme.templates?.length || 0}
              </p>
              <p className="text-sm text-slate-600 dark:text-gray-400">Templates</p>
            </div>
          </div>
          <p className="text-slate-500 dark:text-gray-400 text-sm">
            Asset management features coming soon. For now, re-import theme to update assets.
          </p>
        </div>
      )}

      {/* Versions Tab */}
      {activeTab === 'versions' && (
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Version History (Last 3)
          </h3>
          {versions.length === 0 ? (
            <p className="text-slate-500 dark:text-gray-400">
              No versions yet. Publish your theme to create a version.
            </p>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={`p-4 rounded-lg border ${
                    index === 0
                      ? 'bg-purple-500/10 border-purple-500/30'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-900 dark:text-white font-medium">
                        v{version.version}
                        {index === 0 && (
                          <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </p>
                      <p className="text-slate-500 dark:text-gray-400 text-sm">
                        {version.changelog || 'No changelog provided'}
                      </p>
                      <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">
                        {new Date(version.createdAt?.seconds * 1000).toLocaleString()}
                      </p>
                    </div>
                    {index > 0 && (
                      <button
                        onClick={() => handleRollback(version.id)}
                        className="px-3 py-1 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded text-sm transition-colors"
                      >
                        Rollback
                      </button>
                    )}
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
