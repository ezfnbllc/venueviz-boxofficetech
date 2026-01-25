/**
 * CMS Page Service (Server-side)
 *
 * Server-side version using Firebase Admin SDK.
 * This bypasses Firestore security rules.
 */

import { getAdminDb } from '@/lib/firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  TenantPage,
  PageSection,
  PageTranslation,
  PageSEO,
  SectionType,
  PageType,
  SystemPageType,
} from '@/lib/types/cms'

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGES_COLLECTION = 'tenantPages'

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_SEO: PageSEO = {
  title: '',
  description: '',
  keywords: [],
  ogImage: '',
  noIndex: false,
}

// ============================================================================
// PAGE CRUD OPERATIONS
// ============================================================================

/**
 * Create a new page
 */
export async function createPageServer(
  tenantId: string,
  themeId: string,
  data: {
    title: string
    slug: string
    type?: PageType
    systemType?: SystemPageType
    templateId?: string
    isProtected?: boolean
    description?: string
    showInNav?: boolean
    navOrder?: number
  },
  userId: string
): Promise<TenantPage> {
  const db = getAdminDb()
  const pageRef = db.collection(PAGES_COLLECTION).doc()
  const pageId = pageRef.id

  const now = Timestamp.now()
  const page: TenantPage = {
    id: pageId,
    tenantId,
    themeId,
    title: data.title,
    slug: data.slug,
    description: data.description || '',
    defaultLanguage: 'en',
    availableLanguages: ['en'],
    translations: {},
    seo: DEFAULT_SEO,
    type: data.type || 'static',
    templateId: data.templateId || '',
    sections: [],
    status: 'draft',
    showInNav: data.showInNav ?? true,
    navOrder: data.navOrder ?? 0,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  }

  // Only add optional fields if they have values
  if (data.systemType) {
    page.systemType = data.systemType
  }
  if (data.isProtected) {
    page.isProtected = data.isProtected
  }

  await pageRef.set(page)
  return page
}

/**
 * Get a page by ID
 */
export async function getPageServer(pageId: string): Promise<TenantPage | null> {
  const db = getAdminDb()
  const doc = await db.collection(PAGES_COLLECTION).doc(pageId).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as TenantPage
}

/**
 * Get all pages for a tenant
 */
export async function getPagesByTenantServer(tenantId: string): Promise<TenantPage[]> {
  const db = getAdminDb()
  const snapshot = await db.collection(PAGES_COLLECTION)
    .where('tenantId', '==', tenantId)
    .orderBy('navOrder', 'asc')
    .get()

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as TenantPage[]
}

/**
 * Get published pages for a tenant
 */
export async function getPublishedPagesServer(tenantId: string): Promise<TenantPage[]> {
  const db = getAdminDb()
  const snapshot = await db.collection(PAGES_COLLECTION)
    .where('tenantId', '==', tenantId)
    .where('status', '==', 'published')
    .orderBy('navOrder', 'asc')
    .get()

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as TenantPage[]
}

/**
 * Get a page by slug
 */
export async function getPageBySlugServer(
  tenantId: string,
  slug: string
): Promise<TenantPage | null> {
  const db = getAdminDb()
  const snapshot = await db.collection(PAGES_COLLECTION)
    .where('tenantId', '==', tenantId)
    .where('slug', '==', slug)
    .limit(1)
    .get()

  if (snapshot.empty) return null
  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() } as TenantPage
}

/**
 * Update page basic info
 */
export async function updatePageServer(
  pageId: string,
  data: Partial<Pick<TenantPage, 'title' | 'slug' | 'description' | 'showInNav' | 'navOrder' | 'navLabel' | 'parentPageId'>>,
  userId: string
): Promise<void> {
  const db = getAdminDb()

  // Filter out undefined values
  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: userId,
  }

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      updateData[key] = value
    }
  })

  await db.collection(PAGES_COLLECTION).doc(pageId).update(updateData)
}

/**
 * Update page SEO
 */
export async function updatePageSEOServer(
  pageId: string,
  seo: Partial<PageSEO>,
  userId: string
): Promise<void> {
  const db = getAdminDb()
  const page = await getPageServer(pageId)
  if (!page) throw new Error('Page not found')

  await db.collection(PAGES_COLLECTION).doc(pageId).update({
    seo: { ...page.seo, ...seo },
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Update page sections
 */
export async function updatePageSectionsServer(
  pageId: string,
  sections: PageSection[],
  userId: string
): Promise<void> {
  const db = getAdminDb()
  await db.collection(PAGES_COLLECTION).doc(pageId).update({
    sections,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Add a section to a page
 */
export async function addSectionServer(
  pageId: string,
  sectionType: SectionType,
  userId: string,
  position?: number
): Promise<PageSection> {
  const page = await getPageServer(pageId)
  if (!page) throw new Error('Page not found')

  const section = createDefaultSectionServer(sectionType, page.sections.length)

  const sections = [...page.sections]
  if (position !== undefined && position >= 0 && position <= sections.length) {
    sections.splice(position, 0, section)
    sections.forEach((s, i) => (s.order = i))
  } else {
    sections.push(section)
  }

  await updatePageSectionsServer(pageId, sections, userId)
  return section
}

/**
 * Remove a section from a page
 */
export async function removeSectionServer(
  pageId: string,
  sectionId: string,
  userId: string
): Promise<void> {
  const page = await getPageServer(pageId)
  if (!page) throw new Error('Page not found')

  const sections = page.sections
    .filter(s => s.id !== sectionId)
    .map((s, i) => ({ ...s, order: i }))

  await updatePageSectionsServer(pageId, sections, userId)
}

/**
 * Update a specific section
 */
export async function updateSectionServer(
  pageId: string,
  sectionId: string,
  updates: Partial<PageSection>,
  userId: string
): Promise<void> {
  const page = await getPageServer(pageId)
  if (!page) throw new Error('Page not found')

  const sections = page.sections.map(s =>
    s.id === sectionId ? { ...s, ...updates } : s
  )

  await updatePageSectionsServer(pageId, sections, userId)
}

/**
 * Reorder sections
 */
export async function reorderSectionsServer(
  pageId: string,
  sectionIds: string[],
  userId: string
): Promise<void> {
  const page = await getPageServer(pageId)
  if (!page) throw new Error('Page not found')

  const sectionMap = new Map(page.sections.map(s => [s.id, s]))
  const sections = sectionIds
    .map((id, index) => {
      const section = sectionMap.get(id)
      if (section) {
        return { ...section, order: index }
      }
      return null
    })
    .filter((s): s is PageSection => s !== null)

  await updatePageSectionsServer(pageId, sections, userId)
}

/**
 * Publish a page
 */
export async function publishPageServer(pageId: string, userId: string): Promise<void> {
  const db = getAdminDb()
  await db.collection(PAGES_COLLECTION).doc(pageId).update({
    status: 'published',
    publishedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Unpublish a page (set to draft)
 */
export async function unpublishPageServer(pageId: string, userId: string): Promise<void> {
  const db = getAdminDb()
  await db.collection(PAGES_COLLECTION).doc(pageId).update({
    status: 'draft',
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Delete a page
 */
export async function deletePageServer(pageId: string): Promise<void> {
  const db = getAdminDb()
  await db.collection(PAGES_COLLECTION).doc(pageId).delete()
}

/**
 * Duplicate a page
 */
export async function duplicatePageServer(
  pageId: string,
  newSlug: string,
  userId: string
): Promise<TenantPage> {
  const db = getAdminDb()
  const page = await getPageServer(pageId)
  if (!page) throw new Error('Page not found')

  const newPageRef = db.collection(PAGES_COLLECTION).doc()
  const now = Timestamp.now()

  // Create new page object, excluding publishedAt
  const newPage: TenantPage = {
    ...page,
    id: newPageRef.id,
    title: `${page.title} (Copy)`,
    slug: newSlug,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  }

  // Remove publishedAt from the copy
  delete (newPage as Partial<TenantPage>).publishedAt

  await newPageRef.set(newPage)
  return newPage
}

// ============================================================================
// TRANSLATION OPERATIONS
// ============================================================================

/**
 * Add a language to a page
 */
export async function addLanguageServer(
  pageId: string,
  langCode: string,
  langName: string,
  userId: string
): Promise<void> {
  const db = getAdminDb()
  const page = await getPageServer(pageId)
  if (!page) throw new Error('Page not found')

  if (page.availableLanguages.includes(langCode)) {
    throw new Error('Language already exists')
  }

  const translation: PageTranslation = {
    langCode,
    langName,
    title: page.title,
    slug: `${langCode}/${page.slug}`,
    seo: { ...page.seo },
    sections: page.sections.map(s => ({ ...s })),
    status: 'draft',
    translatedBy: userId,
    translatedAt: Timestamp.now(),
  }

  await db.collection(PAGES_COLLECTION).doc(pageId).update({
    availableLanguages: [...page.availableLanguages, langCode],
    [`translations.${langCode}`]: translation,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Update a translation
 */
export async function updateTranslationServer(
  pageId: string,
  langCode: string,
  updates: Partial<PageTranslation>,
  userId: string
): Promise<void> {
  const db = getAdminDb()
  const page = await getPageServer(pageId)
  if (!page) throw new Error('Page not found')

  if (!page.translations[langCode]) {
    throw new Error('Translation not found')
  }

  await db.collection(PAGES_COLLECTION).doc(pageId).update({
    [`translations.${langCode}`]: {
      ...page.translations[langCode],
      ...updates,
      translatedBy: userId,
      translatedAt: Timestamp.now(),
    },
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Publish a translation
 */
export async function publishTranslationServer(
  pageId: string,
  langCode: string,
  userId: string
): Promise<void> {
  await updateTranslationServer(pageId, langCode, { status: 'published' }, userId)
}

/**
 * Remove a language from a page
 */
export async function removeLanguageServer(
  pageId: string,
  langCode: string,
  userId: string
): Promise<void> {
  const db = getAdminDb()
  const page = await getPageServer(pageId)
  if (!page) throw new Error('Page not found')

  if (langCode === page.defaultLanguage) {
    throw new Error('Cannot remove default language')
  }

  const { [langCode]: removed, ...remainingTranslations } = page.translations

  await db.collection(PAGES_COLLECTION).doc(pageId).update({
    availableLanguages: page.availableLanguages.filter(l => l !== langCode),
    translations: remainingTranslations,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: userId,
  })
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a default section based on type
 */
export function createDefaultSectionServer(
  type: SectionType,
  order: number
): PageSection {
  const id = `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const baseSection = {
    id,
    type,
    order,
    settings: {
      padding: 'medium' as const,
      visibility: 'visible' as const,
    },
  }

  switch (type) {
    case 'hero':
      return {
        ...baseSection,
        content: {
          type: 'hero',
          headline: 'Welcome to Our Site',
          subheadline: 'Discover amazing experiences',
          alignment: 'center',
          height: 'medium',
        },
      }

    case 'content':
      return {
        ...baseSection,
        content: {
          type: 'content',
          heading: 'About Us',
          body: '<p>Tell your story here. Share what makes you unique.</p>',
          columns: 1,
        },
      }

    case 'gallery':
      return {
        ...baseSection,
        content: {
          type: 'gallery',
          heading: 'Gallery',
          images: [],
          layout: 'grid',
          columns: 3,
        },
      }

    case 'events':
      return {
        ...baseSection,
        content: {
          type: 'events',
          heading: 'Upcoming Events',
          displayMode: 'grid',
          columns: 3,
          limit: 6,
          filter: { upcoming: true },
          showFilters: true,
        },
      }

    case 'testimonials':
      return {
        ...baseSection,
        content: {
          type: 'testimonials',
          heading: 'What People Say',
          testimonials: [],
          layout: 'carousel',
        },
      }

    case 'cta':
      return {
        ...baseSection,
        content: {
          type: 'cta',
          headline: 'Ready to Get Started?',
          subtext: 'Join us today and discover something amazing.',
          button: {
            text: 'Get Started',
            link: '/contact',
            style: 'primary',
          },
          style: 'banner',
        },
      }

    case 'contact':
      return {
        ...baseSection,
        content: {
          type: 'contact',
          heading: 'Get in Touch',
          fields: [
            { id: 'name', type: 'text', label: 'Name', required: true },
            { id: 'email', type: 'email', label: 'Email', required: true },
            { id: 'message', type: 'textarea', label: 'Message', required: true },
          ],
          submitButton: 'Send Message',
          successMessage: 'Thank you for your message!',
          recipientEmail: '',
        },
      }

    case 'map':
      return {
        ...baseSection,
        content: {
          type: 'map',
          heading: 'Find Us',
          address: '',
          zoom: 15,
          showMarker: true,
        },
      }

    case 'html':
      return {
        ...baseSection,
        content: {
          type: 'html',
          html: '<div class="custom-content">\n  <!-- Your custom HTML here -->\n</div>',
          css: '',
          js: '',
          sandboxed: true,
        },
      }

    default:
      return {
        ...baseSection,
        content: {
          type: 'content',
          heading: 'New Section',
          body: '<p>Content here...</p>',
          columns: 1,
        },
      }
  }
}
