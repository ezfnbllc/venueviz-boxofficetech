import {create} from 'zustand'
import {persist} from 'zustand/middleware'

interface CartStore {
  items: any[]
  selectedSeats: any[]
  total: number
  addItem: (item: any) => void
  removeItem: (id: string) => void
  clearCart: () => void
  selectSeat: (seat: any) => void
  deselectSeat: (id: string) => void
  calculateTotal: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      selectedSeats: [],
      total: 0,
      addItem: (item) => set((state) => ({
        items: [...state.items, item],
        total: state.total + item.price
      })),
      removeItem: (id) => set((state) => ({
        items: state.items.filter(i => i.id !== id),
        total: state.items.filter(i => i.id !== id).reduce((sum, i) => sum + i.price, 0)
      })),
      clearCart: () => set({ items: [], selectedSeats: [], total: 0 }),
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
      calculateTotal: () => {
        const state = get()
        return state.selectedSeats.reduce((sum, seat) => sum + seat.price, 0)
      }
    }),
    { name: 'cart-storage' }
  )
)
