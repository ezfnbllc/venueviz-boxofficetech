import {db, auth} from '@/lib/firebase'
import {
  collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, where, Timestamp
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export class AdminService {
  
  // Wait for auth to be ready
  static async waitForAuth(): Promise<any> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe()
        resolve(user)
      })
    })
  }

  static async getEvents(): Promise<any[]> {
    try {
      await this.waitForAuth()
      const snapshot = await getDocs(collection(db, 'events'))
      return snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate?.() || data.date || new Date(),
          price: data.price || 100,
          capacity: data.capacity || 500,
          venue: data.venueName || data.venue || 'Unknown Venue'
        }
      })
    } catch (error) {
      console.error('Error fetching events:', error)
      return []
    }
  }

  static async createEvent(data: any) {
    await this.waitForAuth()
    const eventData = {
      name: data.name,
      description: data.description || '',
      date: data.date ? Timestamp.fromDate(new Date(data.date)) : Timestamp.now(),
      startTime: data.time || data.startTime || '19:00',
      type: data.type || 'concert',
      venueName: data.venue || '',
      venueId: data.venueId || '',
      promoterId: 'PAqFLcCQwxUYKr7i8g5t',
      promoterName: 'BoxOfficeTech',
      price: data.price || 100,
      capacity: data.capacity || 500,
      images: [],
      performers: [],
      promotionIds: []
    }
    
    const docRef = await addDoc(collection(db, 'events'), eventData)
    return docRef.id
  }

  static async deleteEvent(id: string) {
    await this.waitForAuth()
    await deleteDoc(doc(db, 'events', id))
  }

  static async getVenues(): Promise<any[]> {
    try {
      await this.waitForAuth()
      const snapshot = await getDocs(collection(db, 'venues'))
      return snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name,
          address: `${data.streetAddress1 || ''} ${data.streetAddress2 || ''}, ${data.city || ''}, ${data.state || ''} ${data.zipCode || ''}`.trim(),
          city: data.city,
          state: data.state,
          capacity: data.capacity || 500
        }
      })
    } catch (error) {
      console.error('Error fetching venues:', error)
      return []
    }
  }

  static async getOrders(): Promise<any[]> {
    try {
      // Wait for auth to be established
      const user = await this.waitForAuth()
      
      if (!user) {
        console.log('No authenticated user for orders')
        return []
      }

      console.log('Fetching orders for:', user.email)
      
      // Try to fetch orders
      const ordersRef = collection(db, 'orders')
      const snapshot = await getDocs(ordersRef)
      
      console.log(`Orders query returned ${snapshot.size} documents`)
      
      if (snapshot.empty) {
        console.log('No orders found, checking if permission issue or truly empty')
        // Create a test order if we have permission
        try {
          const testOrder = {
            orderId: 'TEST-001',
            customerName: 'Test Customer',
            customerEmail: 'test@example.com',
            customerPhone: '555-0100',
            eventId: '0B56dDERyt2TKCldg2lS',
            eventName: 'Test Event',
            eventDate: '2025-10-01',
            tickets: [
              {ticketId: 'TKT001', section: 'Orchestra', row: 1, seat: 1, price: 150}
            ],
            paymentMethod: 'card',
            purchaseDate: Timestamp.now(),
            promoterId: 'PAqFLcCQwxUYKr7i8g5t'
          }
          await addDoc(collection(db, 'orders'), testOrder)
          console.log('Created test order successfully')
          
          // Refetch
          const newSnapshot = await getDocs(collection(db, 'orders'))
          if (!newSnapshot.empty) {
            console.log('Test order created, refetching worked')
          }
        } catch (createError: any) {
          console.log('Cannot create test order:', createError.message)
        }
        
        return []
      }
      
      return snapshot.docs.map(doc => {
        const data = doc.data()
        
        let total = 0
        const seats = (data.tickets || []).map((ticket: any) => {
          const price = ticket.price || ticket.ticketPrice || 100
          total += price
          return {
            section: ticket.section || 'General',
            row: ticket.row || 1,
            seat: ticket.seat || 1,
            price: price
          }
        })
        
        return {
          id: doc.id,
          orderId: data.orderId || doc.id,
          customerName: data.customerName || 'Unknown',
          customerEmail: data.customerEmail || '',
          customerPhone: data.customerPhone || '',
          eventName: data.eventName || '',
          seats: seats,
          total: total || 0,
          status: 'confirmed',
          createdAt: data.purchaseDate?.toDate?.() || data.purchaseDate || new Date()
        }
      })
    } catch (error: any) {
      console.error('Error fetching orders:', error.message)
      console.error('Error code:', error.code)
      
      // Return demo data if permission denied
      if (error.code === 'permission-denied') {
        console.log('Permission denied - check Firebase rules')
        return [{
          id: 'demo1',
          orderId: 'DEMO-001',
          customerName: 'Permission Issue - Check Firebase Rules',
          customerEmail: 'Check console for details',
          eventName: 'Update Firebase Rules',
          seats: [],
          total: 0,
          status: 'error',
          createdAt: new Date()
        }]
      }
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
    try {
      await this.waitForAuth()
      const orders = await this.getOrders()
      const customersMap = new Map()
      
      orders.forEach((order: any) => {
        if (order.customerEmail && !order.customerEmail.includes('Check console')) {
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
    } catch (error) {
      console.error('Error fetching customers:', error)
      return []
    }
  }

  static async getPromotions(): Promise<any[]> {
    try {
      await this.waitForAuth()
      const snapshot = await getDocs(collection(db, 'promotions'))
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        maxUses: doc.data().maxUses || 100,
        usageCount: doc.data().usageCount || 0,
        status: doc.data().status || 'active'
      }))
    } catch (error: any) {
      console.error('Error fetching promotions:', error.message)
      return []
    }
  }

  static async createPromotion(data: any) {
    await this.waitForAuth()
    return await addDoc(collection(db, 'promotions'), {
      ...data,
      createdAt: Timestamp.now(),
      usageCount: 0,
      status: 'active'
    })
  }

  static async getPromoters(): Promise<any[]> {
    try {
      await this.waitForAuth()
      const snapshot = await getDocs(collection(db, 'promoters'))
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error: any) {
      console.error('Error fetching promoters:', error.message)
      if (error.code === 'permission-denied') {
        // Return empty for permission issues
        console.log('No permission to read promoters - admin only')
      }
      return []
    }
  }

  static async createPromoter(data: any) {
    await this.waitForAuth()
    return await addDoc(collection(db, 'promoters'), {
      ...data,
      createdAt: Timestamp.now()
    })
  }

  static async updatePromoter(id: string, data: any) {
    await this.waitForAuth()
    await updateDoc(doc(db, 'promoters', id), data)
  }

  static async deletePromoter(id: string) {
    await this.waitForAuth()
    await deleteDoc(doc(db, 'promoters', id))
  }
}
