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
} from '@/lib/public/publicService'
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

  return {
    title: `${promoter.name} | Events & Tickets`,
    description: promoter.description || `Discover events from ${promoter.name}`,
    openGraph: {
      title: promoter.name,
      description: promoter.description,
      images: promoter.banner ? [promoter.banner] : [],
    },
  }
}

export default async function PromoterHomePage({ params }: PageProps) {
  const { slug } = await params
  const promoter = await getPromoterBySlug(slug)

  if (!promoter) {
    notFound()
  }

  const [featuredEvents, upcomingEvents] = await Promise.all([
    getPromoterEvents(promoter.id, { featured: true, limit: 4 }),
    getPromoterEvents(promoter.id, { limit: 8 }),
  ])

  // Helper to format date string
  const formatDateString = (date: Date | undefined | null) => {
    if (!date || isNaN(date.getTime())) {
      return 'Date TBA'
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  }

  // Transform events to EventCardProps
  const transformEvent = (event: any): EventCardProps => ({
    id: event.id,
    title: event.name,
    slug: event.slug,
    date: formatDateString(event.startDate),
    venue: event.venue?.name,
    imageUrl: event.thumbnail,
    price: event.pricing?.minPrice,
    promoterSlug: slug,
  })

  const featuredCards = featuredEvents.map(transformEvent)
  const upcomingCards = upcomingEvents.map(transformEvent)

  return (
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
        ctaHref={`/p/${slug}/events`}
        backgroundImage={promoter.banner}
        size="lg"
      />

      {/* Featured Events */}
      {featuredCards.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-[#1d1d1d]">
                  Featured Events
                </h2>
                <p className="text-[#717171] mt-2">
                  Don't miss these highlighted experiences
                </p>
              </div>
              <Link href={`/p/${slug}/events`}>
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
            />
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      {upcomingCards.length > 0 && (
        <section className="py-16 bg-[#f9fafb]">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-[#1d1d1d]">
                  Upcoming Events
                </h2>
                <p className="text-[#717171] mt-2">
                  Explore what's happening next
                </p>
              </div>
              <Link href={`/p/${slug}/events`}>
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
              emptyMessage="No upcoming events at this time"
            />
          </div>
        </section>
      )}

      {/* No Events Message */}
      {featuredCards.length === 0 && upcomingCards.length === 0 && (
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4 text-center">
            <svg
              className="w-20 h-20 mx-auto text-[#efefef] mb-6"
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
            <h2 className="text-2xl font-bold text-[#1d1d1d] mb-4">
              No Events Available
            </h2>
            <p className="text-[#717171] max-w-md mx-auto">
              Check back soon! New events will be announced here.
            </p>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-[#1d1d1d]">
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
              className="flex-1 px-4 py-3 rounded-md border-0 focus:ring-2 focus:ring-[#6ac045]"
            />
            <Button variant="primary" size="lg">
              Subscribe
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  )
}
