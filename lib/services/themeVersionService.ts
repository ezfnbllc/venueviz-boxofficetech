/**
 * Theme Version Service
 *
 * Manages theme version control with support for rollback.
 * Keeps the last 3 versions of each theme for recovery.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  TenantTheme,
  ThemeVersion,
  ThemeConfig,
  ThemeAssets,
} from '@/lib/types/cms'
import { getTheme, updateThemeConfig, updateThemeAssets } from './themeAssetService'

// ============================================================================
// CONSTANTS
// ============================================================================

const VERSIONS_COLLECTION = 'themeVersions'
const MAX_VERSIONS = 3

// ============================================================================
// VERSION MANAGEMENT
// ============================================================================

/**
 * Create a new version snapshot of a theme
 */
export async function createVersion(
  themeId: string,
  userId: string,
  changelog?: string
): Promise<ThemeVersion> {
  const theme = await getTheme(themeId)
  if (!theme) throw new Error('Theme not found')

  // Get current version number and increment
  const versions = await getVersions(themeId)
  const newVersionNumber = incrementVersion(theme.version)

  // Create version snapshot
  const versionId = doc(collection(db, VERSIONS_COLLECTION)).id
  const version: ThemeVersion = {
    id: versionId,
    themeId,
    version: newVersionNumber,
    config: deepClone(theme.config),
    assets: deepClone(theme.assets),
    createdAt: Timestamp.now(),
    createdBy: userId,
    changelog,
  }

  // Save version
  await setDoc(doc(db, VERSIONS_COLLECTION, versionId), version)

  // Cleanup old versions if necessary
  await cleanupOldVersions(themeId)

  return version
}

/**
 * Get all versions for a theme (ordered by newest first)
 */
export async function getVersions(themeId: string): Promise<ThemeVersion[]> {
  const q = query(
    collection(db, VERSIONS_COLLECTION),
    where('themeId', '==', themeId),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => doc.data() as ThemeVersion)
}

/**
 * Get a specific version by ID
 */
export async function getVersion(versionId: string): Promise<ThemeVersion | null> {
  const docSnap = await getDoc(doc(db, VERSIONS_COLLECTION, versionId))
  if (!docSnap.exists()) return null
  return docSnap.data() as ThemeVersion
}

/**
 * Get the latest version for a theme
 */
export async function getLatestVersion(themeId: string): Promise<ThemeVersion | null> {
  const q = query(
    collection(db, VERSIONS_COLLECTION),
    where('themeId', '==', themeId),
    orderBy('createdAt', 'desc'),
    limit(1)
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  return snapshot.docs[0].data() as ThemeVersion
}

/**
 * Rollback a theme to a previous version
 */
export async function rollback(
  themeId: string,
  versionId: string,
  userId: string
): Promise<void> {
  const theme = await getTheme(themeId)
  if (!theme) throw new Error('Theme not found')

  const version = await getVersion(versionId)
  if (!version) throw new Error('Version not found')
  if (version.themeId !== themeId) throw new Error('Version does not belong to this theme')

  // Create a snapshot of current state before rollback
  await createVersion(themeId, userId, `Pre-rollback snapshot (rolling back to ${version.version})`)

  // Apply version config and assets
  await updateThemeConfig(themeId, version.config, userId)
  await updateThemeAssets(themeId, version.assets, userId)
}

/**
 * Compare two versions and return the differences
 */
export async function compareVersions(
  versionId1: string,
  versionId2: string
): Promise<VersionDiff> {
  const version1 = await getVersion(versionId1)
  const version2 = await getVersion(versionId2)

  if (!version1 || !version2) {
    throw new Error('One or both versions not found')
  }

  return {
    configChanges: compareConfigs(version1.config, version2.config),
    assetChanges: compareAssets(version1.assets, version2.assets),
  }
}

/**
 * Delete old versions, keeping only the most recent MAX_VERSIONS
 */
export async function cleanupOldVersions(themeId: string): Promise<number> {
  const versions = await getVersions(themeId)

  if (versions.length <= MAX_VERSIONS) {
    return 0
  }

  // Delete versions beyond MAX_VERSIONS (oldest first)
  const versionsToDelete = versions.slice(MAX_VERSIONS)
  let deletedCount = 0

  for (const version of versionsToDelete) {
    try {
      await deleteDoc(doc(db, VERSIONS_COLLECTION, version.id))
      deletedCount++
    } catch (error) {
      console.error(`Failed to delete version ${version.id}:`, error)
    }
  }

  return deletedCount
}

/**
 * Delete all versions for a theme (used when deleting a theme)
 */
export async function deleteAllVersions(themeId: string): Promise<void> {
  const versions = await getVersions(themeId)

  for (const version of versions) {
    await deleteDoc(doc(db, VERSIONS_COLLECTION, version.id))
  }
}

// ============================================================================
// DIFF TYPES AND HELPERS
// ============================================================================

export interface VersionDiff {
  configChanges: ConfigChange[]
  assetChanges: AssetChanges
}

export interface ConfigChange {
  field: string
  path: string
  oldValue: unknown
  newValue: unknown
  type: 'added' | 'removed' | 'modified'
}

export interface AssetChanges {
  added: string[]
  removed: string[]
  modified: string[]
}

/**
 * Compare two theme configs and return differences
 */
function compareConfigs(
  config1: ThemeConfig,
  config2: ThemeConfig
): ConfigChange[] {
  const changes: ConfigChange[] = []

  // Compare colors
  compareObjects(config1.colors, config2.colors, 'colors', changes)

  // Compare typography
  compareObjects(config1.typography, config2.typography, 'typography', changes)

  // Compare layout
  compareObjects(config1.layout, config2.layout, 'layout', changes)

  // Compare components
  compareObjects(config1.components, config2.components, 'components', changes)

  return changes
}

/**
 * Recursively compare two objects
 */
function compareObjects(
  obj1: Record<string, unknown>,
  obj2: Record<string, unknown>,
  path: string,
  changes: ConfigChange[]
): void {
  const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})])

  for (const key of allKeys) {
    const fullPath = `${path}.${key}`
    const val1 = obj1?.[key]
    const val2 = obj2?.[key]

    if (val1 === undefined && val2 !== undefined) {
      changes.push({
        field: key,
        path: fullPath,
        oldValue: undefined,
        newValue: val2,
        type: 'added',
      })
    } else if (val1 !== undefined && val2 === undefined) {
      changes.push({
        field: key,
        path: fullPath,
        oldValue: val1,
        newValue: undefined,
        type: 'removed',
      })
    } else if (typeof val1 === 'object' && typeof val2 === 'object') {
      compareObjects(
        val1 as Record<string, unknown>,
        val2 as Record<string, unknown>,
        fullPath,
        changes
      )
    } else if (val1 !== val2) {
      changes.push({
        field: key,
        path: fullPath,
        oldValue: val1,
        newValue: val2,
        type: 'modified',
      })
    }
  }
}

/**
 * Compare two theme assets and return differences
 */
function compareAssets(assets1: ThemeAssets, assets2: ThemeAssets): AssetChanges {
  const changes: AssetChanges = {
    added: [],
    removed: [],
    modified: [],
  }

  // Collect all asset URLs from both versions
  const urls1 = collectAssetUrls(assets1)
  const urls2 = collectAssetUrls(assets2)

  // Find added assets (in 2 but not in 1)
  for (const url of urls2) {
    if (!urls1.has(url)) {
      changes.added.push(url)
    }
  }

  // Find removed assets (in 1 but not in 2)
  for (const url of urls1) {
    if (!urls2.has(url)) {
      changes.removed.push(url)
    }
  }

  // Check for modified custom CSS/JS
  if (assets1.css?.custom !== assets2.css?.custom) {
    changes.modified.push('custom.css')
  }
  if (assets1.js?.custom !== assets2.js?.custom) {
    changes.modified.push('custom.js')
  }

  return changes
}

/**
 * Collect all asset URLs from a ThemeAssets object
 */
function collectAssetUrls(assets: ThemeAssets): Set<string> {
  const urls = new Set<string>()

  // CSS
  assets.css?.main?.forEach(url => urls.add(url))
  assets.css?.vendors?.forEach(url => urls.add(url))

  // JS
  assets.js?.main?.forEach(url => urls.add(url))
  assets.js?.vendors?.forEach(url => urls.add(url))

  // Images
  if (assets.images?.logo?.primary) urls.add(assets.images.logo.primary)
  if (assets.images?.logo?.secondary) urls.add(assets.images.logo.secondary)
  if (assets.images?.logo?.favicon) urls.add(assets.images.logo.favicon)
  assets.images?.backgrounds?.forEach(url => urls.add(url))
  assets.images?.gallery?.forEach(url => urls.add(url))

  // Fonts
  assets.fonts?.files?.forEach(f => urls.add(f.url))

  return urls
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Increment a semantic version string
 */
function incrementVersion(version: string): string {
  const parts = version.split('.').map(Number)

  if (parts.length !== 3 || parts.some(isNaN)) {
    return '1.0.1' // Default if invalid
  }

  parts[2]++ // Increment patch version

  return parts.join('.')
}

/**
 * Deep clone an object
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Format a version for display
 */
export function formatVersion(version: ThemeVersion): string {
  const date = version.createdAt instanceof Timestamp
    ? version.createdAt.toDate()
    : new Date(version.createdAt as unknown as string)

  return `v${version.version} - ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
}

/**
 * Get a summary of changes for a version
 */
export function getVersionSummary(version: ThemeVersion): string {
  if (version.changelog) {
    return version.changelog
  }
  return `Version ${version.version} created`
}

// ============================================================================
// EXPORT SERVICE OBJECT
// ============================================================================

export const ThemeVersionService = {
  createVersion,
  getVersions,
  getVersion,
  getLatestVersion,
  rollback,
  compareVersions,
  cleanupOldVersions,
  deleteAllVersions,
  formatVersion,
  getVersionSummary,
}
