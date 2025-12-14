/**
 * Template Parser Service
 *
 * Parses ThemeForest HTML templates and auto-detects editable content slots.
 * Analyzes HTML structure to identify customizable areas using:
 * - Data attributes (data-cms-slot)
 * - Semantic HTML elements (h1, h2, p, article)
 * - Common CSS class patterns (hero-title, content-area)
 * - ThemeForest conventions
 */

import JSZip from 'jszip'
import {
  TemplateParserResult,
  ParsedTemplate,
  DetectedSlot,
  ThemeTemplate,
  TemplateSlot,
} from '@/lib/types/cms'

// ============================================================================
// SLOT DETECTION PATTERNS
// ============================================================================

interface SlotPattern {
  selector: string
  type: 'text' | 'html' | 'image' | 'gallery' | 'dynamic'
  namePrefix: string
  confidence: 'high' | 'medium' | 'low'
}

// High confidence patterns - explicit CMS markers
const EXPLICIT_PATTERNS: SlotPattern[] = [
  { selector: '[data-cms-slot]', type: 'html', namePrefix: 'slot', confidence: 'high' },
  { selector: '[data-editable]', type: 'html', namePrefix: 'editable', confidence: 'high' },
  { selector: '[data-content]', type: 'html', namePrefix: 'content', confidence: 'high' },
]

// Semantic HTML patterns
const SEMANTIC_PATTERNS: SlotPattern[] = [
  // Headings
  { selector: 'h1', type: 'text', namePrefix: 'heading', confidence: 'high' },
  { selector: 'h2', type: 'text', namePrefix: 'subheading', confidence: 'medium' },
  { selector: 'h3', type: 'text', namePrefix: 'section-title', confidence: 'medium' },

  // Content areas
  { selector: 'article', type: 'html', namePrefix: 'article', confidence: 'medium' },
  { selector: 'main', type: 'html', namePrefix: 'main-content', confidence: 'low' },

  // Images
  { selector: 'img.hero-image', type: 'image', namePrefix: 'hero-image', confidence: 'high' },
  { selector: 'img.logo', type: 'image', namePrefix: 'logo', confidence: 'high' },
  { selector: '.logo img', type: 'image', namePrefix: 'logo', confidence: 'high' },
]

// CSS class patterns commonly used in ThemeForest themes
const CLASS_PATTERNS: SlotPattern[] = [
  // Hero section
  { selector: '.hero-title, .hero__title', type: 'text', namePrefix: 'hero-title', confidence: 'high' },
  { selector: '.hero-subtitle, .hero__subtitle', type: 'text', namePrefix: 'hero-subtitle', confidence: 'high' },
  { selector: '.hero-text, .hero__text', type: 'html', namePrefix: 'hero-text', confidence: 'high' },
  { selector: '.hero-image, .hero__image, .hero-bg', type: 'image', namePrefix: 'hero-background', confidence: 'high' },

  // About section
  { selector: '.about-title', type: 'text', namePrefix: 'about-title', confidence: 'high' },
  { selector: '.about-text, .about-content', type: 'html', namePrefix: 'about-content', confidence: 'high' },
  { selector: '.about-image', type: 'image', namePrefix: 'about-image', confidence: 'high' },

  // Content areas
  { selector: '.content-area, .main-content', type: 'html', namePrefix: 'content', confidence: 'medium' },
  { selector: '.section-title', type: 'text', namePrefix: 'section-title', confidence: 'high' },
  { selector: '.section-subtitle', type: 'text', namePrefix: 'section-subtitle', confidence: 'medium' },
  { selector: '.section-text, .section-content', type: 'html', namePrefix: 'section-content', confidence: 'medium' },

  // Gallery
  { selector: '.gallery, .image-grid', type: 'gallery', namePrefix: 'gallery', confidence: 'high' },
  { selector: '.portfolio-grid', type: 'gallery', namePrefix: 'portfolio', confidence: 'high' },

  // CTA
  { selector: '.cta-title', type: 'text', namePrefix: 'cta-title', confidence: 'high' },
  { selector: '.cta-text', type: 'html', namePrefix: 'cta-text', confidence: 'high' },
  { selector: '.cta-button, .btn-cta', type: 'text', namePrefix: 'cta-button', confidence: 'medium' },

  // Footer
  { selector: '.footer-about', type: 'html', namePrefix: 'footer-about', confidence: 'medium' },
  { selector: '.footer-contact', type: 'html', namePrefix: 'footer-contact', confidence: 'medium' },
  { selector: '.copyright', type: 'text', namePrefix: 'copyright', confidence: 'low' },

  // Testimonials
  { selector: '.testimonial-text, .testimonial-quote', type: 'html', namePrefix: 'testimonial', confidence: 'medium' },
  { selector: '.testimonial-author', type: 'text', namePrefix: 'testimonial-author', confidence: 'medium' },

  // Contact
  { selector: '.contact-title', type: 'text', namePrefix: 'contact-title', confidence: 'high' },
  { selector: '.contact-info', type: 'html', namePrefix: 'contact-info', confidence: 'medium' },
]

// Section container patterns
const SECTION_PATTERNS = [
  'section',
  '.section',
  '[class*="section-"]',
  '#hero',
  '#about',
  '#services',
  '#portfolio',
  '#team',
  '#testimonials',
  '#contact',
  '#footer',
]

// ============================================================================
// DEPENDENCY DETECTION
// ============================================================================

interface DependencyPattern {
  name: string
  patterns: RegExp[]
}

const DEPENDENCY_PATTERNS: DependencyPattern[] = [
  {
    name: 'jquery',
    patterns: [/jquery/i, /\$\(/],
  },
  {
    name: 'bootstrap',
    patterns: [/bootstrap/i, /class="[^"]*\b(container|row|col-)/i],
  },
  {
    name: 'swiper',
    patterns: [/swiper/i],
  },
  {
    name: 'slick',
    patterns: [/slick/i],
  },
  {
    name: 'owlCarousel',
    patterns: [/owl[.-]carousel/i],
  },
  {
    name: 'fontawesome',
    patterns: [/font-?awesome/i, /class="[^"]*\bfa\b/i],
  },
  {
    name: 'animate',
    patterns: [/animate\.css/i, /class="[^"]*\banimate__/i],
  },
  {
    name: 'aos',
    patterns: [/aos\.js/i, /data-aos=/i],
  },
]

// ============================================================================
// PARSER CLASS
// ============================================================================

export class TemplateParserService {
  /**
   * Parse a ZIP file containing theme files
   */
  async parseThemeZip(zipFile: File): Promise<TemplateParserResult> {
    const zip = await JSZip.loadAsync(zipFile)
    const result: TemplateParserResult = {
      templates: [],
      assets: {
        css: [],
        js: [],
        images: [],
        fonts: [],
      },
      dependencies: {
        jquery: false,
        bootstrap: false,
        swiper: false,
      },
      warnings: [],
    }

    // Collect all files by type
    const htmlFiles: { path: string; content: string }[] = []
    const allContent: string[] = []

    const filePromises: Promise<void>[] = []

    zip.forEach((relativePath, zipEntry) => {
      if (zipEntry.dir) return

      const ext = relativePath.toLowerCase().split('.').pop()

      const promise = (async () => {
        if (ext === 'html' || ext === 'htm') {
          const content = await zipEntry.async('string')
          htmlFiles.push({ path: relativePath, content })
          allContent.push(content)
        } else if (ext === 'css') {
          result.assets.css.push(relativePath)
          const content = await zipEntry.async('string')
          allContent.push(content)
        } else if (ext === 'js') {
          result.assets.js.push(relativePath)
          const content = await zipEntry.async('string')
          allContent.push(content)
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
          result.assets.images.push(relativePath)
        } else if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(ext || '')) {
          result.assets.fonts.push(relativePath)
        }
      })()

      filePromises.push(promise)
    })

    await Promise.all(filePromises)

    // Detect dependencies from all content
    const combinedContent = allContent.join('\n')
    result.dependencies = this.detectDependencies(combinedContent)

    // Parse each HTML file
    for (const { path, content } of htmlFiles) {
      try {
        const template = await this.parseHTMLFile(content, path)
        result.templates.push(template)
      } catch (error) {
        result.warnings.push(`Failed to parse ${path}: ${error}`)
      }
    }

    return result
  }

  /**
   * Parse a single HTML file and detect slots
   */
  async parseHTMLFile(html: string, filename: string): Promise<ParsedTemplate> {
    // Use DOMParser in browser, or a simple regex-based approach for server
    const slots = this.detectSlots(html)
    const structure = this.analyzeStructure(html)

    // Generate suggested name from filename
    const suggestedName = this.generateTemplateName(filename)

    return {
      filename,
      suggestedName,
      slots,
      structure,
    }
  }

  /**
   * Detect editable slots in HTML content
   */
  private detectSlots(html: string): DetectedSlot[] {
    const slots: DetectedSlot[] = []
    const seenSelectors = new Set<string>()

    // Check explicit patterns first
    for (const pattern of EXPLICIT_PATTERNS) {
      const matches = this.findMatches(html, pattern)
      for (const match of matches) {
        if (!seenSelectors.has(match.selector)) {
          slots.push(match)
          seenSelectors.add(match.selector)
        }
      }
    }

    // Check class patterns
    for (const pattern of CLASS_PATTERNS) {
      const matches = this.findMatches(html, pattern)
      for (const match of matches) {
        if (!seenSelectors.has(match.selector)) {
          slots.push(match)
          seenSelectors.add(match.selector)
        }
      }
    }

    // Check semantic patterns
    for (const pattern of SEMANTIC_PATTERNS) {
      const matches = this.findMatches(html, pattern)
      for (const match of matches) {
        // Limit semantic matches to avoid too many slots
        if (!seenSelectors.has(match.selector) && slots.length < 50) {
          slots.push(match)
          seenSelectors.add(match.selector)
        }
      }
    }

    return slots
  }

  /**
   * Find matches for a pattern in HTML
   */
  private findMatches(html: string, pattern: SlotPattern): DetectedSlot[] {
    const matches: DetectedSlot[] = []

    // Parse selector to create regex patterns
    const selectorParts = pattern.selector.split(',').map(s => s.trim())

    for (const selector of selectorParts) {
      const elements = this.findElementsBySelector(html, selector)

      for (let i = 0; i < elements.length; i++) {
        const element = elements[i]
        const uniqueSelector = this.generateUniqueSelector(selector, element, i)

        matches.push({
          selector: uniqueSelector,
          suggestedName: `${pattern.namePrefix}${elements.length > 1 ? `-${i + 1}` : ''}`,
          suggestedType: pattern.type,
          confidence: pattern.confidence,
          defaultContent: this.extractContent(element, pattern.type),
          attributes: this.extractAttributes(element),
        })
      }
    }

    return matches
  }

  /**
   * Find elements matching a CSS selector using regex
   */
  private findElementsBySelector(html: string, selector: string): string[] {
    const elements: string[] = []

    // Handle different selector types
    if (selector.startsWith('.')) {
      // Class selector
      const className = selector.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`<[^>]+class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/`, 'gi')
      let match
      while ((match = regex.exec(html)) !== null) {
        elements.push(match[0])
      }
    } else if (selector.startsWith('#')) {
      // ID selector
      const id = selector.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`<[^>]+id="${id}"[^>]*>([\\s\\S]*?)<\\/`, 'gi')
      let match
      while ((match = regex.exec(html)) !== null) {
        elements.push(match[0])
      }
    } else if (selector.startsWith('[')) {
      // Attribute selector
      const attrMatch = selector.match(/\[([^\]=]+)(?:="?([^"\]]*)"?)?\]/)
      if (attrMatch) {
        const attr = attrMatch[1]
        const value = attrMatch[2]
        const regex = value
          ? new RegExp(`<[^>]+${attr}="${value}"[^>]*>`, 'gi')
          : new RegExp(`<[^>]+${attr}[^>]*>`, 'gi')
        let match
        while ((match = regex.exec(html)) !== null) {
          elements.push(match[0])
        }
      }
    } else {
      // Tag selector
      const tag = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
      let match
      while ((match = regex.exec(html)) !== null) {
        elements.push(match[0])
      }
    }

    return elements
  }

  /**
   * Generate a unique CSS selector for an element
   */
  private generateUniqueSelector(baseSelector: string, element: string, index: number): string {
    // Try to extract ID
    const idMatch = element.match(/id="([^"]+)"/)
    if (idMatch) {
      return `#${idMatch[1]}`
    }

    // Try to extract specific class combination
    const classMatch = element.match(/class="([^"]+)"/)
    if (classMatch) {
      const classes = classMatch[1].split(/\s+/).filter(c => c.length > 0)
      if (classes.length > 0) {
        // Use first two classes for specificity
        const classSelector = classes.slice(0, 2).map(c => `.${c}`).join('')
        if (index > 0) {
          return `${classSelector}:nth-of-type(${index + 1})`
        }
        return classSelector
      }
    }

    // Fall back to base selector with index
    if (index > 0) {
      return `${baseSelector}:nth-of-type(${index + 1})`
    }
    return baseSelector
  }

  /**
   * Extract content from an element based on type
   */
  private extractContent(element: string, type: string): string {
    if (type === 'image') {
      const srcMatch = element.match(/src="([^"]+)"/)
      return srcMatch ? srcMatch[1] : ''
    }

    // Extract inner content
    const contentMatch = element.match(/>([^<]*)</s)
    if (contentMatch) {
      return contentMatch[1].trim().slice(0, 200) // Limit length
    }

    return ''
  }

  /**
   * Extract relevant attributes from an element
   */
  private extractAttributes(element: string): Record<string, string> {
    const attrs: Record<string, string> = {}

    const attrRegex = /(\w+)="([^"]+)"/g
    let match
    while ((match = attrRegex.exec(element)) !== null) {
      const [, name, value] = match
      if (['id', 'class', 'data-cms-slot', 'data-cms-type', 'src', 'href'].includes(name)) {
        attrs[name] = value
      }
    }

    return attrs
  }

  /**
   * Analyze the overall structure of an HTML file
   */
  private analyzeStructure(html: string): ParsedTemplate['structure'] {
    const structure = {
      hasHeader: false,
      hasFooter: false,
      hasSidebar: false,
      sections: [] as string[],
    }

    // Check for header
    structure.hasHeader = /<header/i.test(html) || /class="[^"]*header/i.test(html)

    // Check for footer
    structure.hasFooter = /<footer/i.test(html) || /class="[^"]*footer/i.test(html)

    // Check for sidebar
    structure.hasSidebar = /class="[^"]*sidebar/i.test(html) || /<aside/i.test(html)

    // Find section IDs and classes
    const sectionRegex = /<section[^>]*(?:id="([^"]+)"|class="([^"]+)")/gi
    let match
    while ((match = sectionRegex.exec(html)) !== null) {
      if (match[1]) {
        structure.sections.push(`#${match[1]}`)
      } else if (match[2]) {
        const mainClass = match[2].split(/\s+/)[0]
        if (mainClass && !structure.sections.includes(`.${mainClass}`)) {
          structure.sections.push(`.${mainClass}`)
        }
      }
    }

    return structure
  }

  /**
   * Detect dependencies from content
   */
  private detectDependencies(content: string): Record<string, boolean> {
    const dependencies: Record<string, boolean> = {}

    for (const dep of DEPENDENCY_PATTERNS) {
      dependencies[dep.name] = dep.patterns.some(pattern => pattern.test(content))
    }

    return dependencies
  }

  /**
   * Generate a human-readable template name from filename
   */
  private generateTemplateName(filename: string): string {
    // Remove path and extension
    const basename = filename.split('/').pop()?.replace(/\.html?$/i, '') || 'Page'

    // Convert to title case
    return basename
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .replace(/\b(Index|Home)\b/i, 'Home Page')
      .replace(/\b(About)\b/i, 'About Us')
      .replace(/\b(Contact)\b/i, 'Contact Us')
  }

  /**
   * Convert detected slots to confirmed template slots
   */
  confirmSlots(detectedSlots: DetectedSlot[]): TemplateSlot[] {
    return detectedSlots.map((slot, index) => ({
      id: `slot-${index + 1}`,
      name: slot.suggestedName,
      type: slot.suggestedType,
      selector: slot.selector,
      defaultContent: slot.defaultContent,
      detectedBy: 'auto' as const,
    }))
  }

  /**
   * Create a ThemeTemplate from a ParsedTemplate
   */
  createThemeTemplate(parsed: ParsedTemplate, htmlFileUrl: string): ThemeTemplate {
    return {
      id: `template-${Date.now()}`,
      name: parsed.suggestedName,
      type: 'page',
      htmlFile: htmlFileUrl,
      slots: this.confirmSlots(parsed.slots),
      thumbnail: undefined,
    }
  }
}

// Export singleton instance
export const templateParser = new TemplateParserService()

// Export convenience functions
export async function parseThemeZip(zipFile: File): Promise<TemplateParserResult> {
  return templateParser.parseThemeZip(zipFile)
}

export async function parseHTMLFile(html: string, filename: string): Promise<ParsedTemplate> {
  return templateParser.parseHTMLFile(html, filename)
}

export function confirmSlots(detectedSlots: DetectedSlot[]): TemplateSlot[] {
  return templateParser.confirmSlots(detectedSlots)
}
