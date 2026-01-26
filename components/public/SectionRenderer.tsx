/**
 * Section Renderer Component
 *
 * Renders CMS sections dynamically based on their type.
 * Used by CMS-editable public pages (about, contact, terms, privacy, faq).
 *
 * Each section type has its own rendering logic:
 * - hero: Full-width hero banner with headline and optional CTA
 * - content: Rich text content block with optional heading
 * - contact: Contact form with configurable fields
 * - map: Google Maps embed (placeholder for now)
 * - cta: Call-to-action section
 * - gallery: Image gallery grid
 * - testimonials: Customer testimonials
 *
 * See: lib/types/cms.ts for section type definitions
 */

'use client'

import {
  PageSection,
  HeroContent,
  ContentBlockContent,
  ContactFormContent,
  MapContent,
  CTAContent,
  GalleryContent,
  TestimonialsContent,
} from '@/lib/types/cms'
import { Card, CardContent } from './Card'
import { Button } from './Button'
import { Input, Textarea } from './Input'
import Link from 'next/link'

interface SectionRendererProps {
  sections: PageSection[]
  promoterSlug: string
}

/**
 * Render all sections for a CMS page
 */
export function SectionRenderer({ sections, promoterSlug }: SectionRendererProps) {
  if (!sections || sections.length === 0) {
    return (
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-500">This page has no content yet.</p>
          <p className="text-sm text-gray-400 mt-2">
            Add sections in the admin page builder.
          </p>
        </div>
      </section>
    )
  }

  // Sort sections by order
  const sortedSections = [...sections].sort((a, b) => a.order - b.order)

  return (
    <>
      {sortedSections.map((section) => (
        <RenderSection
          key={section.id}
          section={section}
          promoterSlug={promoterSlug}
        />
      ))}
    </>
  )
}

interface RenderSectionProps {
  section: PageSection
  promoterSlug: string
}

/**
 * Render a single section based on its type
 */
function RenderSection({ section, promoterSlug }: RenderSectionProps) {
  const { type, content, settings } = section

  // Build section styles from settings
  const sectionStyles: React.CSSProperties = {}
  if (settings?.backgroundColor) {
    sectionStyles.backgroundColor = settings.backgroundColor
  }
  if (settings?.backgroundImage) {
    sectionStyles.backgroundImage = `url(${settings.backgroundImage})`
    sectionStyles.backgroundSize = 'cover'
    sectionStyles.backgroundPosition = 'center'
  }

  // Padding classes based on settings
  const paddingClass = {
    none: 'py-0',
    small: 'py-6',
    medium: 'py-12',
    large: 'py-20',
  }[settings?.padding || 'medium']

  // Visibility
  if (settings?.visibility === 'hidden') {
    return null
  }

  // Custom CSS class
  const customClass = settings?.cssClass || ''

  const wrapperClasses = `${paddingClass} ${customClass}`.trim()

  switch (type) {
    case 'hero':
      return (
        <HeroSection
          content={content as HeroContent}
          promoterSlug={promoterSlug}
          className={wrapperClasses}
          style={sectionStyles}
        />
      )

    case 'content':
      return (
        <ContentSection
          content={content as ContentBlockContent}
          className={wrapperClasses}
          style={sectionStyles}
        />
      )

    case 'contact':
      return (
        <ContactSection
          content={content as ContactFormContent}
          className={wrapperClasses}
          style={sectionStyles}
        />
      )

    case 'map':
      return (
        <MapSection
          content={content as MapContent}
          className={wrapperClasses}
          style={sectionStyles}
        />
      )

    case 'cta':
      return (
        <CTASection
          content={content as CTAContent}
          promoterSlug={promoterSlug}
          className={wrapperClasses}
          style={sectionStyles}
        />
      )

    case 'gallery':
      return (
        <GallerySection
          content={content as GalleryContent}
          className={wrapperClasses}
          style={sectionStyles}
        />
      )

    case 'testimonials':
      return (
        <TestimonialsSection
          content={content as TestimonialsContent}
          className={wrapperClasses}
          style={sectionStyles}
        />
      )

    default:
      // Unknown section type
      return null
  }
}

// =============================================================================
// HERO SECTION
// =============================================================================

interface HeroSectionProps {
  content: HeroContent
  promoterSlug: string
  className?: string
  style?: React.CSSProperties
}

function HeroSection({ content, promoterSlug, className, style }: HeroSectionProps) {
  const heightClass = {
    small: 'py-16',
    medium: 'py-24',
    full: 'min-h-[60vh] flex items-center',
  }[content.height || 'medium']

  const alignmentClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[content.alignment || 'center']

  const overlayStyle = content.overlayOpacity
    ? { backgroundColor: `rgba(0, 0, 0, ${content.overlayOpacity})` }
    : {}

  return (
    <section
      className={`relative bg-[#1d1d1d] ${heightClass} ${className}`}
      style={{
        ...style,
        backgroundImage: content.backgroundImage
          ? `url(${content.backgroundImage})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay */}
      {content.overlayOpacity && (
        <div className="absolute inset-0" style={overlayStyle} />
      )}

      <div className={`container mx-auto px-4 relative z-10 ${alignmentClass}`}>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
          {content.headline}
        </h1>
        {content.subheadline && (
          <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto">
            {content.subheadline}
          </p>
        )}
        {content.ctaButton && (
          <div className="mt-8">
            <Link
              href={resolveLink(content.ctaButton.link, promoterSlug)}
              className={`inline-block px-6 py-3 rounded-lg font-medium transition-colors ${
                content.ctaButton.style === 'primary'
                  ? 'bg-[#6ac045] text-white hover:bg-[#5ab035]'
                  : content.ctaButton.style === 'outline'
                  ? 'border-2 border-white text-white hover:bg-white/10'
                  : 'bg-white text-[#1d1d1d] hover:bg-gray-100'
              }`}
            >
              {content.ctaButton.text}
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

// =============================================================================
// CONTENT SECTION
// =============================================================================

interface ContentSectionProps {
  content: ContentBlockContent
  className?: string
  style?: React.CSSProperties
}

function ContentSection({ content, className, style }: ContentSectionProps) {
  return (
    <section className={`bg-white ${className}`} style={style}>
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardContent className="p-8">
            {content.heading && (
              <h2 className="text-2xl font-bold text-[#1d1d1d] mb-6">
                {content.heading}
              </h2>
            )}
            {content.image && content.imagePosition === 'top' && (
              <img
                src={content.image}
                alt=""
                className="w-full rounded-lg mb-6"
              />
            )}
            <div className="flex gap-8">
              {content.image && content.imagePosition === 'left' && (
                <img
                  src={content.image}
                  alt=""
                  className="w-1/3 rounded-lg object-cover"
                />
              )}
              <div
                className={`prose prose-lg max-w-none text-[#717171] ${
                  content.image && (content.imagePosition === 'left' || content.imagePosition === 'right')
                    ? 'flex-1'
                    : ''
                }`}
                dangerouslySetInnerHTML={{ __html: content.body }}
              />
              {content.image && content.imagePosition === 'right' && (
                <img
                  src={content.image}
                  alt=""
                  className="w-1/3 rounded-lg object-cover"
                />
              )}
            </div>
            {content.image && content.imagePosition === 'bottom' && (
              <img
                src={content.image}
                alt=""
                className="w-full rounded-lg mt-6"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

// =============================================================================
// CONTACT SECTION
// =============================================================================

interface ContactSectionProps {
  content: ContactFormContent
  className?: string
  style?: React.CSSProperties
}

function ContactSection({ content, className, style }: ContactSectionProps) {
  return (
    <section className={`bg-white ${className}`} style={style}>
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardContent className="p-8">
            {content.heading && (
              <h2 className="text-xl font-bold text-[#1d1d1d] mb-6">
                {content.heading}
              </h2>
            )}
            <form className="space-y-4">
              {content.fields.map((field) => (
                <div key={field.id}>
                  {field.type === 'textarea' ? (
                    <Textarea
                      label={field.label}
                      placeholder={field.placeholder}
                      required={field.required}
                      rows={5}
                    />
                  ) : field.type === 'select' ? (
                    <div>
                      <label className="block text-sm font-medium text-[#1d1d1d] mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <select
                        className="w-full px-4 py-2 border border-[#efefef] rounded-lg focus:ring-2 focus:ring-[#6ac045] focus:border-transparent"
                        required={field.required}
                      >
                        <option value="">{field.placeholder || 'Select...'}</option>
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : field.type === 'checkbox' ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        required={field.required}
                        className="w-4 h-4 text-[#6ac045] border-[#efefef] rounded focus:ring-[#6ac045]"
                      />
                      <span className="text-[#1d1d1d]">{field.label}</span>
                    </label>
                  ) : (
                    <Input
                      label={field.label}
                      type={field.type}
                      placeholder={field.placeholder}
                      required={field.required}
                    />
                  )}
                </div>
              ))}
              <Button variant="primary" size="lg" className="w-full">
                {content.submitButton}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

// =============================================================================
// MAP SECTION
// =============================================================================

interface MapSectionProps {
  content: MapContent
  className?: string
  style?: React.CSSProperties
}

function MapSection({ content, className, style }: MapSectionProps) {
  // For now, show a placeholder. Real implementation would use Google Maps API.
  return (
    <section className={`bg-white ${className}`} style={style}>
      <div className="container mx-auto px-4 max-w-4xl">
        {content.heading && (
          <h2 className="text-xl font-bold text-[#1d1d1d] mb-6 text-center">
            {content.heading}
          </h2>
        )}
        <Card>
          <CardContent className="p-0 overflow-hidden rounded-lg">
            <div className="bg-[#f1f2f3] h-64 flex items-center justify-center">
              <div className="text-center text-[#717171]">
                <svg
                  className="w-12 h-12 mx-auto mb-2 text-[#6ac045]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {content.address && (
                  <p className="text-sm">{content.address}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

// =============================================================================
// CTA SECTION
// =============================================================================

interface CTASectionProps {
  content: CTAContent
  promoterSlug: string
  className?: string
  style?: React.CSSProperties
}

function CTASection({ content, promoterSlug, className, style }: CTASectionProps) {
  const styleClass = {
    simple: 'text-center',
    banner: 'bg-[#6ac045] text-white text-center rounded-xl',
    card: '',
  }[content.style || 'simple']

  return (
    <section className={`${className}`} style={style}>
      <div className="container mx-auto px-4">
        <div className={`p-8 ${styleClass}`}>
          <h2 className={`text-2xl font-bold mb-2 ${content.style === 'banner' ? 'text-white' : 'text-[#1d1d1d]'}`}>
            {content.headline}
          </h2>
          {content.subtext && (
            <p className={`mb-6 ${content.style === 'banner' ? 'text-white/90' : 'text-[#717171]'}`}>
              {content.subtext}
            </p>
          )}
          <Link
            href={resolveLink(content.button.link, promoterSlug)}
            className={`inline-block px-6 py-3 rounded-lg font-medium transition-colors ${
              content.button.style === 'primary'
                ? content.style === 'banner'
                  ? 'bg-white text-[#6ac045] hover:bg-gray-100'
                  : 'bg-[#6ac045] text-white hover:bg-[#5ab035]'
                : content.style === 'banner'
                ? 'border-2 border-white text-white hover:bg-white/10'
                : 'border-2 border-[#6ac045] text-[#6ac045] hover:bg-[#6ac045]/10'
            }`}
          >
            {content.button.text}
          </Link>
        </div>
      </div>
    </section>
  )
}

// =============================================================================
// GALLERY SECTION
// =============================================================================

interface GallerySectionProps {
  content: GalleryContent
  className?: string
  style?: React.CSSProperties
}

function GallerySection({ content, className, style }: GallerySectionProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
    6: 'grid-cols-3 md:grid-cols-6',
  }[content.columns || 3]

  return (
    <section className={`bg-white ${className}`} style={style}>
      <div className="container mx-auto px-4">
        {content.heading && (
          <h2 className="text-2xl font-bold text-[#1d1d1d] mb-6 text-center">
            {content.heading}
          </h2>
        )}
        <div className={`grid ${gridCols} gap-4`}>
          {content.images.map((image, index) => (
            <div key={index} className="relative group overflow-hidden rounded-lg">
              <img
                src={image.url}
                alt={image.caption || ''}
                className="w-full h-48 object-cover transition-transform group-hover:scale-105"
              />
              {image.caption && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <p className="text-white text-sm">{image.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// =============================================================================
// TESTIMONIALS SECTION
// =============================================================================

interface TestimonialsSectionProps {
  content: TestimonialsContent
  className?: string
  style?: React.CSSProperties
}

function TestimonialsSection({ content, className, style }: TestimonialsSectionProps) {
  return (
    <section className={`bg-[#f8f9fa] ${className}`} style={style}>
      <div className="container mx-auto px-4">
        {content.heading && (
          <h2 className="text-2xl font-bold text-[#1d1d1d] mb-8 text-center">
            {content.heading}
          </h2>
        )}
        <div className={`grid gap-6 ${content.layout === 'stacked' ? 'max-w-2xl mx-auto' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
          {content.testimonials.map((testimonial, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                {testimonial.rating && (
                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-5 h-5 ${i < testimonial.rating! ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                )}
                <blockquote className="text-[#717171] italic mb-4">
                  "{testimonial.quote}"
                </blockquote>
                <div className="flex items-center gap-3">
                  {testimonial.avatar ? (
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.author}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#6ac045] flex items-center justify-center text-white font-medium">
                      {testimonial.author.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-[#1d1d1d]">{testimonial.author}</p>
                    {testimonial.title && (
                      <p className="text-sm text-[#717171]">{testimonial.title}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Resolve relative links to include promoter slug
 */
function resolveLink(link: string, promoterSlug: string): string {
  if (link.startsWith('http') || link.startsWith('mailto:') || link.startsWith('tel:')) {
    return link
  }
  if (link.startsWith('/')) {
    return `/p/${promoterSlug}${link}`
  }
  return `/p/${promoterSlug}/${link}`
}
