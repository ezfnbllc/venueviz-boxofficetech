'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Section, Row, Seat, SeatingLayout, DesignerState } from '@/lib/seating/types'

interface SeatingChartDesignerProps {
  layout: SeatingLayout
  onSave: (layout: SeatingLayout) => void
  mode: 'edit' | 'preview'
  selectedEventId?: string
  pricingTiers?: any[]
  title?: string
  onClose?: () => void
}

export default function SeatingChartDesigner({ 
  layout: initialLayout, 
  onSave, 
  mode = 'edit',
  selectedEventId,
  pricingTiers = [],
  title = 'Seating Layout',
  onClose
}: SeatingChartDesignerProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [layout, setLayout] = useState<SeatingLayout>(initialLayout)
  const [state, setState] = useState<DesignerState>({
    selectedSection: null,
    selectedSeats: new Set(),
    zoom: 0.8,
    pan: { x: 0, y: 0 },
    mode: 'select',
    showGrid: true,
    gridSize: 20
  })
  const [isDragging, setIsDragging] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [sectionDragStart, setSectionDragStart] = useState({ x: 0, y: 0 })
  const [labelDragStart, setLabelDragStart] = useState({ x: 0, y: 0 })
  const [isDraggingLabel, setIsDraggingLabel] = useState(false)
  const [seatStatuses, setSeatStatuses] = useState<Map<string, string>>(new Map())
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [imageOpacity, setImageOpacity] = useState(0.3)
  const [aiProcessing, setAiProcessing] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#4a5568')
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [sectionLabels, setSectionLabels] = useState<Map<string, {x: number, y: number, rotation: number}>>(new Map())
  const [rowVisibility, setRowVisibility] = useState<Map<string, boolean>>(new Map())
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [pricingNames, setPricingNames] = useState({
    vip: 'VIP',
    premium: 'Premium',
    standard: 'Standard',
    economy: 'Economy'
  })
  const [editingPricing, setEditingPricing] = useState<string | null>(null)

  const colorPalette = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#fbbf24', '#a78bfa', '#60a5fa',
    '#4ade80', '#f87171', '#fb923c', '#fcd34d', '#86efac'
  ]

  useEffect(() => {
    if (mode === 'preview' && selectedEventId) {
      loadSeatAvailability()
    }
  }, [selectedEventId, mode])

  useEffect(() => {
    const newLabels = new Map()
    layout.sections.forEach(section => {
      if (!sectionLabels.has(section.id)) {
        newLabels.set(section.id, { x: 0, y: -35, rotation: 0 })
      }
    })
    if (newLabels.size > 0) {
      setSectionLabels(prev => new Map([...prev, ...newLabels]))
    }
  }, [layout.sections])

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

  const clearBackgroundImage = () => {
    setBackgroundImage(null)
    setShowAIPanel(false)
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
    
    if (mode === 'edit' && target.dataset.labelId) {
      const sectionId = target.dataset.labelId
      setIsDraggingLabel(true)
      setState(prev => ({ ...prev, selectedSection: sectionId }))
      const label = sectionLabels.get(sectionId)
      if (label) {
        setLabelDragStart({ 
          x: e.clientX - label.x, 
          y: e.clientY - label.y 
        })
      }
      e.preventDefault()
      return
    }
    
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
  }, [state.pan, mode, layout.sections, sectionLabels])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingLabel && state.selectedSection) {
      const newX = e.clientX - labelDragStart.x
      const newY = e.clientY - labelDragStart.y
      
      setSectionLabels(prev => {
        const updated = new Map(prev)
        const current = updated.get(state.selectedSection!) || { x: 0, y: -35, rotation: 0 }
        updated.set(state.selectedSection!, { ...current, x: newX, y: newY })
        return updated
      })
    } else if (isDragging && state.selectedSection) {
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
  }, [isDragging, isDraggingLabel, isPanning, dragStart, sectionDragStart, labelDragStart, state.selectedSection])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsDraggingLabel(false)
    setIsPanning(false)
  }, [])

  const addSeatToRow = (sectionId: string, rowIndex: number) => {
    setLayout(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id === sectionId) {
          const updatedRows = [...section.rows]
          const row = updatedRows[rowIndex]
          const lastSeat = row.seats[row.seats.length - 1]
          const newSeat: Seat = {
            id: `${section.id}-R${rowIndex}S${row.seats.length}`,
            sectionId: section.id,
            row: row.label,
            number: (row.seats.length + 1).toString(),
            x: lastSeat ? lastSeat.x + 18 : 0,
            y: row.y,
            status: 'available',
            type: 'regular'
          }
          row.seats.push(newSeat)
          return { ...section, rows: updatedRows }
        }
        return section
      }),
      capacity: prev.capacity + 1
    }))
  }

  const removeSeatFromRow = (sectionId: string, rowIndex: number) => {
    setLayout(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id === sectionId && section.rows[rowIndex].seats.length > 0) {
          const updatedRows = [...section.rows]
          updatedRows[rowIndex].seats.pop()
          return { ...section, rows: updatedRows }
        }
        return section
      }),
      capacity: prev.capacity - 1
    }))
  }

  const addRowToSection = (sectionId: string) => {
    setLayout(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id === sectionId) {
          const updatedRows = [...section.rows]
          const newRowIndex = updatedRows.length
          const lastRow = updatedRows[updatedRows.length - 1]
          
          const newRow: Row = {
            id: `${section.id}-row-${Date.now()}`,
            label: String.fromCharCode(65 + newRowIndex),
            seats: [],
            y: lastRow ? lastRow.y + 25 : 0
          }
          
          if (section.curved && lastRow?.curve) {
            const baseRadius = 120
            const radiusIncrement = 30
            newRow.curve = {
              radius: baseRadius + (newRowIndex * radiusIncrement),
              startAngle: lastRow.curve.startAngle || -35,
              endAngle: lastRow.curve.endAngle || 35
            }
          }
          
          const seatsPerRow = lastRow?.seats.length || 20
          for (let s = 0; s < seatsPerRow; s++) {
            newRow.seats.push({
              id: `${section.id}-R${newRowIndex}S${s}`,
              sectionId: section.id,
              row: newRow.label,
              number: (s + 1).toString(),
              x: (s - seatsPerRow/2) * 18,
              y: newRow.y,
              status: 'available',
              type: 'regular'
            })
          }
          
          updatedRows.push(newRow)
          return { ...section, rows: updatedRows }
        }
        return section
      }),
      capacity: prev.capacity + 20
    }))
  }

  const removeRowFromSection = (sectionId: string, rowIndex: number) => {
    setLayout(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id === sectionId && section.rows.length > 1) {
          const updatedRows = section.rows.filter((_, i) => i !== rowIndex)
          
          const baseRadius = 120
          const radiusIncrement = 30
          
          updatedRows.forEach((row, i) => {
            row.label = String.fromCharCode(65 + i)
            row.y = i * 25
            
            if (section.curved && row.curve) {
              row.curve.radius = baseRadius + (i * radiusIncrement)
            }
            
            row.seats.forEach(seat => {
              seat.row = row.label
              seat.y = row.y
            })
          })
          
          return { ...section, rows: updatedRows }
        }
        return section
      }),
      capacity: prev.capacity - (prev.sections.find(s => s.id === sectionId)?.rows[rowIndex]?.seats.length || 0)
    }))
  }

  const toggleRowLabels = (rowId: string) => {
    setRowVisibility(prev => {
      const updated = new Map(prev)
      updated.set(rowId, !prev.get(rowId))
      return updated
    })
  }

  const rotateSectionLabel = (sectionId: string, angle: number) => {
    setSectionLabels(prev => {
      const updated = new Map(prev)
      const current = updated.get(sectionId) || { x: 0, y: -35, rotation: 0 }
      updated.set(sectionId, { ...current, rotation: current.rotation + angle })
      return updated
    })
  }

  const renderSeat = (seat: Seat, section: Section, actualX?: number, actualY?: number, angle?: number) => {
    const seatStatus = seatStatuses.get(seat.id) || seat.status
    const isSelected = state.selectedSeats.has(seat.id)
    
    let fillColor = section.color || '#4a5568'
    if (mode === 'preview') {
      switch (seatStatus) {
        case 'available': fillColor = '#48bb78'; break
        case 'sold': fillColor = '#e53e3e'; break
        case 'held': fillColor = '#ed8936'; break
        case 'blocked': fillColor = '#718096'; break
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
    const labelPos = sectionLabels.get(section.id) || { x: 0, y: -35, rotation: 0 }
    
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
        
        <g transform={`translate(${labelPos.x}, ${labelPos.y}) rotate(${labelPos.rotation})`}>
          {editingSection === section.id ? (
            <foreignObject x={-50} y={-10} width={100} height={30}>
              <input
                type="text"
                value={section.name}
                onChange={(e) => {
                  setLayout(prev => ({
                    ...prev,
                    sections: prev.sections.map(s => 
                      s.id === section.id ? { ...s, name: e.target.value } : s
                    )
                  }))
                }}
                onBlur={() => setEditingSection(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingSection(null)
                }}
                className="w-full px-2 py-1 bg-black/60 text-white text-center text-sm rounded"
                autoFocus
              />
            </foreignObject>
          ) : (
            <text 
              x={0} 
              y={0} 
              fontSize={16} 
              fill="#fff" 
              textAnchor="middle"
              fontWeight="bold"
              className={mode === 'edit' ? 'cursor-move' : ''}
              data-label-id={section.id}
              onDoubleClick={() => mode === 'edit' && setEditingSection(section.id)}
            >
              {section.name}
            </text>
          )}
        </g>
        
        {section.rows.map((row, rowIndex) => {
          const showLabels = rowVisibility.get(row.id) !== false
          const isRowHovered = hoveredRow === row.id
          
          return (
            <g key={row.id}>
              {mode === 'edit' && (
                <>
                  <g 
                    transform={`translate(${row.seats[0]?.x - 35 || -35}, ${row.y})`}
                    onMouseEnter={() => setHoveredRow(row.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={-10}
                      y={-10}
                      width={25}
                      height={20}
                      fill={isRowHovered ? 'rgba(255,255,255,0.1)' : 'transparent'}
                      rx={2}
                    />
                    <text
                      x={2}
                      y={5}
                      fontSize={14}
                      fill={showLabels ? '#fff' : '#666'}
                      textAnchor="middle"
                      fontWeight="bold"
                      pointerEvents="none"
                    >
                      {row.label}
                    </text>
                    
                    {isRowHovered && section.rows.length > 1 && (
                      <g
                        onClick={(e) => {
                          e.stopPropagation()
                          removeRowFromSection(section.id, rowIndex)
                        }}
                      >
                        <rect
                          x={15}
                          y={-8}
                          width={20}
                          height={16}
                          fill="#ef4444"
                          rx={2}
                          className="hover:fill-red-600"
                        />
                        <text x={25} y={3} fontSize={12} fill="#fff" textAnchor="middle" pointerEvents="none">×</text>
                      </g>
                    )}
                  </g>
                  
                  <g transform={`translate(${(row.seats.length * 18) / 2 + 10}, ${row.y})`}>
                    <rect
                      x={0}
                      y={-8}
                      width={16}
                      height={16}
                      fill="#3b82f6"
                      rx={2}
                      className="cursor-pointer hover:fill-blue-600"
                      onClick={() => addSeatToRow(section.id, rowIndex)}
                    />
                    <text x={8} y={3} fontSize={12} fill="#fff" textAnchor="middle" pointerEvents="none">+</text>
                    
                    {row.seats.length > 0 && (
                      <>
                        <rect
                          x={20}
                          y={-8}
                          width={16}
                          height={16}
                          fill="#f59e0b"
                          rx={2}
                          className="cursor-pointer hover:fill-amber-600"
                          onClick={() => removeSeatFromRow(section.id, rowIndex)}
                        />
                        <text x={28} y={3} fontSize={12} fill="#fff" textAnchor="middle" pointerEvents="none">−</text>
                      </>
                    )}
                  </g>
                </>
              )}
              
              {(!mode || mode === 'preview' || (mode === 'edit' && showLabels)) && (
                <text
                  x={row.seats[0]?.x - 25 || -25}
                  y={row.y + 5}
                  fontSize={12}
                  fill="#fff"
                  textAnchor="end"
                >
                  {row.label}
                </text>
              )}
              
              {section.curved && row.curve ? (
                renderCurvedRow(row, section, rowIndex)
              ) : (
                row.seats.map(seat => renderSeat(seat, section))
              )}
            </g>
          )
        })}
        
        {mode === 'edit' && section.rows.length > 0 && (
          <g transform={`translate(0, ${section.rows[section.rows.length - 1].y + 35})`}>
            <rect
              x={-30}
              y={-8}
              width={60}
              height={20}
              fill="#22c55e"
              rx={3}
              className="cursor-pointer hover:fill-green-600"
              onClick={() => addRowToSection(section.id)}
            />
            <text x={0} y={4} fontSize={12} fill="#fff" textAnchor="middle" pointerEvents="none">+ Add Row</text>
          </g>
        )}
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
        label: String.fromCharCode(65 + r),
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

  const changeColor = (color: string) => {
    if (!state.selectedSection) return
    setLayout(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.id === state.selectedSection 
          ? { ...section, color }
          : section
      )
    }))
    setSelectedColor(color)
    setShowColorPicker(false)
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
    <div ref={containerRef} className="relative h-full bg-gray-900 overflow-hidden flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Fixed Header */}
      {mode === 'edit' && (
        <div className="bg-black/90 backdrop-blur border-b border-white/10 px-4 py-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{title}</h2>
            
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs sm:text-sm font-medium flex items-center gap-1"
                title="AI Assistant"
              >
                <span>🤖</span> <span className="hidden sm:inline">AI</span>
              </button>
              <button
                onClick={addSection}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs sm:text-sm font-medium"
              >
                + <span className="hidden sm:inline">New</span>
              </button>
              <button
                onClick={deleteSection}
                disabled={!state.selectedSection}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs sm:text-sm disabled:opacity-50 font-medium"
              >
                <span className="hidden sm:inline">Delete</span><span className="sm:hidden">Del</span>
              </button>
              <button
                onClick={toggleCurve}
                disabled={!state.selectedSection}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs sm:text-sm disabled:opacity-50 font-medium"
              >
                <span className="hidden sm:inline">Curve</span><span className="sm:hidden">⌒</span>
              </button>
              <button
                onClick={() => rotateSection(-15)}
                disabled={!state.selectedSection}
                className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs sm:text-sm disabled:opacity-50"
                title="Rotate section left"
              >
                ↺
              </button>
              <button
                onClick={() => rotateSection(15)}
                disabled={!state.selectedSection}
                className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs sm:text-sm disabled:opacity-50"
                title="Rotate section right"
              >
                ↻
              </button>
              {state.selectedSection && (
                <>
                  <button
                    onClick={() => rotateSectionLabel(state.selectedSection!, -15)}
                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-xs sm:text-sm"
                    title="Rotate label left"
                  >
                    ⟲
                  </button>
                  <button
                    onClick={() => rotateSectionLabel(state.selectedSection!, 15)}
                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-xs sm:text-sm"
                    title="Rotate label right"
                  >
                    ⟳
                  </button>
                </>
              )}
              <button
                onClick={clearLayout}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs sm:text-sm font-medium"
              >
                Clear
              </button>
              <div className="w-px h-6 bg-white/20 mx-1 hidden sm:block" />
              <button
                onClick={() => onSave(layout)}
                className="px-4 py-1 bg-green-600 hover:bg-green-700 rounded text-xs sm:text-sm font-medium"
              >
                ✓ Save
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs sm:text-sm font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* AI Panel - Responsive positioning */}
        {showAIPanel && mode === 'edit' && (
          <div className="absolute top-2 right-2 z-20 bg-black/95 backdrop-blur rounded-lg p-3 sm:p-4 
                          w-[calc(100%-1rem)] sm:w-80 max-w-sm
                          max-h-[50vh] sm:max-h-[60vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-sm sm:text-base">AI Assistant</h3>
              <button
                onClick={() => setShowAIPanel(false)}
                className="text-gray-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded hover:bg-white/10"
              >
                ×
              </button>
            </div>
            
            {backgroundImage && (
              <div className="mb-4">
                <div className="relative">
                  <img 
                    src={backgroundImage} 
                    alt="Reference" 
                    className="w-full h-32 sm:h-40 object-contain rounded bg-black/50 border border-white/10" 
                  />
                  <button
                    onClick={clearBackgroundImage}
                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center"
                    title="Remove image"
                  >
                    ×
                  </button>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-gray-400 block mb-1">
                    Background Opacity: {Math.round(imageOpacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={imageOpacity * 100}
                    onChange={(e) => setImageOpacity(parseInt(e.target.value) / 100)}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={analyzeImage}
                disabled={aiProcessing || !backgroundImage}
                className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs sm:text-sm font-medium transition-colors"
              >
                {aiProcessing ? '🔄 Analyzing...' : '✨ AI Detect Sections'}
              </button>
              
              <div className="pt-2 border-t border-white/10">
                <p className="text-xs text-gray-400 mb-2">Or generate from template:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => generateFromTemplate('theater')}
                    disabled={aiProcessing}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded text-xs sm:text-sm transition-colors"
                  >
                    🎭 Theater
                  </button>
                  <button
                    onClick={() => generateFromTemplate('arena')}
                    disabled={aiProcessing}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded text-xs sm:text-sm transition-colors"
                  >
                    🏟️ Arena
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section Settings Panel - Responsive */}
        {mode === 'edit' && state.selectedSection && (
          <div className="absolute top-2 left-2 z-20 bg-black/95 backdrop-blur rounded-lg p-3 sm:p-4 
                          w-[calc(100%-1rem)] sm:w-64 max-w-xs shadow-xl">
            <h3 className="text-xs sm:text-sm font-semibold mb-3">Section Settings</h3>
            
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-2">Pricing Tier:</div>
              <div className="grid grid-cols-2 gap-1">
                {['vip', 'premium', 'standard', 'economy'].map(tier => (
                  <button
                    key={tier}
                    onClick={() => changePricing(tier as any)}
                    className={`px-2 py-1.5 rounded text-xs transition-colors ${
                      layout.sections.find(s => s.id === state.selectedSection)?.pricing === tier
                        ? 'bg-purple-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {pricingNames[tier as keyof typeof pricingNames]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-2">Section Color:</div>
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-full h-8 rounded border border-white/20 hover:border-white/40 transition-colors"
                style={{ 
                  backgroundColor: layout.sections.find(s => s.id === state.selectedSection)?.color || '#4a5568' 
                }}
              />
              {showColorPicker && (
                <div className="absolute left-3 right-3 mt-2 p-2 bg-black/95 rounded-lg max-h-32 sm:max-h-48 overflow-y-auto border border-white/10">
                  <div className="grid grid-cols-5 sm:grid-cols-8 gap-1">
                    {colorPalette.map(color => (
                      <button
                        key={color}
                        onClick={() => changeColor(color)}
                        className="w-6 h-6 rounded hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Zoom controls - Responsive */}
        <div className="absolute bottom-4 right-4 z-10 bg-black/80 backdrop-blur rounded-lg p-1 flex flex-col items-center shadow-lg">
          <button
            onClick={() => setState(prev => ({ ...prev, zoom: Math.max(0.3, prev.zoom * 0.8) }))}
            className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-sm font-bold transition-colors"
          >
            −
          </button>
          <div className="text-xs px-2 py-1">{Math.round(state.zoom * 100)}%</div>
          <button
            onClick={() => setState(prev => ({ ...prev, zoom: Math.min(2, prev.zoom * 1.2) }))}
            className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-sm font-bold transition-colors"
          >
            +
          </button>
          <button
            onClick={() => setState(prev => ({ ...prev, zoom: 0.8, pan: { x: 0, y: 0 } }))}
            className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-xs mt-1 transition-colors"
            title="Reset view"
          >
            ⟲
          </button>
        </div>

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
          style={{ 
            cursor: isPanning ? 'grabbing' : mode === 'edit' ? 'default' : 'grab'
          }}
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
                x={200}
                y={100}
                width={1000}
                height={600}
                opacity={imageOpacity}
                preserveAspectRatio="xMidYMid meet"
                pointerEvents="none"
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
    </div>
  )
}
