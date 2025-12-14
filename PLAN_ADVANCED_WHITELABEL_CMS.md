# Advanced White-Label CMS Plan

## Overview

Build a WordPress-like content management system for tenants with `brandingType: 'advanced'` plan. This system enables tenants to have fully functioning white-label websites using licensed ThemeForest themes.

---

## System Architecture

### High-Level Flow

```
ThemeForest Purchase → Google Drive Upload → Admin Theme Import →
Tenant Asset Storage → CMS Configuration → Live White-Label Site
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
  slots: TemplateSlot[]       // Customizable content areas
  thumbnail?: string
}

interface TemplateSlot {
  id: string
  name: string               // e.g., "hero-title", "about-content"
  type: 'text' | 'html' | 'image' | 'gallery' | 'dynamic'
  selector: string           // CSS selector for replacement
  defaultContent?: string
}
```

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

  // SEO
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

  // Content Blocks
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

### Security
- Validate file uploads (type, size)
- Sanitize HTML content
- CORS configuration for assets
- Rate limiting on uploads

### Scalability
- Asset versioning for cache busting
- Separate storage buckets per tenant (optional)
- Background jobs for theme imports

### Dependencies
- Rich text: TipTap or Slate.js
- Drag-and-drop: dnd-kit or react-beautiful-dnd
- Image editing: react-image-crop
- Code editor: Monaco Editor (for custom HTML/CSS)

---

## Questions for Clarification

1. **Google Drive Integration**: Should we build a direct Google Drive API integration for theme import, or manual ZIP download + upload?

2. **Theme Marketplace**: Will there be a shared theme marketplace, or is each theme unique per tenant?

3. **Template Parser**: Should we build HTML template parsing to auto-detect content slots from ThemeForest HTML files?

4. **Multi-language**: Should pages support multiple language versions?

5. **Version Control**: How many theme versions should we keep for rollback?

6. **Custom Code**: Should tenant admins be able to add custom JavaScript? (Security implications)

7. **Email Templates**: Should the CMS also handle email template customization?

8. **Event Widget Integration**: How should event listings integrate with the page builder? (Embedded component vs separate page)

---

## File Structure Summary

```
lib/
  services/
    themeAssetService.ts      # Theme upload/management
    cmsPageService.ts         # Page CRUD
    cmsNavigationService.ts   # Navigation management
  types/
    cms.ts                    # All CMS types
  context/
    ThemeContext.tsx          # Theme provider

components/
  cms/
    PageBuilder/              # Page builder components
    SectionTypes/             # Section type editors
    Editors/                  # Shared editor components
    Preview/                  # Preview components
    Navigation/               # Menu builder

app/
  admin/white-label/
    themes/                   # Theme management pages
    pages/                    # Page builder pages
    navigation/               # Navigation editor
    assets/                   # Media library
  api/cms/
    themes/                   # Theme API
    pages/                    # Pages API
    assets/                   # Assets API
    navigation/               # Navigation API
  p/[slug]/
    layout.tsx               # Theme-aware layout
    [pageSlug]/              # Dynamic page routes
```

---

This plan provides a comprehensive, WordPress-like CMS system for advanced white-label tenants. The phased approach allows for iterative development and early feedback.
