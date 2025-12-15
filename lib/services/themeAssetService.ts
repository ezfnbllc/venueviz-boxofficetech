/**
 * Theme Asset Service
 *
 * Handles theme uploads, asset management, and Firebase Storage operations
 * for the Advanced White-Label CMS system.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import JSZip from 'jszip'
import {
  TenantTheme,
  ThemeAssets,
  ThemeConfig,
  ThemeTemplate,
  DEFAULT_THEME_CONFIG,
  DEFAULT_THEME_ASSETS,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZES,
} from '@/lib/types/cms'

// ============================================================================
// CONSTANTS
// ============================================================================

const THEMES_COLLECTION = 'tenantThemes'
const STORAGE_BASE_PATH = 'tenants'

// File extension to type mapping
const EXTENSION_MAP: Record<string, 'css' | 'js' | 'html' | 'images' | 'fonts'> = {
  '.css': 'css',
  '.js': 'js',
  '.html': 'html',
  '.htm': 'html',
  '.jpg': 'images',
  '.jpeg': 'images',
  '.png': 'images',
  '.gif': 'images',
  '.webp': 'images',
  '.svg': 'images',
  '.woff': 'fonts',
  '.woff2': 'fonts',
  '.ttf': 'fonts',
  '.otf': 'fonts',
}

// ============================================================================
// THEME CRUD OPERATIONS
// ============================================================================

/**
 * Create a new theme for a tenant
 */
export async function createTheme(
  tenantId: string,
  themeName: string,
  userId: string,
  options?: {
    themeSource?: 'themeforest' | 'custom'
    themeforestId?: string
    licenseType?: 'regular' | 'extended'
  }
): Promise<TenantTheme> {
  const themeId = doc(collection(db, THEMES_COLLECTION)).id
  const basePath = `${STORAGE_BASE_PATH}/${tenantId}/themes/${themeId}`

  const theme: TenantTheme = {
    id: themeId,
    tenantId,
    themeName,
    themeSource: options?.themeSource || 'custom',
    themeforestId: options?.themeforestId,
    licenseType: options?.licenseType,
    status: 'draft',
    version: '1.0.0',
    assets: {
      ...DEFAULT_THEME_ASSETS,
      basePath,
    },
    config: DEFAULT_THEME_CONFIG,
    templates: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: userId,
    updatedBy: userId,
  }

  await setDoc(doc(db, THEMES_COLLECTION, themeId), theme)
  return theme
}

/**
 * Get a theme by ID
 */
export async function getTheme(themeId: string): Promise<TenantTheme | null> {
  const docSnap = await getDoc(doc(db, THEMES_COLLECTION, themeId))
  if (!docSnap.exists()) return null
  return docSnap.data() as TenantTheme
}

/**
 * Get all themes for a tenant
 */
export async function getThemesByTenant(tenantId: string): Promise<TenantTheme[]> {
  const q = query(
    collection(db, THEMES_COLLECTION),
    where('tenantId', '==', tenantId),
    orderBy('updatedAt', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => doc.data() as TenantTheme)
}

/**
 * Get the active theme for a tenant
 */
export async function getActiveTheme(tenantId: string): Promise<TenantTheme | null> {
  const q = query(
    collection(db, THEMES_COLLECTION),
    where('tenantId', '==', tenantId),
    where('status', '==', 'active')
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  return snapshot.docs[0].data() as TenantTheme
}

/**
 * Update theme configuration
 */
export async function updateThemeConfig(
  themeId: string,
  config: Partial<ThemeConfig>,
  userId: string
): Promise<void> {
  const themeRef = doc(db, THEMES_COLLECTION, themeId)
  const currentTheme = await getTheme(themeId)
  if (!currentTheme) throw new Error('Theme not found')

  await updateDoc(themeRef, {
    config: {
      ...currentTheme.config,
      ...config,
    },
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Update theme assets
 */
export async function updateThemeAssets(
  themeId: string,
  assets: Partial<ThemeAssets>,
  userId: string
): Promise<void> {
  const themeRef = doc(db, THEMES_COLLECTION, themeId)
  const currentTheme = await getTheme(themeId)
  if (!currentTheme) throw new Error('Theme not found')

  await updateDoc(themeRef, {
    assets: {
      ...currentTheme.assets,
      ...assets,
    },
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Update theme templates
 */
export async function updateThemeTemplates(
  themeId: string,
  templates: ThemeTemplate[],
  userId: string
): Promise<void> {
  const themeRef = doc(db, THEMES_COLLECTION, themeId)

  await updateDoc(themeRef, {
    templates,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Publish a theme (set as active)
 */
export async function publishTheme(themeId: string, userId: string): Promise<void> {
  const theme = await getTheme(themeId)
  if (!theme) throw new Error('Theme not found')

  // Deactivate any currently active theme for this tenant
  const activeTheme = await getActiveTheme(theme.tenantId)
  if (activeTheme && activeTheme.id !== themeId) {
    await updateDoc(doc(db, THEMES_COLLECTION, activeTheme.id), {
      status: 'archived',
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    })
  }

  // Activate this theme
  await updateDoc(doc(db, THEMES_COLLECTION, themeId), {
    status: 'active',
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Archive a theme
 */
export async function archiveTheme(themeId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, THEMES_COLLECTION, themeId), {
    status: 'archived',
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Delete a theme and all its assets
 */
export async function deleteTheme(themeId: string): Promise<void> {
  const theme = await getTheme(themeId)
  if (!theme) throw new Error('Theme not found')

  // Delete all assets from storage
  if (theme.assets.basePath) {
    await deleteStorageFolder(theme.assets.basePath)
  }

  // Delete theme document
  await deleteDoc(doc(db, THEMES_COLLECTION, themeId))
}

// ============================================================================
// ASSET UPLOAD OPERATIONS
// ============================================================================

/**
 * Upload a single file to theme storage
 */
export async function uploadThemeAsset(
  themeId: string,
  file: File,
  subPath: string
): Promise<string> {
  const theme = await getTheme(themeId)
  if (!theme) throw new Error('Theme not found')

  // Validate file
  const validation = validateFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Sanitize filename
  const safeFilename = sanitizeFilename(file.name)
  const storagePath = `${theme.assets.basePath}/${subPath}/${safeFilename}`

  // Upload to Firebase Storage
  const storageRef = ref(storage, storagePath)
  await uploadBytes(storageRef, file)

  // Get download URL
  const downloadUrl = await getDownloadURL(storageRef)
  return downloadUrl
}

/**
 * Upload multiple files
 */
export async function uploadThemeAssets(
  themeId: string,
  files: File[],
  subPath: string
): Promise<string[]> {
  const urls: string[] = []

  for (const file of files) {
    try {
      const url = await uploadThemeAsset(themeId, file, subPath)
      urls.push(url)
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error)
    }
  }

  return urls
}

/**
 * Import theme from ZIP file
 */
export async function importThemeFromZip(
  tenantId: string,
  zipFile: File,
  themeName: string,
  userId: string
): Promise<TenantTheme> {
  // Validate ZIP file size
  if (zipFile.size > MAX_FILE_SIZES.zip) {
    throw new Error(`ZIP file too large. Maximum size is ${MAX_FILE_SIZES.zip / 1024 / 1024}MB`)
  }

  // Create theme first
  const theme = await createTheme(tenantId, themeName, userId, {
    themeSource: 'themeforest',
  })

  try {
    // Extract ZIP - Convert File to ArrayBuffer for server-side compatibility
    const arrayBuffer = await zipFile.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)
    const extractedAssets = await extractZipAssets(zip, theme)

    // Update theme with extracted assets
    await updateThemeAssets(theme.id, extractedAssets.assets, userId)
    await updateThemeTemplates(theme.id, extractedAssets.templates, userId)

    // Refresh and return
    const updatedTheme = await getTheme(theme.id)
    return updatedTheme!
  } catch (error) {
    // Cleanup on failure
    await deleteTheme(theme.id)
    throw error
  }
}

/**
 * Extract assets from ZIP and upload to storage
 */
async function extractZipAssets(
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

      // Get file content
      const content = await zipEntry.async('blob')
      const file = new File([content], zipEntry.name, { type: getMimeType(extension) })

      // Determine storage subpath based on file type
      const subPath = getSubPathForFile(relativePath, fileType)

      // Upload file
      const url = await uploadThemeAsset(theme.id, file, subPath)

      // Categorize asset
      categorizeAsset(assets, templates, relativePath, url, fileType)
    })()

    filePromises.push(promise)
  })

  await Promise.all(filePromises)

  return { assets, templates }
}

/**
 * Get appropriate subpath for a file based on its location and type
 */
function getSubPathForFile(
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
function categorizeAsset(
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

/**
 * Delete a single asset from storage
 */
export async function deleteThemeAsset(assetUrl: string): Promise<void> {
  try {
    // Extract storage path from URL
    const storagePath = extractStoragePathFromUrl(assetUrl)
    if (storagePath) {
      const storageRef = ref(storage, storagePath)
      await deleteObject(storageRef)
    }
  } catch (error) {
    console.error('Failed to delete asset:', error)
  }
}

/**
 * Delete an entire storage folder
 */
async function deleteStorageFolder(folderPath: string): Promise<void> {
  const folderRef = ref(storage, folderPath)

  try {
    const { items, prefixes } = await listAll(folderRef)

    // Delete all files in this folder
    await Promise.all(items.map(item => deleteObject(item)))

    // Recursively delete subfolders
    await Promise.all(
      prefixes.map(prefix => deleteStorageFolder(prefix.fullPath))
    )
  } catch (error) {
    console.error('Failed to delete folder:', error)
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate a file for upload
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  const extension = getFileExtension(file.name)
  const fileType = EXTENSION_MAP[extension]

  if (!fileType) {
    return { valid: false, error: `Unsupported file type: ${extension}` }
  }

  const maxSize = MAX_FILE_SIZES[fileType]
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size for ${fileType} files is ${maxSize / 1024 / 1024}MB`,
    }
  }

  return { valid: true }
}

/**
 * Sanitize a filename for storage
 */
function sanitizeFilename(filename: string): string {
  // Remove path separators and special characters
  return filename
    .replace(/[/\\]/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase()
}

/**
 * Get file extension (with dot)
 */
function getFileExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/)
  return match ? match[0].toLowerCase() : ''
}

/**
 * Get MIME type from extension
 */
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
  }
  return mimeTypes[extension] || 'application/octet-stream'
}

/**
 * Extract storage path from a Firebase Storage URL
 */
function extractStoragePathFromUrl(url: string): string | null {
  try {
    // Firebase Storage URLs have the path after /o/ and URL encoded
    const match = url.match(/\/o\/([^?]+)/)
    if (match) {
      return decodeURIComponent(match[1])
    }
  } catch (error) {
    console.error('Failed to extract storage path:', error)
  }
  return null
}

/**
 * Generate CSS from theme configuration
 */
export function generateThemeCSS(config: ThemeConfig): string {
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

// Export service object for convenience
export const ThemeAssetService = {
  createTheme,
  getTheme,
  getThemesByTenant,
  getActiveTheme,
  updateThemeConfig,
  updateThemeAssets,
  updateThemeTemplates,
  publishTheme,
  archiveTheme,
  deleteTheme,
  uploadThemeAsset,
  uploadThemeAssets,
  importThemeFromZip,
  deleteThemeAsset,
  generateThemeCSS,
}
