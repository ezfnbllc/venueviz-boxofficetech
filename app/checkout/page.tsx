'use client'
import {useState} from 'react'
import {useRouter} from 'next/navigation'
import {useCart} from '@/lib/stores/cartStore'
import {db} from '@/lib/firebase'
import {collection, addDoc} from 'firebase/firestore'

export default function Checkout() {
  const router = useRouter()
  const {selectedSeats, calculateTotal, clearCart} = useCart()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cardNumber: '',
    expiry: '',
    cvv: ''
  })

  const total = calculateTotal()
  const fees = total * 0.1
  const finalTotal = total + fees

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create order in Firebase
      const orderData = {
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        seats: selectedSeats,
        total: finalTotal,
        status: 'confirmed',
        orderId: `ORD-${Date.now()}`,
        qrCode: `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      }

      const docRef = await addDoc(collection(db, 'orders'), orderData)
      
      // Clear cart and redirect to confirmation
      clearCart()
      router.push(`/confirmation?orderId=${docRef.id}`)
    } catch (error) {
      alert('Payment processing failed. Please try again.')
      setLoading(false)
    }
  }

  if (selectedSeats.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Your cart is empty</p>
          <button onClick={() => router.push('/')} className="px-6 py-2 bg-purple-600 rounded-lg">
            Browse Events
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Checkout</h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Payment Form */}
          <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <h2 className="text-2xl font-bold mb-6">Payment Details</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Phone</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Card Number</label>
                <input
                  type="text"
                  required
                  placeholder="4242 4242 4242 4242"
                  value={formData.cardNumber}
                  onChange={(e) => setFormData({...formData, cardNumber: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Expiry</label>
                  <input
                    type="text"
                    required
                    placeholder="MM/YY"
                    value={formData.expiry}
                    onChange={(e) => setFormData({...formData, expiry: e.target.value})}
                    className="w-full px-4 py-2 bg-white/10 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">CVV</label>
                  <input
                    type="text"
                    required
                    placeholder="123"
                    value={formData.cvv}
                    onChange={(e) => setFormData({...formData, cvv: e.target.value})}
                    className="w-full px-4 py-2 bg-white/10 rounded-lg"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold disabled:opacity-50"
              >
                {loading ? 'Processing...' : `Pay $${finalTotal.toFixed(2)}`}
              </button>
            </form>

            <p className="text-xs text-gray-400 mt-4 text-center">
              Your payment is secure and encrypted
            </p>
          </div>

          {/* Order Summary */}
          <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6 h-fit">
            <h2 className="text-2xl font-bold mb-6">Order Summary</h2>
            
            <div className="space-y-2 mb-6">
              {selectedSeats.map(seat => (
                <div key={seat.id} className="flex justify-between text-sm">
                  <span>{seat.section} Row {seat.row} Seat {seat.seat}</span>
                  <span>${seat.price}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-white/20 pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Fees</span>
                <span>${fees.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold pt-2 border-t border-white/20">
                <span>Total</span>
                <span>${finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
