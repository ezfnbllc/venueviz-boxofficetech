import { collection, getDocs, doc, writeBatch, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AuditService } from './auditService'

const isBrowser = typeof window !== 'undefined'

export interface BulkOperationResult {
  success: boolean
  totalProcessed: number
  successCount: number
  failureCount: number
  errors: BulkOperationError[]
  duration: number
  operationType: string
  resourceType: string
}

export interface BulkOperationError {
  resourceId: string
  resourceName?: string
  error: string
  index: number
}

export interface BulkUpdateOptions {
  dryRun?: boolean
  batchSize?: number
  continueOnError?: boolean
}

export interface BulkEventUpdate {
  eventId: string
  updates: Partial<{
    status: string
    featured: boolean
    category: string
    tags: string[]
    promoterId: string
    pricing: any
  }>
}

export interface BulkVenueUpdate {
  venueId: string
  updates: Partial<{
    active: boolean
    capacity: number
    amenities: string[]
    parkingInfo: string
  }>
}

export interface BulkPromoterUpdate {
  promoterId: string
  updates: Partial<{
    active: boolean
    commission: number
    paymentTerms: string
  }>
}

export class BulkOperationsService {

  // ============ BULK EVENT OPERATIONS ============

  // Bulk update events
  static async bulkUpdateEvents(
    updates: BulkEventUpdate[],
    user: { id: string; email: string; name?: string; role?: string },
    options?: BulkUpdateOptions
  ): Promise<BulkOperationResult> {
    if (!isBrowser) return this.emptyResult('update', 'event')

    const startTime = Date.now()
    const errors: BulkOperationError[] = []
    let successCount = 0
    const batchSize = options?.batchSize || 100

    try {
      // Validate updates
      if (!updates || updates.length === 0) {
        return {
          ...this.emptyResult('update', 'event'),
          errors: [{ resourceId: '', error: 'No updates provided', index: 0 }]
        }
      }

      // Dry run - just validate
      if (options?.dryRun) {
        return {
          success: true,
          totalProcessed: updates.length,
          successCount: updates.length,
          failureCount: 0,
          errors: [],
          duration: Date.now() - startTime,
          operationType: 'update (dry run)',
          resourceType: 'event'
        }
      }

      // Process in batches
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = writeBatch(db)
        const batchUpdates = updates.slice(i, i + batchSize)

        for (let j = 0; j < batchUpdates.length; j++) {
          const update = batchUpdates[j]
          const index = i + j

          try {
            const eventRef = doc(db, 'events', update.eventId)
            batch.update(eventRef, {
              ...update.updates,
              updatedAt: Timestamp.now()
            })
          } catch (error: any) {
            if (!options?.continueOnError) throw error
            errors.push({
              resourceId: update.eventId,
              error: error.message || 'Update failed',
              index
            })
          }
        }

        // Commit batch
        await batch.commit()
        successCount += batchUpdates.length - errors.filter(e => e.index >= i && e.index < i + batchSize).length
      }

      // Log audit
      await AuditService.logBulkOperation('event', 'update', user, {
        count: updates.length,
        resourceIds: updates.map(u => u.eventId),
        description: `Bulk updated ${successCount} events`
      })

      return {
        success: errors.length === 0,
        totalProcessed: updates.length,
        successCount,
        failureCount: errors.length,
        errors,
        duration: Date.now() - startTime,
        operationType: 'update',
        resourceType: 'event'
      }
    } catch (error: any) {
      return {
        success: false,
        totalProcessed: updates.length,
        successCount,
        failureCount: updates.length - successCount,
        errors: [...errors, { resourceId: '', error: error.message, index: -1 }],
        duration: Date.now() - startTime,
        operationType: 'update',
        resourceType: 'event'
      }
    }
  }

  // Bulk delete events
  static async bulkDeleteEvents(
    eventIds: string[],
    user: { id: string; email: string; name?: string; role?: string },
    options?: BulkUpdateOptions
  ): Promise<BulkOperationResult> {
    if (!isBrowser) return this.emptyResult('delete', 'event')

    const startTime = Date.now()
    const errors: BulkOperationError[] = []
    let successCount = 0
    const batchSize = options?.batchSize || 100

    try {
      if (!eventIds || eventIds.length === 0) {
        return {
          ...this.emptyResult('delete', 'event'),
          errors: [{ resourceId: '', error: 'No event IDs provided', index: 0 }]
        }
      }

      if (options?.dryRun) {
        return {
          success: true,
          totalProcessed: eventIds.length,
          successCount: eventIds.length,
          failureCount: 0,
          errors: [],
          duration: Date.now() - startTime,
          operationType: 'delete (dry run)',
          resourceType: 'event'
        }
      }

      // Process in batches
      for (let i = 0; i < eventIds.length; i += batchSize) {
        const batch = writeBatch(db)
        const batchIds = eventIds.slice(i, i + batchSize)

        for (let j = 0; j < batchIds.length; j++) {
          const eventId = batchIds[j]
          const index = i + j

          try {
            const eventRef = doc(db, 'events', eventId)
            batch.delete(eventRef)
          } catch (error: any) {
            if (!options?.continueOnError) throw error
            errors.push({
              resourceId: eventId,
              error: error.message || 'Delete failed',
              index
            })
          }
        }

        await batch.commit()
        successCount += batchIds.length - errors.filter(e => e.index >= i && e.index < i + batchSize).length
      }

      // Log audit
      await AuditService.logBulkOperation('event', 'delete', user, {
        count: eventIds.length,
        resourceIds: eventIds,
        description: `Bulk deleted ${successCount} events`
      })

      return {
        success: errors.length === 0,
        totalProcessed: eventIds.length,
        successCount,
        failureCount: errors.length,
        errors,
        duration: Date.now() - startTime,
        operationType: 'delete',
        resourceType: 'event'
      }
    } catch (error: any) {
      return {
        success: false,
        totalProcessed: eventIds.length,
        successCount,
        failureCount: eventIds.length - successCount,
        errors: [...errors, { resourceId: '', error: error.message, index: -1 }],
        duration: Date.now() - startTime,
        operationType: 'delete',
        resourceType: 'event'
      }
    }
  }

  // Bulk status update for events
  static async bulkUpdateEventStatus(
    eventIds: string[],
    status: 'draft' | 'published' | 'cancelled' | 'completed',
    user: { id: string; email: string; name?: string; role?: string },
    options?: BulkUpdateOptions
  ): Promise<BulkOperationResult> {
    const updates = eventIds.map(eventId => ({
      eventId,
      updates: { status }
    }))
    return this.bulkUpdateEvents(updates, user, options)
  }

  // Bulk feature/unfeature events
  static async bulkSetFeatured(
    eventIds: string[],
    featured: boolean,
    user: { id: string; email: string; name?: string; role?: string },
    options?: BulkUpdateOptions
  ): Promise<BulkOperationResult> {
    const updates = eventIds.map(eventId => ({
      eventId,
      updates: { featured }
    }))
    return this.bulkUpdateEvents(updates, user, options)
  }

  // Bulk assign promoter to events
  static async bulkAssignPromoter(
    eventIds: string[],
    promoterId: string,
    user: { id: string; email: string; name?: string; role?: string },
    options?: BulkUpdateOptions
  ): Promise<BulkOperationResult> {
    const updates = eventIds.map(eventId => ({
      eventId,
      updates: { promoterId }
    }))
    return this.bulkUpdateEvents(updates, user, options)
  }

  // Bulk category update
  static async bulkUpdateCategory(
    eventIds: string[],
    category: string,
    user: { id: string; email: string; name?: string; role?: string },
    options?: BulkUpdateOptions
  ): Promise<BulkOperationResult> {
    const updates = eventIds.map(eventId => ({
      eventId,
      updates: { category }
    }))
    return this.bulkUpdateEvents(updates, user, options)
  }

  // ============ BULK VENUE OPERATIONS ============

  // Bulk update venues
  static async bulkUpdateVenues(
    updates: BulkVenueUpdate[],
    user: { id: string; email: string; name?: string; role?: string },
    options?: BulkUpdateOptions
  ): Promise<BulkOperationResult> {
    if (!isBrowser) return this.emptyResult('update', 'venue')

    const startTime = Date.now()
    const errors: BulkOperationError[] = []
    let successCount = 0
    const batchSize = options?.batchSize || 100

    try {
      if (!updates || updates.length === 0) {
        return {
          ...this.emptyResult('update', 'venue'),
          errors: [{ resourceId: '', error: 'No updates provided', index: 0 }]
        }
      }

      if (options?.dryRun) {
        return {
          success: true,
          totalProcessed: updates.length,
          successCount: updates.length,
          failureCount: 0,
          errors: [],
          duration: Date.now() - startTime,
          operationType: 'update (dry run)',
          resourceType: 'venue'
        }
      }

      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = writeBatch(db)
        const batchUpdates = updates.slice(i, i + batchSize)

        for (let j = 0; j < batchUpdates.length; j++) {
          const update = batchUpdates[j]
          const index = i + j

          try {
            const venueRef = doc(db, 'venues', update.venueId)
            batch.update(venueRef, {
              ...update.updates,
              updatedAt: Timestamp.now()
            })
          } catch (error: any) {
            if (!options?.continueOnError) throw error
            errors.push({
              resourceId: update.venueId,
              error: error.message || 'Update failed',
              index
            })
          }
        }

        await batch.commit()
        successCount += batchUpdates.length - errors.filter(e => e.index >= i && e.index < i + batchSize).length
      }

      await AuditService.logBulkOperation('venue', 'update', user, {
        count: updates.length,
        resourceIds: updates.map(u => u.venueId),
        description: `Bulk updated ${successCount} venues`
      })

      return {
        success: errors.length === 0,
        totalProcessed: updates.length,
        successCount,
        failureCount: errors.length,
        errors,
        duration: Date.now() - startTime,
        operationType: 'update',
        resourceType: 'venue'
      }
    } catch (error: any) {
      return {
        success: false,
        totalProcessed: updates.length,
        successCount,
        failureCount: updates.length - successCount,
        errors: [...errors, { resourceId: '', error: error.message, index: -1 }],
        duration: Date.now() - startTime,
        operationType: 'update',
        resourceType: 'venue'
      }
    }
  }

  // Bulk activate/deactivate venues
  static async bulkSetVenueActive(
    venueIds: string[],
    active: boolean,
    user: { id: string; email: string; name?: string; role?: string },
    options?: BulkUpdateOptions
  ): Promise<BulkOperationResult> {
    const updates = venueIds.map(venueId => ({
      venueId,
      updates: { active }
    }))
    return this.bulkUpdateVenues(updates, user, options)
  }

  // ============ BULK PROMOTER OPERATIONS ============

  // Bulk update promoters
  static async bulkUpdatePromoters(
    updates: BulkPromoterUpdate[],
    user: { id: string; email: string; name?: string; role?: string },
    options?: BulkUpdateOptions
  ): Promise<BulkOperationResult> {
    if (!isBrowser) return this.emptyResult('update', 'promoter')

    const startTime = Date.now()
    const errors: BulkOperationError[] = []
    let successCount = 0
    const batchSize = options?.batchSize || 100

    try {
      if (!updates || updates.length === 0) {
        return {
          ...this.emptyResult('update', 'promoter'),
          errors: [{ resourceId: '', error: 'No updates provided', index: 0 }]
        }
      }

      if (options?.dryRun) {
        return {
          success: true,
          totalProcessed: updates.length,
          successCount: updates.length,
          failureCount: 0,
          errors: [],
          duration: Date.now() - startTime,
          operationType: 'update (dry run)',
          resourceType: 'promoter'
        }
      }

      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = writeBatch(db)
        const batchUpdates = updates.slice(i, i + batchSize)

        for (let j = 0; j < batchUpdates.length; j++) {
          const update = batchUpdates[j]
          const index = i + j

          try {
            const promoterRef = doc(db, 'promoters', update.promoterId)
            batch.update(promoterRef, {
              ...update.updates,
              updatedAt: Timestamp.now()
            })
          } catch (error: any) {
            if (!options?.continueOnError) throw error
            errors.push({
              resourceId: update.promoterId,
              error: error.message || 'Update failed',
              index
            })
          }
        }

        await batch.commit()
        successCount += batchUpdates.length - errors.filter(e => e.index >= i && e.index < i + batchSize).length
      }

      await AuditService.logBulkOperation('promoter', 'update', user, {
        count: updates.length,
        resourceIds: updates.map(u => u.promoterId),
        description: `Bulk updated ${successCount} promoters`
      })

      return {
        success: errors.length === 0,
        totalProcessed: updates.length,
        successCount,
        failureCount: errors.length,
        errors,
        duration: Date.now() - startTime,
        operationType: 'update',
        resourceType: 'promoter'
      }
    } catch (error: any) {
      return {
        success: false,
        totalProcessed: updates.length,
        successCount,
        failureCount: updates.length - successCount,
        errors: [...errors, { resourceId: '', error: error.message, index: -1 }],
        duration: Date.now() - startTime,
        operationType: 'update',
        resourceType: 'promoter'
      }
    }
  }

  // Bulk update commission rate
  static async bulkUpdateCommission(
    promoterIds: string[],
    commission: number,
    user: { id: string; email: string; name?: string; role?: string },
    options?: BulkUpdateOptions
  ): Promise<BulkOperationResult> {
    const updates = promoterIds.map(promoterId => ({
      promoterId,
      updates: { commission }
    }))
    return this.bulkUpdatePromoters(updates, user, options)
  }

  // ============ BULK ORDER OPERATIONS ============

  // Bulk update order status
  static async bulkUpdateOrderStatus(
    orderIds: string[],
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded',
    user: { id: string; email: string; name?: string; role?: string },
    options?: BulkUpdateOptions
  ): Promise<BulkOperationResult> {
    if (!isBrowser) return this.emptyResult('update', 'order')

    const startTime = Date.now()
    const errors: BulkOperationError[] = []
    let successCount = 0
    const batchSize = options?.batchSize || 100

    try {
      if (!orderIds || orderIds.length === 0) {
        return {
          ...this.emptyResult('update', 'order'),
          errors: [{ resourceId: '', error: 'No order IDs provided', index: 0 }]
        }
      }

      if (options?.dryRun) {
        return {
          success: true,
          totalProcessed: orderIds.length,
          successCount: orderIds.length,
          failureCount: 0,
          errors: [],
          duration: Date.now() - startTime,
          operationType: 'update (dry run)',
          resourceType: 'order'
        }
      }

      for (let i = 0; i < orderIds.length; i += batchSize) {
        const batch = writeBatch(db)
        const batchIds = orderIds.slice(i, i + batchSize)

        for (let j = 0; j < batchIds.length; j++) {
          const orderId = batchIds[j]
          const index = i + j

          try {
            const orderRef = doc(db, 'orders', orderId)
            batch.update(orderRef, {
              status,
              updatedAt: Timestamp.now()
            })
          } catch (error: any) {
            if (!options?.continueOnError) throw error
            errors.push({
              resourceId: orderId,
              error: error.message || 'Update failed',
              index
            })
          }
        }

        await batch.commit()
        successCount += batchIds.length - errors.filter(e => e.index >= i && e.index < i + batchSize).length
      }

      await AuditService.logBulkOperation('order', 'update', user, {
        count: orderIds.length,
        resourceIds: orderIds,
        description: `Bulk updated ${successCount} orders to status: ${status}`
      })

      return {
        success: errors.length === 0,
        totalProcessed: orderIds.length,
        successCount,
        failureCount: errors.length,
        errors,
        duration: Date.now() - startTime,
        operationType: 'update',
        resourceType: 'order'
      }
    } catch (error: any) {
      return {
        success: false,
        totalProcessed: orderIds.length,
        successCount,
        failureCount: orderIds.length - successCount,
        errors: [...errors, { resourceId: '', error: error.message, index: -1 }],
        duration: Date.now() - startTime,
        operationType: 'update',
        resourceType: 'order'
      }
    }
  }

  // Helper method for empty results
  private static emptyResult(operationType: string, resourceType: string): BulkOperationResult {
    return {
      success: false,
      totalProcessed: 0,
      successCount: 0,
      failureCount: 0,
      errors: [],
      duration: 0,
      operationType,
      resourceType
    }
  }
}

export default BulkOperationsService
