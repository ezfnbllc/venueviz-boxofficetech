/**
 * EventCard Component
 * Based on Barren theme .main-card + .event-thumbnail + .event-content styles
 *
 * Used in event listings, grid displays
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

export interface EventCardProps {
  id: string
  title: string
  slug?: string
  imageUrl?: string
  // Schedule - accepts Date, ISO string, or timestamp for SSR compatibility
  startDate?: Date | string | number
  startTime?: string  // HH:mm format
  endTime?: string    // HH:mm format
  // Legacy string date (for backwards compatibility)
  date?: string
  time?: string
  duration?: string
  // Pricing
  price?: number | string
  currency?: string
  // Venue
  venue?: string
  location?: string
  // Status
  remaining?: number
  isOnline?: boolean
  isSoldOut?: boolean
  // Links
  promoterSlug?: string
  basePath?: string  // Base path for URLs (empty on custom domains)
  className?: string
}

/**
 * Format time from HH:mm to h:mm AM/PM format
 */
function formatTime(time?: string): string {
  if (!time) return ''
  const [hours, minutes] = time.split(':').map(Number)
  if (isNaN(hours)) return time
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}.${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Calculate duration between two times
 */
function calculateDuration(startTime?: string, endTime?: string): string {
  if (!startTime || !endTime) return ''
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  if (isNaN(startH) || isNaN(endH)) return ''

  let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM)
  if (diffMinutes < 0) diffMinutes += 24 * 60 // Handle next day

  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

/**
 * Parse date from various formats (Date object, ISO string, or timestamp)
 */
function parseDate(date?: Date | string | number): Date | null {
  if (!date) return null
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? null : date
  }
  if (typeof date === 'string' || typeof date === 'number') {
    const parsed = new Date(date)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

/**
 * Format date as "15 Apr Fri" using UTC to avoid hydration mismatches
 */
function formatDateShort(dateInput?: Date | string | number): string {
  const date = parseDate(dateInput)
  if (!date) return 'TBA'

  // Use UTC methods to ensure consistency between server and client
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const day = date.getUTCDate()
  const month = months[date.getUTCMonth()]
  const weekday = weekdays[date.getUTCDay()]

  return `${day} ${month} ${weekday}`
}

/**
 * Format price with currency symbol
 */
function formatPrice(price?: number | string, currency = 'USD'): string {
  if (price === undefined || price === null || price === 0 || price === 'Free') {
    return 'Free'
  }
  if (typeof price === 'string') return price

  // Get currency symbol
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  })
  const formatted = formatter.format(price)
  // Add currency code prefix for non-USD
  if (currency !== 'USD') {
    return `${currency} ${formatted}`
  }
  return formatted
}

export function EventCard({
  id,
  title,
  slug,
  imageUrl,
  startDate,
  startTime,
  endTime,
  date,
  time,
  duration,
  price,
  currency = 'USD',
  remaining,
  venue,
  location,
  isOnline = false,
  isSoldOut = false,
  promoterSlug,
  basePath,
  className,
}: EventCardProps) {
  // Build event URL - use basePath if provided, otherwise fall back to /p/[slug] pattern
  const effectiveBasePath = basePath !== undefined
    ? basePath
    : (promoterSlug ? `/p/${promoterSlug}` : '')
  const eventUrl = `${effectiveBasePath}/events/${slug || id}`

  // Format display values
  const displayDate = startDate ? formatDateShort(startDate) : date || 'TBA'
  const displayTime = startTime ? formatTime(startTime) : time || ''
  const displayDuration = duration || (startTime && endTime ? calculateDuration(startTime, endTime) : '')
  const displayPrice = formatPrice(price, currency)

  // Build combined date/time/duration string: "15 Apr Fri, 3.45 PM 1h"
  const dateTimeString = [displayDate, displayTime, displayDuration].filter(Boolean).join(', ')

  return (
    <div
      className={cn(
        'bg-white border-2 border-[#efefef] rounded-lg overflow-hidden',
        'transition-all duration-200 hover:shadow-[0px_2px_15px_-9px_rgba(0,0,0,0.1)]',
        'hover:border-[#6ac045]',
        isSoldOut && 'opacity-75',
        className
      )}
    >
      {/* Event Thumbnail */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <Link href={eventUrl} className="block w-full h-full">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full bg-[#f1f2f3] flex items-center justify-center">
              <svg
                className="w-12 h-12 text-[#717171]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </Link>

        {/* Bookmark Icon */}
        <button
          className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center
                     hover:bg-white transition-colors duration-200 shadow-sm"
          title="Bookmark"
        >
          <svg
            className="w-4 h-4 text-[#717171] hover:text-[#6ac045]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        </button>

        {/* Status Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {isOnline && (
            <div className="px-2 py-1 bg-[#6ac045] text-white text-xs font-medium rounded">
              Online Event
            </div>
          )}
          {isSoldOut && (
            <div className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
              Sold Out
            </div>
          )}
        </div>
      </div>

      {/* Event Content */}
      <div className="p-4">
        <Link href={eventUrl}>
          <h3 className="text-base font-semibold text-[#000] hover:text-[#6ac045] transition-colors line-clamp-2 mb-2">
            {title}
          </h3>
        </Link>

        {/* Venue */}
        {venue && (
          <div className="flex items-center text-sm text-[#717171] mb-2">
            <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{venue}</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between">
          <span className="text-[#6ac045] font-semibold">{displayPrice}*</span>
          {remaining !== undefined && remaining > 0 && remaining < 20 && (
            <span className="text-xs text-orange-500 font-medium">
              Only {remaining} left
            </span>
          )}
        </div>
      </div>

      {/* Event Footer - Date/Time */}
      <div className="px-4 py-3 border-t border-[#efefef] bg-[#fafafa]">
        <div className="flex items-center text-sm text-[#717171]">
          <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
              clipRule="evenodd"
            />
          </svg>
          <span>{dateTimeString}</span>
        </div>
      </div>
    </div>
  )
}

export default EventCard
