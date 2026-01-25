/**
 * Promoter Theme Service
 *
 * Resolves and generates theme CSS for promoter public pages.
 *
 * For ADVANCED branding promoters:
 * - Uses master theme (Barren) as base
 * - Can override with custom themeId
 * - Can apply themeOverrides on top
 * - Ignores legacy colorScheme field
 *
 * For BASIC branding promoters:
 * - Falls back to legacy colorScheme if no themeOverrides
 * - Provides backwards compatibility
 */

import { getAdminFirestore } from '@/lib/firebase-admin'
import { TenantTheme, ThemeConfig, DEFAULT_THEME_CONFIG } from '@/lib/types/cms'
import { PromoterProfile, PromoterThemeOverrides } from '@/lib/types/promoter'
import { getMasterTheme } from './themeResolutionService'
import { generateThemeCSSServer, getThemeServer } from './themeAssetServiceServer'

// Cache for resolved promoter themes (5 minute TTL)
const promoterThemeCache = new Map<string, { config: ThemeConfig; expiry: number }>()
const CACHE_TTL = 5 * 60 * 1000

/**
 * Get a promoter by slug (for public pages)
 */
export async function getPromoterBySlug(slug: string): Promise<PromoterProfile | null> {
  const db = getAdminFirestore()

  const snapshot = await db.collection('promoters')
    .where('slug', '==', slug)
    .where('active', '==', true)
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() } as PromoterProfile
}

/**
 * Get a promoter by ID
 */
export async function getPromoterById(promoterId: string): Promise<PromoterProfile | null> {
  const db = getAdminFirestore()

  const doc = await db.collection('promoters').doc(promoterId).get()

  if (!doc.exists) {
    return null
  }

  return { id: doc.id, ...doc.data() } as PromoterProfile
}

/**
 * Get the resolved theme configuration for a promoter
 * Merges base theme with promoter overrides
 */
export async function getThemeConfigForPromoter(promoter: PromoterProfile): Promise<ThemeConfig> {
  const cacheKey = `promoter:${promoter.id}`

  // Check cache
  const cached = promoterThemeCache.get(cacheKey)
  if (cached && cached.expiry > Date.now()) {
    return cached.config
  }

  // Start with default config
  let config: ThemeConfig = { ...DEFAULT_THEME_CONFIG }

  // Priority 3: Get base theme (master theme as fallback)
  const masterTheme = await getMasterTheme()
  if (masterTheme?.config) {
    config = deepMergeConfig(config, masterTheme.config)
  }

  // Priority 2: Apply promoter's assigned theme if exists
  if (promoter.themeId) {
    try {
      const customTheme = await getThemeServer(promoter.themeId)
      if (customTheme?.config) {
        config = deepMergeConfig(config, customTheme.config)
        console.log(`[PromoterTheme] Using custom theme for ${promoter.slug}: ${customTheme.themeName}`)
      }
    } catch (err) {
      console.error(`[PromoterTheme] Failed to load theme ${promoter.themeId}:`, err)
    }
  }

  // Priority 1: Apply promoter's themeOverrides (highest priority)
  if (promoter.themeOverrides) {
    config = applyThemeOverrides(config, promoter.themeOverrides)
  }

  // For BASIC branding: apply legacy colorScheme if no themeOverrides colors
  // For ADVANCED branding: use the theme colors (Barren), don't apply legacy colorScheme
  const isBasicBranding = promoter.brandingType !== 'advanced'
  if (isBasicBranding && !promoter.themeOverrides?.colors && promoter.colorScheme) {
    config = applyLegacyColorScheme(config, promoter.colorScheme)
    console.log(`[PromoterTheme] Using legacy colorScheme for basic promoter: ${promoter.slug}`)
  } else if (promoter.brandingType === 'advanced') {
    console.log(`[PromoterTheme] Using theme colors for advanced promoter: ${promoter.slug}`)
  }

  // Cache the result
  promoterThemeCache.set(cacheKey, { config, expiry: Date.now() + CACHE_TTL })

  return config
}

/**
 * Generate complete CSS for a promoter's theme
 */
export async function generatePromoterThemeCSS(promoter: PromoterProfile): Promise<string> {
  const config = await getThemeConfigForPromoter(promoter)
  return generateThemeCSSServer(config)
}

/**
 * Generate CSS from promoter slug (convenience function for pages)
 */
export async function generateThemeCSSBySlug(slug: string): Promise<string> {
  const promoter = await getPromoterBySlug(slug)

  if (!promoter) {
    // Return default theme CSS if promoter not found
    return generateThemeCSSServer(DEFAULT_THEME_CONFIG)
  }

  return generatePromoterThemeCSS(promoter)
}

/**
 * Clear cache for a specific promoter or all promoters
 */
export function clearPromoterThemeCache(promoterId?: string): void {
  if (promoterId) {
    promoterThemeCache.delete(`promoter:${promoterId}`)
  } else {
    promoterThemeCache.clear()
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Deep merge two theme configs
 */
function deepMergeConfig(base: ThemeConfig, override: Partial<ThemeConfig>): ThemeConfig {
  return {
    colors: { ...base.colors, ...override.colors },
    typography: { ...base.typography, ...override.typography },
    layout: { ...base.layout, ...override.layout },
    components: { ...base.components, ...override.components },
  }
}

/**
 * Apply promoter theme overrides to config
 */
function applyThemeOverrides(config: ThemeConfig, overrides: PromoterThemeOverrides): ThemeConfig {
  const result = { ...config }

  // Apply color overrides
  if (overrides.colors) {
    result.colors = {
      ...config.colors,
      ...overrides.colors,
      // Also update derived colors based on primary/secondary
      link: overrides.colors.primary || config.colors.link,
      linkHover: overrides.colors.secondary || config.colors.linkHover,
    }
  }

  // Apply typography overrides
  if (overrides.headingFont || overrides.bodyFont) {
    result.typography = {
      ...config.typography,
      ...(overrides.headingFont && { headingFont: overrides.headingFont }),
      ...(overrides.bodyFont && { bodyFont: overrides.bodyFont }),
    }
  }

  return result
}

/**
 * Convert legacy colorScheme to theme config colors
 * This ensures backwards compatibility with existing promoters
 */
function applyLegacyColorScheme(
  config: ThemeConfig,
  colorScheme: { primary: string; secondary: string; accent: string; background: string; text: string }
): ThemeConfig {
  return {
    ...config,
    colors: {
      ...config.colors,
      primary: colorScheme.primary,
      secondary: colorScheme.secondary,
      accent: colorScheme.accent,
      background: colorScheme.background,
      text: colorScheme.text,
      // Derive related colors from primary/secondary
      link: colorScheme.primary,
      linkHover: colorScheme.secondary,
      heading: colorScheme.text,
    },
  }
}
