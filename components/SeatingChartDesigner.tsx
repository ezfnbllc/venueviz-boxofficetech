'use client'
import { useState, useEffect, useRef } from 'react'
import { SeatingLayout, Section, Seat, Aisle, Stage } from '@/lib/seating/types'

interface SeatingChartDesignerProps {
  layout: SeatingLayout
  onSave: (layout: SeatingLayout) => void
  mode?: 'edit' | 'view'
  title?: string
}

const DEFAULT_PRICE_CATEGORIES = [
  { id: 'vip', name: 'VIP', color: '#9333ea', price: 250 },
  { id: 'premium', name: 'Premium', color: '#3b82f6', price: 150 },
  { id: 'standard', name: 'Standard', color: '#10b981', price: 100 },
  { id: 'economy', name: 'Economy', color: '#f59e0b', price: 75 }
]

export default function SeatingChartDesigner({
  layout,
  onSave,
  mode = 'edit',
  title = 'Seating Chart Designer'
}: SeatingChartDesignerProps) {
  const [currentLayout, setCurrentLayout] = useState<SeatingLayout>(layout)
  const [selectedSection, setSelectedSection] = useState<Section | null>(null)
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set())
  const [selectedTool, setSelectedTool] = useState<string>('select')
  const [isDragging, setIsDragging] = useState(false)
  const [isResizingStage, setIsResizingStage] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [editingStage, setEditingStage] = useState(false)
  const [priceCategories, setPriceCategories] = useState(
    layout.priceCategories || DEFAULT_PRICE_CATEGORIES
  )
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Delete') {
        if (selectedSection) {
          deleteSection()
        } else if (selectedSeats.size > 0) {
          deleteSelectedSeats()
        }
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if (e.key === 'a' && selectedSeats.size > 0) {
        markSeatsAsAccessible()
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedSection, selectedSeats, currentLayout])

  const getSvgPoint = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 }
    const pt = svgRef.current.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse())
    return { x: svgP.x, y: svgP.y }
  }

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const point = getSvgPoint(e.clientX, e.clientY)
    
    if (selectedTool === 'section') {
      const newSection = createSection(point.x, point.y, 'standard')
      setCurrentLayout({
        ...currentLayout,
        sections: [...currentLayout.sections, newSection]
      })
      setSelectedSection(newSection)
      setSelectedTool('select')
    } else if (selectedTool === 'curved-section') {
      const newSection = createSection(point.x, point.y, 'curved')
      setCurrentLayout({
        ...currentLayout,
        sections: [...currentLayout.sections, newSection]
      })
      setSelectedSection(newSection)
      setSelectedTool('select')
    } else if (selectedTool === 'select') {
      // Check if clicking on stage
      if (isPointInStage(point)) {
        setEditingStage(true)
        setIsDragging(true)
        setDragStart(point)
        return
      }
      
      // Check for section or seat selection
      const clickedSeat = findSeatAtPoint(point.x, point.y)
      if (clickedSeat && e.shiftKey) {
        const newSelected = new Set(selectedSeats)
        if (newSelected.has(clickedSeat.id)) {
          newSelected.delete(clickedSeat.id)
        } else {
          newSelected.add(clickedSeat.id)
        }
        setSelectedSeats(newSelected)
      } else {
        const clickedSection = findSectionAtPoint(point.x, point.y)
        setSelectedSection(clickedSection)
        setSelectedSeats(new Set())
        if (clickedSection) {
          setIsDragging(true)
          setDragStart(point)
        }
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const point = getSvgPoint(e.clientX, e.clientY)
    
    if (isDragging && editingStage) {
      const dx = point.x - dragStart.x
      const dy = point.y - dragStart.y
      
      setCurrentLayout({
        ...currentLayout,
        stage: {
          ...currentLayout.stage,
          x: currentLayout.stage.x + dx,
          y: currentLayout.stage.y + dy
        }
      })
      setDragStart(point)
    } else if (isResizingStage) {
      const newWidth = Math.max(100, point.x - currentLayout.stage.x)
      const newHeight = Math.max(40, point.y - currentLayout.stage.y)
      
      setCurrentLayout({
        ...currentLayout,
        stage: {
          ...currentLayout.stage,
          width: newWidth,
          height: newHeight
        }
      })
    } else if (isDragging && selectedSection) {
      const dx = point.x - dragStart.x
      const dy = point.y - dragStart.y
      
      const updatedSections = currentLayout.sections.map(section => {
        if (section.id === selectedSection.id) {
          return {
            ...section,
            x: section.x + dx,
            y: section.y + dy,
            seats: section.seats.map(seat => ({
              ...seat,
              x: seat.x + dx,
              y: seat.y + dy
            }))
          }
        }
        return section
      })
      
      setCurrentLayout({ ...currentLayout, sections: updatedSections })
      setDragStart(point)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsResizingStage(false)
    setEditingStage(false)
  }

  const isPointInStage = (point: { x: number, y: number }) => {
    const stage = currentLayout.stage
    return point.x >= stage.x && point.x <= stage.x + stage.width &&
           point.y >= stage.y && point.y <= stage.y + stage.height
  }

  const createSection = (x: number, y: number, type: 'standard' | 'curved'): Section => {
    const rows = 5
    const seatsPerRow = 10
    const seats: Seat[] = []
    
    if (type === 'curved') {
      const centerX = x + 250
      const centerY = y + 200
      const startAngle = -30
      const endAngle = 30
      const baseRadius = 150
      
      for (let row = 0; row < rows; row++) {
        const radius = baseRadius + row * 30
        const angleStep = (endAngle - startAngle) / (seatsPerRow - 1)
        
        for (let col = 0; col < seatsPerRow; col++) {
          const angle = (startAngle + angleStep * col) * Math.PI / 180
          const seatX = centerX + radius * Math.sin(angle)
          const seatY = centerY - radius * Math.cos(angle)
          
          seats.push({
            id: `seat-${Date.now()}-${row}-${col}`,
            row: String.fromCharCode(65 + row),
            number: col + 1,
            x: seatX,
            y: seatY,
            status: 'available',
            price: 100,
            category: 'standard',
            angle: angle * 180 / Math.PI
          })
        }
      }
      
      return {
        id: `section-${Date.now()}`,
        name: `Section ${currentLayout.sections.length + 1}`,
        x,
        y,
        rows,
        seatsPerRow,
        seats,
        pricing: 'standard',
        sectionType: 'curved',
        curveRadius: baseRadius,
        curveAngle: endAngle - startAngle
      }
    } else {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < seatsPerRow; col++) {
          seats.push({
            id: `seat-${Date.now()}-${row}-${col}`,
            row: String.fromCharCode(65 + row),
            number: col + 1,
            x: x + col * 25,
            y: y + row * 25,
            status: 'available',
            price: 100,
            category: 'standard'
          })
        }
      }
      
      return {
        id: `section-${Date.now()}`,
        name: `Section ${currentLayout.sections.length + 1}`,
        x,
        y,
        rows,
        seatsPerRow,
        seats,
        pricing: 'standard',
        sectionType: 'standard',
        rotation: 0
      }
    }
  }

  const findSectionAtPoint = (x: number, y: number): Section | null => {
    for (const section of currentLayout.sections) {
      for (const seat of section.seats) {
        if (Math.abs(x - seat.x - 10) < 15 && Math.abs(y - seat.y - 10) < 15) {
          return section
        }
      }
    }
    return null
  }

  const findSeatAtPoint = (x: number, y: number): Seat | null => {
    for (const section of currentLayout.sections) {
      for (const seat of section.seats) {
        if (Math.abs(x - seat.x - 10) < 10 && Math.abs(y - seat.y - 10) < 10) {
          return seat
        }
      }
    }
    return null
  }

  const updateSection = (updates: Partial<Section>) => {
    if (!selectedSection) return
    
    const updatedSections = currentLayout.sections.map(section => {
      if (section.id === selectedSection.id) {
        const updatedSection = { ...section, ...updates }
        
        // Handle row-level pricing
        if (updates.rowPricing) {
          updatedSection.seats = section.seats.map(seat => {
            const rowPricing = updates.rowPricing?.[seat.row]
            if (rowPricing) {
              return { ...seat, category: rowPricing }
            }
            return seat
          })
        }
        
        // Update all seats if section pricing changed
        if (updates.pricing && !updates.rowPricing) {
          updatedSection.seats = section.seats.map(seat => ({
            ...seat,
            category: updates.pricing
          }))
        }
        
        return updatedSection
      }
      return section
    })
    
    setCurrentLayout({ ...currentLayout, sections: updatedSections })
    setSelectedSection(updatedSections.find(s => s.id === selectedSection.id) || null)
  }

  const updateRowSeats = (row: string, newCount: number) => {
    if (!selectedSection) return
    
    const updatedSections = currentLayout.sections.map(section => {
      if (section.id === selectedSection.id) {
        const currentRowSeats = section.seats.filter(s => s.row === row)
        const otherSeats = section.seats.filter(s => s.row !== row)
        
        let newRowSeats: Seat[] = []
        const rowIndex = row.charCodeAt(0) - 65
        
        if (section.sectionType === 'curved' && section.curveRadius && section.curveAngle) {
          const centerX = section.x + 250
          const centerY = section.y + 200
          const radius = section.curveRadius + rowIndex * 30
          const startAngle = -section.curveAngle / 2
          const endAngle = section.curveAngle / 2
          const angleStep = newCount > 1 ? (endAngle - startAngle) / (newCount - 1) : 0
          
          for (let i = 0; i < newCount; i++) {
            const angle = (startAngle + angleStep * i) * Math.PI / 180
            const seatX = centerX + radius * Math.sin(angle)
            const seatY = centerY - radius * Math.cos(angle)
            
            const existingSeat = currentRowSeats[i]
            newRowSeats.push({
              id: existingSeat?.id || `seat-${section.id}-${rowIndex}-${i}`,
              row: row,
              number: i + 1,
              x: seatX,
              y: seatY,
              status: existingSeat?.status || 'available',
              price: existingSeat?.price || 100,
              category: existingSeat?.category || section.pricing,
              angle: angle * 180 / Math.PI,
              isAccessible: existingSeat?.isAccessible
            })
          }
        } else {
          for (let i = 0; i < newCount; i++) {
            const existingSeat = currentRowSeats[i]
            newRowSeats.push({
              id: existingSeat?.id || `seat-${section.id}-${rowIndex}-${i}`,
              row: row,
              number: i + 1,
              x: section.x + i * 25,
              y: section.y + rowIndex * 25,
              status: existingSeat?.status || 'available',
              price: existingSeat?.price || 100,
              category: existingSeat?.category || section.pricing,
              isAccessible: existingSeat?.isAccessible
            })
          }
        }
        
        const seatsByRow = { ...section.seatsByRow, [row]: newCount }
        
        return {
          ...section,
          seats: [...otherSeats, ...newRowSeats].sort((a, b) => {
            if (a.row === b.row) return a.number - b.number
            return a.row.localeCompare(b.row)
          }),
          seatsByRow
        }
      }
      return section
    })
    
    setCurrentLayout({ ...currentLayout, sections: updatedSections })
    setSelectedSection(updatedSections.find(s => s.id === selectedSection.id) || null)
  }

  const markSeatsAsAccessible = () => {
    if (selectedSeats.size === 0) return
    
    const updatedSections = currentLayout.sections.map(section => {
      const updatedSeats = section.seats.map(seat => {
        if (selectedSeats.has(seat.id)) {
          return {
            ...seat,
            isAccessible: !seat.isAccessible,
            status: seat.isAccessible ? 'available' : 'accessible'
          }
        }
        return seat
      })
      return { ...section, seats: updatedSeats }
    })
    
    setCurrentLayout({ ...currentLayout, sections: updatedSections })
  }

  const deleteSelectedSeats = () => {
    const updatedSections = currentLayout.sections.map(section => ({
      ...section,
      seats: section.seats.filter(seat => !selectedSeats.has(seat.id))
    }))
    
    setCurrentLayout({ ...currentLayout, sections: updatedSections })
    setSelectedSeats(new Set())
  }

  const deleteSection = () => {
    if (!selectedSection) return
    
    const updatedSections = currentLayout.sections.filter(s => s.id !== selectedSection.id)
    setCurrentLayout({
      ...currentLayout,
      sections: updatedSections,
      capacity: calculateTotalCapacity(updatedSections)
    })
    setSelectedSection(null)
  }

  const calculateTotalCapacity = (sections: Section[]) => {
    return sections.reduce((total, section) => total + section.seats.length, 0)
  }

  const handleSave = () => {
    const updatedLayout = {
      ...currentLayout,
      priceCategories,
      capacity: calculateTotalCapacity(currentLayout.sections)
    }
    onSave(updatedLayout)
  }

  const addPriceCategory = () => {
    const newCategory = {
      id: `cat-${Date.now()}`,
      name: 'New Category',
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      price: 100
    }
    setPriceCategories([...priceCategories, newCategory])
  }

  const updatePriceCategory = (id: string, updates: any) => {
    setPriceCategories(priceCategories.map(cat => 
      cat.id === id ? { ...cat, ...updates } : cat
    ))
  }

  const deletePriceCategory = (id: string) => {
    if (priceCategories.length <= 1) {
      alert('Must have at least one price category')
      return
    }
    setPriceCategories(priceCategories.filter(cat => cat.id !== id))
  }

  const getPriceCategoryColor = (categoryId: string) => {
    const category = priceCategories.find(c => c.id === categoryId)
    return category?.color || '#6b7280'
  }

  const updateStage = (updates: Partial<Stage>) => {
    setCurrentLayout({
      ...currentLayout,
      stage: { ...currentLayout.stage, ...updates }
    })
  }

  return (
    <div className="flex h-full bg-gray-900">
      {/* Left Sidebar - Tools & Settings */}
      <div className="w-80 bg-black/50 border-r border-white/10 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-lg font-bold mb-4">{title}</h3>
          
          {/* Tools */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold mb-2 text-gray-400">Tools</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedTool('select')}
                className={`p-3 rounded-lg transition-all ${
                  selectedTool === 'select' 
                    ? 'bg-purple-600' 
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                ↖️ Select
              </button>
              <button
                onClick={() => setSelectedTool('section')}
                className={`p-3 rounded-lg transition-all ${
                  selectedTool === 'section' 
                    ? 'bg-purple-600' 
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                📦 Section
              </button>
              <button
                onClick={() => setSelectedTool('curved-section')}
                className={`p-3 rounded-lg transition-all ${
                  selectedTool === 'curved-section' 
                    ? 'bg-purple-600' 
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                🌙 Curved
              </button>
            </div>
          </div>

          {/* Stage Settings */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold mb-2 text-gray-400">Stage Settings</h4>
            <div className="space-y-2">
              <input
                type="text"
                value={currentLayout.stage.label}
                onChange={(e) => updateStage({ label: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 rounded-lg"
                placeholder="Stage name"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Width</label>
                  <input
                    type="number"
                    value={currentLayout.stage.width}
                    onChange={(e) => updateStage({ width: parseInt(e.target.value) || 100 })}
                    className="w-full px-2 py-1 bg-white/10 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Height</label>
                  <input
                    type="number"
                    value={currentLayout.stage.height}
                    onChange={(e) => updateStage({ height: parseInt(e.target.value) || 60 })}
                    className="w-full px-2 py-1 bg-white/10 rounded"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">Click and drag stage to move</p>
            </div>
          </div>

          {/* Price Categories */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-semibold text-gray-400">Price Categories</h4>
              <button
                onClick={addPriceCategory}
                className="px-2 py-1 bg-green-600 rounded text-xs hover:bg-green-700"
              >
                + Add
              </button>
            </div>
            <div className="space-y-2">
              {priceCategories.map(category => (
                <div key={category.id} className="bg-white/5 rounded-lg p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="color"
                      value={category.color}
                      onChange={(e) => updatePriceCategory(category.id, { color: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={category.name}
                      onChange={(e) => updatePriceCategory(category.id, { name: e.target.value })}
                      className="flex-1 px-2 py-1 bg-white/10 rounded text-sm"
                    />
                    {priceCategories.length > 1 && (
                      <button
                        onClick={() => deletePriceCategory(category.id)}
                        className="px-2 py-1 bg-red-600/20 text-red-400 rounded text-xs"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Price:</span>
                    <input
                      type="number"
                      value={category.price}
                      onChange={(e) => updatePriceCategory(category.id, { price: parseInt(e.target.value) || 0 })}
                      className="w-20 px-2 py-1 bg-white/10 rounded text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section Settings */}
          {selectedSection && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-2 text-gray-400">Section Settings</h4>
              <div className="space-y-2">
                <input
                  type="text"
                  value={selectedSection.name}
                  onChange={(e) => updateSection({ name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 rounded-lg"
                  placeholder="Section name"
                />
                
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Section Price Category</label>
                  <select
                    value={selectedSection.pricing}
                    onChange={(e) => updateSection({ pricing: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg"
                  >
                    {priceCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} - ${cat.price}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Row Management */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Seats per Row</label>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {Array.from({ length: selectedSection.rows }, (_, i) => {
                      const rowLetter = String.fromCharCode(65 + i)
                      const rowSeats = selectedSection.seats.filter(s => s.row === rowLetter)
                      const seatCount = rowSeats.length
                      
                      return (
                        <div key={rowLetter} className="flex items-center gap-2">
                          <span className="text-sm w-12">Row {rowLetter}:</span>
                          <div className="flex items-center gap-1 flex-1">
                            <button
                              onClick={() => updateRowSeats(rowLetter, Math.max(0, seatCount - 1))}
                              className="px-2 py-1 bg-red-600/20 text-red-400 rounded text-sm"
                            >
                              -
                            </button>
                            <span className="px-2 text-center w-12">{seatCount}</span>
                            <button
                              onClick={() => updateRowSeats(rowLetter, seatCount + 1)}
                              className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-sm"
                            >
                              +
                            </button>
                          </div>
                          <select
                            value={rowSeats[0]?.category || selectedSection.pricing}
                            onChange={(e) => {
                              const rowPricing = { [rowLetter]: e.target.value }
                              updateSection({ rowPricing })
                            }}
                            className="w-24 px-1 py-1 bg-white/10 rounded text-xs"
                          >
                            {priceCategories.map(cat => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Curve Settings for Curved Sections */}
                {selectedSection.sectionType === 'curved' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Curve Angle</label>
                    <input
                      type="range"
                      value={selectedSection.curveAngle || 60}
                      onChange={(e) => {
                        const angle = parseInt(e.target.value)
                        updateSection({ curveAngle: angle })
                        // Rebuild curved seats
                        const updatedSection = { ...selectedSection, curveAngle: angle }
                        const newSeats = []
                        const centerX = updatedSection.x + 250
                        const centerY = updatedSection.y + 200
                        const startAngle = -angle / 2
                        const endAngle = angle / 2
                        
                        for (let row = 0; row < updatedSection.rows; row++) {
                          const rowLetter = String.fromCharCode(65 + row)
                          const seatCount = updatedSection.seats.filter(s => s.row === rowLetter).length
                          const radius = (updatedSection.curveRadius || 150) + row * 30
                          const angleStep = seatCount > 1 ? (endAngle - startAngle) / (seatCount - 1) : 0
                          
                          for (let col = 0; col < seatCount; col++) {
                            const seatAngle = (startAngle + angleStep * col) * Math.PI / 180
                            const seatX = centerX + radius * Math.sin(seatAngle)
                            const seatY = centerY - radius * Math.cos(seatAngle)
                            const existingSeat = updatedSection.seats.find(
                              s => s.row === rowLetter && s.number === col + 1
                            )
                            
                            newSeats.push({
                              id: existingSeat?.id || `seat-${updatedSection.id}-${row}-${col}`,
                              row: rowLetter,
                              number: col + 1,
                              x: seatX,
                              y: seatY,
                              status: existingSeat?.status || 'available',
                              price: existingSeat?.price || 100,
                              category: existingSeat?.category || updatedSection.pricing,
                              angle: seatAngle * 180 / Math.PI,
                              isAccessible: existingSeat?.isAccessible
                            })
                          }
                        }
                        updateSection({ seats: newSeats })
                      }}
                      className="w-full"
                      min="20"
                      max="180"
                    />
                    <span className="text-xs text-gray-400">{selectedSection.curveAngle || 60}°</span>
                  </div>
                )}

                {/* Standard Rotation for Regular Sections */}
                {selectedSection.sectionType === 'standard' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Rotation</label>
                    <input
                      type="range"
                      value={selectedSection.rotation || 0}
                      onChange={(e) => updateSection({ rotation: parseInt(e.target.value) })}
                      className="w-full"
                      min="-180"
                      max="180"
                    />
                    <span className="text-xs text-gray-400">{selectedSection.rotation || 0}°</span>
                  </div>
                )}

                {selectedSeats.size > 0 && (
                  <button
                    onClick={markSeatsAsAccessible}
                    className="w-full px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30"
                  >
                    Toggle Accessible ({selectedSeats.size} seats)
                  </button>
                )}

                <button
                  onClick={deleteSection}
                  className="w-full px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30"
                >
                  Delete Section
                </button>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="text-xs text-gray-400">
            <p>• Click to select sections</p>
            <p>• Shift+Click to select seats</p>
            <p>• Press 'A' to mark accessible</p>
            <p>• Press Delete to remove</p>
            <p>• Drag stage to reposition</p>
          </div>
        </div>
      </div>

      {/* Main Canvas Area - Centered */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="bg-black/50 border-b border-white/10 p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
                  className="px-3 py-1 bg-white/10 rounded hover:bg-white/20"
                >
                  -
                </button>
                <span className="w-20 text-center">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom(Math.min(2, zoom + 0.25))}
                  className="px-3 py-1 bg-white/10 rounded hover:bg-white/20"
                >
                  +
                </button>
                <button
                  onClick={() => setZoom(1)}
                  className="px-3 py-1 bg-white/10 rounded hover:bg-white/20 ml-2"
                >
                  Reset
                </button>
              </div>
              
              <div className="text-sm text-gray-400">
                Capacity: {calculateTotalCapacity(currentLayout.sections)}
                {selectedSeats.size > 0 && ` | Selected: ${selectedSeats.size}`}
              </div>
            </div>
            
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 font-semibold"
            >
              Save Layout
            </button>
          </div>
        </div>

        {/* Canvas Container - Centered */}
        <div className="flex-1 flex items-center justify-center bg-gray-800 overflow-hidden">
          <div className="relative" style={{ transform: `scale(${zoom})` }}>
            <svg
              ref={svgRef}
              width="1200"
              height="800"
              viewBox={`${currentLayout.viewBox.x} ${currentLayout.viewBox.y} ${currentLayout.viewBox.width} ${currentLayout.viewBox.height}`}
              className="bg-gray-900 rounded-lg shadow-2xl cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Grid */}
              <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="white" strokeOpacity="0.05" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Stage */}
              {currentLayout.stage && (
                <g>
                  <rect
                    x={currentLayout.stage.x}
                    y={currentLayout.stage.y}
                    width={currentLayout.stage.width}
                    height={currentLayout.stage.height}
                    fill="#1f2937"
                    stroke={editingStage ? "#9333ea" : "#4b5563"}
                    strokeWidth="2"
                    style={{ cursor: 'move' }}
                  />
                  <text
                    x={currentLayout.stage.x + currentLayout.stage.width / 2}
                    y={currentLayout.stage.y + currentLayout.stage.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="20"
                    fontWeight="bold"
                    style={{ pointerEvents: 'none' }}
                  >
                    {currentLayout.stage.label}
                  </text>
                  {/* Resize handle */}
                  <rect
                    x={currentLayout.stage.x + currentLayout.stage.width - 10}
                    y={currentLayout.stage.y + currentLayout.stage.height - 10}
                    width="10"
                    height="10"
                    fill="#9333ea"
                    style={{ cursor: 'nwse-resize' }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      setIsResizingStage(true)
                    }}
                  />
                </g>
              )}
              
              {/* Sections */}
              {currentLayout.sections.map(section => (
                <g
                  key={section.id}
                  transform={section.sectionType === 'standard' && section.rotation 
                    ? `rotate(${section.rotation} ${section.x + (section.seatsPerRow * 25) / 2} ${section.y + (section.rows * 25) / 2})` 
                    : undefined}
                >
                  {/* Section outline */}
                  {selectedSection?.id === section.id && (
                    <rect
                      x={section.x - 5}
                      y={section.y - 5}
                      width={section.sectionType === 'curved' ? 500 : section.seatsPerRow * 25 + 10}
                      height={section.sectionType === 'curved' ? 300 : section.rows * 25 + 10}
                      fill="none"
                      stroke="#9333ea"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      opacity="0.5"
                    />
                  )}
                  
                  {/* Section label */}
                  <text
                    x={section.sectionType === 'curved' 
                      ? section.x + 250 
                      : section.x + (section.seatsPerRow * 25) / 2}
                    y={section.y - 10}
                    textAnchor="middle"
                    fill="white"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    {section.name}
                  </text>
                  
                  {/* Seats */}
                  {section.seats.map(seat => (
                    <g key={seat.id} transform={seat.angle ? `rotate(${seat.angle} ${seat.x + 10} ${seat.y + 10})` : undefined}>
                      <rect
                        x={seat.x}
                        y={seat.y}
                        width="20"
                        height="20"
                        rx="4"
                        fill={seat.isAccessible ? '#2563eb' : getPriceCategoryColor(seat.category || section.pricing)}
                        stroke={selectedSeats.has(seat.id) ? '#fff' : 'white'}
                        strokeWidth={selectedSeats.has(seat.id) ? '2' : '1'}
                        strokeOpacity={selectedSeats.has(seat.id) ? '1' : '0.3'}
                        opacity={seat.status === 'disabled' ? 0.3 : 1}
                      />
                      {seat.isAccessible && (
                        <text
                          x={seat.x + 10}
                          y={seat.y + 14}
                          textAnchor="middle"
                          fill="white"
                          fontSize="12"
                          fontWeight="bold"
                          style={{ pointerEvents: 'none' }}
                        >
                          ♿
                        </text>
                      )}
                    </g>
                  ))}
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
