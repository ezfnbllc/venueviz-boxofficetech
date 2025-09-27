'use client'
import {useState} from 'react'

interface SeatGridProps {
  sections: any[]
  readOnly?: boolean
  onSeatClick?: (sectionId: string, row: number, seat: number) => void
  selectedSeats?: Set<string>
}

export default function SeatGrid({ sections, readOnly = false, onSeatClick, selectedSeats = new Set() }: SeatGridProps) {
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null)
  
  const getSeatId = (sectionId: string, row: number, seat: number) => {
    return `${sectionId}-R${row}S${seat}`
  }
  
  const getSeatColor = (section: any, seatId: string) => {
    if (selectedSeats.has(seatId)) return 'bg-purple-600'
    if (hoveredSeat === seatId && !readOnly) return 'bg-purple-500'
    
    switch (section.pricing) {
      case 'vip': return 'bg-yellow-600'
      case 'premium': return 'bg-blue-600'
      case 'standard': return 'bg-green-600'
      case 'economy': return 'bg-gray-600'
      default: return 'bg-gray-600'
    }
  }
  
  return (
    <div className="bg-black/40 rounded-lg p-4 overflow-auto">
      {/* Stage */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-center py-3 rounded-lg mb-6 font-bold">
        STAGE
      </div>
      
      {/* Sections */}
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.id} className="text-center">
            <h5 className="text-sm font-semibold mb-2">{section.name}</h5>
            <div className="inline-block">
              {Array.from({ length: section.rows || 0 }, (_, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-1 mb-1">
                  <span className="text-xs text-gray-500 w-6 text-right pr-1">
                    {String.fromCharCode(65 + rowIndex)}
                  </span>
                  {Array.from({ length: section.seatsPerRow || 0 }, (_, seatIndex) => {
                    const seatId = getSeatId(section.id, rowIndex + 1, seatIndex + 1)
                    return (
                      <button
                        key={seatIndex}
                        className={`w-3 h-3 rounded-sm transition-all ${getSeatColor(section, seatId)} ${
                          !readOnly ? 'hover:scale-110 cursor-pointer' : ''
                        }`}
                        onClick={() => !readOnly && onSeatClick && onSeatClick(section.id, rowIndex + 1, seatIndex + 1)}
                        onMouseEnter={() => !readOnly && setHoveredSeat(seatId)}
                        onMouseLeave={() => !readOnly && setHoveredSeat(null)}
                        title={`${section.name} Row ${String.fromCharCode(65 + rowIndex)} Seat ${seatIndex + 1}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex justify-center gap-4 mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-600 rounded-sm"></div>
          <span className="text-xs">VIP</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
          <span className="text-xs">Premium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
          <span className="text-xs">Standard</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-600 rounded-sm"></div>
          <span className="text-xs">Economy</span>
        </div>
      </div>
    </div>
  )
}
