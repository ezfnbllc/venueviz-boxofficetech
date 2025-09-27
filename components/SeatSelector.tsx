'use client'
import { useState, useEffect } from 'react'
import SeatingChartDesigner from './SeatingChartDesigner'
import { SeatingLayout } from '@/lib/seating/types'

interface SeatSelectorProps {
  eventId: string
  layoutId: string
  onSeatsSelected: (seats: any[]) => void
}

export default function SeatSelector({ eventId, layoutId, onSeatsSelected }: SeatSelectorProps) {
  const [layout, setLayout] = useState<SeatingLayout | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSeats, setSelectedSeats] = useState<any[]>([])

  useEffect(() => {
    loadLayout()
  }, [layoutId])

  const loadLayout = async () => {
    try {
      const response = await fetch(`/api/layouts/${layoutId}`)
      const data = await response.json()
      
      // Convert to SeatingLayout format
      const seatingLayout: SeatingLayout = {
        id: data.id,
        venueId: data.venueId,
        name: data.name,
        sections: data.sections || [],
        stage: data.stage || {
          x: 400,
          y: 50,
          width: 400,
          height: 60,
          label: 'STAGE',
          type: 'stage'
        },
        aisles: data.aisles || [],
        capacity: data.totalCapacity || 0,
        viewBox: data.viewBox || {
          x: 0,
          y: 0,
          width: 1200,
          height: 800
        }
      }
      
      setLayout(seatingLayout)
    } catch (error) {
      console.error('Error loading layout:', error)
    }
    setLoading(false)
  }

  const handleLayoutSave = (updatedLayout: SeatingLayout) => {
    // Extract selected seats from the layout
    const seats: any[] = []
    updatedLayout.sections.forEach(section => {
      section.rows.forEach(row => {
        row.seats.forEach(seat => {
          // Check if seat is selected (you'd need to track this)
          seats.push({
            id: seat.id,
            section: section.name,
            row: row.label,
            number: seat.number,
            price: getPriceForSection(section.pricing)
          })
        })
      })
    })
    setSelectedSeats(seats)
    onSeatsSelected(seats)
  }

  const getPriceForSection = (pricing: string) => {
    switch (pricing) {
      case 'vip': return 250
      case 'premium': return 150
      case 'standard': return 100
      case 'economy': return 75
      default: return 100
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
      </div>
    )
  }

  if (!layout) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No seating layout available</p>
      </div>
    )
  }

  return (
    <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-4">
      <h3 className="text-lg font-bold mb-4">Select Your Seats</h3>
      <div className="h-[600px] relative">
        <SeatingChartDesigner
          layout={layout}
          onSave={handleLayoutSave}
          mode="preview"
          selectedEventId={eventId}
        />
      </div>
      {selectedSeats.length > 0 && (
        <div className="mt-4 p-4 bg-white/5 rounded-lg">
          <p className="font-semibold mb-2">Selected Seats ({selectedSeats.length})</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {selectedSeats.slice(0, 6).map(seat => (
              <div key={seat.id} className="flex justify-between">
                <span>{seat.section} {seat.row}{seat.number}</span>
                <span>${seat.price}</span>
              </div>
            ))}
            {selectedSeats.length > 6 && (
              <p className="text-gray-400">...and {selectedSeats.length - 6} more</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
