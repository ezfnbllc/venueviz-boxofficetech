import {db, auth} from '@/lib/firebase'
import {
  collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, where, Timestamp
} from 'firebase/firestore'

export class AdminService {
  
  static async getEvents(): Promise<any[]> {
    try {
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
    await deleteDoc(doc(db, 'events', id))
  }

  static async getVenues(): Promise<any[]> {
    try {
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
      // Check if user is authenticated
      if (!auth.currentUser) {
        console.log('No authenticated user for orders')
        return []
      }

      console.log('Fetching orders for user:', auth.currentUser.email)
      const snapshot = await getDocs(collection(db, 'orders'))
      
      if (snapshot.empty) {
        console.log('No orders found in database')
        return []
      }
      
      console.log(`Found ${snapshot.size} orders`)
      
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
          eventName: data.eventName || '',
          seats: seats,
          total: total || 0,
          status: 'confirmed',
          createdAt: data.purchaseDate?.toDate?.() || data.purchaseDate || new Date()
        }
      })
    } catch (error: any) {
      console.error('Error fetching orders:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
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
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching promotions:', error)
      return []
    }
  }

  static async createPromotion(data: any) {
    return await addDoc(collection(db, 'promotions'), {
      ...data,
      createdAt: Timestamp.now()
    })
  }

  static async getPromoters(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'promoters'))
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching promoters:', error)
      return []
    }
  }
}
