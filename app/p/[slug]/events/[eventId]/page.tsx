/**
 * Event Detail Page
 * Based on Barren theme event detail layout
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'
import {
  getPromoterBySlug,
  getEventBySlugOrId,
  getVenueById,
  getPromoterEvents,
} from '@/lib/public/publicService'
import { Layout } from '@/components/public/Layout'
import { Button } from '@/components/public/Button'
import { Card, CardContent } from '@/components/public/Card'
import { EventGrid } from '@/components/public/EventGrid'
import { EventCardProps } from '@/components/public/EventCard'
import { CountdownTimer } from '@/components/public/CountdownTimer'

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
    return { title: 'Not Found' }
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

// Format time from HH:mm to "5:30 AM"
function formatTimeString(time?: string): string {
  if (!time) return ''
  const [hours, minutes] = time.split(':').map(Number)
  if (isNaN(hours)) return time
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

// Calculate duration between two times
function calculateDuration(startTime?: string, endTime?: string): string {
  if (!startTime || !endTime) return ''
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  if (isNaN(startH) || isNaN(endH)) return ''
  let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM)
  if (diffMinutes < 0) diffMinutes += 24 * 60
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

// Format price with currency
function formatPrice(price: number | undefined, currency = 'USD'): string {
  if (price === undefined || price === null || price === 0) return 'Free'
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  })
  return formatter.format(price)
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

  // Fetch full venue details and more events
  const [venueDetails, moreEvents] = await Promise.all([
    event.venue?.id ? getVenueById(event.venue.id) : null,
    getPromoterEvents(promoter.id, { limit: 4 }),
  ])

  // Filter out current event from more events
  const relatedEvents = moreEvents.filter(e => e.id !== event.id).slice(0, 3)

  // Build full address
  const venueAddress = venueDetails
    ? [venueDetails.streetAddress1, venueDetails.city, venueDetails.state, venueDetails.zipCode].filter(Boolean).join(', ')
    : event.venue?.city && event.venue?.state
      ? `${event.venue.city}, ${event.venue.state}`
      : event.venue?.address

  const coordinates = venueDetails?.coordinates || event.venue?.coordinates
  const isOnline = !event.venue?.name

  // Format date parts
  const eventDate = event.startDate && !isNaN(event.startDate.getTime()) ? event.startDate : null
  const monthShort = eventDate?.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  const dayNum = eventDate?.getDate().toString().padStart(2, '0')
  const fullDate = eventDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  const startTimeFormatted = formatTimeString(event.startTime)
  const duration = calculateDuration(event.startTime, event.endTime)

  // Transform related events for EventGrid
  const relatedEventCards: EventCardProps[] = relatedEvents.map(e => ({
    id: e.id,
    title: e.name,
    slug: e.slug,
    imageUrl: e.thumbnail,
    startDate: e.startDate,
    startTime: e.startTime,
    endTime: e.endTime,
    venue: e.venue?.name,
    price: e.pricing?.minPrice,
    currency: e.pricing?.currency || 'USD',
    isSoldOut: e.isSoldOut,
    promoterSlug: slug,
  }))

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
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          </>
        )}
      </section>

      {/* Main Content */}
      <section className="py-8 bg-[#f9fafb]">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Event Info */}
            <div className="lg:col-span-2">
              {/* Event Header Card */}
              <Card className="mb-6 -mt-24 relative z-10">
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    {/* Date Badge */}
                    {eventDate && (
                      <div className="flex-shrink-0 w-20 h-20 bg-[#6ac045] rounded-lg flex flex-col items-center justify-center text-white">
                        <span className="text-sm font-medium">{monthShort}</span>
                        <span className="text-3xl font-bold leading-none">{dayNum}</span>
                      </div>
                    )}

                    {/* Event Title & Info */}
                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl md:text-3xl font-bold text-[#1d1d1d] mb-2">
                        {event.name}
                      </h1>
                      <div className="flex flex-wrap items-center gap-2 text-[#717171]">
                        {isOnline && (
                          <span className="inline-flex items-center px-2 py-1 bg-[#6ac045] text-white text-xs font-medium rounded">
                            Online Event
                          </span>
                        )}
                        <span>
                          Starts on {fullDate} {startTimeFormatted}
                          {duration && <span className="text-[#6ac045]"> {duration}</span>}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Save & Share */}
                  <div className="flex gap-3 mt-6 pt-6 border-t border-[#efefef]">
                    <button className="flex items-center gap-2 px-4 py-2 border border-[#efefef] rounded-lg hover:bg-[#f1f2f3] transition-colors">
                      <svg className="w-5 h-5 text-[#717171]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      <span className="text-sm font-medium text-[#1d1d1d]">Save</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 border border-[#efefef] rounded-lg hover:bg-[#f1f2f3] transition-colors">
                      <svg className="w-5 h-5 text-[#717171]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      <span className="text-sm font-medium text-[#1d1d1d]">Share</span>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* About This Event */}
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-[#1d1d1d] mb-4">About This Event</h2>
                  <div className="prose prose-lg max-w-none text-[#717171]">
                    {event.description ? (
                      <div className="whitespace-pre-wrap">{event.description}</div>
                    ) : (
                      <p>No description available for this event.</p>
                    )}
                  </div>

                  {/* Tags */}
                  {event.tags && event.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-[#efefef]">
                      {event.tags.map((tag, i) => (
                        <span key={i} className="px-3 py-1 bg-[#f1f2f3] text-[#717171] text-sm rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Event Details - Countdown */}
              {eventDate && eventDate > new Date() && (
                <Card className="mb-6">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold text-[#1d1d1d] mb-6">Event Details</h2>
                    <CountdownTimer targetDate={eventDate} />
                  </CardContent>
                </Card>
              )}

              {/* Location Map */}
              {!isOnline && coordinates && (
                <Card className="mb-6">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold text-[#1d1d1d] mb-4">Location</h2>
                    <div className="aspect-video rounded-lg overflow-hidden mb-4">
                      <iframe
                        src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${coordinates.lat},${coordinates.lng}&zoom=15`}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[#1d1d1d]">{venueDetails?.name || event.venue?.name}</p>
                        {venueAddress && <p className="text-sm text-[#717171]">{venueAddress}</p>}
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-[#f1f2f3] hover:bg-[#e8f7f7] text-[#1d1d1d] rounded-lg text-sm font-medium transition-colors"
                      >
                        Get Directions
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* Organised By */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-[#1d1d1d] mb-4">Organised by</h3>
                    <div className="flex items-center gap-4">
                      {promoter.logo ? (
                        <Image
                          src={promoter.logo}
                          alt={promoter.name}
                          width={48}
                          height={48}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-[#6ac045] rounded-full flex items-center justify-center text-white text-xl font-bold">
                          {promoter.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-[#1d1d1d]">{promoter.name}</p>
                        <Link href={`/p/${slug}`} className="text-sm text-[#6ac045] hover:underline">
                          View Profile
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Date and Time */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-[#1d1d1d] mb-4">Date and Time</h3>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 bg-[#e8f7f7] rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[#6ac045]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-[#1d1d1d]">{fullDate || 'Date TBA'}</p>
                        <p className="text-sm text-[#717171]">{startTimeFormatted || 'Time TBA'}</p>
                      </div>
                    </div>
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-[#6ac045] text-[#6ac045] rounded-lg hover:bg-[#e8f7f7] transition-colors text-sm font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add to Calendar
                    </button>
                  </CardContent>
                </Card>

                {/* Location */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-[#1d1d1d] mb-4">Location</h3>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-[#e8f7f7] rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[#6ac045]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        {isOnline ? (
                          <p className="font-medium text-[#1d1d1d]">Online</p>
                        ) : (
                          <>
                            <p className="font-medium text-[#1d1d1d]">{venueDetails?.name || event.venue?.name}</p>
                            {venueAddress && <p className="text-sm text-[#717171]">{venueAddress}</p>}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Price & Book Now */}
                <Card className="border-2 border-[#6ac045]">
                  <CardContent className="p-6">
                    {event.isSoldOut ? (
                      <div className="text-center">
                        <p className="text-xl font-bold text-red-500 mb-2">Sold Out</p>
                        <p className="text-sm text-[#717171]">This event is no longer available</p>
                      </div>
                    ) : (
                      <>
                        <div className="text-center mb-4">
                          <p className="text-sm text-[#717171]">{event.pricing?.currency || 'USD'}</p>
                          <p className="text-4xl font-bold text-[#1d1d1d]">
                            {formatPrice(event.pricing?.minPrice, event.pricing?.currency)}
                          </p>
                          {event.pricing?.maxPrice && event.pricing.maxPrice !== event.pricing.minPrice && (
                            <p className="text-sm text-[#717171]">
                              to {formatPrice(event.pricing.maxPrice, event.pricing.currency)}
                            </p>
                          )}
                        </div>
                        <Link href={`/p/${slug}/events/${event.slug || event.id}/checkout`}>
                          <Button variant="primary" size="lg" className="w-full">
                            Book Now
                          </Button>
                        </Link>
                        {event.ticketsAvailable !== undefined && event.ticketsAvailable > 0 && event.ticketsAvailable < 50 && (
                          <p className="text-center text-sm text-orange-500 font-medium mt-3">
                            Only {event.ticketsAvailable} tickets left!
                          </p>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* More Events */}
      {relatedEventCards.length > 0 && (
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-[#1d1d1d]">More Events</h2>
              <Link href={`/p/${slug}/events`} className="text-[#6ac045] hover:underline font-medium">
                Browse All
              </Link>
            </div>
            <EventGrid
              events={relatedEventCards}
              columns={3}
              gap="md"
              promoterSlug={slug}
            />
          </div>
        </section>
      )}
    </Layout>
  )
}
