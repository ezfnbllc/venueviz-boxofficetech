'use client'
import {useState, useEffect} from 'react'
import {useRouter, useSearchParams} from 'next/navigation'
import {db} from '@/lib/firebase'
import {doc, getDoc} from 'firebase/firestore'
import QRCode from 'react-qr-code'

export default function Confirmation() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderId) {
      loadOrder()
    }
  }, [orderId])

  const loadOrder = async () => {
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId!))
      if (orderDoc.exists()) {
        setOrder({id: orderDoc.id, ...orderDoc.data()})
      }
    } catch (e) {
      // Mock order for demo
      setOrder({
        id: orderId,
        orderId: `ORD-${Date.now()}`,
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        seats: [{section: 'Orchestra', row: 5, seat: 10, price: 150}],
        total: 165,
        qrCode: `QR-${Date.now()}`,
        createdAt: new Date().toISOString()
      })
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
          <p className="text-gray-400 mb-8">Your tickets have been sent to {order?.customerEmail}</p>

          <div className="bg-white p-6 rounded-lg mb-8">
            <QRCode value={order?.qrCode || 'DEMO-QR'} size={200} />
          </div>

          <div className="text-left space-y-4 mb-8">
            <div>
              <p className="text-sm text-gray-400">Order ID</p>
              <p className="font-bold">{order?.orderId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Customer</p>
              <p>{order?.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Seats</p>
              {order?.seats?.map((seat: any, i: number) => (
                <p key={i}>{seat.section} Row {seat.row} Seat {seat.seat}</p>
              ))}
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Paid</p>
              <p className="text-2xl font-bold">${order?.total?.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={() => window.print()} className="flex-1 py-3 bg-white/10 rounded-lg">
              Print Tickets
            </button>
            <button onClick={() => router.push('/')} className="flex-1 py-3 bg-purple-600 rounded-lg">
              Book More Events
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
