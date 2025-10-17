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
    if (layouts.length > 0 && !formData.venue.layoutId) {
      handleLayoutChange(layouts[0].id)
    } else if (layouts.length > 0 && formData.venue.layoutId) {
      const existingLayout = layouts.find(l => l.id === formData.venue.layoutId)
      if (existingLayout) {
        setSelectedLayout(existingLayout)
        if (!formData.venue.availableSections || formData.venue.availableSections.length === 0) {
          handleLayoutChange(formData.venue.layoutId)
        }
      }
    }
  }, [layouts, formData.venue.layoutId])
  
  const loadVenues = async () => {
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
    } catch (error) {
      console.error('Error loading layouts:', error)
    }
  }
  
  const handleVenueChange = (venueId: string) => {
    updateFormData('venue', { 
      venueId, 
      layoutId: '',
      availableSections: []
    })
    setSelectedLayout(null)
    if (venueId) {
      loadLayouts(venueId)
    }
  }
  
  const calculateSectionCapacity = (section: any) => {
    // First check if section has a direct capacity property
    if (section.capacity && typeof section.capacity === 'number') {
      return section.capacity
    }
    
    // If section has seats array, count them
    if (section.seats && Array.isArray(section.seats)) {
      return section.seats.length
    }
    
    // If section has rows with seats
    if (section.rows && Array.isArray(section.rows)) {
      return section.rows.reduce((total: number, row: any) => {
        if (Array.isArray(row.seats)) {
          return total + row.seats.length
        }
        return total + (row.seatCount || row.capacity || 0)
      }, 0)
    }
    
    // Fallback to totalSeats or default
    return section.totalSeats || section.totalCapacity || 0
  }
  
  const calculateGACapacity = (level: any) => {
    if (level.type === 'standing') {
      return level.standingCapacity || level.capacity || 0
    } else if (level.type === 'seated') {
      return level.seatedCapacity || level.capacity || 0
    } else if (level.type === 'mixed') {
      if (level.capacity) return level.capacity
      const standing = level.standingCapacity || 0
      const seated = level.seatedCapacity || 0
      return standing + seated || level.capacity || 0
    }
    return level.capacity || 0
  }
  
  const handleLayoutChange = (layoutId: string) => {
    const layout = layouts.find(l => l.id === layoutId)
    
    if (layout) {
      setSelectedLayout(layout)
      
      const isSeatingChart = layout.type === 'seating_chart'
      const isGA = layout.type === 'general_admission'
      
      let availableSections = []
      let totalCalculatedCapacity = 0
      
      if (isSeatingChart && layout.sections) {
        availableSections = layout.sections.map((section: any) => {
          const capacity = calculateSectionCapacity(section)
          totalCalculatedCapacity += capacity
          
          // Get price category from section or layout
          const priceCategory = section.pricing || 
                               section.priceCategory || 
                               (layout.priceCategories?.find((cat: any) => cat.id === section.priceCategoryId)) ||
                               'Standard'
          
          return {
            sectionId: section.id,
            sectionName: section.name || section.label || `Section ${section.id}`,
            available: true,
            capacity: capacity,
            priceCategories: priceCategory,
            minPrice: 0,
            maxPrice: 0,
            rows: section.rows || []
          }
        })
      } else if (isGA && layout.gaLevels) {
        availableSections = layout.gaLevels.map((level: any) => {
          const capacity = calculateGACapacity(level)
          totalCalculatedCapacity += capacity
          
          return {
            sectionId: level.id || level.name,
            sectionName: level.name,
            available: true,
            capacity: capacity,
            standingCapacity: level.standingCapacity || 0,
            seatedCapacity: level.seatedCapacity || 0,
            configurationType: level.type || 'mixed'
          }
        })
      }
      
      // Use calculated total if layout doesn't have totalCapacity
      const finalTotalCapacity = layout.totalCapacity || totalCalculatedCapacity
      
      updateFormData('venue', { 
        layoutId,
        layoutType: layout.type,
        seatingType: isSeatingChart ? 'reserved' : 'general',
        availableSections,
        totalCapacity: finalTotalCapacity,
        priceCategories: layout.priceCategories || []
      })
    }
  }
  
  const checkSectionUsage = async (sectionId: string) => {
    const hasPricing = formData.pricing?.tiers?.some((tier: any) => tier.sectionId === sectionId)
    const hasSales = false // Will be implemented when sales checking is added
    return { hasPricing, hasSales }
  }
  
  const toggleSectionAvailability = async (sectionId: string) => {
    const section = formData.venue.availableSections.find((s: any) => s.sectionId === sectionId)
    
    if (section?.available) {
      const { hasPricing, hasSales } = await checkSectionUsage(sectionId)
      
      if (hasSales) {
        alert('Cannot disable this section - tickets have already been sold for this section.')
        return
      }
      
      if (hasPricing) {
        const confirmed = confirm(
          'This section has pricing configured. Disabling it will remove the pricing configuration. Continue?'
        )
        if (!confirmed) return
        
        const updatedTiers = formData.pricing?.tiers?.filter((tier: any) => tier.sectionId !== sectionId) || []
        updateFormData('pricing', {
          ...formData.pricing,
          tiers: updatedTiers
        })
      }
    }
    
    const sections = formData.venue.availableSections.map(s =>
      s.sectionId === sectionId 
        ? { ...s, available: !s.available }
        : s
    )
    updateFormData('venue', { 
      ...formData.venue,
      availableSections: sections 
    })
  }
  
  const totalAvailableCapacity = formData.venue.availableSections
    ?.filter((s: any) => s.available)
    ?.reduce((sum: number, s: any) => sum + (s.capacity || 0), 0) || 0
  
  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Venue & Layout Selection</h3>
      
      {/* Venue Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Select Venue *
        </label>
        <select
          value={formData.venue.venueId}
          onChange={(e) => handleVenueChange(e.target.value)}
          className="w-full px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
          required
        >
          <option value="">Select a venue</option>
          {venues.map(venue => (
            <option key={venue.id} value={venue.id}>
              {venue.name} - Capacity: {venue.capacity}
            </option>
          ))}
        </select>
      </div>
      
      {/* Layout Selection */}
      {formData.venue.venueId && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Select Layout *
          </label>
          {layouts.length > 0 ? (
            <select
              value={formData.venue.layoutId}
              onChange={(e) => handleLayoutChange(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
              required
            >
              <option value="">Select a layout</option>
              {layouts.map(layout => {
                const displayCapacity = layout.totalCapacity || layout.capacity || 
                  (layout.sections?.reduce((sum: number, s: any) => 
                    sum + calculateSectionCapacity(s), 0)) || 'N/A'
                return (
                  <option key={layout.id} value={layout.id}>
                    {layout.name} - Capacity: {displayCapacity}
                  </option>
                )
              })}
            </select>
          ) : (
            <p className="text-gray-400">No layouts available for this venue</p>
          )}
        </div>
      )}
      
      {/* Layout Details */}
      {selectedLayout && formData.venue.availableSections && (
        <>
          <div className="mb-6 p-4 bg-purple-600/20 rounded-lg">
            <p className="text-sm text-gray-300">
              <span className="font-semibold">Seating Type:</span> {
                selectedLayout.type === 'seating_chart' 
                  ? 'Reserved Seating (Specific seat assignments)' 
                  : 'General Admission (First come, first served)'
              }
            </p>
          </div>
          
          <div className="mb-6">
            <h4 className="font-semibold mb-3">
              {selectedLayout.type === 'seating_chart' ? 'Sections' : 'Levels'} Configuration
            </h4>
            <p className="text-sm text-gray-400 mb-4">
              Select which {selectedLayout.type === 'seating_chart' ? 'sections' : 'levels'} to make available
            </p>
            
            <div className="space-y-3">
              {formData.venue.availableSections.map((section: any) => (
                <div
                  key={section.sectionId}
                  className={`p-4 rounded-lg border transition-all ${
                    section.available
                      ? 'bg-purple-600/20 border-purple-600'
                      : 'bg-gray-800 border-gray-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={section.available}
                        onChange={() => toggleSectionAvailability(section.sectionId)}
                        className="w-5 h-5 accent-purple-600"
                      />
                      <div>
                        <p className="font-semibold">{section.sectionName}</p>
                        <div className="text-sm text-gray-400 mt-1">
                          {selectedLayout.type === 'seating_chart' ? (
                            <>
                              Capacity: {section.capacity} seats
                              {section.priceCategories && ` • ${section.priceCategories}`}
                            </>
                          ) : (
                            <>
                              Total Capacity: {section.capacity}
                              {section.configurationType && ` • ${section.configurationType}`}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-purple-600/30 rounded-lg text-center">
              <p className="font-semibold">
                Total Available Capacity: {totalAvailableCapacity} {
                  selectedLayout.type === 'seating_chart' ? 'seats' : 'attendees'
                }
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
