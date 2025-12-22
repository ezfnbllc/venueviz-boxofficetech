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
} from '@/lib/public/publicService'
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

  const [events, categories] = await Promise.all([
    getPromoterEvents(promoter.id, { category }),
    getPromoterCategories(promoter.id),
  ])

  // Transform events to EventCardProps with full schedule/venue/pricing data
  const eventCards: EventCardProps[] = events.map(event => ({
    id: event.id,
    title: event.name,
    slug: event.slug,
    imageUrl: event.thumbnail,
    // Schedule
    startDate: event.startDate,
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
        'url': `${process.env.NEXT_PUBLIC_BASE_URL || ''}/p/${slug}/events/${event.slug || event.id}`,
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
          'url': `${process.env.NEXT_PUBLIC_BASE_URL || ''}/p/${slug}/events/${event.slug || event.id}`,
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
          { label: 'Home', href: `/p/${slug}` },
          { label: 'Events', href: `/p/${slug}/events` },
          { label: 'About', href: `/p/${slug}/about` },
          { label: 'Contact', href: `/p/${slug}/contact` },
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
                promoterSlug={slug}
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
            emptyMessage="No events found matching your criteria"
          />
        </div>
      </section>
    </Layout>
    </>
  )
}

// Client-side filter tabs wrapper for navigation
function EventFilterTabs({
  options,
  currentCategory,
  promoterSlug,
}: {
  options: { value: string; label: string; count?: number }[]
  currentCategory: string
  promoterSlug: string
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = option.value === currentCategory
        const href = option.value
          ? `/p/${promoterSlug}/events?category=${encodeURIComponent(option.value)}`
          : `/p/${promoterSlug}/events`

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
