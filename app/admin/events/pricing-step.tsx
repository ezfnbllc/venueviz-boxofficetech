export const PricingStep = ({ formData, setFormData, layouts }: any) => {
  const selectedLayout = layouts.find((l: any) => l.id === formData.layoutId)
  const isGA = selectedLayout?.type === 'general_admission'

  const initializePricingFromLayout = () => {
    if (isGA && selectedLayout?.gaLevels) {
      const newPricing = selectedLayout.gaLevels.map((level: any) => ({
        level: level.name,
        capacity: level.capacity,
        price: 50,
        tax: 8,
        fees: [{ name: 'Service Fee', amount: 5, type: 'flat' }]
      }))
      setFormData({ ...formData, pricing: newPricing })
    } else if (selectedLayout?.sections) {
      const uniquePricingLevels = new Set()
      selectedLayout.sections.forEach((section: any) => {
        uniquePricingLevels.add(section.pricing || 'standard')
      })
      
      const newPricing = Array.from(uniquePricingLevels).map((level: any) => ({
        level: level.charAt(0).toUpperCase() + level.slice(1),
        price: level === 'vip' ? 250 : level === 'premium' ? 150 : level === 'standard' ? 100 : 75,
        tax: 8,
        fees: [{ name: 'Service Fee', amount: 10, type: 'flat' }]
      }))
      setFormData({ ...formData, pricing: newPricing })
    }
  }

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          {isGA ? 'GA Level Pricing' : 'Section Pricing'}
        </h3>
        <button
          onClick={initializePricingFromLayout}
          className="px-3 py-1 bg-purple-600 rounded text-sm hover:bg-purple-700"
        >
          Auto-fill from Layout
        </button>
      </div>
      
      {formData.pricing.map((tier: any, tierIndex: number) => (
        <div key={tierIndex} className="bg-white/5 rounded-lg p-4">
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">
              {isGA ? 'GA Level' : 'Price Tier'} Name
            </label>
            <input
              type="text"
              value={tier.level}
              onChange={(e) => {
                const newPricing = [...formData.pricing]
                newPricing[tierIndex].level = e.target.value
                setFormData({...formData, pricing: newPricing})
              }}
              className="w-full px-3 py-2 bg-white/10 rounded-lg"
              readOnly={isGA}
            />
            {isGA && tier.capacity && (
              <p className="text-xs text-gray-400 mt-1">Capacity: {tier.capacity} tickets</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Base Price ($)</label>
              <input
                type="number"
                value={tier.price}
                onChange={(e) => {
                  const newPricing = [...formData.pricing]
                  newPricing[tierIndex].price = parseInt(e.target.value) || 0
                  setFormData({...formData, pricing: newPricing})
                }}
                className="w-full px-3 py-2 bg-white/10 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tax (%)</label>
              <input
                type="number"
                value={tier.tax}
                onChange={(e) => {
                  const newPricing = [...formData.pricing]
                  newPricing[tierIndex].tax = parseInt(e.target.value) || 0
                  setFormData({...formData, pricing: newPricing})
                }}
                className="w-full px-3 py-2 bg-white/10 rounded-lg"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-2">Service Fees</label>
            {(tier.fees || []).map((fee: any, feeIndex: number) => (
              <div key={feeIndex} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Fee name"
                  value={fee.name}
                  onChange={(e) => {
                    const newPricing = [...formData.pricing]
                    newPricing[tierIndex].fees[feeIndex].name = e.target.value
                    setFormData({...formData, pricing: newPricing})
                  }}
                  className="flex-1 px-2 py-1 bg-white/10 rounded text-sm"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={fee.amount}
                  onChange={(e) => {
                    const newPricing = [...formData.pricing]
                    newPricing[tierIndex].fees[feeIndex].amount = parseFloat(e.target.value) || 0
                    setFormData({...formData, pricing: newPricing})
                  }}
                  className="w-20 px-2 py-1 bg-white/10 rounded text-sm"
                />
                <select
                  value={fee.type}
                  onChange={(e) => {
                    const newPricing = [...formData.pricing]
                    newPricing[tierIndex].fees[feeIndex].type = e.target.value
                    setFormData({...formData, pricing: newPricing})
                  }}
                  className="w-20 px-2 py-1 bg-white/10 rounded text-sm"
                >
                  <option value="flat">$</option>
                  <option value="percentage">%</option>
                </select>
                <button
                  onClick={() => {
                    const newPricing = [...formData.pricing]
                    newPricing[tierIndex].fees = newPricing[tierIndex].fees.filter((_: any, i: number) => i !== feeIndex)
                    setFormData({...formData, pricing: newPricing})
                  }}
                  className="px-2 py-1 bg-red-600/20 text-red-400 rounded text-sm"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const newPricing = [...formData.pricing]
                if (!newPricing[tierIndex].fees) {
                  newPricing[tierIndex].fees = []
                }
                newPricing[tierIndex].fees.push({
                  name: '',
                  amount: 0,
                  type: 'flat'
                })
                setFormData({...formData, pricing: newPricing})
              }}
              className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded text-sm"
            >
              + Add Fee
            </button>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-white/10">
            <span className="text-sm text-gray-400">
              Total per ticket: ${calculateTotalPrice(tier).toFixed(2)}
            </span>
            {!isGA && (
              <button
                onClick={() => {
                  const newPricing = formData.pricing.filter((_: any, i: number) => i !== tierIndex)
                  setFormData({...formData, pricing: newPricing})
                }}
                className="text-red-400 text-sm hover:text-red-300"
              >
                Remove Tier
              </button>
            )}
          </div>
        </div>
      ))}

      {!isGA && (
        <button
          onClick={() => setFormData({
            ...formData,
            pricing: [...formData.pricing, {
              level: '',
              price: 50,
              tax: 8,
              fees: [{
                name: 'Service Fee',
                amount: 5,
                type: 'flat'
              }]
            }]
          })}
          className="px-4 py-2 bg-purple-600 rounded-lg"
        >
          + Add Pricing Tier
        </button>
      )}
    </div>
  )
}

const calculateTotalPrice = (tier: any) => {
  const basePrice = tier.price || 0
  const totalFees = (tier.fees || []).reduce((sum: number, fee: any) => {
    if (fee.type === 'percentage') {
      return sum + (basePrice * fee.amount / 100)
    }
    return sum + (fee.amount || 0)
  }, 0)
  const subtotal = basePrice + totalFees
  const tax = subtotal * (tier.tax || 0) / 100
  return subtotal + tax
}
