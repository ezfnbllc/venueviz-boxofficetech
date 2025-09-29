import { db } from '@/lib/firebase'
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
  Timestamp
} from 'firebase/firestore'

export class AdminService {
  // Helper function to clean undefined values from objects
  static cleanUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanUndefinedValues(item))
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {}
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key]
          if (value !== undefined) {
            cleaned[key] = this.cleanUndefinedValues(value)
          }
        }
      }
      return cleaned
    }
    
    return obj
  }

  // Venue Methods
  static async getVenues() {
    try {
      const querySnapshot = await getDocs(collection(db, 'venues'))
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching venues:', error)
      return []
    }
  }

  static async createVenue(data: any) {
    const venueData = {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
    const docRef = await addDoc(collection(db, 'venues'), venueData)
    return docRef.id
  }

  static async updateVenue(id: string, data: any) {
    await updateDoc(doc(db, 'venues', id), {
      ...data,
      updatedAt: Timestamp.now()
    })
  }

  static async deleteVenue(id: string) {
    await deleteDoc(doc(db, 'venues', id))
  }

  // Event Methods
  static async getEvents() {
    try {
      const querySnapshot = await getDocs(collection(db, 'events'))
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching events:', error)
      return []
    }
  }

  static async createEvent(data: any) {
    const eventData = {
      ...data,
      analytics: {
        views: 0,
        ticketsSold: 0,
        revenue: 0,
        lastUpdated: Timestamp.now()
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
    const docRef = await addDoc(collection(db, 'events'), eventData)
    return docRef.id
  }

  static async updateEvent(id: string, data: any) {
    await updateDoc(doc(db, 'events', id), {
      ...data,
      updatedAt: Timestamp.now()
    })
  }

  static async deleteEvent(id: string) {
    await deleteDoc(doc(db, 'events', id))
  }

  static async getEvent(id: string) {
    const docSnap = await getDoc(doc(db, 'events', id))
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() }
    }
    return null
  }

  // Layout Methods
  static async getLayoutsByVenueId(venueId: string) {
    try {
      const q = query(collection(db, 'layouts'), where('venueId', '==', venueId))
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching layouts by venue:', error)
      return []
    }
  }

  static async getLayouts() {
    try {
      const querySnapshot = await getDocs(collection(db, 'layouts'))
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching layouts:', error)
      return []
    }
  }

  static async createLayout(data: any): Promise<string> {
    const cleanedSections = (data.sections || []).map((section: any) => ({
      id: section.id || `section-${Date.now()}-${Math.random()}`,
      name: section.name || 'Unnamed Section',
      x: section.x || 0,
      y: section.y || 0,
      rows: section.rows || 0,
      seatsPerRow: section.seatsPerRow || 0,
      seats: (section.seats || []).map((seat: any) => ({
        id: seat.id || `seat-${Date.now()}-${Math.random()}`,
        row: seat.row || 'A',
        number: seat.number || 1,
        x: seat.x || 0,
        y: seat.y || 0,
        status: seat.status || 'available',
        price: seat.price || 0,
        category: seat.category || 'standard',
        isAccessible: seat.isAccessible || false,
        angle: seat.angle || 0
      })),
      pricing: section.pricing || 'standard',
      rotation: section.rotation || 0,
      rowPricing: section.rowPricing || {},
      seatsByRow: section.seatsByRow || {},
      curveRadius: section.curveRadius || 0,
      curveAngle: section.curveAngle || 0,
      curveRotation: section.curveRotation || 0,
      sectionType: section.sectionType || 'standard',
      rowAlignment: section.rowAlignment || 'center'
    }))
    
    const cleanedPriceCategories = (data.priceCategories || []).map((cat: any) => ({
      id: cat.id || `cat-${Date.now()}`,
      name: cat.name || 'Unnamed',
      color: cat.color || '#000000',
      price: cat.price || 0
    }))
    
    const layoutData = {
      venueId: data.venueId || '',
      name: data.name || 'Unnamed Layout',
      type: data.type || 'seating_chart',
      sections: cleanedSections,
      gaLevels: data.gaLevels || [],
      totalCapacity: data.totalCapacity || 0,
      configuration: data.configuration || { version: '2.0', format: 'svg' },
      stage: {
        x: data.stage?.x || 400,
        y: data.stage?.y || 50,
        width: data.stage?.width || 400,
        height: data.stage?.height || 60,
        label: data.stage?.label || 'STAGE',
        type: 'stage'
      },
      aisles: data.aisles || [],
      viewBox: {
        x: data.viewBox?.x || 0,
        y: data.viewBox?.y || 0,
        width: data.viewBox?.width || 1200,
        height: data.viewBox?.height || 800
      },
      priceCategories: cleanedPriceCategories,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
    
    const finalCleanedData = this.cleanUndefinedValues(layoutData)
    const docRef = await addDoc(collection(db, 'layouts'), finalCleanedData)
    return docRef.id
  }

  static async updateLayout(id: string, data: any) {
    const cleanedSections = (data.sections || []).map((section: any) => ({
      id: section.id || `section-${Date.now()}-${Math.random()}`,
      name: section.name || 'Unnamed Section',
      x: section.x || 0,
      y: section.y || 0,
      rows: section.rows || 0,
      seatsPerRow: section.seatsPerRow || 0,
      seats: (section.seats || []).map((seat: any) => ({
        id: seat.id || `seat-${Date.now()}-${Math.random()}`,
        row: seat.row || 'A',
        number: seat.number || 1,
        x: seat.x || 0,
        y: seat.y || 0,
        status: seat.status || 'available',
        price: seat.price || 0,
        category: seat.category || 'standard',
        isAccessible: seat.isAccessible === true,
        angle: seat.angle || 0
      })),
      pricing: section.pricing || 'standard',
      rotation: section.rotation || 0,
      rowPricing: section.rowPricing || {},
      seatsByRow: section.seatsByRow || {},
      curveRadius: section.curveRadius || 0,
      curveAngle: section.curveAngle || 0,
      curveRotation: section.curveRotation || 0,
      sectionType: section.sectionType || 'standard',
      rowAlignment: section.rowAlignment || 'center'
    }))
    
    const cleanedPriceCategories = (data.priceCategories || []).map((cat: any) => ({
      id: cat.id || `cat-${Date.now()}`,
      name: cat.name || 'Unnamed',
      color: cat.color || '#000000',
      price: cat.price || 0
    }))
    
    const updateData = {
      venueId: data.venueId || '',
      name: data.name || 'Unnamed Layout',
      type: data.type || 'seating_chart',
      sections: cleanedSections,
      gaLevels: data.gaLevels || [],
      totalCapacity: data.totalCapacity || 0,
      configuration: data.configuration || { version: '2.0', format: 'svg' },
      stage: {
        x: data.stage?.x || 400,
        y: data.stage?.y || 50,
        width: data.stage?.width || 400,
        height: data.stage?.height || 60,
        label: data.stage?.label || 'STAGE',
        type: 'stage'
      },
      aisles: data.aisles || [],
      viewBox: {
        x: data.viewBox?.x || 0,
        y: data.viewBox?.y || 0,
        width: data.viewBox?.width || 1200,
        height: data.viewBox?.height || 800
      },
      priceCategories: cleanedPriceCategories,
      updatedAt: Timestamp.now()
    }
    
    const finalCleanedData = this.cleanUndefinedValues(updateData)
    await updateDoc(doc(db, 'layouts', id), finalCleanedData)
  }

  static async deleteLayout(id: string) {
    await deleteDoc(doc(db, 'layouts', id))
  }

  static async getLayout(id: string) {
    const docSnap = await getDoc(doc(db, 'layouts', id))
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() }
    }
    return null
  }

  // Order Methods
  static async getOrders() {
    try {
      const querySnapshot = await getDocs(collection(db, 'orders'))
      return querySnapshot.docs.map(doc => ({
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
      const q = query(collection(db, 'orders'), where('eventId', '==', eventId))
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching orders by event:', error)
      return []
    }
  }

  static async getOrderStats() {
    try {
      const orders = await this.getOrders()
      
      const totalRevenue = orders.reduce((sum, order) => {
        const orderRevenue = 
          order.pricing?.total || 
          order.totalAmount || 
          order.total ||
          (order.tickets || []).reduce((ticketSum: number, ticket: any) => {
            return ticketSum + (ticket.price || ticket.ticketPrice || 0)
          }, 0)
        
        return sum + (orderRevenue || 0)
      }, 0)
      
      const totalOrders = orders.length
      const completedOrders = orders.filter(o => 
        o.status === 'confirmed' || o.status === 'completed' || o.paymentStatus === 'paid'
      ).length
      const pendingOrders = orders.filter(o => 
        o.status === 'pending' || o.paymentStatus === 'pending'
      ).length
      
      return {
        totalRevenue,
        totalOrders,
        completedOrders,
        pendingOrders,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
      }
    } catch (error) {
      console.error('Error calculating order stats:', error)
      return {
        totalRevenue: 0,
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        averageOrderValue: 0
      }
    }
  }

  static async createOrder(data: any) {
    const orderData = {
      ...data,
      orderNumber: `ORD-${Date.now()}`,
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
    const docRef = await addDoc(collection(db, 'orders'), orderData)
    return docRef.id
  }

  static async updateOrder(id: string, data: any) {
    await updateDoc(doc(db, 'orders', id), {
      ...data,
      updatedAt: Timestamp.now()
    })
  }

  // Ticket Methods
  static async getTicketsByEventId(eventId: string) {
    try {
      const q = query(collection(db, 'tickets'), where('eventId', '==', eventId))
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching tickets:', error)
      return []
    }
  }

  static async createTicket(data: any) {
    const ticketData = {
      ...data,
      qrCode: `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      barcode: `BAR-${Date.now()}`,
      status: 'reserved',
      validation: {
        isUsed: false,
        usedAt: null,
        scannedBy: null,
        entryGate: null
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
    const docRef = await addDoc(collection(db, 'tickets'), ticketData)
    return docRef.id
  }

  static async updateTicket(id: string, data: any) {
    await updateDoc(doc(db, 'tickets', id), {
      ...data,
      updatedAt: Timestamp.now()
    })
  }

  // Customer Methods
  static async getCustomers() {
    try {
      const querySnapshot = await getDocs(collection(db, 'customers'))
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching customers:', error)
      return []
    }
  }

  static async createCustomer(data: any) {
    const customerData = {
      ...data,
      loyalty: {
        points: 0,
        tier: 'bronze',
        memberSince: Timestamp.now(),
        lifetimeValue: 0
      },
      analytics: {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        lastOrderDate: null,
        favoriteCategory: null
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
    const docRef = await addDoc(collection(db, 'customers'), customerData)
    return docRef.id
  }

  static async updateCustomer(id: string, data: any) {
    await updateDoc(doc(db, 'customers', id), {
      ...data,
      updatedAt: Timestamp.now()
    })
  }

  // Promotions Methods
  static async getPromotions() {
    try {
      const querySnapshot = await getDocs(collection(db, 'promotions'))
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching promotions:', error)
      return []
    }
  }

  static async createPromotion(data: any) {
    const promotionData = {
      ...data,
      usedCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
    const docRef = await addDoc(collection(db, 'promotions'), promotionData)
    return docRef.id
  }

  static async updatePromotion(id: string, data: any) {
    await updateDoc(doc(db, 'promotions', id), {
      ...data,
      updatedAt: Timestamp.now()
    })
  }

  static async deletePromotion(id: string) {
    await deleteDoc(doc(db, 'promotions', id))
  }

  // Promoters Methods
  static async getPromoters() {
    try {
      const querySnapshot = await getDocs(collection(db, 'promoters'))
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching promoters:', error)
      return []
    }
  }

  static async createPromoter(data: any) {
    const promoterData = {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
    const docRef = await addDoc(collection(db, 'promoters'), promoterData)
    return docRef.id
  }

  static async updatePromoter(id: string, data: any) {
    await updateDoc(doc(db, 'promoters', id), {
      ...data,
      updatedAt: Timestamp.now()
    })
  }

  static async deletePromoter(id: string) {
    await deleteDoc(doc(db, 'promoters', id))
  }

  // Report Methods
  static async generateReport(type: string, filters: any) {
    const reportData = {
      name: `${type}_report_${Date.now()}`,
      type,
      filters,
      data: {
        summary: {},
        breakdown: {},
        chartData: {}
      },
      createdAt: Timestamp.now()
    }
    const docRef = await addDoc(collection(db, 'reports'), reportData)
    return docRef.id
  }

  // Settings Methods
  static async getSettings() {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'global'))
      if (docSnap.exists()) {
        return docSnap.data()
      }
      return {
        system: {
          maintenanceMode: false,
          maintenanceMessage: '',
          version: '1.0.0'
        },
        features: {
          dynamicPricing: true,
          waitlist: true,
          transferable: true,
          refundable: true,
          accessible: true
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      return null
    }
  }

  static async updateSettings(data: any) {
    await updateDoc(doc(db, 'settings', 'global'), {
      ...data,
      updatedAt: Timestamp.now()
    })
  }
}
