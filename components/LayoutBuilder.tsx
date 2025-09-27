'use client'
import {useState, useEffect} from 'react'
import {AdminService} from '@/lib/admin/adminService'
import SeatGrid from './SeatGrid'

interface LayoutBuilderProps {
  venue: any
  onClose: () => void
}

export default function LayoutBuilder({ venue, onClose }: LayoutBuilderProps) {
  const [layouts, setLayouts] = useState<any[]>([])
  const [selectedLayout, setSelectedLayout] = useState<any>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [aiGenerating, setAiGenerating] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'seating_chart',
    sections: [] as any[],
    totalCapacity: 0,
    configuration: {} as any
  })

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

  const handleCreateLayout = () => {
    setFormData({
      name: '',
      type: 'seating_chart',
      sections: [],
      totalCapacity: 0,
      configuration: {}
    })
    setShowCreateModal(true)
    setIsEditing(false)
  }

  const handleEditLayout = (layout: any) => {
    setSelectedLayout(layout)
    setFormData({
      name: layout.name || '',
      type: layout.type || 'seating_chart',
      sections: layout.sections || [],
      totalCapacity: layout.totalCapacity || 0,
      configuration: layout.configuration || {}
    })
    setShowCreateModal(true)
    setIsEditing(true)
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

  const generateWithAI = async () => {
    setAiGenerating(true)
    try {
      const response = await fetch('/api/generate-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueName: venue.name,
          venueType: venue.type,
          capacity: venue.capacity,
          layoutType: formData.type
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({
          ...prev,
          sections: data.sections || [],
          totalCapacity: data.totalCapacity || venue.capacity,
          configuration: data.configuration || {}
        }))
      } else {
        const error = await response.json()
        console.error('AI generation error:', error)
        alert('Error generating layout: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('AI generation error:', error)
      alert('Error generating layout')
    }
    setAiGenerating(false)
  }

  const handleSaveLayout = async () => {
    try {
      const layoutData = {
        ...formData,
        venueId: venue.id,
        totalCapacity: formData.sections.reduce((sum: number, section: any) => {
          if (formData.type === 'general_admission') {
            return sum + (section.capacity || 0)
          } else {
            return sum + ((section.rows || 0) * (section.seatsPerRow || 0))
          }
        }, 0)
      }
      
      if (isEditing && selectedLayout) {
        await AdminService.updateLayout(selectedLayout.id, layoutData)
      } else {
        await AdminService.createLayout(layoutData)
      }
      
      setShowCreateModal(false)
      await loadLayouts()
      alert(`Layout ${isEditing ? 'updated' : 'created'} successfully!`)
    } catch (error) {
      console.error('Error saving layout:', error)
      alert('Error saving layout')
    }
  }

  const addSection = () => {
    const newSection = formData.type === 'general_admission' 
      ? {
          id: `section-${Date.now()}`,
          name: `Section ${formData.sections.length + 1}`,
          capacity: 100,
          type: 'standing'
        }
      : {
          id: `section-${Date.now()}`,
          name: `Section ${formData.sections.length + 1}`,
          rows: 10,
          seatsPerRow: 20,
          pricing: 'standard',
          seatType: 'regular'
        }
    
    setFormData({
      ...formData,
      sections: [...formData.sections, newSection]
    })
  }

  const updateSection = (index: number, updates: any) => {
    const newSections = [...formData.sections]
    newSections[index] = { ...newSections[index], ...updates }
    setFormData({ ...formData, sections: newSections })
  }

  const removeSection = (index: number) => {
    const newSections = formData.sections.filter((_, i) => i !== index)
    setFormData({ ...formData, sections: newSections })
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold">Layout Manager - {venue.name}</h2>
            <p className="text-gray-400 text-sm">Capacity: {venue.capacity}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">✕</button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {!showCreateModal ? (
            <>
              {/* Layout List */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Existing Layouts</h3>
                  <button
                    onClick={handleCreateLayout}
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
                    <p className="text-gray-400">No layouts yet. Create your first layout!</p>
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
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteLayout(layout.id)}
                              className="w-8 h-8 bg-red-600 rounded flex items-center justify-center hover:bg-red-700"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="text-sm">
                          <p>Capacity: {layout.totalCapacity || 0}</p>
                          <p>Sections: {layout.sections?.length || 0}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Create/Edit Layout Modal */}
              <div className="space-y-4">
                <div className="bg-black/40 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    {isEditing ? 'Edit Layout' : 'Create New Layout'}
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm mb-2">Layout Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg"
                        placeholder="e.g., Standard Theater Layout"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Layout Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({
                          ...formData, 
                          type: e.target.value,
                          sections: []
                        })}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      >
                        <option value="seating_chart">Seating Chart</option>
                        <option value="general_admission">General Admission</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold">Sections</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={generateWithAI}
                        disabled={aiGenerating}
                        className="px-4 py-2 bg-purple-600 rounded-lg disabled:opacity-50"
                      >
                        {aiGenerating ? 'Generating...' : '✨ AI Generate'}
                      </button>
                      <button
                        onClick={addSection}
                        className="px-4 py-2 bg-green-600 rounded-lg"
                      >
                        + Add Section
                      </button>
                    </div>
                  </div>

                  {/* Sections List */}
                  {formData.sections.length === 0 ? (
                    <div className="text-center py-8 bg-white/5 rounded-lg">
                      <p className="text-gray-400">
                        No sections yet. Add sections manually or use AI to generate.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {formData.sections.map((section, index) => (
                        <div key={section.id || index} className="bg-white/5 rounded-lg p-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <label className="text-xs text-gray-400">Section Name</label>
                              <input
                                type="text"
                                value={section.name}
                                onChange={(e) => updateSection(index, {name: e.target.value})}
                                className="w-full px-2 py-1 bg-white/10 rounded text-sm"
                              />
                            </div>
                            
                            {formData.type === 'seating_chart' ? (
                              <>
                                <div>
                                  <label className="text-xs text-gray-400">Rows</label>
                                  <input
                                    type="number"
                                    value={section.rows}
                                    onChange={(e) => updateSection(index, {rows: parseInt(e.target.value) || 0})}
                                    className="w-full px-2 py-1 bg-white/10 rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-400">Seats/Row</label>
                                  <input
                                    type="number"
                                    value={section.seatsPerRow}
                                    onChange={(e) => updateSection(index, {seatsPerRow: parseInt(e.target.value) || 0})}
                                    className="w-full px-2 py-1 bg-white/10 rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-400">Pricing Zone</label>
                                  <select
                                    value={section.pricing}
                                    onChange={(e) => updateSection(index, {pricing: e.target.value})}
                                    className="w-full px-2 py-1 bg-white/10 rounded text-sm"
                                  >
                                    <option value="vip">VIP</option>
                                    <option value="premium">Premium</option>
                                    <option value="standard">Standard</option>
                                    <option value="economy">Economy</option>
                                  </select>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <label className="text-xs text-gray-400">Capacity</label>
                                  <input
                                    type="number"
                                    value={section.capacity}
                                    onChange={(e) => updateSection(index, {capacity: parseInt(e.target.value) || 0})}
                                    className="w-full px-2 py-1 bg-white/10 rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-400">Type</label>
                                  <select
                                    value={section.type}
                                    onChange={(e) => updateSection(index, {type: e.target.value})}
                                    className="w-full px-2 py-1 bg-white/10 rounded text-sm"
                                  >
                                    <option value="standing">Standing</option>
                                    <option value="seated">Seated</option>
                                    <option value="mixed">Mixed</option>
                                  </select>
                                </div>
                              </>
                            )}
                          </div>
                          
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-gray-400">
                              {formData.type === 'seating_chart' 
                                ? `Total seats: ${(section.rows || 0) * (section.seatsPerRow || 0)}`
                                : `Capacity: ${section.capacity || 0}`
                              }
                            </span>
                            <button
                              onClick={() => removeSection(index)}
                              className="px-2 py-1 bg-red-600/20 text-red-400 rounded text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Visual Preview */}
                  {formData.sections.length > 0 && formData.type === 'seating_chart' && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3">Visual Preview</h4>
                      <SeatGrid sections={formData.sections} readOnly={true} />
                    </div>
                  )}

                  {/* Total Capacity */}
                  <div className="mt-4 p-3 bg-purple-600/20 rounded-lg">
                    <p className="text-center">
                      Total Capacity: {
                        formData.sections.reduce((sum, section) => {
                          if (formData.type === 'general_admission') {
                            return sum + (section.capacity || 0)
                          } else {
                            return sum + ((section.rows || 0) * (section.seatsPerRow || 0))
                          }
                        }, 0)
                      } / {venue.capacity}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions - Fixed */}
        <div className="flex justify-end gap-4 p-6 border-t border-white/10 bg-gray-900">
          {showCreateModal ? (
            <>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLayout}
                disabled={!formData.name || formData.sections.length === 0}
                className="px-6 py-2 bg-purple-600 rounded-lg disabled:opacity-50"
              >
                {isEditing ? 'Update Layout' : 'Save Layout'}
              </button>
            </>
          ) : (
            <button onClick={onClose} className="px-6 py-2 bg-gray-700 rounded-lg">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
