import { collection, getDocs, query, where, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const isBrowser = typeof window !== 'undefined'

export interface PricingRule {
  id: string
  name: string
  type: 'demand' | 'time' | 'inventory' | 'competitor' | 'custom'
  enabled: boolean
  priority: number
  conditions: PricingCondition[]
  adjustment: PriceAdjustment
  appliesTo: {
    allEvents?: boolean
    eventIds?: string[]
    categories?: string[]
    promoterIds?: string[]
    tiers?: string[]
  }
  schedule?: {
    startDate?: Date
    endDate?: Date
    daysOfWeek?: number[]
    hoursOfDay?: { start: number; end: number }
  }
}

export interface PricingCondition {
  type: 'sales_velocity' | 'inventory_level' | 'days_to_event' | 'time_of_day' | 'day_of_week' | 'capacity_filled' | 'competitor_price'
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between'
  value: number | number[]
  unit?: string
}

export interface PriceAdjustment {
  type: 'percentage' | 'fixed' | 'multiplier'
  value: number
  direction: 'increase' | 'decrease'
  minPrice?: number
  maxPrice?: number
  cap?: number
}

export interface PricingAnalysis {
  eventId: string
  eventName: string
  currentPricing: EventPricing
  recommendedPricing: EventPricing
  adjustments: PricingAdjustmentResult[]
  revenue: {
    currentEstimate: number
    projectedEstimate: number
    potentialIncrease: number
    potentialIncreasePercent: number
  }
  confidence: number
  factors: PricingFactor[]
}

export interface EventPricing {
  tiers: {
    name: string
    basePrice: number
    currentPrice: number
    recommendedPrice: number
  }[]
}

export interface PricingAdjustmentResult {
  ruleId: string
  ruleName: string
  type: string
  adjustment: number
  reason: string
  appliedAt: Date
}

export interface PricingFactor {
  name: string
  impact: 'positive' | 'negative' | 'neutral'
  weight: number
  description: string
  value: string | number
}

export interface DemandMetrics {
  salesVelocity: number
  velocityTrend: 'increasing' | 'decreasing' | 'stable'
  viewToSalesRatio: number
  peakDemandHours: number[]
  demandScore: number
}

export class DynamicPricingService {

  // Analyze pricing for a single event
  static async analyzeEventPricing(eventId: string): Promise<PricingAnalysis | null> {
    if (!isBrowser) return null

    try {
      const [events, orders] = await Promise.all([
        this.fetchEvents(),
        this.fetchOrders()
      ])

      const event = events.find(e => e.id === eventId)
      if (!event) return null

      const eventOrders = orders.filter(o => o.eventId === eventId)

      return this.calculatePricingAnalysis(event, eventOrders, events, orders)
    } catch (error) {
      console.error('[DynamicPricingService] Error analyzing pricing:', error)
      return null
    }
  }

  // Get pricing recommendations for all active events
  static async getPricingRecommendations(options?: {
    promoterId?: string
    category?: string
    minConfidence?: number
  }): Promise<PricingAnalysis[]> {
    if (!isBrowser) return []

    try {
      const [events, orders] = await Promise.all([
        this.fetchEvents(),
        this.fetchOrders()
      ])

      const now = new Date()
      let activeEvents = events.filter(event => {
        const eventDate = event.schedule?.date?.toDate?.() ||
                         new Date(event.schedule?.date || 0)
        return eventDate > now
      })

      // Apply filters
      if (options?.promoterId) {
        activeEvents = activeEvents.filter(e => e.promoterId === options.promoterId)
      }
      if (options?.category) {
        activeEvents = activeEvents.filter(e => e.category === options.category)
      }

      // Analyze each event
      const analyses = await Promise.all(
        activeEvents.map(event => {
          const eventOrders = orders.filter(o => o.eventId === event.id)
          return this.calculatePricingAnalysis(event, eventOrders, events, orders)
        })
      )

      // Filter by confidence if specified
      let results = analyses.filter((a): a is PricingAnalysis => a !== null)
      if (options?.minConfidence) {
        results = results.filter(a => a.confidence >= options.minConfidence!)
      }

      // Sort by potential revenue increase
      return results.sort((a, b) =>
        b.revenue.potentialIncreasePercent - a.revenue.potentialIncreasePercent
      )
    } catch (error) {
      console.error('[DynamicPricingService] Error getting recommendations:', error)
      return []
    }
  }

  // Calculate demand metrics for an event
  static async calculateDemandMetrics(eventId: string): Promise<DemandMetrics | null> {
    if (!isBrowser) return null

    try {
      const [events, orders] = await Promise.all([
        this.fetchEvents(),
        this.fetchOrders()
      ])

      const event = events.find(e => e.id === eventId)
      if (!event) return null

      const eventOrders = orders.filter(o => o.eventId === eventId)

      return this.computeDemandMetrics(event, eventOrders)
    } catch (error) {
      console.error('[DynamicPricingService] Error calculating demand:', error)
      return null
    }
  }

  // Apply pricing adjustment to an event
  static async applyPricingAdjustment(
    eventId: string,
    tierName: string,
    newPrice: number,
    reason: string
  ): Promise<boolean> {
    if (!isBrowser) return false

    try {
      const eventRef = doc(db, 'events', eventId)

      // Get current event
      const events = await this.fetchEvents()
      const event = events.find(e => e.id === eventId)
      if (!event) return false

      // Update pricing
      const updatedPricing = { ...event.pricing }

      if (updatedPricing.tiers) {
        updatedPricing.tiers = updatedPricing.tiers.map((tier: any) => {
          if (tier.name === tierName) {
            return {
              ...tier,
              currentPrice: newPrice,
              priceHistory: [
                ...(tier.priceHistory || []),
                {
                  price: newPrice,
                  timestamp: new Date().toISOString(),
                  reason
                }
              ]
            }
          }
          return tier
        })
      }

      await updateDoc(eventRef, {
        pricing: updatedPricing,
        updatedAt: Timestamp.now()
      })

      return true
    } catch (error) {
      console.error('[DynamicPricingService] Error applying adjustment:', error)
      return false
    }
  }

  // Get optimal price for a specific scenario
  static calculateOptimalPrice(params: {
    basePrice: number
    daysToEvent: number
    capacityFilled: number
    salesVelocity: number
    historicalSelloutRate: number
    competitorAvgPrice?: number
  }): {
    recommendedPrice: number
    adjustmentPercent: number
    factors: PricingFactor[]
  } {
    let adjustmentMultiplier = 1.0
    const factors: PricingFactor[] = []

    // Days to event factor
    if (params.daysToEvent <= 3) {
      // Last minute - high demand usually
      if (params.capacityFilled < 0.5) {
        // Not selling well, discount
        adjustmentMultiplier *= 0.85
        factors.push({
          name: 'Last Minute Low Demand',
          impact: 'negative',
          weight: 0.15,
          description: 'Event is soon but sales are low',
          value: `${params.daysToEvent} days left, ${Math.round(params.capacityFilled * 100)}% sold`
        })
      } else {
        // Selling well, premium
        adjustmentMultiplier *= 1.15
        factors.push({
          name: 'Last Minute Surge',
          impact: 'positive',
          weight: 0.15,
          description: 'High demand close to event date',
          value: `${params.daysToEvent} days left`
        })
      }
    } else if (params.daysToEvent <= 7) {
      // One week out
      if (params.capacityFilled > 0.7) {
        adjustmentMultiplier *= 1.10
        factors.push({
          name: 'High Demand Week',
          impact: 'positive',
          weight: 0.10,
          description: 'Strong sales one week before event',
          value: `${Math.round(params.capacityFilled * 100)}% capacity filled`
        })
      }
    } else if (params.daysToEvent > 30) {
      // Early bird opportunity
      if (params.capacityFilled < 0.2) {
        adjustmentMultiplier *= 0.90
        factors.push({
          name: 'Early Bird Discount',
          impact: 'negative',
          weight: 0.10,
          description: 'Incentivize early purchases',
          value: `${params.daysToEvent} days out`
        })
      }
    }

    // Capacity factor
    if (params.capacityFilled >= 0.9) {
      adjustmentMultiplier *= 1.20
      factors.push({
        name: 'Near Sellout',
        impact: 'positive',
        weight: 0.20,
        description: 'Event nearly sold out',
        value: `${Math.round(params.capacityFilled * 100)}% sold`
      })
    } else if (params.capacityFilled >= 0.75) {
      adjustmentMultiplier *= 1.10
      factors.push({
        name: 'High Capacity',
        impact: 'positive',
        weight: 0.10,
        description: 'Strong sales performance',
        value: `${Math.round(params.capacityFilled * 100)}% sold`
      })
    } else if (params.capacityFilled < 0.3 && params.daysToEvent <= 14) {
      adjustmentMultiplier *= 0.90
      factors.push({
        name: 'Low Sales Alert',
        impact: 'negative',
        weight: 0.10,
        description: 'Sales below expectations',
        value: `Only ${Math.round(params.capacityFilled * 100)}% sold`
      })
    }

    // Sales velocity factor
    if (params.salesVelocity > 5) { // More than 5 tickets/day
      adjustmentMultiplier *= 1.05
      factors.push({
        name: 'High Velocity',
        impact: 'positive',
        weight: 0.05,
        description: 'Strong daily sales rate',
        value: `${params.salesVelocity.toFixed(1)} tickets/day`
      })
    } else if (params.salesVelocity < 1 && params.capacityFilled < 0.5) {
      adjustmentMultiplier *= 0.95
      factors.push({
        name: 'Slow Sales',
        impact: 'negative',
        weight: 0.05,
        description: 'Below average daily sales',
        value: `${params.salesVelocity.toFixed(1)} tickets/day`
      })
    }

    // Historical performance factor
    if (params.historicalSelloutRate > 0.8) {
      adjustmentMultiplier *= 1.05
      factors.push({
        name: 'Strong Track Record',
        impact: 'positive',
        weight: 0.05,
        description: 'Similar events typically sell out',
        value: `${Math.round(params.historicalSelloutRate * 100)}% sellout rate`
      })
    }

    // Competitor factor
    if (params.competitorAvgPrice) {
      const priceDiff = (params.basePrice - params.competitorAvgPrice) / params.competitorAvgPrice
      if (priceDiff > 0.2) {
        // We're 20%+ more expensive
        factors.push({
          name: 'Premium Pricing',
          impact: 'neutral',
          weight: 0.05,
          description: 'Priced above market average',
          value: `${Math.round(priceDiff * 100)}% above competitors`
        })
      } else if (priceDiff < -0.2) {
        // We're 20%+ cheaper
        adjustmentMultiplier *= 1.05
        factors.push({
          name: 'Underpriced',
          impact: 'positive',
          weight: 0.05,
          description: 'Opportunity to increase margin',
          value: `${Math.round(Math.abs(priceDiff) * 100)}% below competitors`
        })
      }
    }

    // Cap adjustments
    adjustmentMultiplier = Math.max(0.70, Math.min(1.50, adjustmentMultiplier))

    const recommendedPrice = Math.round(params.basePrice * adjustmentMultiplier * 100) / 100
    const adjustmentPercent = (adjustmentMultiplier - 1) * 100

    return {
      recommendedPrice,
      adjustmentPercent: Math.round(adjustmentPercent * 10) / 10,
      factors
    }
  }

  // Private helper methods
  private static calculatePricingAnalysis(
    event: any,
    eventOrders: any[],
    allEvents: any[],
    allOrders: any[]
  ): PricingAnalysis | null {
    const now = new Date()
    const eventDate = event.schedule?.date?.toDate?.() ||
                     new Date(event.schedule?.date || 0)
    const daysToEvent = Math.max(0, Math.ceil((eventDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))

    // Calculate capacity metrics
    const capacity = event.capacity || event.totalCapacity || 1000
    const ticketsSold = eventOrders.reduce((sum, o) =>
      sum + (o.tickets?.length || o.quantity || 1), 0
    )
    const capacityFilled = ticketsSold / capacity

    // Calculate sales velocity
    const demandMetrics = this.computeDemandMetrics(event, eventOrders)

    // Get historical sellout rate for similar events
    const similarEvents = allEvents.filter(e =>
      e.category === event.category && e.id !== event.id
    )
    const sellouts = similarEvents.filter(e => {
      const eOrders = allOrders.filter(o => o.eventId === e.id)
      const eSold = eOrders.reduce((sum, o) =>
        sum + (o.tickets?.length || o.quantity || 1), 0
      )
      const eCap = e.capacity || e.totalCapacity || 1000
      return eSold / eCap >= 0.95
    })
    const historicalSelloutRate = similarEvents.length > 0
      ? sellouts.length / similarEvents.length
      : 0.5

    // Current pricing
    const currentPricing = this.extractEventPricing(event)

    // Calculate recommended pricing for each tier
    const recommendedPricing: EventPricing = {
      tiers: currentPricing.tiers.map(tier => {
        const optimal = this.calculateOptimalPrice({
          basePrice: tier.basePrice,
          daysToEvent,
          capacityFilled,
          salesVelocity: demandMetrics?.salesVelocity || 0,
          historicalSelloutRate
        })

        return {
          ...tier,
          recommendedPrice: optimal.recommendedPrice
        }
      })
    }

    // Calculate revenue impact
    const currentRevenue = currentPricing.tiers.reduce((sum, t) =>
      sum + t.currentPrice * (capacity / currentPricing.tiers.length), 0
    )
    const projectedRevenue = recommendedPricing.tiers.reduce((sum, t) =>
      sum + t.recommendedPrice * (capacity / recommendedPricing.tiers.length), 0
    )

    // Compile factors
    const allFactors: PricingFactor[] = []
    recommendedPricing.tiers.forEach(tier => {
      const optimal = this.calculateOptimalPrice({
        basePrice: tier.basePrice,
        daysToEvent,
        capacityFilled,
        salesVelocity: demandMetrics?.salesVelocity || 0,
        historicalSelloutRate
      })
      allFactors.push(...optimal.factors)
    })

    // Deduplicate factors
    const uniqueFactors = Array.from(
      new Map(allFactors.map(f => [f.name, f])).values()
    )

    // Calculate confidence
    const dataPoints = eventOrders.length
    const confidence = Math.min(95, 50 + Math.log(dataPoints + 1) * 15 + (daysToEvent > 7 ? 10 : 0))

    return {
      eventId: event.id,
      eventName: event.name || 'Unnamed Event',
      currentPricing,
      recommendedPricing,
      adjustments: [],
      revenue: {
        currentEstimate: Math.round(currentRevenue),
        projectedEstimate: Math.round(projectedRevenue),
        potentialIncrease: Math.round(projectedRevenue - currentRevenue),
        potentialIncreasePercent: currentRevenue > 0
          ? Math.round((projectedRevenue - currentRevenue) / currentRevenue * 100 * 10) / 10
          : 0
      },
      confidence: Math.round(confidence),
      factors: uniqueFactors
    }
  }

  private static computeDemandMetrics(event: any, eventOrders: any[]): DemandMetrics {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    // Calculate recent sales
    const recentOrders = eventOrders.filter(o => {
      const orderDate = o.purchaseDate?.toDate?.() || o.createdAt?.toDate?.() || new Date(0)
      return orderDate >= sevenDaysAgo
    })

    const previousWeekOrders = eventOrders.filter(o => {
      const orderDate = o.purchaseDate?.toDate?.() || o.createdAt?.toDate?.() || new Date(0)
      return orderDate >= fourteenDaysAgo && orderDate < sevenDaysAgo
    })

    const recentTickets = recentOrders.reduce((sum, o) =>
      sum + (o.tickets?.length || o.quantity || 1), 0
    )
    const previousTickets = previousWeekOrders.reduce((sum, o) =>
      sum + (o.tickets?.length || o.quantity || 1), 0
    )

    const salesVelocity = recentTickets / 7

    // Determine trend
    let velocityTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (recentTickets > previousTickets * 1.2) {
      velocityTrend = 'increasing'
    } else if (recentTickets < previousTickets * 0.8) {
      velocityTrend = 'decreasing'
    }

    // Calculate peak hours
    const hourCounts: Record<number, number> = {}
    for (let i = 0; i < 24; i++) hourCounts[i] = 0

    eventOrders.forEach(order => {
      const orderDate = order.purchaseDate?.toDate?.() || order.createdAt?.toDate?.()
      if (orderDate) {
        hourCounts[orderDate.getHours()]++
      }
    })

    const peakDemandHours = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => parseInt(hour))

    // Calculate demand score (0-100)
    const capacity = event.capacity || event.totalCapacity || 1000
    const ticketsSold = eventOrders.reduce((sum, o) =>
      sum + (o.tickets?.length || o.quantity || 1), 0
    )
    const fillRate = ticketsSold / capacity

    let demandScore = 50
    demandScore += salesVelocity * 5 // Velocity boost
    demandScore += fillRate * 30 // Fill rate boost
    if (velocityTrend === 'increasing') demandScore += 10
    if (velocityTrend === 'decreasing') demandScore -= 10

    demandScore = Math.max(0, Math.min(100, demandScore))

    return {
      salesVelocity: Math.round(salesVelocity * 100) / 100,
      velocityTrend,
      viewToSalesRatio: 0, // Would need pageview data
      peakDemandHours,
      demandScore: Math.round(demandScore)
    }
  }

  private static extractEventPricing(event: any): EventPricing {
    if (event.pricing?.tiers && Array.isArray(event.pricing.tiers)) {
      return {
        tiers: event.pricing.tiers.map((tier: any) => {
          const prices = Object.values(tier.prices || {}).filter(p => typeof p === 'number')
          const avgPrice = prices.length > 0
            ? prices.reduce((a: number, b: any) => a + b, 0) / prices.length
            : tier.basePrice || 0

          return {
            name: tier.name || 'Standard',
            basePrice: tier.basePrice || avgPrice,
            currentPrice: tier.currentPrice || avgPrice,
            recommendedPrice: avgPrice
          }
        })
      }
    }

    // Default single tier
    const price = event.ticketPrice || event.price || 50
    return {
      tiers: [{
        name: 'General Admission',
        basePrice: price,
        currentPrice: price,
        recommendedPrice: price
      }]
    }
  }

  // Data fetchers
  private static async fetchEvents(): Promise<any[]> {
    try {
      const eventsRef = collection(db, 'events')
      const snapshot = await getDocs(eventsRef)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('[DynamicPricingService] Error fetching events:', error)
      return []
    }
  }

  private static async fetchOrders(): Promise<any[]> {
    try {
      const ordersRef = collection(db, 'orders')
      const snapshot = await getDocs(ordersRef)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('[DynamicPricingService] Error fetching orders:', error)
      return []
    }
  }
}

export default DynamicPricingService
