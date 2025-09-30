import { doc, deleteDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

export class DeleteEventService {
  
  // Check if event has any orders
  static async checkEventOrders(eventId: string): Promise<{ hasOrders: boolean; orderCount: number }> {
    try {
      const ordersRef = collection(db, 'orders')
      const q = query(ordersRef, where('eventId', '==', eventId))
      const snapshot = await getDocs(q)
      
      return {
        hasOrders: !snapshot.empty,
        orderCount: snapshot.size
      }
    } catch (error) {
      console.error('Error checking event orders:', error)
      throw new Error('Failed to check event orders')
    }
  }
  
  // Hard delete - physically remove event
  static async hardDeleteEvent(eventId: string): Promise<void> {
    try {
      const eventRef = doc(db, 'events', eventId)
      await deleteDoc(eventRef)
      console.log('Event hard deleted:', eventId)
    } catch (error) {
      console.error('Error hard deleting event:', error)
      throw new Error('Failed to delete event')
    }
  }
  
  // Soft delete - mark as deleted
  static async softDeleteEvent(eventId: string, deletedBy: string): Promise<void> {
    try {
      const eventRef = doc(db, 'events', eventId)
      await updateDoc(eventRef, {
        status: 'deleted',
        deletedAt: new Date(),
        deletedBy: deletedBy,
        updatedAt: new Date()
      })
      console.log('Event soft deleted:', eventId)
    } catch (error) {
      console.error('Error soft deleting event:', error)
      throw new Error('Failed to soft delete event')
    }
  }
  
  // Main delete function with business logic
  static async deleteEvent(eventId: string, userId: string): Promise<{ deleted: boolean; type: 'hard' | 'soft'; orderCount?: number }> {
    try {
      // Check if event has orders
      const { hasOrders, orderCount } = await this.checkEventOrders(eventId)
      
      if (hasOrders) {
        // Soft delete if orders exist
        await this.softDeleteEvent(eventId, userId)
        return { deleted: true, type: 'soft', orderCount }
      } else {
        // Hard delete if no orders
        await this.hardDeleteEvent(eventId)
        return { deleted: true, type: 'hard' }
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      throw error
    }
  }
  
  // Restore soft deleted event
  static async restoreEvent(eventId: string): Promise<void> {
    try {
      const eventRef = doc(db, 'events', eventId)
      await updateDoc(eventRef, {
        status: 'draft',
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date()
      })
      console.log('Event restored:', eventId)
    } catch (error) {
      console.error('Error restoring event:', error)
      throw new Error('Failed to restore event')
    }
  }
}
