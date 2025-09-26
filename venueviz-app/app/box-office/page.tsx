'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function BoxOffice() {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  
  const generateSeats = (section: string, rows: number, seatsPerRow: number, price: number) => {
    const seats = []
    for (let r = 1; r <= rows; r++) {
      for (let s = 1; s <= seatsPerRow; s++) {
        seats.push({
          id: `${section}-R${r}S${s}`,
          section,
          row: r,
          seat: s,
          price,
          status: Math.random() > 0.7 ? 'sold' : 'available'
        })
      }
    }
    return seats
  }

  const orchestraSeats = generateSeats('Orchestra', 10, 20, 150)
  const mezzanineSeats = generateSeats('Mezzanine', 8, 18, 100)
  const balconySeats = generateSeats('Balcony', 6, 16, 75)

  const handleSeatClick = (seatId: string, status: string) => {
    if (status === 'sold') return
    
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter(id => id !== seatId))
    } else {
      setSelectedSeats([...selectedSeats, seatId])
    }
  }

  const calculateTotal = () => {
    let total = 0
    selectedSeats.forEach(seatId => {
      const [section] = seatId.split('-')
      if (section === 'Orchestra') total += 150
      else if (section === 'Mezzanine') total += 100
      else if (section === 'Balcony') total += 75
    })
    return total
  }

  return (
    <div className="min-h-screen p-8">
      <Link href="/" className="text-purple-400 hover:text-purple-300 mb-8 inline-block">
        ← Back to Home
      </Link>
      
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Select Your Seats</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Seat Map */}
          <div className="lg:col-span-2 glass p-6 rounded-xl">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center py-3 rounded-lg mb-8 font-semibold">
              STAGE
            </div>

            {/* Orchestra */}
            <div className="mb-8">
              <h3 className="text-center mb-4 font-semibold">Orchestra - $150</h3>
              <div className="grid grid-cols-20 gap-1 max-w-2xl mx-auto">
                {orchestraSeats.map(seat => (
                  <button
                    key={seat.id}
                    onClick={() => handleSeatClick(seat.id, seat.status)}
                    disabled={seat.status === 'sold'}
                    className={`w-6 h-6 rounded text-xs ${
                      seat.status === 'sold' ? 'bg-gray-600 cursor-not-allowed' :
                      selectedSeats.includes(seat.id) ? 'bg-purple-600' :
                      'bg-blue-500 hover:bg-blue-400'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Mezzanine */}
            <div className="mb-8">
              <h3 className="text-center mb-4 font-semibold">Mezzanine - $100</h3>
              <div className="grid grid-cols-18 gap-1 max-w-xl mx-auto">
                {mezzanineSeats.map(seat => (
                  <button
                    key={seat.id}
                    onClick={() => handleSeatClick(seat.id, seat.status)}
                    disabled={seat.status === 'sold'}
                    className={`w-6 h-6 rounded text-xs ${
                      seat.status === 'sold' ? 'bg-gray-600 cursor-not-allowed' :
                      selectedSeats.includes(seat.id) ? 'bg-purple-600' :
                      'bg-blue-500 hover:bg-blue-400'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Balcony */}
            <div>
              <h3 className="text-center mb-4 font-semibold">Balcony - $75</h3>
              <div className="grid grid-cols-16 gap-1 max-w-md mx-auto">
                {balconySeats.map(seat => (
                  <button
                    key={seat.id}
                    onClick={() => handleSeatClick(seat.id, seat.status)}
                    disabled={seat.status === 'sold'}
                    className={`w-6 h-6 rounded text-xs ${
                      seat.status === 'sold' ? 'bg-gray-600 cursor-not-allowed' :
                      selectedSeats.includes(seat.id) ? 'bg-purple-600' :
                      'bg-blue-500 hover:bg-blue-400'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex justify-center space-x-6 mt-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded" />
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
          <div className="glass p-6 rounded-xl h-fit">
            <h3 className="text-xl font-bold mb-6">Order Summary</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-gray-400">Event</p>
                <p className="font-semibold">Hamilton</p>
                <p className="text-sm text-gray-400">Tonight, 7:30 PM</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-400 mb-2">Selected Seats ({selectedSeats.length})</p>
                {selectedSeats.length === 0 ? (
                  <p className="text-sm text-gray-500">No seats selected</p>
                ) : (
                  <div className="text-sm space-y-1">
                    {selectedSeats.map(seat => (
                      <div key={seat}>{seat}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t border-white/20 pt-4 mb-6">
              <div className="flex justify-between mb-2">
                <span>Subtotal</span>
                <span>${calculateTotal()}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Service Fee</span>
                <span>${(calculateTotal() * 0.1).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${(calculateTotal() * 1.1).toFixed(2)}</span>
              </div>
            </div>
            
            <button 
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold disabled:opacity-50"
              disabled={selectedSeats.length === 0}
            >
              Proceed to Checkout
            </button>

            {selectedSeats.length === 0 && (
              <div className="mt-6 p-4 bg-purple-600/20 rounded-lg border border-purple-600/30">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-purple-400">AI Recommendation</span>
                </div>
                <p className="text-sm text-gray-300">
                  Best available seats: Orchestra Row 5, Seats 10-11
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
