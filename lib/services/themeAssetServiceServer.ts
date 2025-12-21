/**
 * Theme Asset Service (Server-side)
 *
 * Server-side version using Firebase Admin SDK.
 * This bypasses Firestore security rules.
 */

import { getAdminDb, getAdminStorage } from '@/lib/firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  TenantTheme,
  ThemeAssets,
  ThemeConfig,
  ThemeTemplate,
  DEFAULT_THEME_CONFIG,
  DEFAULT_THEME_ASSETS,
} from '@/lib/types/cms'

const THEMES_COLLECTION = 'tenantThemes'
const STORAGE_BASE_PATH = 'tenants'

/**
 * Get all themes for a tenant
 */
export async function getThemesByTenantServer(tenantId: string): Promise<TenantTheme[]> {
  const db = getAdminDb()
  const snapshot = await db.collection(THEMES_COLLECTION)
    .where('tenantId', '==', tenantId)
    .orderBy('updatedAt', 'desc')
    .get()

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as TenantTheme[]
}

/**
 * Get a theme by ID
 */
export async function getThemeServer(themeId: string): Promise<TenantTheme | null> {
  const db = getAdminDb()
  const doc = await db.collection(THEMES_COLLECTION).doc(themeId).get()

  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as TenantTheme
}

/**
 * Get the active theme for a tenant
 */
export async function getActiveThemeServer(tenantId: string): Promise<TenantTheme | null> {
  const db = getAdminDb()
  const snapshot = await db.collection(THEMES_COLLECTION)
    .where('tenantId', '==', tenantId)
    .where('status', '==', 'active')
    .limit(1)
    .get()

  if (snapshot.empty) return null
  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() } as TenantTheme
}

/**
 * Create a new theme for a tenant
 */
export async function createThemeServer(
  tenantId: string,
  themeName: string,
  userId: string,
  options?: {
    themeSource?: 'themeforest' | 'custom'
    themeforestId?: string
    licenseType?: 'regular' | 'extended'
  }
): Promise<TenantTheme> {
  const db = getAdminDb()
  const themeRef = db.collection(THEMES_COLLECTION).doc()
  const themeId = themeRef.id
  const basePath = `${STORAGE_BASE_PATH}/${tenantId}/themes/${themeId}`

  const now = Timestamp.now()
  const theme: TenantTheme = {
    id: themeId,
    tenantId,
    themeName,
    themeSource: options?.themeSource || 'custom',
    status: 'draft',
    version: '1.0.0',
    assets: {
      ...DEFAULT_THEME_ASSETS,
      basePath,
    },
    config: DEFAULT_THEME_CONFIG,
    templates: [],
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  }

  // Only add optional fields if they have values (Firestore doesn't accept undefined)
  if (options?.themeforestId) {
    theme.themeforestId = options.themeforestId
  }
  if (options?.licenseType) {
    theme.licenseType = options.licenseType
  }

  await themeRef.set(theme)
  return theme
}

/**
 * Update theme configuration
 */
export async function updateThemeConfigServer(
  themeId: string,
  config: Partial<ThemeConfig>,
  userId: string
): Promise<void> {
  const db = getAdminDb()
  const currentTheme = await getThemeServer(themeId)
  if (!currentTheme) throw new Error('Theme not found')

  await db.collection(THEMES_COLLECTION).doc(themeId).update({
    config: {
      ...currentTheme.config,
      ...config,
    },
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Update theme assets
 */
export async function updateThemeAssetsServer(
  themeId: string,
  assets: Partial<ThemeAssets>,
  userId: string
): Promise<void> {
  const db = getAdminDb()
  const currentTheme = await getThemeServer(themeId)
  if (!currentTheme) throw new Error('Theme not found')

  await db.collection(THEMES_COLLECTION).doc(themeId).update({
    assets: {
      ...currentTheme.assets,
      ...assets,
    },
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Update theme templates
 */
export async function updateThemeTemplatesServer(
  themeId: string,
  templates: ThemeTemplate[],
  userId: string
): Promise<void> {
  const db = getAdminDb()

  await db.collection(THEMES_COLLECTION).doc(themeId).update({
    templates,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Publish a theme (set as active)
 */
export async function publishThemeServer(themeId: string, userId: string): Promise<void> {
  const db = getAdminDb()
  const theme = await getThemeServer(themeId)
  if (!theme) throw new Error('Theme not found')

  // Deactivate any currently active theme for this tenant
  const activeTheme = await getActiveThemeServer(theme.tenantId)
  if (activeTheme && activeTheme.id !== themeId) {
    await db.collection(THEMES_COLLECTION).doc(activeTheme.id).update({
      status: 'archived',
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: userId,
    })
  }

  // Activate this theme
  await db.collection(THEMES_COLLECTION).doc(themeId).update({
    status: 'active',
    publishedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Archive a theme
 */
export async function archiveThemeServer(themeId: string, userId: string): Promise<void> {
  const db = getAdminDb()

  await db.collection(THEMES_COLLECTION).doc(themeId).update({
    status: 'archived',
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Delete a theme and all its assets
 */
export async function deleteThemeServer(themeId: string): Promise<void> {
  const db = getAdminDb()
  const theme = await getThemeServer(themeId)
  if (!theme) throw new Error('Theme not found')

  // Delete theme document
  await db.collection(THEMES_COLLECTION).doc(themeId).delete()
}

/**
 * Generate CSS from theme configuration
 */
export function generateThemeCSSServer(config: ThemeConfig): string {
  const { colors, typography, layout } = config

  return `
:root {
  /* Colors */
  --color-primary: ${colors.primary};
  --color-secondary: ${colors.secondary};
  --color-accent: ${colors.accent};
  --color-background: ${colors.background};
  --color-surface: ${colors.surface};
  --color-text: ${colors.text};
  --color-text-secondary: ${colors.textSecondary};
  --color-heading: ${colors.heading};
  --color-link: ${colors.link};
  --color-link-hover: ${colors.linkHover};
  --color-border: ${colors.border};
  --color-success: ${colors.success};
  --color-warning: ${colors.warning};
  --color-error: ${colors.error};
  --color-info: ${colors.info};

  /* Typography */
  --font-heading: ${typography.headingFont};
  --font-body: ${typography.bodyFont};
  --font-mono: ${typography.monoFont || 'monospace'};
  --font-size-base: ${typography.baseFontSize};
  --line-height: ${typography.lineHeight};
  --type-scale: ${typography.scale};

  /* Layout */
  --container-width: ${layout.containerWidth};
  --sidebar-width: ${layout.sidebarWidth};
  --header-height: ${layout.headerHeight};
  --footer-height: ${layout.footerHeight};
}

body {
  font-family: var(--font-body);
  font-size: var(--font-size-base);
  line-height: var(--line-height);
  color: var(--color-text);
  background-color: var(--color-background);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  color: var(--color-heading);
}

a {
  color: var(--color-link);
}

a:hover {
  color: var(--color-link-hover);
}
`.trim()
}
