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
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [layout, setLayout] = useState<SeatingLayout>(initialLayout)
  const [state, setState] = useState<DesignerState>({
    selectedSection: null,
    selectedSeats: new Set(),
    zoom: 0.7,
    pan: { x: 0, y: 0 },
    mode: 'select',
    showGrid: true,
    gridSize: 20
  })
  const [isDragging, setIsDragging] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [sectionDragStart, setSectionDragStart] = useState({ x: 0, y: 0 })
  const [seatStatuses, setSeatStatuses] = useState<Map<string, string>>(new Map())
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [imageOpacity, setImageOpacity] = useState(0.3)
  const [aiProcessing, setAiProcessing] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setBackgroundImage(base64)
      setShowAIPanel(true)
    }
    reader.readAsDataURL(file)
  }

  const analyzeImage = async () => {
    if (!backgroundImage) return
    
    setAiProcessing(true)
    try {
      const response = await fetch('/api/analyze-seating-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: backgroundImage,
          venueType: 'theater',
          existingCapacity: layout.capacity
        })
      })

      const data = await response.json()
      
      if (response.ok && data.sections && data.sections.length > 0) {
        setLayout(prev => ({
          ...prev,
          sections: data.sections,
          capacity: data.totalCapacity || prev.capacity,
          stage: data.stage || prev.stage
        }))
        
        alert(data.message || `AI detected ${data.sections.length} sections with ${data.totalCapacity} total seats`)
      } else {
        alert(data.error || 'Could not analyze image. Please try manual creation.')
      }
    } catch (error) {
      console.error('AI analysis error:', error)
      alert('Error analyzing image. Please try manual creation.')
    }
    setAiProcessing(false)
  }

  const generateFromTemplate = async (template: string) => {
    setAiProcessing(true)
    try {
      const response = await fetch('/api/generate-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueName: layout.name || 'Venue',
          venueType: template,
          capacity: layout.capacity || 1000,
          layoutType: 'seating_chart'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setLayout(prev => ({
          ...prev,
          sections: data.sections || [],
          capacity: data.totalCapacity || prev.capacity
        }))
      }
    } catch (error) {
      console.error('Template generation error:', error)
    }
    setAiProcessing(false)
  }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setState(prev => ({
        ...prev,
        zoom: Math.max(0.3, Math.min(2, prev.zoom * delta))
      }))
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as SVGElement
    
    if (mode === 'edit' && target.dataset.sectionId) {
      const sectionId = target.dataset.sectionId
      const section = layout.sections.find(s => s.id === sectionId)
      if (section) {
        setState(prev => ({ ...prev, selectedSection: sectionId }))
        setIsDragging(true)
        setSectionDragStart({ 
          x: e.clientX - section.x, 
          y: e.clientY - section.y 
        })
        e.preventDefault()
        return
      }
    }
    
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true)
      setDragStart({ x: e.clientX - state.pan.x, y: e.clientY - state.pan.y })
      e.preventDefault()
    }
  }, [state.pan, mode, layout.sections])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && state.selectedSection) {
      const newX = e.clientX - sectionDragStart.x
      const newY = e.clientY - sectionDragStart.y
      
      setLayout(prev => ({
        ...prev,
        sections: prev.sections.map(section => 
          section.id === state.selectedSection 
            ? { ...section, x: newX, y: newY }
            : section
        )
      }))
    } else if (isPanning) {
      setState(prev => ({
        ...prev,
        pan: {
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        }
      }))
    }
  }, [isDragging, isPanning, dragStart, sectionDragStart, state.selectedSection])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsPanning(false)
  }, [])

  const getRowLabel = (index: number): string => {
    return String.fromCharCode(65 + index)
  }

  const renderSeat = (seat: Seat, section: Section, actualX?: number, actualY?: number, angle?: number) => {
    const seatStatus = seatStatuses.get(seat.id) || seat.status
    const isSelected = state.selectedSeats.has(seat.id)
    
    let fillColor = '#4a5568'
    if (mode === 'preview') {
      switch (seatStatus) {
        case 'available': fillColor = '#48bb78'; break
        case 'sold': fillColor = '#e53e3e'; break
        case 'held': fillColor = '#ed8936'; break
        case 'blocked': fillColor = '#718096'; break
      }
    } else {
      switch (section.pricing) {
        case 'vip': fillColor = '#ffd700'; break
        case 'premium': fillColor = '#c0c0c0'; break
        case 'standard': fillColor = '#cd7f32'; break
        case 'economy': fillColor = '#4a5568'; break
      }
    }

    const seatSize = seat.type === 'wheelchair' ? 16 : 12
    const x = actualX !== undefined ? actualX : seat.x
    const y = actualY !== undefined ? actualY : seat.y
    const rotation = angle !== undefined ? angle : seat.angle || 0

    return (
      <g key={seat.id} transform={`translate(${x}, ${y}) rotate(${rotation})`}>
        {seat.type === 'wheelchair' ? (
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
        {state.zoom > 0.6 && (
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

  const renderCurvedRow = (row: Row, section: Section, rowIndex: number) => {
    if (!row.curve) return null
    
    const { radius, startAngle, endAngle } = row.curve
    const centerX = 0
    const centerY = 0
    
    const angleRange = endAngle - startAngle
    const arcLength = (angleRange * Math.PI * radius) / 180
    
    const desiredSeatSpacing = 18
    const maxSeatsInRow = Math.floor(arcLength / desiredSeatSpacing)
    const seatCount = Math.min(row.seats.length, maxSeatsInRow)
    
    const actualAngleRange = (desiredSeatSpacing * (seatCount - 1) * 180) / (Math.PI * radius)
    const actualStartAngle = -(actualAngleRange / 2)
    const actualEndAngle = actualAngleRange / 2
    const angleStep = actualAngleRange / (seatCount - 1)
    
    return row.seats.slice(0, seatCount).map((seat, index) => {
      const angle = actualStartAngle + angleStep * index
      const radians = angle * Math.PI / 180
      
      const x = centerX + radius * Math.cos(radians)
      const y = centerY + radius * Math.sin(radians)
      const seatRotation = angle + 90
      
      return renderSeat(seat, section, x, y, seatRotation)
    })
  }

  const renderSection = (section: Section) => {
    const isSelected = state.selectedSection === section.id
    
    return (
      <g key={section.id} transform={`translate(${section.x}, ${section.y}) rotate(${section.rotation})`}>
        {mode === 'edit' && (
          <rect
            x={-100}
            y={-50}
            width={400}
            height={350}
            fill="transparent"
            stroke={isSelected ? '#fff' : 'transparent'}
            strokeWidth={2}
            strokeDasharray="5,5"
            className="cursor-move"
            data-section-id={section.id}
            onMouseDown={handleMouseDown}
          />
        )}
        <text 
          x={0} 
          y={-35} 
          fontSize={16} 
          fill="#fff" 
          textAnchor="middle"
          pointerEvents="none"
          fontWeight="bold"
        >
          {section.name}
        </text>
        {section.rows.map((row, rowIndex) => {
          if (section.curved && row.curve) {
            return <g key={row.id}>{renderCurvedRow(row, section, rowIndex)}</g>
          }
          return (
            <g key={row.id}>
              {row.seats.map(seat => renderSeat(seat, section))}
            </g>
          )
        })}
      </g>
    )
  }

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

  const addSection = () => {
    const newSection: Section = {
      id: `section-${Date.now()}`,
      name: `Section ${layout.sections.length + 1}`,
      x: 400 + (layout.sections.length * 50),
      y: 350,
      rows: [],
      pricing: 'standard',
      rotation: 0,
      color: '#4a5568',
      curved: false
    }
    
    for (let r = 0; r < 10; r++) {
      const row: Row = {
        id: `${newSection.id}-row-${r}`,
        label: getRowLabel(r),
        seats: [],
        y: r * 25
      }
      
      for (let s = 0; s < 20; s++) {
        const seat: Seat = {
          id: `${newSection.id}-R${r}S${s}`,
          sectionId: newSection.id,
          row: row.label,
          number: (s + 1).toString(),
          x: (s - 10) * 18,
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
      sections: [...prev.sections, newSection],
      capacity: prev.capacity + 200
    }))
  }

  const deleteSection = () => {
    if (!state.selectedSection) return
    const section = layout.sections.find(s => s.id === state.selectedSection)
    if (!section) return
    
    const seatCount = section.rows.reduce((sum, row) => sum + row.seats.length, 0)
    
    setLayout(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== state.selectedSection),
      capacity: prev.capacity - seatCount
    }))
    setState(prev => ({ ...prev, selectedSection: null }))
  }

  const toggleCurve = () => {
    if (!state.selectedSection) return
    setLayout(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id === state.selectedSection) {
          const curved = !section.curved
          if (curved) {
            section.rows = section.rows.map((row, index) => {
              const baseRadius = 120
              const radiusIncrement = 30
              const radius = baseRadius + (index * radiusIncrement)
              const angleRange = 70
              
              return {
                ...row,
                curve: {
                  radius: radius,
                  startAngle: -(angleRange / 2),
                  endAngle: angleRange / 2
                }
              }
            })
          } else {
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

  const rotateSection = (angle: number) => {
    if (!state.selectedSection) return
    setLayout(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.id === state.selectedSection 
          ? { ...section, rotation: (section.rotation + angle) % 360 }
          : section
      )
    }))
  }

  const changePricing = (pricing: 'vip' | 'premium' | 'standard' | 'economy') => {
    if (!state.selectedSection) return
    setLayout(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.id === state.selectedSection 
          ? { ...section, pricing }
          : section
      )
    }))
  }

  const clearLayout = () => {
    if (confirm('Are you sure you want to clear all sections?')) {
      setLayout(prev => ({
        ...prev,
        sections: [],
        capacity: 0
      }))
    }
  }

  const viewBox = layout.viewBox || { x: 0, y: 0, width: 1400, height: 900 }

  return (
    <div ref={containerRef} className="relative h-full bg-gray-900 overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* AI Panel - Moved further down to avoid overlap */}
      {showAIPanel && mode === 'edit' && (
        <div className="absolute top-24 left-4 z-30 bg-black/90 backdrop-blur rounded-lg p-3 w-64">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-sm">AI Assistant</h3>
            <button
              onClick={() => {
                setShowAIPanel(false)
                setBackgroundImage(null)
              }}
              className="text-gray-400 hover:text-white text-lg"
            >
              ×
            </button>
          </div>
          
          {backgroundImage && (
            <div className="mb-2">
              <img src={backgroundImage} alt="Reference" className="w-full h-20 object-contain rounded" />
              <div className="mt-1">
                <label className="text-xs">Opacity</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={imageOpacity * 100}
                  onChange={(e) => setImageOpacity(parseInt(e.target.value) / 100)}
                  className="w-full h-1"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <button
              onClick={analyzeImage}
              disabled={aiProcessing || !backgroundImage}
              className="w-full px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded text-xs font-medium"
            >
              {aiProcessing ? '🤖 Analyzing...' : '✨ AI Detect'}
            </button>
            
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => generateFromTemplate('theater')}
                disabled={aiProcessing}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
              >
                🎭 Theater
              </button>
              <button
                onClick={() => generateFromTemplate('arena')}
                disabled={aiProcessing}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
              >
                🏟️ Arena
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Toolbar - Top center */}
      {mode === 'edit' && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-black/80 backdrop-blur rounded-lg px-3 py-2 flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs font-medium"
              title="Upload reference image"
            >
              📷
            </button>
            <button
              onClick={addSection}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-medium"
            >
              + Add
            </button>
            <button
              onClick={deleteSection}
              disabled={!state.selectedSection}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs disabled:opacity-50 font-medium"
            >
              Delete
            </button>
            <button
              onClick={toggleCurve}
              disabled={!state.selectedSection}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs disabled:opacity-50 font-medium"
            >
              Curve
            </button>
            <button
              onClick={() => rotateSection(-15)}
              disabled={!state.selectedSection}
              className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs disabled:opacity-50"
              title="Rotate left"
            >
              ↺
            </button>
            <button
              onClick={() => rotateSection(15)}
              disabled={!state.selectedSection}
              className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs disabled:opacity-50"
              title="Rotate right"
            >
              ↻
            </button>
            <button
              onClick={clearLayout}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs font-medium"
            >
              Clear
            </button>
            <button
              onClick={() => onSave(layout)}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs font-medium ml-2"
            >
              Save
            </button>
          </div>
          
          {/* Section pricing tools - below main toolbar */}
          {state.selectedSection && (
            <div className="bg-black/80 backdrop-blur rounded-lg px-3 py-2 flex gap-1 mt-2">
              <span className="text-xs text-gray-400 mr-2">Pricing:</span>
              <button
                onClick={() => changePricing('vip')}
                className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs"
              >
                VIP
              </button>
              <button
                onClick={() => changePricing('premium')}
                className="px-2 py-1 bg-gray-500 hover:bg-gray-600 rounded text-xs"
              >
                Premium
              </button>
              <button
                onClick={() => changePricing('standard')}
                className="px-2 py-1 bg-orange-700 hover:bg-orange-800 rounded text-xs"
              >
                Standard
              </button>
              <button
                onClick={() => changePricing('economy')}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-800 rounded text-xs"
              >
                Economy
              </button>
            </div>
          )}
        </div>
      )}

      {/* Zoom controls - Top right */}
      <div className="absolute top-4 right-4 z-20 bg-black/80 backdrop-blur rounded-lg p-1 flex flex-col items-center">
        <button
          onClick={() => setState(prev => ({ ...prev, zoom: Math.min(2, prev.zoom * 1.2) }))}
          className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-xs font-bold"
        >
          +
        </button>
        <div className="text-xs px-1 py-0.5">{Math.round(state.zoom * 100)}%</div>
        <button
          onClick={() => setState(prev => ({ ...prev, zoom: Math.max(0.3, prev.zoom * 0.8) }))}
          className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-xs font-bold"
        >
          −
        </button>
        <button
          onClick={() => setState(prev => ({ ...prev, zoom: 0.7, pan: { x: 0, y: 0 } }))}
          className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-xs mt-1"
        >
          ⟲
        </button>
      </div>

      {/* SVG Canvas - Main content area */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? 'grabbing' : mode === 'edit' ? 'default' : 'grab' }}
      >
        <g transform={`translate(${state.pan.x}, ${state.pan.y}) scale(${state.zoom})`}>
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

          {backgroundImage && mode === 'edit' && (
            <image
              href={backgroundImage}
              x={0}
              y={0}
              width={viewBox.width}
              height={viewBox.height}
              opacity={imageOpacity}
              preserveAspectRatio="xMidYMid meet"
            />
          )}

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
            fontSize={18}
            fontWeight="bold"
            pointerEvents="none"
          >
            {layout.stage.label}
          </text>

          {layout.sections.map(renderSection)}

          {mode === 'preview' && state.selectedSeats.size > 0 && (
            <text
              x={viewBox.width / 2}
              y={viewBox.height - 20}
              textAnchor="middle"
              fill="#fff"
              fontSize={16}
              fontWeight="bold"
              pointerEvents="none"
            >
              Selected: {state.selectedSeats.size} seats
            </text>
          )}
        </g>
      </svg>
    </div>
  )
}
