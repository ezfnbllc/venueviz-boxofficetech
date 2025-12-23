import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartItem {
  id: string
  type: 'ticket' | 'seat'
  eventId: string
  eventName: string
  eventImage?: string
  eventDate?: string
  venueName?: string
  ticketType?: string
  section?: string
  row?: number
  seat?: number
  price: number
  quantity: number
}

interface CartEvent {
  eventId: string
  eventName: string
  eventImage?: string
  eventDate?: string
  venueName?: string
  promoterSlug: string
}

interface CartState {
  items: CartItem[]
  currentEvent: CartEvent | null
  promoterSlug: string | null

  // Legacy support for seat selection
  selectedSeats: CartItem[]

  // Actions
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  setCurrentEvent: (event: CartEvent) => void
  clearCart: () => void

  // Computed
  calculateSubtotal: () => number
  calculateServiceFee: () => number
  calculateTotal: () => number
  getItemCount: () => number

  // Legacy support
  selectSeat: (seat: CartItem) => void
  deselectSeat: (id: string) => void
  calculateTotal: () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      currentEvent: null,
      promoterSlug: null,
      selectedSeats: [],

      addItem: (item) => set((state) => {
        const existingIndex = state.items.findIndex(
          (i) =>
            i.eventId === item.eventId &&
            i.ticketType === item.ticketType &&
            i.section === item.section &&
            i.row === item.row &&
            i.seat === item.seat
        )

        if (existingIndex >= 0) {
          // Update quantity if item exists
          const newItems = [...state.items]
          newItems[existingIndex].quantity += item.quantity
          return { items: newItems }
        }

        return { items: [...state.items, item] }
      }),

      removeItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        selectedSeats: state.selectedSeats.filter((item) => item.id !== id),
      })),

      updateQuantity: (id, quantity) => set((state) => {
        if (quantity <= 0) {
          return {
            items: state.items.filter((item) => item.id !== id),
          }
        }

        return {
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        }
      }),

      setCurrentEvent: (event) => set({
        currentEvent: event,
        promoterSlug: event.promoterSlug,
      }),

      clearCart: () => set({
        items: [],
        selectedSeats: [],
        currentEvent: null,
      }),

      calculateSubtotal: () => {
        const state = get()
        return state.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        )
      },

      calculateServiceFee: () => {
        const state = get()
        const subtotal = state.calculateSubtotal()
        return Math.round(subtotal * 0.1 * 100) / 100 // 10% service fee
      },

      calculateTotal: () => {
        const state = get()
        return state.calculateSubtotal() + state.calculateServiceFee()
      },

      getItemCount: () => {
        const state = get()
        return state.items.reduce((sum, item) => sum + item.quantity, 0)
      },

      // Legacy support for seat selection (backwards compatibility)
      selectSeat: (seat) => set((state) => ({
        items: [...state.items, seat],
        selectedSeats: [...state.selectedSeats, seat],
      })),

      deselectSeat: (id) => set((state) => ({
        items: state.items.filter((s) => s.id !== id),
        selectedSeats: state.selectedSeats.filter((s) => s.id !== id),
      })),
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({
        items: state.items,
        currentEvent: state.currentEvent,
        promoterSlug: state.promoterSlug,
        selectedSeats: state.selectedSeats,
      }),
    }
  )
)
