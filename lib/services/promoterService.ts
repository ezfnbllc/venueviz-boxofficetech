import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, Timestamp, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { PromoterProfile, PaymentGateway } from '@/lib/types/promoter'

// Helper to check if code is running in browser (prevents SSR/build-time Firebase calls)
const isBrowser = typeof window !== 'undefined'

export class PromoterService {
  static async getPromoters() {
    // Skip during SSR/build to avoid Firebase permission errors
    if (!isBrowser) return []

    try {
      const promotersRef = collection(db, 'promoters')
      const snapshot = await getDocs(promotersRef)

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching promoters:', error)
      return []
    }
  }

  static async getActivePromoters() {
    // Skip during SSR/build to avoid Firebase permission errors
    if (!isBrowser) return []

    try {
      const promotersRef = collection(db, 'promoters')
      const q = query(promotersRef, where('active', '==', true))
      const snapshot = await getDocs(q)

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching active promoters:', error)
      return []
    }
  }

  static async createPromoter(data: any) {
    try {
      const promotersRef = collection(db, 'promoters')
      const docRef = await addDoc(promotersRef, {
        ...data,
        active: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      
      return docRef.id
    } catch (error) {
      console.error('Error creating promoter:', error)
      throw error
    }
  }

  static async updatePromoter(id: string, data: any) {
    try {
      const promoterRef = doc(db, 'promoters', id)
      await updateDoc(promoterRef, {
        ...data,
        updatedAt: Timestamp.now()
      })
      
      return true
    } catch (error) {
      console.error('Error updating promoter:', error)
      throw error
    }
  }

  static async deletePromoter(id: string) {
    try {
      const promoterRef = doc(db, 'promoters', id)
      await deleteDoc(promoterRef)

      return true
    } catch (error) {
      console.error('Error deleting promoter:', error)
      throw error
    }
  }

  // Get a single promoter by ID
  static async getPromoter(id: string): Promise<PromoterProfile | null> {
    if (!isBrowser) return null

    try {
      const promoterRef = doc(db, 'promoters', id)
      const snapshot = await getDoc(promoterRef)

      if (!snapshot.exists()) return null

      return { id: snapshot.id, ...snapshot.data() } as PromoterProfile
    } catch (error) {
      console.error('Error fetching promoter:', error)
      return null
    }
  }

  // Get promoter by slug (for portal pages)
  static async getPromoterBySlug(slug: string): Promise<PromoterProfile | null> {
    if (!isBrowser) return null

    try {
      const promotersRef = collection(db, 'promoters')
      const q = query(promotersRef, where('slug', '==', slug), where('active', '==', true))
      const snapshot = await getDocs(q)

      if (snapshot.empty) return null

      const doc = snapshot.docs[0]
      return { id: doc.id, ...doc.data() } as PromoterProfile
    } catch (error) {
      console.error('Error fetching promoter by slug:', error)
      return null
    }
  }

  // Get promoter stats (events, revenue, commissions)
  static async getPromoterStats(promoterId: string) {
    if (!isBrowser) {
      return {
        totalEvents: 0,
        activeEvents: 0,
        totalCommission: 0,
        pendingCommission: 0,
        totalTicketsSold: 0,
        totalRevenue: 0
      }
    }

    try {
      // Get promoter to get commission rate
      const promoter = await this.getPromoter(promoterId)
      const commissionRate = promoter?.commission || 10

      // Get all events for this promoter
      const eventsRef = collection(db, 'events')
      const eventsQuery = query(eventsRef, where('promoterId', '==', promoterId))
      const eventsSnap = await getDocs(eventsQuery)

      const events = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      const now = new Date()

      // Count active events (future date)
      const activeEvents = events.filter(e => {
        const eventDate = e.schedule?.date?.toDate?.() || new Date(e.schedule?.date || 0)
        return eventDate > now
      }).length

      // Get all orders for promoter's events
      const eventIds = events.map(e => e.id)
      let totalRevenue = 0
      let totalTicketsSold = 0
      let paidCommission = 0

      if (eventIds.length > 0) {
        const ordersRef = collection(db, 'orders')
        const ordersSnap = await getDocs(ordersRef)

        ordersSnap.docs.forEach(doc => {
          const order = doc.data()
          if (eventIds.includes(order.eventId)) {
            const orderTotal = order.pricing?.total || order.totalAmount || order.total || 0
            totalRevenue += orderTotal
            totalTicketsSold += order.tickets?.length || order.quantity || 1

            // Check if commission was paid
            if (order.commissionPaid) {
              paidCommission += orderTotal * (commissionRate / 100)
            }
          }
        })
      }

      const totalCommission = totalRevenue * (commissionRate / 100)
      const pendingCommission = totalCommission - paidCommission

      return {
        totalEvents: events.length,
        activeEvents,
        totalCommission: Math.round(totalCommission * 100) / 100,
        pendingCommission: Math.round(pendingCommission * 100) / 100,
        totalTicketsSold,
        totalRevenue: Math.round(totalRevenue * 100) / 100
      }
    } catch (error) {
      console.error('Error fetching promoter stats:', error)
      return {
        totalEvents: 0,
        activeEvents: 0,
        totalCommission: 0,
        pendingCommission: 0,
        totalTicketsSold: 0,
        totalRevenue: 0
      }
    }
  }

  // Set payment gateway for promoter
  static async setPaymentGateway(promoterId: string, gateway: PaymentGateway) {
    try {
      // Check if gateway already exists
      const gatewaysRef = collection(db, 'payment_gateways')
      const q = query(gatewaysRef, where('promoterId', '==', promoterId))
      const snapshot = await getDocs(q)

      const gatewayData = {
        ...gateway,
        promoterId,
        updatedAt: Timestamp.now()
      }

      if (snapshot.empty) {
        // Create new gateway
        gatewayData.createdAt = Timestamp.now()
        await addDoc(gatewaysRef, gatewayData)
      } else {
        // Update existing gateway
        const existingDoc = snapshot.docs[0]
        await updateDoc(doc(db, 'payment_gateways', existingDoc.id), gatewayData)
      }

      return true
    } catch (error) {
      console.error('Error setting payment gateway:', error)
      throw error
    }
  }

  // Get payment gateway for promoter
  static async getPaymentGateway(promoterId: string): Promise<PaymentGateway | null> {
    if (!isBrowser) return null

    try {
      const gatewaysRef = collection(db, 'payment_gateways')
      const q = query(gatewaysRef, where('promoterId', '==', promoterId))
      const snapshot = await getDocs(q)

      if (snapshot.empty) return null

      const doc = snapshot.docs[0]
      return { id: doc.id, ...doc.data() } as PaymentGateway
    } catch (error) {
      console.error('Error fetching payment gateway:', error)
      return null
    }
  }
}

// Default export for backward compatibility
export default PromoterService
