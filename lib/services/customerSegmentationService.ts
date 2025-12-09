import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const isBrowser = typeof window !== 'undefined'

export interface CustomerSegment {
  id: string
  name: string
  description: string
  criteria: SegmentCriteria
  customerCount: number
  totalRevenue: number
  averageOrderValue: number
  characteristics: SegmentCharacteristics
  customers: CustomerProfile[]
}

export interface SegmentCriteria {
  type: 'rfm' | 'behavioral' | 'demographic' | 'custom'
  rules: SegmentRule[]
}

export interface SegmentRule {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'between' | 'in'
  value: any
}

export interface SegmentCharacteristics {
  averageRecency: number
  averageFrequency: number
  averageMonetaryValue: number
  topCategories: string[]
  topVenues: string[]
  preferredDays: string[]
  preferredTimes: string[]
  churnRisk: 'low' | 'medium' | 'high'
}

export interface CustomerProfile {
  id: string
  email: string
  name: string
  rfmScore: RFMScore
  totalOrders: number
  totalSpent: number
  firstPurchase: Date
  lastPurchase: Date
  averageOrderValue: number
  categories: string[]
  venues: string[]
  segment?: string
  churnProbability: number
  lifetimeValue: number
  engagementScore: number
}

export interface RFMScore {
  recency: number // 1-5 (5 = most recent)
  frequency: number // 1-5 (5 = most frequent)
  monetary: number // 1-5 (5 = highest value)
  score: number // Combined RFM score
  segment: string // RFM segment name
}

export interface SegmentInsight {
  segmentId: string
  segmentName: string
  insight: string
  recommendation: string
  priority: 'high' | 'medium' | 'low'
  potentialRevenue?: number
}

export class CustomerSegmentationService {

  // Get all predefined segments with customer data
  static async getSegments(): Promise<CustomerSegment[]> {
    if (!isBrowser) return []

    try {
      const customers = await this.buildCustomerProfiles()

      // Create predefined segments
      const segments: CustomerSegment[] = [
        this.createChampionsSegment(customers),
        this.createLoyalCustomersSegment(customers),
        this.createPotentialLoyalistsSegment(customers),
        this.createNewCustomersSegment(customers),
        this.createAtRiskSegment(customers),
        this.createHibernatingSegment(customers),
        this.createLostCustomersSegment(customers),
        this.createHighValueSegment(customers),
        this.createBargainHuntersSegment(customers)
      ]

      return segments.filter(s => s.customerCount > 0)
    } catch (error) {
      console.error('[CustomerSegmentationService] Error getting segments:', error)
      return []
    }
  }

  // Build customer profiles with RFM scoring
  static async buildCustomerProfiles(): Promise<CustomerProfile[]> {
    if (!isBrowser) return []

    try {
      const [events, orders] = await Promise.all([
        this.fetchEvents(),
        this.fetchOrders()
      ])

      // Build event lookup
      const eventLookup: Record<string, any> = {}
      events.forEach(e => { eventLookup[e.id] = e })

      // Group orders by customer
      const customerMap: Record<string, {
        email: string
        name: string
        orders: any[]
        categories: Set<string>
        venues: Set<string>
      }> = {}

      orders.forEach(order => {
        const email = (order.customer?.email || order.customerEmail || '').toLowerCase()
        if (!email) return

        if (!customerMap[email]) {
          customerMap[email] = {
            email,
            name: order.customer?.name || order.customerName || 'Unknown',
            orders: [],
            categories: new Set(),
            venues: new Set()
          }
        }

        customerMap[email].orders.push(order)

        const event = eventLookup[order.eventId]
        if (event?.category) customerMap[email].categories.add(event.category)
        if (event?.venueName) customerMap[email].venues.add(event.venueName)
      })

      // Calculate RFM scores
      const now = new Date()
      const allRecencies: number[] = []
      const allFrequencies: number[] = []
      const allMonetaries: number[] = []

      // First pass: collect metrics
      Object.values(customerMap).forEach(customer => {
        const lastOrderDate = Math.max(...customer.orders.map(o =>
          (o.purchaseDate?.toDate?.() || o.createdAt?.toDate?.() || new Date(0)).getTime()
        ))
        const recency = Math.floor((now.getTime() - lastOrderDate) / (24 * 60 * 60 * 1000))
        const frequency = customer.orders.length
        const monetary = customer.orders.reduce((sum, o) =>
          sum + (o.pricing?.total || o.total || 0), 0
        )

        allRecencies.push(recency)
        allFrequencies.push(frequency)
        allMonetaries.push(monetary)
      })

      // Calculate quartiles for scoring
      const recencyQuartiles = this.calculateQuartiles(allRecencies.sort((a, b) => a - b))
      const frequencyQuartiles = this.calculateQuartiles(allFrequencies.sort((a, b) => a - b))
      const monetaryQuartiles = this.calculateQuartiles(allMonetaries.sort((a, b) => a - b))

      // Second pass: build profiles
      const profiles: CustomerProfile[] = Object.entries(customerMap).map(([email, customer]) => {
        const orderDates = customer.orders.map(o =>
          o.purchaseDate?.toDate?.() || o.createdAt?.toDate?.() || new Date(0)
        )
        const firstPurchase = new Date(Math.min(...orderDates.map(d => d.getTime())))
        const lastPurchase = new Date(Math.max(...orderDates.map(d => d.getTime())))

        const recencyDays = Math.floor((now.getTime() - lastPurchase.getTime()) / (24 * 60 * 60 * 1000))
        const frequency = customer.orders.length
        const totalSpent = customer.orders.reduce((sum, o) =>
          sum + (o.pricing?.total || o.total || 0), 0
        )

        // Calculate RFM scores (1-5, where 5 is best)
        const recencyScore = this.getQuartileScore(recencyDays, recencyQuartiles, true) // Lower is better
        const frequencyScore = this.getQuartileScore(frequency, frequencyQuartiles, false)
        const monetaryScore = this.getQuartileScore(totalSpent, monetaryQuartiles, false)

        const rfmScore: RFMScore = {
          recency: recencyScore,
          frequency: frequencyScore,
          monetary: monetaryScore,
          score: recencyScore * 100 + frequencyScore * 10 + monetaryScore,
          segment: this.getRFMSegmentName(recencyScore, frequencyScore, monetaryScore)
        }

        // Calculate churn probability
        const daysSinceLastPurchase = recencyDays
        const avgDaysBetweenPurchases = frequency > 1
          ? (lastPurchase.getTime() - firstPurchase.getTime()) / (24 * 60 * 60 * 1000) / (frequency - 1)
          : 30
        const churnProbability = Math.min(100, Math.max(0,
          (daysSinceLastPurchase / avgDaysBetweenPurchases) * 20
        ))

        // Calculate lifetime value (simplified)
        const customerAge = Math.max(1, (now.getTime() - firstPurchase.getTime()) / (24 * 60 * 60 * 1000))
        const dailyValue = totalSpent / customerAge
        const lifetimeValue = dailyValue * 365 * 3 // 3-year projected LTV

        // Calculate engagement score
        const engagementScore = Math.min(100,
          recencyScore * 10 + frequencyScore * 15 + monetaryScore * 5
        )

        return {
          id: email,
          email,
          name: customer.name,
          rfmScore,
          totalOrders: frequency,
          totalSpent: Math.round(totalSpent * 100) / 100,
          firstPurchase,
          lastPurchase,
          averageOrderValue: frequency > 0 ? Math.round(totalSpent / frequency * 100) / 100 : 0,
          categories: Array.from(customer.categories),
          venues: Array.from(customer.venues),
          churnProbability: Math.round(churnProbability),
          lifetimeValue: Math.round(lifetimeValue * 100) / 100,
          engagementScore: Math.round(engagementScore)
        }
      })

      return profiles
    } catch (error) {
      console.error('[CustomerSegmentationService] Error building profiles:', error)
      return []
    }
  }

  // Get segment insights and recommendations
  static async getInsights(): Promise<SegmentInsight[]> {
    const segments = await this.getSegments()
    const insights: SegmentInsight[] = []

    segments.forEach(segment => {
      switch (segment.id) {
        case 'champions':
          if (segment.customerCount > 0) {
            insights.push({
              segmentId: segment.id,
              segmentName: segment.name,
              insight: `${segment.customerCount} champion customers driving ${Math.round(segment.totalRevenue / 1000)}K in revenue`,
              recommendation: 'Offer exclusive early access and VIP experiences to maintain loyalty',
              priority: 'high',
              potentialRevenue: segment.totalRevenue * 0.2
            })
          }
          break

        case 'at-risk':
          if (segment.customerCount > 0) {
            insights.push({
              segmentId: segment.id,
              segmentName: segment.name,
              insight: `${segment.customerCount} valuable customers at risk of churning`,
              recommendation: 'Launch win-back campaign with personalized offers',
              priority: 'high',
              potentialRevenue: segment.averageOrderValue * segment.customerCount * 2
            })
          }
          break

        case 'potential-loyalists':
          if (segment.customerCount > 0) {
            insights.push({
              segmentId: segment.id,
              segmentName: segment.name,
              insight: `${segment.customerCount} customers showing signs of becoming loyal`,
              recommendation: 'Encourage with loyalty rewards and category-based recommendations',
              priority: 'medium',
              potentialRevenue: segment.averageOrderValue * segment.customerCount * 3
            })
          }
          break

        case 'new-customers':
          if (segment.customerCount > 0) {
            insights.push({
              segmentId: segment.id,
              segmentName: segment.name,
              insight: `${segment.customerCount} new customers acquired recently`,
              recommendation: 'Send welcome series with event recommendations',
              priority: 'medium'
            })
          }
          break

        case 'hibernating':
          if (segment.customerCount > 0) {
            insights.push({
              segmentId: segment.id,
              segmentName: segment.name,
              insight: `${segment.customerCount} customers have gone inactive`,
              recommendation: 'Send re-engagement email with special comeback offer',
              priority: 'low'
            })
          }
          break
      }
    })

    return insights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }

  // Get customer profile by email
  static async getCustomerProfile(email: string): Promise<CustomerProfile | null> {
    const profiles = await this.buildCustomerProfiles()
    return profiles.find(p => p.email.toLowerCase() === email.toLowerCase()) || null
  }

  // Get similar customers
  static async getSimilarCustomers(email: string, limit: number = 5): Promise<CustomerProfile[]> {
    const profiles = await this.buildCustomerProfiles()
    const target = profiles.find(p => p.email.toLowerCase() === email.toLowerCase())

    if (!target) return []

    // Score similarity based on RFM and categories
    const scored = profiles
      .filter(p => p.email !== target.email)
      .map(p => {
        let similarity = 0

        // RFM similarity
        const rfmDiff = Math.abs(p.rfmScore.score - target.rfmScore.score)
        similarity += Math.max(0, 100 - rfmDiff / 5)

        // Category overlap
        const sharedCategories = p.categories.filter(c => target.categories.includes(c))
        similarity += sharedCategories.length * 10

        // Spending similarity
        const spendDiff = Math.abs(p.totalSpent - target.totalSpent)
        similarity += Math.max(0, 50 - spendDiff / target.totalSpent * 50)

        return { profile: p, similarity }
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    return scored.map(s => s.profile)
  }

  // Private segment creation methods
  private static createChampionsSegment(customers: CustomerProfile[]): CustomerSegment {
    const filtered = customers.filter(c =>
      c.rfmScore.recency >= 4 && c.rfmScore.frequency >= 4 && c.rfmScore.monetary >= 4
    )
    return this.buildSegment('champions', 'Champions', 'Best customers - recent, frequent, high spenders', filtered)
  }

  private static createLoyalCustomersSegment(customers: CustomerProfile[]): CustomerSegment {
    const filtered = customers.filter(c =>
      c.rfmScore.frequency >= 4 && c.rfmScore.monetary >= 3 && c.rfmScore.recency >= 3
    )
    return this.buildSegment('loyal', 'Loyal Customers', 'Frequent buyers with good spending habits', filtered)
  }

  private static createPotentialLoyalistsSegment(customers: CustomerProfile[]): CustomerSegment {
    const filtered = customers.filter(c =>
      c.rfmScore.recency >= 4 && c.rfmScore.frequency >= 2 && c.rfmScore.frequency <= 3
    )
    return this.buildSegment('potential-loyalists', 'Potential Loyalists', 'Recent customers with growth potential', filtered)
  }

  private static createNewCustomersSegment(customers: CustomerProfile[]): CustomerSegment {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const filtered = customers.filter(c =>
      c.firstPurchase >= thirtyDaysAgo && c.totalOrders <= 2
    )
    return this.buildSegment('new-customers', 'New Customers', 'Recently acquired customers', filtered)
  }

  private static createAtRiskSegment(customers: CustomerProfile[]): CustomerSegment {
    const filtered = customers.filter(c =>
      c.rfmScore.recency <= 2 && c.rfmScore.frequency >= 3 && c.rfmScore.monetary >= 3
    )
    return this.buildSegment('at-risk', 'At Risk', 'Previously valuable customers showing signs of churning', filtered)
  }

  private static createHibernatingSegment(customers: CustomerProfile[]): CustomerSegment {
    const filtered = customers.filter(c =>
      c.rfmScore.recency <= 2 && c.rfmScore.frequency <= 2
    )
    return this.buildSegment('hibernating', 'Hibernating', 'Low activity customers who may be lost', filtered)
  }

  private static createLostCustomersSegment(customers: CustomerProfile[]): CustomerSegment {
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const filtered = customers.filter(c =>
      c.lastPurchase < ninetyDaysAgo && c.rfmScore.frequency >= 2
    )
    return this.buildSegment('lost', 'Lost Customers', 'Previously active customers with no recent activity', filtered)
  }

  private static createHighValueSegment(customers: CustomerProfile[]): CustomerSegment {
    const filtered = customers.filter(c => c.rfmScore.monetary >= 5)
    return this.buildSegment('high-value', 'High Value', 'Customers with highest spending', filtered)
  }

  private static createBargainHuntersSegment(customers: CustomerProfile[]): CustomerSegment {
    const filtered = customers.filter(c =>
      c.rfmScore.frequency >= 3 && c.averageOrderValue < 50
    )
    return this.buildSegment('bargain-hunters', 'Bargain Hunters', 'Frequent buyers with lower average order value', filtered)
  }

  private static buildSegment(
    id: string,
    name: string,
    description: string,
    customers: CustomerProfile[]
  ): CustomerSegment {
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0)
    const avgOrderValue = customers.length > 0
      ? customers.reduce((sum, c) => sum + c.averageOrderValue, 0) / customers.length
      : 0

    // Aggregate characteristics
    const allCategories: Record<string, number> = {}
    const allVenues: Record<string, number> = {}

    customers.forEach(c => {
      c.categories.forEach(cat => {
        allCategories[cat] = (allCategories[cat] || 0) + 1
      })
      c.venues.forEach(v => {
        allVenues[v] = (allVenues[v] || 0) + 1
      })
    })

    const topCategories = Object.entries(allCategories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat)

    const topVenues = Object.entries(allVenues)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([v]) => v)

    const avgRecency = customers.length > 0
      ? customers.reduce((sum, c) => sum + c.rfmScore.recency, 0) / customers.length
      : 0

    const avgFrequency = customers.length > 0
      ? customers.reduce((sum, c) => sum + c.rfmScore.frequency, 0) / customers.length
      : 0

    const avgMonetary = customers.length > 0
      ? customers.reduce((sum, c) => sum + c.rfmScore.monetary, 0) / customers.length
      : 0

    const avgChurnProb = customers.length > 0
      ? customers.reduce((sum, c) => sum + c.churnProbability, 0) / customers.length
      : 0

    return {
      id,
      name,
      description,
      criteria: { type: 'rfm', rules: [] },
      customerCount: customers.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageOrderValue: Math.round(avgOrderValue * 100) / 100,
      characteristics: {
        averageRecency: Math.round(avgRecency * 10) / 10,
        averageFrequency: Math.round(avgFrequency * 10) / 10,
        averageMonetaryValue: Math.round(avgMonetary * 10) / 10,
        topCategories,
        topVenues,
        preferredDays: [],
        preferredTimes: [],
        churnRisk: avgChurnProb > 60 ? 'high' : avgChurnProb > 30 ? 'medium' : 'low'
      },
      customers
    }
  }

  // Helper methods
  private static calculateQuartiles(sortedValues: number[]): number[] {
    if (sortedValues.length === 0) return [0, 0, 0, 0, 0]

    const q1 = sortedValues[Math.floor(sortedValues.length * 0.2)]
    const q2 = sortedValues[Math.floor(sortedValues.length * 0.4)]
    const q3 = sortedValues[Math.floor(sortedValues.length * 0.6)]
    const q4 = sortedValues[Math.floor(sortedValues.length * 0.8)]

    return [0, q1, q2, q3, q4]
  }

  private static getQuartileScore(value: number, quartiles: number[], inverse: boolean): number {
    if (inverse) {
      if (value <= quartiles[1]) return 5
      if (value <= quartiles[2]) return 4
      if (value <= quartiles[3]) return 3
      if (value <= quartiles[4]) return 2
      return 1
    } else {
      if (value >= quartiles[4]) return 5
      if (value >= quartiles[3]) return 4
      if (value >= quartiles[2]) return 3
      if (value >= quartiles[1]) return 2
      return 1
    }
  }

  private static getRFMSegmentName(r: number, f: number, m: number): string {
    if (r >= 4 && f >= 4 && m >= 4) return 'Champions'
    if (f >= 4 && m >= 3) return 'Loyal Customers'
    if (r >= 4 && f >= 2) return 'Potential Loyalist'
    if (r >= 4 && f <= 2) return 'New Customer'
    if (r <= 2 && f >= 3) return 'At Risk'
    if (r <= 2 && f <= 2 && m >= 3) return 'Hibernating'
    if (r <= 2 && f <= 2) return 'Lost'
    if (m >= 5) return 'Big Spender'
    return 'Regular'
  }

  // Data fetchers
  private static async fetchEvents(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'events'))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch { return [] }
  }

  private static async fetchOrders(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'orders'))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch { return [] }
  }
}

export default CustomerSegmentationService
