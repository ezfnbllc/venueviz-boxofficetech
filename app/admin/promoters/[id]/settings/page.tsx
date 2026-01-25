'use client'

/**
 * Promoter Theme Settings Page
 *
 * Simplified interface for tenants to customize their theme:
 * - Primary, secondary, accent colors
 * - Logo upload
 * - Live preview
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { PromoterProfile } from '@/lib/types/promoter'
import { ThemeConfig } from '@/lib/types/cms'

interface ThemeSettings {
  themeOverrides: {
    colors?: {
      primary?: string
      secondary?: string
      accent?: string
      background?: string
      surface?: string
      text?: string
      heading?: string
    }
    logoUrl?: string
    faviconUrl?: string
  } | null
  colorScheme: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  resolvedConfig: ThemeConfig
  logo: string | null
}

export default function PromoterSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const promoterId = params.id as string
  const { user, loading: authLoading } = useFirebaseAuth()

  const [promoter, setPromoter] = useState<PromoterProfile | null>(null)
  const [themeSettings, setThemeSettings] = useState<ThemeSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Editable colors
  const [colors, setColors] = useState({
    primary: '#6366F1',
    secondary: '#8B5CF6',
    accent: '#F59E0B',
    background: '#FFFFFF',
    text: '#1E293B',
    heading: '#0F172A',
  })

  useEffect(() => {
    if (user && !authLoading && promoterId) {
      loadData()
    }
  }, [user, authLoading, promoterId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Fetch promoter data
      const promoterDoc = await getDoc(doc(db, 'promoters', promoterId))
      if (!promoterDoc.exists()) {
        router.push('/admin/promoters')
        return
      }

      const promoterData = { id: promoterDoc.id, ...promoterDoc.data() } as PromoterProfile
      setPromoter(promoterData)

      // Fetch theme settings from API
      const response = await fetch(`/api/promoters/${promoterId}/theme`)
      const data = await response.json()

      if (data.success) {
        setThemeSettings(data.data)

        // Initialize colors from theme overrides or colorScheme
        const themeColors = data.data.themeOverrides?.colors || {}
        const fallbackColors = data.data.colorScheme || {}
        const resolved = data.data.resolvedConfig?.colors || {}

        setColors({
          primary: themeColors.primary || fallbackColors.primary || resolved.primary || '#6366F1',
          secondary: themeColors.secondary || fallbackColors.secondary || resolved.secondary || '#8B5CF6',
          accent: themeColors.accent || fallbackColors.accent || resolved.accent || '#F59E0B',
          background: themeColors.background || fallbackColors.background || resolved.background || '#FFFFFF',
          text: themeColors.text || fallbackColors.text || resolved.text || '#1E293B',
          heading: themeColors.heading || resolved.heading || '#0F172A',
        })
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setMessage({ type: 'error', text: 'Failed to load theme settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)

      const response = await fetch(`/api/promoters/${promoterId}/theme`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colors }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Theme settings saved successfully!' })
        setThemeSettings(prev => prev ? { ...prev, themeOverrides: data.data.themeOverrides } : null)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const handleColorChange = (colorKey: keyof typeof colors, value: string) => {
    setColors(prev => ({ ...prev, [colorKey]: value }))
  }

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500" />
      </div>
    )
  }

  if (!promoter) {
    return (
      <div className="text-center py-12 card-elevated rounded-xl p-8">
        <p className="text-secondary-contrast mb-4">Promoter not found</p>
        <button
          onClick={() => router.push('/admin/promoters')}
          className="mt-4 btn-accent px-5 py-2.5 rounded-xl font-medium"
        >
          Back to Promoters
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push(`/admin/promoters/${promoterId}`)}
            className="text-sm text-blue-500 hover:text-blue-600 mb-2 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Promoter
          </button>
          <h1 className="text-2xl font-bold text-primary-contrast">Theme Settings</h1>
          <p className="text-secondary-contrast mt-1">
            Customize the look and feel of your public site
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-accent px-6 py-2.5 rounded-xl font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-xl ${
            message.type === 'success'
              ? 'bg-green-500/10 text-green-500 border border-green-500/20'
              : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Color Settings */}
        <div className="card-elevated rounded-xl p-6">
          <h2 className="text-lg font-semibold text-primary-contrast mb-4">Colors</h2>
          <p className="text-sm text-secondary-contrast mb-6">
            Choose colors that match your brand. These will be applied across your public site.
          </p>

          <div className="space-y-4">
            {/* Primary Color */}
            <div>
              <label className="block text-sm font-medium text-primary-contrast mb-2">
                Primary Color
                <span className="text-secondary-contrast font-normal ml-2">
                  (buttons, links, accents)
                </span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="w-12 h-12 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={colors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-primary-contrast border border-slate-200 dark:border-slate-700"
                  placeholder="#6366F1"
                />
              </div>
            </div>

            {/* Secondary Color */}
            <div>
              <label className="block text-sm font-medium text-primary-contrast mb-2">
                Secondary Color
                <span className="text-secondary-contrast font-normal ml-2">
                  (hover states, secondary elements)
                </span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colors.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="w-12 h-12 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={colors.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-primary-contrast border border-slate-200 dark:border-slate-700"
                  placeholder="#8B5CF6"
                />
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <label className="block text-sm font-medium text-primary-contrast mb-2">
                Accent Color
                <span className="text-secondary-contrast font-normal ml-2">
                  (highlights, badges)
                </span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colors.accent}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="w-12 h-12 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={colors.accent}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-primary-contrast border border-slate-200 dark:border-slate-700"
                  placeholder="#F59E0B"
                />
              </div>
            </div>

            {/* Background Color */}
            <div>
              <label className="block text-sm font-medium text-primary-contrast mb-2">
                Background Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colors.background}
                  onChange={(e) => handleColorChange('background', e.target.value)}
                  className="w-12 h-12 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={colors.background}
                  onChange={(e) => handleColorChange('background', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-primary-contrast border border-slate-200 dark:border-slate-700"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label className="block text-sm font-medium text-primary-contrast mb-2">
                Text Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colors.text}
                  onChange={(e) => handleColorChange('text', e.target.value)}
                  className="w-12 h-12 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={colors.text}
                  onChange={(e) => handleColorChange('text', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-primary-contrast border border-slate-200 dark:border-slate-700"
                  placeholder="#1E293B"
                />
              </div>
            </div>

            {/* Heading Color */}
            <div>
              <label className="block text-sm font-medium text-primary-contrast mb-2">
                Heading Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colors.heading}
                  onChange={(e) => handleColorChange('heading', e.target.value)}
                  className="w-12 h-12 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={colors.heading}
                  onChange={(e) => handleColorChange('heading', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-primary-contrast border border-slate-200 dark:border-slate-700"
                  placeholder="#0F172A"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="card-elevated rounded-xl p-6">
          <h2 className="text-lg font-semibold text-primary-contrast mb-4">Preview</h2>
          <p className="text-sm text-secondary-contrast mb-6">
            See how your colors will look on your site
          </p>

          {/* Preview Container */}
          <div
            className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700"
            style={{ backgroundColor: colors.background }}
          >
            {/* Preview Header */}
            <div
              className="px-4 py-3 border-b flex items-center justify-between"
              style={{ borderColor: colors.text + '20', backgroundColor: colors.background }}
            >
              <div className="flex items-center gap-2">
                {promoter.logo ? (
                  <img src={promoter.logo} alt="Logo" className="h-8 w-auto" />
                ) : (
                  <span style={{ color: colors.heading }} className="font-bold">
                    {promoter.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm" style={{ color: colors.text }}>
                <span>Events</span>
                <span>About</span>
                <span>Contact</span>
              </div>
            </div>

            {/* Preview Hero */}
            <div
              className="px-6 py-12 text-center"
              style={{ backgroundColor: colors.heading }}
            >
              <h3 className="text-xl font-bold text-white mb-2">
                Welcome to {promoter.name}
              </h3>
              <p className="text-white/80 text-sm mb-4">
                Discover amazing events
              </p>
              <button
                className="px-4 py-2 rounded-md text-white text-sm font-medium"
                style={{ backgroundColor: colors.primary }}
              >
                Browse Events
              </button>
            </div>

            {/* Preview Content */}
            <div className="p-6" style={{ backgroundColor: colors.background }}>
              <h4
                className="font-semibold mb-4"
                style={{ color: colors.heading }}
              >
                Upcoming Events
              </h4>

              {/* Preview Event Card */}
              <div
                className="rounded-lg p-4 border"
                style={{ borderColor: colors.text + '20' }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-16 h-16 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: colors.primary + '20' }}
                  />
                  <div className="flex-1">
                    <h5
                      className="font-medium"
                      style={{ color: colors.heading }}
                    >
                      Sample Event
                    </h5>
                    <p
                      className="text-sm mt-1"
                      style={{ color: colors.text + 'cc' }}
                    >
                      Jan 30, 2026 • 7:00 PM
                    </p>
                    <p
                      className="text-sm font-semibold mt-2"
                      style={{ color: colors.primary }}
                    >
                      From $25.00
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-secondary-contrast mt-4 text-center">
            This is a simplified preview. Visit your public site to see the full effect.
          </p>
        </div>
      </div>

      {/* Advanced Settings Link */}
      <div className="card-elevated rounded-xl p-6">
        <h2 className="text-lg font-semibold text-primary-contrast mb-2">Need More Customization?</h2>
        <p className="text-secondary-contrast mb-4">
          For advanced theme changes like custom fonts, layouts, or templates, contact our team
          and we'll help you customize your site further.
        </p>
        <a
          href="mailto:support@boxofficetech.com?subject=Advanced Theme Customization Request"
          className="text-blue-500 hover:text-blue-600 text-sm font-medium"
        >
          Contact Support →
        </a>
      </div>
    </div>
  )
}
