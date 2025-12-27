import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore'
import { db, storage } from '@/lib/firebase'
import { ref, deleteObject, listAll } from 'firebase/storage'

// Helper to check if code is running in browser (prevents SSR/build-time Firebase calls)
const isBrowser = typeof window !== 'undefined'

// Deep clean undefined values from objects
const deepCleanUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj

  const cleaned = Array.isArray(obj) ? [...obj] : { ...obj }
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) {
      delete cleaned[key]
    } else if (typeof cleaned[key] === 'object' && cleaned[key] !== null) {
      cleaned[key] = deepCleanUndefined(cleaned[key])
    }
  })
  return cleaned
}

export class AdminService {

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

  // ============ LAYOUTS ============
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

  static async createLayout(layoutData: any): Promise<string> {
    try {
      const layoutsRef = collection(db, 'layouts')
      const docRef = await addDoc(layoutsRef, {
        venueId: layoutData.venueId || '',
        name: layoutData.name || 'Unnamed Layout',
        type: layoutData.type || 'seating_chart',
        sections: layoutData.sections || [],
        gaLevels: layoutData.gaLevels || [],
        totalCapacity: layoutData.totalCapacity || 0,
        configuration: layoutData.configuration || {},
        stage: layoutData.stage || null,
        aisles: layoutData.aisles || [],
        viewBox: layoutData.viewBox || null,
        priceCategories: layoutData.priceCategories || [],
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
      const cleanData = deepCleanUndefined(layoutData)

      const updateData: any = {
        venueId: cleanData.venueId || '',
        name: cleanData.name || 'Unnamed Layout',
        type: cleanData.type || 'seating_chart',
        sections: cleanData.sections || [],
        gaLevels: cleanData.gaLevels || [],
        totalCapacity: cleanData.totalCapacity || 0,
        configuration: cleanData.configuration || {},
        stage: cleanData.stage || null,
        aisles: cleanData.aisles || [],
        viewBox: cleanData.viewBox || null,
        priceCategories: cleanData.priceCategories || [],
        updatedAt: Timestamp.now()
      }

      const layoutRef = doc(db, 'layouts', layoutId)
      await updateDoc(layoutRef, updateData)
      return true
    } catch (error) {
      console.error('Error updating layout:', error)
      throw error
    }
  }

  static async deleteLayout(layoutId: string) {
    try {
      const layoutRef = doc(db, 'layouts', layoutId)
      await deleteDoc(layoutRef)
      return true
    } catch (error) {
      console.error('Error deleting layout:', error)
      throw error
    }
  }

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

  static async getEvent(eventId: string) {
    console.log(`[ADMIN SERVICE] Fetching event: ${eventId}`)
    try {
      const eventRef = doc(db, 'events', eventId)
      const eventDoc = await getDoc(eventRef)
      if (eventDoc.exists()) {
        const eventData = { id: eventDoc.id, ...eventDoc.data() }
        console.log(`[ADMIN SERVICE] Successfully fetched event:`, eventData)
        return eventData
      }
      console.log(`[ADMIN SERVICE] Event not found: ${eventId}`)
      return null
    } catch (error) {
      console.error(`[ADMIN SERVICE] Error fetching event: ${eventId}`, error)
      return null
    }
  }

  static async createEvent(eventData: any) {
    try {
      const cleanData = deepCleanUndefined(eventData)

      const eventsRef = collection(db, 'events')
      const docRef = await addDoc(eventsRef, {
        ...cleanData,
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
      const cleanData = deepCleanUndefined(eventData)

      const eventRef = doc(db, 'events', eventId)
      await updateDoc(eventRef, {
        ...cleanData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error('Error updating event:', error)
      throw error
    }
  }

  /**
   * Check if an event has any orders
   */
  static async checkEventOrders(eventId: string): Promise<{ hasOrders: boolean; orderCount: number }> {
    try {
      const ordersRef = collection(db, 'orders')
      const q = query(ordersRef, where('eventId', '==', eventId))
      const snapshot = await getDocs(q)

      return {
        hasOrders: snapshot.size > 0,
        orderCount: snapshot.size
      }
    } catch (error) {
      console.error('Error checking event orders:', error)
      throw error
    }
  }

  /**
   * Delete an event - performs soft delete if orders exist, hard delete otherwise
   * Hard delete also cleans up:
   * - Images from Firebase Storage
   * - Seat holds from seat_holds collection
   * - Any other related data
   */
  static async deleteEvent(eventId: string, userId?: string): Promise<{ type: 'hard' | 'soft'; orderCount?: number }> {
    try {
      // First, check if event has orders
      const orderCheck = await this.checkEventOrders(eventId)

      if (orderCheck.hasOrders) {
        // Soft delete - just mark as deleted but preserve data for order history
        const eventRef = doc(db, 'events', eventId)
        await updateDoc(eventRef, {
          status: 'deleted',
          deletedAt: Timestamp.now(),
          deletedBy: userId || 'unknown',
          updatedAt: Timestamp.now()
        })

        console.log(`[AdminService] Soft deleted event ${eventId} (has ${orderCheck.orderCount} orders)`)
        return { type: 'soft', orderCount: orderCheck.orderCount }
      }

      // Hard delete - no orders, safe to permanently delete everything

      // 1. Get event data first (to get image URLs)
      const eventRef = doc(db, 'events', eventId)
      const eventDoc = await getDoc(eventRef)
      const eventData = eventDoc.exists() ? eventDoc.data() : null

      // 2. Delete images from Firebase Storage
      if (eventData) {
        await this.deleteEventImages(eventData)
      }

      // 3. Delete seat holds for this event
      await this.deleteEventSeatHolds(eventId)

      // 4. Delete the event document
      await deleteDoc(eventRef)

      console.log(`[AdminService] Hard deleted event ${eventId} and all associated data`)
      return { type: 'hard' }
    } catch (error) {
      console.error('Error deleting event:', error)
      throw error
    }
  }

  /**
   * Delete all images associated with an event from Firebase Storage
   */
  private static async deleteEventImages(eventData: any): Promise<void> {
    try {
      const imagesToDelete: string[] = []

      // Collect all image URLs from event data
      if (eventData.basics?.images) {
        const images = eventData.basics.images
        if (images.cover) imagesToDelete.push(images.cover)
        if (images.thumbnail) imagesToDelete.push(images.thumbnail)
        if (images.gallery && Array.isArray(images.gallery)) {
          imagesToDelete.push(...images.gallery)
        }
      }

      // Also check legacy image fields
      if (eventData.imageUrl) imagesToDelete.push(eventData.imageUrl)
      if (eventData.posterUrl) imagesToDelete.push(eventData.posterUrl)
      if (eventData.bannerUrl) imagesToDelete.push(eventData.bannerUrl)

      // Delete each image from storage
      for (const imageUrl of imagesToDelete) {
        try {
          // Only delete if it's a Firebase Storage URL
          if (imageUrl && imageUrl.includes('firebasestorage.googleapis.com')) {
            // Extract the path from the Firebase Storage URL
            // URLs look like: https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Fto%2Ffile?token=xxx
            const urlObj = new URL(imageUrl)
            const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/)
            if (pathMatch) {
              const encodedPath = pathMatch[1].split('?')[0]
              const storagePath = decodeURIComponent(encodedPath)
              const storageRef = ref(storage, storagePath)
              await deleteObject(storageRef)
              console.log(`[AdminService] Deleted image: ${storagePath}`)
            }
          }
        } catch (imgError: any) {
          // Log but don't fail if image deletion fails (might already be deleted)
          if (imgError.code !== 'storage/object-not-found') {
            console.warn(`[AdminService] Failed to delete image: ${imageUrl}`, imgError.message)
          }
        }
      }
    } catch (error) {
      console.error('Error deleting event images:', error)
      // Don't throw - image cleanup failure shouldn't prevent event deletion
    }
  }

  /**
   * Delete all seat holds for an event
   */
  private static async deleteEventSeatHolds(eventId: string): Promise<void> {
    try {
      const holdsRef = collection(db, 'seat_holds')
      const q = query(holdsRef, where('eventId', '==', eventId))
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        return
      }

      // Use batch delete for efficiency
      const batch = writeBatch(db)
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref)
      })
      await batch.commit()

      console.log(`[AdminService] Deleted ${snapshot.size} seat holds for event ${eventId}`)
    } catch (error) {
      console.error('Error deleting seat holds:', error)
      // Don't throw - seat hold cleanup failure shouldn't prevent event deletion
    }
  }

  // ============ ORDERS ============
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

  static async getOrdersByEventId(eventId: string) {
    try {
      const ordersRef = collection(db, 'orders')
      const q = query(ordersRef, where('eventId', '==', eventId))
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching orders for event:', error)
      return []
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

  // ============ PROMOTERS ============
  static async getPromoters() {
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
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      return userData.uid
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  }

  static async updateUser(userId: string, data: any) {
    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        ...data,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error('Error updating user:', error)
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
        ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
        : '0'

      const activeEvents = events.filter(event => {
        const eventDate = event.schedule?.date?.toDate?.() || event.date?.toDate?.() || new Date(0)
        return eventDate >= now
      })

      const completedEvents = events.filter(event => {
        const eventDate = event.schedule?.date?.toDate?.() || event.date?.toDate?.() || new Date(0)
        return eventDate < now
      })

      return {
        totalEvents: events.length,
        activeEvents: activeEvents.length,
        completedEvents: completedEvents.length,
        totalVenues: venues.length,
        totalOrders: orders.length,
        totalCustomers: customers.length,
        totalPromoters: promoters.length,
        monthlyRevenue,
        revenueGrowth
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      return {
        totalEvents: 0,
        activeEvents: 0,
        completedEvents: 0,
        totalVenues: 0,
        totalOrders: 0,
        totalCustomers: 0,
        totalPromoters: 0,
        monthlyRevenue: 0,
        revenueGrowth: '0'
      }
    }
  }

  // ============ PROMOTIONS (Alias for dashboard compatibility) ============
  static async getPromotions() {
    return this.getPromoters()
  }

  // ============ ORDER STATS (for dashboard) ============
  static async getOrderStats() {
    try {
      const orders = await this.getOrders()
      return {
        confirmed: orders.filter((o: any) => o.status === 'confirmed').length,
        pending: orders.filter((o: any) => o.status === 'pending').length,
        cancelled: orders.filter((o: any) => o.status === 'cancelled').length
      }
    } catch (error) {
      console.error('Error getting order stats:', error)
      return { confirmed: 0, pending: 0, cancelled: 0 }
    }
  }
}
