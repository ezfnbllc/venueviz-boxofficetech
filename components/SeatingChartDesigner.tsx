'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Section, Row, Seat, SeatingLayout, DesignerState } from '@/lib/seating/types'

interface SeatingChartDesignerProps {
  layout: SeatingLayout
  onSave: (layout: SeatingLayout) => void
  mode: 'edit' | 'preview'
  selectedEventId?: string
  pricingTiers?: any[]
}

export default function SeatingChartDesigner({ 
  layout: initialLayout, 
  onSave, 
  mode = 'edit',
  selectedEventId,
  pricingTiers = []
}: SeatingChartDesignerProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [layout, setLayout] = useState<SeatingLayout>(initialLayout)
  const [state, setState] = useState<DesignerState>({
    selectedSection: null,
    selectedSeats: new Set(),
    zoom: 1,
    pan: { x: 0, y: 0 },
    mode: 'select',
    showGrid: true,
    gridSize: 20
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [seatStatuses, setSeatStatuses] = useState<Map<string, string>>(new Map())

  // Load seat availability if in preview mode
  useEffect(() => {
    if (mode === 'preview' && selectedEventId) {
      loadSeatAvailability()
    }
  }, [selectedEventId, mode])

  const loadSeatAvailability = async () => {
    if (!selectedEventId) return
    try {
      const response = await fetch(`/api/seats/availability?eventId=${selectedEventId}`)
      const data = await response.json()
      const statusMap = new Map()
      data.seats?.forEach((seat: any) => {
        statusMap.set(seat.seatId, seat.status)
      })
      setSeatStatuses(statusMap)
    } catch (error) {
      console.error('Error loading seat availability:', error)
    }
  }

  // Zoom handling
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setState(prev => ({
        ...prev,
        zoom: Math.max(0.1, Math.min(5, prev.zoom * delta))
      }))
    }
  }, [])

  // Pan handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - state.pan.x, y: e.clientY - state.pan.y })
    }
  }, [state.pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setState(prev => ({
        ...prev,
        pan: {
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        }
      }))
    }
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Generate row labels (A, B, C, etc.)
  const getRowLabel = (index: number): string => {
    return String.fromCharCode(65 + index)
  }

  // Render a single seat
  const renderSeat = (seat: Seat, section: Section) => {
    const seatStatus = seatStatuses.get(seat.id) || seat.status
    const isSelected = state.selectedSeats.has(seat.id)
    
    let fillColor = '#4a5568' // Default gray
    if (mode === 'preview') {
      switch (seatStatus) {
        case 'available': fillColor = '#48bb78'; break
        case 'sold': fillColor = '#e53e3e'; break
        case 'held': fillColor = '#ed8936'; break
        case 'blocked': fillColor = '#718096'; break
      }
    } else {
      // Edit mode - show pricing colors
      switch (section.pricing) {
        case 'vip': fillColor = '#ffd700'; break
        case 'premium': fillColor = '#c0c0c0'; break
        case 'standard': fillColor = '#cd7f32'; break
        case 'economy': fillColor = '#4a5568'; break
      }
    }

    const seatSize = seat.type === 'wheelchair' ? 16 : 12
    const seatShape = seat.type === 'wheelchair' ? 'rect' : 'circle'

    return (
      <g key={seat.id} transform={`translate(${seat.x}, ${seat.y}) rotate(${seat.angle || 0})`}>
        {seatShape === 'rect' ? (
          <rect
            x={-seatSize/2}
            y={-seatSize/2}
            width={seatSize}
            height={seatSize}
            fill={fillColor}
            stroke={isSelected ? '#fff' : '#000'}
            strokeWidth={isSelected ? 2 : 1}
            rx={2}
            className={mode === 'preview' && seatStatus === 'available' ? 'cursor-pointer hover:opacity-80' : ''}
            onClick={() => mode === 'preview' && handleSeatClick(seat)}
          />
        ) : (
          <circle
            r={seatSize/2}
            fill={fillColor}
            stroke={isSelected ? '#fff' : '#000'}
            strokeWidth={isSelected ? 2 : 1}
            className={mode === 'preview' && seatStatus === 'available' ? 'cursor-pointer hover:opacity-80' : ''}
            onClick={() => mode === 'preview' && handleSeatClick(seat)}
          />
        )}
        {state.zoom > 0.8 && (
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={8}
            fill="#fff"
            pointerEvents="none"
          >
            {seat.number}
          </text>
        )}
      </g>
    )
  }

  // Render a curved row
  const renderCurvedRow = (row: Row, section: Section) => {
    if (!row.curve) return null
    
    const { radius, startAngle, endAngle } = row.curve
    const centerX = section.x
    const centerY = section.y
    
    return row.seats.map((seat, index) => {
      const angleStep = (endAngle - startAngle) / (row.seats.length - 1)
      const angle = startAngle + angleStep * index
      const x = centerX + radius * Math.cos(angle * Math.PI / 180)
      const y = centerY + radius * Math.sin(angle * Math.PI / 180)
      
      return renderSeat({ ...seat, x, y, angle }, section)
    })
  }

  // Render a section
  const renderSection = (section: Section) => {
    const isSelected = state.selectedSection === section.id
    
    return (
      <g key={section.id} transform={`translate(${section.x}, ${section.y}) rotate(${section.rotation})`}>
        {mode === 'edit' && (
          <rect
            x={-50}
            y={-50}
            width={300}
            height={200}
            fill="none"
            stroke={isSelected ? '#fff' : 'transparent'}
            strokeWidth={2}
            strokeDasharray="5,5"
            className="cursor-move"
            onClick={() => handleSectionClick(section)}
          />
        )}
        <text x={0} y={-30} fontSize={14} fill="#fff" textAnchor="middle">
          {section.name}
        </text>
        {section.rows.map((row, rowIndex) => {
          if (section.curved && row.curve) {
            return renderCurvedRow(row, section)
          }
          return row.seats.map(seat => renderSeat(seat, section))
        })}
      </g>
    )
  }

  // Handle seat selection
  const handleSeatClick = (seat: Seat) => {
    if (mode !== 'preview') return
    
    setState(prev => {
      const newSelected = new Set(prev.selectedSeats)
      if (newSelected.has(seat.id)) {
        newSelected.delete(seat.id)
      } else {
        newSelected.add(seat.id)
      }
      return { ...prev, selectedSeats: newSelected }
    })
  }

  // Handle section selection
  const handleSectionClick = (section: Section) => {
    if (mode !== 'edit') return
    setState(prev => ({ ...prev, selectedSection: section.id }))
  }

  // Add new section
  const addSection = () => {
    const newSection: Section = {
      id: `section-${Date.now()}`,
      name: `Section ${layout.sections.length + 1}`,
      x: 400,
      y: 300,
      rows: [],
      pricing: 'standard',
      rotation: 0,
      color: '#4a5568',
      curved: false
    }
    
    // Generate default rows
    for (let r = 0; r < 10; r++) {
      const row: Row = {
        id: `row-${r}`,
        label: getRowLabel(r),
        seats: [],
        y: r * 20
      }
      
      // Generate seats
      for (let s = 0; s < 15; s++) {
        const seat: Seat = {
          id: `${newSection.id}-R${r}S${s}`,
          sectionId: newSection.id,
          row: row.label,
          number: (s + 1).toString(),
          x: s * 15,
          y: row.y,
          status: 'available',
          type: 'regular'
        }
        row.seats.push(seat)
      }
      newSection.rows.push(row)
    }
    
    setLayout(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }))
  }

  // Delete selected section
  const deleteSection = () => {
    if (!state.selectedSection) return
    setLayout(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== state.selectedSection)
    }))
    setState(prev => ({ ...prev, selectedSection: null }))
  }

  // Make section curved
  const toggleCurve = () => {
    if (!state.selectedSection) return
    setLayout(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id === state.selectedSection) {
          const curved = !section.curved
          if (curved) {
            // Add curve data to rows
            section.rows = section.rows.map((row, index) => ({
              ...row,
              curve: {
                radius: 100 + index * 15,
                startAngle: -30,
                endAngle: 30
              }
            }))
          } else {
            // Remove curve data
            section.rows = section.rows.map(row => {
              const { curve, ...rest } = row
              return rest
            })
          }
          return { ...section, curved }
        }
        return section
      })
    }))
  }

  const viewBox = layout.viewBox || { x: 0, y: 0, width: 1200, height: 800 }

  return (
    <div className="relative h-full">
      {/* Toolbar */}
      {mode === 'edit' && (
        <div className="absolute top-4 left-4 z-10 bg-black/80 rounded-lg p-4 space-x-2">
          <button
            onClick={addSection}
            className="px-3 py-1 bg-green-600 rounded text-sm"
          >
            + Add Section
          </button>
          <button
            onClick={deleteSection}
            disabled={!state.selectedSection}
            className="px-3 py-1 bg-red-600 rounded text-sm disabled:opacity-50"
          >
            Delete Section
          </button>
          <button
            onClick={toggleCurve}
            disabled={!state.selectedSection}
            className="px-3 py-1 bg-blue-600 rounded text-sm disabled:opacity-50"
          >
            Toggle Curve
          </button>
          <button
            onClick={() => onSave(layout)}
            className="px-3 py-1 bg-purple-600 rounded text-sm"
          >
            Save Layout
          </button>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-10 bg-black/80 rounded-lg p-2 space-y-2">
        <button
          onClick={() => setState(prev => ({ ...prev, zoom: Math.min(5, prev.zoom * 1.2) }))}
          className="w-8 h-8 bg-gray-700 rounded hover:bg-gray-600"
        >
          +
        </button>
        <div className="text-center text-xs">{Math.round(state.zoom * 100)}%</div>
        <button
          onClick={() => setState(prev => ({ ...prev, zoom: Math.max(0.1, prev.zoom * 0.8) }))}
          className="w-8 h-8 bg-gray-700 rounded hover:bg-gray-600"
        >
          -
        </button>
        <button
          onClick={() => setState(prev => ({ ...prev, zoom: 1, pan: { x: 0, y: 0 } }))}
          className="w-8 h-8 bg-gray-700 rounded hover:bg-gray-600 text-xs"
        >
          ⟲
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-black/80 rounded-lg p-3">
        <div className="text-xs space-y-1">
          {mode === 'preview' ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Sold</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Held</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>VIP</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span>Premium</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-700 rounded-full"></div>
                <span>Standard</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Selected seats info */}
      {mode === 'preview' && state.selectedSeats.size > 0 && (
        <div className="absolute bottom-4 right-4 z-10 bg-black/80 rounded-lg p-3">
          <p className="text-sm">{state.selectedSeats.size} seats selected</p>
        </div>
      )}

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full bg-gray-900"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={`translate(${state.pan.x}, ${state.pan.y}) scale(${state.zoom})`}>
          {/* Grid */}
          {mode === 'edit' && state.showGrid && (
            <defs>
              <pattern id="grid" width={state.gridSize} height={state.gridSize} patternUnits="userSpaceOnUse">
                <path d={`M ${state.gridSize} 0 L 0 0 0 ${state.gridSize}`} fill="none" stroke="#2a2a2a" strokeWidth="0.5"/>
              </pattern>
            </defs>
          )}
          {mode === 'edit' && state.showGrid && (
            <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill="url(#grid)" />
          )}

          {/* Stage/Screen */}
          <rect
            x={layout.stage.x}
            y={layout.stage.y}
            width={layout.stage.width}
            height={layout.stage.height}
            fill="#4a5568"
            rx={5}
          />
          <text
            x={layout.stage.x + layout.stage.width / 2}
            y={layout.stage.y + layout.stage.height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            fontSize={16}
            fontWeight="bold"
          >
            {layout.stage.label}
          </text>

          {/* Sections */}
          {layout.sections.map(renderSection)}

          {/* Aisles */}
          {layout.aisles.map(aisle => (
            <line
              key={aisle.id}
              x1={aisle.startX}
              y1={aisle.startY}
              x2={aisle.endX}
              y2={aisle.endY}
              stroke="#333"
              strokeWidth={aisle.width}
              strokeDasharray="5,5"
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
