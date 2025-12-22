/**
 * Theme Resolution Service
 *
 * Handles the lazy inheritance model for tenant themes:
 * 1. If tenant has a custom theme, use it
 * 2. If tenant has a default theme reference, use that
 * 3. Fall back to master tenant's default theme (Barren)
 *
 * This enables new tenants to automatically use the platform theme
 * until they upload their own custom theme.
 */

import { getAdminFirestore } from '@/lib/firebase-admin'
import { TenantTheme } from '@/lib/types/cms'
import { Tenant } from '@/lib/services/whiteLabelService'

// Master tenant configuration
export const MASTER_TENANT_ID = 'PAqFLcCQwxUYKr7i8g5t'
export const MASTER_ADMIN_EMAIL = 'boxofficetechllp@gmail.com'

// Cache for resolved themes (5 minute TTL)
const themeCache = new Map<string, { theme: TenantTheme | null; expiry: number }>()
const CACHE_TTL = 5 * 60 * 1000

/**
 * Get the resolved theme for a tenant
 * Follows the inheritance chain: custom -> default -> master
 */
export async function getThemeForTenant(tenantId: string): Promise<TenantTheme | null> {
  // Check cache first
  const cached = themeCache.get(tenantId)
  if (cached && cached.expiry > Date.now()) {
    return cached.theme
  }

  const db = getAdminFirestore()

  // Get the tenant document
  const tenantDoc = await db.collection('tenants').doc(tenantId).get()
  if (!tenantDoc.exists) {
    console.warn(`[ThemeResolution] Tenant ${tenantId} not found`)
    return null
  }

  const tenant = tenantDoc.data() as Tenant
  let theme: TenantTheme | null = null

  // Priority 1: Tenant's custom theme
  if (tenant.customThemeId) {
    const customThemeDoc = await db.collection('tenantThemes').doc(tenant.customThemeId).get()
    if (customThemeDoc.exists) {
      theme = { id: customThemeDoc.id, ...customThemeDoc.data() } as TenantTheme
      console.log(`[ThemeResolution] Using custom theme for tenant ${tenantId}: ${theme.themeName}`)
    }
  }

  // Priority 2: Tenant's default theme reference
  if (!theme && tenant.defaultThemeId) {
    const defaultThemeDoc = await db.collection('tenantThemes').doc(tenant.defaultThemeId).get()
    if (defaultThemeDoc.exists) {
      theme = { id: defaultThemeDoc.id, ...defaultThemeDoc.data() } as TenantTheme
      console.log(`[ThemeResolution] Using default theme for tenant ${tenantId}: ${theme.themeName}`)
    }
  }

  // Priority 3: Fall back to master tenant's theme
  if (!theme && tenantId !== MASTER_TENANT_ID) {
    theme = await getMasterTheme()
    if (theme) {
      console.log(`[ThemeResolution] Using master theme for tenant ${tenantId}: ${theme.themeName}`)
    }
  }

  // Cache the result
  themeCache.set(tenantId, { theme, expiry: Date.now() + CACHE_TTL })

  return theme
}

/**
 * Get the master tenant's default theme (Barren)
 */
export async function getMasterTheme(): Promise<TenantTheme | null> {
  const cacheKey = `master_theme`
  const cached = themeCache.get(cacheKey)
  if (cached && cached.expiry > Date.now()) {
    return cached.theme
  }

  const db = getAdminFirestore()

  // Get master tenant
  const masterTenantDoc = await db.collection('tenants').doc(MASTER_TENANT_ID).get()
  if (!masterTenantDoc.exists) {
    console.error(`[ThemeResolution] Master tenant ${MASTER_TENANT_ID} not found`)
    return null
  }

  const masterTenant = masterTenantDoc.data() as Tenant

  // Get master tenant's default theme
  if (!masterTenant.defaultThemeId) {
    // Try to find the theme marked as default
    const defaultThemeQuery = await db
      .collection('tenantThemes')
      .where('tenantId', '==', MASTER_TENANT_ID)
      .where('isDefault', '==', true)
      .where('status', '==', 'active')
      .limit(1)
      .get()

    if (!defaultThemeQuery.empty) {
      const themeDoc = defaultThemeQuery.docs[0]
      const theme = { id: themeDoc.id, ...themeDoc.data() } as TenantTheme
      themeCache.set(cacheKey, { theme, expiry: Date.now() + CACHE_TTL })
      return theme
    }

    console.warn(`[ThemeResolution] Master tenant has no default theme configured`)
    return null
  }

  const themeDoc = await db.collection('tenantThemes').doc(masterTenant.defaultThemeId).get()
  if (!themeDoc.exists) {
    console.error(`[ThemeResolution] Master theme ${masterTenant.defaultThemeId} not found`)
    return null
  }

  const theme = { id: themeDoc.id, ...themeDoc.data() } as TenantTheme
  themeCache.set(cacheKey, { theme, expiry: Date.now() + CACHE_TTL })

  return theme
}

/**
 * Get the master tenant document
 */
export async function getMasterTenant(): Promise<Tenant | null> {
  const db = getAdminFirestore()
  const tenantDoc = await db.collection('tenants').doc(MASTER_TENANT_ID).get()

  if (!tenantDoc.exists) {
    return null
  }

  return { id: tenantDoc.id, ...tenantDoc.data() } as Tenant
}

/**
 * Check if a user is a superadmin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const db = getAdminFirestore()

  // Check users collection for superadmin role
  const userDoc = await db.collection('users').doc(userId).get()
  if (userDoc.exists) {
    const userData = userDoc.data()
    if (userData?.role === 'superadmin' || userData?.canAccessAllTenants === true) {
      return true
    }
  }

  // Also check tenantUsers collection
  const tenantUserQuery = await db
    .collection('tenantUsers')
    .where('userId', '==', userId)
    .where('role', '==', 'superadmin')
    .limit(1)
    .get()

  return !tenantUserQuery.empty
}

/**
 * Check if a user can access a specific tenant
 */
export async function canAccessTenant(userId: string, tenantId: string): Promise<boolean> {
  // Superadmins can access all tenants
  if (await isSuperAdmin(userId)) {
    return true
  }

  const db = getAdminFirestore()

  // Check if user is associated with this tenant
  const tenantUserQuery = await db
    .collection('tenantUsers')
    .where('userId', '==', userId)
    .where('tenantId', '==', tenantId)
    .where('status', '==', 'active')
    .limit(1)
    .get()

  return !tenantUserQuery.empty
}

/**
 * Clear theme cache for a tenant (call when theme is updated)
 */
export function clearThemeCache(tenantId?: string): void {
  if (tenantId) {
    themeCache.delete(tenantId)
  } else {
    themeCache.clear()
  }
}

/**
 * Get all tenants (superadmin only)
 */
export async function getAllTenants(): Promise<Tenant[]> {
  const db = getAdminFirestore()
  const tenantsSnapshot = await db.collection('tenants').orderBy('createdAt', 'desc').get()

  return tenantsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Tenant[]
}
