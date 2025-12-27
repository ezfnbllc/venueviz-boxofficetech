'use client'

/**
 * Ticket Card Component
 *
 * Displays a single ticket with its QR code.
 * Used on order confirmation and order detail pages.
 */

import TicketQRCode from './TicketQRCode'

interface TicketData {
  id: string
  tierName?: string
  ticketType?: string
  section?: string | null
  row?: number | null
  seat?: number | null
  eventName?: string
  status?: string
}

interface TicketCardProps {
  ticket: TicketData
  index: number
  showEventName?: boolean
}

export default function TicketCard({ ticket, index, showEventName = false }: TicketCardProps) {
  const ticketLabel = ticket.tierName || ticket.ticketType || 'General Admission'
  const locationParts = []
  if (ticket.section) locationParts.push(`Section ${ticket.section}`)
  if (ticket.row) locationParts.push(`Row ${ticket.row}`)
  if (ticket.seat) locationParts.push(`Seat ${ticket.seat}`)
  const locationString = locationParts.length > 0 ? locationParts.join(' • ') : null

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between gap-4 bg-white dark:bg-gray-800">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white">{ticketLabel}</p>
        {showEventName && ticket.eventName && (
          <p className="text-sm text-gray-600 dark:text-gray-300">{ticket.eventName}</p>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-300">Ticket #{index + 1}</p>
        {locationString && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{locationString}</p>
        )}
        <p className="text-xs text-gray-400 mt-1 truncate">{ticket.id}</p>
        {ticket.status && ticket.status !== 'active' && (
          <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded ${
            ticket.status === 'used' ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' :
            ticket.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
            'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}>
            {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
          </span>
        )}
      </div>
      <div className="flex-shrink-0 text-center">
        <TicketQRCode ticketId={ticket.id} size={80} />
        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">Scan at entry</span>
      </div>
    </div>
  )
}
