'use client'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'

export default function Step7Sales() {
  const { formData, updateFormData } = useEventWizardStore()
  
  const updateSalesPeriod = (field: string, value: any) => {
    updateFormData('sales', {
      salesPeriod: {
        ...formData.sales.salesPeriod,
        [field]: value
      }
    })
  }
  
  const updateDistribution = (field: string, value: number) => {
    const otherField = field === 'online' ? 'boxOffice' : 'online'
    updateFormData('sales', {
      distribution: {
        [field]: value,
        [otherField]: 100 - value
      }
    })
  }
  
  const updateWaitlist = (field: string, value: boolean) => {
    updateFormData('sales', {
      waitlist: {
        ...formData.sales.waitlist,
        [field]: value
      }
    })
  }
  
  return (
    <div className="space-y-6">
      {/* Sales Period */}
      <div>
        <label className="block text-sm font-medium mb-3">Sales Period</label>
        <div className="bg-black/20 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs mb-1">Sales Start Date</label>
              <input
                type="datetime-local"
                value={formData.sales.salesPeriod.startDate}
                onChange={(e) => updateSalesPeriod('startDate', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 rounded"
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Sales End Date</label>
              <input
                type="datetime-local"
                value={formData.sales.salesPeriod.endDate}
                onChange={(e) => updateSalesPeriod('endDate', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 rounded"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs mb-1">Auto-close sales (hours before event)</label>
            <input
              type="number"
              value={formData.sales.salesPeriod.autoCloseBeforeEvent}
              onChange={(e) => updateSalesPeriod('autoCloseBeforeEvent', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white/10 rounded"
              min="0"
              max="48"
            />
            <p className="text-xs text-gray-400 mt-1">
              Automatically stop online sales this many hours before the event starts
            </p>
          </div>
        </div>
      </div>
      
      {/* Ticket Distribution */}
      <div>
        <label className="block text-sm font-medium mb-3">Ticket Distribution</label>
        <div className="bg-black/20 rounded-lg p-4">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm">Online Sales</label>
                <span className="text-sm font-semibold">{formData.sales.distribution.online}%</span>
              </div>
              <input
                type="range"
                value={formData.sales.distribution.online}
                onChange={(e) => updateDistribution('online', parseInt(e.target.value))}
                className="w-full"
                min="0"
                max="100"
                step="5"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm">Box Office / Comp Reserve</label>
                <span className="text-sm font-semibold">{formData.sales.distribution.boxOffice}%</span>
              </div>
              <input
                type="range"
                value={formData.sales.distribution.boxOffice}
                onChange={(e) => updateDistribution('boxOffice', parseInt(e.target.value))}
                className="w-full"
                min="0"
                max="100"
                step="5"
              />
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-purple-600/20 rounded-lg">
            <p className="text-xs text-gray-300">
              Based on venue capacity, this allocates tickets between online sales and box office/comp tickets.
              Box office allocation can be used for complimentary tickets and offline sales.
            </p>
          </div>
        </div>
      </div>
      
      {/* Waitlist Settings */}
      <div>
        <label className="block text-sm font-medium mb-3">Waitlist Settings</label>
        <div className="bg-black/20 rounded-lg p-4 space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.sales.waitlist.enabled}
              onChange={(e) => updateWaitlist('enabled', e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <div>
              <span className="font-medium">Enable Waitlist</span>
              <p className="text-xs text-gray-400">
                Allow customers to join a waitlist when tickets are sold out
              </p>
            </div>
          </label>
          
          {formData.sales.waitlist.enabled && (
            <label className="flex items-center gap-3 ml-8">
              <input
                type="checkbox"
                checked={formData.sales.waitlist.autoRelease}
                onChange={(e) => updateWaitlist('autoRelease', e.target.checked)}
                className="w-5 h-5 rounded"
              />
              <div>
                <span className="font-medium">Auto-release Tickets</span>
                <p className="text-xs text-gray-400">
                  Automatically offer tickets to waitlisted customers when available
                </p>
              </div>
            </label>
          )}
        </div>
      </div>
      
      {/* Transfer Policy */}
      <div>
        <label className="block text-sm font-medium mb-3">Ticket Transfer Policy</label>
        <div className="bg-black/20 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => updateFormData('sales', { transferPolicy: 'allowed' })}
              className={`px-4 py-3 rounded-lg border text-center ${
                formData.sales.transferPolicy === 'allowed'
                  ? 'bg-purple-600 border-purple-600'
                  : 'bg-white/10 border-white/20'
              }`}
            >
              <p className="font-medium">Allowed</p>
              <p className="text-xs mt-1 opacity-80">Tickets can be transferred</p>
            </button>
            
            <button
              type="button"
              onClick={() => updateFormData('sales', { transferPolicy: 'restricted' })}
              className={`px-4 py-3 rounded-lg border text-center ${
                formData.sales.transferPolicy === 'restricted'
                  ? 'bg-purple-600 border-purple-600'
                  : 'bg-white/10 border-white/20'
              }`}
            >
              <p className="font-medium">Restricted</p>
              <p className="text-xs mt-1 opacity-80">Requires approval</p>
            </button>
            
            <button
              type="button"
              onClick={() => updateFormData('sales', { transferPolicy: 'prohibited' })}
              className={`px-4 py-3 rounded-lg border text-center ${
                formData.sales.transferPolicy === 'prohibited'
                  ? 'bg-purple-600 border-purple-600'
                  : 'bg-white/10 border-white/20'
              }`}
            >
              <p className="font-medium">Prohibited</p>
              <p className="text-xs mt-1 opacity-80">No transfers allowed</p>
            </button>
          </div>
        </div>
      </div>
      
      {/* Purchase Limits (from Step 1 but also shown here) */}
      <div>
        <label className="block text-sm font-medium mb-3">Purchase Limits</label>
        <div className="bg-black/20 rounded-lg p-4">
          <div>
            <label className="block text-xs mb-1">Max Tickets Per Customer</label>
            <input
              type="number"
              value={formData.basics.maxTicketsPerCustomer}
              onChange={(e) => updateFormData('basics', { 
                maxTicketsPerCustomer: parseInt(e.target.value) || 10 
              })}
              className="w-full px-3 py-2 bg-white/10 rounded"
              min="1"
              max="50"
            />
            <p className="text-xs text-gray-400 mt-1">
              Maximum number of tickets a single customer can purchase in one transaction
            </p>
          </div>
        </div>
      </div>
      
      {/* Sales Summary */}
      <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
        <h4 className="font-semibold mb-3">Sales Configuration Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Sales Period:</span>
            <span>
              {formData.sales.salesPeriod.startDate 
                ? new Date(formData.sales.salesPeriod.startDate).toLocaleDateString()
                : 'Not set'} 
              {' - '}
              {formData.sales.salesPeriod.endDate
                ? new Date(formData.sales.salesPeriod.endDate).toLocaleDateString()
                : 'Event date'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Online Allocation:</span>
            <span>{formData.sales.distribution.online}% of capacity</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Box Office Reserve:</span>
            <span>{formData.sales.distribution.boxOffice}% of capacity</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Transfer Policy:</span>
            <span className="capitalize">{formData.sales.transferPolicy}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Waitlist:</span>
            <span>{formData.sales.waitlist.enabled ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Max Per Customer:</span>
            <span>{formData.basics.maxTicketsPerCustomer} tickets</span>
          </div>
        </div>
      </div>
    </div>
  )
}
