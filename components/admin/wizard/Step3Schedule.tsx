'use client'
import { useState, useEffect, useRef } from 'react'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'

// Helper to calculate time offset
function addHoursToTime(time: string, hours: number): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  let newHour = h + hours
  if (newHour >= 24) newHour = newHour - 24
  if (newHour < 0) newHour = newHour + 24
  return `${newHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export default function Step3Schedule() {
  const { formData, updateFormData } = useEventWizardStore()
  const initializedRef = useRef(false)

  // Auto-populate schedule from scraped data (from basics)
  useEffect(() => {
    if (initializedRef.current) return

    const scrapedDate = (formData.basics as any)?.scrapedDate || (formData.basics as any)?.date
    const scrapedTime = (formData.basics as any)?.scrapedTime || (formData.basics as any)?.time

    // Check if we have scraped data and no performances yet
    if ((scrapedDate || scrapedTime) && (!formData.schedule?.performances?.length || formData.schedule.performances.length === 0)) {
      initializedRef.current = true

      // Calculate default times
      const startTime = scrapedTime || '20:00'  // Default 8 PM
      const doorsOpen = addHoursToTime(startTime, -2)  // 2 hours before
      const endTime = addHoursToTime(startTime, 3)     // 3 hours after

      updateFormData('schedule', {
        performances: [{
          date: scrapedDate || '',
          doorsOpen,
          startTime,
          endTime,
          pricingModifier: 0,
          capacity: 0
        }]
      })
    } else if (!formData.schedule?.performances?.length) {
      // Create empty first performance if none exists
      initializedRef.current = true
      updateFormData('schedule', {
        performances: [{
          date: '',
          doorsOpen: '',
          startTime: '',
          endTime: '',
          pricingModifier: 0,
          capacity: 0
        }]
      })
    }
  }, [formData.basics, formData.schedule?.performances])

  const addPerformance = () => {
    updateFormData('schedule', {
      performances: [
        ...(formData.schedule?.performances || []),
        {
          date: '',
          doorsOpen: '',
          startTime: '',
          endTime: '',
          pricingModifier: 0,
          capacity: 0
        }
      ]
    })
  }

  const updatePerformance = (index: number, field: string, value: any) => {
    const performances = [...(formData.schedule?.performances || [])]
    performances[index] = { ...performances[index], [field]: value }

    // Auto-calculate doors open and end time when start time changes
    if (field === 'startTime' && value) {
      const doorsOpen = performances[index].doorsOpen
      const endTime = performances[index].endTime

      // Only auto-set if not already set
      if (!doorsOpen) {
        performances[index].doorsOpen = addHoursToTime(value, -2)
      }
      if (!endTime) {
        performances[index].endTime = addHoursToTime(value, 3)
      }
    }

    updateFormData('schedule', { performances })
  }

  const removePerformance = (index: number) => {
    updateFormData('schedule', {
      performances: formData.schedule?.performances?.filter((_, i) => i !== index)
    })
  }

  // Auto-set default times button
  const autoSetTimes = (index: number) => {
    const performances = [...(formData.schedule?.performances || [])]
    const startTime = performances[index].startTime || '20:00'

    performances[index] = {
      ...performances[index],
      startTime,
      doorsOpen: addHoursToTime(startTime, -2),
      endTime: addHoursToTime(startTime, 3)
    }

    updateFormData('schedule', { performances })
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Timezone</label>
        <select
          value={formData.schedule?.timezone || 'America/Chicago'}
          onChange={(e) => updateFormData('schedule', { timezone: e.target.value })}
          className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg"
        >
          <option value="America/Chicago">Central Time (Chicago)</option>
          <option value="America/New_York">Eastern Time (New York)</option>
          <option value="America/Los_Angeles">Pacific Time (Los Angeles)</option>
          <option value="America/Denver">Mountain Time (Denver)</option>
        </select>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="text-sm font-medium">Performance Dates</label>
          <button
            type="button"
            onClick={addPerformance}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-purple-700"
          >
            + Add Date
          </button>
        </div>

        <div className="space-y-4">
          {formData.schedule?.performances?.map((perf, index) => (
            <div key={index} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold">
                  Performance {index + 1}
                  {perf.pricingModifier !== 0 && (
                    <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                      ({perf.pricingModifier > 0 ? '+' : ''}{perf.pricingModifier}% pricing)
                    </span>
                  )}
                </h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => autoSetTimes(index)}
                    className="text-xs px-2 py-1 bg-blue-600 text-white/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-600 text-white/50"
                  >
                    Auto-set times
                  </button>
                  {(formData.schedule?.performances?.length || 0) > 1 && (
                    <button
                      type="button"
                      onClick={() => removePerformance(index)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs mb-1">Date</label>
                  <input
                    type="date"
                    value={perf.date}
                    onChange={(e) => updatePerformance(index, 'date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 bg-slate-100 dark:bg-slate-700/50 border rounded ${
                      perf.date && new Date(perf.date) < new Date(new Date().toISOString().split('T')[0])
                        ? 'border-red-400 dark:border-red-500'
                        : 'border-slate-200 dark:border-slate-600'
                    } text-slate-900 dark:text-white`}
                  />
                  {perf.date && new Date(perf.date) < new Date(new Date().toISOString().split('T')[0]) && (
                    <p className="text-xs text-red-500 mt-1">Warning: Date is in the past</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs mb-1">Start Time</label>
                  <input
                    type="time"
                    value={perf.startTime}
                    onChange={(e) => updatePerformance(index, 'startTime', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded"
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1">
                    Doors Open
                    <span className="text-slate-500 dark:text-slate-400 ml-1">(2hrs before default)</span>
                  </label>
                  <input
                    type="time"
                    value={perf.doorsOpen}
                    onChange={(e) => updatePerformance(index, 'doorsOpen', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded"
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1">
                    End Time
                    <span className="text-slate-500 dark:text-slate-400 ml-1">(3hrs after default)</span>
                  </label>
                  <input
                    type="time"
                    value={perf.endTime}
                    onChange={(e) => updatePerformance(index, 'endTime', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded"
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1">Price Modifier (%)</label>
                  <input
                    type="number"
                    value={perf.pricingModifier}
                    onChange={(e) => updatePerformance(index, 'pricingModifier', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded"
                    placeholder="0"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Adjust pricing for this date (e.g., -10 for matinee)
                  </p>
                </div>

                <div>
                  <label className="block text-xs mb-1">Capacity Override</label>
                  <input
                    type="number"
                    value={perf.capacity}
                    onChange={(e) => updatePerformance(index, 'capacity', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded"
                    placeholder="0"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Leave 0 to use venue capacity
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
