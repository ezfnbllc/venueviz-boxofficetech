// In the existing promotions display section, update the discount display:
<p className="text-sm text-gray-400">
  {(() => {
    const discountType = promo.discountType || promo.type || 'percentage'
    const discountValue = promo.discountValue || promo.discount || promo.value || 0
    return discountType === 'percentage' 
      ? `${discountValue}% off` 
      : `$${discountValue} off`
  })()}
  • {promo.maxUses ? `${promo.maxUses} uses remaining` : 'Unlimited'}
</p>
