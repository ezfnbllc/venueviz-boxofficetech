import {db} from '@/lib/firebase'
import {
  collection, getDocs, doc, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, Timestamp
} from 'firebase/firestore'

export class AdminService {
  static async getEvents(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'events'))
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
      const snapshot = await getDocs(collection(db, 'orders'))
      
      // Map Firebase data to expected format
      return snapshot.docs.map(doc => {
        const data = doc.data()
        
        // Calculate total from tickets array
        let total = 0
        let seatCount = 0
        if (data.tickets && Array.isArray(data.tickets)) {
          seatCount = data.tickets.length
          total = data.tickets.reduce((sum: number, ticket: any) => {
            return sum + (ticket.price || ticket.ticketPrice || 0)
          }, 0)
        }
        
        return {
          id: doc.id,
          orderId: data.orderId || doc.id,
          customerName: data.customerName || 'Unknown',
          customerEmail: data.customerEmail || '',
          customerPhone: data.customerPhone || '',
          eventName: data.eventName || '',
          eventId: data.eventId || '',
          // Map tickets to seats format for compatibility
          seats: data.tickets || [],
          total: total || data.totalAmount || data.total || 0,
          status: data.status || 'confirmed',
          paymentMethod: data.paymentMethod || 'card',
          promoterId: data.promoterId || '',
          // Use purchaseDate or createdAt
          createdAt: data.purchaseDate || data.createdAt || Timestamp.now(),
          qrCode: data.qrCode || `QR-${doc.id}`
        }
      })
    } catch (error) {
      console.error('Error fetching orders:', error)
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
            phone: order.customerPhone || '',
            orders: [],
            totalSpent: 0
          })
        }
        const customer = customersMap.get(order.customerEmail)
        customer.orders.push(order)
        customer.totalSpent += order.total || 0
      }
    })
    
    return Array.from(customersMap.values()).sort((a, b) => b.totalSpent - a.totalSpent)
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
    try {
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
        recentOrders: orders.slice(0, 10).map(order => ({
          ...order,
          createdAt: order.createdAt?.toDate?.() || order.createdAt || new Date().toISOString()
        }))
      }
    } catch (error) {
      console.error('Error getting dashboard stats:', error)
      return {
        events: 0,
        venues: 0,
        orders: 0,
        customers: 0,
        promotions: 0,
        revenue: 0,
        tickets: 0,
        avgOrderValue: 0,
        recentOrders: []
      }
    }
  }
}
