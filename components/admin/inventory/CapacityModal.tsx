'use client'

import { useState } from 'react'

interface CapacityModalProps {
  isOpen: boolean
  onClose: () => void
  tierName: string
  currentCapacity: number
  mode: 'add' | 'remove'
  onSubmit: (change: number, reason: string, notes?: string) => Promise<void>
}

export default function CapacityModal({
  isOpen,
  onClose,
  tierName,
  currentCapacity,
  mode,
  onSubmit,
}: CapacityModalProps) {
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const qty = parseInt(quantity, 10)
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid quantity')
      return
    }

    if (!reason.trim()) {
      alert('Please provide a reason')
      return
    }

    setSubmitting(true)
    try {
      const change = mode === 'add' ? qty : -qty
      await onSubmit(change, reason, notes || undefined)
    } finally {
      setSubmitting(false)
    }
  }

  const newCapacity = currentCapacity + (mode === 'add' ? parseInt(quantity) || 0 : -(parseInt(quantity) || 0))

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              onClick={onClose}
              className="bg-white rounded-md text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
              mode === 'add' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {mode === 'add' ? (
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              ) : (
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              )}
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {mode === 'add' ? 'Add' : 'Remove'} Capacity
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {tierName} • Current capacity: {currentCapacity.toLocaleString()}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                  Quantity to {mode}
                </label>
                <input
                  type="number"
                  id="quantity"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter quantity"
                  required
                />
                {quantity && !isNaN(parseInt(quantity)) && (
                  <p className="mt-1 text-sm text-gray-500">
                    New capacity will be: {newCapacity.toLocaleString()}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                  Reason
                </label>
                <select
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                >
                  <option value="">Select a reason</option>
                  {mode === 'add' ? (
                    <>
                      <option value="Venue expansion">Venue expansion</option>
                      <option value="Additional tickets released">Additional tickets released</option>
                      <option value="Section opened">Section opened</option>
                      <option value="Demand increase">Demand increase</option>
                      <option value="Correction">Correction</option>
                      <option value="Other">Other</option>
                    </>
                  ) : (
                    <>
                      <option value="Venue restriction">Venue restriction</option>
                      <option value="Production requirements">Production requirements</option>
                      <option value="Safety concerns">Safety concerns</option>
                      <option value="Section closed">Section closed</option>
                      <option value="Correction">Correction</option>
                      <option value="Other">Other</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="mt-6 sm:flex sm:flex-row-reverse sm:gap-3">
              <button
                type="submit"
                disabled={submitting}
                className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:w-auto sm:text-sm disabled:opacity-50 ${
                  mode === 'add'
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                } focus:outline-none focus:ring-2 focus:ring-offset-2`}
              >
                {submitting ? 'Saving...' : `${mode === 'add' ? 'Add' : 'Remove'} Capacity`}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
