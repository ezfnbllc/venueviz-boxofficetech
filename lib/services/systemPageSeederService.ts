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
import {
  TenantPage,
  SystemPageType,
  PageSEO,
  PageSection,
  HeroContent,
  ContentBlockContent,
  EventsListContent,
  ContactFormContent,
  CTAContent,
  MapContent,
  SectionSettings,
} from '@/lib/types/cms'

const PAGES_COLLECTION = 'tenantPages'

// ============================================================================
// DEFAULT SECTION GENERATORS
// ============================================================================

/**
 * Generate a unique section ID
 */
function generateSectionId(): string {
  return `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Default section settings
 */
const defaultSettings: SectionSettings = {
  padding: 'medium',
  visibility: 'visible',
}

/**
 * Get default sections for a system page type
 * Only returns sections for CMS-editable pages (static content)
 * Core business pages (home, events, checkout, etc.) return empty arrays
 */
function getDefaultSectionsForPage(systemType: SystemPageType): PageSection[] {
  switch (systemType) {
    // ============================================================================
    // LOCKED PAGES - Return empty arrays (content managed by platform code)
    // ============================================================================
    case 'home':
    case 'events':
    case 'event-detail':
    case 'checkout':
    case 'login':
    case 'register':
    case 'account':
      return [] // Core pages - no CMS sections

    // ============================================================================
    // EDITABLE PAGES - Return default starter content
    // ============================================================================

    case 'about':
      return [
        {
          id: generateSectionId(),
          type: 'hero',
          order: 0,
          settings: { ...defaultSettings, padding: 'none' },
          content: {
            type: 'hero',
            headline: 'About Us',
            subheadline: 'Learn more about who we are and what we do',
            alignment: 'center',
            height: 'small',
            overlayOpacity: 0.5,
          } as HeroContent,
        },
        {
          id: generateSectionId(),
          type: 'content',
          order: 1,
          settings: defaultSettings,
          content: {
            type: 'content',
            heading: 'Our Story',
            body: `<p>Welcome to our events platform! We are passionate about bringing people together through memorable experiences.</p>
<p>Our mission is to make it easy for you to discover and attend amazing events in your area. Whether you're looking for concerts, theater, sports, or community gatherings, we've got you covered.</p>
<p>We work with the best venues and promoters to bring you a curated selection of events that cater to every taste and interest.</p>`,
            columns: 1,
          } as ContentBlockContent,
        },
        {
          id: generateSectionId(),
          type: 'content',
          order: 2,
          settings: { ...defaultSettings, backgroundColor: '#f8fafc' },
          content: {
            type: 'content',
            heading: 'Why Choose Us',
            body: `<ul>
<li><strong>Easy Booking:</strong> Simple and secure ticket purchasing</li>
<li><strong>Best Selection:</strong> Curated events from top promoters</li>
<li><strong>Great Support:</strong> Friendly customer service team</li>
<li><strong>Instant Delivery:</strong> E-tickets delivered to your inbox</li>
</ul>`,
            columns: 1,
          } as ContentBlockContent,
        },
      ]

    case 'contact':
      return [
        {
          id: generateSectionId(),
          type: 'hero',
          order: 0,
          settings: { ...defaultSettings, padding: 'none' },
          content: {
            type: 'hero',
            headline: 'Contact Us',
            subheadline: 'We\'d love to hear from you',
            alignment: 'center',
            height: 'small',
            overlayOpacity: 0.5,
          } as HeroContent,
        },
        {
          id: generateSectionId(),
          type: 'contact',
          order: 1,
          settings: defaultSettings,
          content: {
            type: 'contact',
            heading: 'Get in Touch',
            fields: [
              { id: 'name', type: 'text', label: 'Name', placeholder: 'Your name', required: true },
              { id: 'email', type: 'email', label: 'Email', placeholder: 'your@email.com', required: true },
              { id: 'subject', type: 'text', label: 'Subject', placeholder: 'How can we help?', required: false },
              { id: 'message', type: 'textarea', label: 'Message', placeholder: 'Your message...', required: true },
            ],
            submitButton: 'Send Message',
            successMessage: 'Thank you! We\'ll get back to you soon.',
            recipientEmail: '',
          } as ContactFormContent,
        },
        {
          id: generateSectionId(),
          type: 'map',
          order: 2,
          settings: defaultSettings,
          content: {
            type: 'map',
            heading: 'Find Us',
            address: '',
            zoom: 15,
            showMarker: true,
          } as MapContent,
        },
      ]

    case 'faq':
      return [
        {
          id: generateSectionId(),
          type: 'hero',
          order: 0,
          settings: { ...defaultSettings, padding: 'none' },
          content: {
            type: 'hero',
            headline: 'Frequently Asked Questions',
            subheadline: 'Find answers to common questions',
            alignment: 'center',
            height: 'small',
            overlayOpacity: 0.5,
          } as HeroContent,
        },
        {
          id: generateSectionId(),
          type: 'content',
          order: 1,
          settings: defaultSettings,
          content: {
            type: 'content',
            heading: 'Tickets & Booking',
            body: `<h4>How do I purchase tickets?</h4>
<p>Simply browse our events, select the one you're interested in, choose your seats or tickets, and complete the checkout process. You'll receive your tickets via email.</p>

<h4>Can I get a refund?</h4>
<p>Refund policies vary by event. Please check the specific event's terms and conditions or contact our support team for assistance.</p>

<h4>How do I access my tickets?</h4>
<p>After purchase, your tickets are available in your account dashboard and are also sent to your email. You can print them or show them on your mobile device.</p>`,
            columns: 1,
          } as ContentBlockContent,
        },
        {
          id: generateSectionId(),
          type: 'content',
          order: 2,
          settings: { ...defaultSettings, backgroundColor: '#f8fafc' },
          content: {
            type: 'content',
            heading: 'Account & Support',
            body: `<h4>How do I create an account?</h4>
<p>Click the "Sign Up" button and follow the registration process. You can also create an account during checkout.</p>

<h4>I forgot my password. What do I do?</h4>
<p>Click "Forgot Password" on the login page and enter your email address. We'll send you instructions to reset your password.</p>

<h4>How can I contact customer support?</h4>
<p>You can reach us through our contact page, by email, or by phone during business hours. We're here to help!</p>`,
            columns: 1,
          } as ContentBlockContent,
        },
      ]

    case 'terms':
      return [
        {
          id: generateSectionId(),
          type: 'content',
          order: 0,
          settings: defaultSettings,
          content: {
            type: 'content',
            heading: 'Terms of Service',
            body: `<p><em>Last updated: ${new Date().toLocaleDateString()}</em></p>

<h3>1. Acceptance of Terms</h3>
<p>By accessing and using this website, you accept and agree to be bound by the terms and conditions of this agreement.</p>

<h3>2. Ticket Purchases</h3>
<p>All ticket sales are final unless otherwise stated in the event-specific terms. Tickets are non-transferable unless explicitly allowed by the event organizer.</p>

<h3>3. User Accounts</h3>
<p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>

<h3>4. Prohibited Conduct</h3>
<p>You agree not to engage in any activity that interferes with or disrupts the services or servers connected to this website.</p>

<h3>5. Limitation of Liability</h3>
<p>We shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of our services.</p>

<h3>6. Changes to Terms</h3>
<p>We reserve the right to modify these terms at any time. Your continued use of the website constitutes acceptance of any changes.</p>

<p>For questions about these terms, please contact us.</p>`,
            columns: 1,
          } as ContentBlockContent,
        },
      ]

    case 'privacy':
      return [
        {
          id: generateSectionId(),
          type: 'content',
          order: 0,
          settings: defaultSettings,
          content: {
            type: 'content',
            heading: 'Privacy Policy',
            body: `<p><em>Last updated: ${new Date().toLocaleDateString()}</em></p>

<h3>Information We Collect</h3>
<p>We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us for support. This may include your name, email address, phone number, and payment information.</p>

<h3>How We Use Your Information</h3>
<p>We use the information we collect to:</p>
<ul>
<li>Process your ticket purchases</li>
<li>Send you transaction confirmations and event updates</li>
<li>Respond to your comments, questions, and requests</li>
<li>Improve our services and develop new features</li>
</ul>

<h3>Information Sharing</h3>
<p>We do not sell your personal information to third parties. We may share your information with event organizers for the events you purchase tickets to, and with service providers who assist us in operating our platform.</p>

<h3>Data Security</h3>
<p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>

<h3>Your Rights</h3>
<p>You have the right to access, correct, or delete your personal information. You can manage your account settings or contact us to exercise these rights.</p>

<h3>Contact Us</h3>
<p>If you have any questions about this Privacy Policy, please contact us through our contact page.</p>`,
            columns: 1,
          } as ContentBlockContent,
        },
      ]

    default:
      return []
  }
}

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
  isCmsEditable: boolean  // true = static content pages (about, contact, terms, privacy, faq)
                          // false = core business logic pages (home, events, checkout, etc.)
}

/**
 * All system pages that should be auto-created for advanced tenants
 */
export const SYSTEM_PAGES: SystemPageDefinition[] = [
  // ============================================================================
  // LOCKED PAGES - Core business logic, not editable via CMS
  // ============================================================================
  {
    systemType: 'home',
    title: 'Home',
    slug: '',
    description: 'Main landing page',
    showInNav: true,
    navOrder: 1,
    isCmsEditable: false, // Core page - locked
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
    isCmsEditable: false, // Core page - locked
    seo: {
      title: 'Events',
      description: 'Browse and discover upcoming events',
      keywords: ['events', 'upcoming', 'concerts', 'shows'],
    },
  },

  // ============================================================================
  // EDITABLE PAGES - Static content, can be edited via CMS
  // ============================================================================
  {
    systemType: 'about',
    title: 'About Us',
    slug: 'about',
    description: 'About our organization',
    showInNav: true,
    navOrder: 3,
    isCmsEditable: true, // Static content - editable
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
    isCmsEditable: true, // Static content - editable
    seo: {
      title: 'Contact Us',
      description: 'Contact us for inquiries and support',
      keywords: ['contact', 'support', 'help'],
    },
  },
  {
    systemType: 'terms',
    title: 'Terms of Service',
    slug: 'terms',
    description: 'Terms and conditions',
    showInNav: false,
    navOrder: 100,
    isCmsEditable: true, // Static content - editable
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
    isCmsEditable: true, // Static content - editable
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
    isCmsEditable: true, // Static content - editable
    seo: {
      title: 'FAQ',
      description: 'Frequently asked questions',
      keywords: ['faq', 'help', 'questions'],
    },
  },

  // ============================================================================
  // LOCKED PAGES - Account & Auth (not in nav, accessed via auth)
  // ============================================================================
  {
    systemType: 'login',
    title: 'Sign In',
    slug: 'login',
    description: 'Sign in to your account',
    showInNav: false,
    navOrder: 200,
    isCmsEditable: false, // Core page - locked
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
    isCmsEditable: false, // Core page - locked
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
    isCmsEditable: false, // Core page - locked
    seo: {
      title: 'My Account',
      description: 'Manage your account and orders',
      keywords: ['account', 'orders'],
      noIndex: true,
    },
  },

  // ============================================================================
  // LOCKED PAGES - Dynamic content (templates for dynamic content)
  // ============================================================================
  {
    systemType: 'event-detail',
    title: 'Event Detail',
    slug: 'events/:eventId',
    description: 'Individual event page',
    showInNav: false,
    navOrder: 300,
    isCmsEditable: false, // Core page - locked
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
    isCmsEditable: false, // Core page - locked
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

    // Get default sections for this page type
    const defaultSections = getDefaultSectionsForPage(pageDef.systemType)

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
      sections: defaultSections,
      status: 'published', // System pages are published by default
      isProtected: true,   // System pages cannot be deleted
      isLocked: !pageDef.isCmsEditable,    // Locked pages cannot be edited via CMS
      isCmsEditable: pageDef.isCmsEditable, // Only static content pages can be edited
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

/**
 * Populate default sections for existing system pages that have empty sections
 * This is useful for migrating pages that were created before default sections were added
 *
 * @param tenantId - The tenant ID
 * @param userId - The user performing the action (for audit)
 * @returns Object with updated and skipped page counts
 */
export async function populateDefaultSections(
  tenantId: string,
  userId: string
): Promise<{
  updated: string[]
  skipped: string[]
  total: number
}> {
  const db = getAdminDb()
  const updated: string[] = []
  const skipped: string[] = []

  // Get all system pages for this tenant
  const pagesSnapshot = await db.collection(PAGES_COLLECTION)
    .where('tenantId', '==', tenantId)
    .where('type', '==', 'system')
    .get()

  const batch = db.batch()
  const now = Timestamp.now()

  for (const doc of pagesSnapshot.docs) {
    const page = doc.data() as TenantPage
    const systemType = page.systemType as SystemPageType

    // Skip locked/non-CMS-editable pages (core business pages)
    if (page.isLocked || page.isCmsEditable === false) {
      skipped.push(`${systemType || page.title} (locked)`)
      continue
    }

    // Skip if page already has sections
    if (page.sections && page.sections.length > 0) {
      skipped.push(systemType || page.title)
      continue
    }

    // Get default sections for this page type
    const defaultSections = getDefaultSectionsForPage(systemType)

    // Skip if no default sections for this page type
    if (defaultSections.length === 0) {
      skipped.push(systemType || page.title)
      continue
    }

    // Update the page with default sections
    batch.update(doc.ref, {
      sections: defaultSections,
      updatedAt: now,
      updatedBy: userId,
    })
    updated.push(systemType || page.title)
  }

  // Commit all updates
  if (updated.length > 0) {
    await batch.commit()
  }

  return {
    updated,
    skipped,
    total: pagesSnapshot.size,
  }
}
