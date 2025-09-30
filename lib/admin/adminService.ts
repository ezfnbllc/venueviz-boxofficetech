import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export class AdminService {
  
  static async getVenues() {
    try {
      const venuesRef = collection(db, 'venues')
      const snapshot = await getDocs(venuesRef)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching venues:', error)
      return []
    }
  }

  static async getVenue(venueId: string) {
    try {
      const venueRef = doc(db, 'venues', venueId)
      const venueDoc = await getDoc(venueRef)
      if (venueDoc.exists()) {
        return { id: venueDoc.id, ...venueDoc.data() }
      }
      return null
    } catch (error) {
      console.error('Error fetching venue:', error)
      return null
    }
  }

  static async getLayouts() {
    try {
      const layoutsRef = collection(db, 'layouts')
      const snapshot = await getDocs(layoutsRef)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching layouts:', error)
      return []
    }
  }

  static async getLayoutsByVenueId(venueId: string) {
    try {
      const layoutsRef = collection(db, 'layouts')
      const q = query(layoutsRef, where('venueId', '==', venueId))
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching layouts for venue:', error)
      return []
    }
  }

  static async getEvents() {
    try {
      const eventsRef = collection(db, 'events')
      const snapshot = await getDocs(eventsRef)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching events:', error)
      return []
    }
  }

  static async getEvent(eventId: string) {
    console.log(`[ADMIN SERVICE] Fetching event: ${eventId}`)
    try {
      const eventRef = doc(db, "events", eventId)
      const eventDoc = await getDoc(eventRef)
      if (eventDoc.exists()) {
        const eventData = { id: eventDoc.id, ...eventDoc.data() }
        console.log(`[ADMIN SERVICE] Successfully fetched event ${eventId}`)
        return eventData
      }
      console.log(`[ADMIN SERVICE] Event not found: ${eventId}`)
      return null
    } catch (error) {
      console.error(`[ADMIN SERVICE] Error fetching event ${eventId}:`, error)
      return null
    }
  }

  static async createEvent(eventData: any) {
    console.log('[ADMIN SERVICE] Creating new event with data:', eventData)
    try {
      const eventsRef = collection(db, 'events')
      const docRef = await addDoc(eventsRef, {
        ...eventData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      console.log(`[ADMIN SERVICE] Successfully created event: ${docRef.id}`)
      return docRef.id
    } catch (error) {
      console.error('[ADMIN SERVICE] Error creating event:', error)
      throw error
    }
  }

  static async updateEvent(eventId: string, eventData: any) {
    console.log(`[ADMIN SERVICE] Attempting to update event ${eventId}`)
    
    if (!eventId || eventId.length < 10) {
      throw new Error(`[CRITICAL] Invalid event ID: ${eventId}`)
    }
    
    if (eventData.id && eventData.id !== eventId) {
      throw new Error(`[CRITICAL] Event ID mismatch! URL: ${eventId}, Data: ${eventData.id}`)
    }
    
    const safeEventData = { ...eventData }
    delete safeEventData.id
    delete safeEventData.eventId
    
    console.log(`[ADMIN SERVICE] Safe data for event ${eventId}:`, Object.keys(safeEventData))
    
    try {
      const eventRef = doc(db, 'events', eventId)
      await updateDoc(eventRef, {
        ...safeEventData,
        updatedAt: Timestamp.now()
      })
      console.log(`[ADMIN SERVICE] Successfully updated event ${eventId}`)
      return true
    } catch (error) {
      console.error(`[ADMIN SERVICE] Failed to update event ${eventId}:`, error)
      throw error
    }
  }

  static async checkEventOrders(eventId: string) {
    try {
      const ordersRef = collection(db, 'orders')
      const q = query(ordersRef, where('eventId', '==', eventId))
      const snapshot = await getDocs(q)
      
      return {
        hasOrders: !snapshot.empty,
        orderCount: snapshot.size
      }
    } catch (error) {
      console.error('Error checking event orders:', error)
      throw new Error('Failed to check event orders')
    }
  }

  static async deleteEvent(eventId: string, userId?: string) {
    try {
      const { hasOrders, orderCount } = await this.checkEventOrders(eventId)
      
      if (hasOrders) {
        const eventRef = doc(db, 'events', eventId)
        await updateDoc(eventRef, {
          status: 'deleted',
          deletedAt: Timestamp.now(),
          deletedBy: userId || 'unknown',
          updatedAt: Timestamp.now()
        })
        console.log('Event soft deleted:', eventId)
        return { deleted: true, type: 'soft' as const, orderCount }
      } else {
        const eventRef = doc(db, 'events', eventId)
        await deleteDoc(eventRef)
        console.log('Event hard deleted:', eventId)
        return { deleted: true, type: 'hard' as const }
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      throw error
    }
  }

  static async restoreEvent(eventId: string) {
    try {
      const eventRef = doc(db, 'events', eventId)
      await updateDoc(eventRef, {
        status: 'draft',
        deletedAt: null,
        deletedBy: null,
        updatedAt: Timestamp.now()
      })
      console.log('Event restored:', eventId)
    } catch (error) {
      console.error('Error restoring event:', error)
      throw new Error('Failed to restore event')
    }
  }

  static async getPromoters() {
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

  static async getPromotions() {
    try {
      const promotionsRef = collection(db, 'promotions')
      const snapshot = await getDocs(promotionsRef)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching promotions:', error)
      return []
    }
  }

  static async getOrders() {
    try {
      const ordersRef = collection(db, 'orders')
      const snapshot = await getDocs(ordersRef)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching orders:', error)
      return []
    }
  }

  static async getCustomers() {
    try {
      const customersRef = collection(db, 'customers')
      const snapshot = await getDocs(customersRef)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching customers:', error)
      return []
    }
  }

  static async getDashboardStats() {
    try {
      const [events, venues, orders, customers, promoters] = await Promise.all([
        this.getEvents(),
        this.getVenues(),
        this.getOrders(),
        this.getCustomers(),
        this.getPromoters()
      ])
      
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      
      let monthlyRevenue = 0
      let lastMonthRevenue = 0
      
      orders.forEach(order => {
        const orderDate = order.purchaseDate?.toDate?.() || order.createdAt?.toDate?.() || new Date(0)
        const amount = order.pricing?.total || order.totalAmount || order.total || 0
        
        if (orderDate >= thisMonth) {
          monthlyRevenue += amount
        } else if (orderDate >= lastMonth && orderDate < thisMonth) {
          lastMonthRevenue += amount
        }
      })

      const revenueGrowth = lastMonthRevenue > 0 
        ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0

      return {
        totalEvents: events.length,
        activeEvents: events.filter(e => e.status === 'published').length,
        totalVenues: venues.length,
        totalOrders: orders.length,
        totalCustomers: customers.length,
        totalPromoters: promoters.length,
        monthlyRevenue,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        recentEvents: events
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          .slice(0, 5),
        recentOrders: orders
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          .slice(0, 5)
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      return {
        totalEvents: 0,
        activeEvents: 0,
        totalVenues: 0,
        totalOrders: 0,
        totalCustomers: 0,
        totalPromoters: 0,
        monthlyRevenue: 0,
        revenueGrowth: 0,
        recentEvents: [],
        recentOrders: []
      }
    }
  }
}

  // Missing methods that dashboard and orders pages need
  static async getOrderStats() {
    try {
      const orders = await this.getOrders()
      
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      
      let totalRevenue = 0
      let monthlyRevenue = 0
      let lastMonthRevenue = 0
      
      orders.forEach(order => {
        const orderDate = order.purchaseDate?.toDate?.() || order.createdAt?.toDate?.() || new Date(0)
        const amount = order.pricing?.total || order.totalAmount || order.total || 0
        
        totalRevenue += amount
        
        if (orderDate >= thisMonth) {
          monthlyRevenue += amount
        } else if (orderDate >= lastMonth && orderDate < thisMonth) {
          lastMonthRevenue += amount
        }
      })
      
      const revenueGrowth = lastMonthRevenue > 0 
        ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0
      
      return {
        totalOrders: orders.length,
        totalRevenue,
        monthlyRevenue,
        lastMonthRevenue,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        recentOrders: orders
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          .slice(0, 10)
      }
    } catch (error) {
      console.error('Error getting order stats:', error)
      return {
        totalOrders: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        lastMonthRevenue: 0,
        revenueGrowth: 0,
        recentOrders: []
      }
    }
  }

  static async getEventStats() {
    try {
      const events = await this.getEvents()
      
      return {
        totalEvents: events.length,
        publishedEvents: events.filter(e => e.status === 'published').length,
        draftEvents: events.filter(e => e.status === 'draft').length,
        recentEvents: events
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          .slice(0, 5)
      }
    } catch (error) {
      console.error('Error getting event stats:', error)
      return {
        totalEvents: 0,
        publishedEvents: 0,
        draftEvents: 0,
        recentEvents: []
      }
    }
  }

  static async getVenueStats() {
    try {
      const venues = await this.getVenues()
      
      return {
        totalVenues: venues.length,
        activeVenues: venues.filter(v => v.active !== false).length
      }
    } catch (error) {
      console.error('Error getting venue stats:', error)
      return {
        totalVenues: 0,
        activeVenues: 0
      }
    }
  }

  static async getCustomerStats() {
    try {
      const customers = await this.getCustomers()
      
      return {
        totalCustomers: customers.length,
        recentCustomers: customers
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          .slice(0, 5)
      }
    } catch (error) {
      console.error('Error getting customer stats:', error)
      return {
        totalCustomers: 0,
        recentCustomers: []
      }
    }
  }

  // Alternative method name that might be called
  static async getStats() {
    return this.getDashboardStats()
}
