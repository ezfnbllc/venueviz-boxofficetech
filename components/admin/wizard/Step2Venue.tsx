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
      console.log('Loaded layouts:', layoutsData)
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
    console.log('Calculating capacity for section:', section)
    
    // Multiple ways seats might be stored
    if (section.rows && Array.isArray(section.rows)) {
      let totalSeats = 0
      section.rows.forEach((row: any) => {
        console.log('Row data:', row)
        // Try different possible structures
        const rowSeats = row.seats?.length || 
                        row.seatCount || 
                        row.numberOfSeats ||
                        row.capacity ||
                        10 // Default if no seat count found
        totalSeats += rowSeats
      })
      if (totalSeats > 0) return totalSeats
    }
    
    // Check if section has direct seat count
    if (section.seatCount) return section.seatCount
    if (section.totalSeats) return section.totalSeats
    if (section.capacity) return section.capacity
    
    // Count seats if they're stored directly in section
    if (section.seats && Array.isArray(section.seats)) {
      return section.seats.length
    }
    
    // For Arena sections, rows might be stored differently
    if (section.name === 'Arena' || section.label === 'Arena') {
      // Arena typically has 5 rows with ~10 seats each
      const rowCount = section.rows?.length || 5
      const seatsPerRow = section.seatsPerRow || 10
      return rowCount * seatsPerRow
    }
    
    return 0
  }
  
  const getSectionPriceInfo = (section: any, layout: any) => {
    const priceCategories = new Set<string>()
    const prices: number[] = []
    
    if (section.rows && Array.isArray(section.rows)) {
      section.rows.forEach((row: any) => {
        const category = row.category || row.priceCategory || 'Standard'
        priceCategories.add(category)
        
        const priceCat = layout.priceCategories?.find((pc: any) => 
          pc.name === category || pc.id === category
        )
        if (priceCat?.price) {
          prices.push(priceCat.price)
        }
      })
    }
    
    // If no categories found from rows, use section's default
    if (priceCategories.size === 0 && section.priceCategory) {
      priceCategories.add(section.priceCategory)
      const priceCat = layout.priceCategories?.find((pc: any) => 
        pc.name === section.priceCategory || pc.id === section.priceCategory
      )
      if (priceCat?.price) {
        prices.push(priceCat.price)
      }
    }
    
    return {
      categories: Array.from(priceCategories).join(', ') || 'Standard',
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0
    }
  }
  
  const calculateGACapacity = (level: any) => {
    if (level.type === 'standing') {
      return level.standingCapacity || level.capacity || 0
    } else if (level.type === 'seated') {
      return level.seatedCapacity || level.capacity || 0
    } else if (level.type === 'mixed') {
      if (level.capacity) {
        return level.capacity
      }
      const standing = level.standingCapacity || 0
      const seated = level.seatedCapacity || 0
      return standing + seated || level.capacity || 0
    }
    return level.capacity || 0
  }
  
  const handleLayoutChange = (layoutId: string) => {
    const layout = layouts.find(l => l.id === layoutId)
    console.log('Selected layout:', layout)
    
    if (layout) {
      setSelectedLayout(layout)
      
      const isSeatingChart = layout.type === 'seating_chart'
      const isGA = layout.type === 'general_admission'
      
      let availableSections = []
      
      if (isSeatingChart && layout.sections) {
        console.log('Processing sections:', layout.sections)
        
        availableSections = layout.sections.map((section: any) => {
          const capacity = calculateSectionCapacity(section)
          const priceInfo = getSectionPriceInfo(section, layout)
          
          console.log(`Section ${section.name}: capacity=${capacity}`)
          
          return {
            sectionId: section.id,
            sectionName: section.name || section.label || `Section ${section.id}`,
            available: true,
            capacity: capacity,
            priceCategories: priceInfo.categories,
            minPrice: priceInfo.minPrice,
            maxPrice: priceInfo.maxPrice,
            rows: section.rows || []
          }
        })
      } else if (isGA && layout.gaLevels) {
        availableSections = layout.gaLevels.map((level: any) => {
          const totalCapacity = calculateGACapacity(level)
          
          return {
            sectionId: level.id || level.name,
            sectionName: level.name,
            available: true,
            capacity: totalCapacity,
            standingCapacity: level.standingCapacity || 0,
            seatedCapacity: level.seatedCapacity || 0,
            configurationType: level.type || 'mixed'
          }
        })
      }
      
      // Use layout's totalCapacity if available and sections don't have capacity
      const calculatedTotal = availableSections.reduce((sum: number, s: any) => sum + (s.capacity || 0), 0)
      const finalCapacity = calculatedTotal > 0 ? calculatedTotal : (layout.totalCapacity || layout.capacity || 0)
      
      updateFormData('venue', { 
        layoutId,
        layoutType: layout.type,
        seatingType: isSeatingChart ? 'reserved' : 'general',
        availableSections,
        totalCapacity: finalCapacity,
        priceCategories: layout.priceCategories || []
      })
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
              {layouts.map(layout => (
                <option key={layout.id} value={layout.id}>
                  {layout.name} - Capacity: {layout.totalCapacity || layout.capacity || 'N/A'}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-gray-400">No layouts available for this venue</p>
          )}
        </div>
      )}
      
      {/* Show layout details if selected */}
      {selectedLayout && (
        <>
          {/* Layout Type Info */}
          <div className="mb-6 p-4 bg-purple-600/20 rounded-lg">
            <p className="text-sm text-gray-300">
              <span className="font-semibold">Seating Type:</span> {
                selectedLayout.type === 'seating_chart' 
                  ? 'Reserved Seating (Specific seat assignments)' 
                  : 'General Admission (First come, first served)'
              }
            </p>
            <p className="text-sm text-gray-300 mt-1">
              <span className="font-semibold">Total Layout Capacity:</span> {selectedLayout.totalCapacity || selectedLayout.capacity || 'N/A'}
            </p>
          </div>
          
          {/* Section/Level Configuration */}
          {formData.venue.availableSections && formData.venue.availableSections.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3">
                {selectedLayout.type === 'seating_chart' ? 'Sections' : 'Levels'} Configuration
              </h4>
              <p className="text-sm text-gray-400 mb-4">
                Select which {selectedLayout.type === 'seating_chart' ? 'sections' : 'levels'} to make available for this event
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
                                Capacity: {section.capacity || 'calculating...'} seats
                                {section.priceCategories && ` • ${section.priceCategories}`}
                                {section.rows?.length > 0 && ` • ${section.rows.length} rows`}
                              </>
                            ) : (
                              <>
                                Total Capacity: {section.capacity}
                                {section.configurationType === 'standing' && ` • Standing only`}
                                {section.configurationType === 'seated' && ` • Seated only`}
                                {section.configurationType === 'mixed' && section.standingCapacity > 0 && section.seatedCapacity > 0 && 
                                  ` • Mixed (${section.standingCapacity} standing, ${section.seatedCapacity} seated)`
                                }
                              </>
                            )}
                          </div>
                          {section.minPrice > 0 && section.maxPrice > 0 && (
                            <div className="text-sm text-gray-400">
                              Price range: ${section.minPrice} - ${section.maxPrice}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-purple-600/30 rounded-lg text-center">
                <p className="font-semibold">
                  Total Available Capacity: {totalAvailableCapacity || selectedLayout.totalCapacity || 0} {selectedLayout.type === 'seating_chart' ? 'seats' : 'attendees'}
                </p>
              </div>
            </div>
          )}
          
          {/* Layout Preview */}
          <div>
            <h4 className="font-semibold mb-3">Layout Preview</h4>
            <div className="bg-gray-900 rounded-lg p-6 min-h-[250px]">
              {selectedLayout.type === 'seating_chart' ? (
                <>
                  {formData.venue.availableSections && formData.venue.availableSections.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {formData.venue.availableSections
                        .filter((s: any) => s.available)
                        .map((section: any) => (
                          <div
                            key={section.sectionId}
                            className="bg-purple-600/30 border border-purple-500 rounded-lg p-4 text-center"
                          >
                            <p className="font-bold text-lg">{section.sectionName}</p>
                            <p className="text-sm mt-1">{section.capacity || 0} seats</p>
                            {section.priceCategories && (
                              <p className="text-xs text-purple-300 mt-2">{section.priceCategories}</p>
                            )}
                          </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center">No sections configured</p>
                  )}
                </>
              ) : (
                <>
                  {formData.venue.availableSections && formData.venue.availableSections.length > 0 ? (
                    <div className="space-y-4">
                      {formData.venue.availableSections
                        .filter((s: any) => s.available)
                        .map((level: any) => (
                          <div
                            key={level.sectionId}
                            className="bg-purple-600/30 border border-purple-500 rounded-lg p-4"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-bold text-lg">{level.sectionName}</p>
                                <p className="text-sm text-gray-300 mt-1">
                                  {level.configurationType === 'standing' ? '🚶 Standing Room Only' :
                                   level.configurationType === 'seated' ? '🪑 Seated Only' :
                                   '🎭 Mixed Configuration'}
                                </p>
                                {level.configurationType === 'mixed' && level.standingCapacity > 0 && level.seatedCapacity > 0 && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    {level.standingCapacity} standing, {level.seatedCapacity} seated
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold">{level.capacity}</p>
                                <p className="text-xs text-gray-400">total capacity</p>
                              </div>
                            </div>
                          </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center">No levels configured</p>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
