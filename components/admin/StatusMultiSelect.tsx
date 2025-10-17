'use client'

import React, { useState, useRef, useEffect } from 'react'

interface StatusMultiSelectProps {
  selectedStatuses: string[]
  onChange: (statuses: string[]) => void
}

const statusOptions = [
  { value: 'active', label: 'Active/Published', color: 'text-green-400' },
  { value: 'draft', label: 'Draft', color: 'text-gray-400' },
  { value: 'cancelled', label: 'Cancelled', color: 'text-red-400' },
  { value: 'completed', label: 'Completed', color: 'text-blue-400' },
  { value: 'postponed', label: 'Postponed', color: 'text-yellow-400' }
]

export default function StatusMultiSelect({ selectedStatuses, onChange }: StatusMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleStatus = (status: string) => {
    if (selectedStatuses.includes(status)) {
      onChange(selectedStatuses.filter(s => s !== status))
    } else {
      onChange([...selectedStatuses, status])
    }
  }

  const getDisplayText = () => {
    if (selectedStatuses.length === 0) return 'Select Status'
    if (selectedStatuses.length === 1) {
      const status = statusOptions.find(s => s.value === selectedStatuses[0])
      return status?.label || selectedStatuses[0]
    }
    return `${selectedStatuses.length} statuses selected`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2"
      >
        <span>{getDisplayText()}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="p-2 space-y-1">
            {statusOptions.map(status => (
              <label 
                key={status.value}
                className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(status.value)}
                  onChange={() => toggleStatus(status.value)}
                  className="w-4 h-4 text-purple-600 bg-white/10 border-gray-600 rounded focus:ring-purple-500"
                />
                <span className={`flex-1 ${status.color}`}>
                  {status.label}
                </span>
              </label>
            ))}
          </div>
          
          <div className="border-t border-gray-700 p-2 flex gap-2">
            <button
              onClick={() => onChange(statusOptions.map(s => s.value))}
              className="flex-1 px-3 py-1 text-xs bg-white/5 hover:bg-white/10 rounded"
            >
              Select All
            </button>
            <button
              onClick={() => onChange(['active'])}
              className="flex-1 px-3 py-1 text-xs bg-white/5 hover:bg-white/10 rounded"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
