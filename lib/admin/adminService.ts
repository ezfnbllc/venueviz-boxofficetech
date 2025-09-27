import {db, auth} from '@/lib/firebase'
import {
  collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, where, Timestamp
} from 'firebase/firestore'

export class AdminService {
  // Get current user's promoter ID if they are a promoter
  static async getCurrentUserPromoterId(): Promise<string | null> {
    if (!auth.currentUser) return null
    
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid))
    if (userDoc.exists()) {
      const userData = userDoc.data()
      if (userData.role === 'promoter') {
        return userData.promoterId || null
      }
    }
    return null
  }

  // Check if user is admin
  static async isUserAdmin(): Promise<boolean> {
    if (!auth.currentUser) return false
    
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid))
    if (userDoc.exists()) {
      const userData = userDoc.data()
      return userData.isMaster === true || userData.role === 'admin'
    }
    return false
  }

  // Promoters management
  static async getPromoters(): Promise<any[]> {
    try {
      const isAdmin = await this.isUserAdmin()
      const promoterId = await this.getCurrentUserPromoterId()
      
      if (!isAdmin && !promoterId) {
        return []
      }

      let q
      if (isAdmin) {
        q = query(collection(db, 'promoters'))
      } else {
        // Promoter can only see their own info
        return promoterId ? [await this.getPromoter(promoterId)] : []
      }

      const snapshot = await getDocs(q)
      const promoters = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))
      
      // Get event count for each promoter
      for (const promoter of promoters) {
        const eventsQuery = query(collection(db, 'events'), where('promoterId', '==', promoter.id))
        const eventsSnap = await getDocs(eventsQuery)
        promoter.eventCount = eventsSnap.size
      }
      
      return promoters
    } catch (error) {
      console.error('Error fetching promoters:', error)
      return []
    }
  }

  static async getPromoter(id: string): Promise<any> {
    try {
      const docSnap = await getDoc(doc(db, 'promoters', id))
      if (docSnap.exists()) {
        return {id: docSnap.id, ...docSnap.data()}
      }
      return null
    } catch (error) {
      console.error('Error fetching promoter:', error)
      return null
    }
  }

  static async createPromoter(data: any) {
    const isAdmin = await this.isUserAdmin()
    if (!isAdmin) throw new Error('Admin access required')

    const promoterData = {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: 'active'
    }
    
    const docRef = await addDoc(collection(db, 'promoters'), promoterData)
    return docRef.id
  }

  static async updatePromoter(id: string, data: any) {
    const isAdmin = await this.isUserAdmin()
    if (!isAdmin) throw new Error('Admin access required')

    await updateDoc(doc(db, 'promoters', id), {
      ...data,
      updatedAt: Timestamp.now()
    })
  }

  static async deletePromoter(id: string) {
    const isAdmin = await this.isUserAdmin()
    if (!isAdmin) throw new Error('Admin access required')

    await deleteDoc(doc(db, 'promoters', id))
  }

  // Events with promoter access control
  static async getEvents(): Promise<any[]> {
    try {
      const isAdmin = await this.isUserAdmin()
      const promoterId = await this.getCurrentUserPromoterId()
      
      let q
      if (isAdmin) {
        // Admin sees all events
        q = query(collection(db, 'events'))
      } else if (promoterId) {
        // Promoter sees only their events
        q = query(collection(db, 'events'), where('promoterId', '==', promoterId))
      } else {
        // Public/no auth sees all events (for public pages)
        q = query(collection(db, 'events'))
      }

      const snapshot = await getDocs(q)
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
    const isAdmin = await this.isUserAdmin()
    const promoterId = await this.getCurrentUserPromoterId()
    
    if (!isAdmin && !promoterId) throw new Error('Promoter access required')

    const eventData = {
      name: data.name,
      description: data.description || '',
      date: data.date ? Timestamp.fromDate(new Date(data.date)) : Timestamp.now(),
      startTime: data.time || data.startTime || '19:00',
      gateOpenTime: data.gateOpenTime || '',
      type: data.type || 'concert',
      venueId: data.venueId || '',
      venueName: data.venue || data.venueName || '',
      layoutId: data.layoutId || '',
      layoutName: data.layoutName || 'Standard',
      promoterId: isAdmin ? (data.promoterId || promoterId || '') : promoterId,
      promoterName: data.promoterName || '',
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
    const isAdmin = await this.isUserAdmin()
    const promoterId = await this.getCurrentUserPromoterId()
    
    // Check if user has permission to update this event
    if (!isAdmin && promoterId) {
      const eventDoc = await getDoc(doc(db, 'events', id))
      if (eventDoc.exists() && eventDoc.data().promoterId !== promoterId) {
        throw new Error('You can only update your own events')
      }
    }

    const updateData: any = {...data}
    if (data.date && typeof data.date === 'string') {
      updateData.date = Timestamp.fromDate(new Date(data.date))
    }
    await updateDoc(doc(db, 'events', id), updateData)
  }

  static async deleteEvent(id: string) {
    const isAdmin = await this.isUserAdmin()
    const promoterId = await this.getCurrentUserPromoterId()
    
    // Check if user has permission to delete this event
    if (!isAdmin && promoterId) {
      const eventDoc = await getDoc(doc(db, 'events', id))
      if (eventDoc.exists() && eventDoc.data().promoterId !== promoterId) {
        throw new Error('You can only delete your own events')
      }
    }

    await deleteDoc(doc(db, 'events', id))
  }

  // Orders with promoter filtering
  static async getOrders(): Promise<any[]> {
    try {
      const isAdmin = await this.isUserAdmin()
      const promoterId = await this.getCurrentUserPromoterId()
      
      let q
      if (isAdmin) {
        q = query(collection(db, 'orders'))
      } else if (promoterId) {
        q = query(collection(db, 'orders'), where('promoterId', '==', promoterId))
      } else {
        return []
      }

      const snapshot = await getDocs(q)
      
      if (snapshot.empty) {
        return []
      }
      
      return snapshot.docs.map(doc => {
        const data = doc.data()
        
        let total = 0
        const seats = (data.tickets || []).map((ticket: any) => {
          const price = ticket.price || ticket.ticketPrice || 100
          total += price
          return {
            ticketId: ticket.ticketId || `TKT-${doc.id}`,
            seatId: ticket.seatId || '',
            section: ticket.section || 'General',
            row: ticket.row || 1,
            seat: ticket.seat || ticket.seatNumber || 1,
            price: price
          }
        })
        
        return {
          id: doc.id,
          orderId: data.orderId || doc.id,
          customerName: data.customerName || 'Unknown Customer',
          customerEmail: data.customerEmail || '',
          customerPhone: data.customerPhone || '',
          eventName: data.eventName || 'Unknown Event',
          eventId: data.eventId || '',
          eventDate: data.eventDate || '',
          seats: seats,
          tickets: data.tickets || [],
          total: total || data.totalAmount || 0,
          status: data.status || 'confirmed',
          paymentMethod: data.paymentMethod || 'card',
          promoterId: data.promoterId || '',
          createdAt: data.purchaseDate?.toDate?.() || data.purchaseDate || new Date(),
          purchaseDate: data.purchaseDate
        }
      })
    } catch (error: any) {
      console.error('Error fetching orders:', error)
      return []
    }
  }

  // Venues - all users can read
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
          zipCode: data.zipCode,
          latitude: data.latitude,
          longitude: data.longitude,
          imageUrl: data.imageUrl,
          capacity: data.capacity || 500,
          sections: data.sections || 3
        }
      })
    } catch (error) {
      console.error('Error fetching venues:', error)
      return []
    }
  }

  static async createVenue(data: any) {
    const isAdmin = await this.isUserAdmin()
    const promoterId = await this.getCurrentUserPromoterId()
    
    if (!isAdmin && !promoterId) throw new Error('Access denied')

    const venueData = {
      name: data.name,
      streetAddress1: data.streetAddress1 || data.address || '',
      streetAddress2: data.streetAddress2 || '',
      city: data.city || 'Dallas',
      state: data.state || 'TX',
      zipCode: data.zipCode || '75001',
      latitude: data.latitude || 32.7767,
      longitude: data.longitude || -96.7970,
      imageUrl: data.imageUrl || ''
    }
    
    const docRef = await addDoc(collection(db, 'venues'), venueData)
    return docRef
  }

  static async updateVenue(id: string, data: any) {
    const isAdmin = await this.isUserAdmin()
    if (!isAdmin) throw new Error('Admin access required')

    await updateDoc(doc(db, 'venues', id), data)
  }

  static async deleteVenue(id: string) {
    const isAdmin = await this.isUserAdmin()
    if (!isAdmin) throw new Error('Admin access required')

    await deleteDoc(doc(db, 'venues', id))
  }

  // Rest of the methods remain the same...
  static async getOrderStats() {
    const orders = await this.getOrders()
    const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.total || 0), 0)
    const totalTickets = orders.reduce((sum: number, order: any) => {
      return sum + (order.seats?.length || order.tickets?.length || 0)
    }, 0)
    
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
      const [events, venues, orders, promotions, promoters] = await Promise.all([
        this.getEvents(),
        this.getVenues(),
        this.getOrders(),
        this.getPromotions(),
        this.getPromoters()
      ])

      const orderStats = await this.getOrderStats()
      const customers = await this.getCustomers()

      return {
        events: events.length,
        venues: venues.length,
        orders: orders.length,
        customers: customers.length,
        promotions: promotions.length,
        promoters: promoters.length,
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
        promoters: 0,
        revenue: 0,
        tickets: 0,
        avgOrderValue: 0,
        recentOrders: []
      }
    }
  }
}
