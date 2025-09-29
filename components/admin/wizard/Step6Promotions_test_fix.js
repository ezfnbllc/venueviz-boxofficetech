// Find and replace the test code section with this:
const testPromoCode = (code) => {
  if (!code) return
  
  const upperCode = code.toUpperCase()
  
  // Check event-specific promotions first
  const eventPromo = formData.promotions?.eventPromotions?.find(
    p => p.code === upperCode
  )
  
  if (eventPromo) {
    alert(`✅ Valid! ${eventPromo.type === 'percentage' ? 
      `${eventPromo.value}% off` : 
      `$${eventPromo.value} off`}`)
    return
  }
  
  // Check linked existing promotions
  const linkedPromoIds = formData.promotions?.linkedPromotions || []
  const linkedPromo = existingPromotions.find(
    p => linkedPromoIds.includes(p.id) && p.code === upperCode
  )
  
  if (linkedPromo) {
    alert(`✅ Valid! ${linkedPromo.discountType === 'percentage' ? 
      `${linkedPromo.discountValue}% off` : 
      `$${linkedPromo.discountValue} off`} (Linked promotion)`)
    return
  }
  
  alert('❌ Invalid code for this event')
}
