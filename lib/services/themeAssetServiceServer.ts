/**
 * Theme Asset Service (Server-side)
 *
 * Server-side version using Firebase Admin SDK.
 * This bypasses Firestore security rules.
 */

import { getAdminDb, getAdminStorage } from '@/lib/firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import JSZip from 'jszip'
import {
  TenantTheme,
  ThemeAssets,
  ThemeConfig,
  ThemeTemplate,
  DEFAULT_THEME_CONFIG,
  DEFAULT_THEME_ASSETS,
  MAX_FILE_SIZES,
} from '@/lib/types/cms'

const THEMES_COLLECTION = 'tenantThemes'
const STORAGE_BASE_PATH = 'tenants'

// File extension to type mapping
const EXTENSION_MAP: Record<string, 'css' | 'js' | 'html' | 'images' | 'fonts'> = {
  '.css': 'css',
  '.scss': 'css',
  '.less': 'css',
  '.js': 'js',
  '.mjs': 'js',
  '.html': 'html',
  '.htm': 'html',
  '.jpg': 'images',
  '.jpeg': 'images',
  '.png': 'images',
  '.gif': 'images',
  '.svg': 'images',
  '.webp': 'images',
  '.ico': 'images',
  '.woff': 'fonts',
  '.woff2': 'fonts',
  '.ttf': 'fonts',
  '.otf': 'fonts',
  '.eot': 'fonts',
}

// MIME type mapping
const MIME_MAP: Record<string, string> = {
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
}

function getFileExtension(filename: string): string {
  const match = filename.toLowerCase().match(/\.[^.]+$/)
  return match ? match[0] : ''
}

function getMimeType(extension: string): string {
  return MIME_MAP[extension] || 'application/octet-stream'
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_')
}

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

// ============================================================================
// ASSET UPLOAD OPERATIONS (Server-side)
// ============================================================================

/**
 * Upload a single file to theme storage using Admin SDK
 */
export async function uploadThemeAssetServer(
  themeId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  subPath: string
): Promise<string> {
  const theme = await getThemeServer(themeId)
  if (!theme) throw new Error('Theme not found')

  const storage = getAdminStorage()
  const bucket = storage.bucket()

  // Sanitize filename
  const safeFilename = sanitizeFilename(fileName)
  const storagePath = `${theme.assets.basePath}/${subPath}/${safeFilename}`

  // Upload file
  const file = bucket.file(storagePath)
  await file.save(fileBuffer, {
    contentType: mimeType,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  })

  // Make file publicly accessible
  await file.makePublic()

  // Return public URL
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`
  return publicUrl
}

/**
 * Import theme from ZIP file (Server-side)
 */
export async function importThemeFromZipServer(
  tenantId: string,
  zipBuffer: ArrayBuffer,
  themeName: string,
  userId: string
): Promise<TenantTheme> {
  // Validate ZIP file size
  if (zipBuffer.byteLength > MAX_FILE_SIZES.zip) {
    throw new Error(`ZIP file too large. Maximum size is ${MAX_FILE_SIZES.zip / 1024 / 1024}MB`)
  }

  // Create theme first
  const theme = await createThemeServer(tenantId, themeName, userId, {
    themeSource: 'themeforest',
  })

  try {
    // Extract ZIP
    const zip = await JSZip.loadAsync(zipBuffer)
    const extractedAssets = await extractZipAssetsServer(zip, theme)

    // Update theme with extracted assets
    await updateThemeAssetsServer(theme.id, extractedAssets.assets, userId)
    await updateThemeTemplatesServer(theme.id, extractedAssets.templates, userId)

    // Refresh and return
    const updatedTheme = await getThemeServer(theme.id)
    return updatedTheme!
  } catch (error) {
    // Cleanup on failure
    await deleteThemeServer(theme.id)
    throw error
  }
}

/**
 * Extract assets from ZIP and upload to storage (Server-side)
 */
async function extractZipAssetsServer(
  zip: JSZip,
  theme: TenantTheme
): Promise<{
  assets: Partial<ThemeAssets>
  templates: ThemeTemplate[]
}> {
  const assets: Partial<ThemeAssets> = {
    css: { main: [], vendors: [], custom: '' },
    js: { main: [], vendors: [], custom: '' },
    images: {
      logo: { primary: '', favicon: '' },
      backgrounds: [],
      gallery: [],
      placeholders: {},
    },
    fonts: { files: [], fontFaces: '' },
    icons: { library: 'custom' },
  }
  const templates: ThemeTemplate[] = []

  // Process each file in ZIP
  const filePromises: Promise<void>[] = []

  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return

    const promise = (async () => {
      const extension = getFileExtension(relativePath)
      const fileType = EXTENSION_MAP[extension]

      if (!fileType) return // Skip unknown file types

      // Get file content as buffer
      const content = await zipEntry.async('nodebuffer')
      const fileName = zipEntry.name.split('/').pop() || zipEntry.name
      const mimeType = getMimeType(extension)

      // Determine storage subpath based on file type
      const subPath = getSubPathForFileServer(relativePath, fileType)

      // Upload file
      const url = await uploadThemeAssetServer(theme.id, content, fileName, mimeType, subPath)

      // Categorize asset
      categorizeAssetServer(assets, templates, relativePath, url, fileType)
    })()

    filePromises.push(promise)
  })

  await Promise.all(filePromises)

  return { assets, templates }
}

/**
 * Get appropriate subpath for a file based on its location and type
 */
function getSubPathForFileServer(
  relativePath: string,
  fileType: 'css' | 'js' | 'html' | 'images' | 'fonts'
): string {
  const pathLower = relativePath.toLowerCase()

  // CSS files
  if (fileType === 'css') {
    if (pathLower.includes('vendor') || pathLower.includes('lib')) {
      return 'css/vendors'
    }
    return 'css/main'
  }

  // JS files
  if (fileType === 'js') {
    if (pathLower.includes('vendor') || pathLower.includes('lib')) {
      return 'js/vendors'
    }
    return 'js/main'
  }

  // HTML templates
  if (fileType === 'html') {
    return 'templates'
  }

  // Images
  if (fileType === 'images') {
    if (pathLower.includes('logo')) {
      return 'images/logo'
    }
    if (pathLower.includes('background') || pathLower.includes('bg')) {
      return 'images/backgrounds'
    }
    return 'images/gallery'
  }

  // Fonts
  if (fileType === 'fonts') {
    return 'fonts'
  }

  return 'misc'
}

/**
 * Categorize an uploaded asset into the assets structure
 */
function categorizeAssetServer(
  assets: Partial<ThemeAssets>,
  templates: ThemeTemplate[],
  relativePath: string,
  url: string,
  fileType: 'css' | 'js' | 'html' | 'images' | 'fonts'
): void {
  const pathLower = relativePath.toLowerCase()
  const filename = relativePath.split('/').pop() || ''

  switch (fileType) {
    case 'css':
      if (pathLower.includes('vendor') || pathLower.includes('lib')) {
        assets.css!.vendors.push(url)
      } else {
        assets.css!.main.push(url)
      }
      break

    case 'js':
      if (pathLower.includes('vendor') || pathLower.includes('lib')) {
        assets.js!.vendors.push(url)
      } else {
        assets.js!.main.push(url)
      }
      break

    case 'html':
      // Create template entry
      const templateName = filename
        .replace(/\.html?$/i, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())

      templates.push({
        id: `template-${templates.length + 1}`,
        name: templateName || 'Page',
        type: 'page',
        htmlFile: url,
        slots: [], // Will be populated by template parser
        thumbnail: undefined,
      })
      break

    case 'images':
      if (pathLower.includes('logo')) {
        if (pathLower.includes('favicon') || filename.includes('favicon')) {
          assets.images!.logo.favicon = url
        } else {
          assets.images!.logo.primary = url
        }
      } else if (pathLower.includes('background') || pathLower.includes('bg')) {
        assets.images!.backgrounds.push(url)
      } else {
        assets.images!.gallery.push(url)
      }
      break

    case 'fonts':
      const fontName = filename.replace(/\.[^.]+$/, '')
      const format = getFileExtension(filename).replace('.', '') as 'woff2' | 'woff' | 'ttf' | 'otf'
      assets.fonts!.files.push({
        name: fontName,
        url,
        format,
      })
      break
  }
}
