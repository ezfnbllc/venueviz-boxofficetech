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
  const fileInputRef = useRef<HTMLInputElement>(null)
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
  const [isPanning, setIsPanning] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [sectionDragStart, setSectionDragStart] = useState({ x: 0, y: 0 })
  const [seatStatuses, setSeatStatuses] = useState<Map<string, string>>(new Map())
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [imageOpacity, setImageOpacity] = useState(0.3)
  const [aiProcessing, setAiProcessing] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)

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

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Convert to base64 for display
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setBackgroundImage(base64)
      setShowAIPanel(true)
    }
    reader.readAsDataURL(file)
  }

  // AI Analysis of uploaded image
  const analyzeImage = async () => {
    if (!backgroundImage) return
    
    setAiProcessing(true)
    try {
      // Send image to AI analysis endpoint
      const response = await fetch('/api/analyze-seating-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: backgroundImage,
          venueType: 'theater',
          existingCapacity: layout.capacity
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Apply the AI-generated layout
        if (data.sections && data.sections.length > 0) {
          setLayout(prev => ({
            ...prev,
            sections: data.sections,
            capacity: data.totalCapacity || prev.capacity,
            stage: data.stage || prev.stage
          }))
          
          alert(`AI detected ${data.sections.length} sections with ${data.totalCapacity} total seats`)
        }
      }
    } catch (error) {
      console.error('AI analysis error:', error)
      alert('Error analyzing image. Please try manual creation.')
    }
    setAiProcessing(false)
  }

  // Generate layout from template
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

  // Zoom handling
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setState(prev => ({
        ...prev,
        zoom: Math.max(0.5, Math.min(3, prev.zoom * delta))
      }))
    }
  }, [])

  // Pan handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as SVGElement
    
    // Check if clicking on a section for dragging
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
    
    // Pan with middle mouse or shift+click
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true)
      setDragStart({ x: e.clientX - state.pan.x, y: e.clientY - state.pan.y })
      e.preventDefault()
    }
  }, [state.pan, mode, layout.sections])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && state.selectedSection) {
      // Drag selected section
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
      // Pan the view
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
    const centerX = 0
    const centerY = 0
    
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
          y={-30} 
          fontSize={14} 
          fill="#fff" 
          textAnchor="middle"
          pointerEvents="none"
        >
          {section.name}
        </text>
        {section.rows.map((row, rowIndex) => {
          if (section.curved && row.curve) {
            return <g key={row.id}>{renderCurvedRow(row, section)}</g>
          }
          return <g key={row.id}>
            {row.seats.map(seat => renderSeat(seat, section))}
          </g>
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

  // Add new section
  const addSection = () => {
    const newSection: Section = {
      id: `section-${Date.now()}`,
      name: `Section ${layout.sections.length + 1}`,
      x: 400 + (layout.sections.length * 50),
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
        id: `${newSection.id}-row-${r}`,
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
      sections: [...prev.sections, newSection],
      capacity: prev.capacity + (10 * 15)
    }))
  }

  // Delete selected section
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

  // Rotate selected section
  const rotateSection = (angle: number) => {
    if (!state.selectedSection) return
    setLayout(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.id === state.selectedSection 
          ? { ...section, rotation: section.rotation + angle }
          : section
      )
    }))
  }

  // Change pricing tier for selected section
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

  // Clear all sections
  const clearLayout = () => {
    if (confirm('Are you sure you want to clear all sections?')) {
      setLayout(prev => ({
        ...prev,
        sections: [],
        capacity: 0
      }))
    }
  }

  const viewBox = layout.viewBox || { x: 0, y: 0, width: 1200, height: 800 }

  return (
    <div className="relative h-full bg-gray-900">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* AI Panel - Shows when image is uploaded */}
      {showAIPanel && mode === 'edit' && (
        <div className="absolute top-16 left-4 z-20 bg-black/90 backdrop-blur rounded-lg p-4 w-80">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">AI Layout Assistant</h3>
            <button
              onClick={() => {
                setShowAIPanel(false)
                setBackgroundImage(null)
              }}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          {backgroundImage && (
            <div className="mb-4">
              <img src={backgroundImage} alt="Reference" className="w-full h-32 object-contain rounded" />
              <div className="mt-2">
                <label className="text-xs">Image Opacity</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={imageOpacity * 100}
                  onChange={(e) => setImageOpacity(parseInt(e.target.value) / 100)}
                  className="w-full"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={analyzeImage}
              disabled={aiProcessing || !backgroundImage}
              className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded text-sm font-medium"
            >
              {aiProcessing ? '🤖 Analyzing...' : '✨ AI Detect Sections'}
            </button>
            
            <div className="text-xs text-gray-400 mt-2">Or use a template:</div>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => generateFromTemplate('theater')}
                disabled={aiProcessing}
                className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
              >
                🎭 Theater
              </button>
              <button
                onClick={() => generateFromTemplate('arena')}
                disabled={aiProcessing}
                className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
              >
                🏟️ Arena
              </button>
              <button
                onClick={() => generateFromTemplate('stadium')}
                disabled={aiProcessing}
                className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
              >
                🏟️ Stadium
              </button>
              <button
                onClick={() => generateFromTemplate('club')}
                disabled={aiProcessing}
                className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
              >
                🎵 Club
              </button>
            </div>
            
            <button
              onClick={clearLayout}
              className="w-full px-3 py-1.5 bg-red-900 hover:bg-red-800 rounded text-xs"
            >
              Clear All Sections
            </button>
          </div>
        </div>
      )}

      {/* Toolbar - Fixed at top */}
      {mode === 'edit' && (
        <div className="absolute top-4 left-4 right-4 z-10 flex gap-4">
          {/* Main actions */}
          <div className="bg-black/80 backdrop-blur rounded-lg p-3 flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium"
              title="Upload reference image"
            >
              📷 Upload Image
            </button>
            <button
              onClick={addSection}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-medium"
            >
              + Add Section
            </button>
            <button
              onClick={deleteSection}
              disabled={!state.selectedSection}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Delete
            </button>
            <button
              onClick={toggleCurve}
              disabled={!state.selectedSection}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Toggle Curve
            </button>
          </div>

          {/* Section tools */}
          {state.selectedSection && (
            <div className="bg-black/80 backdrop-blur rounded-lg p-3 flex gap-2">
              <button
                onClick={() => rotateSection(-15)}
                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 rounded text-sm"
                title="Rotate left"
              >
                ↺
              </button>
              <button
                onClick={() => rotateSection(15)}
                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 rounded text-sm"
                title="Rotate right"
              >
                ↻
              </button>
              <div className="border-l border-gray-600 mx-1"></div>
              <button
                onClick={() => changePricing('vip')}
                className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
              >
                VIP
              </button>
              <button
                onClick={() => changePricing('premium')}
                className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 rounded text-sm"
              >
                Premium
              </button>
              <button
                onClick={() => changePricing('standard')}
                className="px-3 py-1.5 bg-orange-700 hover:bg-orange-800 rounded text-sm"
              >
                Standard
              </button>
              <button
                onClick={() => changePricing('economy')}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-800 rounded text-sm"
              >
                Economy
              </button>
            </div>
          )}

          {/* Save button */}
          <div className="ml-auto bg-black/80 backdrop-blur rounded-lg p-3">
            <button
              onClick={() => onSave(layout)}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium"
            >
              Save Layout
            </button>
          </div>
        </div>
      )}

      {/* Zoom controls - Fixed at right */}
      <div className="absolute top-20 right-4 z-10 bg-black/80 backdrop-blur rounded-lg p-2 space-y-2">
        <button
          onClick={() => setState(prev => ({ ...prev, zoom: Math.min(3, prev.zoom * 1.2) }))}
          className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-lg font-bold"
        >
          +
        </button>
        <div className="text-center text-xs">{Math.round(state.zoom * 100)}%</div>
        <button
          onClick={() => setState(prev => ({ ...prev, zoom: Math.max(0.5, prev.zoom * 0.8) }))}
          className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-lg font-bold"
        >
          −
        </button>
        <button
          onClick={() => setState(prev => ({ ...prev, zoom: 1, pan: { x: 0, y: 0 } }))}
          className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-xs"
        >
          ⟲
        </button>
      </div>

      {/* Legend - Fixed at bottom left */}
      <div className="absolute bottom-4 left-4 z-10 bg-black/80 backdrop-blur rounded-lg p-3">
        <div className="text-xs space-y-1.5">
          <div className="font-semibold mb-1">
            {mode === 'preview' ? 'Seat Status' : 'Pricing Tiers'}
          </div>
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
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
                <span>Economy</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Instructions */}
      {mode === 'edit' && (
        <div className="absolute bottom-4 right-4 z-10 bg-black/80 backdrop-blur rounded-lg p-3 text-xs space-y-1">
          <div className="font-semibold mb-1">Controls</div>
          <div>• Click section to select</div>
          <div>• Drag selected section to move</div>
          <div>• Ctrl/Cmd + Scroll to zoom</div>
          <div>• Shift + Drag to pan</div>
          <div>• Upload image for AI assist</div>
        </div>
      )}

      {/* SVG Canvas */}
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

          {/* Background image overlay */}
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
            pointerEvents="none"
          >
            {layout.stage.label}
          </text>

          {/* Sections */}
          {layout.sections.map(renderSection)}
        </g>
      </svg>
    </div>
  )
}
