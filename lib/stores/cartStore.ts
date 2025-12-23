import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useEffect, useState } from 'react'

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
  _hasHydrated: boolean

  // Legacy support for seat selection
  selectedSeats: CartItem[]

  // Actions
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  setCurrentEvent: (event: CartEvent) => void
  clearCart: () => void
  setHasHydrated: (state: boolean) => void

  // Computed
  calculateSubtotal: () => number
  calculateServiceFee: () => number
  calculateTotal: () => number
  getItemCount: () => number

  // Legacy support
  selectSeat: (seat: CartItem) => void
  deselectSeat: (id: string) => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      currentEvent: null,
      promoterSlug: null,
      selectedSeats: [],
      _hasHydrated: false,

      setHasHydrated: (state) => {
        set({ _hasHydrated: state })
      },

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
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        currentEvent: state.currentEvent,
        promoterSlug: state.promoterSlug,
        selectedSeats: state.selectedSeats,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

/**
 * Custom hook that handles hydration properly for SSR
 * Returns empty values until hydration is complete to prevent hydration mismatches
 */
export function useCart() {
  const store = useCartStore()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Wait a tick for Zustand to fully rehydrate from localStorage
    const timer = setTimeout(() => {
      setIsHydrated(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // Return empty/default values during SSR and initial client render
  // This ensures server and client render the same initial content
  if (!isHydrated) {
    return {
      items: [] as CartItem[],
      currentEvent: null as CartEvent | null,
      promoterSlug: null as string | null,
      selectedSeats: [] as CartItem[],
      _hasHydrated: false,
      addItem: store.addItem,
      removeItem: store.removeItem,
      updateQuantity: store.updateQuantity,
      setCurrentEvent: store.setCurrentEvent,
      clearCart: store.clearCart,
      setHasHydrated: store.setHasHydrated,
      calculateSubtotal: () => 0,
      calculateServiceFee: () => 0,
      calculateTotal: () => 0,
      getItemCount: () => 0,
      selectSeat: store.selectSeat,
      deselectSeat: store.deselectSeat,
    }
  }

  // After hydration, return the actual store values
  return {
    ...store,
    _hasHydrated: true, // Force this to true after our local hydration check
  }
}
