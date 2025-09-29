#!/bin/bash

# Fix Step3Schedule
echo "Fixing Step3Schedule..."
cat > components/admin/wizard/Step3Schedule_safe.tsx << 'EOF'
'use client'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'

export default function Step3Schedule() {
  const { formData, updateFormData } = useEventWizardStore()
  
  // Ensure performances array exists
  const performances = formData.schedule?.performances || []
  
  const addPerformance = () => {
    updateFormData('schedule', {
      performances: [
        ...performances,
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
    const updatedPerformances = [...performances]
    if (updatedPerformances[index]) {
      updatedPerformances[index] = { ...updatedPerformances[index], [field]: value }
      updateFormData('schedule', { performances: updatedPerformances })
    }
  }
  
  const removePerformance = (index: number) => {
    updateFormData('schedule', {
      performances: performances.filter((_, i) => i !== index)
    })
  }
  
  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Schedule & Performances</h3>
      
      {performances.map((performance, index) => (
        <div key={index} className="mb-6 p-4 bg-black/20 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Performance Date *
              </label>
              <input
                type="date"
                value={performance.date || ''}
                onChange={(e) => updatePerformance(index, 'date', e.target.value)}
                className="w-full px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Doors Open
              </label>
              <input
                type="time"
                value={performance.doorsOpen || ''}
                onChange={(e) => updatePerformance(index, 'doorsOpen', e.target.value)}
                className="w-full px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Start Time *
              </label>
              <input
                type="time"
                value={performance.startTime || ''}
                onChange={(e) => updatePerformance(index, 'startTime', e.target.value)}
                className="w-full px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                End Time
              </label>
              <input
                type="time"
                value={performance.endTime || ''}
                onChange={(e) => updatePerformance(index, 'endTime', e.target.value)}
                className="w-full px-4 py-2 bg-white/10 rounded-lg focus:bg-white/20 outline-none"
              />
            </div>
          </div>
          
          {performances.length > 1 && (
            <button
              type="button"
              onClick={() => removePerformance(index)}
              className="mt-4 px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition-colors"
            >
              Remove Performance
            </button>
          )}
        </div>
      ))}
      
      <button
        type="button"
        onClick={addPerformance}
        className="px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
      >
        + Add Performance
      </button>
    </div>
  )
}
EOF

echo "Step3Schedule fixed."
