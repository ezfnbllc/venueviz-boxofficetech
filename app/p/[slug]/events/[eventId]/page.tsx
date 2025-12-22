/**
 * Event Detail Page
 * Displays full event information with ticket selection
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'
import {
  getPromoterBySlug,
  getEventBySlugOrId,
} from '@/lib/public/publicService'
import { Layout } from '@/components/public/Layout'
import { Button } from '@/components/public/Button'
import { Card, CardContent } from '@/components/public/Card'

interface PageProps {
  params: Promise<{ slug: string; eventId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, eventId } = await params
  const [promoter, event] = await Promise.all([
    getPromoterBySlug(slug),
    getEventBySlugOrId(eventId),
  ])

  if (!promoter || !event) {
    return {
      title: 'Not Found',
    }
  }

  return {
    title: `${event.name} | ${promoter.name}`,
    description: event.shortDescription || event.description?.substring(0, 160),
    openGraph: {
      title: event.name,
      description: event.shortDescription || event.description?.substring(0, 160),
      images: event.bannerImage || event.thumbnail ? [event.bannerImage || event.thumbnail!] : [],
    },
  }
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug, eventId } = await params
  const [promoter, event] = await Promise.all([
    getPromoterBySlug(slug),
    getEventBySlugOrId(eventId),
  ])

  if (!promoter || !event) {
    notFound()
  }

  // Format date safely
  const formatDate = (date: Date | undefined | null) => {
    if (!date || isNaN(date.getTime())) {
      return 'Date TBA'
    }
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }

  const formatTime = (date: Date | undefined | null) => {
    if (!date || isNaN(date.getTime())) {
      return ''
    }
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date)
  }

  const formatPrice = (price: number | undefined, currency = 'USD') => {
    if (price === undefined || price === null) {
      return 'Free'
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price)
  }

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
      }}
    >
      {/* Hero Banner */}
      <section className="relative h-[300px] md:h-[400px] bg-[#1d1d1d]">
        {event.bannerImage && (
          <>
            <Image
              src={event.bannerImage}
              alt={event.name}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black/50" />
          </>
        )}

        <div className="absolute inset-0 flex items-end">
          <div className="container mx-auto px-4 pb-8">
            <nav className="mb-4">
              <Link
                href={`/p/${slug}/events`}
                className="text-white/70 hover:text-white transition-colors inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Events
              </Link>
            </nav>

            {event.category && (
              <span className="inline-block px-3 py-1 bg-[#6ac045] text-white text-sm font-medium rounded-full mb-4">
                {event.category}
              </span>
            )}

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
              {event.name}
            </h1>
          </div>
        </div>
      </section>

      {/* Event Content */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Event Details */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-6 mb-6">
                    {/* Date */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-[#e8f7f7] rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-[#6ac045]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-[#717171]">Date & Time</p>
                        <p className="font-medium text-[#1d1d1d]">{formatDate(event.startDate)}</p>
                        <p className="text-[#717171]">{formatTime(event.startDate)}</p>
                      </div>
                    </div>

                    {/* Venue */}
                    {event.venue && (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-[#e8f7f7] rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-[#6ac045]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-[#717171]">Venue</p>
                          <p className="font-medium text-[#1d1d1d]">{event.venue.name}</p>
                          {event.venue.address && (
                            <p className="text-[#717171]">{event.venue.address}</p>
                          )}
                          {event.venue.city && (
                            <p className="text-[#717171]">
                              {event.venue.city}{event.venue.state && `, ${event.venue.state}`}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <h2 className="text-xl font-bold text-[#1d1d1d] mb-4">About This Event</h2>
                    <div className="prose prose-lg max-w-none text-[#717171]">
                      {event.description ? (
                        <p className="whitespace-pre-wrap">{event.description}</p>
                      ) : (
                        <p>No description available.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Venue Map Placeholder */}
              {event.venue && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold text-[#1d1d1d] mb-4">Location</h2>
                    <div className="aspect-video bg-[#f1f2f3] rounded-lg flex items-center justify-center">
                      <div className="text-center text-[#717171]">
                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        <p>Map coming soon</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar - Ticket Purchase */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <Card className="border-2 border-[#efefef]">
                  <CardContent className="p-6">
                    {event.isSoldOut ? (
                      <div className="text-center py-4">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-[#1d1d1d] mb-2">Sold Out</h3>
                        <p className="text-[#717171]">This event is no longer available</p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-6">
                          <p className="text-sm text-[#717171] mb-1">Price from</p>
                          <p className="text-3xl font-bold text-[#1d1d1d]">
                            {event.pricing?.minPrice
                              ? formatPrice(event.pricing.minPrice, event.pricing.currency)
                              : 'Free'}
                          </p>
                          {event.pricing?.maxPrice && event.pricing.maxPrice !== event.pricing.minPrice && (
                            <p className="text-sm text-[#717171]">
                              to {formatPrice(event.pricing.maxPrice, event.pricing.currency)}
                            </p>
                          )}
                        </div>

                        <Link href={`/p/${slug}/events/${eventId}/checkout`}>
                          <Button variant="primary" size="lg" className="w-full">
                            Get Tickets
                            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </Button>
                        </Link>

                        {event.ticketsAvailable !== undefined && (
                          <p className="text-center text-sm text-[#717171] mt-4">
                            {event.ticketsAvailable} tickets remaining
                          </p>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Share */}
                <Card className="mt-4">
                  <CardContent className="p-4">
                    <p className="text-sm text-[#717171] mb-3">Share this event</p>
                    <div className="flex gap-2">
                      <button className="flex-1 p-2 rounded-md bg-[#f1f2f3] hover:bg-[#e8f7f7] transition-colors">
                        <svg className="w-5 h-5 mx-auto text-[#1877f2]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                        </svg>
                      </button>
                      <button className="flex-1 p-2 rounded-md bg-[#f1f2f3] hover:bg-[#e8f7f7] transition-colors">
                        <svg className="w-5 h-5 mx-auto text-[#1da1f2]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                        </svg>
                      </button>
                      <button className="flex-1 p-2 rounded-md bg-[#f1f2f3] hover:bg-[#e8f7f7] transition-colors">
                        <svg className="w-5 h-5 mx-auto text-[#25d366]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      </button>
                      <button className="flex-1 p-2 rounded-md bg-[#f1f2f3] hover:bg-[#e8f7f7] transition-colors">
                        <svg className="w-5 h-5 mx-auto text-[#717171]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  )
}
