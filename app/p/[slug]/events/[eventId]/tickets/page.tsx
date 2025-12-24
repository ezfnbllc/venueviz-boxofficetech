'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Layout from '@/components/public/Layout'
import { useCart } from '@/lib/stores/cartStore'

interface TicketType {
  id: string
  name: string
  description?: string
  price: number
  available: number
  maxPerOrder: number
}

interface EventData {
  id: string
  name: string
  slug?: string
  thumbnail?: string
  bannerImage?: string
  startDate: string
  startTime?: string
  venue?: {
    name?: string
    city?: string
    state?: string
  }
  pricing?: {
    currency?: string
    minPrice?: number
    maxPrice?: number
  }
  ticketTypes?: TicketType[]
  isSoldOut?: boolean
}

export default function TicketSelectionPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const eventId = params.eventId as string

  const { addItem, items, clearCart, setCurrentEvent, calculateSubtotal, getItemCount } = useCart()

  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [isClient, setIsClient] = useState(false)

  // Handle hydration
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`)
        if (!res.ok) throw new Error('Event not found')
        const data = await res.json()
        setEvent(data)

        // Initialize quantities to 0
        const initialQuantities: Record<string, number> = {}
        data.ticketTypes?.forEach((type: TicketType) => {
          initialQuantities[type.id] = 0
        })
        setQuantities(initialQuantities)
      } catch (error) {
        console.error('Error fetching event:', error)
        // Create mock data if API fails
        setEvent({
          id: eventId,
          name: 'Event',
          startDate: new Date().toISOString(),
          ticketTypes: [
            { id: 'ga', name: 'General Admission', price: 25, available: 100, maxPerOrder: 10 },
            { id: 'vip', name: 'VIP', description: 'Includes early entry and meet & greet', price: 75, available: 50, maxPerOrder: 4 },
          ],
        })
        setQuantities({ ga: 0, vip: 0 })
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [eventId])

  const updateQuantity = (ticketId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[ticketId] || 0
      const ticketType = event?.ticketTypes?.find(t => t.id === ticketId)
      const max = ticketType?.maxPerOrder || 10
      const newValue = Math.max(0, Math.min(max, current + delta))
      return { ...prev, [ticketId]: newValue }
    })
  }

  const handleAddToCart = () => {
    if (!event) return

    // Clear existing cart first
    clearCart()

    // Set current event context
    setCurrentEvent({
      eventId: event.id,
      eventName: event.name,
      eventImage: event.bannerImage || event.thumbnail,
      eventDate: formatDate(event.startDate, event.startTime),
      venueName: event.venue?.name,
      promoterSlug: slug,
    })

    // Add selected tickets to cart
    Object.entries(quantities).forEach(([ticketId, quantity]) => {
      if (quantity > 0) {
        const ticketType = event.ticketTypes?.find(t => t.id === ticketId)
        if (ticketType) {
          addItem({
            id: `${event.id}-${ticketId}-${Date.now()}`,
            type: 'ticket',
            eventId: event.id,
            eventName: event.name,
            eventImage: event.bannerImage || event.thumbnail,
            eventDate: formatDate(event.startDate, event.startTime),
            venueName: event.venue?.name,
            ticketType: ticketType.name,
            price: ticketType.price,
            quantity,
          })
        }
      }
    })

    // Navigate to checkout
    router.push(`/p/${slug}/checkout`)
  }

  const formatDate = (dateStr: string, time?: string): string => {
    const date = new Date(dateStr)
    const formatted = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    if (time) {
      const [hours, minutes] = time.split(':').map(Number)
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours % 12 || 12
      return `${formatted} ${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
    }
    return formatted
  }

  const getTotalQuantity = () => {
    return Object.values(quantities).reduce((sum, q) => sum + q, 0)
  }

  const getTotalPrice = () => {
    return Object.entries(quantities).reduce((sum, [ticketId, quantity]) => {
      const ticketType = event?.ticketTypes?.find(t => t.id === ticketId)
      return sum + (ticketType?.price || 0) * quantity
    }, 0)
  }

  if (!isClient || loading) {
    return (
      <Layout promoterSlug={slug}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6ac045]"></div>
        </div>
      </Layout>
    )
  }

  if (!event) {
    return (
      <Layout promoterSlug={slug}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h2>
            <Link href={`/p/${slug}/events`} className="text-[#6ac045] hover:underline">
              Browse Events
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout promoterSlug={slug}>
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <nav aria-label="breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <Link href={`/p/${slug}`} className="text-gray-600 hover:text-[#6ac045]">
                  Home
                </Link>
              </li>
              <li className="text-gray-400">/</li>
              <li>
                <Link href={`/p/${slug}/events`} className="text-gray-600 hover:text-[#6ac045]">
                  Events
                </Link>
              </li>
              <li className="text-gray-400">/</li>
              <li>
                <Link href={`/p/${slug}/events/${eventId}`} className="text-gray-600 hover:text-[#6ac045] truncate max-w-[150px]">
                  {event.name}
                </Link>
              </li>
              <li className="text-gray-400">/</li>
              <li className="text-gray-900 font-medium">Select Tickets</li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Event Banner */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 relative overflow-hidden">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-6">
            {/* Event Image */}
            {(event.bannerImage || event.thumbnail) && (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden flex-shrink-0 shadow-lg">
                <img
                  src={event.bannerImage || event.thumbnail}
                  alt={event.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {/* Event Info */}
            <div className="flex-1 text-white">
              <h1 className="text-xl md:text-2xl font-bold mb-2 line-clamp-2">{event.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm md:text-base text-gray-300">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-[#6ac045]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(event.startDate, event.startTime)}
                </span>
                {event.venue?.name && (
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-[#6ac045]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {event.venue.name}
                    {event.venue.city && `, ${event.venue.city}`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Ticket Selection */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Select Tickets</h2>

              {event.isSoldOut ? (
                <div className="main-card p-8 text-center">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Sold Out</h2>
                  <p className="text-gray-600">Sorry, tickets for this event are no longer available.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {event.ticketTypes?.map((ticketType) => (
                    <div
                      key={ticketType.id}
                      className="main-card p-6 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{ticketType.name}</h3>
                        {ticketType.description && (
                          <p className="text-sm text-gray-600 mt-1">{ticketType.description}</p>
                        )}
                        <p className="text-lg font-bold text-[#6ac045] mt-2">
                          ${ticketType.price.toFixed(2)}
                        </p>
                        {ticketType.available < 20 && (
                          <p className="text-sm text-orange-500 mt-1">
                            Only {ticketType.available} left!
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(ticketType.id, -1)}
                          disabled={quantities[ticketType.id] === 0}
                          className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>

                        <span className="w-12 text-center text-lg font-semibold">
                          {quantities[ticketType.id] || 0}
                        </span>

                        <button
                          onClick={() => updateQuantity(ticketType.id, 1)}
                          disabled={quantities[ticketType.id] >= ticketType.maxPerOrder}
                          className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <div className="main-card">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
                  </div>

                  <div className="p-6">
                    {/* Event Info */}
                    <div className="flex gap-4 mb-6">
                      {(event.bannerImage || event.thumbnail) && (
                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={event.bannerImage || event.thumbnail}
                            alt={event.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{event.name}</h3>
                        <p className="text-sm text-gray-600">{formatDate(event.startDate, event.startTime)}</p>
                        {event.venue?.name && (
                          <p className="text-sm text-[#6ac045] mt-1">{event.venue.name}</p>
                        )}
                      </div>
                    </div>

                    {/* Selected Tickets */}
                    {getTotalQuantity() > 0 && (
                      <div className="space-y-2 mb-6 pb-6 border-b border-gray-100">
                        {Object.entries(quantities).map(([ticketId, quantity]) => {
                          if (quantity === 0) return null
                          const ticketType = event.ticketTypes?.find(t => t.id === ticketId)
                          if (!ticketType) return null
                          return (
                            <div key={ticketId} className="flex justify-between text-sm">
                              <span className="text-gray-600">
                                {ticketType.name} x{quantity}
                              </span>
                              <span className="font-medium">
                                ${(ticketType.price * quantity).toFixed(2)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex justify-between font-semibold text-lg mb-6">
                      <span>Total</span>
                      <span className="text-[#6ac045]">${getTotalPrice().toFixed(2)}</span>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={handleAddToCart}
                      disabled={getTotalQuantity() === 0}
                      className="main-btn btn-hover h-12 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {getTotalQuantity() === 0 ? 'Select Tickets' : `Checkout (${getTotalQuantity()} tickets)`}
                    </button>

                    <p className="text-xs text-gray-500 mt-4 text-center">
                      Price shown excludes service fees
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </Layout>
  )
}
