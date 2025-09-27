// Add this to your existing box-office/page.tsx
// Import the new SeatSelector component
import SeatSelector from '@/components/SeatSelector'

// Add this inside your BoxOfficeContent component where seat selection happens:
{selectedEvent?.layoutId ? (
  <SeatSelector
    eventId={selectedEvent.id}
    layoutId={selectedEvent.layoutId}
    onSeatsSelected={(seats) => {
      // Update your cart with selected seats
      seats.forEach(seat => selectSeat(seat))
    }}
  />
) : (
  // Your existing seat grid code as fallback
  <div className="existing-seat-grid">
    {/* existing code */}
  </div>
)}
