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
  // Venue Methods
  static async getVenues() {
    const querySnapshot = await getDocs(collection(db, 'venues'))
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
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

  // Layout Methods with detailed logging
  static async getLayoutsByVenueId(venueId: string) {
    const q = query(collection(db, 'layouts'), where('venueId', '==', venueId))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  }

  static async createLayout(data: any): Promise<string> {
    console.log('=== CREATE LAYOUT DEBUG ===')
    console.log('Raw data received:', data)
    
    // Clean sections data
    const cleanedSections = (data.sections || []).map((section: any) => {
      const cleanedSection = {
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
      }
      
      console.log('Cleaned section:', cleanedSection)
      
      // Check for undefined values in section
      for (const [key, value] of Object.entries(cleanedSection)) {
        if (value === undefined) {
          console.error(`UNDEFINED found in section.${key}`)
        }
      }
      
      return cleanedSection
    })
    
    // Clean price categories
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
    
    console.log('Final layout data to save:', layoutData)
    
    // Deep check for undefined values
    const checkForUndefined = (obj: any, path: string = '') => {
      if (obj === undefined) {
        console.error(`UNDEFINED found at path: ${path}`)
        return true
      }
      
      if (obj && typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
          if (checkForUndefined(value, path ? `${path}.${key}` : key)) {
            return true
          }
        }
      }
      
      return false
    }
    
    if (checkForUndefined(layoutData)) {
      console.error('Found undefined values in layout data!')
    }
    
    // Clean the entire object to remove any undefined values
    const finalCleanedData = this.cleanUndefinedValues(layoutData)
    
    console.log('Final cleaned data:', finalCleanedData)
    
    try {
      const docRef = await addDoc(collection(db, 'layouts'), finalCleanedData)
      console.log('Layout saved successfully with ID:', docRef.id)
      return docRef.id
    } catch (error) {
      console.error('Firestore error details:', error)
      throw error
    }
  }

  static async updateLayout(id: string, data: any) {
    console.log('=== UPDATE LAYOUT DEBUG ===')
    console.log('Layout ID:', id)
    console.log('Raw data received:', data)
    
    // Apply same cleaning as create
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
    
    console.log('Final update data:', updateData)
    
    // Clean the entire object
    const finalCleanedData = this.cleanUndefinedValues(updateData)
    
    try {
      await updateDoc(doc(db, 'layouts', id), finalCleanedData)
      console.log('Layout updated successfully')
    } catch (error) {
      console.error('Firestore update error:', error)
      throw error
    }
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

  // Event Methods
  static async getEvents() {
    const q = query(collection(db, 'events'), orderBy('schedule.date', 'desc'))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
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

  // Order Methods
  static async getOrders() {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  }

  static async getOrdersByEventId(eventId: string) {
    const q = query(collection(db, 'orders'), where('eventId', '==', eventId))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
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
    const q = query(collection(db, 'tickets'), where('eventId', '==', eventId))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
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
    const querySnapshot = await getDocs(collection(db, 'customers'))
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
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
    const docSnap = await getDoc(doc(db, 'settings', 'global'))
    if (docSnap.exists()) {
      return docSnap.data()
    }
    return null
  }

  static async updateSettings(data: any) {
    await updateDoc(doc(db, 'settings', 'global'), {
      ...data,
      updatedAt: Timestamp.now()
    })
  }
}
