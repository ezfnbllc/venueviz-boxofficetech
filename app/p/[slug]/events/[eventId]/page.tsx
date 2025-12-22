/**
 * Event Detail Page - Barren Theme Style
 * Displays full event information with countdown, organizer info, and ticket booking
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
import { EventCard } from '@/components/public/EventCard'
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

// Format short month name
function formatMonth(date: Date | undefined | null): string {
  if (!date || isNaN(date.getTime())) return 'TBA'
  return date.toLocaleDateString('en-US', { month: 'short' })
}

// Format day number
function formatDay(date: Date | undefined | null): string {
  if (!date || isNaN(date.getTime())) return '--'
  return date.getDate().toString().padStart(2, '0')
}

// Format full date with weekday
function formatFullDate(date: Date | undefined | null): string {
  if (!date || isNaN(date.getTime())) return 'Date TBA'
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Format full date and time combined
function formatDateTimeDisplay(date: Date | undefined | null, time?: string): string {
  if (!date || isNaN(date.getTime())) return 'Date TBA'
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  if (time) {
    return `${dateStr} ${formatTimeString(time)}`
  }
  return dateStr
}

// Format time from HH:mm to "3:45 PM"
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
  if (price === undefined || price === null || price === 0) {
    return 'Free'
  }
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

  // Fetch full venue details if we have a venue ID
  let venueDetails = null
  if (event.venue?.id) {
    venueDetails = await getVenueById(event.venue.id)
  }

  // Fetch more events from the same promoter
  const moreEvents = await getPromoterEvents(promoter.id, { upcoming: true, limit: 6 })
  const filteredMoreEvents = moreEvents.filter(e => e.id !== event.id).slice(0, 6)

  // Build full address
  const venueAddress = venueDetails
    ? [
        venueDetails.streetAddress1,
        venueDetails.streetAddress2,
        venueDetails.city,
        venueDetails.state,
        venueDetails.zipCode,
      ].filter(Boolean).join(', ')
    : event.venue?.city && event.venue?.state
      ? `${event.venue.city}, ${event.venue.state}`
      : event.venue?.address

  // Get coordinates for map
  const coordinates = venueDetails?.coordinates || event.venue?.coordinates

  // Format times
  const startTimeFormatted = formatTimeString(event.startTime)
  const duration = calculateDuration(event.startTime, event.endTime)

  // Determine if it's online event
  const isOnlineEvent = event.venue?.type === 'online' || !event.venue?.name

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
      {/* Breadcrumb */}
      <div className="bg-[#f5f7f9] border-b border-[#efefef]">
        <div className="container mx-auto px-4 py-4">
          <nav aria-label="breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <Link href={`/p/${slug}`} className="text-[#717171] hover:text-[#6ac045] transition-colors">
                  Home
                </Link>
              </li>
              <li className="text-[#717171]">/</li>
              <li>
                <Link href={`/p/${slug}/events`} className="text-[#717171] hover:text-[#6ac045] transition-colors">
                  Events
                </Link>
              </li>
              <li className="text-[#717171]">/</li>
              <li className="text-[#1d1d1d] font-medium truncate max-w-[200px]">
                {event.name}
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Event Top Section - Date Badge + Title */}
      <section className="bg-white border-b border-[#efefef]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-start gap-6">
            {/* Date Badge */}
            <div className="flex-shrink-0 hidden sm:block">
              <div className="w-[100px] border border-[#efefef] rounded overflow-hidden text-center">
                <div className="bg-[#6ac045] text-white text-lg font-medium py-1.5 uppercase">
                  {formatMonth(event.startDate)}
                </div>
                <div className="bg-white text-[#1d1d1d] text-3xl font-semibold py-2">
                  {formatDay(event.startDate)}
                </div>
              </div>
            </div>

            {/* Event Title & Info */}
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-[#1d1d1d] mb-4">
                {event.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[#717171]">
                {/* Event Type */}
                <span className="flex items-center">
                  {isOnlineEvent ? (
                    <>
                      <svg className="w-4 h-4 mr-2 text-[#6ac045]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Online Event
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2 text-[#6ac045]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Venue Event
                    </>
                  )}
                </span>

                {/* Separator */}
                <span className="hidden sm:inline-block w-1 h-1 bg-[#1d1d1d] rounded-full" />

                {/* Date & Time */}
                <span>
                  Starts on <span className="text-[#1d1d1d] font-medium">{formatDateTimeDisplay(event.startDate, event.startTime)}</span>
                </span>

                {/* Separator & Duration */}
                {duration && (
                  <>
                    <span className="hidden sm:inline-block w-1 h-1 bg-[#1d1d1d] rounded-full" />
                    <span>{duration}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-10 bg-[#f5f7f9]">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2">
              {/* Event Image */}
              <Card className="overflow-hidden">
                <div className="relative aspect-[16/9]">
                  {(event.bannerImage || event.thumbnail) ? (
                    <Image
                      src={event.bannerImage || event.thumbnail!}
                      alt={event.name}
                      fill
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full bg-[#f1f2f3] flex items-center justify-center">
                      <svg className="w-24 h-24 text-[#717171]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Save/Share Buttons */}
                <div className="flex justify-center gap-3 py-6 border-b border-[#efefef]">
                  <button className="inline-flex items-center px-4 py-2 border border-[#efefef] rounded text-[#1d1d1d] font-medium hover:bg-[#e8f7f7] transition-colors">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Save
                  </button>
                  <div className="relative group">
                    <button className="inline-flex items-center px-4 py-2 border border-[#efefef] rounded text-[#1d1d1d] font-medium hover:bg-[#e8f7f7] transition-colors">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share
                    </button>
                    {/* Share Dropdown */}
                    <div className="absolute top-full left-0 mt-2 bg-white border border-[#efefef] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[160px]">
                      <a href="#" className="flex items-center px-4 py-3 hover:bg-[#e8f7f7] text-[#1d1d1d]">
                        <svg className="w-4 h-4 mr-3 text-[#1877f2]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                        </svg>
                        Facebook
                      </a>
                      <a href="#" className="flex items-center px-4 py-3 hover:bg-[#e8f7f7] text-[#1d1d1d]">
                        <svg className="w-4 h-4 mr-3 text-[#1da1f2]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                        </svg>
                        Twitter
                      </a>
                      <a href="#" className="flex items-center px-4 py-3 hover:bg-[#e8f7f7] text-[#1d1d1d]">
                        <svg className="w-4 h-4 mr-3 text-[#0077b5]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                        LinkedIn
                      </a>
                      <a href="#" className="flex items-center px-4 py-3 hover:bg-[#e8f7f7] text-[#1d1d1d]">
                        <svg className="w-4 h-4 mr-3 text-[#717171]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Email
                      </a>
                    </div>
                  </div>
                </div>

                {/* About This Event */}
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-[#1d1d1d] mb-4">About This Event</h2>
                  <div className="prose prose-lg max-w-none text-[#717171] leading-relaxed">
                    {event.description ? (
                      event.description.split('\n\n').map((paragraph, i) => (
                        <p key={i} className="mb-6 last:mb-0">{paragraph}</p>
                      ))
                    ) : (
                      <p>No description available for this event.</p>
                    )}
                  </div>

                  {/* Tags */}
                  {event.tags && event.tags.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-[#efefef]">
                      <div className="flex flex-wrap gap-2">
                        {event.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-[#f1f2f3] text-[#717171] text-sm rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Venue Map - Only for venue events */}
              {!isOnlineEvent && coordinates && (
                <Card className="mt-6 overflow-hidden">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold text-[#1d1d1d] mb-4">Location</h2>
                    <div className="aspect-video rounded-lg overflow-hidden">
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
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[#1d1d1d]">
                          {venueDetails?.name || event.venue?.name}
                        </p>
                        {venueAddress && (
                          <p className="text-sm text-[#717171]">{venueAddress}</p>
                        )}
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-[#f1f2f3] hover:bg-[#e8f7f7] text-[#1d1d1d] rounded text-sm font-medium transition-colors"
                      >
                        Open in Maps
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Venue Amenities */}
              {venueDetails?.amenities && venueDetails.amenities.length > 0 && (
                <Card className="mt-6">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold text-[#1d1d1d] mb-4">Venue Amenities</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {venueDetails.amenities.map((amenity, i) => (
                        <div key={i} className="flex items-center gap-2 text-[#717171]">
                          <svg className="w-5 h-5 text-[#6ac045]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {amenity}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Event Details Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <Card className="overflow-hidden">
                  {/* Header */}
                  <div className="border-b border-[#efefef] p-5">
                    <h3 className="text-lg font-bold text-[#1d1d1d]">Event Details</h3>
                  </div>

                  {/* Countdown Timer */}
                  <div className="p-5">
                    <CountdownTimer targetDate={event.startDate} />
                  </div>

                  <div className="px-5 pb-5 space-y-8">
                    {/* Organised by */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-[#e8f7f7] rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[#6ac045]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-[#717171] mb-1">Organised by</p>
                        <p className="text-base font-medium text-[#1d1d1d] mb-1">{promoter.name}</p>
                        <Link
                          href={`/p/${slug}`}
                          className="text-[#6ac045] text-sm font-medium hover:text-[#5aa038] transition-colors"
                        >
                          View Profile
                        </Link>
                      </div>
                    </div>

                    {/* Date and Time */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-[#e8f7f7] rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[#6ac045]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-[#717171] mb-1">Date and Time</p>
                        <p className="text-base font-medium text-[#1d1d1d] mb-2">
                          {formatDateTimeDisplay(event.startDate, event.startTime)}
                        </p>
                        {/* Add to Calendar Dropdown */}
                        <div className="relative group">
                          <button className="inline-flex items-center text-[#6ac045] text-sm font-medium hover:text-[#5aa038] transition-colors">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Add to Calendar
                          </button>
                          <div className="absolute top-full left-0 mt-2 bg-white border border-[#efefef] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[160px]">
                            <a href="#" className="flex items-center px-4 py-3 hover:bg-[#e8f7f7] text-[#1d1d1d] text-sm">
                              <svg className="w-4 h-4 mr-3 text-[#0078d4]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3 3h18v18H3V3m2 4v12h14V7H5z" />
                              </svg>
                              Outlook
                            </a>
                            <a href="#" className="flex items-center px-4 py-3 hover:bg-[#e8f7f7] text-[#1d1d1d] text-sm">
                              <svg className="w-4 h-4 mr-3 text-[#555555]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                              </svg>
                              Apple
                            </a>
                            <a href="#" className="flex items-center px-4 py-3 hover:bg-[#e8f7f7] text-[#1d1d1d] text-sm">
                              <svg className="w-4 h-4 mr-3 text-[#4285f4]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z" />
                              </svg>
                              Google
                            </a>
                            <a href="#" className="flex items-center px-4 py-3 hover:bg-[#e8f7f7] text-[#1d1d1d] text-sm">
                              <svg className="w-4 h-4 mr-3 text-[#6001d2]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19.62 3.66l.64-2.59L17.79.45l-.64 2.59A12.1 12.1 0 0012 2.17a12.2 12.2 0 00-5.15.87L6.21.45 3.74 1.07l.64 2.59A10.33 10.33 0 001.5 12c0 2.22.72 4.28 1.95 5.95l-.64 2.59 2.47.62.64-2.59c1.55.56 3.26.87 5.08.87s3.53-.31 5.08-.87l.64 2.59 2.47-.62-.64-2.59A10.4 10.4 0 0022.5 12c0-2.22-.72-4.28-1.95-5.95zM12 18.25c-3.45 0-6.25-2.8-6.25-6.25S8.55 5.75 12 5.75 18.25 8.55 18.25 12 15.45 18.25 12 18.25z" />
                              </svg>
                              Yahoo
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-[#e8f7f7] rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[#6ac045]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-[#717171] mb-1">Location</p>
                        {isOnlineEvent ? (
                          <p className="text-base font-medium text-[#1d1d1d]">Online</p>
                        ) : (
                          <>
                            <p className="text-base font-medium text-[#1d1d1d]">
                              {venueDetails?.name || event.venue?.name}
                            </p>
                            {venueAddress && (
                              <p className="text-sm text-[#717171] mt-1">{venueAddress}</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-[#e8f7f7] rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[#6ac045]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-[#717171] mb-1">
                          {event.pricing?.currency || 'USD'}
                        </p>
                        <p className="text-base font-medium text-[#1d1d1d]">
                          {formatPrice(event.pricing?.minPrice, event.pricing?.currency)}
                          {event.pricing?.maxPrice && event.pricing.maxPrice !== event.pricing.minPrice && (
                            <span> - {formatPrice(event.pricing.maxPrice, event.pricing.currency)}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Book Now Button */}
                  <div className="p-5 pt-0">
                    {event.isSoldOut ? (
                      <div className="w-full py-3 bg-gray-200 text-gray-500 text-center font-medium rounded">
                        Sold Out
                      </div>
                    ) : (
                      <Link href={`/p/${slug}/events/${event.slug || event.id}/checkout`} className="block">
                        <Button variant="primary" size="lg" className="w-full">
                          Book Now
                        </Button>
                      </Link>
                    )}

                    {event.ticketsAvailable !== undefined && event.ticketsAvailable > 0 && event.ticketsAvailable < 50 && (
                      <p className="text-center text-sm text-orange-500 font-medium mt-3">
                        Only {event.ticketsAvailable} tickets remaining!
                      </p>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* More Events Section */}
      {filteredMoreEvents.length > 0 && (
        <section className="py-12 bg-white border-t border-[#efefef]">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-[#1d1d1d]">More Events</h2>
              <Link
                href={`/p/${slug}/events`}
                className="text-[#1d1d1d] font-medium hover:text-[#6ac045] transition-colors inline-flex items-center"
              >
                Browse All
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMoreEvents.slice(0, 3).map((moreEvent) => (
                <EventCard
                  key={moreEvent.id}
                  id={moreEvent.id}
                  title={moreEvent.name}
                  slug={moreEvent.slug}
                  imageUrl={moreEvent.thumbnail || moreEvent.bannerImage}
                  startDate={moreEvent.startDate}
                  startTime={moreEvent.startTime}
                  endTime={moreEvent.endTime}
                  price={moreEvent.pricing?.minPrice}
                  currency={moreEvent.pricing?.currency}
                  venue={moreEvent.venue?.name}
                  isOnline={moreEvent.venue?.type === 'online'}
                  isSoldOut={moreEvent.isSoldOut}
                  promoterSlug={slug}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </Layout>
  )
}
