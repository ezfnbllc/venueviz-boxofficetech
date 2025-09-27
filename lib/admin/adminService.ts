import {db} from '@/lib/firebase'
import {
  collection,getDocs,getDoc,doc,addDoc,updateDoc,deleteDoc,
  query,orderBy,limit,where,Timestamp
} from 'firebase/firestore'

export class AdminService {
  // Events
  static async getEvents() {
    const q = query(collection(db, 'events'), orderBy('date', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))
  }

  static async createEvent(data: any) {
    const eventData = {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: 'active'
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

  // Venues
  static async getVenues() {
    const snapshot = await getDocs(collection(db, 'venues'))
    return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))
  }

  static async createVenue(data: any) {
    const venueData = {
      ...data,
      createdAt: Timestamp.now(),
      status: 'active'
    }
    return await addDoc(collection(db, 'venues'), venueData)
  }

  static async updateVenue(id: string, data: any) {
    await updateDoc(doc(db, 'venues', id), data)
  }

  // Orders
  static async getOrders() {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))
  }

  static async getOrderStats() {
    const orders = await this.getOrders()
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0)
    const totalTickets = orders.reduce((sum, order) => sum + (order.seats?.length || 0), 0)
    return {
      totalOrders: orders.length,
      totalRevenue,
      totalTickets,
      avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0
    }
  }

  // Customers
  static async getCustomers() {
    const orders = await this.getOrders()
    const customersMap = new Map()
    orders.forEach(order => {
      if (order.customerEmail) {
        if (!customersMap.has(order.customerEmail)) {
          customersMap.set(order.customerEmail, {
            email: order.customerEmail,
            name: order.customerName,
            orders: [],
            totalSpent: 0
          })
        }
        const customer = customersMap.get(order.customerEmail)
        customer.orders.push(order)
        customer.totalSpent += order.total || 0
      }
    })
    return Array.from(customersMap.values())
  }

  // Promotions
  static async getPromotions() {
    const snapshot = await getDocs(collection(db, 'promotions'))
    return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))
  }

  static async createPromotion(data: any) {
    const promoData = {
      ...data,
      createdAt: Timestamp.now(),
      usageCount: 0,
      status: 'active'
    }
    return await addDoc(collection(db, 'promotions'), promoData)
  }

  // Dashboard Stats
  static async getDashboardStats() {
    const [events, venues, orders, promotions] = await Promise.all([
      this.getEvents(),
      this.getVenues(),
      this.getOrders(),
      this.getPromotions()
    ])

    const orderStats = await this.getOrderStats()
    const customers = await this.getCustomers()

    return {
      events: events.length,
      venues: venues.length,
      orders: orders.length,
      customers: customers.length,
      promotions: promotions.length,
      revenue: orderStats.totalRevenue,
      tickets: orderStats.totalTickets,
      avgOrderValue: orderStats.avgOrderValue,
      recentOrders: orders.slice(0, 10)
    }
  }
}
