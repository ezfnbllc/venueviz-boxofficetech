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

// Helper to check if code is running in browser (prevents SSR/build-time Firebase calls)
const isBrowser = typeof window !== 'undefined'

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
      // Remove undefined values that Firebase doesn't accept
      const cleanData = JSON.parse(JSON.stringify(layoutData))
      
      // Ensure all required fields have values
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
      
      // Remove null values if not needed
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })
      
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
      // Remove undefined values that Firebase doesn't accept
      const cleanData = JSON.parse(JSON.stringify(eventData))

      // Deep clean undefined values
      const deepClean = (obj: any) => {
        Object.keys(obj).forEach(key => {
          if (obj[key] === undefined) {
            delete obj[key]
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            deepClean(obj[key])
          }
        })
      }
      deepClean(cleanData)

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

  // Import sanitizeEventData at the top of the file if not already present
  static async updateEvent(eventId: string, eventData: any) {
    try {
      // Remove undefined values that Firebase doesnt accept
      const cleanData = JSON.parse(JSON.stringify(eventData))
      
      // Ensure no undefined values exist
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key]
        }
        if (typeof cleanData[key] === "object" && cleanData[key] !== null) {
          Object.keys(cleanData[key]).forEach(subKey => {
            if (cleanData[key][subKey] === undefined) {
              delete cleanData[key][subKey]
            }
          })
        }
      })
      
      const eventRef = doc(db, "events", eventId)
      await updateDoc(eventRef, {
        ...cleanData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error("Error updating event:", error)
      throw error
    }
  }
  static async updateEvent(eventId: string, eventData: any) {
    try {
      // Remove undefined values that Firebase doesnt accept
      const cleanData = JSON.parse(JSON.stringify(eventData))
      
      // Ensure no undefined values exist
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key]
        }
        if (typeof cleanData[key] === "object" && cleanData[key] !== null) {
          Object.keys(cleanData[key]).forEach(subKey => {
            if (cleanData[key][subKey] === undefined) {
              delete cleanData[key][subKey]
            }
          })
        }
      })
      
      const eventRef = doc(db, "events", eventId)
      await updateDoc(eventRef, {
        ...cleanData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error("Error updating event:", error)
      throw error
    }
  }
  static async updateEvent(eventId: string, eventData: any) {
    try {
      // Remove undefined values that Firebase doesnt accept
      const cleanData = JSON.parse(JSON.stringify(eventData))
      
      // Ensure no undefined values exist
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key]
        }
        if (typeof cleanData[key] === "object" && cleanData[key] !== null) {
          Object.keys(cleanData[key]).forEach(subKey => {
            if (cleanData[key][subKey] === undefined) {
              delete cleanData[key][subKey]
            }
          })
        }
      })
      
      const eventRef = doc(db, "events", eventId)
      await updateDoc(eventRef, {
        ...cleanData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error("Error updating event:", error)
      throw error
    }
  }
  static async updateEvent(eventId: string, eventData: any) {
    try {
      // Remove undefined values that Firebase doesnt accept
      const cleanData = JSON.parse(JSON.stringify(eventData))
      
      // Ensure no undefined values exist
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key]
        }
        if (typeof cleanData[key] === "object" && cleanData[key] !== null) {
          Object.keys(cleanData[key]).forEach(subKey => {
            if (cleanData[key][subKey] === undefined) {
              delete cleanData[key][subKey]
            }
          })
        }
      })
      
      const eventRef = doc(db, "events", eventId)
      await updateDoc(eventRef, {
        ...cleanData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error("Error updating event:", error)
      throw error
    }
  }
  static async updateEvent(eventId: string, eventData: any) {
    try {
      // Remove undefined values that Firebase doesnt accept
      const cleanData = JSON.parse(JSON.stringify(eventData))
      
      // Ensure no undefined values exist
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key]
        }
        if (typeof cleanData[key] === "object" && cleanData[key] !== null) {
          Object.keys(cleanData[key]).forEach(subKey => {
            if (cleanData[key][subKey] === undefined) {
              delete cleanData[key][subKey]
            }
          })
        }
      })
      
      const eventRef = doc(db, "events", eventId)
      await updateDoc(eventRef, {
        ...cleanData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error("Error updating event:", error)
      throw error
    }
  }
  static async updateEvent(eventId: string, eventData: any) {
    try {
      // Remove undefined values that Firebase doesnt accept
      const cleanData = JSON.parse(JSON.stringify(eventData))
      
      // Ensure no undefined values exist
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key]
        }
        if (typeof cleanData[key] === "object" && cleanData[key] !== null) {
          Object.keys(cleanData[key]).forEach(subKey => {
            if (cleanData[key][subKey] === undefined) {
              delete cleanData[key][subKey]
            }
          })
        }
      })
      
      const eventRef = doc(db, "events", eventId)
      await updateDoc(eventRef, {
        ...cleanData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error("Error updating event:", error)
      throw error
    }
  }
  static async updateEvent(eventId: string, eventData: any) {
    try {
      // Remove undefined values that Firebase doesnt accept
      const cleanData = JSON.parse(JSON.stringify(eventData))
      
      // Ensure no undefined values exist
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key]
        }
        if (typeof cleanData[key] === "object" && cleanData[key] !== null) {
          Object.keys(cleanData[key]).forEach(subKey => {
            if (cleanData[key][subKey] === undefined) {
              delete cleanData[key][subKey]
            }
          })
        }
      })
      
      const eventRef = doc(db, "events", eventId)
      await updateDoc(eventRef, {
        ...cleanData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error("Error updating event:", error)
      throw error
    }
  }
  static async updateEvent(eventId: string, eventData: any) {
    try {
      // Remove undefined values that Firebase doesnt accept
      const cleanData = JSON.parse(JSON.stringify(eventData))
      
      // Ensure no undefined values exist
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key]
        }
        if (typeof cleanData[key] === "object" && cleanData[key] !== null) {
          Object.keys(cleanData[key]).forEach(subKey => {
            if (cleanData[key][subKey] === undefined) {
              delete cleanData[key][subKey]
            }
          })
        }
      })
      
      const eventRef = doc(db, "events", eventId)
      await updateDoc(eventRef, {
        ...cleanData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error("Error updating event:", error)
      throw error
    }
  }
  static async updateEvent(eventId: string, eventData: any) {
    try {
      // Remove undefined values that Firebase doesnt accept
      const cleanData = JSON.parse(JSON.stringify(eventData))
      
      // Ensure no undefined values exist
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key]
        }
        if (typeof cleanData[key] === "object" && cleanData[key] !== null) {
          Object.keys(cleanData[key]).forEach(subKey => {
            if (cleanData[key][subKey] === undefined) {
              delete cleanData[key][subKey]
            }
          })
        }
      })
      
      const eventRef = doc(db, "events", eventId)
      await updateDoc(eventRef, {
        ...cleanData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error("Error updating event:", error)
      throw error
    }
  }
  static async updateEvent(eventId: string, eventData: any) {
    try {
      // Remove undefined values that Firebase doesnt accept
      const cleanData = JSON.parse(JSON.stringify(eventData))
      
      // Ensure no undefined values exist
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key]
        }
        if (typeof cleanData[key] === "object" && cleanData[key] !== null) {
          Object.keys(cleanData[key]).forEach(subKey => {
            if (cleanData[key][subKey] === undefined) {
              delete cleanData[key][subKey]
            }
          })
        }
      })
      
      const eventRef = doc(db, "events", eventId)
      await updateDoc(eventRef, {
        ...cleanData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error("Error updating event:", error)
      throw error
    }
  }
  static async updateEvent(eventId: string, eventData: any) {
    try {
      // Remove undefined values that Firebase doesnt accept
      const cleanData = JSON.parse(JSON.stringify(eventData))
      
      // Ensure no undefined values exist
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key]
        }
        if (typeof cleanData[key] === "object" && cleanData[key] !== null) {
          Object.keys(cleanData[key]).forEach(subKey => {
            if (cleanData[key][subKey] === undefined) {
              delete cleanData[key][subKey]
            }
          })
        }
      })
      
      const eventRef = doc(db, "events", eventId)
      await updateDoc(eventRef, {
        ...cleanData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error("Error updating event:", error)
      throw error
    }
  }
  static async updateEvent(eventId: string, eventData: any) {
    try {
      // Remove undefined values that Firebase doesnt accept
      const cleanData = JSON.parse(JSON.stringify(eventData))
      
      // Ensure no undefined values exist
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key]
        }
        if (typeof cleanData[key] === "object" && cleanData[key] !== null) {
          Object.keys(cleanData[key]).forEach(subKey => {
            if (cleanData[key][subKey] === undefined) {
              delete cleanData[key][subKey]
            }
          })
        }
      })
      
      const eventRef = doc(db, "events", eventId)
      await updateDoc(eventRef, {
        ...cleanData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error("Error updating event:", error)
      throw error
    }
  }
  static async updateEvent(eventId: string, eventData: any) {
    try {
      // Remove undefined values that Firebase doesnt accept
      const cleanData = JSON.parse(JSON.stringify(eventData))
      
      // Ensure no undefined values exist
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key]
        }
        if (typeof cleanData[key] === "object" && cleanData[key] !== null) {
          Object.keys(cleanData[key]).forEach(subKey => {
            if (cleanData[key][subKey] === undefined) {
              delete cleanData[key][subKey]
            }
          })
        }
      })
      
      const eventRef = doc(db, "events", eventId)
      await updateDoc(eventRef, {
        ...cleanData,
        updatedAt: Timestamp.now()
      })
      return true
    } catch (error) {
      console.error("Error updating event:", error)
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
    // The dashboard expects getPromotions but we have getPromoters
    // Add this method as an alias for backward compatibility
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
