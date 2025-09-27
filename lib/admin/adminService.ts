import {db} from '@/lib/firebase'
import {
  collection, getDocs, doc, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, Timestamp, where
} from 'firebase/firestore'

export class AdminService {
  // Events - matches actual schema
  static async getEvents(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'events'))
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || doc.data().date || new Date()
      }))
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
      gateOpenTime: data.gateOpenTime || '',
      type: data.type || 'concert',
      venueId: data.venueId || data.venue,
      venueName: data.venueName || data.venue,
      layoutId: data.layoutId || '',
      layoutName: data.layoutName || 'Standard',
      promoterId: data.promoterId || '',
      promoterName: data.promoterName || 'VenueViz',
      images: data.images || [],
      performers: data.performers || [],
      promotionIds: data.promotionIds || [],
      ticketPurchaseUrl: data.ticketPurchaseUrl || '',
      allowPromotionStacking: data.allowPromotionStacking || false,
      price: data.price || 100,
      capacity: data.capacity || 500
    }
    
    const docRef = await addDoc(collection(db, 'events'), eventData)
    return docRef.id
  }

  static async updateEvent(id: string, data: any) {
    const updateData: any = {...data}
    if (data.date && typeof data.date === 'string') {
      updateData.date = Timestamp.fromDate(new Date(data.date))
    }
    await updateDoc(doc(db, 'events', id), updateData)
  }

  static async deleteEvent(id: string) {
    await deleteDoc(doc(db, 'events', id))
  }

  // Venues - matches actual schema
  static async getVenues(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'venues'))
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        address: `${doc.data().streetAddress1 || ''} ${doc.data().streetAddress2 || ''}, ${doc.data().city || ''}, ${doc.data().state || ''} ${doc.data().zipCode || ''}`.trim(),
        capacity: doc.data().capacity || 500,
        sections: doc.data().sections || 3
      }))
    } catch (error) {
      console.error('Error fetching venues:', error)
      return []
    }
  }

  static async createVenue(data: any) {
    const venueData = {
      name: data.name,
      streetAddress1: data.streetAddress1 || data.address || '',
      streetAddress2: data.streetAddress2 || '',
      city: data.city || 'Dallas',
      state: data.state || 'TX',
      zipCode: data.zipCode || '75001',
      latitude: data.latitude || 32.7767,
      longitude: data.longitude || -96.7970,
      imageUrl: data.imageUrl || '',
      capacity: data.capacity || 500,
      sections: data.sections || 3
    }
    
    const docRef = await addDoc(collection(db, 'venues'), venueData)
    return docRef
  }

  static async updateVenue(id: string, data: any) {
    await updateDoc(doc(db, 'venues', id), data)
  }

  static async deleteVenue(id: string) {
    await deleteDoc(doc(db, 'venues', id))
  }

  // Orders - handles permission errors and maps fields correctly
  static async getOrders(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'orders'))
      
      if (snapshot.empty) {
        return [{
          id: 'demo1',
          orderId: 'ORD-DEMO-001',
          customerName: 'John Doe',
          customerEmail: 'demo@example.com',
          customerPhone: '555-0100',
          eventName: 'Sample Event',
          seats: [{section: 'Orchestra', row: 5, seat: 10, price: 150}],
          total: 165,
          status: 'confirmed',
          createdAt: new Date()
        }]
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
            seat: ticket.seat || ticket.seatNumber || 1,
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
          eventId: data.eventId || '',
          seats: seats,
          total: total || data.totalAmount || 0,
          status: data.status || 'confirmed',
          paymentMethod: data.paymentMethod || 'card',
          promoterId: data.promoterId || '',
          createdAt: data.purchaseDate?.toDate?.() || data.purchaseDate || new Date()
        }
      })
    } catch (error: any) {
      console.error('Error fetching orders:', error)
      if (error.code === 'permission-denied') {
        console.log('Permission denied for orders collection')
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

  // Promotions - matches actual schema
  static async getPromotions(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'promotions'))
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        maxUses: doc.data().maxUses || 100,
        usageCount: doc.data().usageCount || 0,
        status: doc.data().status || 'active',
        expiryDate: doc.data().expiryDate || null
      }))
    } catch (error) {
      console.error('Error fetching promotions:', error)
      return []
    }
  }

  static async createPromotion(data: any) {
    const promoData = {
      code: data.code,
      type: data.type || 'percentage',
      value: data.value || 10,
      description: data.description || '',
      maxUses: data.maxUses || 100,
      usageCount: 0,
      status: 'active',
      expiryDate: data.expiryDate || null,
      createdAt: Timestamp.now()
    }
    
    return await addDoc(collection(db, 'promotions'), promoData)
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
        recentOrders: orders.slice(0, 10)
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

  static async getSeatStatus(eventId: string): Promise<any[]> {
    try {
      const q = query(collection(db, 'seat_status'), where('eventId', '==', eventId))
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => doc.data())
    } catch (error) {
      console.error('Error fetching seat status:', error)
      return []
    }
  }

  static async updateSeatStatus(eventId: string, seatId: string, status: string, sessionId: string) {
    const docId = `${eventId}_${seatId}`
    const seatData = {
      eventId,
      seatId,
      status,
      sessionId,
      heldUntil: status === 'held' ? 
        Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)) :
        null
    }
    
    await updateDoc(doc(db, 'seat_status', docId), seatData)
  }
}
