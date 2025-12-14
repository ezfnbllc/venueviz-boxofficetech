/**
 * CMS Page Service
 *
 * Handles page CRUD operations with multi-language support
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
import { db } from '@/lib/firebase'
import {
  TenantPage,
  PageSection,
  PageTranslation,
  PageSEO,
  SectionType,
  HeroContent,
  ContentBlockContent,
  DEFAULT_THEME_CONFIG,
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

const DEFAULT_HERO_CONTENT: HeroContent = {
  type: 'hero',
  headline: 'Welcome',
  subheadline: 'Your tagline here',
  alignment: 'center',
  height: 'medium',
}

const DEFAULT_CONTENT_BLOCK: ContentBlockContent = {
  type: 'content',
  heading: 'Section Title',
  body: '<p>Your content here...</p>',
  columns: 1,
}

// ============================================================================
// PAGE CRUD OPERATIONS
// ============================================================================

/**
 * Create a new page
 */
export async function createPage(
  tenantId: string,
  themeId: string,
  data: {
    title: string
    slug: string
    type?: 'static' | 'dynamic' | 'system'
    systemType?: 'home' | 'events' | 'event-detail' | 'cart' | 'checkout'
    templateId?: string
  },
  userId: string
): Promise<TenantPage> {
  const pageId = doc(collection(db, PAGES_COLLECTION)).id

  const page: TenantPage = {
    id: pageId,
    tenantId,
    themeId,
    title: data.title,
    slug: data.slug,
    description: '',
    defaultLanguage: 'en',
    availableLanguages: ['en'],
    translations: {},
    seo: DEFAULT_SEO,
    type: data.type || 'static',
    systemType: data.systemType,
    templateId: data.templateId || '',
    sections: [],
    status: 'draft',
    showInNav: true,
    navOrder: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: userId,
    updatedBy: userId,
  }

  await setDoc(doc(db, PAGES_COLLECTION, pageId), page)
  return page
}

/**
 * Get a page by ID
 */
export async function getPage(pageId: string): Promise<TenantPage | null> {
  const docSnap = await getDoc(doc(db, PAGES_COLLECTION, pageId))
  if (!docSnap.exists()) return null
  return docSnap.data() as TenantPage
}

/**
 * Get all pages for a tenant
 */
export async function getPagesByTenant(tenantId: string): Promise<TenantPage[]> {
  const q = query(
    collection(db, PAGES_COLLECTION),
    where('tenantId', '==', tenantId),
    orderBy('navOrder', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => doc.data() as TenantPage)
}

/**
 * Get published pages for a tenant
 */
export async function getPublishedPages(tenantId: string): Promise<TenantPage[]> {
  const q = query(
    collection(db, PAGES_COLLECTION),
    where('tenantId', '==', tenantId),
    where('status', '==', 'published'),
    orderBy('navOrder', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => doc.data() as TenantPage)
}

/**
 * Get a page by slug
 */
export async function getPageBySlug(
  tenantId: string,
  slug: string
): Promise<TenantPage | null> {
  const q = query(
    collection(db, PAGES_COLLECTION),
    where('tenantId', '==', tenantId),
    where('slug', '==', slug)
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  return snapshot.docs[0].data() as TenantPage
}

/**
 * Update page basic info
 */
export async function updatePage(
  pageId: string,
  data: Partial<Pick<TenantPage, 'title' | 'slug' | 'description' | 'showInNav' | 'navOrder' | 'navLabel' | 'parentPageId'>>,
  userId: string
): Promise<void> {
  await updateDoc(doc(db, PAGES_COLLECTION, pageId), {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Update page SEO
 */
export async function updatePageSEO(
  pageId: string,
  seo: Partial<PageSEO>,
  userId: string
): Promise<void> {
  const page = await getPage(pageId)
  if (!page) throw new Error('Page not found')

  await updateDoc(doc(db, PAGES_COLLECTION, pageId), {
    seo: { ...page.seo, ...seo },
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Update page sections
 */
export async function updatePageSections(
  pageId: string,
  sections: PageSection[],
  userId: string
): Promise<void> {
  await updateDoc(doc(db, PAGES_COLLECTION, pageId), {
    sections,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Add a section to a page
 */
export async function addSection(
  pageId: string,
  sectionType: SectionType,
  userId: string,
  position?: number
): Promise<PageSection> {
  const page = await getPage(pageId)
  if (!page) throw new Error('Page not found')

  const section = createDefaultSection(sectionType, page.sections.length)

  const sections = [...page.sections]
  if (position !== undefined && position >= 0 && position <= sections.length) {
    sections.splice(position, 0, section)
    // Reorder
    sections.forEach((s, i) => (s.order = i))
  } else {
    sections.push(section)
  }

  await updatePageSections(pageId, sections, userId)
  return section
}

/**
 * Remove a section from a page
 */
export async function removeSection(
  pageId: string,
  sectionId: string,
  userId: string
): Promise<void> {
  const page = await getPage(pageId)
  if (!page) throw new Error('Page not found')

  const sections = page.sections
    .filter(s => s.id !== sectionId)
    .map((s, i) => ({ ...s, order: i }))

  await updatePageSections(pageId, sections, userId)
}

/**
 * Update a specific section
 */
export async function updateSection(
  pageId: string,
  sectionId: string,
  updates: Partial<PageSection>,
  userId: string
): Promise<void> {
  const page = await getPage(pageId)
  if (!page) throw new Error('Page not found')

  const sections = page.sections.map(s =>
    s.id === sectionId ? { ...s, ...updates } : s
  )

  await updatePageSections(pageId, sections, userId)
}

/**
 * Reorder sections
 */
export async function reorderSections(
  pageId: string,
  sectionIds: string[],
  userId: string
): Promise<void> {
  const page = await getPage(pageId)
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

  await updatePageSections(pageId, sections, userId)
}

/**
 * Publish a page
 */
export async function publishPage(pageId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, PAGES_COLLECTION, pageId), {
    status: 'published',
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Unpublish a page (set to draft)
 */
export async function unpublishPage(pageId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, PAGES_COLLECTION, pageId), {
    status: 'draft',
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Delete a page
 */
export async function deletePage(pageId: string): Promise<void> {
  await deleteDoc(doc(db, PAGES_COLLECTION, pageId))
}

/**
 * Duplicate a page
 */
export async function duplicatePage(
  pageId: string,
  newSlug: string,
  userId: string
): Promise<TenantPage> {
  const page = await getPage(pageId)
  if (!page) throw new Error('Page not found')

  const newPageId = doc(collection(db, PAGES_COLLECTION)).id
  const newPage: TenantPage = {
    ...page,
    id: newPageId,
    title: `${page.title} (Copy)`,
    slug: newSlug,
    status: 'draft',
    publishedAt: undefined,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: userId,
    updatedBy: userId,
  }

  await setDoc(doc(db, PAGES_COLLECTION, newPageId), newPage)
  return newPage
}

// ============================================================================
// TRANSLATION OPERATIONS
// ============================================================================

/**
 * Add a language to a page
 */
export async function addLanguage(
  pageId: string,
  langCode: string,
  langName: string,
  userId: string
): Promise<void> {
  const page = await getPage(pageId)
  if (!page) throw new Error('Page not found')

  if (page.availableLanguages.includes(langCode)) {
    throw new Error('Language already exists')
  }

  // Create translation from default content
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

  await updateDoc(doc(db, PAGES_COLLECTION, pageId), {
    availableLanguages: [...page.availableLanguages, langCode],
    [`translations.${langCode}`]: translation,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Update a translation
 */
export async function updateTranslation(
  pageId: string,
  langCode: string,
  updates: Partial<PageTranslation>,
  userId: string
): Promise<void> {
  const page = await getPage(pageId)
  if (!page) throw new Error('Page not found')

  if (!page.translations[langCode]) {
    throw new Error('Translation not found')
  }

  await updateDoc(doc(db, PAGES_COLLECTION, pageId), {
    [`translations.${langCode}`]: {
      ...page.translations[langCode],
      ...updates,
      translatedBy: userId,
      translatedAt: Timestamp.now(),
    },
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  })
}

/**
 * Publish a translation
 */
export async function publishTranslation(
  pageId: string,
  langCode: string,
  userId: string
): Promise<void> {
  await updateTranslation(pageId, langCode, { status: 'published' }, userId)
}

/**
 * Remove a language from a page
 */
export async function removeLanguage(
  pageId: string,
  langCode: string,
  userId: string
): Promise<void> {
  const page = await getPage(pageId)
  if (!page) throw new Error('Page not found')

  if (langCode === page.defaultLanguage) {
    throw new Error('Cannot remove default language')
  }

  const { [langCode]: removed, ...remainingTranslations } = page.translations

  await updateDoc(doc(db, PAGES_COLLECTION, pageId), {
    availableLanguages: page.availableLanguages.filter(l => l !== langCode),
    translations: remainingTranslations,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  })
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a default section based on type
 */
export function createDefaultSection(
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

/**
 * Get section type display name
 */
export function getSectionTypeName(type: SectionType): string {
  const names: Record<SectionType, string> = {
    hero: 'Hero Banner',
    content: 'Content Block',
    gallery: 'Image Gallery',
    events: 'Events List',
    testimonials: 'Testimonials',
    cta: 'Call to Action',
    contact: 'Contact Form',
    map: 'Map',
    custom: 'Custom Section',
    html: 'Custom HTML',
  }
  return names[type] || type
}

/**
 * Get section type icon (for UI)
 */
export function getSectionTypeIcon(type: SectionType): string {
  const icons: Record<SectionType, string> = {
    hero: '🎯',
    content: '📝',
    gallery: '🖼️',
    events: '📅',
    testimonials: '💬',
    cta: '🔔',
    contact: '✉️',
    map: '📍',
    custom: '⚙️',
    html: '💻',
  }
  return icons[type] || '📦'
}

// ============================================================================
// EXPORT SERVICE OBJECT
// ============================================================================

export const CMSPageService = {
  createPage,
  getPage,
  getPagesByTenant,
  getPublishedPages,
  getPageBySlug,
  updatePage,
  updatePageSEO,
  updatePageSections,
  addSection,
  removeSection,
  updateSection,
  reorderSections,
  publishPage,
  unpublishPage,
  deletePage,
  duplicatePage,
  addLanguage,
  updateTranslation,
  publishTranslation,
  removeLanguage,
  createDefaultSection,
  getSectionTypeName,
  getSectionTypeIcon,
}
