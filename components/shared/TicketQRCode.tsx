'use client'

/**
 * Ticket QR Code Component
 *
 * Displays a QR code for a ticket that can be scanned for check-in.
 * The QR code encodes the ticket ID which can be validated against the database.
 */

import QRCode from 'react-qr-code'

interface TicketQRCodeProps {
  ticketId: string
  size?: number
  className?: string
}

export default function TicketQRCode({ ticketId, size = 128, className = '' }: TicketQRCodeProps) {
  return (
    <div className={`bg-white p-2 rounded ${className}`}>
      <QRCode
        value={ticketId}
        size={size}
        level="M"
        bgColor="#FFFFFF"
        fgColor="#000000"
      />
    </div>
  )
}
