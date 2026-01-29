'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'

interface Seat {
  id: string
  row: string
  number: string | number
  x: number
  y: number
  status: 'available' | 'sold' | 'reserved' | 'blocked' | 'disabled' | 'accessible'
  category?: string
  price?: number
  isAccessible?: boolean
}

interface Section {
  id: string
  name: string
  x: number
  y: number
  seats: Seat[]
  rows?: number
  seatsPerRow?: number
  pricing?: string
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
}

interface AdminSeatingChartProps {
  layout: LayoutData
  eventId: string
  soldSeats: string[]
  blockedSeats: string[]
  heldSeats: string[]
  onBlockSeats: (seatIds: string[], reason: string) => Promise<void>
  onUnblockSeats: (seatIds: string[]) => Promise<void>
}

function processSeatsForSection(section: Section, priceCategories: PriceCategory[]): Seat[] {
  const sectionCategoryId = section.pricing || priceCategories[0]?.id
  const sectionCategory = priceCategories.find(pc => pc.id === sectionCategoryId)
  const sectionPrice = sectionCategory?.price || 0

  if (section.seats && section.seats.length > 0) {
    return section.seats.map(seat => ({
      ...seat,
      category: seat.category || sectionCategoryId,
      price: seat.price || priceCategories.find(pc => pc.id === (seat.category || sectionCategoryId))?.price || sectionPrice,
    }))
  }

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

export default function AdminSeatingChart({
  layout,
  eventId,
  soldSeats,
  blockedSeats,
  heldSeats,
  onBlockSeats,
  onUnblockSeats,
}: AdminSeatingChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1000, height: 600 })
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

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
  }, [processedSections, layout.stage])

  const getConsistentSeatId = useCallback((seat: Seat, section: Section): string => {
    return `${section.id}-${seat.row}-${seat.number}`
  }, [])

  const isSeatSold = useCallback((seat: Seat, section: Section): boolean => {
    const consistentId = getConsistentSeatId(seat, section)
    return soldSeats.includes(consistentId)
  }, [soldSeats, getConsistentSeatId])

  const isSeatBlocked = useCallback((seat: Seat, section: Section): boolean => {
    const consistentId = getConsistentSeatId(seat, section)
    return blockedSeats.includes(consistentId)
  }, [blockedSeats, getConsistentSeatId])

  const isSeatHeld = useCallback((seat: Seat, section: Section): boolean => {
    const consistentId = getConsistentSeatId(seat, section)
    return heldSeats.includes(consistentId)
  }, [heldSeats, getConsistentSeatId])

  const isSeatSelected = useCallback((seatId: string): boolean => {
    return selectedSeats.includes(seatId)
  }, [selectedSeats])

  const handleSeatClick = useCallback((seat: Seat, section: Section) => {
    const seatId = getConsistentSeatId(seat, section)

    // Can't select sold or held seats (held seats are in customer carts)
    if (isSeatSold(seat, section) || isSeatHeld(seat, section)) return

    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(prev => prev.filter(id => id !== seatId))
    } else {
      setSelectedSeats(prev => [...prev, seatId])
    }
  }, [getConsistentSeatId, isSeatSold, isSeatHeld, selectedSeats])

  const handleBlockSelected = async () => {
    if (selectedSeats.length === 0 || !blockReason) return

    // Only block seats that aren't already blocked, sold, or held
    const seatsToBlock = selectedSeats.filter(seatId => {
      return !blockedSeats.includes(seatId) && !soldSeats.includes(seatId) && !heldSeats.includes(seatId)
    })

    if (seatsToBlock.length === 0) {
      alert('All selected seats are already blocked, sold, or currently held by customers')
      return
    }

    setIsProcessing(true)
    try {
      await onBlockSeats(seatsToBlock, blockReason)
      setSelectedSeats([])
      setShowBlockModal(false)
      setBlockReason('')
    } catch (err) {
      alert('Failed to block seats')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUnblockSelected = async () => {
    // Only unblock seats that are blocked
    const seatsToUnblock = selectedSeats.filter(seatId => blockedSeats.includes(seatId))

    if (seatsToUnblock.length === 0) {
      alert('No blocked seats selected')
      return
    }

    setIsProcessing(true)
    try {
      await onUnblockSeats(seatsToUnblock)
      setSelectedSeats([])
    } catch (err) {
      alert('Failed to unblock seats')
    } finally {
      setIsProcessing(false)
    }
  }

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

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return
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

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    handleZoom(e.deltaY > 0 ? -0.1 : 0.1)
  }, [handleZoom])

  const getSeatColor = useCallback((seat: Seat, section: Section): string => {
    const seatId = getConsistentSeatId(seat, section)

    if (isSeatSold(seat, section)) return '#374151' // gray-700 - sold
    if (isSeatBlocked(seat, section)) return '#9ca3af' // gray-400 - blocked
    if (isSeatHeld(seat, section)) return '#eab308' // yellow-500 - held by customer
    if (isSeatSelected(seatId)) return '#3b82f6' // blue-500 - selected
    if (hoveredSeat === seatId) return '#60a5fa' // blue-400 - hovered

    // Get color from category
    const categoryId = seat.category || section.pricing
    const priceCategory = layout.priceCategories.find(pc => pc.id === categoryId)
    return priceCategory?.color || '#22c55e' // green-500 default (available)
  }, [getConsistentSeatId, isSeatSold, isSeatBlocked, isSeatHeld, isSeatSelected, hoveredSeat, layout.priceCategories])

  const selectedBlockedCount = selectedSeats.filter(id => blockedSeats.includes(id)).length
  const selectedAvailableCount = selectedSeats.filter(id => !blockedSeats.includes(id) && !soldSeats.includes(id) && !heldSeats.includes(id)).length

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-100 dark:bg-slate-700 rounded-t-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom(-0.2)}
            className="w-8 h-8 flex items-center justify-center rounded bg-white dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200"
          >
            -
          </button>
          <span className="text-sm text-slate-600 dark:text-slate-300 min-w-[4rem] text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => handleZoom(0.2)}
            className="w-8 h-8 flex items-center justify-center rounded bg-white dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200"
          >
            +
          </button>
        </div>

        <div className="flex items-center gap-2">
          {selectedSeats.length > 0 && (
            <>
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {selectedSeats.length} selected
              </span>
              {selectedAvailableCount > 0 && (
                <button
                  onClick={() => setShowBlockModal(true)}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded text-sm"
                >
                  Block ({selectedAvailableCount})
                </button>
              )}
              {selectedBlockedCount > 0 && (
                <button
                  onClick={handleUnblockSelected}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded text-sm"
                >
                  Unblock ({selectedBlockedCount})
                </button>
              )}
              <button
                onClick={() => setSelectedSeats([])}
                className="px-3 py-1.5 bg-slate-500 hover:bg-slate-600 text-white rounded text-sm"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-3 py-2 bg-slate-50 dark:bg-slate-800 text-xs border-b border-slate-200 dark:border-slate-700">
        {layout.priceCategories.map(cat => (
          <div key={cat.id} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
            <span className="text-slate-600 dark:text-slate-400">{cat.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span className="text-slate-600 dark:text-slate-400">Blocked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-700" />
          <span className="text-slate-600 dark:text-slate-400">Sold</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-slate-600 dark:text-slate-400">Held</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-slate-600 dark:text-slate-400">Selected</span>
        </div>
      </div>

      {/* Seating Chart */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-slate-900 overflow-hidden cursor-grab active:cursor-grabbing"
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
              <text
                x={section.x + 10}
                y={section.y + 15}
                fill="#d1d5db"
                fontSize={12}
                fontWeight="bold"
              >
                {section.name}
              </text>

              {section.seats.map(seat => {
                const seatId = getConsistentSeatId(seat, section)
                const isSold = isSeatSold(seat, section)
                const isBlocked = isSeatBlocked(seat, section)
                const isSelected = isSeatSelected(seatId)

                return (
                  <g
                    key={seat.id}
                    onClick={() => !isSold && handleSeatClick(seat, section)}
                    onMouseEnter={() => setHoveredSeat(seatId)}
                    onMouseLeave={() => setHoveredSeat(null)}
                    style={{ cursor: isSold ? 'not-allowed' : 'pointer' }}
                  >
                    <circle
                      cx={seat.x}
                      cy={seat.y}
                      r={10}
                      fill={getSeatColor(seat, section)}
                      stroke={isSelected ? '#ffffff' : 'transparent'}
                      strokeWidth={2}
                      className="transition-all duration-150"
                    />
                    {(hoveredSeat === seatId || isSelected) && (
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
                  </g>
                )
              })}
            </g>
          ))}
        </svg>

        {/* Tooltip */}
        {hoveredSeat && (
          <div className="absolute bottom-4 left-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-3 text-sm">
            {(() => {
              for (const section of processedSections) {
                const seat = section.seats.find(s => getConsistentSeatId(s, section) === hoveredSeat)
                if (seat) {
                  const isSold = isSeatSold(seat, section)
                  const isBlocked = isSeatBlocked(seat, section)
                  return (
                    <>
                      <div className="font-semibold text-slate-900 dark:text-white">{section.name}</div>
                      <div className="text-slate-600 dark:text-slate-400">Row {seat.row}, Seat {seat.number}</div>
                      <div className={`font-medium ${isSold ? 'text-gray-500' : isBlocked ? 'text-orange-500' : 'text-green-500'}`}>
                        {isSold ? 'Sold' : isBlocked ? 'Blocked' : 'Available'}
                      </div>
                    </>
                  )
                }
              }
              return null
            })()}
          </div>
        )}
      </div>

      {/* Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Block {selectedAvailableCount} Seat{selectedAvailableCount !== 1 ? 's' : ''}
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reason
              </label>
              <select
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Select a reason...</option>
                <option value="VIP Reserve">VIP Reserve</option>
                <option value="Promoter Hold">Promoter Hold</option>
                <option value="Production Hold">Production Hold</option>
                <option value="Obstructed View">Obstructed View</option>
                <option value="Technical Issue">Technical Issue</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowBlockModal(false); setBlockReason('') }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockSelected}
                disabled={!blockReason || isProcessing}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded-lg"
              >
                {isProcessing ? 'Blocking...' : 'Block Seats'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
