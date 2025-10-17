// Fix for venue data structure when saving events
export function prepareEventDataForSave(formData: any) {
  const eventData: any = {
    // Basic information
    name: formData.basics?.name,
    description: formData.basics?.description,
    category: formData.basics?.category,
    type: formData.basics?.type,
    tags: formData.basics?.tags || [],
    
    // Venue information - IMPORTANT: Save both ID and name
    venue: formData.venue?.venueId, // This is what the listing expects
    venueName: null, // Will be populated below
    venueId: formData.venue?.venueId,
    layoutId: formData.venue?.layoutId,
    layoutName: formData.venue?.layoutName,
    seatingType: formData.venue?.seatingType,
    availableSections: formData.venue?.availableSections || [],
    totalCapacity: formData.venue?.totalCapacity,
    
    // Schedule
    schedule: formData.schedule || {},
    performances: formData.schedule?.performances || [],
    
    // Pricing
    pricing: {
      tiers: formData.pricing?.tiers || [],
      fees: formData.pricing?.fees || {},
      usePriceCategories: formData.pricing?.usePriceCategories || false
    },
    
    // Sales
    sales: formData.sales || {},
    
    // Promoter
    promoter: formData.promoter || {},
    
    // Promotions
    promotions: formData.promotions || {},
    
    // Communications
    communications: formData.communications || {},
    
    // Status
    status: formData.status || 'draft'
  }
  
  // Remove undefined values
  Object.keys(eventData).forEach(key => {
    if (eventData[key] === undefined) {
      delete eventData[key]
    }
  })
  
  return eventData
}
