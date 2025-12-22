# Advanced White-Label CMS Plan

## Overview

Build a WordPress-like content management system for tenants with `brandingType: 'advanced'` plan. This system enables tenants to have fully functioning white-label websites using licensed ThemeForest themes.

---

## Confirmed Decisions

| Decision | Choice | Notes |
|----------|--------|-------|
| **Theme Import** | ZIP upload first, Google Drive API later | Hybrid approach - ZIP is simpler and ThemeForest distributes as ZIP |
| **Template Parser** | Yes | Auto-detect content slots from ThemeForest HTML files |
| **Custom JavaScript** | Yes | Allow with security sandboxing (iframe isolation) |
| **Multi-language** | Yes | Support multiple language versions per page |
| **Version Control** | 3 versions | Keep last 3 theme versions for rollback |

---

## System Architecture

### High-Level Flow

```
ThemeForest Purchase → ZIP Download → Admin Theme Import →
Template Parser (auto-detect slots) → Tenant Asset Storage →
CMS Configuration → Multi-language Content → Live White-Label Site
```

---

## Phase 1: Theme Asset Management System

### 1.1 Database Schema - Theme Assets

**New Firestore Collection: `tenantThemes`**

```typescript
interface TenantTheme {
  id: string
  tenantId: string
  themeName: string                    // e.g., "EventHub Pro"
  themeSource: 'themeforest' | 'custom'
  themeforestId?: string               // ThemeForest item ID
  purchasedAt?: Timestamp
  licenseType?: 'regular' | 'extended'

  status: 'draft' | 'active' | 'archived'
  version: string                      // Semantic versioning

  // Asset Storage Paths (Firebase Storage)
  assets: {
    basePath: string                   // tenants/{tenantId}/themes/{themeId}/
    css: ThemeCSSAssets
    js: ThemeJSAssets
    images: ThemeImageAssets
    fonts: ThemeFontAssets
    icons: ThemeIconAssets
  }

  // Theme Configuration
  config: ThemeConfig

  // Page Templates from Theme
  templates: ThemeTemplate[]

  createdAt: Timestamp
  updatedAt: Timestamp
  publishedAt?: Timestamp
}

interface ThemeCSSAssets {
  main: string[]           // Main stylesheets
  vendors: string[]        // Third-party CSS (bootstrap, etc.)
  custom: string           // Tenant's custom CSS overrides
}

interface ThemeJSAssets {
  main: string[]           // Core JS files
  vendors: string[]        // Libraries (jQuery, etc.)
  custom: string           // Tenant's custom JS
}

interface ThemeImageAssets {
  logo: {
    primary: string
    secondary?: string
    favicon: string
    loading?: string       // Loading spinner
  }
  backgrounds: string[]
  gallery: string[]
  placeholders: Record<string, string>
}

interface ThemeFontAssets {
  files: {
    name: string
    url: string
    format: 'woff2' | 'woff' | 'ttf' | 'otf'
  }[]
  fontFaces: string        // @font-face CSS
}

interface ThemeIconAssets {
  library: 'fontawesome' | 'feather' | 'material' | 'custom'
  customIcons?: {
    name: string
    svg: string
  }[]
  spriteSheet?: string
}

interface ThemeConfig {
  // Colors (extends basic branding)
  colors: {
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

  // Typography
  typography: {
    headingFont: string
    bodyFont: string
    monoFont?: string
    baseFontSize: string     // e.g., "16px"
    lineHeight: string       // e.g., "1.6"
    scale: number            // Type scale ratio e.g., 1.25
  }

  // Layout
  layout: {
    containerWidth: string   // e.g., "1200px"
    sidebarWidth: string     // e.g., "280px"
    headerHeight: string     // e.g., "80px"
    footerHeight: string     // e.g., "200px"
    spacing: 'compact' | 'normal' | 'relaxed'
  }

  // Component Styles
  components: {
    buttonStyle: 'rounded' | 'square' | 'pill'
    cardStyle: 'flat' | 'raised' | 'bordered'
    inputStyle: 'underline' | 'outlined' | 'filled'
  }
}

interface ThemeTemplate {
  id: string
  name: string                 // e.g., "Home", "Event List", "Event Detail"
  type: 'page' | 'section' | 'component'
  htmlFile: string            // Path to original HTML file
  slots: TemplateSlot[]       // Customizable content areas (auto-detected)
  thumbnail?: string
}

interface TemplateSlot {
  id: string
  name: string               // e.g., "hero-title", "about-content"
  type: 'text' | 'html' | 'image' | 'gallery' | 'dynamic'
  selector: string           // CSS selector for replacement
  defaultContent?: string
  detectedBy: 'auto' | 'manual'  // How slot was identified
}

// Theme version for rollback (keep last 3)
interface ThemeVersion {
  id: string
  themeId: string
  version: string            // e.g., "1.0.0", "1.0.1"
  config: ThemeConfig
  assets: ThemeAssets        // Snapshot of asset paths
  createdAt: Timestamp
  createdBy: string
  changelog?: string
}
```

### 1.4 Template Parser System

**Auto-detection of Content Slots from ThemeForest HTML**

The template parser analyzes HTML files and identifies editable content areas using:

1. **Data Attributes** (highest priority)
   - `data-cms-slot="hero-title"` - Explicit slot marker
   - `data-cms-type="text|html|image|gallery"` - Content type

2. **Semantic HTML Elements**
   - `<h1>`, `<h2>` → Text slots (headings)
   - `<p>`, `<article>` → HTML slots (content blocks)
   - `<img>` with specific classes → Image slots
   - `<section>`, `<div>` with IDs → Section containers

3. **Common CSS Class Patterns**
   - `.hero-title`, `.hero-subtitle` → Hero text slots
   - `.content-area`, `.main-content` → HTML content slots
   - `.gallery`, `.image-grid` → Gallery slots
   - `.cta-button`, `.btn-primary` → CTA slots

4. **ThemeForest Conventions**
   - Common patterns from popular themes (Flavor, Developer Pro, etc.)
   - Bootstrap grid detection
   - Swiper/Slick carousel detection

```typescript
interface TemplateParserResult {
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
  warnings: string[]          // Parsing issues
}

interface ParsedTemplate {
  filename: string
  suggestedName: string       // e.g., "Home Page" from index.html
  slots: DetectedSlot[]
  structure: {
    hasHeader: boolean
    hasFooter: boolean
    hasSidebar: boolean
    sections: string[]        // Section IDs/classes found
  }
}

interface DetectedSlot {
  selector: string
  suggestedName: string
  suggestedType: 'text' | 'html' | 'image' | 'gallery' | 'dynamic'
  confidence: 'high' | 'medium' | 'low'
  defaultContent: string
  attributes: Record<string, string>
}

class TemplateParserService {
  // Parse ZIP and extract templates
  async parseThemeZip(zipFile: File): Promise<TemplateParserResult>

  // Parse single HTML file
  async parseHTMLFile(html: string, filename: string): Promise<ParsedTemplate>

  // User confirms/edits detected slots
  async confirmSlots(
    templateId: string,
    confirmedSlots: TemplateSlot[]
  ): Promise<void>

  // Regenerate template with slot markers
  async generateEditableTemplate(
    template: ParsedTemplate
  ): Promise<string>
}
```

**Parser UI Flow:**
1. Upload ZIP → Parse automatically
2. Show detected templates with slot preview
3. Admin reviews/edits detected slots
4. Confirm and save template configuration
5. Slots become editable in page builder

### 1.2 Asset Upload Service

**New File: `/lib/services/themeAssetService.ts`**

```typescript
class ThemeAssetService {
  // Import theme from Google Drive
  async importFromGoogleDrive(
    tenantId: string,
    googleDriveLink: string,
    themeName: string
  ): Promise<TenantTheme>

  // Upload individual asset
  async uploadAsset(
    tenantId: string,
    themeId: string,
    file: File,
    assetType: 'css' | 'js' | 'image' | 'font' | 'icon'
  ): Promise<string>

  // Bulk upload from ZIP
  async importThemeZip(
    tenantId: string,
    zipFile: File
  ): Promise<TenantTheme>

  // Parse theme structure
  async analyzeThemeStructure(
    files: FileList
  ): Promise<ThemeAnalysis>

  // Generate preview
  async generatePreview(
    tenantId: string,
    themeId: string
  ): Promise<string>

  // Publish theme
  async publishTheme(
    tenantId: string,
    themeId: string
  ): Promise<void>
}
```

### 1.3 Firebase Storage Structure

```
tenants/
  {tenantId}/
    themes/
      {themeId}/
        css/
          main/
            style.css
            responsive.css
          vendors/
            bootstrap.min.css
            animate.css
          custom.css
        js/
          main/
            main.js
            navigation.js
          vendors/
            jquery.min.js
            swiper.min.js
        images/
          logo/
            primary.png
            favicon.ico
          backgrounds/
          gallery/
          placeholders/
        fonts/
          heading-font.woff2
          body-font.woff2
        icons/
          sprite.svg
          custom/
        templates/
          home.html
          events.html
          event-detail.html
          contact.html
```

---

## Phase 2: CMS Page Builder

### 2.1 Database Schema - Pages

**New Firestore Collection: `tenantPages`**

```typescript
interface TenantPage {
  id: string
  tenantId: string
  themeId: string

  // Page Info
  title: string
  slug: string              // URL path e.g., "about-us"
  description?: string

  // Multi-language Support
  defaultLanguage: string   // e.g., "en"
  availableLanguages: string[]  // e.g., ["en", "es", "fr"]
  translations: {
    [langCode: string]: PageTranslation
  }

  // SEO (per language in translations)
  seo: {
    title?: string
    description?: string
    keywords?: string[]
    ogImage?: string
    noIndex?: boolean
  }

  // Page Type
  type: 'static' | 'dynamic' | 'system'
  systemType?: 'home' | 'events' | 'event-detail' | 'cart' | 'checkout'

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
  parentPageId?: string     // For subpages

  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  updatedBy: string
}

// Multi-language page content
interface PageTranslation {
  langCode: string          // e.g., "es"
  langName: string          // e.g., "Español"
  title: string
  slug: string              // Localized slug e.g., "sobre-nosotros"
  seo: {
    title?: string
    description?: string
    keywords?: string[]
  }
  sections: PageSection[]   // Translated section content
  status: 'draft' | 'published'
  translatedBy?: string
  translatedAt?: Timestamp
}

interface PageSection {
  id: string
  type: 'hero' | 'content' | 'gallery' | 'events' | 'testimonials' |
        'cta' | 'contact' | 'map' | 'custom' | 'html'

  // Section Settings
  settings: {
    backgroundColor?: string
    backgroundImage?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    animation?: string
    visibility?: 'visible' | 'hidden'
    cssClass?: string
  }

  // Section Content
  content: SectionContent

  order: number
}

// Union type for different section contents
type SectionContent =
  | HeroContent
  | ContentBlockContent
  | GalleryContent
  | EventsListContent
  | TestimonialsContent
  | CTAContent
  | ContactFormContent
  | MapContent
  | CustomHTMLContent

interface HeroContent {
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

interface ContentBlockContent {
  type: 'content'
  heading?: string
  body: string              // Rich text HTML
  image?: string
  imagePosition?: 'left' | 'right' | 'top' | 'bottom'
  columns?: 1 | 2 | 3 | 4
}

interface EventsListContent {
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

interface GalleryContent {
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

interface CTAContent {
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

interface ContactFormContent {
  type: 'contact'
  heading?: string
  fields: FormField[]
  submitButton: string
  successMessage: string
  recipientEmail: string
}

interface CustomHTMLContent {
  type: 'html'
  html: string
  css?: string
  js?: string
  sandboxed: boolean        // Run JS in sandboxed iframe
}

// Custom JavaScript with security controls
interface CustomCodeConfig {
  enabled: boolean
  html: string
  css: string
  js: string

  // Security settings
  sandbox: {
    enabled: boolean                    // Iframe isolation
    allowScripts: boolean               // allow-scripts
    allowForms: boolean                 // allow-forms
    allowPopups: boolean                // allow-popups
    allowSameOrigin: boolean            // allow-same-origin (careful!)
  }

  // Allowed external resources
  allowedDomains: string[]              // CDN domains allowed

  // Execution context
  executeOn: 'load' | 'domready' | 'manual'
}
```

### 2.2 Page Builder UI Components

**New Directory: `/components/cms/`**

```
components/
  cms/
    PageBuilder/
      index.tsx              # Main page builder container
      SectionList.tsx        # Draggable section list
      SectionEditor.tsx      # Individual section editor
      SectionToolbar.tsx     # Add/remove/reorder sections

    SectionTypes/
      HeroSection.tsx
      ContentSection.tsx
      GallerySection.tsx
      EventsSection.tsx
      TestimonialsSection.tsx
      CTASection.tsx
      ContactSection.tsx
      MapSection.tsx
      CustomHTMLSection.tsx

    Editors/
      RichTextEditor.tsx     # WYSIWYG editor
      ImagePicker.tsx        # Asset selector
      ColorPicker.tsx
      LinkEditor.tsx
      IconPicker.tsx

    Preview/
      PagePreview.tsx        # Live preview iframe
      DeviceToggle.tsx       # Desktop/tablet/mobile
      PreviewControls.tsx

    Navigation/
      NavigationEditor.tsx   # Menu builder
      MenuItemEditor.tsx
```

### 2.3 Navigation System

**New Firestore Collection: `tenantNavigations`**

```typescript
interface TenantNavigation {
  id: string
  tenantId: string

  // Navigation Areas
  menus: {
    main: NavMenuItem[]       // Main header navigation
    footer: NavMenuItem[]     // Footer links
    mobile?: NavMenuItem[]    // Mobile-specific menu
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

interface NavMenuItem {
  id: string
  label: string
  type: 'page' | 'external' | 'section' | 'dropdown'
  pageId?: string           // Link to TenantPage
  url?: string              // External URL
  sectionId?: string        // Anchor link
  children?: NavMenuItem[]  // Dropdown items
  order: number
  visible: boolean
  openInNewTab?: boolean
}
```

### 2.4 Multi-Language System

**Tenant Language Configuration**

```typescript
interface TenantLanguageConfig {
  tenantId: string
  defaultLanguage: string           // e.g., "en"
  enabledLanguages: LanguageConfig[]
  autoDetect: boolean               // Detect from browser
  urlStrategy: 'subdirectory' | 'query' | 'subdomain'
  // subdirectory: /es/about-us
  // query: /about-us?lang=es
  // subdomain: es.tenant.com/about-us
}

interface LanguageConfig {
  code: string              // ISO 639-1 code e.g., "es"
  name: string              // Display name e.g., "Español"
  nativeName: string        // Native name e.g., "Español"
  direction: 'ltr' | 'rtl'  // Text direction
  enabled: boolean
  isDefault: boolean
}

// Supported languages (initial set)
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
]
```

**Translation Workflow UI:**
1. Page builder shows language switcher tabs
2. Edit content per language
3. Copy from default language option
4. Translation progress indicator (% complete)
5. Publish per language independently

**Portal Language Switching:**
- Language selector in header/footer
- Persist preference in localStorage
- URL reflects current language
- SEO: `hreflang` tags for all versions

---

### 2.5 Theme Version Control (3 Versions)

**Version Management:**

```typescript
interface ThemeVersionManager {
  // Create new version on publish
  async createVersion(
    themeId: string,
    changelog?: string
  ): Promise<ThemeVersion>

  // List versions (max 3)
  async getVersions(themeId: string): Promise<ThemeVersion[]>

  // Rollback to previous version
  async rollback(
    themeId: string,
    versionId: string
  ): Promise<void>

  // Compare versions
  async compareVersions(
    versionId1: string,
    versionId2: string
  ): Promise<VersionDiff>

  // Auto-cleanup old versions (keep last 3)
  async cleanupOldVersions(themeId: string): Promise<void>
}

interface VersionDiff {
  configChanges: {
    field: string
    oldValue: any
    newValue: any
  }[]
  assetChanges: {
    added: string[]
    removed: string[]
    modified: string[]
  }
}
```

**Version UI:**
- Version history sidebar in theme editor
- Rollback button with confirmation
- Diff viewer for comparing changes
- Auto-version on publish

---

## Phase 3: Admin UI Implementation

### 3.1 Admin Routes

**New Routes:**

```
/admin/white-label/themes/
  └── page.tsx              # Theme list & import
/admin/white-label/themes/[themeId]/
  └── page.tsx              # Theme configuration
/admin/white-label/pages/
  └── page.tsx              # Page list
/admin/white-label/pages/[pageId]/
  └── page.tsx              # Page builder
/admin/white-label/pages/new/
  └── page.tsx              # Create new page
/admin/white-label/navigation/
  └── page.tsx              # Menu builder
/admin/white-label/assets/
  └── page.tsx              # Media library
/admin/white-label/preview/
  └── page.tsx              # Full site preview
```

### 3.2 Theme Management Page

**Features:**
1. List all tenant themes with status (draft/active)
2. Import new theme from:
   - ZIP file upload
   - Google Drive link (parse and download)
3. Theme configuration:
   - Color customization
   - Font selection
   - Layout settings
   - Component styles
4. Preview before publishing
5. Version history and rollback

### 3.3 Page Builder Page

**Features:**
1. Visual drag-and-drop section editor
2. Real-time preview panel
3. Responsive preview toggle (desktop/tablet/mobile)
4. Section library sidebar
5. Content editing with rich text
6. Image upload/selection from assets
7. Save draft / Publish workflow
8. SEO settings panel
9. Page settings (slug, visibility)

### 3.4 Media Library Page

**Features:**
1. Grid view of all uploaded assets
2. Upload new files (drag & drop)
3. Folder organization
4. Search and filter
5. Image editing (crop, resize)
6. Copy URL to clipboard
7. Delete with usage check

---

## Phase 4: Public Portal Rendering

### 4.1 Portal Route Updates

**Updated: `/app/p/[slug]/`**

```
app/p/[slug]/
  layout.tsx              # Load tenant theme, apply CSS
  page.tsx                # Render home page
  [pageSlug]/
    page.tsx              # Render custom pages
  events/
    page.tsx              # Events list (dynamic)
    [eventId]/
      page.tsx            # Event detail
  cart/
    page.tsx              # Shopping cart
  checkout/
    page.tsx              # Checkout flow
```

### 4.2 Theme Provider

**New File: `/lib/context/ThemeContext.tsx`**

```typescript
interface ThemeContextValue {
  theme: TenantTheme | null
  config: ThemeConfig | null
  pages: TenantPage[]
  navigation: TenantNavigation | null
  isLoading: boolean

  // Helpers
  getAssetUrl: (path: string) => string
  getCSSVariables: () => Record<string, string>
}

export const ThemeProvider: React.FC<{ slug: string }> = ({ slug, children }) => {
  // Load theme data on mount
  // Inject CSS variables into document
  // Provide context to all portal pages
}
```

### 4.3 Dynamic Page Renderer

**New Component: `/components/portal/PageRenderer.tsx`**

```typescript
interface PageRendererProps {
  page: TenantPage
  theme: TenantTheme
}

export function PageRenderer({ page, theme }: PageRendererProps) {
  return (
    <div className="page-content">
      {page.sections.map(section => (
        <SectionRenderer
          key={section.id}
          section={section}
          theme={theme}
        />
      ))}
    </div>
  )
}
```

---

## Phase 5: API Endpoints

### 5.1 Theme Management API

**New: `/app/api/cms/themes/route.ts`**

```typescript
// GET - List themes for tenant
// POST - Create/import theme
// PUT - Update theme configuration
// DELETE - Archive theme

// GET /api/cms/themes/:id/preview
// POST /api/cms/themes/:id/publish
// POST /api/cms/themes/:id/rollback
```

### 5.2 Page Management API

**New: `/app/api/cms/pages/route.ts`**

```typescript
// GET - List pages for tenant
// POST - Create new page
// GET /:id - Get page details
// PUT /:id - Update page
// DELETE /:id - Delete page (soft delete)
// POST /:id/publish - Publish page
// POST /:id/duplicate - Clone page
```

### 5.3 Asset Management API

**New: `/app/api/cms/assets/route.ts`**

```typescript
// GET - List assets for tenant/theme
// POST - Upload asset
// DELETE /:id - Delete asset
// PUT /:id - Update asset metadata
// POST /bulk-upload - Upload multiple
```

### 5.4 Public Portal API

**New: `/app/api/portal/[slug]/route.ts`**

```typescript
// GET /api/portal/:slug/theme - Get active theme
// GET /api/portal/:slug/pages - Get published pages
// GET /api/portal/:slug/navigation - Get navigation
// GET /api/portal/:slug/page/:pageSlug - Get specific page
```

---

## Phase 6: Implementation Order

### Sprint 1: Foundation (Week 1-2)
1. Create database schemas (Firestore collections)
2. Create ThemeAssetService with upload functionality
3. Build basic asset storage structure
4. Create theme import from ZIP file

### Sprint 2: Theme Configuration (Week 3-4)
1. Build theme management admin page
2. Implement color/typography/layout configuration UI
3. Create theme preview functionality
4. Add publish/draft workflow

### Sprint 3: Page Builder Core (Week 5-6)
1. Create page database schema
2. Build section type components (Hero, Content, Gallery, etc.)
3. Implement drag-and-drop section editor
4. Add rich text editor integration

### Sprint 4: Page Builder Advanced (Week 7-8)
1. Add live preview panel
2. Implement responsive preview toggle
3. Add SEO settings panel
4. Create page publish workflow

### Sprint 5: Navigation & Assets (Week 9-10)
1. Build navigation editor
2. Create media library
3. Implement image picker in editors
4. Add social links management

### Sprint 6: Portal Rendering (Week 11-12)
1. Create ThemeProvider context
2. Build dynamic page renderer
3. Implement section renderers
4. Apply theme CSS dynamically

### Sprint 7: Polish & Testing (Week 13-14)
1. End-to-end testing
2. Performance optimization
3. Mobile responsiveness
4. Documentation

---

## Technical Considerations

### Performance
- Lazy load theme assets
- CDN for static assets (Firebase Storage)
- Cache theme config in browser
- Incremental static regeneration for pages
- Compress CSS/JS on upload
- Image optimization (WebP conversion)

### Security

**File Upload Security:**
- Validate file types (whitelist: css, js, html, jpg, png, gif, webp, svg, woff2, woff, ttf, otf)
- Max file size limits (CSS: 5MB, JS: 2MB, Images: 10MB, Fonts: 5MB)
- Virus scanning on upload (optional: ClamAV integration)
- Sanitize filenames (remove special characters)

**Custom JavaScript Security:**
- **Sandbox Isolation**: Execute custom JS in sandboxed iframe
- **CSP Headers**: Strict Content Security Policy for portal pages
- **Domain Whitelist**: Only allow scripts from approved CDNs
- **Code Review Option**: Master admin approval for custom JS (optional)
- **Monitoring**: Log JS errors and suspicious activity

```typescript
// Sandboxed iframe for custom JS execution
const SANDBOX_PERMISSIONS = [
  'allow-scripts',        // Required for JS execution
  'allow-forms',          // If forms are needed
  // 'allow-same-origin', // DANGEROUS - avoid if possible
]

// CSP for portal pages with custom JS
const CSP_HEADER = `
  default-src 'self';
  script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https: blob:;
  frame-src 'self' https://www.youtube.com https://player.vimeo.com;
`
```

**HTML Sanitization:**
- Use DOMPurify for user-provided HTML
- Strip `<script>` tags from rich text content
- Whitelist allowed HTML tags and attributes

### Scalability
- Asset versioning for cache busting
- Separate storage buckets per tenant (optional)
- Background jobs for theme imports (Cloud Functions)
- Database indexing for multi-tenant queries
- Version cleanup cron job (keep last 3)

### Dependencies
- Rich text: TipTap or Slate.js
- Drag-and-drop: dnd-kit or react-beautiful-dnd
- Image editing: react-image-crop
- Code editor: Monaco Editor (for custom HTML/CSS/JS)
- HTML parsing: cheerio (Node.js) or DOMParser (browser)
- ZIP handling: JSZip
- HTML sanitization: DOMPurify

---

## File Structure Summary

```
lib/
  services/
    themeAssetService.ts        # Theme upload/management
    templateParserService.ts    # HTML template parsing & slot detection
    cmsPageService.ts           # Page CRUD with translations
    cmsNavigationService.ts     # Navigation management
    themeVersionService.ts      # Version control (3 versions)
    customCodeService.ts        # Custom JS/CSS with sandboxing
  types/
    cms.ts                      # All CMS types
    translations.ts             # Multi-language types
  context/
    ThemeContext.tsx            # Theme provider
    LanguageContext.tsx         # Language provider
  utils/
    htmlSanitizer.ts            # DOMPurify wrapper
    zipHandler.ts               # JSZip utilities

components/
  cms/
    PageBuilder/                # Page builder components
      index.tsx
      SectionList.tsx
      SectionEditor.tsx
      LanguageTabs.tsx          # Multi-language content editing
    SectionTypes/               # Section type editors
    Editors/
      RichTextEditor.tsx
      CodeEditor.tsx            # Monaco for custom HTML/CSS/JS
      ImagePicker.tsx
    Preview/
      PagePreview.tsx
      SandboxedPreview.tsx      # Isolated preview for custom JS
    ThemeImport/
      ZipUploader.tsx
      SlotDetector.tsx          # Template parser UI
      SlotEditor.tsx
    VersionControl/
      VersionHistory.tsx
      VersionDiff.tsx
      RollbackModal.tsx
    Navigation/
      NavigationEditor.tsx

app/
  admin/white-label/
    themes/
      page.tsx                  # Theme list & import
      [themeId]/
        page.tsx                # Theme configuration
        versions/
          page.tsx              # Version history
    pages/
      page.tsx                  # Page list
      [pageId]/
        page.tsx                # Page builder with language tabs
    navigation/
      page.tsx                  # Menu builder
    assets/
      page.tsx                  # Media library
    languages/
      page.tsx                  # Language configuration
  api/cms/
    themes/
      route.ts                  # Theme CRUD
      [themeId]/
        publish/route.ts
        rollback/route.ts
        parse/route.ts          # Template parsing
    pages/
      route.ts                  # Page CRUD with translations
    assets/
      route.ts
    navigation/
      route.ts
  p/[slug]/
    layout.tsx                  # Theme-aware layout with language
    page.tsx                    # Home page
    [lang]/                     # Language-specific routes
      [pageSlug]/
        page.tsx                # Translated page
```

---

## Summary

This comprehensive plan provides a WordPress-like CMS system for advanced white-label tenants with:

- **Theme Import**: ZIP upload with auto-parsing of ThemeForest templates
- **Template Parser**: Auto-detect editable content slots from HTML
- **Page Builder**: Drag-and-drop sections with live preview
- **Multi-Language**: Full translation support for pages (10 languages)
- **Custom Code**: Secure JavaScript/CSS with sandbox isolation
- **Version Control**: Keep last 3 theme versions with rollback
- **Security**: CSP headers, HTML sanitization, file validation

Ready for implementation upon approval.
