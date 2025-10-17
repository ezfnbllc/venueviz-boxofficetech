// Add this to your EventWizard component's handleSave function
const handleSave = async (status: 'draft' | 'published' = 'draft') => {
  try {
    setSaving(true)
    
    // Get venue name if we have venue ID
    let venueName = formData.venue?.venueName
    if (formData.venue?.venueId && !venueName) {
      try {
        const venue = await AdminService.getVenue(formData.venue.venueId)
        venueName = venue?.name || 'TBD'
      } catch (error) {
        console.error('Error fetching venue name:', error)
        venueName = 'TBD'
      }
    }
    
    const eventData = {
      // Basic information
      name: formData.basics?.name,
      description: formData.basics?.description,
      category: formData.basics?.category,
      type: formData.basics?.type,
      tags: formData.basics?.tags || [],
      
      // IMPORTANT: Save venue in the format expected by listing
      venue: venueName || 'TBD', // This is displayed in the listing
      venueId: formData.venue?.venueId,
      venueName: venueName,
      layoutId: formData.venue?.layoutId,
      layoutName: formData.venue?.layoutName,
      seatingType: formData.venue?.seatingType,
      availableSections: formData.venue?.availableSections || [],
      totalCapacity: formData.venue?.totalCapacity,
      
      // Schedule - Include the first performance date for listing
      date: formData.schedule?.performances?.[0]?.date || null,
      schedule: formData.schedule || {},
      performances: formData.schedule?.performances || [],
      
      // Pricing - Include price range for listing
      price: formData.pricing?.tiers?.length > 0 
        ? `$${Math.min(...formData.pricing.tiers.map(t => t.basePrice))} - $${Math.max(...formData.pricing.tiers.map(t => t.basePrice))}`
        : '$0',
      pricing: {
        tiers: formData.pricing?.tiers || [],
        fees: formData.pricing?.fees || {},
        usePriceCategories: formData.pricing?.usePriceCategories || false
      },
      
      // Other data
      sales: formData.sales || {},
      promoter: formData.promoter || {},
      promotions: formData.promotions || {},
      communications: formData.communications || {},
      status: status
    }
    
    // Remove undefined values
    const cleanData = JSON.parse(JSON.stringify(eventData))
    
    if (eventId) {
      await AdminService.updateEvent(eventId, cleanData)
      alert('Event updated successfully!')
    } else {
      const newEventId = await AdminService.createEvent(cleanData)
      router.push(`/admin/events/edit/${newEventId}`)
    }
    
    setSaving(false)
  } catch (error) {
    console.error('Error saving event:', error)
    alert('Error saving event. Please try again.')
    setSaving(false)
  }
}
