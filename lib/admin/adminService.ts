import {db} from '@/lib/firebase'
import {
  collection, getDocs, doc, addDoc, updateDoc, deleteDoc, setDoc,
  query, orderBy, limit, where, Timestamp
} from 'firebase/firestore'

export class AdminService {
  // Check if we have permission to read orders
  static async checkOrdersPermission(): Promise<boolean> {
    try {
      const testQuery = query(collection(db, 'orders'), limit(1))
      await getDocs(testQuery)
      return true
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        console.log('⚠️ No permission to read orders. Using demo data.')
        console.log('Fix: Update Firebase Security Rules at https://console.firebase.google.com/project/venueviz/firestore/rules')
      }
      return false
    }
  }

  // Create sample orders if we can write
  static async createSampleOrders() {
    try {
      const hasPermission = await this.checkOrdersPermission()
      if (!hasPermission) {
        console.log('Cannot create sample orders - permission denied')
        return
      }

      const ordersSnap = await getDocs(collection(db, 'orders'))
      if (ordersSnap.empty) {
        console.log('Creating sample orders...')
        const sampleOrders = [
          {
            orderId: 'ORD-SAMPLE-001',
            customerName: 'Sarah Johnson',
            customerEmail: 'sarah@example.com',
            customerPhone: '555-0101',
            eventId: '0B56dDERyt2TKCldg2lS',
            eventName: 'Agam Live prod',
            eventDate: '2025-08-16',
            tickets: [
              {ticketId: 'TKT001', seatId: 'A1', section: 'Orchestra', row: 1, seat: 1, price: 150, ticketPrice: 150},
              {ticketId: 'TKT002', seatId: 'A2', section: 'Orchestra', row: 1, seat: 2, price: 150, ticketPrice: 150}
            ],
            paymentMethod: 'card',
            purchaseDate: Timestamp.now(),
            promoterId: 'PAqFLcCQwxUYKr7i8g5t',
            searchableEmails: ['sarah@example.com']
          },
          {
            orderId: 'ORD-SAMPLE-002',
            customerName: 'Mike Davis',
            customerEmail: 'mike@example.com',
            customerPhone: '555-0102',
            eventId: '0B56dDERyt2TKCldg2lS',
            eventName: 'Agam Live prod',
            eventDate: '2025-08-16',
            tickets: [
              {ticketId: 'TKT003', seatId: 'B5', section: 'Mezzanine', row: 2, seat: 5, price: 100, ticketPrice: 100}
            ],
            paymentMethod: 'PayPal',
            purchaseDate: Timestamp.now(),
            promoterId: 'PAqFLcCQwxUYKr7i8g5t',
            searchableEmails: ['mike@example.com']
          }
        ]
        
        for (const order of sampleOrders) {
          await addDoc(collection(db, 'orders'), order)
        }
        console.log('Sample orders created')
      }
    } catch (error) {
      console.error('Error creating sample orders:', error)
    }
  }

  // Events - working fine
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
      gateOpenTime: data.gateOpenTime || '',
      type: data.type || 'concert',
      venueId: data.venueId || '',
      venueName: data.venue || data.venueName || '',
      layoutId: data.layoutId || '',
      layoutName: data.layoutName || 'Standard',
      promoterId: data.promoterId || 'PAqFLcCQwxUYKr7i8g5t',
      promoterName: data.promoterName || 'BoxOfficeTech',
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

  // Venues - working fine
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
    await updateDoc(doc(db, 'venues', id), data)
  }

  static async deleteVenue(id: string) {
    await deleteDoc(doc(db, 'venues', id))
  }

  // Orders - with permission handling and proper field mapping
  static async getOrders(): Promise<any[]> {
    try {
      // First try to create sample orders if needed
      await this.createSampleOrders()
      
      const snapshot = await getDocs(collection(db, 'orders'))
      
      if (snapshot.empty) {
        console.log('No orders found, returning demo data')
        return this.getDemoOrders()
      }
      
      return snapshot.docs.map(doc => {
        const data = doc.data()
        
        // Calculate total from tickets array
        let total = 0
        let seats: any[] = []
        
        if (data.tickets && Array.isArray(data.tickets)) {
          seats = data.tickets.map((ticket: any) => {
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
        }
        
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
      
      if (error.code === 'permission-denied') {
        console.log('⚠️ Permission denied for orders. Returning demo data.')
        console.log('📌 Fix: Update Firebase Security Rules')
        return this.getDemoOrders()
      }
      
      return this.getDemoOrders()
    }
  }

  // Demo orders when permissions are denied
  static getDemoOrders() {
    return [
      {
        id: 'demo1',
        orderId: 'ORD-DEMO-001',
        customerName: 'Demo Customer (Enable Firebase Permissions)',
        customerEmail: 'demo@example.com',
        customerPhone: '555-0100',
        eventName: 'Sample Event',
        eventId: '',
        eventDate: '2025-09-28',
        seats: [
          {section: 'Orchestra', row: 5, seat: 10, price: 150},
          {section: 'Orchestra', row: 5, seat: 11, price: 150}
        ],
        tickets: [],
        total: 300,
        status: 'confirmed',
        paymentMethod: 'card',
        promoterId: '',
        createdAt: new Date(),
        purchaseDate: new Date()
      },
      {
        id: 'demo2',
        orderId: 'ORD-DEMO-002',
        customerName: 'Jane Smith (Demo)',
        customerEmail: 'jane@example.com',
        customerPhone: '555-0101',
        eventName: 'Concert Night',
        eventId: '',
        eventDate: '2025-09-29',
        seats: [
          {section: 'Balcony', row: 2, seat: 5, price: 75}
        ],
        tickets: [],
        total: 75,
        status: 'confirmed',
        paymentMethod: 'PayPal',
        promoterId: '',
        createdAt: new Date(),
        purchaseDate: new Date()
      }
    ]
  }

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

  // Promotions - working fine
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
}
