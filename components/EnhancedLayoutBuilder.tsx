'use client'
import { useState, useEffect } from 'react'
import { AdminService } from '@/lib/admin/adminService'
import SeatingChartDesigner from './SeatingChartDesigner'
import { SeatingLayout } from '@/lib/seating/types'

interface EnhancedLayoutBuilderProps {
  venue: any
  onClose: () => void
}

export default function EnhancedLayoutBuilder({ venue, onClose }: EnhancedLayoutBuilderProps) {
  const [layouts, setLayouts] = useState<any[]>([])
  const [selectedLayout, setSelectedLayout] = useState<any>(null)
  const [isDesigning, setIsDesigning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentLayout, setCurrentLayout] = useState<SeatingLayout | null>(null)
  const [showGAWizard, setShowGAWizard] = useState(false)
  const [layoutType, setLayoutType] = useState<'seating_chart' | 'general_admission'>('seating_chart')
  const [layoutName, setLayoutName] = useState('')
  const [gaLevels, setGALevels] = useState<any[]>([
    { id: 'ga-1', name: 'General Admission', capacity: 500, type: 'standing' }
  ])

  useEffect(() => {
    loadLayouts()
  }, [venue])

  const loadLayouts = async () => {
    try {
      const layoutsData = await AdminService.getLayoutsByVenueId(venue.id)
      setLayouts(layoutsData)
    } catch (error) {
      console.error('Error loading layouts:', error)
    }
    setLoading(false)
  }

  const handleCreateNew = () => {
    setLayoutName('')
    setLayoutType('seating_chart')
    setGALevels([{ id: 'ga-1', name: 'General Admission', capacity: 500, type: 'standing' }])
    setShowGAWizard(true)
  }

  const proceedWithLayoutCreation = () => {
    if (!layoutName.trim()) {
      alert('Please enter a layout name')
      return
    }

    if (layoutType === 'general_admission') {
      handleSaveGALayout()
    } else {
      const newLayout: SeatingLayout = {
        id: `layout-${Date.now()}`,
        venueId: venue.id,
        name: layoutName,
        sections: [],
        stage: {
          x: 400,
          y: 50,
          width: 400,
          height: 60,
          label: 'STAGE',
          type: 'stage'
        },
        aisles: [],
        capacity: 0,
        viewBox: {
          x: 0,
          y: 0,
          width: 1200,
          height: 800
        },
        priceCategories: [
          { id: 'vip', name: 'VIP', color: '#9333ea', price: 250 },
          { id: 'premium', name: 'Premium', color: '#3b82f6', price: 150 },
          { id: 'standard', name: 'Standard', color: '#10b981', price: 100 },
          { id: 'economy', name: 'Economy', color: '#f59e0b', price: 75 }
        ]
      }
      setCurrentLayout(newLayout)
      setShowGAWizard(false)
      setIsDesigning(true)
    }
  }

  const handleEditLayout = (layout: any) => {
    if (layout.type === 'general_admission') {
      alert('GA layouts can only be edited through the wizard')
      return
    }
    
    const seatingLayout: SeatingLayout = {
      id: layout.id,
      venueId: venue.id,
      name: layout.name,
      sections: layout.sections || [],
      stage: layout.stage || {
        x: 400,
        y: 50,
        width: 400,
        height: 60,
        label: 'STAGE',
        type: 'stage'
      },
      aisles: layout.aisles || [],
      capacity: layout.totalCapacity || 0,
      viewBox: layout.viewBox || {
        x: 0,
        y: 0,
        width: 1200,
        height: 800
      },
      priceCategories: layout.priceCategories || [
        { id: 'vip', name: 'VIP', color: '#9333ea', price: 250 },
        { id: 'premium', name: 'Premium', color: '#3b82f6', price: 150 },
        { id: 'standard', name: 'Standard', color: '#10b981', price: 100 },
        { id: 'economy', name: 'Economy', color: '#f59e0b', price: 75 }
      ]
    }
    setCurrentLayout(seatingLayout)
    setSelectedLayout(layout)
    setIsDesigning(true)
  }

  const handleSaveLayout = async (layout: SeatingLayout) => {
    try {
      const layoutData = {
        name: layout.name,
        type: 'seating_chart',
        venueId: venue.id,
        sections: layout.sections,
        stage: layout.stage,
        aisles: layout.aisles,
        totalCapacity: layout.capacity,
        viewBox: layout.viewBox,
        priceCategories: layout.priceCategories || [],
        configuration: {
          version: '2.0',
          format: 'svg'
        }
      }

      if (selectedLayout) {
        await AdminService.updateLayout(selectedLayout.id, layoutData)
      } else {
        await AdminService.createLayout(layoutData)
      }

      setIsDesigning(false)
      setCurrentLayout(null)
      setSelectedLayout(null)
      await loadLayouts()
      alert('Layout saved successfully!')
    } catch (error) {
      console.error('Error saving layout:', error)
      alert('Error saving layout')
    }
  }

  const handleSaveGALayout = async () => {
    try {
      const totalCapacity = gaLevels.reduce((sum: number, level: any) => sum + (level.capacity || 0), 0)
      
      const layoutData = {
        name: layoutName,
        type: 'general_admission',
        venueId: venue.id,
        sections: [],
        gaLevels: gaLevels,
        totalCapacity: totalCapacity,
        configuration: {
          version: '2.0',
          format: 'ga'
        }
      }

      await AdminService.createLayout(layoutData)
      setShowGAWizard(false)
      await loadLayouts()
      alert('GA Layout saved successfully!')
    } catch (error) {
      console.error('Error saving GA layout:', error)
      alert('Error saving layout')
    }
  }

  const handleDeleteLayout = async (layoutId: string) => {
    if (confirm('Are you sure you want to delete this layout?')) {
      try {
        await AdminService.deleteLayout(layoutId)
        await loadLayouts()
        alert('Layout deleted successfully')
      } catch (error) {
        console.error('Error deleting layout:', error)
        alert('Error deleting layout')
      }
    }
  }

  const addGALevel = () => {
    setGALevels([...gaLevels, {
      id: `ga-${Date.now()}`,
      name: `Level ${gaLevels.length + 1}`,
      capacity: 100,
      type: 'standing'
    }])
  }

  const updateGALevel = (index: number, updates: any) => {
    const newLevels = [...gaLevels]
    newLevels[index] = { ...newLevels[index], ...updates }
    setGALevels(newLevels)
  }

  const removeGALevel = (index: number) => {
    setGALevels(gaLevels.filter((_, i) => i !== index))
  }

  if (isDesigning && currentLayout) {
    return (
      <div className="fixed inset-0 bg-black z-50">
        <div className="relative w-full h-full">
          <button
            onClick={() => {
              setIsDesigning(false)
              setCurrentLayout(null)
              setSelectedLayout(null)
            }}
            className="absolute top-4 right-4 z-50 w-10 h-10 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white font-bold text-xl"
            title="Close Designer"
          >
            ×
          </button>
          
          <SeatingChartDesigner
            layout={currentLayout}
            onSave={handleSaveLayout}
            mode="edit"
            title={`${selectedLayout ? 'Edit' : 'Create'} Layout - ${venue.name}`}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold">Layout Manager - {venue.name}</h2>
            <p className="text-gray-400 text-sm">Capacity: {venue.capacity}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Venue Layouts</h3>
              <button onClick={handleCreateNew} className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700">
                + Create New Layout
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
              </div>
            ) : layouts.length === 0 ? (
              <div className="text-center py-12 bg-black/40 rounded-lg">
                <div className="text-6xl mb-4">🎭</div>
                <p className="text-gray-400">No layouts yet. Create your first layout!</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {layouts.map(layout => (
                  <div key={layout.id} className="bg-black/40 rounded-lg p-4 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-bold">{layout.name}</h4>
                        <p className="text-sm text-gray-400">
                          {layout.type === 'general_admission' ? 'General Admission' : 'Seating Chart'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {layout.type !== 'general_admission' && (
                          <button
                            onClick={() => handleEditLayout(layout)}
                            className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center hover:bg-blue-700"
                            title="Edit"
                          >
                            ✏️
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteLayout(layout.id)}
                          className="w-8 h-8 bg-red-600 rounded flex items-center justify-center hover:bg-red-700"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="text-sm">
                      <p>Capacity: {layout.totalCapacity || 0}</p>
                      {layout.type === 'general_admission' ? (
                        <p>Levels: {layout.gaLevels?.length || 0}</p>
                      ) : (
                        <p>Sections: {layout.sections?.length || 0}</p>
                      )}
                    </div>
                    {layout.type !== 'general_admission' && (
                      <button
                        onClick={() => handleEditLayout(layout)}
                        className="w-full mt-3 py-2 bg-purple-600/20 text-purple-400 rounded hover:bg-purple-600/30"
                      >
                        Open Designer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GA Layout Creation Wizard */}
      {showGAWizard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60]">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Create New Layout</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Layout Name *</label>
                <input
                  type="text"
                  value={layoutName}
                  onChange={(e) => setLayoutName(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                  placeholder="e.g., Main Floor Layout, GA Standing Room"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Layout Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setLayoutType('seating_chart')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      layoutType === 'seating_chart'
                        ? 'border-purple-600 bg-purple-600/20'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="text-2xl mb-2">🪑</div>
                    <div className="font-semibold">Seating Chart</div>
                    <div className="text-xs text-gray-400">Design with canvas</div>
                  </button>
                  <button
                    onClick={() => setLayoutType('general_admission')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      layoutType === 'general_admission'
                        ? 'border-purple-600 bg-purple-600/20'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="text-2xl mb-2">🎫</div>
                    <div className="font-semibold">General Admission</div>
                    <div className="text-xs text-gray-400">Configure levels</div>
                  </button>
                </div>
              </div>

              {layoutType === 'general_admission' && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-semibold">GA Levels</label>
                    <button
                      onClick={addGALevel}
                      className="px-3 py-1 bg-green-600 rounded text-sm hover:bg-green-700"
                    >
                      + Add Level
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {gaLevels.map((level, index) => (
                      <div key={level.id} className="bg-white/5 rounded-lg p-3">
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Level name"
                            value={level.name}
                            onChange={(e) => updateGALevel(index, { name: e.target.value })}
                            className="px-3 py-2 bg-white/10 rounded text-sm"
                          />
                          <input
                            type="number"
                            placeholder="Capacity"
                            value={level.capacity}
                            onChange={(e) => updateGALevel(index, { capacity: parseInt(e.target.value) || 0 })}
                            className="px-3 py-2 bg-white/10 rounded text-sm"
                          />
                          <select
                            value={level.type}
                            onChange={(e) => updateGALevel(index, { type: e.target.value })}
                            className="px-3 py-2 bg-white/10 rounded text-sm"
                          >
                            <option value="standing">Standing</option>
                            <option value="seated">Seated</option>
                            <option value="mixed">Mixed</option>
                          </select>
                        </div>
                        {gaLevels.length > 1 && (
                          <button
                            onClick={() => removeGALevel(index)}
                            className="mt-2 text-red-400 text-sm hover:text-red-300"
                          >
                            Remove Level
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-3 bg-purple-600/20 rounded-lg">
                    <p className="text-sm">
                      Total Capacity: {gaLevels.reduce((sum, level) => sum + (level.capacity || 0), 0)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowGAWizard(false)}
                className="px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={proceedWithLayoutCreation}
                className="px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
              >
                {layoutType === 'general_admission' ? 'Create GA Layout' : 'Open Designer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
