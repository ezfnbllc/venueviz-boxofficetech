/**
 * Promoter Home Page
 * Public-facing landing page for a promoter's white-label site
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import {
  getPromoterBySlug,
  getPromoterEvents,
  getPromoterAffiliateEvents,
  PublicAffiliateEvent,
} from '@/lib/public/publicService'
import { getPromoterBasePath } from '@/lib/public/getPromoterBasePath'
import { Layout } from '@/components/public/Layout'
import { HeroBanner } from '@/components/public/HeroBanner'
import { EventGrid } from '@/components/public/EventGrid'
import { Button } from '@/components/public/Button'
import { EventCardProps } from '@/components/public/EventCard'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const promoter = await getPromoterBySlug(slug)

  if (!promoter) {
    return {
      title: 'Not Found',
    }
  }

  const description = promoter.description || `Discover amazing events and buy tickets from ${promoter.name}`

  return {
    title: `${promoter.name} | Events & Tickets`,
    description,
    openGraph: {
      title: `${promoter.name} | Events & Tickets`,
      description,
      images: promoter.banner ? [promoter.banner] : promoter.logo ? [promoter.logo] : [],
      type: 'website',
      locale: 'en_US',
      siteName: promoter.name,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${promoter.name} | Events & Tickets`,
      description,
      images: promoter.banner ? [promoter.banner] : promoter.logo ? [promoter.logo] : [],
    },
  }
}

export default async function PromoterHomePage({ params }: PageProps) {
  const { slug } = await params
  const promoter = await getPromoterBySlug(slug)

  if (!promoter) {
    notFound()
  }

  // Get base path for URLs (empty on custom domains, /p/[slug] on platform)
  const basePath = await getPromoterBasePath(slug)

  const [featuredEvents, upcomingEvents, affiliateEvents] = await Promise.all([
    getPromoterEvents(promoter.id, { featured: true, upcoming: true, limit: 4 }),
    getPromoterEvents(promoter.id, { upcoming: true, limit: 8 }),
    getPromoterAffiliateEvents(promoter.id, { upcoming: true, limit: 8 }),
  ])

  // Transform events to EventCardProps with full schedule/venue/pricing data
  // Serialize dates to ISO strings for safe SSR transfer to client components
  const transformEvent = (event: any): EventCardProps => ({
    id: event.id,
    title: event.name,
    slug: event.slug,
    imageUrl: event.thumbnail,
    // Schedule - serialize Date to ISO string for SSR compatibility
    startDate: event.startDate instanceof Date ? event.startDate.toISOString() : event.startDate,
    startTime: event.startTime,
    endTime: event.endTime,
    // Venue
    venue: event.venue?.name,
    // Pricing
    price: event.pricing?.minPrice,
    currency: event.pricing?.currency || 'USD',
    // Status
    isSoldOut: event.isSoldOut,
    promoterSlug: slug,
  })

  const featuredCards = featuredEvents.map(transformEvent)
  const upcomingCards = upcomingEvents.map(transformEvent)

  // Build Organization structured data for SEO
  const organizationStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': promoter.name,
    'description': promoter.description,
    'url': `${process.env.NEXT_PUBLIC_BASE_URL || ''}${basePath || '/'}`,
    'logo': promoter.logo,
    'image': promoter.banner || promoter.logo,
    ...(promoter.contactEmail && { 'email': promoter.contactEmail }),
    ...(promoter.website && { 'sameAs': [promoter.website] }),
    ...(promoter.socialLinks && {
      'sameAs': [
        promoter.socialLinks.facebook,
        promoter.socialLinks.twitter,
        promoter.socialLinks.instagram,
        promoter.socialLinks.youtube,
      ].filter(Boolean),
    }),
  }

  // Build ItemList structured data for events
  const eventsListStructuredData = upcomingEvents.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'itemListElement': upcomingEvents.slice(0, 10).map((event, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'item': {
        '@type': 'Event',
        'name': event.name,
        'startDate': event.startDate.toISOString(),
        'url': `${process.env.NEXT_PUBLIC_BASE_URL || ''}${basePath}/events/${event.slug || event.id}`,
        'image': event.thumbnail || event.bannerImage,
        'location': event.venue?.name ? {
          '@type': 'Place',
          'name': event.venue.name,
        } : {
          '@type': 'VirtualLocation',
          'url': `${process.env.NEXT_PUBLIC_BASE_URL || ''}${basePath}/events/${event.slug || event.id}`,
        },
      },
    })),
  } : null

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData) }}
      />
      {eventsListStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventsListStructuredData) }}
        />
      )}
      <Layout
      promoterSlug={slug}
      basePath={basePath}
      header={{
        logo: promoter.logo,
        logoText: promoter.name,
        navItems: [
          { label: 'Home', href: basePath || '/' },
          { label: 'Events', href: `${basePath}/events` },
          { label: 'About', href: `${basePath}/about` },
          { label: 'Contact', href: `${basePath}/contact` },
        ],
      }}
      footer={{
        logoText: promoter.name,
        description: promoter.description,
        socialLinks: promoter.socialLinks ? [
          promoter.socialLinks.facebook && { platform: 'facebook' as const, url: promoter.socialLinks.facebook },
          promoter.socialLinks.twitter && { platform: 'twitter' as const, url: promoter.socialLinks.twitter },
          promoter.socialLinks.instagram && { platform: 'instagram' as const, url: promoter.socialLinks.instagram },
          promoter.socialLinks.youtube && { platform: 'youtube' as const, url: promoter.socialLinks.youtube },
        ].filter(Boolean) as any : undefined,
      }}
    >
      {/* Hero Section */}
      <HeroBanner
        title={`Welcome to ${promoter.name}`}
        subtitle={promoter.description || 'Discover amazing events and get your tickets today'}
        ctaText="Browse Events"
        ctaHref={`${basePath}/events`}
        backgroundImage={promoter.banner}
        size="lg"
      />

      {/* Featured Events */}
      {featuredCards.length > 0 && (
        <section className="py-16 bg-[var(--color-background,#fff)]">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-heading,#1d1d1d)]">
                  Featured Events
                </h2>
                <p className="text-[var(--color-text-secondary,#717171)] mt-2">
                  Don't miss these highlighted experiences
                </p>
              </div>
              <Link href={`${basePath}/events`}>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
            <EventGrid
              events={featuredCards}
              columns={4}
              gap="md"
              promoterSlug={slug}
              basePath={basePath}
            />
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      {upcomingCards.length > 0 && (
        <section className="py-16 bg-[var(--color-surface,#f9fafb)]">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-heading,#1d1d1d)]">
                  Upcoming Events
                </h2>
                <p className="text-[var(--color-text-secondary,#717171)] mt-2">
                  Explore what's happening next
                </p>
              </div>
              <Link href={`${basePath}/events`}>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
            <EventGrid
              events={upcomingCards}
              columns={4}
              gap="md"
              promoterSlug={slug}
              basePath={basePath}
              emptyMessage="No upcoming events at this time"
            />
          </div>
        </section>
      )}

      {/* Partner/Affiliate Events */}
      {affiliateEvents.length > 0 && (
        <section className="py-16 bg-[var(--color-background,#fff)]">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-heading,#1d1d1d)]">
                  More Events You'll Love
                </h2>
                <p className="text-[var(--color-text-secondary,#717171)] mt-2">
                  Tickets available from our partners
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {affiliateEvents.map((event) => (
                <a
                  key={event.id}
                  href={event.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-[var(--color-background,#fff)] rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-[var(--color-border,#e2e8f0)]"
                >
                  {/* Event Image */}
                  <div className="relative aspect-[16/9] overflow-hidden bg-[var(--color-surface,#f1f5f9)]">
                    {event.imageUrl ? (
                      <img
                        src={event.imageUrl}
                        alt={event.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                        <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {/* Partner badge */}
                    <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-[var(--color-text-secondary,#717171)] flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {event.platform === 'ticketmaster' ? 'Ticketmaster' : event.platform}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="p-4">
                    <h3 className="font-semibold text-[var(--color-heading,#1d1d1d)] line-clamp-2 group-hover:text-[var(--color-primary,#6ac045)] transition-colors">
                      {event.name}
                    </h3>
                    <div className="mt-2 space-y-1 text-sm text-[var(--color-text-secondary,#717171)]">
                      <p className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {!isNaN(event.startDate.getTime()) ? (
                          new Intl.DateTimeFormat('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }).format(event.startDate)
                        ) : (
                          'Date TBA'
                        )}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{event.venueName}, {event.venueCity}</span>
                      </p>
                    </div>
                    {event.minPrice && (
                      <p className="mt-3 text-sm font-semibold text-[var(--color-heading,#1d1d1d)]">
                        From {new Intl.NumberFormat('en-US', { style: 'currency', currency: event.currency || 'USD' }).format(event.minPrice)}
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* No Events Message */}
      {featuredCards.length === 0 && upcomingCards.length === 0 && affiliateEvents.length === 0 && (
        <section className="py-24 bg-[var(--color-background,#fff)]">
          <div className="container mx-auto px-4 text-center">
            <svg
              className="w-20 h-20 mx-auto text-[var(--color-border,#efefef)] mb-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h2 className="text-2xl font-bold text-[var(--color-heading,#1d1d1d)] mb-4">
              No Events Available
            </h2>
            <p className="text-[var(--color-text-secondary,#717171)] max-w-md mx-auto">
              Check back soon! New events will be announced here.
            </p>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-[var(--color-heading,#1d1d1d)]">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Stay Updated
          </h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">
            Be the first to know about new events, exclusive offers, and more.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-md border-0 focus:ring-2 focus:ring-[var(--color-primary,#6ac045)]"
            />
            <Button variant="primary" size="lg">
              Subscribe
            </Button>
          </div>
        </div>
      </section>
    </Layout>
    </>
  )
}
