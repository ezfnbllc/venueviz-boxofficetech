'use client'
import {useState, useEffect} from 'react'
import {useRouter, useSearchParams} from 'next/navigation'
import {useCart} from '@/lib/stores/cartStore'

export default function BoxOffice() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('event')
  const {selectedSeats, selectSeat, deselectSeat, calculateTotal} = useCart()
  const [loading, setLoading] = useState(false)

  const sections = [
    {name: 'Orchestra', rows: 10, seatsPerRow: 20, price: 150},
    {name: 'Mezzanine', rows: 8, seatsPerRow: 18, price: 100},
    {name: 'Balcony', rows: 6, seatsPerRow: 16, price: 75}
  ]

  const generateSeats = (section: any) => {
    const seats = []
    for (let r = 1; r <= section.rows; r++) {
      for (let s = 1; s <= section.seatsPerRow; s++) {
        seats.push({
          id: `${section.name}-R${r}S${s}`,
          section: section.name,
          row: r,
          seat: s,
          price: section.price,
          status: Math.random() > 0.7 ? 'sold' : 'available'
        })
      }
    }
    return seats
  }

  const handleSeatClick = (seat: any) => {
    if (seat.status === 'sold') return
    const isSelected = selectedSeats.find(s => s.id === seat.id)
    if (isSelected) {
      deselectSeat(seat.id)
    } else {
      selectSeat(seat)
    }
  }

  const proceedToCheckout = () => {
    if (selectedSeats.length === 0) return
    router.push('/checkout')
  }

  const total = calculateTotal()
  const fees = total * 0.1

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <button 
          onClick={() => router.push('/')}
          className="mb-4 text-purple-400 hover:text-purple-300"
        >
          ← Back to Events
        </button>

        <h1 className="text-4xl font-bold mb-8 text-center">Select Your Seats</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Seat Map */}
          <div className="lg:col-span-2 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-center py-3 rounded-lg mb-8 font-bold">
              STAGE
            </div>

            {sections.map(section => (
              <div key={section.name} className="mb-8">
                <h3 className="text-center mb-4">{section.name} - ${section.price}</h3>
                <div className="flex flex-wrap justify-center gap-1">
                  {generateSeats(section).map(seat => (
                    <button
                      key={seat.id}
                      onClick={() => handleSeatClick(seat)}
                      disabled={seat.status === 'sold'}
                      className={`w-5 h-5 rounded text-xs transition-all ${
                        seat.status === 'sold' ? 'bg-gray-600 cursor-not-allowed' :
                        selectedSeats.find(s => s.id === seat.id) ? 'bg-purple-600 scale-110' :
                        'bg-green-500 hover:bg-green-400'
                      }`}
                      title={`${section.name} Row ${seat.row} Seat ${seat.seat}`}
                    />
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-center gap-6 mt-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-600 rounded" />
                <span>Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-600 rounded" />
                <span>Sold</span>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6 h-fit">
            <h2 className="text-2xl font-bold mb-4">Order Summary</h2>
            
            <div className="mb-6">
              <p className="text-gray-400">Selected Seats ({selectedSeats.length})</p>
              {selectedSeats.length === 0 ? (
                <p className="text-sm text-gray-500 mt-2">No seats selected</p>
              ) : (
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {selectedSeats.map(seat => (
                    <div key={seat.id} className="flex justify-between text-sm">
                      <span>{seat.section} R{seat.row}S{seat.seat}</span>
                      <span>${seat.price}</span>
                    </div>
                  ))}
                </div>
              )}
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
                <span>${(total + fees).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={proceedToCheckout}
              disabled={selectedSeats.length === 0}
              className="w-full mt-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold disabled:opacity-50 hover:opacity-90 transition"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
