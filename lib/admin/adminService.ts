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

  // Layout Methods with Price Categories and New Features
  static async getLayoutsByVenueId(venueId: string) {
    const q = query(collection(db, 'layouts'), where('venueId', '==', venueId))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  }

  static async createLayout(data: any): Promise<string> {
    const layoutData = {
      venueId: data.venueId,
      name: data.name,
      type: data.type,
      sections: data.sections || [],
      gaLevels: data.gaLevels || [],
      totalCapacity: data.totalCapacity || 0,
      configuration: data.configuration || {},
      stage: data.stage,
      aisles: data.aisles || [],
      viewBox: data.viewBox,
      priceCategories: data.priceCategories || [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
    const docRef = await addDoc(collection(db, 'layouts'), layoutData)
    return docRef.id
  }

  static async updateLayout(id: string, data: any) {
    const updateData: any = {
      ...data,
      updatedAt: Timestamp.now()
    }
    await updateDoc(doc(db, 'layouts', id), updateData)
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
    // This would generate various reports based on type
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
