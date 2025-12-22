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
  date: string
  time?: string
  duration?: string
  price?: number | string
  currency?: string
  remaining?: number
  venue?: string
  isOnline?: boolean
  promoterSlug?: string
  className?: string
}

export function EventCard({
  id,
  title,
  slug,
  imageUrl,
  date,
  time,
  duration,
  price,
  currency = 'USD',
  remaining,
  venue,
  isOnline = false,
  promoterSlug,
  className,
}: EventCardProps) {
  const eventUrl = promoterSlug
    ? `/p/${promoterSlug}/events/${slug || id}`
    : `/events/${slug || id}`

  const formattedPrice =
    price === 0 || price === 'Free'
      ? 'Free'
      : typeof price === 'number'
      ? `${currency} $${price.toFixed(2)}`
      : price

  return (
    <div
      className={cn(
        'bg-white border-2 border-[#efefef] rounded-lg overflow-hidden',
        'transition-all duration-200 hover:shadow-[0px_2px_15px_-9px_rgba(0,0,0,0.1)]',
        'hover:border-[#6ac045]',
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

        {/* Online Badge */}
        {isOnline && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-[#6ac045] text-white text-xs font-medium rounded">
            Online Event
          </div>
        )}
      </div>

      {/* Event Content */}
      <div className="p-4">
        <Link href={eventUrl}>
          <h3 className="text-base font-semibold text-[#000] hover:text-[#6ac045] transition-colors line-clamp-2 mb-2">
            {title}
          </h3>
        </Link>

        {/* Price and Remaining */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[#6ac045] font-medium">{formattedPrice}</span>
          {remaining !== undefined && remaining > 0 && remaining < 20 && (
            <span className="text-sm text-[#717171] flex items-center">
              <svg
                className="w-4 h-4 mr-1 rotate-90"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z" />
              </svg>
              {remaining} Remaining
            </span>
          )}
        </div>
      </div>

      {/* Event Footer */}
      <div className="px-4 py-3 border-t border-[#efefef] bg-[#fafafa]">
        <div className="flex items-center justify-between text-sm text-[#717171]">
          <div className="flex items-center space-x-3">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              {date}
            </span>
            {time && (
              <>
                <span className="text-[#efefef]">•</span>
                <span>{time}</span>
              </>
            )}
          </div>
          {duration && (
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              {duration}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default EventCard
