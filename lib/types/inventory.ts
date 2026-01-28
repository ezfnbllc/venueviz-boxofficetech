/**
 * Inventory Management Types
 *
 * Types for managing event ticket inventory including:
 * - GA (General Admission) ticket blocks
 * - Reserved seating blocks
 * - Inventory logs for audit trail
 */

import { Timestamp } from 'firebase/firestore'

// ============================================
// Inventory Block Types
// ============================================

export type InventoryBlockType = 'ga' | 'reserved'

export type InventoryBlockStatus = 'active' | 'released'

/**
 * Base interface for inventory blocks
 */
export interface InventoryBlockBase {
  id?: string
  eventId: string
  type: InventoryBlockType
  reason: string
  blockedBy: string        // userId
  blockedByName: string    // user display name
  blockedAt: Timestamp | Date
  notes?: string
  status: InventoryBlockStatus
}

/**
 * GA (General Admission) inventory block
 */
export interface GAInventoryBlock extends InventoryBlockBase {
  type: 'ga'
  tierId: string
  tierName: string
  quantity: number
}

/**
 * Reserved seating inventory block
 */
export interface ReservedInventoryBlock extends InventoryBlockBase {
  type: 'reserved'
  seatId: string           // format: sectionId-row-seatNumber
  sectionId: string
  sectionName: string
  row: string
  seatNumber: string
}

/**
 * Union type for all inventory blocks
 */
export type InventoryBlock = GAInventoryBlock | ReservedInventoryBlock

// ============================================
// Inventory Log Types
// ============================================

export type InventoryLogAction =
  | 'add_capacity'
  | 'remove_capacity'
  | 'block'
  | 'unblock'
  | 'bulk_block'
  | 'bulk_unblock'

export type InventoryLogType = 'ga' | 'reserved'

/**
 * Inventory log entry for audit trail
 */
export interface InventoryLog {
  id?: string
  eventId: string
  action: InventoryLogAction
  type: InventoryLogType

  // For GA operations
  tierId?: string
  tierName?: string
  quantityChange?: number  // +10 or -5

  // For reserved seating operations
  seatIds?: string[]       // affected seats
  sectionId?: string
  sectionName?: string

  reason: string
  previousValue?: number   // for capacity changes
  newValue?: number

  performedBy: string      // userId
  performedByName: string
  performedAt: Timestamp | Date
  notes?: string
}

// ============================================
// Inventory Summary Types
// ============================================

/**
 * Summary of a single GA tier's inventory
 */
export interface GATierInventory {
  tierId: string
  tierName: string
  capacity: number
  sold: number
  blocked: number
  held: number             // temporary checkout holds
  available: number        // capacity - sold - blocked - held
}

/**
 * Summary of a single seat's inventory status
 */
export type SeatStatus = 'available' | 'sold' | 'blocked' | 'held'

export interface SeatInventory {
  seatId: string           // format: sectionId-row-seatNumber
  sectionId: string
  sectionName: string
  row: string
  seatNumber: string
  status: SeatStatus
  blockReason?: string
  blockId?: string         // reference to inventory_blocks document
  price?: number
  priceCategory?: string
}

/**
 * Summary of a section's inventory
 */
export interface SectionInventory {
  sectionId: string
  sectionName: string
  totalSeats: number
  sold: number
  blocked: number
  held: number
  available: number
  seats: SeatInventory[]
}

/**
 * Full inventory summary for an event
 */
export interface EventInventorySummary {
  eventId: string
  eventName: string
  venueId?: string
  venueName?: string
  seatingType: 'general' | 'reserved'

  // Aggregate totals
  totalCapacity: number
  totalSold: number
  totalBlocked: number
  totalHeld: number
  totalAvailable: number

  // GA breakdown (for GA or mixed events)
  gaTiers?: GATierInventory[]

  // Reserved seating breakdown (for reserved seating events)
  sections?: SectionInventory[]
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * Request to add or remove capacity from a tier
 */
export interface CapacityChangeRequest {
  tierId: string
  tierName: string
  change: number           // positive to add, negative to remove
  reason: string
  notes?: string
}

/**
 * Request to block GA tickets
 */
export interface BlockGARequest {
  tierId: string
  tierName: string
  quantity: number
  reason: string
  notes?: string
}

/**
 * Request to block reserved seats
 */
export interface BlockSeatsRequest {
  seats: Array<{
    seatId: string
    sectionId: string
    sectionName: string
    row: string
    seatNumber: string
  }>
  reason: string
  notes?: string
}

/**
 * Request to unblock inventory
 */
export interface UnblockRequest {
  blockIds: string[]
}

/**
 * Response for inventory operations
 */
export interface InventoryOperationResponse {
  success: boolean
  message: string
  affectedCount?: number
  logId?: string
}

// ============================================
// Filter Types
// ============================================

export interface InventoryLogFilter {
  action?: InventoryLogAction
  type?: InventoryLogType
  startDate?: Date
  endDate?: Date
  performedBy?: string
}

export interface SeatInventoryFilter {
  sectionId?: string
  status?: SeatStatus
  row?: string
}
