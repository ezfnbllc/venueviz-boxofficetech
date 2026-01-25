/**
 * System Page Seeder Service
 *
 * Auto-creates system page entries for tenants with advanced branding.
 * These pages correspond to the hardcoded React pages in app/p/[slug]/*
 *
 * System pages include:
 * - Home, Events, About, Contact, Privacy, Terms, FAQ
 * - Account pages (login, register, account)
 */

import { getAdminDb } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { TenantPage, SystemPageType, PageSEO } from '@/lib/types/cms'

const PAGES_COLLECTION = 'tenantPages'

// ============================================================================
// SYSTEM PAGE DEFINITIONS
// ============================================================================

interface SystemPageDefinition {
  systemType: SystemPageType
  title: string
  slug: string
  description: string
  showInNav: boolean
  navOrder: number
  seo: PageSEO
}

/**
 * All system pages that should be auto-created for advanced tenants
 */
export const SYSTEM_PAGES: SystemPageDefinition[] = [
  // Main Navigation Pages
  {
    systemType: 'home',
    title: 'Home',
    slug: '',
    description: 'Main landing page',
    showInNav: true,
    navOrder: 1,
    seo: {
      title: 'Home',
      description: 'Welcome to our event ticketing platform',
      keywords: ['events', 'tickets', 'concerts'],
    },
  },
  {
    systemType: 'events',
    title: 'Events',
    slug: 'events',
    description: 'Browse upcoming events',
    showInNav: true,
    navOrder: 2,
    seo: {
      title: 'Events',
      description: 'Browse and discover upcoming events',
      keywords: ['events', 'upcoming', 'concerts', 'shows'],
    },
  },
  {
    systemType: 'about',
    title: 'About Us',
    slug: 'about',
    description: 'About our organization',
    showInNav: true,
    navOrder: 3,
    seo: {
      title: 'About Us',
      description: 'Learn more about our organization',
      keywords: ['about', 'company', 'mission'],
    },
  },
  {
    systemType: 'contact',
    title: 'Contact Us',
    slug: 'contact',
    description: 'Get in touch with us',
    showInNav: true,
    navOrder: 4,
    seo: {
      title: 'Contact Us',
      description: 'Contact us for inquiries and support',
      keywords: ['contact', 'support', 'help'],
    },
  },

  // Legal Pages (not in main nav, shown in footer)
  {
    systemType: 'terms',
    title: 'Terms of Service',
    slug: 'terms',
    description: 'Terms and conditions',
    showInNav: false,
    navOrder: 100,
    seo: {
      title: 'Terms of Service',
      description: 'Our terms of service and conditions',
      keywords: ['terms', 'conditions', 'legal'],
    },
  },
  {
    systemType: 'privacy',
    title: 'Privacy Policy',
    slug: 'privacy',
    description: 'Privacy policy',
    showInNav: false,
    navOrder: 101,
    seo: {
      title: 'Privacy Policy',
      description: 'Our privacy policy',
      keywords: ['privacy', 'policy', 'data'],
    },
  },
  {
    systemType: 'faq',
    title: 'FAQ',
    slug: 'faq',
    description: 'Frequently asked questions',
    showInNav: false,
    navOrder: 102,
    seo: {
      title: 'FAQ',
      description: 'Frequently asked questions',
      keywords: ['faq', 'help', 'questions'],
    },
  },

  // Account Pages (not in nav, accessed via auth)
  {
    systemType: 'login',
    title: 'Sign In',
    slug: 'login',
    description: 'Sign in to your account',
    showInNav: false,
    navOrder: 200,
    seo: {
      title: 'Sign In',
      description: 'Sign in to your account',
      keywords: ['login', 'sign in'],
      noIndex: true,
    },
  },
  {
    systemType: 'register',
    title: 'Sign Up',
    slug: 'register',
    description: 'Create a new account',
    showInNav: false,
    navOrder: 201,
    seo: {
      title: 'Sign Up',
      description: 'Create a new account',
      keywords: ['register', 'sign up'],
      noIndex: true,
    },
  },
  {
    systemType: 'account',
    title: 'My Account',
    slug: 'account',
    description: 'Manage your account',
    showInNav: false,
    navOrder: 202,
    seo: {
      title: 'My Account',
      description: 'Manage your account and orders',
      keywords: ['account', 'orders'],
      noIndex: true,
    },
  },

  // Dynamic Pages (templates for dynamic content)
  {
    systemType: 'event-detail',
    title: 'Event Detail',
    slug: 'events/:eventId',
    description: 'Individual event page',
    showInNav: false,
    navOrder: 300,
    seo: {
      title: 'Event',
      description: 'Event details and ticket information',
      keywords: ['event', 'tickets'],
    },
  },
  {
    systemType: 'checkout',
    title: 'Checkout',
    slug: 'checkout',
    description: 'Complete your purchase',
    showInNav: false,
    navOrder: 301,
    seo: {
      title: 'Checkout',
      description: 'Complete your ticket purchase',
      keywords: ['checkout', 'payment'],
      noIndex: true,
    },
  },
]

// ============================================================================
// SEEDER FUNCTIONS
// ============================================================================

/**
 * Initialize system pages for a tenant
 * Creates all system page entries if they don't already exist
 *
 * @param tenantId - The tenant ID
 * @param themeId - The theme ID to associate with pages
 * @param userId - The user performing the action (for audit)
 * @returns Object with created, skipped, and total counts
 */
export async function initializeSystemPages(
  tenantId: string,
  themeId: string,
  userId: string
): Promise<{
  created: string[]
  skipped: string[]
  total: number
}> {
  const db = getAdminDb()
  const created: string[] = []
  const skipped: string[] = []

  // Get existing pages for this tenant
  const existingPagesSnapshot = await db.collection(PAGES_COLLECTION)
    .where('tenantId', '==', tenantId)
    .where('type', '==', 'system')
    .get()

  const existingSystemTypes = new Set(
    existingPagesSnapshot.docs.map(doc => doc.data().systemType as SystemPageType)
  )

  // Create batch for efficiency
  const batch = db.batch()
  const now = Timestamp.now()

  for (const pageDef of SYSTEM_PAGES) {
    // Skip if already exists
    if (existingSystemTypes.has(pageDef.systemType)) {
      skipped.push(pageDef.systemType)
      continue
    }

    const pageRef = db.collection(PAGES_COLLECTION).doc()
    const page: TenantPage = {
      id: pageRef.id,
      tenantId,
      themeId,
      title: pageDef.title,
      slug: pageDef.slug,
      description: pageDef.description,
      defaultLanguage: 'en',
      availableLanguages: ['en'],
      translations: {},
      seo: pageDef.seo,
      type: 'system',
      systemType: pageDef.systemType,
      templateId: '',
      sections: [],
      status: 'published', // System pages are published by default
      isProtected: true,   // System pages cannot be deleted
      showInNav: pageDef.showInNav,
      navOrder: pageDef.navOrder,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    }

    batch.set(pageRef, page)
    created.push(pageDef.systemType)
  }

  // Commit all pages in one batch
  if (created.length > 0) {
    await batch.commit()
  }

  return {
    created,
    skipped,
    total: SYSTEM_PAGES.length,
  }
}

/**
 * Check if system pages are initialized for a tenant
 */
export async function areSystemPagesInitialized(tenantId: string): Promise<{
  initialized: boolean
  existing: number
  total: number
  missing: SystemPageType[]
}> {
  const db = getAdminDb()

  const existingPagesSnapshot = await db.collection(PAGES_COLLECTION)
    .where('tenantId', '==', tenantId)
    .where('type', '==', 'system')
    .get()

  const existingSystemTypes = new Set(
    existingPagesSnapshot.docs.map(doc => doc.data().systemType as SystemPageType)
  )

  const missing = SYSTEM_PAGES
    .filter(p => !existingSystemTypes.has(p.systemType))
    .map(p => p.systemType)

  return {
    initialized: missing.length === 0,
    existing: existingPagesSnapshot.size,
    total: SYSTEM_PAGES.length,
    missing,
  }
}

/**
 * Get system page definitions
 */
export function getSystemPageDefinitions(): SystemPageDefinition[] {
  return SYSTEM_PAGES
}

/**
 * Get a specific system page by type for a tenant
 */
export async function getSystemPage(
  tenantId: string,
  systemType: SystemPageType
): Promise<TenantPage | null> {
  const db = getAdminDb()

  const snapshot = await db.collection(PAGES_COLLECTION)
    .where('tenantId', '==', tenantId)
    .where('type', '==', 'system')
    .where('systemType', '==', systemType)
    .limit(1)
    .get()

  if (snapshot.empty) return null
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as TenantPage
}
