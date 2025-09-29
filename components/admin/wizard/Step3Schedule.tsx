'use client'
import { useState } from 'react'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'

export default function Step3Schedule() {
  const { formData, updateFormData } = useEventWizardStore()
  
  const addPerformance = () => {
    updateFormData('schedule', {
      performances: [
        ...formData.schedule.performances,
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
    const performances = [...formData.schedule.performances]
    performances[index] = { ...performances[index], [field]: value }
    updateFormData('schedule', { performances })
  }
  
  const removePerformance = (index: number) => {
    updateFormData('schedule', {
      performances: formData.schedule.performances.filter((_, i) => i !== index)
    })
  }
  
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Timezone</label>
        <select
          value={formData.schedule.timezone}
          onChange={(e) => updateFormData('schedule', { timezone: e.target.value })}
          className="w-full px-4 py-2 bg-white/10 rounded-lg"
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
            className="px-3 py-1 bg-purple-600 rounded text-sm"
          >
            + Add Date
          </button>
        </div>
        
        <div className="space-y-4">
          {formData.schedule.performances.map((perf, index) => (
            <div key={index} className="bg-black/20 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold">
                  Performance {index + 1}
                  {perf.pricingModifier !== 0 && (
                    <span className="ml-2 text-sm text-purple-400">
                      ({perf.pricingModifier > 0 ? '+' : ''}{perf.pricingModifier}% pricing)
                    </span>
                  )}
                </h4>
                {formData.schedule.performances.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePerformance(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs mb-1">Date</label>
                  <input
                    type="date"
                    value={perf.date}
                    onChange={(e) => updatePerformance(index, 'date', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-xs mb-1">Doors Open</label>
                  <input
                    type="time"
                    value={perf.doorsOpen}
                    onChange={(e) => updatePerformance(index, 'doorsOpen', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-xs mb-1">Start Time</label>
                  <input
                    type="time"
                    value={perf.startTime}
                    onChange={(e) => updatePerformance(index, 'startTime', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-xs mb-1">End Time</label>
                  <input
                    type="time"
                    value={perf.endTime}
                    onChange={(e) => updatePerformance(index, 'endTime', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-xs mb-1">Price Modifier (%)</label>
                  <input
                    type="number"
                    value={perf.pricingModifier}
                    onChange={(e) => updatePerformance(index, 'pricingModifier', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white/10 rounded"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Adjust pricing for this date (e.g., -10 for matinee)
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs mb-1">Capacity Override</label>
                  <input
                    type="number"
                    value={perf.capacity}
                    onChange={(e) => updatePerformance(index, 'capacity', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white/10 rounded"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-400 mt-1">
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
