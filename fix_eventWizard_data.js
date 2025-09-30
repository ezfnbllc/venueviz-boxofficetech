// Replace the prepareEventData function with this corrected version:
const prepareEventData = () => {
  return {
    ...formData.basics,
    
    // Venue configuration
    venueId: formData.venue?.venueId || '',
    venueName: formData.venue?.availableSections?.[0]?.sectionName || '',
    layoutId: formData.venue?.layoutId || '',
    layoutType: formData.venue?.layoutType || '',
    seatingType: formData.venue?.seatingType || 'general',
    availableSections: formData.venue?.availableSections || [],
    
    // Schedule
    schedule: formData.schedule || { performances: [], timezone: 'America/Chicago' },
    
    // Pricing - PROPERLY STRUCTURED
    pricing: {
      tiers: formData.pricing?.tiers || [],
      fees: formData.pricing?.fees || { 
        serviceFee: 0, 
        processingFee: 0, 
        facilityFee: 0,
        salesTax: 8.25
      },
      dynamicPricing: formData.pricing?.dynamicPricing || {
        earlyBird: { enabled: false, discount: 10, endDate: '' },
        lastMinute: { enabled: false, markup: 20, startDate: '' }
      }
    },
    
    // Promoter - ALL FIELDS
    promoter: {
      promoterId: formData.promoter?.promoterId || '',
      promoterName: formData.promoter?.promoterName || '',
      commission: formData.promoter?.commission || 0,
      paymentTerms: formData.promoter?.paymentTerms || 'net-30',
      responsibilities: formData.promoter?.responsibilities || []
    },
    
    // Promotions - MISSING BEFORE!
    promotions: {
      linkedPromotions: formData.promotions?.linkedPromotions || [],
      eventPromotions: formData.promotions?.eventPromotions || [],
      groupDiscount: formData.promotions?.groupDiscount || {}
    },
    
    // Sales
    sales: formData.sales || {},
    
    // Communications  
    communications: formData.communications || {}
  }
}
