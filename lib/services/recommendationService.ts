import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const isBrowser = typeof window !== 'undefined'

export interface EventRecommendation {
  eventId: string
  eventName: string
  score: number
  reasons: string[]
  matchedFactors: RecommendationFactor[]
  confidence: number
  category: string
  date?: string
  venue?: string
  priceRange?: { min: number; max: number }
  imageUrl?: string
}

export interface RecommendationFactor {
  type: 'category' | 'venue' | 'artist' | 'price' | 'time' | 'popularity' | 'similar_attendees'
  weight: number
  value: string
  description: string
}

export interface CustomerPreferences {
  favoriteCategories: string[]
  priceRange: { min: number; max: number }
  preferredDays: string[]
  preferredTimes: string[]
  preferredVenues: string[]
  favoriteArtists: string[]
  location?: { lat: number; lng: number }
  maxDistance?: number
}

export interface SimilarEventsOptions {
  eventId: string
  limit?: number
  includeCompleted?: boolean
}

export interface TrendingEvent {
  eventId: string
  eventName: string
  trendScore: number
  salesVelocity: number
  remainingCapacity: number
  daysUntilEvent: number
  category: string
}

export class RecommendationService {

  // Get personalized recommendations for a customer
  static async getPersonalizedRecommendations(
    customerId: string,
    options?: { limit?: number; excludeEventIds?: string[] }
  ): Promise<EventRecommendation[]> {
    if (!isBrowser) return []

    try {
      // Fetch data
      const [events, orders, customers] = await Promise.all([
        this.fetchActiveEvents(),
        this.fetchOrders(),
        this.fetchCustomers()
      ])

      // Get customer data and order history
      const customer = customers.find(c => c.id === customerId || c.email === customerId)
      const customerOrders = orders.filter(o =>
        o.customerId === customerId ||
        o.customer?.email === customer?.email ||
        o.customerEmail === customer?.email
      )

      // Build customer preferences from history
      const preferences = this.buildCustomerPreferences(customerOrders, events)

      // Score each event
      const recommendations = events
        .filter(event => {
          // Exclude already purchased events
          const purchasedEventIds = customerOrders.map(o => o.eventId)
          if (purchasedEventIds.includes(event.id)) return false

          // Exclude specified events
          if (options?.excludeEventIds?.includes(event.id)) return false

          return true
        })
        .map(event => this.scoreEvent(event, preferences, orders))
        .filter(rec => rec.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, options?.limit || 10)

      return recommendations
    } catch (error) {
      console.error('[RecommendationService] Error getting recommendations:', error)
      return []
    }
  }

  // Get similar events to a given event
  static async getSimilarEvents(options: SimilarEventsOptions): Promise<EventRecommendation[]> {
    if (!isBrowser) return []

    try {
      const [events, orders] = await Promise.all([
        options.includeCompleted ? this.fetchAllEvents() : this.fetchActiveEvents(),
        this.fetchOrders()
      ])

      const targetEvent = events.find(e => e.id === options.eventId)
      if (!targetEvent) return []

      // Score similarity for each event
      const recommendations = events
        .filter(event => event.id !== options.eventId)
        .map(event => this.calculateSimilarity(targetEvent, event, orders))
        .filter(rec => rec.score > 0.2)
        .sort((a, b) => b.score - a.score)
        .slice(0, options.limit || 6)

      return recommendations
    } catch (error) {
      console.error('[RecommendationService] Error getting similar events:', error)
      return []
    }
  }

  // Get trending events
  static async getTrendingEvents(options?: {
    limit?: number
    category?: string
    promoterId?: string
  }): Promise<TrendingEvent[]> {
    if (!isBrowser) return []

    try {
      const [events, orders] = await Promise.all([
        this.fetchActiveEvents(),
        this.fetchOrders()
      ])

      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Calculate trending score for each event
      let trendingEvents = events
        .filter(event => {
          if (options?.category && event.category !== options.category) return false
          if (options?.promoterId && event.promoterId !== options.promoterId) return false
          return true
        })
        .map(event => {
          const eventOrders = orders.filter(o => o.eventId === event.id)
          const recentOrders = eventOrders.filter(o => {
            const orderDate = o.purchaseDate?.toDate?.() || o.createdAt?.toDate?.() || new Date(0)
            return orderDate >= sevenDaysAgo
          })

          // Calculate sales velocity (orders per day in last 7 days)
          const salesVelocity = recentOrders.length / 7

          // Calculate remaining capacity
          const ticketsSold = eventOrders.reduce((sum, o) =>
            sum + (o.tickets?.length || o.quantity || 1), 0
          )
          const capacity = event.capacity || event.totalCapacity || 1000
          const remainingCapacity = Math.max(0, capacity - ticketsSold)
          const fillRate = ticketsSold / capacity

          // Calculate days until event
          const eventDate = event.schedule?.date?.toDate?.() ||
                           new Date(event.schedule?.date || 0)
          const daysUntilEvent = Math.max(0, Math.ceil((eventDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))

          // Calculate trend score
          // Higher score for: high velocity, selling out soon, upcoming events
          let trendScore = 0
          trendScore += salesVelocity * 20 // Sales velocity weight
          trendScore += fillRate * 30 // Fill rate weight
          trendScore += daysUntilEvent > 0 && daysUntilEvent <= 30 ? (30 - daysUntilEvent) : 0 // Urgency weight

          return {
            eventId: event.id,
            eventName: event.name || 'Unnamed Event',
            trendScore: Math.round(trendScore * 10) / 10,
            salesVelocity: Math.round(salesVelocity * 100) / 100,
            remainingCapacity,
            daysUntilEvent,
            category: event.category || 'Other'
          }
        })
        .filter(e => e.trendScore > 0)
        .sort((a, b) => b.trendScore - a.trendScore)
        .slice(0, options?.limit || 10)

      return trendingEvents
    } catch (error) {
      console.error('[RecommendationService] Error getting trending events:', error)
      return []
    }
  }

  // Get "customers who bought this also bought" recommendations
  static async getAlsoBought(
    eventId: string,
    options?: { limit?: number }
  ): Promise<EventRecommendation[]> {
    if (!isBrowser) return []

    try {
      const [events, orders] = await Promise.all([
        this.fetchActiveEvents(),
        this.fetchOrders()
      ])

      // Find all customers who bought this event
      const eventOrders = orders.filter(o => o.eventId === eventId)
      const customerEmails = new Set(
        eventOrders.map(o =>
          (o.customer?.email || o.customerEmail || o.email || '').toLowerCase()
        ).filter(Boolean)
      )

      // Find other events these customers bought
      const alsoBoughtEvents: Record<string, { count: number; event: any }> = {}
      orders.forEach(order => {
        const email = (order.customer?.email || order.customerEmail || order.email || '').toLowerCase()
        if (!email || !customerEmails.has(email)) return
        if (order.eventId === eventId) return

        const event = events.find(e => e.id === order.eventId)
        if (!event) return

        if (!alsoBoughtEvents[order.eventId]) {
          alsoBoughtEvents[order.eventId] = { count: 0, event }
        }
        alsoBoughtEvents[order.eventId].count++
      })

      // Convert to recommendations
      const recommendations = Object.entries(alsoBoughtEvents)
        .map(([id, data]) => ({
          eventId: id,
          eventName: data.event.name || 'Unnamed Event',
          score: data.count / customerEmails.size, // Normalize by total customers
          reasons: [`${Math.round((data.count / customerEmails.size) * 100)}% of attendees also purchased`],
          matchedFactors: [{
            type: 'similar_attendees' as const,
            weight: 1,
            value: `${data.count} shared customers`,
            description: 'Customers who bought this also bought'
          }],
          confidence: Math.min(95, 50 + data.count * 5),
          category: data.event.category || 'Other',
          date: data.event.schedule?.date?.toDate?.()?.toISOString(),
          venue: data.event.venueName,
          imageUrl: data.event.images?.cover || data.event.coverImage
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, options?.limit || 6)

      return recommendations
    } catch (error) {
      console.error('[RecommendationService] Error getting also bought:', error)
      return []
    }
  }

  // Get category-based recommendations
  static async getCategoryRecommendations(
    category: string,
    options?: { limit?: number; excludeEventIds?: string[] }
  ): Promise<EventRecommendation[]> {
    if (!isBrowser) return []

    try {
      const [events, orders] = await Promise.all([
        this.fetchActiveEvents(),
        this.fetchOrders()
      ])

      const recommendations = events
        .filter(event => {
          if (event.category !== category) return false
          if (options?.excludeEventIds?.includes(event.id)) return false
          return true
        })
        .map(event => {
          const eventOrders = orders.filter(o => o.eventId === event.id)
          const revenue = eventOrders.reduce((sum, o) =>
            sum + (o.pricing?.total || o.totalAmount || o.total || 0), 0
          )

          return {
            eventId: event.id,
            eventName: event.name || 'Unnamed Event',
            score: revenue > 0 ? Math.log(revenue) / 10 : 0.1,
            reasons: [`Popular in ${category}`],
            matchedFactors: [{
              type: 'category' as const,
              weight: 1,
              value: category,
              description: `Matched category: ${category}`
            }],
            confidence: 70,
            category: event.category || 'Other',
            date: event.schedule?.date?.toDate?.()?.toISOString(),
            venue: event.venueName,
            priceRange: this.getEventPriceRange(event),
            imageUrl: event.images?.cover || event.coverImage
          }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, options?.limit || 10)

      return recommendations
    } catch (error) {
      console.error('[RecommendationService] Error getting category recommendations:', error)
      return []
    }
  }

  // Build customer preferences from order history
  private static buildCustomerPreferences(orders: any[], events: any[]): CustomerPreferences {
    const eventLookup: Record<string, any> = {}
    events.forEach(e => { eventLookup[e.id] = e })

    const categoryCount: Record<string, number> = {}
    const venueCount: Record<string, number> = {}
    const artistSet = new Set<string>()
    let minPrice = Infinity
    let maxPrice = 0
    const dayCount: Record<string, number> = {}
    const timeCount: Record<string, number> = {}

    orders.forEach(order => {
      const event = eventLookup[order.eventId]
      if (!event) return

      // Categories
      if (event.category) {
        categoryCount[event.category] = (categoryCount[event.category] || 0) + 1
      }

      // Venues
      if (event.venueName || event.venueId) {
        const venueKey = event.venueName || event.venueId
        venueCount[venueKey] = (venueCount[venueKey] || 0) + 1
      }

      // Artists/Performers
      if (event.performers) {
        event.performers.forEach((p: any) => {
          if (typeof p === 'string') artistSet.add(p)
          else if (p.name) artistSet.add(p.name)
        })
      }

      // Price range
      const price = order.pricing?.total || order.total || 0
      if (price > 0) {
        minPrice = Math.min(minPrice, price)
        maxPrice = Math.max(maxPrice, price)
      }

      // Day of week preference
      const eventDate = event.schedule?.date?.toDate?.() || new Date(event.schedule?.date || 0)
      const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][eventDate.getDay()]
      dayCount[day] = (dayCount[day] || 0) + 1

      // Time preference
      const hour = eventDate.getHours()
      const timeSlot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
      timeCount[timeSlot] = (timeCount[timeSlot] || 0) + 1
    })

    // Get top preferences
    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat)

    const topVenues = Object.entries(venueCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([venue]) => venue)

    const topDays = Object.entries(dayCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([day]) => day)

    const topTimes = Object.entries(timeCount)
      .sort((a, b) => b[1] - a[1])
      .map(([time]) => time)

    return {
      favoriteCategories: topCategories,
      priceRange: {
        min: minPrice === Infinity ? 0 : minPrice,
        max: maxPrice === 0 ? 1000 : maxPrice
      },
      preferredDays: topDays,
      preferredTimes: topTimes,
      preferredVenues: topVenues,
      favoriteArtists: Array.from(artistSet)
    }
  }

  // Score an event based on customer preferences
  private static scoreEvent(event: any, preferences: CustomerPreferences, allOrders: any[]): EventRecommendation {
    let score = 0
    const reasons: string[] = []
    const matchedFactors: RecommendationFactor[] = []

    // Category match (weight: 30%)
    if (preferences.favoriteCategories.includes(event.category)) {
      const categoryScore = 0.3
      score += categoryScore
      reasons.push(`Matches your interest in ${event.category}`)
      matchedFactors.push({
        type: 'category',
        weight: categoryScore,
        value: event.category,
        description: `You've attended ${event.category} events before`
      })
    }

    // Venue match (weight: 20%)
    if (preferences.preferredVenues.includes(event.venueName || event.venueId)) {
      const venueScore = 0.2
      score += venueScore
      reasons.push(`At a venue you've visited before`)
      matchedFactors.push({
        type: 'venue',
        weight: venueScore,
        value: event.venueName || event.venueId,
        description: 'You\'ve been to this venue'
      })
    }

    // Artist/Performer match (weight: 25%)
    if (event.performers) {
      const performers = event.performers.map((p: any) =>
        typeof p === 'string' ? p : p.name
      ).filter(Boolean)

      const matchedArtists = performers.filter((a: string) =>
        preferences.favoriteArtists.includes(a)
      )

      if (matchedArtists.length > 0) {
        const artistScore = 0.25 * (matchedArtists.length / performers.length)
        score += artistScore
        reasons.push(`Features artists you've seen: ${matchedArtists.join(', ')}`)
        matchedFactors.push({
          type: 'artist',
          weight: artistScore,
          value: matchedArtists.join(', '),
          description: 'You\'ve seen these performers before'
        })
      }
    }

    // Price range match (weight: 15%)
    const eventPriceRange = this.getEventPriceRange(event)
    if (eventPriceRange) {
      const avgEventPrice = (eventPriceRange.min + eventPriceRange.max) / 2
      const avgPreferredPrice = (preferences.priceRange.min + preferences.priceRange.max) / 2

      if (avgEventPrice <= preferences.priceRange.max * 1.2) {
        const priceScore = 0.15 * Math.max(0, 1 - Math.abs(avgEventPrice - avgPreferredPrice) / avgPreferredPrice)
        score += priceScore
        matchedFactors.push({
          type: 'price',
          weight: priceScore,
          value: `$${eventPriceRange.min} - $${eventPriceRange.max}`,
          description: 'Within your typical price range'
        })
      }
    }

    // Day/Time preference (weight: 10%)
    const eventDate = event.schedule?.date?.toDate?.() || new Date(event.schedule?.date || 0)
    const eventDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][eventDate.getDay()]
    const eventHour = eventDate.getHours()
    const eventTimeSlot = eventHour < 12 ? 'morning' : eventHour < 17 ? 'afternoon' : 'evening'

    if (preferences.preferredDays.includes(eventDay)) {
      score += 0.05
      matchedFactors.push({
        type: 'time',
        weight: 0.05,
        value: eventDay,
        description: `Scheduled on ${eventDay}, your preferred day`
      })
    }

    if (preferences.preferredTimes.includes(eventTimeSlot)) {
      score += 0.05
      matchedFactors.push({
        type: 'time',
        weight: 0.05,
        value: eventTimeSlot,
        description: `Scheduled in the ${eventTimeSlot}, your preferred time`
      })
    }

    // Popularity boost (up to 10% bonus)
    const eventOrders = allOrders.filter(o => o.eventId === event.id)
    if (eventOrders.length > 10) {
      const popularityScore = Math.min(0.1, eventOrders.length / 100)
      score += popularityScore
      matchedFactors.push({
        type: 'popularity',
        weight: popularityScore,
        value: `${eventOrders.length} tickets sold`,
        description: 'Popular event with high sales'
      })
    }

    // Calculate confidence based on number of matched factors
    const confidence = Math.min(95, 50 + matchedFactors.length * 10)

    return {
      eventId: event.id,
      eventName: event.name || 'Unnamed Event',
      score: Math.round(score * 100) / 100,
      reasons,
      matchedFactors,
      confidence,
      category: event.category || 'Other',
      date: eventDate.toISOString(),
      venue: event.venueName,
      priceRange: eventPriceRange,
      imageUrl: event.images?.cover || event.coverImage
    }
  }

  // Calculate similarity between two events
  private static calculateSimilarity(event1: any, event2: any, orders: any[]): EventRecommendation {
    let similarity = 0
    const reasons: string[] = []
    const matchedFactors: RecommendationFactor[] = []

    // Same category (40% weight)
    if (event1.category && event1.category === event2.category) {
      similarity += 0.4
      reasons.push(`Same category: ${event1.category}`)
      matchedFactors.push({
        type: 'category',
        weight: 0.4,
        value: event1.category,
        description: 'Matching category'
      })
    }

    // Same venue (20% weight)
    if (event1.venueId && event1.venueId === event2.venueId) {
      similarity += 0.2
      reasons.push('Same venue')
      matchedFactors.push({
        type: 'venue',
        weight: 0.2,
        value: event1.venueName || event1.venueId,
        description: 'Same venue'
      })
    }

    // Shared performers (25% weight)
    if (event1.performers && event2.performers) {
      const performers1 = new Set(
        event1.performers.map((p: any) => (typeof p === 'string' ? p : p.name).toLowerCase())
      )
      const performers2 = event2.performers.map((p: any) =>
        (typeof p === 'string' ? p : p.name).toLowerCase()
      )

      const sharedPerformers = performers2.filter((p: string) => performers1.has(p))
      if (sharedPerformers.length > 0) {
        const artistSimilarity = 0.25 * (sharedPerformers.length / Math.max(performers1.size, performers2.length))
        similarity += artistSimilarity
        reasons.push(`Shared performers: ${sharedPerformers.length}`)
        matchedFactors.push({
          type: 'artist',
          weight: artistSimilarity,
          value: sharedPerformers.join(', '),
          description: 'Shared performers'
        })
      }
    }

    // Similar price range (15% weight)
    const price1 = this.getEventPriceRange(event1)
    const price2 = this.getEventPriceRange(event2)
    if (price1 && price2) {
      const avgPrice1 = (price1.min + price1.max) / 2
      const avgPrice2 = (price2.min + price2.max) / 2
      const priceDiff = Math.abs(avgPrice1 - avgPrice2) / Math.max(avgPrice1, avgPrice2)

      if (priceDiff < 0.3) {
        const priceSimilarity = 0.15 * (1 - priceDiff)
        similarity += priceSimilarity
        matchedFactors.push({
          type: 'price',
          weight: priceSimilarity,
          value: `$${price2.min} - $${price2.max}`,
          description: 'Similar price range'
        })
      }
    }

    const confidence = Math.min(95, 50 + matchedFactors.length * 15)

    return {
      eventId: event2.id,
      eventName: event2.name || 'Unnamed Event',
      score: Math.round(similarity * 100) / 100,
      reasons,
      matchedFactors,
      confidence,
      category: event2.category || 'Other',
      date: event2.schedule?.date?.toDate?.()?.toISOString(),
      venue: event2.venueName,
      priceRange: price2,
      imageUrl: event2.images?.cover || event2.coverImage
    }
  }

  // Get price range for an event
  private static getEventPriceRange(event: any): { min: number; max: number } | undefined {
    if (event.pricing?.tiers) {
      const prices = event.pricing.tiers
        .flatMap((tier: any) => Object.values(tier.prices || {}))
        .filter((p: any) => typeof p === 'number' && p > 0)

      if (prices.length > 0) {
        return {
          min: Math.min(...prices),
          max: Math.max(...prices)
        }
      }
    }

    if (event.ticketPrice || event.price) {
      const price = event.ticketPrice || event.price
      return { min: price, max: price }
    }

    return undefined
  }

  // Data fetchers
  private static async fetchActiveEvents(): Promise<any[]> {
    try {
      const eventsRef = collection(db, 'events')
      const snapshot = await getDocs(eventsRef)
      const now = new Date()

      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(event => {
          const eventDate = event.schedule?.date?.toDate?.() ||
                           new Date(event.schedule?.date || 0)
          return eventDate > now
        })
    } catch (error) {
      console.error('[RecommendationService] Error fetching events:', error)
      return []
    }
  }

  private static async fetchAllEvents(): Promise<any[]> {
    try {
      const eventsRef = collection(db, 'events')
      const snapshot = await getDocs(eventsRef)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('[RecommendationService] Error fetching events:', error)
      return []
    }
  }

  private static async fetchOrders(): Promise<any[]> {
    try {
      const ordersRef = collection(db, 'orders')
      const snapshot = await getDocs(ordersRef)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('[RecommendationService] Error fetching orders:', error)
      return []
    }
  }

  private static async fetchCustomers(): Promise<any[]> {
    try {
      const customersRef = collection(db, 'customers')
      const snapshot = await getDocs(customersRef)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('[RecommendationService] Error fetching customers:', error)
      return []
    }
  }
}

export default RecommendationService
