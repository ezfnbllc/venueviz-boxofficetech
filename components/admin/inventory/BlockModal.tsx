'use client'

import { useState } from 'react'

interface BlockModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'ga' | 'reserved'
  tierName?: string
  availableQuantity?: number
  selectedSeats?: Array<{
    seatId: string
    sectionId: string
    sectionName: string
    row: string
    seatNumber: string
  }>
  onSubmit: (quantity: number | undefined, reason: string, notes?: string) => Promise<void>
}

export default function BlockModal({
  isOpen,
  onClose,
  type,
  tierName,
  availableQuantity,
  selectedSeats,
  onSubmit,
}: BlockModalProps) {
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reason.trim()) {
      alert('Please provide a reason')
      return
    }

    if (type === 'ga') {
      const qty = parseInt(quantity, 10)
      if (isNaN(qty) || qty <= 0) {
        alert('Please enter a valid quantity')
        return
      }
      if (availableQuantity !== undefined && qty > availableQuantity) {
        alert(`Cannot block more than ${availableQuantity} tickets`)
        return
      }
    }

    setSubmitting(true)
    try {
      const qty = type === 'ga' ? parseInt(quantity, 10) : undefined
      await onSubmit(qty, reason, notes || undefined)
    } finally {
      setSubmitting(false)
    }
  }

  const blockReasons = [
    'VIP Hold',
    'Promoter Reserve',
    'Production Hold',
    'Media/Press',
    'Sponsor Allocation',
    'Artist/Performer',
    'Venue Hold',
    'Comp Tickets',
    'Other',
  ]

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
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Block {type === 'ga' ? 'Tickets' : 'Seats'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {type === 'ga' ? (
                  <>
                    {tierName} • {availableQuantity?.toLocaleString()} available
                  </>
                ) : (
                  <>
                    {selectedSeats?.length} seat{selectedSeats?.length !== 1 ? 's' : ''} selected
                  </>
                )}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            <div className="space-y-4">
              {type === 'ga' && (
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                    Quantity to block
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    min="1"
                    max={availableQuantity}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter quantity"
                    required
                  />
                </div>
              )}

              {type === 'reserved' && selectedSeats && selectedSeats.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seats to block
                  </label>
                  <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-md p-3 border border-gray-200">
                    <div className="flex flex-wrap gap-2">
                      {selectedSeats.map((seat) => (
                        <span
                          key={seat.seatId}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
                        >
                          {seat.sectionName} {seat.row}-{seat.seatNumber}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                  Block Reason
                </label>
                <select
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                >
                  <option value="">Select a reason</option>
                  {blockReasons.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
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
                  placeholder="Additional notes about this hold..."
                />
              </div>
            </div>

            <div className="mt-6 sm:flex sm:flex-row-reverse sm:gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-yellow-600 text-base font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {submitting ? 'Blocking...' : `Block ${type === 'ga' ? 'Tickets' : 'Seats'}`}
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
