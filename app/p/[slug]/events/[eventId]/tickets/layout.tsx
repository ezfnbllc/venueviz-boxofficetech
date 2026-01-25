/**
 * Tickets Page Layout
 * Provides server-side metadata for SEO since the page is a client component
 */

import { Metadata } from 'next'
import { getPromoterBySlug, getEventBySlugOrId } from '@/lib/public/publicService'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ slug: string; eventId: string }>
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { slug, eventId } = await params
  const [promoter, event] = await Promise.all([
    getPromoterBySlug(slug),
    getEventBySlugOrId(eventId),
  ])

  if (!promoter || !event) {
    return {
      title: 'Select Tickets',
    }
  }

  const title = `Buy Tickets - ${event.name} | ${promoter.name}`
  const description = `Select tickets for ${event.name}. ${event.venue?.name ? `At ${event.venue.name}` : ''} ${event.startDate ? `on ${new Date(event.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}. Secure checkout powered by ${promoter.name}.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: event.bannerImage || event.thumbnail ? [event.bannerImage || event.thumbnail!] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: event.bannerImage || event.thumbnail ? [event.bannerImage || event.thumbnail!] : [],
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default function TicketsLayout({ children }: LayoutProps) {
  return children
}
