'use client'
import { useState } from 'react'
import { AdminService } from '@/lib/admin/adminService'

interface DeleteEventDialogProps {
  eventId: string
  eventName: string
  isOpen: boolean
  onClose: () => void
  onDeleted: () => void
}

export default function DeleteEventDialog({
  eventId,
  eventName,
  isOpen,
  onClose,
  onDeleted
}: DeleteEventDialogProps) {
  const [loading, setLoading] = useState(false)
  const [orderCheck, setOrderCheck] = useState<{ hasOrders: boolean; orderCount: number } | null>(null)
  const [step, setStep] = useState<'confirm' | 'checking' | 'result'>('confirm')
  const [deleteResult, setDeleteResult] = useState<{ type: 'hard' | 'soft'; orderCount?: number } | null>(null)

  if (!isOpen) return null

  const checkOrders = async () => {
    setStep('checking')
    setLoading(true)

    try {
      const result = await AdminService.checkEventOrders(eventId)
      setOrderCheck(result)
      setStep('result')
    } catch (error) {
      console.error('Error checking orders:', error)
      alert('Error checking event orders. Please try again.')
      setStep('confirm')
    }

    setLoading(false)
  }

  const confirmDelete = async () => {
    setLoading(true)

    try {
      const userId = 'current-user-id' // Get from auth context
      const result = await AdminService.deleteEvent(eventId, userId)
      setDeleteResult(result)

      // Notify parent component
      onDeleted()

      // Close dialog after short delay
      setTimeout(() => {
        onClose()
        setStep('confirm')
        setOrderCheck(null)
        setDeleteResult(null)
      }, 2000)

    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Error deleting event. Please try again.')
    }

    setLoading(false)
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
      setStep('confirm')
      setOrderCheck(null)
      setDeleteResult(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-200 dark:border-slate-700">
        {step === 'confirm' && (
          <>
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">Delete Event</h3>
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              Are you sure you want to delete "<span className="font-semibold">{eventName}</span>"?
            </p>
            <div className="bg-yellow-50 dark:bg-yellow-600/20 border border-yellow-200 dark:border-yellow-600/40 rounded-lg p-3 mb-4">
              <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                <strong>Note:</strong> If this event has ticket orders, it will be soft-deleted (hidden but data preserved).
                If no orders exist, it will be permanently deleted.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-white rounded hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={checkOrders}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                disabled={loading}
              >
                Delete Event
              </button>
            </div>
          </>
        )}

        {step === 'checking' && (
          <>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Checking Event Status</h3>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600"></div>
              <span className="ml-3 text-slate-600 dark:text-slate-300">Checking for existing orders...</span>
            </div>
          </>
        )}

        {step === 'result' && orderCheck && (
          <>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Confirm Deletion</h3>
            {orderCheck.hasOrders ? (
              <div className="bg-orange-50 dark:bg-orange-600/20 border border-orange-200 dark:border-orange-600/40 rounded-lg p-4 mb-4">
                <p className="text-orange-800 dark:text-orange-300 mb-2">
                  <strong>Orders Found:</strong> This event has {orderCheck.orderCount} order(s).
                </p>
                <p className="text-orange-700 dark:text-orange-300 text-sm">
                  The event will be <strong>soft-deleted</strong> (hidden from public view but data preserved for order history).
                </p>
              </div>
            ) : (
              <div className="bg-red-50 dark:bg-red-600/20 border border-red-200 dark:border-red-600/40 rounded-lg p-4 mb-4">
                <p className="text-red-800 dark:text-red-300 mb-2">
                  <strong>No Orders Found:</strong> This event has no ticket orders.
                </p>
                <p className="text-red-700 dark:text-red-300 text-sm">
                  The event will be <strong>permanently deleted</strong> from the database.
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-white rounded hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </>
        )}

        {deleteResult && (
          <div className="text-center">
            <div className="text-green-600 dark:text-green-400 text-xl mb-2">✓</div>
            <p className="text-green-600 dark:text-green-400 font-semibold">
              Event {deleteResult.type === 'hard' ? 'permanently deleted' : 'soft deleted'}
            </p>
            {deleteResult.type === 'soft' && (
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Data preserved due to {deleteResult.orderCount} existing orders
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
