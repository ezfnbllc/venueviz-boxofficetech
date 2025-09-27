export interface Seat {
  id: string
  sectionId: string
  row: string
  number: string
  x: number
  y: number
  status: 'available' | 'sold' | 'held' | 'blocked'
  type: 'regular' | 'wheelchair' | 'vip' | 'premium'
  price?: number
  angle?: number
}

export interface Section {
  id: string
  name: string
  x: number
  y: number
  rows: Row[]
  pricing: 'vip' | 'premium' | 'standard' | 'economy'
  rotation: number
  color: string
  curved: boolean
  curveRadius?: number
  curveAngle?: number
}

export interface Row {
  id: string
  label: string
  seats: Seat[]
  y: number
  curve?: {
    startAngle: number
    endAngle: number
    radius: number
  }
}

export interface SeatingLayout {
  id: string
  venueId: string
  name: string
  sections: Section[]
  stage: {
    x: number
    y: number
    width: number
    height: number
    label: string
    type: 'stage' | 'screen' | 'field'
  }
  aisles: Aisle[]
  capacity: number
  viewBox: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface Aisle {
  id: string
  startX: number
  startY: number
  endX: number
  endY: number
  width: number
}

export interface DesignerState {
  selectedSection: string | null
  selectedSeats: Set<string>
  zoom: number
  pan: { x: number; y: number }
  mode: 'select' | 'add' | 'delete' | 'edit'
  showGrid: boolean
  gridSize: number
}
