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
      images: data.images || [],
      performers: data.performers || [],
      promotionIds: data.promotionIds || [],
      allowPromotionStacking: false,
      ticketPurchaseUrl: ''
    }
    
    const docRef = await addDoc(collection(db, 'events'), eventData)
    return docRef.id
  }

  static async updateEvent(id: string, data: any) {
    const updateData: any = {
      name: data.name,
      description: data.description || '',
      date: data.date ? Timestamp.fromDate(new Date(data.date)) : Timestamp.now(),
      startTime: data.time || data.startTime || '19:00',
      type: data.type || 'concert',
      venueName: data.venue || '',
      venueId: data.venueId || '',
      price: data.price || 100,
      capacity: data.capacity || 500,
      performers: data.performers || [],
      updatedAt: Timestamp.now()
    }
    
    await updateDoc(doc(db, 'events', id), updateData)
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
      console.log('Fetching orders with user:', auth.currentUser?.email)
      
      const ordersRef = collection(db, 'orders')
      const snapshot = await getDocs(ordersRef)
      
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
          customerPhone: data.customerPhone || '',
          eventName: data.eventName || '',
          seats: seats,
          total: total || 0,
          status: 'confirmed',
          createdAt: data.purchaseDate?.toDate?.() || data.purchaseDate || new Date()
        }
      })
    } catch (error: any) {
      console.error('Orders error:', error.message, error.code)
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
    } catch (error) {
      console.error('Error fetching customers:', error)
      return []
    }
  }

  static async getPromotions(): Promise<any[]> {
    try {
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
    return await addDoc(collection(db, 'promotions'), {
      ...data,
      createdAt: Timestamp.now(),
      usageCount: 0,
      status: 'active'
    })
  }

  static async getPromoters(): Promise<any[]> {
    try {
      console.log('Fetching promoters with user:', auth.currentUser?.email)
      const snapshot = await getDocs(collection(db, 'promoters'))
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error: any) {
      console.error('Promoters error:', error.message, error.code)
      return []
    }
  }
}
