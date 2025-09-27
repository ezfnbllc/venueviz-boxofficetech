import {create} from 'zustand'

interface Seat {
  id: string
  section: string
  row: number
  seat: number
  price: number
  status?: string
}

interface CartState {
  selectedSeats: Seat[]
  total: number
  selectSeat: (seat: Seat) => void
  deselectSeat: (id: string) => void
  clearCart: () => void
  calculateTotal: () => number
}

export const useCart = create<CartState>((set, get) => ({
  selectedSeats: [],
  total: 0,
  selectSeat: (seat) => set((state) => ({
    selectedSeats: [...state.selectedSeats, seat],
    total: state.total + seat.price
  })),
  deselectSeat: (id) => set((state) => {
    const seat = state.selectedSeats.find(s => s.id === id)
    return {
      selectedSeats: state.selectedSeats.filter(s => s.id !== id),
      total: state.total - (seat?.price || 0)
    }
  }),
  clearCart: () => set({ selectedSeats: [], total: 0 }),
  calculateTotal: () => {
    const state = get()
    return state.selectedSeats.reduce((sum, seat) => sum + seat.price, 0)
  }
}))
