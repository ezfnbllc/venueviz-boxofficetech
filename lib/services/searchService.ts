import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const isBrowser = typeof window !== 'undefined'

export interface SearchQuery {
  q: string
  type?: SearchType | SearchType[]
  filters?: SearchFilters
  sort?: { field: string; direction: 'asc' | 'desc' }
  limit?: number
  offset?: number
  fuzzy?: boolean
  semantic?: boolean
}

export type SearchType = 'event' | 'venue' | 'customer' | 'order' | 'promoter' | 'all'

export interface SearchFilters {
  category?: string[]
  status?: string[]
  dateRange?: { start: Date; end: Date }
  priceRange?: { min: number; max: number }
  venueId?: string[]
  promoterId?: string[]
  tags?: string[]
}

export interface SearchResult {
  id: string
  type: SearchType
  title: string
  subtitle?: string
  description?: string
  relevanceScore: number
  matchedFields: string[]
  highlights: { field: string; snippet: string }[]
  data: any
}

export interface SearchResponse {
  results: SearchResult[]
  totalCount: number
  query: string
  searchTime: number
  suggestions?: string[]
  facets?: SearchFacets
}

export interface SearchFacets {
  categories: { name: string; count: number }[]
  venues: { name: string; count: number }[]
  status: { name: string; count: number }[]
  priceRanges: { range: string; count: number }[]
}

export interface SearchSuggestion {
  text: string
  type: 'query' | 'category' | 'venue' | 'event'
  score: number
}

export class SearchService {

  // Main search method
  static async search(searchQuery: SearchQuery): Promise<SearchResponse> {
    if (!isBrowser) return this.emptyResponse(searchQuery.q)

    const startTime = Date.now()

    try {
      const types = Array.isArray(searchQuery.type)
        ? searchQuery.type
        : searchQuery.type
          ? [searchQuery.type]
          : ['event', 'venue', 'customer', 'order', 'promoter'] as SearchType[]

      // Fetch and search all types in parallel
      const searchPromises = types.map(type => this.searchByType(type, searchQuery))
      const resultsArrays = await Promise.all(searchPromises)

      // Combine and sort all results
      let allResults = resultsArrays.flat()

      // Sort by relevance
      allResults.sort((a, b) => b.relevanceScore - a.relevanceScore)

      // Apply offset and limit
      const offset = searchQuery.offset || 0
      const limit = searchQuery.limit || 50
      const paginatedResults = allResults.slice(offset, offset + limit)

      // Generate facets
      const facets = this.generateFacets(allResults)

      // Generate suggestions if few results
      const suggestions = allResults.length < 5
        ? await this.generateSuggestions(searchQuery.q)
        : undefined

      return {
        results: paginatedResults,
        totalCount: allResults.length,
        query: searchQuery.q,
        searchTime: Date.now() - startTime,
        suggestions,
        facets
      }
    } catch (error) {
      console.error('[SearchService] Error searching:', error)
      return this.emptyResponse(searchQuery.q)
    }
  }

  // Quick search for autocomplete
  static async quickSearch(q: string, limit: number = 10): Promise<SearchResult[]> {
    const response = await this.search({
      q,
      limit,
      fuzzy: true
    })
    return response.results
  }

  // Get search suggestions
  static async getSuggestions(q: string): Promise<SearchSuggestion[]> {
    return this.generateSuggestions(q)
  }

  // Search by specific type
  private static async searchByType(type: SearchType, query: SearchQuery): Promise<SearchResult[]> {
    switch (type) {
      case 'event':
        return this.searchEvents(query)
      case 'venue':
        return this.searchVenues(query)
      case 'customer':
        return this.searchCustomers(query)
      case 'order':
        return this.searchOrders(query)
      case 'promoter':
        return this.searchPromoters(query)
      default:
        return []
    }
  }

  // Search events
  private static async searchEvents(query: SearchQuery): Promise<SearchResult[]> {
    const events = await this.fetchEvents()
    const results: SearchResult[] = []

    const searchTerms = this.tokenize(query.q)

    events.forEach(event => {
      // Apply filters
      if (query.filters) {
        if (query.filters.category?.length && !query.filters.category.includes(event.category)) return
        if (query.filters.status?.length && !query.filters.status.includes(event.status)) return
        if (query.filters.venueId?.length && !query.filters.venueId.includes(event.venueId)) return
        if (query.filters.promoterId?.length && !query.filters.promoterId.includes(event.promoterId)) return
      }

      // Calculate relevance
      const { score, matchedFields, highlights } = this.calculateRelevance(searchTerms, {
        name: event.name || '',
        description: event.description || '',
        category: event.category || '',
        venueName: event.venueName || '',
        tags: (event.tags || []).join(' '),
        performers: (event.performers || []).map((p: any) => p.name || p).join(' ')
      }, query.fuzzy)

      if (score > 0) {
        results.push({
          id: event.id,
          type: 'event',
          title: event.name || 'Unnamed Event',
          subtitle: event.venueName || 'No venue',
          description: event.description?.substring(0, 150),
          relevanceScore: score,
          matchedFields,
          highlights,
          data: event
        })
      }
    })

    return results
  }

  // Search venues
  private static async searchVenues(query: SearchQuery): Promise<SearchResult[]> {
    const venues = await this.fetchVenues()
    const results: SearchResult[] = []

    const searchTerms = this.tokenize(query.q)

    venues.forEach(venue => {
      const { score, matchedFields, highlights } = this.calculateRelevance(searchTerms, {
        name: venue.name || '',
        address: venue.address || '',
        city: venue.city || '',
        description: venue.description || '',
        amenities: (venue.amenities || []).join(' ')
      }, query.fuzzy)

      if (score > 0) {
        results.push({
          id: venue.id,
          type: 'venue',
          title: venue.name || 'Unnamed Venue',
          subtitle: venue.city || venue.address,
          description: venue.description?.substring(0, 150),
          relevanceScore: score,
          matchedFields,
          highlights,
          data: venue
        })
      }
    })

    return results
  }

  // Search customers
  private static async searchCustomers(query: SearchQuery): Promise<SearchResult[]> {
    const orders = await this.fetchOrders()
    const results: SearchResult[] = []

    // Build unique customer list from orders
    const customerMap: Record<string, any> = {}
    orders.forEach(order => {
      const email = (order.customer?.email || order.customerEmail || '').toLowerCase()
      if (!email) return

      if (!customerMap[email]) {
        customerMap[email] = {
          id: email,
          email,
          name: order.customer?.name || order.customerName || 'Unknown',
          phone: order.customer?.phone || order.customerPhone,
          orderCount: 0,
          totalSpent: 0
        }
      }
      customerMap[email].orderCount++
      customerMap[email].totalSpent += order.pricing?.total || order.total || 0
    })

    const searchTerms = this.tokenize(query.q)

    Object.values(customerMap).forEach((customer: any) => {
      const { score, matchedFields, highlights } = this.calculateRelevance(searchTerms, {
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || ''
      }, query.fuzzy)

      if (score > 0) {
        results.push({
          id: customer.id,
          type: 'customer',
          title: customer.name,
          subtitle: customer.email,
          description: `${customer.orderCount} orders - $${customer.totalSpent.toFixed(2)}`,
          relevanceScore: score,
          matchedFields,
          highlights,
          data: customer
        })
      }
    })

    return results
  }

  // Search orders
  private static async searchOrders(query: SearchQuery): Promise<SearchResult[]> {
    const orders = await this.fetchOrders()
    const events = await this.fetchEvents()
    const eventMap: Record<string, any> = {}
    events.forEach(e => { eventMap[e.id] = e })

    const results: SearchResult[] = []
    const searchTerms = this.tokenize(query.q)

    orders.forEach(order => {
      const event = eventMap[order.eventId]

      // Apply date filter
      if (query.filters?.dateRange) {
        const orderDate = order.purchaseDate?.toDate?.() || order.createdAt?.toDate?.()
        if (orderDate) {
          if (orderDate < query.filters.dateRange.start) return
          if (orderDate > query.filters.dateRange.end) return
        }
      }

      const { score, matchedFields, highlights } = this.calculateRelevance(searchTerms, {
        orderId: order.id || '',
        customerName: order.customer?.name || order.customerName || '',
        customerEmail: order.customer?.email || order.customerEmail || '',
        eventName: event?.name || order.eventName || '',
        transactionId: order.transactionId || ''
      }, query.fuzzy)

      if (score > 0) {
        results.push({
          id: order.id,
          type: 'order',
          title: `Order ${order.id.substring(0, 8)}`,
          subtitle: order.customer?.name || order.customerName,
          description: `${event?.name || 'Unknown Event'} - $${order.pricing?.total || order.total || 0}`,
          relevanceScore: score,
          matchedFields,
          highlights,
          data: order
        })
      }
    })

    return results
  }

  // Search promoters
  private static async searchPromoters(query: SearchQuery): Promise<SearchResult[]> {
    const promoters = await this.fetchPromoters()
    const results: SearchResult[] = []

    const searchTerms = this.tokenize(query.q)

    promoters.forEach(promoter => {
      const { score, matchedFields, highlights } = this.calculateRelevance(searchTerms, {
        name: promoter.name || '',
        companyName: promoter.companyName || '',
        email: promoter.email || '',
        phone: promoter.phone || ''
      }, query.fuzzy)

      if (score > 0) {
        results.push({
          id: promoter.id,
          type: 'promoter',
          title: promoter.name || promoter.companyName || 'Unknown',
          subtitle: promoter.email,
          description: promoter.companyName,
          relevanceScore: score,
          matchedFields,
          highlights,
          data: promoter
        })
      }
    })

    return results
  }

  // Calculate relevance score
  private static calculateRelevance(
    searchTerms: string[],
    fields: Record<string, string>,
    fuzzy: boolean = false
  ): { score: number; matchedFields: string[]; highlights: { field: string; snippet: string }[] } {
    let totalScore = 0
    const matchedFields: string[] = []
    const highlights: { field: string; snippet: string }[] = []

    // Field weights
    const fieldWeights: Record<string, number> = {
      name: 10,
      title: 10,
      email: 8,
      description: 5,
      category: 7,
      tags: 6,
      performers: 7,
      venueName: 6,
      address: 4,
      city: 5,
      companyName: 8,
      orderId: 9,
      transactionId: 9,
      customerName: 7,
      customerEmail: 7,
      phone: 5,
      amenities: 4
    }

    Object.entries(fields).forEach(([fieldName, fieldValue]) => {
      if (!fieldValue) return

      const normalizedField = fieldValue.toLowerCase()
      const weight = fieldWeights[fieldName] || 1

      searchTerms.forEach(term => {
        let matched = false
        let matchScore = 0

        // Exact match
        if (normalizedField.includes(term)) {
          matched = true
          matchScore = term.length / normalizedField.length * 10

          // Bonus for start match
          if (normalizedField.startsWith(term)) {
            matchScore *= 1.5
          }
        }
        // Fuzzy match
        else if (fuzzy && this.fuzzyMatch(term, normalizedField)) {
          matched = true
          matchScore = 3
        }

        if (matched) {
          totalScore += matchScore * weight

          if (!matchedFields.includes(fieldName)) {
            matchedFields.push(fieldName)

            // Create highlight snippet
            const termIndex = normalizedField.indexOf(term)
            if (termIndex >= 0) {
              const start = Math.max(0, termIndex - 20)
              const end = Math.min(fieldValue.length, termIndex + term.length + 20)
              const snippet = (start > 0 ? '...' : '') +
                             fieldValue.substring(start, end) +
                             (end < fieldValue.length ? '...' : '')
              highlights.push({ field: fieldName, snippet })
            }
          }
        }
      })
    })

    return { score: Math.round(totalScore * 10) / 10, matchedFields, highlights }
  }

  // Fuzzy match using Levenshtein distance
  private static fuzzyMatch(term: string, text: string, threshold: number = 0.7): boolean {
    if (term.length < 3) return false

    const words = text.split(/\s+/)

    for (const word of words) {
      if (word.length < term.length - 2) continue

      const distance = this.levenshteinDistance(term, word)
      const maxLength = Math.max(term.length, word.length)
      const similarity = 1 - distance / maxLength

      if (similarity >= threshold) return true
    }

    return false
  }

  // Levenshtein distance calculation
  private static levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[b.length][a.length]
  }

  // Tokenize search query
  private static tokenize(q: string): string[] {
    return q.toLowerCase()
      .split(/\s+/)
      .filter(term => term.length >= 2)
      .map(term => term.replace(/[^\w]/g, ''))
  }

  // Generate search suggestions
  private static async generateSuggestions(q: string): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = []

    const [events, venues] = await Promise.all([
      this.fetchEvents(),
      this.fetchVenues()
    ])

    const searchTerms = this.tokenize(q)

    // Event name suggestions
    events.forEach(event => {
      if (!event.name) return
      const name = event.name.toLowerCase()
      const match = searchTerms.some(t => name.includes(t) || this.fuzzyMatch(t, name))

      if (match) {
        suggestions.push({
          text: event.name,
          type: 'event',
          score: 10
        })
      }
    })

    // Category suggestions
    const categories = [...new Set(events.map(e => e.category).filter(Boolean))]
    categories.forEach(cat => {
      const catLower = cat.toLowerCase()
      const match = searchTerms.some(t => catLower.includes(t))

      if (match) {
        suggestions.push({
          text: cat,
          type: 'category',
          score: 8
        })
      }
    })

    // Venue suggestions
    venues.forEach(venue => {
      if (!venue.name) return
      const name = venue.name.toLowerCase()
      const match = searchTerms.some(t => name.includes(t))

      if (match) {
        suggestions.push({
          text: venue.name,
          type: 'venue',
          score: 7
        })
      }
    })

    // Sort and dedupe
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }

  // Generate facets from results
  private static generateFacets(results: SearchResult[]): SearchFacets {
    const categoryCount: Record<string, number> = {}
    const venueCount: Record<string, number> = {}
    const statusCount: Record<string, number> = {}

    results.forEach(result => {
      if (result.type === 'event') {
        const category = result.data.category
        const venue = result.data.venueName
        const status = result.data.status

        if (category) categoryCount[category] = (categoryCount[category] || 0) + 1
        if (venue) venueCount[venue] = (venueCount[venue] || 0) + 1
        if (status) statusCount[status] = (statusCount[status] || 0) + 1
      }
    })

    return {
      categories: Object.entries(categoryCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      venues: Object.entries(venueCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      status: Object.entries(statusCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      priceRanges: []
    }
  }

  // Empty response
  private static emptyResponse(query: string): SearchResponse {
    return {
      results: [],
      totalCount: 0,
      query,
      searchTime: 0
    }
  }

  // Data fetchers
  private static async fetchEvents(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'events'))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch { return [] }
  }

  private static async fetchVenues(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'venues'))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch { return [] }
  }

  private static async fetchOrders(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'orders'))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch { return [] }
  }

  private static async fetchPromoters(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'promoters'))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch { return [] }
  }
}

export default SearchService
