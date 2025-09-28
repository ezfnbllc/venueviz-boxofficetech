'use client'
import { useState, useEffect, useRef } from 'react'
import { SeatingLayout, Section, Seat, Aisle } from '@/lib/seating/types'

interface SeatingChartDesignerProps {
  layout: SeatingLayout
  onSave: (layout: SeatingLayout) => void
  mode?: 'edit' | 'view'
  title?: string
}

// Define price categories with colors
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
  const [selectedTool, setSelectedTool] = useState<string>('select')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [priceCategories, setPriceCategories] = useState(
    layout.priceCategories || DEFAULT_PRICE_CATEGORIES
  )
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedSection) {
        deleteSection()
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedSection, currentLayout])

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
      const newSection = createSection(point.x, point.y)
      setCurrentLayout({
        ...currentLayout,
        sections: [...currentLayout.sections, newSection]
      })
      setSelectedSection(newSection)
      setSelectedTool('select')
    } else if (selectedTool === 'select') {
      const clickedSection = findSectionAtPoint(point.x, point.y)
      setSelectedSection(clickedSection)
      if (clickedSection) {
        setIsDragging(true)
        setDragStart(point)
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging && selectedSection) {
      const point = getSvgPoint(e.clientX, e.clientY)
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
  }

  const createSection = (x: number, y: number): Section => {
    const rows = 5
    const seatsPerRow = 10
    const seats: Seat[] = []
    
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
      rotation: 0
    }
  }

  const findSectionAtPoint = (x: number, y: number): Section | null => {
    for (const section of currentLayout.sections) {
      const sectionBounds = {
        left: section.x - 10,
        right: section.x + section.seatsPerRow * 25 + 10,
        top: section.y - 10,
        bottom: section.y + section.rows * 25 + 10
      }
      
      if (x >= sectionBounds.left && x <= sectionBounds.right &&
          y >= sectionBounds.top && y <= sectionBounds.bottom) {
        return section
      }
    }
    return null
  }

  const updateSection = (updates: Partial<Section>) => {
    if (!selectedSection) return
    
    const updatedSections = currentLayout.sections.map(section => {
      if (section.id === selectedSection.id) {
        const updatedSection = { ...section, ...updates }
        
        // Update row-level pricing if specified
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

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Row-Level Pricing (Optional)</label>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {Array.from({ length: selectedSection.rows }, (_, i) => {
                      const rowLetter = String.fromCharCode(65 + i)
                      const rowSeats = selectedSection.seats.filter(s => s.row === rowLetter)
                      const currentCategory = rowSeats[0]?.category || selectedSection.pricing
                      
                      return (
                        <div key={rowLetter} className="flex items-center gap-2">
                          <span className="text-sm w-12">Row {rowLetter}:</span>
                          <select
                            value={currentCategory}
                            onChange={(e) => {
                              const rowPricing = { [rowLetter]: e.target.value }
                              updateSection({ rowPricing })
                            }}
                            className="flex-1 px-2 py-1 bg-white/10 rounded text-sm"
                          >
                            {priceCategories.map(cat => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name} - ${cat.price}
                              </option>
                            ))}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Rows</label>
                    <input
                      type="number"
                      value={selectedSection.rows}
                      onChange={(e) => {
                        const rows = parseInt(e.target.value) || 1
                        const seats = []
                        for (let row = 0; row < rows; row++) {
                          for (let col = 0; col < selectedSection.seatsPerRow; col++) {
                            seats.push({
                              id: `seat-${selectedSection.id}-${row}-${col}`,
                              row: String.fromCharCode(65 + row),
                              number: col + 1,
                              x: selectedSection.x + col * 25,
                              y: selectedSection.y + row * 25,
                              status: 'available' as const,
                              price: 100,
                              category: selectedSection.pricing
                            })
                          }
                        }
                        updateSection({ rows, seats })
                      }}
                      className="w-full px-2 py-1 bg-white/10 rounded"
                      min="1"
                      max="26"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Seats/Row</label>
                    <input
                      type="number"
                      value={selectedSection.seatsPerRow}
                      onChange={(e) => {
                        const seatsPerRow = parseInt(e.target.value) || 1
                        const seats = []
                        for (let row = 0; row < selectedSection.rows; row++) {
                          for (let col = 0; col < seatsPerRow; col++) {
                            seats.push({
                              id: `seat-${selectedSection.id}-${row}-${col}`,
                              row: String.fromCharCode(65 + row),
                              number: col + 1,
                              x: selectedSection.x + col * 25,
                              y: selectedSection.y + row * 25,
                              status: 'available' as const,
                              price: 100,
                              category: selectedSection.pricing
                            })
                          }
                        }
                        updateSection({ seatsPerRow, seats })
                      }}
                      className="w-full px-2 py-1 bg-white/10 rounded"
                      min="1"
                    />
                  </div>
                </div>

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

                <button
                  onClick={deleteSection}
                  className="w-full px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30"
                >
                  Delete Section
                </button>
              </div>
            </div>
          )}
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
                    stroke="#4b5563"
                    strokeWidth="2"
                  />
                  <text
                    x={currentLayout.stage.x + currentLayout.stage.width / 2}
                    y={currentLayout.stage.y + currentLayout.stage.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="20"
                    fontWeight="bold"
                  >
                    {currentLayout.stage.label}
                  </text>
                </g>
              )}
              
              {/* Sections */}
              {currentLayout.sections.map(section => (
                <g
                  key={section.id}
                  transform={section.rotation ? `rotate(${section.rotation} ${section.x + (section.seatsPerRow * 25) / 2} ${section.y + (section.rows * 25) / 2})` : undefined}
                >
                  {/* Section outline */}
                  {selectedSection?.id === section.id && (
                    <rect
                      x={section.x - 5}
                      y={section.y - 5}
                      width={section.seatsPerRow * 25 + 10}
                      height={section.rows * 25 + 10}
                      fill="none"
                      stroke="#9333ea"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                  )}
                  
                  {/* Section label */}
                  <text
                    x={section.x + (section.seatsPerRow * 25) / 2}
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
                    <rect
                      key={seat.id}
                      x={seat.x}
                      y={seat.y}
                      width="20"
                      height="20"
                      rx="4"
                      fill={getPriceCategoryColor(seat.category || section.pricing)}
                      stroke="white"
                      strokeWidth="1"
                      strokeOpacity="0.3"
                    />
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
