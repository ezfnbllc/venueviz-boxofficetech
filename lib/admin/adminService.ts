import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  setDoc
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export class AdminService {
  // ============ EVENTS ============
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

  static async createEvent(eventData: any) {
    try {
      const eventsRef = collection(db, 'events')
      const docRef = await addDoc(eventsRef, {
        ...eventData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      return docRef.id
    } catch (error) {
      console.error('Error creating event:', error)
      throw error
    }
  }

  static async updateEvent(eventId: string, eventData: any) {
    try {
      const eventRef = doc(db, 'events', eventId)
      await updateDoc(eventRef, {
        ...eventData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error('Error updating event:', error)
      throw error
    }
  }

  static async deleteEvent(eventId: string) {
    try {
      const eventRef = doc(db, 'events', eventId)
      await deleteDoc(eventRef)
      return true
    } catch (error) {
      console.error('Error deleting event:', error)
      throw error
    }
  }

  // ============ VENUES ============
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

  static async createVenue(venueData: any) {
    try {
      const venuesRef = collection(db, 'venues')
      const docRef = await addDoc(venuesRef, {
        ...venueData,
        active: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      return docRef.id
    } catch (error) {
      console.error('Error creating venue:', error)
      throw error
    }
  }

  static async updateVenue(venueId: string, venueData: any) {
    try {
      const venueRef = doc(db, 'venues', venueId)
      await updateDoc(venueRef, {
        ...venueData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error('Error updating venue:', error)
      throw error
    }
  }

  static async deleteVenue(venueId: string) {
    try {
      const venueRef = doc(db, 'venues', venueId)
      await deleteDoc(venueRef)
      return true
    } catch (error) {
      console.error('Error deleting venue:', error)
      throw error
    }
  }

  // ============ ORDERS ============
  static async getOrders() {
    try {
      const ordersRef = collection(db, 'orders')
      // Try without orderBy first, in case there's an index issue
      const snapshot = await getDocs(ordersRef)
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Sort in JavaScript if database sorting fails
      return orders.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || a.purchaseDate?.toDate?.() || new Date(0)
        const dateB = b.createdAt?.toDate?.() || b.purchaseDate?.toDate?.() || new Date(0)
        return dateB.getTime() - dateA.getTime()
      })
    } catch (error) {
      console.error('Error fetching orders:', error)
      return []
    }
  }

  static async getOrder(orderId: string) {
    try {
      const orderRef = doc(db, 'orders', orderId)
      const orderDoc = await getDoc(orderRef)
      if (orderDoc.exists()) {
        return { id: orderDoc.id, ...orderDoc.data() }
      }
      return null
    } catch (error) {
      console.error('Error fetching order:', error)
      return null
    }
  }

  static async updateOrder(orderId: string, orderData: any) {
    try {
      const orderRef = doc(db, 'orders', orderId)
      await updateDoc(orderRef, {
        ...orderData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error('Error updating order:', error)
      throw error
    }
  }

  static async refundOrder(orderId: string, refundData: any) {
    try {
      const orderRef = doc(db, 'orders', orderId)
      await updateDoc(orderRef, {
        status: 'refunded',
        paymentStatus: 'refunded',
        refundInfo: {
          ...refundData,
          refundedAt: Timestamp.now()
        },
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error('Error refunding order:', error)
      throw error
    }
  }

  static async getOrderStats() {
    try {
      const orders = await this.getOrders()
      
      const stats = {
        totalOrders: orders.length,
        totalRevenue: 0,
        averageOrderValue: 0,
        completedOrders: 0,
        pendingOrders: 0,
        refundedOrders: 0
      }

      orders.forEach(order => {
        const amount = order.pricing?.total || order.totalAmount || order.total || 0
        stats.totalRevenue += amount
        
        if (order.status === 'completed' || order.status === 'confirmed') {
          stats.completedOrders++
        } else if (order.status === 'pending') {
          stats.pendingOrders++
        } else if (order.status === 'refunded') {
          stats.refundedOrders++
        }
      })

      stats.averageOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0

      return stats
    } catch (error) {
      console.error('Error calculating order stats:', error)
      return {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        completedOrders: 0,
        pendingOrders: 0,
        refundedOrders: 0
      }
    }
  }

  // ============ CUSTOMERS ============
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

  static async getCustomer(customerId: string) {
    try {
      const customerRef = doc(db, 'customers', customerId)
      const customerDoc = await getDoc(customerRef)
      if (customerDoc.exists()) {
        return { id: customerDoc.id, ...customerDoc.data() }
      }
      return null
    } catch (error) {
      console.error('Error fetching customer:', error)
      return null
    }
  }

  static async createCustomer(customerData: any) {
    try {
      const customersRef = collection(db, 'customers')
      
      // Check if customer already exists
      const q = query(customersRef, where('email', '==', customerData.email))
      const existing = await getDocs(q)
      
      if (!existing.empty) {
        // Update existing customer
        const existingId = existing.docs[0].id
        await this.updateCustomer(existingId, customerData)
        return existingId
      }
      
      // Create new customer
      const docRef = await addDoc(customersRef, {
        ...customerData,
        totalOrders: 0,
        totalSpent: 0,
        loyaltyPoints: 0,
        membershipTier: 'bronze',
        preferences: {
          notifications: true,
          newsletter: true,
          smsAlerts: false
        },
        tags: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      return docRef.id
    } catch (error) {
      console.error('Error creating customer:', error)
      throw error
    }
  }

  static async updateCustomer(customerId: string, customerData: any) {
    try {
      const customerRef = doc(db, 'customers', customerId)
      await updateDoc(customerRef, {
        ...customerData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error('Error updating customer:', error)
      throw error
    }
  }

  static async updateCustomerStats(email: string) {
    try {
      // Get all orders for this customer
      const ordersRef = collection(db, 'orders')
      const q = query(ordersRef, where('customerEmail', '==', email))
      const ordersSnapshot = await getDocs(q)
      
      let totalOrders = 0
      let totalSpent = 0
      let lastOrderDate = null
      
      ordersSnapshot.docs.forEach(doc => {
        const order = doc.data()
        if (order.status !== 'cancelled' && order.status !== 'refunded') {
          totalOrders++
          totalSpent += order.pricing?.total || order.totalAmount || order.total || 0
          
          const orderDate = order.purchaseDate || order.createdAt
          if (!lastOrderDate || orderDate > lastOrderDate) {
            lastOrderDate = orderDate
          }
        }
      })
      
      // Calculate membership tier
      let membershipTier = 'bronze'
      if (totalSpent >= 10000) membershipTier = 'platinum'
      else if (totalSpent >= 5000) membershipTier = 'gold'
      else if (totalSpent >= 1000) membershipTier = 'silver'
      
      // Update customer record
      const customersRef = collection(db, 'customers')
      const customerQuery = query(customersRef, where('email', '==', email))
      const customerSnapshot = await getDocs(customerQuery)
      
      if (!customerSnapshot.empty) {
        const customerId = customerSnapshot.docs[0].id
        await updateDoc(doc(db, 'customers', customerId), {
          totalOrders,
          totalSpent,
          lastOrderDate,
          membershipTier,
          updatedAt: Timestamp.now()
        })
      }
      
      return true
    } catch (error) {
      console.error('Error updating customer stats:', error)
      return false
    }
  }

  // ============ PROMOTERS ============
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

  static async getPromoter(promoterId: string) {
    try {
      const promoterRef = doc(db, 'promoters', promoterId)
      const promoterDoc = await getDoc(promoterRef)
      if (promoterDoc.exists()) {
        return { id: promoterDoc.id, ...promoterDoc.data() }
      }
      return null
    } catch (error) {
      console.error('Error fetching promoter:', error)
      return null
    }
  }

  static async createPromoter(promoterData: any) {
    try {
      const promotersRef = collection(db, 'promoters')
      const docRef = await addDoc(promotersRef, {
        ...promoterData,
        active: true,
        users: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      return docRef.id
    } catch (error) {
      console.error('Error creating promoter:', error)
      throw error
    }
  }

  static async updatePromoter(promoterId: string, promoterData: any) {
    try {
      const promoterRef = doc(db, 'promoters', promoterId)
      await updateDoc(promoterRef, {
        ...promoterData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error('Error updating promoter:', error)
      throw error
    }
  }

  static async deletePromoter(promoterId: string) {
    try {
      const promoterRef = doc(db, 'promoters', promoterId)
      await deleteDoc(promoterRef)
      return true
    } catch (error) {
      console.error('Error deleting promoter:', error)
      throw error
    }
  }

  // ============ USERS ============
  static async createUser(userData: any) {
    try {
      const userRef = doc(db, 'users', userData.uid)
      await setDoc(userRef, {
        ...userData,
        role: userData.role || 'customer',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      return userData.uid
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  }

  static async updateUser(userId: string, userData: any) {
    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        ...userData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  }

  // ============ PROMOTIONS ============
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

  static async createPromotion(promotionData: any) {
    try {
      const promotionsRef = collection(db, 'promotions')
      const docRef = await addDoc(promotionsRef, {
        ...promotionData,
        code: promotionData.code.toUpperCase(),
        usedCount: 0,
        active: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      return docRef.id
    } catch (error) {
      console.error('Error creating promotion:', error)
      throw error
    }
  }

  static async updatePromotion(promotionId: string, promotionData: any) {
    try {
      const promotionRef = doc(db, 'promotions', promotionId)
      await updateDoc(promotionRef, {
        ...promotionData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error('Error updating promotion:', error)
      throw error
    }
  }

  static async deletePromotion(promotionId: string) {
    try {
      const promotionRef = doc(db, 'promotions', promotionId)
      await deleteDoc(promotionRef)
      return true
    } catch (error) {
      console.error('Error deleting promotion:', error)
      throw error
    }
  }

  static async validatePromoCode(code: string, eventId?: string) {
    try {
      const promotionsRef = collection(db, 'promotions')
      const q = query(
        promotionsRef, 
        where('code', '==', code.toUpperCase()),
        where('active', '==', true)
      )
      const snapshot = await getDocs(q)
      
      if (snapshot.empty) {
        return { valid: false, message: 'Invalid promo code' }
      }
      
      const promo = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() }
      
      // Check expiration
      const now = Timestamp.now()
      if (promo.endDate && promo.endDate < now) {
        return { valid: false, message: 'Promo code expired' }
      }
      
      if (promo.startDate && promo.startDate > now) {
        return { valid: false, message: 'Promo code not yet active' }
      }
      
      // Check usage limits
      if (promo.maxUses && promo.usedCount >= promo.maxUses) {
        return { valid: false, message: 'Promo code usage limit reached' }
      }
      
      // Check event applicability
      if (eventId && promo.applicableEvents && promo.applicableEvents.length > 0) {
        if (!promo.applicableEvents.includes(eventId)) {
          return { valid: false, message: 'Promo code not valid for this event' }
        }
      }
      
      return { 
        valid: true, 
        promo,
        discount: {
          type: promo.type,
          value: promo.value
        }
      }
    } catch (error) {
      console.error('Error validating promo code:', error)
      return { valid: false, message: 'Error validating promo code' }
    }
  }

  static async incrementPromoUsage(promoId: string) {
    try {
      const promoRef = doc(db, 'promotions', promoId)
      const promoDoc = await getDoc(promoRef)
      
      if (promoDoc.exists()) {
        const currentCount = promoDoc.data().usedCount || 0
        await updateDoc(promoRef, {
          usedCount: currentCount + 1,
          updatedAt: Timestamp.now()
        })
      }
      
      return true
    } catch (error) {
      console.error('Error incrementing promo usage:', error)
      return false
    }
  }

  // ============ LAYOUTS ============
  static async getLayouts(venueId?: string) {
    try {
      const layoutsRef = collection(db, 'layouts')
      let q = layoutsRef as any
      
      if (venueId) {
        q = query(layoutsRef, where('venueId', '==', venueId))
      }
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching layouts:', error)
      return []
    }
  }

  // Add the missing method that venues page is calling
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

  static async createLayout(layoutData: any) {
    try {
      const layoutsRef = collection(db, 'layouts')
      const docRef = await addDoc(layoutsRef, {
        ...layoutData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      return docRef.id
    } catch (error) {
      console.error('Error creating layout:', error)
      throw error
    }
  }

  static async updateLayout(layoutId: string, layoutData: any) {
    try {
      const layoutRef = doc(db, 'layouts', layoutId)
      await updateDoc(layoutRef, {
        ...layoutData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error('Error updating layout:', error)
      throw error
    }
  }

  // ============ DASHBOARD STATS ============
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
      
      // Calculate monthly revenue
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
        activeVenues: venues.filter(v => v.active !== false).length,
        totalOrders: orders.length,
        totalCustomers: customers.length,
        totalPromoters: promoters.length,
        monthlyRevenue,
        revenueGrowth: revenueGrowth.toFixed(1)
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      return {
        totalEvents: 0,
        activeEvents: 0,
        totalVenues: 0,
        activeVenues: 0,
        totalOrders: 0,
        totalCustomers: 0,
        totalPromoters: 0,
        monthlyRevenue: 0,
        revenueGrowth: '0'
      }
    }
  }

  static async getEvent(eventId: string) {
    try {
      const eventRef = doc(db, "events", eventId)
      const eventDoc = await getDoc(eventRef)
      if (eventDoc.exists()) {
        return { id: eventDoc.id, ...eventDoc.data() }
      }
      return null
    } catch (error) {
      console.error("Error fetching event:", error)
      return null
    }
  }

  static async deleteEvent(eventId: string) {
    try {
      await deleteDoc(doc(db, 'events', eventId))
      return true
    } catch (error) {
      console.error('Error deleting event:', error)
      throw error
    }
  }
}
