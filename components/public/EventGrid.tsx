/**
 * EventGrid Component
 * Grid layout for displaying event cards
 *
 * Based on Barren theme event grid layout
 */

import { cn } from '@/lib/utils'
import { EventCard, EventCardProps } from './EventCard'

export interface EventGridProps {
  events: EventCardProps[]
  columns?: 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
  promoterSlug?: string
  emptyMessage?: string
  className?: string
}

export function EventGrid({
  events,
  columns = 4,
  gap = 'md',
  promoterSlug,
  emptyMessage = 'No events found',
  className,
}: EventGridProps) {
  const columnClasses = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }

  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-16">
        <svg
          className="w-16 h-16 mx-auto text-[#efefef] mb-4"
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
        <p className="text-[#717171] text-lg">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid',
        columnClasses[columns],
        gapClasses[gap],
        className
      )}
    >
      {events.map((event) => (
        <EventCard
          key={event.id}
          {...event}
          promoterSlug={promoterSlug || event.promoterSlug}
        />
      ))}
    </div>
  )
}

export default EventGrid
