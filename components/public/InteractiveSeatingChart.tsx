'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'

// Types
interface Seat {
  id: string
  row: string
  number: string | number
  x: number
  y: number
  status: 'available' | 'sold' | 'reserved' | 'blocked' | 'disabled' | 'accessible'
  category?: string // Price category ID
  price?: number // Direct price on seat
  isAccessible?: boolean
  angle?: number
}

interface Section {
  id: string
  name: string
  x: number
  y: number
  seats: Seat[]
  rows?: number
  seatsPerRow?: number
  capacity?: number
  pricing?: string // Price category ID for section
  sectionType?: 'standard' | 'curved'
  curveRadius?: number
  curveAngle?: number
  rotation?: number
}

interface PriceCategory {
  id: string
  name: string
  color: string
  price: number
}

interface Stage {
  x: number
  y: number
  width: number
  height: number
  label?: string
}

interface LayoutData {
  id: string
  name: string
  type: string
  sections: Section[]
  priceCategories: PriceCategory[]
  stage?: Stage
  totalCapacity?: number
}

interface SelectedSeat {
  id: string
  sectionId: string
  sectionName: string
  row: string
  number: string | number
  price: number
  priceCategoryName: string
}

interface InteractiveSeatingChartProps {
  layout: LayoutData
  soldSeats?: string[] // Array of sold seat IDs
  maxSeats?: number
  onSeatSelection: (seats: SelectedSeat[]) => void
  className?: string
}

// Get price for a seat based on category lookup
function getSeatPrice(seat: Seat, section: Section, priceCategories: PriceCategory[]): number {
  // Use direct price on seat if available
  if (seat.price && seat.price > 0) return seat.price

  // Look up price from category
  const categoryId = seat.category || section.pricing
  const priceCategory = priceCategories.find(pc => pc.id === categoryId)
  return priceCategory?.price || 0
}

// Process seats for a section, ensuring price categories are properly set
function processSeatsForSection(section: Section, priceCategories: PriceCategory[]): Seat[] {
  // Get the section's price category (section.pricing holds the category ID)
  const sectionCategoryId = section.pricing || priceCategories[0]?.id
  const sectionCategory = priceCategories.find(pc => pc.id === sectionCategoryId)
  const sectionPrice = sectionCategory?.price || 0

  // If seats already exist, ensure they have category and price
  if (section.seats && section.seats.length > 0) {
    return section.seats.map(seat => ({
      ...seat,
      // Use seat's own category, or fall back to section's pricing
      category: seat.category || sectionCategoryId,
      // Use seat's own price, or look up from category, or use section price
      price: seat.price || priceCategories.find(pc => pc.id === (seat.category || sectionCategoryId))?.price || sectionPrice,
    }))
  }

  // Generate seats based on section configuration
  const seats: Seat[] = []
  const rowCount = section.rows || 5
  const seatsPerRow = section.seatsPerRow || 10

  for (let r = 0; r < rowCount; r++) {
    const rowLabel = String.fromCharCode(65 + r)
    for (let s = 0; s < seatsPerRow; s++) {
      seats.push({
        id: `${section.id}-${rowLabel}-${s + 1}`,
        row: rowLabel,
        number: s + 1,
        x: section.x + 30 + s * 25,
        y: section.y + 30 + r * 28,
        status: 'available',
        category: sectionCategoryId,
        price: sectionPrice,
      })
    }
  }

  return seats
}

export default function InteractiveSeatingChart({
  layout,
  soldSeats = [],
  maxSeats = 10,
  onSeatSelection,
  className = '',
}: InteractiveSeatingChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // View state
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1000, height: 600 })
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // Selection state
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([])
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null)

  // AI recommendations
  const [showAIRecommendation, setShowAIRecommendation] = useState(false)
  const [aiRecommendedSeats, setAIRecommendedSeats] = useState<string[]>([])

  // Touch handling for pinch zoom
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null)

  // Process sections with seats (ensuring price categories are properly assigned)
  const processedSections = useMemo(() => {
    return layout.sections.map(section => ({
      ...section,
      seats: processSeatsForSection(section, layout.priceCategories),
    }))
  }, [layout])

  // Calculate viewBox to fit all content
  useEffect(() => {
    if (!layout.sections.length) return

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    // Include stage
    if (layout.stage) {
      minX = Math.min(minX, layout.stage.x - 20)
      minY = Math.min(minY, layout.stage.y - 20)
      maxX = Math.max(maxX, layout.stage.x + layout.stage.width + 20)
      maxY = Math.max(maxY, layout.stage.y + layout.stage.height + 20)
    }

    // Include all sections and seats
    processedSections.forEach(section => {
      section.seats.forEach(seat => {
        minX = Math.min(minX, seat.x - 15)
        minY = Math.min(minY, seat.y - 15)
        maxX = Math.max(maxX, seat.x + 15)
        maxY = Math.max(maxY, seat.y + 15)
      })
    })

    const padding = 50
    setViewBox({
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    })
  }, [processedSections, layout.stage])

  // Get price category by ID
  const getPriceCategory = useCallback((categoryId?: string): PriceCategory | undefined => {
    return layout.priceCategories.find(cat => cat.id === categoryId)
  }, [layout.priceCategories])

  // Get price for a seat (uses seat.price directly or looks up from category)
  const getSeatPriceValue = useCallback((seat: Seat, section: Section): number => {
    if (seat.price && seat.price > 0) return seat.price
    const categoryId = seat.category || section.pricing
    const priceCategory = layout.priceCategories.find(pc => pc.id === categoryId)
    return priceCategory?.price || 0
  }, [layout.priceCategories])

  // Check if seat is sold
  const isSeatSold = useCallback((seatId: string): boolean => {
    return soldSeats.includes(seatId)
  }, [soldSeats])

  // Check if seat is selected
  const isSeatSelected = useCallback((seatId: string): boolean => {
    return selectedSeats.some(s => s.id === seatId)
  }, [selectedSeats])

  // Handle seat click
  const handleSeatClick = useCallback((seat: Seat, section: Section) => {
    if (isSeatSold(seat.id) || seat.status === 'sold' || seat.status === 'blocked' || seat.status === 'disabled') return

    // Get price from seat or look up from category
    const categoryId = seat.category || section.pricing
    const priceCategory = getPriceCategory(categoryId)
    const seatPrice = seat.price || priceCategory?.price || 0

    setSelectedSeats(prev => {
      const isAlreadySelected = prev.some(s => s.id === seat.id)

      if (isAlreadySelected) {
        // Deselect
        const newSelection = prev.filter(s => s.id !== seat.id)
        onSeatSelection(newSelection)
        return newSelection
      } else {
        // Select (if under max)
        if (prev.length >= maxSeats) {
          // Replace oldest selection
          const newSelection = [...prev.slice(1), {
            id: seat.id,
            sectionId: section.id,
            sectionName: section.name,
            row: seat.row,
            number: seat.number,
            price: seatPrice,
            priceCategoryName: priceCategory?.name || 'Standard',
          }]
          onSeatSelection(newSelection)
          return newSelection
        }

        const newSelection = [...prev, {
          id: seat.id,
          sectionId: section.id,
          sectionName: section.name,
          row: seat.row,
          number: seat.number,
          price: seatPrice,
          priceCategoryName: priceCategory?.name || 'Standard',
        }]
        onSeatSelection(newSelection)
        return newSelection
      }
    })
  }, [getPriceCategory, isSeatSold, maxSeats, onSeatSelection])

  // AI Seat Recommendation Algorithm
  const getAIRecommendedSeats = useCallback((count: number) => {
    const recommendations: string[] = []
    const availableSeats: { seat: Seat; section: Section; score: number }[] = []

    processedSections.forEach(section => {
      section.seats.forEach(seat => {
        if (!isSeatSold(seat.id) && seat.status === 'available') {
          // Calculate seat score based on multiple factors
          let score = 0

          // Center seats are preferred (higher score)
          const allSeatsInRow = section.seats.filter(s => s.row === seat.row)
          const rowMiddle = allSeatsInRow.length / 2
          const seatIndex = allSeatsInRow.findIndex(s => s.id === seat.id)
          const centerDistance = Math.abs(seatIndex - rowMiddle)
          score += Math.max(0, 10 - centerDistance)

          // Front rows preferred for premium experience
          const rowLetter = seat.row.charCodeAt(0)
          if (rowLetter >= 65 && rowLetter <= 90) {
            score += Math.max(0, 26 - (rowLetter - 65)) / 2 // A=13, Z=0
          }

          // Bonus for aisle seats (first and last in row)
          if (seatIndex === 0 || seatIndex === allSeatsInRow.length - 1) {
            score += 3
          }

          // Bonus for accessible seats if near aisle
          if (seat.isAccessible) {
            score += 2
          }

          // Prefer seats with neighbors available (better for groups)
          const neighbors = allSeatsInRow.filter(s =>
            Math.abs(allSeatsInRow.indexOf(s) - seatIndex) === 1 &&
            !isSeatSold(s.id) && s.status === 'available'
          )
          score += neighbors.length * 2

          availableSeats.push({ seat, section, score })
        }
      })
    })

    // Sort by score (highest first) and get consecutive seats if possible
    availableSeats.sort((a, b) => b.score - a.score)

    // Try to find consecutive seats
    for (let i = 0; i < availableSeats.length && recommendations.length < count; i++) {
      const { seat, section } = availableSeats[i]
      if (!recommendations.includes(seat.id)) {
        recommendations.push(seat.id)

        // Try to get adjacent seats
        const allSeatsInRow = section.seats.filter(s => s.row === seat.row)
        const seatIndex = allSeatsInRow.findIndex(s => s.id === seat.id)

        // Check neighbors
        const leftNeighbor = allSeatsInRow[seatIndex - 1]
        const rightNeighbor = allSeatsInRow[seatIndex + 1]

        if (recommendations.length < count && rightNeighbor &&
            !isSeatSold(rightNeighbor.id) && rightNeighbor.status === 'available' &&
            !recommendations.includes(rightNeighbor.id)) {
          recommendations.push(rightNeighbor.id)
        }

        if (recommendations.length < count && leftNeighbor &&
            !isSeatSold(leftNeighbor.id) && leftNeighbor.status === 'available' &&
            !recommendations.includes(leftNeighbor.id)) {
          recommendations.push(leftNeighbor.id)
        }
      }
    }

    return recommendations.slice(0, count)
  }, [processedSections, isSeatSold])

  // Apply AI recommendations
  const applyAIRecommendation = useCallback((count: number = 2) => {
    const recommended = getAIRecommendedSeats(count)
    setAIRecommendedSeats(recommended)
    setShowAIRecommendation(true)

    // Auto-select recommended seats
    const newSelection: SelectedSeat[] = []
    recommended.forEach(seatId => {
      processedSections.forEach(section => {
        const seat = section.seats.find(s => s.id === seatId)
        if (seat) {
          const categoryId = seat.category || section.pricing
          const priceCategory = getPriceCategory(categoryId)
          const seatPrice = seat.price || priceCategory?.price || 0
          newSelection.push({
            id: seat.id,
            sectionId: section.id,
            sectionName: section.name,
            row: seat.row,
            number: seat.number,
            price: seatPrice,
            priceCategoryName: priceCategory?.name || 'Standard',
          })
        }
      })
    })

    setSelectedSeats(newSelection)
    onSeatSelection(newSelection)
  }, [getAIRecommendedSeats, processedSections, getPriceCategory, onSeatSelection])

  // Zoom controls
  const handleZoom = useCallback((delta: number) => {
    setZoom(prev => {
      const newZoom = Math.max(0.5, Math.min(3, prev + delta))
      setViewBox(prevVB => ({
        ...prevVB,
        width: prevVB.width / (newZoom / prev),
        height: prevVB.height / (newZoom / prev),
      }))
      return newZoom
    })
  }, [])

  // Reset view
  const resetView = useCallback(() => {
    setZoom(1)
    // Recalculate initial viewBox
    if (!layout.sections.length) return

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    if (layout.stage) {
      minX = Math.min(minX, layout.stage.x - 20)
      minY = Math.min(minY, layout.stage.y - 20)
      maxX = Math.max(maxX, layout.stage.x + layout.stage.width + 20)
      maxY = Math.max(maxY, layout.stage.y + layout.stage.height + 20)
    }

    processedSections.forEach(section => {
      section.seats.forEach(seat => {
        minX = Math.min(minX, seat.x - 15)
        minY = Math.min(minY, seat.y - 15)
        maxX = Math.max(maxX, seat.x + 15)
        maxY = Math.max(maxY, seat.y + 15)
      })
    })

    const padding = 50
    setViewBox({
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    })
  }, [layout.sections, layout.stage, processedSections])

  // Mouse/touch handlers for panning
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return // Handle touch separately
    setIsPanning(true)
    setPanStart({ x: e.clientX, y: e.clientY })
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return

    const dx = (e.clientX - panStart.x) * (viewBox.width / (containerRef.current?.clientWidth || 1000))
    const dy = (e.clientY - panStart.y) * (viewBox.height / (containerRef.current?.clientHeight || 600))

    setViewBox(prev => ({
      ...prev,
      x: prev.x - dx,
      y: prev.y - dy,
    }))
    setPanStart({ x: e.clientX, y: e.clientY })
  }, [isPanning, panStart, viewBox])

  const handlePointerUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Touch handlers for pinch zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      setLastTouchDistance(dist)
    } else if (e.touches.length === 1) {
      setIsPanning(true)
      setPanStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const delta = (dist - lastTouchDistance) * 0.01
      handleZoom(delta)
      setLastTouchDistance(dist)
    } else if (e.touches.length === 1 && isPanning) {
      const dx = (e.touches[0].clientX - panStart.x) * (viewBox.width / (containerRef.current?.clientWidth || 1000))
      const dy = (e.touches[0].clientY - panStart.y) * (viewBox.height / (containerRef.current?.clientHeight || 600))

      setViewBox(prev => ({
        ...prev,
        x: prev.x - dx,
        y: prev.y - dy,
      }))
      setPanStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    }
  }, [lastTouchDistance, isPanning, panStart, viewBox, handleZoom])

  const handleTouchEnd = useCallback(() => {
    setLastTouchDistance(null)
    setIsPanning(false)
  }, [])

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    handleZoom(e.deltaY > 0 ? -0.1 : 0.1)
  }, [handleZoom])

  // Get seat color based on state and price category
  const getSeatColor = useCallback((seat: Seat, section: Section): string => {
    if (isSeatSold(seat.id) || seat.status === 'sold') return '#374151' // gray-700
    if (seat.status === 'blocked' || seat.status === 'disabled') return '#4b5563' // gray-600
    if (isSeatSelected(seat.id)) return '#22c55e' // green-500
    if (showAIRecommendation && aiRecommendedSeats.includes(seat.id)) return '#f59e0b' // amber-500
    if (hoveredSeat === seat.id) return '#60a5fa' // blue-400

    // Get color from seat's category or section's pricing
    const categoryId = seat.category || section.pricing
    const priceCategory = getPriceCategory(categoryId)
    return priceCategory?.color || '#8b5cf6' // purple-500 default
  }, [isSeatSold, isSeatSelected, showAIRecommendation, aiRecommendedSeats, hoveredSeat, getPriceCategory])

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border-b border-gray-200">
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom(-0.2)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
            title="Zoom out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-sm text-gray-600 min-w-[4rem] text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => handleZoom(0.2)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
            title="Zoom in"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={resetView}
            className="px-3 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
            title="Reset view"
          >
            Reset
          </button>
        </div>

        {/* AI Recommendation */}
        <button
          onClick={() => applyAIRecommendation(2)}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI Best Seats
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 border-b border-gray-200 text-xs">
        <div className="flex items-center gap-4">
          {layout.priceCategories.map(cat => (
            <div key={cat.id} className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: cat.color }} />
              <span className="text-gray-700">{cat.name} - ${cat.price}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span className="text-gray-700">Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-gray-700" />
            <span className="text-gray-700">Sold</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-amber-500" />
            <span className="text-gray-700">AI Pick</span>
          </div>
        </div>
      </div>

      {/* Seating Chart */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-gray-900 overflow-hidden cursor-grab active:cursor-grabbing touch-none"
        style={{ minHeight: '400px' }}
      >
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          {/* Stage */}
          {layout.stage && (
            <g>
              <rect
                x={layout.stage.x}
                y={layout.stage.y}
                width={layout.stage.width}
                height={layout.stage.height}
                fill="#1f2937"
                stroke="#4b5563"
                strokeWidth={2}
                rx={8}
              />
              <text
                x={layout.stage.x + layout.stage.width / 2}
                y={layout.stage.y + layout.stage.height / 2 + 5}
                textAnchor="middle"
                fill="#9ca3af"
                fontSize={14}
                fontWeight="bold"
              >
                {layout.stage.label || 'STAGE'}
              </text>
            </g>
          )}

          {/* Sections and Seats */}
          {processedSections.map(section => (
            <g key={section.id}>
              {/* Section label */}
              <text
                x={section.x + 10}
                y={section.y + 15}
                fill="#d1d5db"
                fontSize={12}
                fontWeight="bold"
              >
                {section.name}
              </text>

              {/* Seats */}
              {section.seats.map(seat => {
                const isClickable = !isSeatSold(seat.id) && seat.status !== 'sold' && seat.status !== 'blocked'

                return (
                  <g
                    key={seat.id}
                    onClick={() => isClickable && handleSeatClick(seat, section)}
                    onMouseEnter={() => isClickable && setHoveredSeat(seat.id)}
                    onMouseLeave={() => setHoveredSeat(null)}
                    style={{ cursor: isClickable ? 'pointer' : 'not-allowed' }}
                  >
                    {/* Seat circle */}
                    <circle
                      cx={seat.x}
                      cy={seat.y}
                      r={10}
                      fill={getSeatColor(seat, section)}
                      stroke={isSeatSelected(seat.id) ? '#ffffff' : 'transparent'}
                      strokeWidth={2}
                      className="transition-all duration-150"
                    />

                    {/* Seat number (show on hover or when selected) */}
                    {(hoveredSeat === seat.id || isSeatSelected(seat.id)) && (
                      <text
                        x={seat.x}
                        y={seat.y + 4}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize={8}
                        fontWeight="bold"
                        pointerEvents="none"
                      >
                        {seat.number}
                      </text>
                    )}

                    {/* Accessible icon */}
                    {seat.isAccessible && (
                      <circle
                        cx={seat.x + 7}
                        cy={seat.y - 7}
                        r={4}
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth={1}
                      />
                    )}
                  </g>
                )
              })}
            </g>
          ))}
        </svg>

        {/* Hovered seat tooltip */}
        {hoveredSeat && (
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-sm">
            {(() => {
              for (const section of processedSections) {
                const seat = section.seats.find(s => s.id === hoveredSeat)
                if (seat) {
                  const categoryId = seat.category || section.pricing
                  const priceCategory = getPriceCategory(categoryId)
                  const seatPrice = seat.price || priceCategory?.price || 0
                  return (
                    <>
                      <div className="font-semibold text-gray-900">{section.name}</div>
                      <div className="text-gray-600">Row {seat.row}, Seat {seat.number}</div>
                      <div className="text-green-600 font-medium">${seatPrice.toFixed(2)}</div>
                    </>
                  )
                }
              }
              return null
            })()}
          </div>
        )}
      </div>

      {/* Mobile instructions */}
      <div className="p-2 bg-gray-100 text-center text-xs text-gray-600 md:hidden">
        Pinch to zoom • Drag to pan • Tap to select
      </div>
    </div>
  )
}
