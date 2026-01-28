/**
 * Inventory Service
 *
 * Core service for managing event ticket inventory including:
 * - GA (General Admission) ticket management
 * - Reserved seating management
 * - Blocking/unblocking tickets and seats
 * - Capacity adjustments
 * - Audit logging
 */

import { getAdminFirestore } from '@/lib/firebase-admin'
import type {
  EventInventorySummary,
  GATierInventory,
  SectionInventory,
  SeatInventory,
  SeatStatus,
  InventoryBlock,
  GAInventoryBlock,
  ReservedInventoryBlock,
  InventoryLog,
  InventoryLogAction,
  CapacityChangeRequest,
  BlockGARequest,
  BlockSeatsRequest,
  InventoryOperationResponse,
  InventoryLogFilter,
  SeatInventoryFilter,
} from '@/lib/types/inventory'

// ============================================================================
// Constants
// ============================================================================

const INVENTORY_BLOCKS_COLLECTION = 'inventory_blocks'
const INVENTORY_LOGS_COLLECTION = 'inventory_logs'

// ============================================================================
// Get Inventory Summary
// ============================================================================

/**
 * Get complete inventory summary for an event
 */
export async function getEventInventorySummary(eventId: string): Promise<EventInventorySummary | null> {
  try {
    const db = getAdminFirestore()
    const now = new Date()

    // Get event data
    const eventDoc = await db.collection('events').doc(eventId).get()
    if (!eventDoc.exists) {
      return null
    }

    const eventData = eventDoc.data()!
    const eventName = eventData.name || eventData.basics?.name || 'Untitled Event'

    // Determine seating type - check multiple fields for compatibility
    // Events can have seatingType set directly, or layoutType indicating seating chart
    let seatingType: 'general' | 'reserved' = 'general'

    // Check all possible indicators of reserved seating
    const hasReservedSeatingType = eventData.venue?.seatingType === 'reserved'
    const hasSeatingChartLayoutType = eventData.venue?.layoutType === 'seating_chart' || eventData.layoutType === 'seating_chart'
    const hasLayoutId = !!(eventData.layoutId || eventData.venue?.layoutId)
    const hasSectionsWithRows = eventData.venue?.availableSections?.some((s: any) => s.rows?.length > 0)

    if (hasReservedSeatingType || hasSeatingChartLayoutType || hasLayoutId || hasSectionsWithRows) {
      seatingType = 'reserved'
    }

    // Get sold counts from orders
    // Include pending (payment in progress), confirmed, and completed statuses
    const ordersSnapshot = await db.collection('orders')
      .where('eventId', '==', eventId)
      .where('status', 'in', ['pending', 'completed', 'confirmed'])
      .get()

    // Get temporary holds (checkout holds)
    const ticketHoldsSnapshot = await db.collection('ticket_holds')
      .where('eventId', '==', eventId)
      .get()

    const seatHoldsSnapshot = await db.collection('seat_holds')
      .where('eventId', '==', eventId)
      .get()

    // Get inventory blocks (admin-managed)
    const blocksSnapshot = await db.collection(INVENTORY_BLOCKS_COLLECTION)
      .where('eventId', '==', eventId)
      .where('status', '==', 'active')
      .get()

    if (seatingType === 'reserved') {
      // For reserved seating, we need to fetch the layout from layouts collection
      // The event's availableSections only contains summary data without seat details
      const layoutId = eventData.layoutId || eventData.venue?.layoutId
      let layoutData = null

      if (layoutId) {
        const layoutDoc = await db.collection('layouts').doc(layoutId).get()
        if (layoutDoc.exists) {
          layoutData = layoutDoc.data()
        }
      }

      return buildReservedSeatingInventory(
        eventId,
        eventName,
        eventData,
        layoutData,
        ordersSnapshot,
        seatHoldsSnapshot,
        blocksSnapshot,
        now
      )
    } else {
      return buildGAInventory(
        eventId,
        eventName,
        eventData,
        ordersSnapshot,
        ticketHoldsSnapshot,
        blocksSnapshot,
        now
      )
    }
  } catch (error) {
    console.error('[InventoryService] Error getting inventory summary:', error)
    throw error
  }
}

/**
 * Build GA inventory summary
 */
function buildGAInventory(
  eventId: string,
  eventName: string,
  eventData: any,
  ordersSnapshot: FirebaseFirestore.QuerySnapshot,
  holdsSnapshot: FirebaseFirestore.QuerySnapshot,
  blocksSnapshot: FirebaseFirestore.QuerySnapshot,
  now: Date
): EventInventorySummary {
  const ticketTypes = eventData.ticketTypes || []
  const pricingTiers = eventData.pricing?.tiers || []

  // Build tier map (id -> tier info) and name-to-id mapping
  const tierMap: Map<string, { name: string; capacity: number }> = new Map()
  const nameToIdMap: Map<string, string> = new Map() // Maps tier name -> tier ID

  ticketTypes.forEach((tt: any) => {
    const tierId = tt.id
    const tierName = tt.name || tt.id
    tierMap.set(tierId, {
      name: tierName,
      capacity: tt.capacity || tt.available || tt.quantity || 0,
    })
    // Map the name to this tier ID (case-insensitive for better matching)
    nameToIdMap.set(tierName.toLowerCase(), tierId)
  })

  pricingTiers.forEach((tier: any) => {
    const tierId = tier.id || `tier-${tier.name}`
    const tierName = tier.name || tierId
    if (!tierMap.has(tierId)) {
      tierMap.set(tierId, {
        name: tierName,
        capacity: tier.capacity || tier.quantity || tier.available || 0,
      })
    }
    // Map the name to this tier ID (case-insensitive for better matching)
    if (!nameToIdMap.has(tierName.toLowerCase())) {
      nameToIdMap.set(tierName.toLowerCase(), tierId)
    }
  })

  // Count sold tickets per tier
  // Orders store ticketType as the tier NAME, so we need to map it back to tier ID
  const soldCounts: Map<string, number> = new Map()
  ordersSnapshot.docs.forEach(doc => {
    const order = doc.data()
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        if (!item.seatInfo) {
          const ticketTypeName = item.ticketType || item.tierName || 'general'
          // Try to find the tier ID by name, otherwise use the name directly
          const tierId = nameToIdMap.get(ticketTypeName.toLowerCase()) || ticketTypeName
          soldCounts.set(tierId, (soldCounts.get(tierId) || 0) + (item.quantity || 1))
        }
      })
    }
  })

  // Count held tickets per tier (temporary checkout holds)
  const heldCounts: Map<string, number> = new Map()
  holdsSnapshot.docs.forEach(doc => {
    const hold = doc.data()
    const heldUntil = hold.heldUntil?.toDate?.() || new Date(hold.heldUntil)
    if (heldUntil > now) {
      const ticketTypeId = hold.ticketTypeId || 'general'
      // Also try mapping by name for holds
      const tierId = nameToIdMap.get(ticketTypeId.toLowerCase()) || ticketTypeId
      heldCounts.set(tierId, (heldCounts.get(tierId) || 0) + (hold.quantity || 1))
    }
  })

  // Count blocked tickets per tier (admin-managed)
  const blockedCounts: Map<string, number> = new Map()
  blocksSnapshot.docs.forEach(doc => {
    const block = doc.data() as GAInventoryBlock
    if (block.type === 'ga') {
      blockedCounts.set(block.tierId, (blockedCounts.get(block.tierId) || 0) + block.quantity)
    }
  })

  // Build tier inventories
  const gaTiers: GATierInventory[] = []
  let totalCapacity = 0
  let totalSold = 0
  let totalBlocked = 0
  let totalHeld = 0

  tierMap.forEach((tier, tierId) => {
    const capacity = tier.capacity
    // Look up sold by tier ID, and also by tier name as fallback
    const soldById = soldCounts.get(tierId) || 0
    const soldByName = soldCounts.get(tier.name) || 0
    const sold = soldById + soldByName
    const blocked = blockedCounts.get(tierId) || 0
    const heldById = heldCounts.get(tierId) || 0
    const heldByName = heldCounts.get(tier.name) || 0
    const held = heldById + heldByName
    const available = Math.max(0, capacity - sold - blocked - held)

    gaTiers.push({
      tierId,
      tierName: tier.name,
      capacity,
      sold,
      blocked,
      held,
      available,
    })

    totalCapacity += capacity
    totalSold += sold
    totalBlocked += blocked
    totalHeld += held
  })

  // Use event-level capacity if no tiers defined
  if (gaTiers.length === 0) {
    const eventCapacity = eventData.totalCapacity || eventData.ticketsAvailable || 0
    const sold = soldCounts.get('general') || 0
    const blocked = blockedCounts.get('general') || 0
    const held = heldCounts.get('general') || 0

    gaTiers.push({
      tierId: 'general',
      tierName: 'General Admission',
      capacity: eventCapacity,
      sold,
      blocked,
      held,
      available: Math.max(0, eventCapacity - sold - blocked - held),
    })

    totalCapacity = eventCapacity
    totalSold = sold
    totalBlocked = blocked
    totalHeld = held
  }

  // Get venue info
  const venueId = eventData.venue?.id || eventData.venueId
  const venueName = eventData.venue?.name || eventData.venueName

  return {
    eventId,
    eventName,
    venueId,
    venueName,
    seatingType: 'general',
    totalCapacity,
    totalSold,
    totalBlocked,
    totalHeld,
    totalAvailable: Math.max(0, totalCapacity - totalSold - totalBlocked - totalHeld),
    gaTiers,
  }
}

/**
 * Build reserved seating inventory summary
 */
function buildReservedSeatingInventory(
  eventId: string,
  eventName: string,
  eventData: any,
  layoutData: any | null,
  ordersSnapshot: FirebaseFirestore.QuerySnapshot,
  holdsSnapshot: FirebaseFirestore.QuerySnapshot,
  blocksSnapshot: FirebaseFirestore.QuerySnapshot,
  now: Date
): EventInventorySummary {
  // Get sections from layout data (fetched from layouts collection)
  // The layout contains full seat details, unlike availableSections which is just a summary
  const sections = layoutData?.sections || eventData.venue?.availableSections || []

  // Build set of sold seats
  const soldSeats: Set<string> = new Set()
  ordersSnapshot.docs.forEach(doc => {
    const order = doc.data()
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        if (item.seatInfo) {
          const seatId = `${item.seatInfo.sectionId}-${item.seatInfo.row}-${item.seatInfo.seat}`
          soldSeats.add(seatId)
        }
      })
    }
    // Also check tickets array
    if (order.tickets && Array.isArray(order.tickets)) {
      order.tickets.forEach((ticket: any) => {
        if (ticket.seatInfo) {
          const seatId = `${ticket.seatInfo.sectionId}-${ticket.seatInfo.row}-${ticket.seatInfo.seat}`
          soldSeats.add(seatId)
        }
      })
    }
  })

  // Build set of held seats (temporary checkout holds)
  const heldSeats: Set<string> = new Set()
  holdsSnapshot.docs.forEach(doc => {
    const hold = doc.data()
    const heldUntil = hold.heldUntil?.toDate?.() || new Date(hold.heldUntil)
    if (heldUntil > now) {
      heldSeats.add(hold.seatId)
    }
  })

  // Build map of blocked seats (admin-managed)
  const blockedSeats: Map<string, { reason: string; blockId: string }> = new Map()
  blocksSnapshot.docs.forEach(doc => {
    const block = doc.data() as ReservedInventoryBlock
    if (block.type === 'reserved') {
      blockedSeats.set(block.seatId, {
        reason: block.reason,
        blockId: doc.id,
      })
    }
  })

  // Build section inventories
  const sectionInventories: SectionInventory[] = []
  let totalCapacity = 0
  let totalSold = 0
  let totalBlocked = 0
  let totalHeld = 0

  sections.forEach((section: any) => {
    const sectionId = section.sectionId || section.id
    const sectionName = section.sectionName || section.name || sectionId
    const seats: SeatInventory[] = []
    let sectionSold = 0
    let sectionBlocked = 0
    let sectionHeld = 0

    // Get rows from section
    const rows = section.rows || []
    rows.forEach((row: any) => {
      const rowLabel = row.label || row.id
      const rowSeats = row.seats || []

      rowSeats.forEach((seat: any) => {
        const seatNumber = String(seat.number || seat.label || seat.id || '')
        // Use seat.id if it's a full seatId (contains dashes), otherwise construct it
        const seatId = (seat.id && seat.id.includes('-'))
          ? seat.id
          : `${sectionId}-${rowLabel}-${seatNumber}`

        let status: SeatStatus = 'available'
        let blockReason: string | undefined
        let blockId: string | undefined

        if (soldSeats.has(seatId)) {
          status = 'sold'
          sectionSold++
        } else if (blockedSeats.has(seatId)) {
          status = 'blocked'
          const blockInfo = blockedSeats.get(seatId)!
          blockReason = blockInfo.reason
          blockId = blockInfo.blockId
          sectionBlocked++
        } else if (heldSeats.has(seatId)) {
          status = 'held'
          sectionHeld++
        }

        seats.push({
          seatId,
          sectionId,
          sectionName,
          row: rowLabel,
          seatNumber,
          status,
          blockReason,
          blockId,
          price: seat.price || row.price || section.basePrice,
          priceCategory: seat.category || row.category || section.priceCategories,
        })
      })
    })

    const sectionCapacity = seats.length
    sectionInventories.push({
      sectionId,
      sectionName,
      totalSeats: sectionCapacity,
      sold: sectionSold,
      blocked: sectionBlocked,
      held: sectionHeld,
      available: sectionCapacity - sectionSold - sectionBlocked - sectionHeld,
      seats,
    })

    totalCapacity += sectionCapacity
    totalSold += sectionSold
    totalBlocked += sectionBlocked
    totalHeld += sectionHeld
  })

  // Get venue info
  const venueId = eventData.venue?.id || eventData.venueId
  const venueName = eventData.venue?.name || eventData.venueName
  const layoutId = eventData.layoutId || eventData.venue?.layoutId

  return {
    eventId,
    eventName,
    venueId,
    venueName,
    layoutId,
    seatingType: 'reserved',
    totalCapacity,
    totalSold,
    totalBlocked,
    totalHeld,
    totalAvailable: Math.max(0, totalCapacity - totalSold - totalBlocked - totalHeld),
    sections: sectionInventories,
  }
}

// ============================================================================
// Capacity Management (GA only)
// ============================================================================

/**
 * Add or remove capacity from a tier
 */
export async function adjustTierCapacity(
  eventId: string,
  request: CapacityChangeRequest,
  userId: string,
  userName: string
): Promise<InventoryOperationResponse> {
  try {
    const db = getAdminFirestore()

    // Get current event data
    const eventDoc = await db.collection('events').doc(eventId).get()
    if (!eventDoc.exists) {
      return { success: false, message: 'Event not found' }
    }

    const eventData = eventDoc.data()!
    const pricingTiers = eventData.pricing?.tiers || []

    // Find the tier
    const tierIndex = pricingTiers.findIndex((t: any) => t.id === request.tierId)
    if (tierIndex === -1) {
      return { success: false, message: 'Tier not found' }
    }

    const currentCapacity = pricingTiers[tierIndex].capacity || 0
    const newCapacity = currentCapacity + request.change

    // Validate: can't go below sold + blocked
    if (request.change < 0) {
      // Get sold and blocked counts
      const inventory = await getEventInventorySummary(eventId)
      if (!inventory) {
        return { success: false, message: 'Could not calculate inventory' }
      }

      const tierInventory = inventory.gaTiers?.find(t => t.tierId === request.tierId)
      if (tierInventory) {
        const minCapacity = tierInventory.sold + tierInventory.blocked
        if (newCapacity < minCapacity) {
          return {
            success: false,
            message: `Cannot reduce capacity below ${minCapacity} (sold: ${tierInventory.sold}, blocked: ${tierInventory.blocked})`,
          }
        }
      }
    }

    // Update the tier capacity
    pricingTiers[tierIndex].capacity = newCapacity
    await db.collection('events').doc(eventId).update({
      'pricing.tiers': pricingTiers,
    })

    // Log the change
    const logId = await logInventoryChange(db, {
      eventId,
      action: request.change > 0 ? 'add_capacity' : 'remove_capacity',
      type: 'ga',
      tierId: request.tierId,
      tierName: request.tierName,
      quantityChange: request.change,
      previousValue: currentCapacity,
      newValue: newCapacity,
      reason: request.reason,
      notes: request.notes,
      performedBy: userId,
      performedByName: userName,
      performedAt: new Date(),
    })

    return {
      success: true,
      message: `Capacity ${request.change > 0 ? 'increased' : 'decreased'} by ${Math.abs(request.change)}`,
      logId,
    }
  } catch (error) {
    console.error('[InventoryService] Error adjusting capacity:', error)
    return { success: false, message: 'Failed to adjust capacity' }
  }
}

// ============================================================================
// Block/Unblock GA Tickets
// ============================================================================

/**
 * Block GA tickets
 */
export async function blockGATickets(
  eventId: string,
  request: BlockGARequest,
  userId: string,
  userName: string
): Promise<InventoryOperationResponse> {
  try {
    const db = getAdminFirestore()

    // Validate availability
    const inventory = await getEventInventorySummary(eventId)
    if (!inventory) {
      return { success: false, message: 'Could not calculate inventory' }
    }

    const tierInventory = inventory.gaTiers?.find(t => t.tierId === request.tierId)
    if (!tierInventory) {
      return { success: false, message: 'Tier not found' }
    }

    if (request.quantity > tierInventory.available) {
      return {
        success: false,
        message: `Only ${tierInventory.available} tickets available to block`,
      }
    }

    // Create block record
    const now = new Date()
    const blockRef = db.collection(INVENTORY_BLOCKS_COLLECTION).doc()
    const block: GAInventoryBlock = {
      eventId,
      type: 'ga',
      tierId: request.tierId,
      tierName: request.tierName,
      quantity: request.quantity,
      reason: request.reason,
      notes: request.notes,
      blockedBy: userId,
      blockedByName: userName,
      blockedAt: now,
      status: 'active',
    }

    await blockRef.set(block)

    // Log the change
    const logId = await logInventoryChange(db, {
      eventId,
      action: 'block',
      type: 'ga',
      tierId: request.tierId,
      tierName: request.tierName,
      quantityChange: request.quantity,
      reason: request.reason,
      notes: request.notes,
      performedBy: userId,
      performedByName: userName,
      performedAt: now,
    })

    return {
      success: true,
      message: `Blocked ${request.quantity} tickets`,
      affectedCount: request.quantity,
      logId,
    }
  } catch (error) {
    console.error('[InventoryService] Error blocking GA tickets:', error)
    return { success: false, message: 'Failed to block tickets' }
  }
}

/**
 * Unblock GA tickets by block ID
 */
export async function unblockGATickets(
  eventId: string,
  blockId: string,
  userId: string,
  userName: string
): Promise<InventoryOperationResponse> {
  try {
    const db = getAdminFirestore()

    // Get the block record
    const blockDoc = await db.collection(INVENTORY_BLOCKS_COLLECTION).doc(blockId).get()
    if (!blockDoc.exists) {
      return { success: false, message: 'Block record not found' }
    }

    const block = blockDoc.data() as GAInventoryBlock
    if (block.eventId !== eventId) {
      return { success: false, message: 'Block does not belong to this event' }
    }

    if (block.type !== 'ga') {
      return { success: false, message: 'Not a GA block' }
    }

    // Update block status
    await blockDoc.ref.update({
      status: 'released',
      releasedBy: userId,
      releasedByName: userName,
      releasedAt: new Date(),
    })

    // Log the change
    const logId = await logInventoryChange(db, {
      eventId,
      action: 'unblock',
      type: 'ga',
      tierId: block.tierId,
      tierName: block.tierName,
      quantityChange: -block.quantity,
      reason: `Released: ${block.reason}`,
      performedBy: userId,
      performedByName: userName,
      performedAt: new Date(),
    })

    return {
      success: true,
      message: `Unblocked ${block.quantity} tickets`,
      affectedCount: block.quantity,
      logId,
    }
  } catch (error) {
    console.error('[InventoryService] Error unblocking GA tickets:', error)
    return { success: false, message: 'Failed to unblock tickets' }
  }
}

// ============================================================================
// Block/Unblock Reserved Seats
// ============================================================================

/**
 * Block reserved seats
 */
export async function blockSeats(
  eventId: string,
  request: BlockSeatsRequest,
  userId: string,
  userName: string
): Promise<InventoryOperationResponse> {
  try {
    const db = getAdminFirestore()
    const now = new Date()

    // Validate seats are available
    const inventory = await getEventInventorySummary(eventId)
    if (!inventory || inventory.seatingType !== 'reserved') {
      return { success: false, message: 'Event does not have reserved seating' }
    }

    // Check each seat
    const unavailableSeats: string[] = []
    for (const seat of request.seats) {
      const section = inventory.sections?.find(s => s.sectionId === seat.sectionId)
      if (section) {
        const seatInventory = section.seats.find(s => s.seatId === seat.seatId)
        if (seatInventory && seatInventory.status !== 'available') {
          unavailableSeats.push(`${seat.sectionName} Row ${seat.row} Seat ${seat.seatNumber}`)
        }
      }
    }

    if (unavailableSeats.length > 0) {
      return {
        success: false,
        message: `These seats are not available: ${unavailableSeats.join(', ')}`,
      }
    }

    // Create block records
    const batch = db.batch()
    const seatIds: string[] = []

    for (const seat of request.seats) {
      const blockRef = db.collection(INVENTORY_BLOCKS_COLLECTION).doc()
      const block: ReservedInventoryBlock = {
        eventId,
        type: 'reserved',
        seatId: seat.seatId,
        sectionId: seat.sectionId,
        sectionName: seat.sectionName,
        row: seat.row,
        seatNumber: seat.seatNumber,
        reason: request.reason,
        notes: request.notes,
        blockedBy: userId,
        blockedByName: userName,
        blockedAt: now,
        status: 'active',
      }
      batch.set(blockRef, block)
      seatIds.push(seat.seatId)
    }

    await batch.commit()

    // Log the change
    const logId = await logInventoryChange(db, {
      eventId,
      action: request.seats.length > 1 ? 'bulk_block' : 'block',
      type: 'reserved',
      seatIds,
      sectionId: request.seats[0]?.sectionId,
      sectionName: request.seats[0]?.sectionName,
      quantityChange: request.seats.length,
      reason: request.reason,
      notes: request.notes,
      performedBy: userId,
      performedByName: userName,
      performedAt: now,
    })

    return {
      success: true,
      message: `Blocked ${request.seats.length} seat(s)`,
      affectedCount: request.seats.length,
      logId,
    }
  } catch (error) {
    console.error('[InventoryService] Error blocking seats:', error)
    return { success: false, message: 'Failed to block seats' }
  }
}

/**
 * Unblock reserved seats by block IDs
 */
export async function unblockSeats(
  eventId: string,
  blockIds: string[],
  userId: string,
  userName: string
): Promise<InventoryOperationResponse> {
  try {
    const db = getAdminFirestore()
    const now = new Date()

    // Get block records and validate
    const seatIds: string[] = []
    const blocksToUpdate: FirebaseFirestore.DocumentReference[] = []

    for (const blockId of blockIds) {
      const blockDoc = await db.collection(INVENTORY_BLOCKS_COLLECTION).doc(blockId).get()
      if (!blockDoc.exists) continue

      const block = blockDoc.data() as ReservedInventoryBlock
      if (block.eventId !== eventId || block.type !== 'reserved') continue

      blocksToUpdate.push(blockDoc.ref)
      seatIds.push(block.seatId)
    }

    if (blocksToUpdate.length === 0) {
      return { success: false, message: 'No valid blocks to unblock' }
    }

    // Update blocks
    const batch = db.batch()
    for (const ref of blocksToUpdate) {
      batch.update(ref, {
        status: 'released',
        releasedBy: userId,
        releasedByName: userName,
        releasedAt: now,
      })
    }
    await batch.commit()

    // Log the change
    const logId = await logInventoryChange(db, {
      eventId,
      action: blocksToUpdate.length > 1 ? 'bulk_unblock' : 'unblock',
      type: 'reserved',
      seatIds,
      quantityChange: -blocksToUpdate.length,
      reason: 'Seats released',
      performedBy: userId,
      performedByName: userName,
      performedAt: now,
    })

    return {
      success: true,
      message: `Unblocked ${blocksToUpdate.length} seat(s)`,
      affectedCount: blocksToUpdate.length,
      logId,
    }
  } catch (error) {
    console.error('[InventoryService] Error unblocking seats:', error)
    return { success: false, message: 'Failed to unblock seats' }
  }
}

// ============================================================================
// Get Inventory Blocks
// ============================================================================

/**
 * Get all active blocks for an event
 */
export async function getInventoryBlocks(eventId: string): Promise<InventoryBlock[]> {
  try {
    const db = getAdminFirestore()
    const snapshot = await db.collection(INVENTORY_BLOCKS_COLLECTION)
      .where('eventId', '==', eventId)
      .where('status', '==', 'active')
      .orderBy('blockedAt', 'desc')
      .get()

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as InventoryBlock[]
  } catch (error) {
    console.error('[InventoryService] Error getting inventory blocks:', error)
    return []
  }
}

// ============================================================================
// Inventory Logs
// ============================================================================

/**
 * Log an inventory change
 */
async function logInventoryChange(
  db: FirebaseFirestore.Firestore,
  log: Omit<InventoryLog, 'id'>
): Promise<string> {
  const logRef = db.collection(INVENTORY_LOGS_COLLECTION).doc()
  await logRef.set(log)
  return logRef.id
}

/**
 * Get inventory logs for an event
 */
export async function getInventoryLogs(
  eventId: string,
  filter?: InventoryLogFilter,
  limit: number = 50
): Promise<InventoryLog[]> {
  try {
    const db = getAdminFirestore()
    let query: FirebaseFirestore.Query = db.collection(INVENTORY_LOGS_COLLECTION)
      .where('eventId', '==', eventId)
      .orderBy('performedAt', 'desc')
      .limit(limit)

    // Note: Firestore doesn't support multiple inequality filters
    // So we filter in memory for additional criteria

    const snapshot = await query.get()
    let logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as InventoryLog[]

    // Apply filters in memory
    if (filter) {
      if (filter.action) {
        logs = logs.filter(log => log.action === filter.action)
      }
      if (filter.type) {
        logs = logs.filter(log => log.type === filter.type)
      }
      if (filter.performedBy) {
        logs = logs.filter(log => log.performedBy === filter.performedBy)
      }
      if (filter.startDate) {
        logs = logs.filter(log => {
          const logDate = (log.performedAt as any)?.toDate?.() || new Date(log.performedAt as any)
          return logDate >= filter.startDate!
        })
      }
      if (filter.endDate) {
        logs = logs.filter(log => {
          const logDate = (log.performedAt as any)?.toDate?.() || new Date(log.performedAt as any)
          return logDate <= filter.endDate!
        })
      }
    }

    return logs
  } catch (error) {
    console.error('[InventoryService] Error getting inventory logs:', error)
    return []
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get filtered seats for reserved seating
 */
export async function getFilteredSeats(
  eventId: string,
  filter?: SeatInventoryFilter
): Promise<SeatInventory[]> {
  const inventory = await getEventInventorySummary(eventId)
  if (!inventory || inventory.seatingType !== 'reserved') {
    return []
  }

  let seats: SeatInventory[] = []

  if (filter?.sectionId) {
    const section = inventory.sections?.find(s => s.sectionId === filter.sectionId)
    seats = section?.seats || []
  } else {
    inventory.sections?.forEach(section => {
      seats = seats.concat(section.seats)
    })
  }

  if (filter?.status) {
    seats = seats.filter(seat => seat.status === filter.status)
  }

  if (filter?.row) {
    seats = seats.filter(seat => seat.row === filter.row)
  }

  return seats
}
