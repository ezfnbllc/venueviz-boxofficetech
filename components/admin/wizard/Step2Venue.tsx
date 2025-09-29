'use client'
import { useState, useEffect } from 'react'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'
import { AdminService } from '@/lib/admin/adminService'

export default function Step2Venue() {
  const { formData, updateFormData } = useEventWizardStore()
  const [venues, setVenues] = useState<any[]>([])
  const [layouts, setLayouts] = useState<any[]>([])
  const [selectedLayout, setSelectedLayout] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadVenues()
  }, [])
  
  useEffect(() => {
    if (formData.venue.venueId) {
      loadLayouts(formData.venue.venueId)
    }
  }, [formData.venue.venueId])
  
  useEffect(() => {
    if (formData.venue.layoutId && layouts.length > 0) {
      const layout = layouts.find(l => l.id === formData.venue.layoutId)
      if (layout) {
        setSelectedLayout(layout)
        processSections(layout)
      }
    }
  }, [formData.venue.layoutId, layouts])
  
  const loadVenues = async () => {
    setLoading(true)
    try {
      const venuesData = await AdminService.getVenues()
      setVenues(venuesData)
    } catch (error) {
      console.error('Error loading venues:', error)
    }
    setLoading(false)
  }
  
  const loadLayouts = async (venueId: string) => {
    try {
      const layoutsData = await AdminService.getLayoutsByVenueId(venueId)
      setLayouts(layoutsData)
      
      // Auto-select first layout if available
      if (layoutsData.length > 0 && !formData.venue.layoutId) {
        updateFormData('venue', { layoutId: layoutsData[0].id })
      }
    } catch (error) {
      console.error('Error loading layouts:', error)
    }
  }
  
  const processSections = (layout: any) => {
    const sections = layout.sections?.map((section: any) => {
      // Calculate capacity safely
      let capacity = section.capacity || 0
      
      // Only try to calculate from rows if rows is actually an array
      if (!capacity && Array.isArray(section.rows)) {
        capacity = section.rows.reduce((total: number, row: any) => 
          total + (Array.isArray(row.seats) ? row.seats.length : 0), 0)
      }
      
      return {
        sectionId: section.id,
        sectionName: section.name,
        available: true,
        capacity: capacity,
        seatingType: formData.venue.seatingType === 'mixed' 
          ? section.type || 'reserved' 
          : formData.venue.seatingType
      }
    }) || []
    
    updateFormData('venue', { availableSections: sections })
  }
  
  const handleVenueChange = (venueId: string) => {
    const venue = venues.find(v => v.id === venueId)
    updateFormData('venue', { 
      venueId,
      venueName: venue?.name || '',
      layoutId: '',
      availableSections: []
    })
  }
  
  const handleLayoutChange = (layoutId: string) => {
    updateFormData('venue', { layoutId })
    const layout = layouts.find(l => l.id === layoutId)
    setSelectedLayout(layout)
    if (layout) {
      processSections(layout)
    }
  }
  
  const handleSeatingTypeChange = (type: string) => {
    updateFormData('venue', { seatingType: type })
    if (selectedLayout) {
      processSections(selectedLayout)
    }
  }
  
  const toggleSectionAvailability = (sectionId: string) => {
    const sections = formData.venue.availableSections.map(section =>
      section.sectionId === sectionId
        ? { ...section, available: !section.available }
        : section
    )
    updateFormData('venue', { availableSections: sections })
  }
  
  const updateSectionType = (sectionId: string, type: string) => {
    const sections = formData.venue.availableSections.map(section =>
      section.sectionId === sectionId
        ? { ...section, seatingType: type }
        : section
    )
    updateFormData('venue', { availableSections: sections })
  }
  
  const getTotalCapacity = () => {
    return formData.venue.availableSections
      .filter(s => s.available)
      .reduce((total, section) => total + section.capacity, 0)
  }
  
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Venue Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Select Venue <span className="text-red-400">*</span>
        </label>
        <select
          value={formData.venue.venueId}
          onChange={(e) => handleVenueChange(e.target.value)}
          className="w-full px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
        >
          <option value="">Select a venue</option>
          {venues.map(venue => (
            <option key={venue.id} value={venue.id}>
              {venue.name} - Capacity: {venue.capacity || 'N/A'}
            </option>
          ))}
        </select>
      </div>
      
      {/* Layout Selection */}
      {formData.venue.venueId && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Select Layout <span className="text-red-400">*</span>
          </label>
          {layouts.length > 0 ? (
            <select
              value={formData.venue.layoutId}
              onChange={(e) => handleLayoutChange(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
            >
              <option value="">Select a layout</option>
              {layouts.map(layout => (
                <option key={layout.id} value={layout.id}>
                  {layout.name} - Capacity: {layout.totalCapacity || 'N/A'}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-gray-400">No layouts available for this venue</p>
          )}
        </div>
      )}
      
      {/* Seating Type */}
      <div>
        <label className="block text-sm font-medium mb-2">Seating Type</label>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleSeatingTypeChange('reserved')}
            className={`px-4 py-2 rounded-lg border ${
              formData.venue.seatingType === 'reserved'
                ? 'bg-purple-600 border-purple-600'
                : 'bg-white/10 border-white/20'
            }`}
          >
            Reserved Seating
          </button>
          <button
            type="button"
            onClick={() => handleSeatingTypeChange('general')}
            className={`px-4 py-2 rounded-lg border ${
              formData.venue.seatingType === 'general'
                ? 'bg-purple-600 border-purple-600'
                : 'bg-white/10 border-white/20'
            }`}
          >
            General Admission
          </button>
          <button
            type="button"
            onClick={() => handleSeatingTypeChange('mixed')}
            className={`px-4 py-2 rounded-lg border ${
              formData.venue.seatingType === 'mixed'
                ? 'bg-purple-600 border-purple-600'
                : 'bg-white/10 border-white/20'
            }`}
          >
            Mixed
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Reserved: Specific seat assignments | General: First come, first served | Mixed: Both options
        </p>
      </div>
      
      {/* Section Configuration */}
      {selectedLayout && formData.venue.availableSections.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2">Section Configuration</label>
          <div className="bg-black/20 rounded-lg p-4">
            <div className="space-y-3">
              {formData.venue.availableSections.map(section => (
                <div key={section.sectionId} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={section.available}
                      onChange={() => toggleSectionAvailability(section.sectionId)}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <p className="font-semibold">{section.sectionName}</p>
                      <p className="text-sm text-gray-400">
                        Capacity: {section.capacity} seats
                      </p>
                    </div>
                  </div>
                  
                  {formData.venue.seatingType === 'mixed' && section.available && (
                    <select
                      value={section.seatingType}
                      onChange={(e) => updateSectionType(section.sectionId, e.target.value)}
                      className="px-3 py-1 bg-white/10 rounded text-sm"
                    >
                      <option value="reserved">Reserved</option>
                      <option value="general">General</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-purple-600/20 rounded-lg">
              <p className="text-sm">
                <span className="font-semibold">Total Event Capacity:</span> {getTotalCapacity()} seats
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Layout Preview */}
      {selectedLayout && (
        <div>
          <label className="block text-sm font-medium mb-2">Layout Preview</label>
          <div className="bg-black/20 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {selectedLayout.sections?.map((section: any) => (
                <div
                  key={section.id}
                  className={`p-3 rounded-lg border ${
                    formData.venue.availableSections.find(s => s.sectionId === section.id)?.available
                      ? 'bg-purple-600/20 border-purple-600'
                      : 'bg-gray-600/20 border-gray-600'
                  }`}
                >
                  <p className="font-semibold">{section.name}</p>
                  <p className="text-xs text-gray-400">
                    {section.rows?.length || 0} rows
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
