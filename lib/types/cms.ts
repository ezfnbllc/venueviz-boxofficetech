/**
 * Advanced White-Label CMS Types
 *
 * Types for the WordPress-like CMS system for tenants with 'advanced' branding plan.
 * Supports ThemeForest theme imports, page building, multi-language, and version control.
 */

import { Timestamp } from 'firebase/firestore'

// ============================================================================
// THEME TYPES
// ============================================================================

export interface TenantTheme {
  id: string
  tenantId: string
  themeName: string                    // e.g., "EventHub Pro"
  themeSource: 'themeforest' | 'custom' | 'core'  // 'core' = platform default
  themeforestId?: string               // ThemeForest item ID
  purchasedAt?: Timestamp
  licenseType?: 'regular' | 'extended'

  status: 'draft' | 'active' | 'archived'
  version: string                      // Semantic versioning e.g., "1.0.0"

  // Asset Storage Paths (Firebase Storage)
  assets: ThemeAssets

  // Theme Configuration
  config: ThemeConfig

  // Page Templates from Theme
  templates: ThemeTemplate[]

  createdAt: Timestamp
  updatedAt: Timestamp
  publishedAt?: Timestamp
  createdBy: string
  updatedBy: string

  // Core/Default Theme Fields
  isDefault?: boolean                  // true = platform default theme (Barren)
  isMasterTheme?: boolean              // true = owned by master tenant, inheritable
}

export interface ThemeAssets {
  basePath: string                     // tenants/{tenantId}/themes/{themeId}/
  css: ThemeCSSAssets
  js: ThemeJSAssets
  images: ThemeImageAssets
  fonts: ThemeFontAssets
  icons: ThemeIconAssets
}

export interface ThemeCSSAssets {
  main: string[]                       // Main stylesheets
  vendors: string[]                    // Third-party CSS (bootstrap, etc.)
  custom: string                       // Tenant's custom CSS overrides
}

export interface ThemeJSAssets {
  main: string[]                       // Core JS files
  vendors: string[]                    // Libraries (jQuery, etc.)
  custom: string                       // Tenant's custom JS
}

export interface ThemeImageAssets {
  logo: {
    primary: string
    secondary?: string
    favicon: string
    loading?: string                   // Loading spinner
  }
  backgrounds: string[]
  gallery: string[]
  placeholders: Record<string, string>
}

export interface ThemeFontAssets {
  files: {
    name: string
    url: string
    format: 'woff2' | 'woff' | 'ttf' | 'otf'
  }[]
  fontFaces: string                    // @font-face CSS
}

export interface ThemeIconAssets {
  library: 'fontawesome' | 'feather' | 'material' | 'custom'
  customIcons?: {
    name: string
    svg: string
  }[]
  spriteSheet?: string
}

export interface ThemeConfig {
  // Colors (extends basic branding)
  colors: ThemeColors

  // Typography
  typography: ThemeTypography

  // Layout
  layout: ThemeLayout

  // Component Styles
  components: ThemeComponentStyles
}

export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
  textSecondary: string
  heading: string
  link: string
  linkHover: string
  border: string
  // State colors
  success: string
  warning: string
  error: string
  info: string
}

export interface ThemeTypography {
  headingFont: string
  bodyFont: string
  monoFont?: string
  baseFontSize: string                 // e.g., "16px"
  lineHeight: string                   // e.g., "1.6"
  scale: number                        // Type scale ratio e.g., 1.25
}

export interface ThemeLayout {
  containerWidth: string               // e.g., "1200px"
  sidebarWidth: string                 // e.g., "280px"
  headerHeight: string                 // e.g., "80px"
  footerHeight: string                 // e.g., "200px"
  spacing: 'compact' | 'normal' | 'relaxed'
}

export interface ThemeComponentStyles {
  buttonStyle: 'rounded' | 'square' | 'pill'
  cardStyle: 'flat' | 'raised' | 'bordered'
  inputStyle: 'underline' | 'outlined' | 'filled'
}

export interface ThemeTemplate {
  id: string
  name: string                         // e.g., "Home", "Event List", "Event Detail"
  type: 'page' | 'section' | 'component'
  htmlFile: string                     // Path to original HTML file
  slots: TemplateSlot[]                // Customizable content areas (auto-detected)
  thumbnail?: string
}

export interface TemplateSlot {
  id: string
  name: string                         // e.g., "hero-title", "about-content"
  type: 'text' | 'html' | 'image' | 'gallery' | 'dynamic'
  selector: string                     // CSS selector for replacement
  defaultContent?: string
  detectedBy: 'auto' | 'manual'        // How slot was identified
}

// Theme version for rollback (keep last 3)
export interface ThemeVersion {
  id: string
  themeId: string
  version: string                      // e.g., "1.0.0", "1.0.1"
  config: ThemeConfig
  assets: ThemeAssets
  createdAt: Timestamp
  createdBy: string
  changelog?: string
}

// ============================================================================
// TEMPLATE PARSER TYPES
// ============================================================================

export interface TemplateParserResult {
  templates: ParsedTemplate[]
  assets: {
    css: string[]
    js: string[]
    images: string[]
    fonts: string[]
  }
  dependencies: {
    jquery: boolean
    bootstrap: boolean
    swiper: boolean
    [key: string]: boolean
  }
  warnings: string[]                   // Parsing issues
}

export interface ParsedTemplate {
  filename: string
  suggestedName: string                // e.g., "Home Page" from index.html
  slots: DetectedSlot[]
  structure: {
    hasHeader: boolean
    hasFooter: boolean
    hasSidebar: boolean
    sections: string[]                 // Section IDs/classes found
  }
}

export interface DetectedSlot {
  selector: string
  suggestedName: string
  suggestedType: 'text' | 'html' | 'image' | 'gallery' | 'dynamic'
  confidence: 'high' | 'medium' | 'low'
  defaultContent: string
  attributes: Record<string, string>
}

// ============================================================================
// PAGE TYPES
// ============================================================================

export type PageType = 'static' | 'dynamic' | 'system' | 'custom' | 'landing'

export type SystemPageType =
  | 'home'
  | 'events'
  | 'event-detail'
  | 'cart'
  | 'checkout'
  | 'about'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'faq'
  | 'venues'
  | 'venue-detail'
  | 'account'
  | 'login'
  | 'register'

export interface TenantPage {
  id: string
  tenantId: string
  themeId: string

  // Page Info
  title: string
  slug: string                         // URL path e.g., "about-us"
  description?: string

  // Multi-language Support
  defaultLanguage: string              // e.g., "en"
  availableLanguages: string[]         // e.g., ["en", "es", "fr"]
  translations: {
    [langCode: string]: PageTranslation
  }

  // SEO (default language)
  seo: PageSEO

  // Page Type
  type: PageType
  systemType?: SystemPageType
  isProtected?: boolean                  // System pages cannot be deleted

  // Template
  templateId: string

  // Content Blocks (default language)
  sections: PageSection[]

  // Status
  status: 'draft' | 'published' | 'scheduled'
  publishedAt?: Timestamp
  scheduledFor?: Timestamp

  // Navigation
  showInNav: boolean
  navOrder?: number
  navLabel?: string
  parentPageId?: string                // For subpages

  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  updatedBy: string
}

export interface PageSEO {
  title?: string
  description?: string
  keywords?: string[]
  ogImage?: string
  noIndex?: boolean
}

export interface PageTranslation {
  langCode: string                     // e.g., "es"
  langName: string                     // e.g., "Español"
  title: string
  slug: string                         // Localized slug e.g., "sobre-nosotros"
  seo: PageSEO
  sections: PageSection[]              // Translated section content
  status: 'draft' | 'published'
  translatedBy?: string
  translatedAt?: Timestamp
}

export interface PageSection {
  id: string
  type: SectionType
  settings: SectionSettings
  content: SectionContent
  order: number
}

export type SectionType =
  | 'hero'
  | 'content'
  | 'gallery'
  | 'events'
  | 'testimonials'
  | 'cta'
  | 'contact'
  | 'map'
  | 'custom'
  | 'html'

export interface SectionSettings {
  backgroundColor?: string
  backgroundImage?: string
  padding?: 'none' | 'small' | 'medium' | 'large'
  animation?: string
  visibility?: 'visible' | 'hidden'
  cssClass?: string
}

// Union type for different section contents
export type SectionContent =
  | HeroContent
  | ContentBlockContent
  | GalleryContent
  | EventsListContent
  | TestimonialsContent
  | CTAContent
  | ContactFormContent
  | MapContent
  | CustomHTMLContent

export interface HeroContent {
  type: 'hero'
  headline: string
  subheadline?: string
  backgroundImage?: string
  overlayOpacity?: number
  ctaButton?: {
    text: string
    link: string
    style: 'primary' | 'secondary' | 'outline'
  }
  alignment: 'left' | 'center' | 'right'
  height: 'small' | 'medium' | 'full'
}

export interface ContentBlockContent {
  type: 'content'
  heading?: string
  body: string                         // Rich text HTML
  image?: string
  imagePosition?: 'left' | 'right' | 'top' | 'bottom'
  columns?: 1 | 2 | 3 | 4
}

export interface GalleryContent {
  type: 'gallery'
  heading?: string
  images: {
    url: string
    caption?: string
    link?: string
  }[]
  layout: 'grid' | 'masonry' | 'carousel' | 'lightbox'
  columns: 2 | 3 | 4 | 6
}

export interface EventsListContent {
  type: 'events'
  heading?: string
  displayMode: 'grid' | 'list' | 'carousel'
  columns: 2 | 3 | 4
  limit: number
  filter: {
    upcoming?: boolean
    categories?: string[]
    featured?: boolean
  }
  showFilters: boolean
}

export interface TestimonialsContent {
  type: 'testimonials'
  heading?: string
  testimonials: {
    quote: string
    author: string
    title?: string
    avatar?: string
    rating?: number
  }[]
  layout: 'grid' | 'carousel' | 'stacked'
}

export interface CTAContent {
  type: 'cta'
  headline: string
  subtext?: string
  button: {
    text: string
    link: string
    style: 'primary' | 'secondary'
  }
  style: 'simple' | 'banner' | 'card'
}

export interface ContactFormContent {
  type: 'contact'
  heading?: string
  fields: FormField[]
  submitButton: string
  successMessage: string
  recipientEmail: string
}

export interface FormField {
  id: string
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox'
  label: string
  placeholder?: string
  required: boolean
  options?: string[]                   // For select fields
}

export interface MapContent {
  type: 'map'
  heading?: string
  address?: string
  latitude?: number
  longitude?: number
  zoom?: number
  showMarker?: boolean
}

export interface CustomHTMLContent {
  type: 'html'
  html: string
  css?: string
  js?: string
  sandboxed: boolean                   // Run JS in sandboxed iframe
}

// Custom JavaScript with security controls
export interface CustomCodeConfig {
  enabled: boolean
  html: string
  css: string
  js: string

  // Security settings
  sandbox: {
    enabled: boolean                   // Iframe isolation
    allowScripts: boolean              // allow-scripts
    allowForms: boolean                // allow-forms
    allowPopups: boolean               // allow-popups
    allowSameOrigin: boolean           // allow-same-origin (careful!)
  }

  // Allowed external resources
  allowedDomains: string[]             // CDN domains allowed

  // Execution context
  executeOn: 'load' | 'domready' | 'manual'
}

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

export interface TenantNavigation {
  id: string
  tenantId: string

  // Navigation Areas
  menus: {
    main: NavMenuItem[]                // Main header navigation
    footer: NavMenuItem[]              // Footer links
    mobile?: NavMenuItem[]             // Mobile-specific menu
  }

  // Social Links
  socialLinks: {
    facebook?: string
    instagram?: string
    twitter?: string
    youtube?: string
    tiktok?: string
    linkedin?: string
  }

  // Contact Info (shown in footer/header)
  contact: {
    email?: string
    phone?: string
    address?: string
  }

  updatedAt: Timestamp
}

export interface NavMenuItem {
  id: string
  label: string
  type: 'page' | 'external' | 'section' | 'dropdown'
  pageId?: string                      // Link to TenantPage
  url?: string                         // External URL
  sectionId?: string                   // Anchor link
  children?: NavMenuItem[]             // Dropdown items
  order: number
  visible: boolean
  openInNewTab?: boolean
}

// ============================================================================
// LANGUAGE TYPES
// ============================================================================

export interface TenantLanguageConfig {
  tenantId: string
  defaultLanguage: string              // e.g., "en"
  enabledLanguages: LanguageConfig[]
  autoDetect: boolean                  // Detect from browser
  urlStrategy: 'subdirectory' | 'query' | 'subdomain'
}

export interface LanguageConfig {
  code: string                         // ISO 639-1 code e.g., "es"
  name: string                         // Display name e.g., "Español"
  nativeName: string                   // Native name e.g., "Español"
  direction: 'ltr' | 'rtl'             // Text direction
  enabled: boolean
  isDefault: boolean
}

// Supported languages (initial set)
export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', enabled: true, isDefault: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr', enabled: false, isDefault: false },
  { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr', enabled: false, isDefault: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr', enabled: false, isDefault: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr', enabled: false, isDefault: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'ltr', enabled: false, isDefault: false },
  { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'ltr', enabled: false, isDefault: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr', enabled: false, isDefault: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr', enabled: false, isDefault: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', enabled: false, isDefault: false },
]

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  colors: {
    primary: '#6366F1',
    secondary: '#8B5CF6',
    accent: '#F59E0B',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#1E293B',
    textSecondary: '#64748B',
    heading: '#0F172A',
    link: '#6366F1',
    linkHover: '#4F46E5',
    border: '#E2E8F0',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  typography: {
    headingFont: 'Inter, sans-serif',
    bodyFont: 'Inter, sans-serif',
    monoFont: 'JetBrains Mono, monospace',
    baseFontSize: '16px',
    lineHeight: '1.6',
    scale: 1.25,
  },
  layout: {
    containerWidth: '1200px',
    sidebarWidth: '280px',
    headerHeight: '80px',
    footerHeight: '200px',
    spacing: 'normal',
  },
  components: {
    buttonStyle: 'rounded',
    cardStyle: 'raised',
    inputStyle: 'outlined',
  },
}

export const DEFAULT_THEME_ASSETS: ThemeAssets = {
  basePath: '',
  css: {
    main: [],
    vendors: [],
    custom: '',
  },
  js: {
    main: [],
    vendors: [],
    custom: '',
  },
  images: {
    logo: {
      primary: '',
      favicon: '',
    },
    backgrounds: [],
    gallery: [],
    placeholders: {},
  },
  fonts: {
    files: [],
    fontFaces: '',
  },
  icons: {
    library: 'feather',
  },
}

// ============================================================================
// SECURITY CONSTANTS
// ============================================================================

export const ALLOWED_FILE_TYPES = {
  css: ['text/css'],
  js: ['application/javascript', 'text/javascript'],
  html: ['text/html'],
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  fonts: ['font/woff', 'font/woff2', 'font/ttf', 'font/otf', 'application/font-woff', 'application/font-woff2'],
}

export const MAX_FILE_SIZES = {
  css: 5 * 1024 * 1024,      // 5MB
  js: 2 * 1024 * 1024,       // 2MB
  html: 5 * 1024 * 1024,     // 5MB
  images: 10 * 1024 * 1024,  // 10MB
  fonts: 5 * 1024 * 1024,    // 5MB
  zip: 100 * 1024 * 1024,    // 100MB
}

export const ALLOWED_CDN_DOMAINS = [
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'unpkg.com',
  'www.youtube.com',
  'player.vimeo.com',
  'maps.googleapis.com',
]

// Sandboxed iframe for custom JS execution
export const SANDBOX_PERMISSIONS = [
  'allow-scripts',
  'allow-forms',
  // 'allow-same-origin', // DANGEROUS - avoid if possible
] as const

// CSP for portal pages with custom JS
export const CSP_HEADER = `
  default-src 'self';
  script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https: blob:;
  frame-src 'self' https://www.youtube.com https://player.vimeo.com;
`.replace(/\s+/g, ' ').trim()
