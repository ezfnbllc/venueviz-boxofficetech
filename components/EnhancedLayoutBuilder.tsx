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
    const newLayout: SeatingLayout = {
      id: `layout-${Date.now()}`,
      venueId: venue.id,
      name: 'New Layout',
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
      }
    }
    setCurrentLayout(newLayout)
    setIsDesigning(true)
  }

  const handleEditLayout = (layout: any) => {
    // Convert existing layout to SeatingLayout format
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
      }
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

  if (isDesigning && currentLayout) {
    return (
      <div className="fixed inset-0 bg-black z-50">
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center p-4 bg-gray-900 border-b border-white/10">
            <h2 className="text-xl font-bold">
              {selectedLayout ? 'Edit Layout' : 'Create Layout'} - {venue.name}
            </h2>
            <button
              onClick={() => {
                setIsDesigning(false)
                setCurrentLayout(null)
                setSelectedLayout(null)
              }}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 relative">
            <SeatingChartDesigner
              layout={currentLayout}
              onSave={handleSaveLayout}
              mode="edit"
            />
          </div>
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
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Seating Layouts</h3>
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
              >
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
                <p className="text-gray-400">No layouts yet. Create your first seating layout!</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {layouts.map(layout => (
                  <div key={layout.id} className="bg-black/40 rounded-lg p-4 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold">{layout.name}</h4>
                        <p className="text-sm text-gray-400">
                          {layout.type === 'general_admission' ? 'General Admission' : 'Seating Chart'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditLayout(layout)}
                          className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center hover:bg-blue-700"
                          title="Edit"
                        >
                          ✏️
                        </button>
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
                      <p>Sections: {layout.sections?.length || 0}</p>
                    </div>
                    <button
                      onClick={() => handleEditLayout(layout)}
                      className="w-full mt-3 py-2 bg-purple-600/20 text-purple-400 rounded hover:bg-purple-600/30"
                    >
                      Open Designer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
