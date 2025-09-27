{/* Step 5: Complete Review */}
{wizardStep === 5 && (
  <div className="space-y-4 max-h-[60vh] overflow-y-auto">
    <h3 className="text-xl font-bold mb-4">Review Event Details</h3>
    
    <div className="bg-white/5 rounded-lg p-4 space-y-3">
      {/* Basic Information */}
      <div className="pb-3 border-b border-white/10">
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Basic Information</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p><span className="text-gray-500">Name:</span> {formData.name}</p>
          <p><span className="text-gray-500">Type:</span> {formData.type}</p>
          <p><span className="text-gray-500">Date:</span> {formData.date}</p>
          <p><span className="text-gray-500">Time:</span> {formData.time}</p>
        </div>
        {formData.description && (
          <p className="mt-2 text-sm"><span className="text-gray-500">Description:</span> {formData.description.substring(0, 100)}...</p>
        )}
      </div>

      {/* Venue Information */}
      <div className="pb-3 border-b border-white/10">
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Venue Details</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p><span className="text-gray-500">Venue:</span> {formData.venue}</p>
          <p><span className="text-gray-500">Capacity:</span> {formData.capacity}</p>
          {formData.layoutId && (
            <p><span className="text-gray-500">Layout:</span> {layouts.find(l => l.id === formData.layoutId)?.name || 'Custom'}</p>
          )}
        </div>
      </div>

      {/* Performers */}
      {formData.performers.length > 0 && (
        <div className="pb-3 border-b border-white/10">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Performers</h4>
          <p className="text-sm">{formData.performers.join(', ')}</p>
        </div>
      )}

      {/* Pricing */}
      {formData.pricing.length > 0 && (
        <div className="pb-3 border-b border-white/10">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Pricing Tiers</h4>
          <div className="space-y-2">
            {formData.pricing.map((tier, i) => (
              <div key={i} className="bg-white/5 rounded p-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{tier.level || `Tier ${i + 1}`}</p>
                    <p className="text-xs text-gray-400">Base: ${tier.price}</p>
                    {(tier.fees || []).length > 0 && (
                      <div className="text-xs text-gray-400 mt-1">
                        Fees: {tier.fees.map((fee: any) => 
                          `${fee.name}: ${fee.type === 'percentage' ? fee.amount + '%' : '$' + fee.amount}`
                        ).join(', ')}
                      </div>
                    )}
                    <p className="text-xs text-gray-400">Tax: {tier.tax}%</p>
                  </div>
                  <p className="text-lg font-bold">${calculateTotalPrice(tier).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Pricing */}
      {(formData.dynamicPricing.earlyBird.enabled || formData.dynamicPricing.groupDiscount.enabled) && (
        <div className="pb-3 border-b border-white/10">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Dynamic Pricing</h4>
          <div className="text-sm space-y-1">
            {formData.dynamicPricing.earlyBird.enabled && (
              <p>✓ Early Bird: {formData.dynamicPricing.earlyBird.discount}% off</p>
            )}
            {formData.dynamicPricing.groupDiscount.enabled && (
              <p>✓ Group: {formData.dynamicPricing.groupDiscount.discount}% off (Min {formData.dynamicPricing.groupDiscount.minSize})</p>
            )}
          </div>
        </div>
      )}

      {/* Images */}
      {(imageUrls.length > 0 || imageFiles.length > 0) && (
        <div className="pb-3 border-b border-white/10">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Images ({imageUrls.length + imageFiles.length})</h4>
          <div className="grid grid-cols-3 gap-2">
            {imageUrls.map((url, i) => (
              <img key={i} src={url} className="w-full h-16 object-cover rounded" alt="" />
            ))}
            {imageFiles.map((file, i) => (
              <div key={i} className="w-full h-16 bg-white/10 rounded flex items-center justify-center">
                <span className="text-xs">{file.name.substring(0, 10)}...</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEO */}
      {formData.seo.pageTitle && (
        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-2">SEO Settings</h4>
          <div className="text-xs space-y-1">
            <p><span className="text-gray-500">Title:</span> {formData.seo.pageTitle}</p>
            <p><span className="text-gray-500">URL:</span> /{formData.seo.urlSlug}</p>
            {formData.seo.keywords.length > 0 && (
              <p><span className="text-gray-500">Keywords:</span> {formData.seo.keywords.slice(0, 5).join(', ')}...</p>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
)}
