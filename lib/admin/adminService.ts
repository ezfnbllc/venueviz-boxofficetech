import {db} from '@/lib/firebase'
import {
  collection, getDocs, doc, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, Timestamp
} from 'firebase/firestore'

export class AdminService {
  static async getEvents(): Promise<any[]> {
    try {
      const q = query(collection(db, 'events'), orderBy('date', 'desc'))
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))
    } catch (error) {
      console.error('Error:', error)
      return []
    }
  }

  static async createEvent(data: any) {
    const docRef = await addDoc(collection(db, 'events'), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: 'active'
    })
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

  static async getVenues(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'venues'))
      return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))
    } catch (error) {
      console.error('Error:', error)
      return []
    }
  }

  static async createVenue(data: any) {
    return await addDoc(collection(db, 'venues'), {
      ...data,
      createdAt: Timestamp.now(),
      status: 'active'
    })
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

  static async getOrders(): Promise<any[]> {
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100))
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))
    } catch (error) {
      console.error('Error:', error)
      return []
    }
  }

  static async getOrderStats() {
    const orders = await this.getOrders()
    const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.total || 0), 0)
    const totalTickets = orders.reduce((sum: number, order: any) => sum + (order.seats?.length || 0), 0)
    return {
      totalOrders: orders.length,
      totalRevenue,
      totalTickets,
      avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0
    }
  }

  static async getCustomers() {
    const orders = await this.getOrders()
    const customersMap = new Map()
    
    orders.forEach((order: any) => {
      if (order.customerEmail) {
        if (!customersMap.has(order.customerEmail)) {
          customersMap.set(order.customerEmail, {
            email: order.customerEmail,
            name: order.customerName || 'Unknown',
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

  static async getPromotions(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'promotions'))
      return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))
    } catch (error) {
      console.error('Error:', error)
      return []
    }
  }

  static async createPromotion(data: any) {
    return await addDoc(collection(db, 'promotions'), {
      ...data,
      createdAt: Timestamp.now(),
      usageCount: 0,
      status: 'active'
    })
  }

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
