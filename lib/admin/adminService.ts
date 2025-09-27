import {db} from '@/lib/firebase'
import {
  collection, getDocs, doc, addDoc, updateDoc, deleteDoc, setDoc,
  query, orderBy, limit, where, Timestamp
} from 'firebase/firestore'

export class AdminService {
  // Seed initial data if collections are empty
  static async seedInitialData() {
    try {
      // Check if data exists
      const eventsSnap = await getDocs(collection(db, 'events'))
      if (eventsSnap.empty) {
        console.log('Seeding initial events...')
        const events = [
          {name: 'Hamilton', venue: 'Main Theater', date: '2025-09-28T19:30:00', price: 150, capacity: 500, status: 'active'},
          {name: 'The Lion King', venue: 'Grand Opera House', date: '2025-09-29T14:00:00', price: 125, capacity: 800, status: 'active'},
          {name: 'Phantom of the Opera', venue: 'Royal Theater', date: '2025-09-30T20:00:00', price: 95, capacity: 450, status: 'active'}
        ]
        for (const event of events) {
          await addDoc(collection(db, 'events'), {...event, createdAt: Timestamp.now()})
        }
      }

      const venuesSnap = await getDocs(collection(db, 'venues'))
      if (venuesSnap.empty) {
        console.log('Seeding initial venues...')
        const venues = [
          {name: 'Main Theater', address: '123 Broadway Ave', capacity: 500, sections: 3},
          {name: 'Grand Opera House', address: '456 Symphony Blvd', capacity: 800, sections: 4},
          {name: 'Royal Theater', address: '789 Performance Way', capacity: 450, sections: 3}
        ]
        for (const venue of venues) {
          await addDoc(collection(db, 'venues'), {...venue, createdAt: Timestamp.now(), status: 'active'})
        }
      }

      const ordersSnap = await getDocs(collection(db, 'orders'))
      if (ordersSnap.empty) {
        console.log('Seeding initial orders...')
        const orders = [
          {
            orderId: 'ORD-001',
            customerName: 'John Smith',
            customerEmail: 'john@example.com',
            customerPhone: '555-0100',
            seats: [{section: 'Orchestra', row: 5, seat: 10, price: 150}],
            total: 165,
            status: 'confirmed',
            qrCode: 'QR-001',
            createdAt: Timestamp.now()
          },
          {
            orderId: 'ORD-002',
            customerName: 'Sarah Johnson',
            customerEmail: 'sarah@example.com',
            customerPhone: '555-0101',
            seats: [{section: 'Mezzanine', row: 2, seat: 5, price: 100}, {section: 'Mezzanine', row: 2, seat: 6, price: 100}],
            total: 220,
            status: 'confirmed',
            qrCode: 'QR-002',
            createdAt: Timestamp.now()
          },
          {
            orderId: 'ORD-003',
            customerName: 'Mike Davis',
            customerEmail: 'mike@example.com',
            customerPhone: '555-0102',
            seats: [{section: 'Balcony', row: 1, seat: 15, price: 75}],
            total: 82.50,
            status: 'confirmed',
            qrCode: 'QR-003',
            createdAt: Timestamp.now()
          }
        ]
        for (const order of orders) {
          await addDoc(collection(db, 'orders'), order)
        }
      }
    } catch (error) {
      console.error('Error seeding data:', error)
    }
  }

  static async getEvents(): Promise<any[]> {
    try {
      await this.seedInitialData() // Ensure data exists
      const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))
    } catch (error) {
      console.error('Error fetching events:', error)
      // Return fallback data
      return [
        {id: '1', name: 'Hamilton', venue: 'Main Theater', date: '2025-09-28', price: 150, capacity: 500, status: 'active'},
        {id: '2', name: 'The Lion King', venue: 'Grand Opera House', date: '2025-09-29', price: 125, capacity: 800, status: 'active'}
      ]
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
      await this.seedInitialData()
      const snapshot = await getDocs(collection(db, 'venues'))
      return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))
    } catch (error) {
      console.error('Error fetching venues:', error)
      return [
        {id: '1', name: 'Main Theater', address: '123 Broadway Ave', capacity: 500, sections: 3},
        {id: '2', name: 'Grand Opera House', address: '456 Symphony Blvd', capacity: 800, sections: 4}
      ]
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
      await this.seedInitialData()
      const snapshot = await getDocs(collection(db, 'orders'))
      const orders = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))
      
      // Sort by createdAt if it exists
      return orders.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date()
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date()
        return dateB.getTime() - dateA.getTime()
      })
    } catch (error) {
      console.error('Error fetching orders:', error)
      // Return demo data
      return [
        {
          id: 'demo1',
          orderId: 'ORD-DEMO-001',
          customerName: 'Demo User',
          customerEmail: 'demo@example.com',
          customerPhone: '555-0000',
          seats: [{section: 'Orchestra', row: 5, seat: 10, price: 150}],
          total: 165,
          status: 'confirmed',
          createdAt: new Date().toISOString()
        }
      ]
    }
  }

  static async getOrderStats() {
    const orders = await this.getOrders()
    const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.total || 0), 0)
    const totalTickets = orders.reduce((sum: number, order: any) => sum + (order.seats?.length || 0), 0)
    return {
      totalOrders: orders.length,
      totalRevenue: totalRevenue || 0,
      totalTickets: totalTickets || 0,
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
    
    const customers = Array.from(customersMap.values())
    return customers.sort((a, b) => b.totalSpent - a.totalSpent)
  }

  static async getPromotions(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'promotions'))
      if (snapshot.empty) {
        // Create sample promotions
        const samplePromos = [
          {code: 'OPENING20', type: 'percentage', value: 20, maxUses: 100, status: 'active'},
          {code: 'SAVE10', type: 'percentage', value: 10, maxUses: 200, status: 'active'}
        ]
        for (const promo of samplePromos) {
          await addDoc(collection(db, 'promotions'), {...promo, createdAt: Timestamp.now(), usageCount: 0})
        }
        const newSnap = await getDocs(collection(db, 'promotions'))
        return newSnap.docs.map(doc => ({id: doc.id, ...doc.data()}))
      }
      return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))
    } catch (error) {
      console.error('Error fetching promotions:', error)
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
      // Return default stats
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
