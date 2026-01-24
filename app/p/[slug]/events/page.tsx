/**
 * Events Listing Page
 * Displays all events for a promoter with filtering and search
 */

import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import {
  getPromoterBySlug,
  getPromoterEvents,
  getPromoterCategories,
  getPromoterAffiliateEvents,
  PublicAffiliateEvent,
} from '@/lib/public/publicService'
import { getPromoterBasePath } from '@/lib/public/getPromoterBasePath'
import { Layout } from '@/components/public/Layout'
import { EventGrid } from '@/components/public/EventGrid'
import { FilterTabs } from '@/components/public/FilterTabs'
import { EventCardProps } from '@/components/public/EventCard'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ category?: string; view?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const promoter = await getPromoterBySlug(slug)

  if (!promoter) {
    return {
      title: 'Not Found',
    }
  }

  const description = `Browse all upcoming events and buy tickets from ${promoter.name}. Find concerts, shows, and experiences near you.`

  return {
    title: `Events | ${promoter.name}`,
    description,
    openGraph: {
      title: `Events | ${promoter.name}`,
      description,
      images: promoter.banner ? [promoter.banner] : promoter.logo ? [promoter.logo] : [],
      type: 'website',
      locale: 'en_US',
      siteName: promoter.name,
    },
    twitter: {
      card: 'summary_large_image',
      title: `Events | ${promoter.name}`,
      description,
      images: promoter.banner ? [promoter.banner] : promoter.logo ? [promoter.logo] : [],
    },
  }
}

export default async function EventsPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { category } = await searchParams
  const promoter = await getPromoterBySlug(slug)

  if (!promoter) {
    notFound()
  }

  // Get base path for URLs (empty on custom domains, /p/[slug] on platform)
  const basePath = await getPromoterBasePath(slug)

  const [events, categories, affiliateEvents] = await Promise.all([
    getPromoterEvents(promoter.id, { category, upcoming: true }),
    getPromoterCategories(promoter.id),
    getPromoterAffiliateEvents(promoter.id, { upcoming: true }),
  ])

  // Transform events to EventCardProps with full schedule/venue/pricing data
  // Serialize dates to ISO strings for safe SSR transfer to client components
  const eventCards: EventCardProps[] = events.map(event => ({
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
  }))

  // Build filter options
  const filterOptions = [
    { value: '', label: 'All Events', count: events.length },
    ...categories.map(cat => ({
      value: cat,
      label: cat,
      count: events.filter(e => e.category === cat).length,
    })),
  ]

  // Build ItemList structured data for SEO
  const eventsListStructuredData = events.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': `${promoter.name} Events`,
    'description': `Upcoming events from ${promoter.name}`,
    'numberOfItems': events.length,
    'itemListElement': events.slice(0, 20).map((event, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'item': {
        '@type': 'Event',
        'name': event.name,
        'startDate': event.startDate.toISOString(),
        'url': `${process.env.NEXT_PUBLIC_BASE_URL || ''}${basePath}/events/${event.slug || event.id}`,
        'image': event.thumbnail || event.bannerImage,
        'description': event.shortDescription || event.description?.substring(0, 160),
        'location': event.venue?.name ? {
          '@type': 'Place',
          'name': event.venue.name,
          'address': event.venue.city && event.venue.state
            ? `${event.venue.city}, ${event.venue.state}`
            : undefined,
        } : {
          '@type': 'VirtualLocation',
          'url': `${process.env.NEXT_PUBLIC_BASE_URL || ''}${basePath}/events/${event.slug || event.id}`,
        },
        'offers': {
          '@type': 'Offer',
          'price': event.pricing?.minPrice || 0,
          'priceCurrency': event.pricing?.currency || 'USD',
          'availability': event.isSoldOut
            ? 'https://schema.org/SoldOut'
            : 'https://schema.org/InStock',
        },
        'organizer': {
          '@type': 'Organization',
          'name': promoter.name,
        },
      },
    })),
  } : null

  return (
    <>
      {/* Structured Data for SEO */}
      {eventsListStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventsListStructuredData) }}
        />
      )}
      <Layout
      promoterSlug={slug}
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
      }}
    >
      {/* Page Header */}
      <section className="bg-[#1d1d1d] py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Events
          </h1>
          <p className="text-white/80 text-lg max-w-2xl">
            Discover upcoming events and get your tickets today
          </p>
        </div>
      </section>

      {/* Filters and Events */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="mb-8">
              <EventFilterTabs
                options={filterOptions}
                currentCategory={category || ''}
                basePath={basePath}
              />
            </div>
          )}

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="Search events..."
                className="w-full px-4 py-3 pl-12 rounded-md border border-[#efefef] focus:border-[#6ac045] focus:ring-2 focus:ring-[#6ac045]/20 transition-colors"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717171]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-[#717171]">
              Showing <span className="font-medium text-[#1d1d1d]">{eventCards.length}</span> events
              {category && <span> in <span className="font-medium text-[#1d1d1d]">{category}</span></span>}
            </p>

            {/* View Toggle (future enhancement) */}
            <div className="hidden md:flex items-center gap-2">
              <button className="p-2 rounded-md bg-[#f1f2f3] text-[#1d1d1d]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button className="p-2 rounded-md text-[#717171] hover:bg-[#f1f2f3]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Event Grid */}
          <EventGrid
            events={eventCards}
            columns={4}
            gap="md"
            promoterSlug={slug}
            basePath={basePath}
            emptyMessage="No events found matching your criteria"
          />
        </div>
      </section>

      {/* Partner/Affiliate Events */}
      {affiliateEvents.length > 0 && (
        <section className="py-16 bg-[#f9fafb]">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-[#1d1d1d]">
                  More Events You'll Love
                </h2>
                <p className="text-[#717171] mt-2">
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
                  className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100"
                >
                  {/* Event Image */}
                  <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
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
                    <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-[#717171] flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {event.platform === 'ticketmaster' ? 'Ticketmaster' : event.platform === 'ticketnetwork' ? 'TicketNetwork' : event.platform}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="p-4">
                    <h3 className="font-semibold text-[#1d1d1d] line-clamp-2 group-hover:text-[#6ac045] transition-colors">
                      {event.name}
                    </h3>
                    <div className="mt-2 space-y-1 text-sm text-[#717171]">
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
                      <p className="mt-3 text-sm font-semibold text-[#1d1d1d]">
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
    </Layout>
    </>
  )
}

// Client-side filter tabs wrapper for navigation
function EventFilterTabs({
  options,
  currentCategory,
  basePath,
}: {
  options: { value: string; label: string; count?: number }[]
  currentCategory: string
  basePath: string
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = option.value === currentCategory
        const href = option.value
          ? `${basePath}/events?category=${encodeURIComponent(option.value)}`
          : `${basePath}/events`

        return (
          <a
            key={option.value}
            href={href}
            className={`
              font-medium px-4 py-2 rounded-full transition-all duration-200 whitespace-nowrap
              ${isActive
                ? 'bg-[#6ac045] text-white'
                : 'bg-[#f1f2f3] text-[#717171] hover:bg-[#e8f7f7] hover:text-[#6ac045]'
              }
            `}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={`ml-1.5 text-xs ${isActive ? 'opacity-80' : 'text-[#a0a0a0]'}`}>
                ({option.count})
              </span>
            )}
          </a>
        )
      })}
    </div>
  )
}
