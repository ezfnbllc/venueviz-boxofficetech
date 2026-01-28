/**
 * Inventory Management Types
 */

export interface InventoryBlock {
  id: string
  eventId: string
  type: 'ga' | 'reserved'

  // For GA tickets
  tierId?: string
  tierName?: string
  quantity?: number

  // For reserved seating
  seatId?: string          // format: sectionId-row-seatNumber
  sectionId?: string
  sectionName?: string
  row?: string
  seatNumber?: string

  reason: string           // "VIP Hold", "Promoter Reserve", etc.
  blockedBy: string        // userId
  blockedByName: string    // user display name
  blockedAt: Date
  notes?: string
}

export interface InventoryLog {
  id: string
  eventId: string
  action: 'add_capacity' | 'remove_capacity' | 'block' | 'unblock' | 'bulk_block' | 'bulk_unblock'
  type: 'ga' | 'reserved'

  // For GA
  tierId?: string
  tierName?: string
  quantityChange?: number  // +10 or -5

  // For reserved
  seatIds?: string[]       // affected seats
  sectionId?: string

  reason: string
  previousValue?: number   // for capacity changes
  newValue?: number
  performedBy: string      // userId
  performedByName: string
  performedAt: Date
  notes?: string
}

export interface TierInventory {
  tierId: string
  tierName: string
  capacity: number
  sold: number
  blocked: number
  held: number           // temporary checkout holds
  available: number
  price?: number
}

export interface EventInventory {
  eventId: string
  eventName: string
  totalCapacity: number
  totalSold: number
  totalBlocked: number
  totalHeld: number
  totalAvailable: number
  tiers: TierInventory[]
  lastUpdated: Date
}

export interface InventorySummary {
  capacity: number
  sold: number
  blocked: number
  available: number
}
