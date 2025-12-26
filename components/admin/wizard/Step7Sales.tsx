'use client'
import { useEffect, useRef, useMemo } from 'react'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'

// Get current date/time in a specific timezone
function getCurrentTimeInTimezone(timezone: string): string {
  try {
    const now = new Date()
    // Format in the target timezone
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }
    const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(now)
    const values: Record<string, string> = {}
    parts.forEach(p => { values[p.type] = p.value })

    // Format: YYYY-MM-DDTHH:mm
    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`
  } catch (e) {
    // Fallback to local time if timezone is invalid
    return new Date().toISOString().slice(0, 16)
  }
}

export default function Step7Sales() {
  const { formData, updateFormData } = useEventWizardStore()
  const initializedRef = useRef(false)

  // Get the event timezone from Step 3
  const eventTimezone = useMemo(() =>
    formData.schedule?.timezone || 'America/Chicago',
    [formData.schedule?.timezone]
  )

  // Auto-set default sales dates
  useEffect(() => {
    if (initializedRef.current) return
    if (formData.sales?.salesStartDate && formData.sales?.salesEndDate) return

    initializedRef.current = true

    // Get current date/time in the event's timezone for sales start
    const salesStartDate = getCurrentTimeInTimezone(eventTimezone)

    // Get event date/time for sales end
    let salesEndDate = ''
    const firstPerformance = formData.schedule?.performances?.[0]
    if (firstPerformance?.date) {
      const eventDate = firstPerformance.date
      const eventTime = firstPerformance.startTime || '19:00'
      salesEndDate = `${eventDate}T${eventTime}`
    }

    updateFormData('sales', {
      ...formData.sales,
      salesStartDate: formData.sales?.salesStartDate || salesStartDate,
      salesEndDate: formData.sales?.salesEndDate || salesEndDate
    })
  }, [formData.schedule?.performances, formData.sales, eventTimezone])

  const updateSalesField = (field: string, value: any) => {
    updateFormData('sales', {
      ...formData.sales,
      [field]: value
    })
  }

  // Auto-set sales end to event date button
  const autoSetSalesEnd = () => {
    const firstPerformance = formData.schedule?.performances?.[0]
    if (firstPerformance?.date) {
      const eventDate = firstPerformance.date
      const eventTime = firstPerformance.startTime || '19:00'
      updateSalesField('salesEndDate', `${eventDate}T${eventTime}`)
    }
  }

  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Sales Configuration</h3>
      
      {/* Sales Period */}
      <div className="mb-6">
        <h4 className="font-semibold mb-4">Sales Period</h4>
        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-2">
              Sales Start Date
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                ({eventTimezone.split('/')[1]?.replace('_', ' ') || eventTimezone})
              </span>
            </label>
            <input
              type="datetime-local"
              value={formData.sales?.salesStartDate || ''}
              onChange={(e) => updateSalesField('salesStartDate', e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg focus:bg-white/20 outline-none"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">
                Sales End Date
              </label>
              <button
                type="button"
                onClick={autoSetSalesEnd}
                className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-600/30 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-600/50"
              >
                Use event start
              </button>
            </div>
            <input
              type="datetime-local"
              value={formData.sales?.salesEndDate || ''}
              onChange={(e) => updateSalesField('salesEndDate', e.target.value)}
              min={formData.sales?.salesStartDate || new Date().toISOString().slice(0, 16)}
              className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border rounded-lg focus:bg-white/20 outline-none text-slate-900 dark:text-white ${
                formData.sales?.salesEndDate && formData.sales?.salesStartDate &&
                new Date(formData.sales.salesEndDate) <= new Date(formData.sales.salesStartDate)
                  ? 'border-red-400 dark:border-red-500'
                  : 'border-slate-200 dark:border-slate-600'
              }`}
            />
            {formData.sales?.salesEndDate && formData.sales?.salesStartDate &&
             new Date(formData.sales.salesEndDate) <= new Date(formData.sales.salesStartDate) && (
              <p className="text-xs text-red-500 mt-1">Sales end must be after sales start</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Purchase Limits */}
      <div className="mb-6">
        <h4 className="font-semibold mb-4">Purchase Limits</h4>
        <div className="p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Maximum Tickets Per Order
            </label>
            <input
              type="number"
              value={formData.sales?.maxTicketsPerOrder || 10}
              onChange={(e) => updateSalesField('maxTicketsPerOrder', parseInt(e.target.value) || 10)}
              className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg focus:bg-white/20 outline-none"
              min="1"
              max="50"
            />
          </div>
        </div>
      </div>
      
      {/* Delivery Options */}
      <div className="mb-6">
        <h4 className="font-semibold mb-4">Ticket Delivery</h4>
        <div className="space-y-3 p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.sales?.allowWillCall || false}
              onChange={(e) => updateSalesField('allowWillCall', e.target.checked)}
              className="w-5 h-5"
            />
            <span>Allow Will Call (Pick up at venue)</span>
          </label>
          
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.sales?.allowMobileTickets !== false}
              onChange={(e) => updateSalesField('allowMobileTickets', e.target.checked)}
              className="w-5 h-5"
            />
            <span>Mobile Tickets (Default)</span>
          </label>
          
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.sales?.allowPrintAtHome || false}
              onChange={(e) => updateSalesField('allowPrintAtHome', e.target.checked)}
              className="w-5 h-5"
            />
            <span>Print at Home</span>
          </label>
        </div>
      </div>
      
      {/* Refund Policy */}
      <div className="mb-6">
        <h4 className="font-semibold mb-4">Refund Policy</h4>
        <div className="p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          <select
            value={formData.sales?.refundPolicy || 'no-refunds'}
            onChange={(e) => updateSalesField('refundPolicy', e.target.value)}
            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg focus:bg-white/20 outline-none"
          >
            <option value="no-refunds">No Refunds</option>
            <option value="24-hours">24 Hours Before Event</option>
            <option value="48-hours">48 Hours Before Event</option>
            <option value="7-days">7 Days Before Event</option>
            <option value="anytime">Anytime Before Event</option>
            <option value="custom">Custom Policy</option>
          </select>
          
          {formData.sales?.refundPolicy === 'custom' && (
            <div className="mt-3">
              <label className="block text-sm font-medium mb-2">
                Custom Refund Policy
              </label>
              <textarea
                value={formData.sales?.customRefundPolicy || ''}
                onChange={(e) => updateSalesField('customRefundPolicy', e.target.value)}
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg focus:bg-white/20 outline-none"
                rows={3}
                placeholder="Describe your custom refund policy..."
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Additional Settings */}
      <div className="mb-6">
        <h4 className="font-semibold mb-4">Additional Settings</h4>
        <div className="space-y-3 p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.sales?.requireAccountCreation || false}
              onChange={(e) => updateSalesField('requireAccountCreation', e.target.checked)}
              className="w-5 h-5"
            />
            <span>Require account creation for purchase</span>
          </label>
          
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.sales?.enableWaitlist || false}
              onChange={(e) => updateSalesField('enableWaitlist', e.target.checked)}
              className="w-5 h-5"
            />
            <span>Enable waitlist when sold out</span>
          </label>
          
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.sales?.showRemainingTickets || true}
              onChange={(e) => updateSalesField('showRemainingTickets', e.target.checked)}
              className="w-5 h-5"
            />
            <span>Show remaining ticket count to customers</span>
          </label>
        </div>
      </div>
    </div>
  )
}
