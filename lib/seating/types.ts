export interface PriceCategory {
  id: string
  name: string
  color: string
  price: number
}

export interface Seat {
  id: string
  row: string
  number: number
  x: number
  y: number
  status: 'available' | 'reserved' | 'sold' | 'disabled'
  price: number
  category: string
}

export interface Section {
  id: string
  name: string
  x: number
  y: number
  rows: number
  seatsPerRow: number
  seats: Seat[]
  pricing: string
  rotation?: number
  rowPricing?: { [row: string]: string }
}

export interface Stage {
  x: number
  y: number
  width: number
  height: number
  label: string
  type: 'stage'
}

export interface Aisle {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  width: number
}

export interface SeatingLayout {
  id: string
  venueId: string
  name: string
  sections: Section[]
  stage: Stage
  aisles: Aisle[]
  capacity: number
  viewBox: {
    x: number
    y: number
    width: number
    height: number
  }
  priceCategories?: PriceCategory[]
}
