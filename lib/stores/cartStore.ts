import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useEffect, useState } from 'react'

interface SeatInfo {
  sectionId: string
  sectionName: string
  row: string
  seat: string | number
}

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
  row?: number | string
  seat?: number | string
  price: number
  quantity: number
  seatInfo?: SeatInfo // For reserved seating
}

interface FeeConfig {
  serviceFee?: number
  serviceFeeType?: 'percentage' | 'fixed'
  serviceFeeScope?: 'per_ticket' | 'per_transaction'
  parkingFee?: number
  parkingFeeType?: 'percentage' | 'fixed'
  parkingFeeScope?: 'per_ticket' | 'per_transaction'
  venueFee?: number
  venueFeeType?: 'percentage' | 'fixed'
  venueFeeScope?: 'per_ticket' | 'per_transaction'
  salesTax?: number
  customFees?: Array<{
    name: string
    type: 'percentage' | 'fixed'
    amount: number
    scope: 'per_ticket' | 'per_transaction'
  }>
}

interface CartEvent {
  eventId: string
  eventName: string
  eventImage?: string
  eventDate?: string
  venueName?: string
  promoterSlug: string
  fees?: FeeConfig
}

interface AppliedCoupon {
  code: string
  type: 'percentage' | 'fixed'
  value: number
  description?: string
}

interface CartState {
  items: CartItem[]
  currentEvent: CartEvent | null
  promoterSlug: string | null
  appliedCoupon: AppliedCoupon | null
  _hasHydrated: boolean

  // Legacy support for seat selection
  selectedSeats: CartItem[]

  // Actions
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  setCurrentEvent: (event: CartEvent) => void
  applyCoupon: (coupon: AppliedCoupon) => void
  removeCoupon: () => void
  clearCart: () => void
  setHasHydrated: (state: boolean) => void

  // Computed
  calculateSubtotal: () => number
  calculateServiceFee: () => number
  calculateAllFees: () => {
    convenienceFee: number
    parkingFee: number
    venueFee: number
    customFees: Array<{ name: string; amount: number }>
    salesTax: number
    discount: number
    totalFees: number
  }
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
      appliedCoupon: null,
      selectedSeats: [],
      _hasHydrated: false,

      setHasHydrated: (state) => {
        set({ _hasHydrated: state })
      },

      applyCoupon: (coupon) => set({ appliedCoupon: coupon }),

      removeCoupon: () => set({ appliedCoupon: null }),

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
        appliedCoupon: null,
      }),

      calculateSubtotal: () => {
        const state = get()
        return state.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        )
      },

      calculateServiceFee: () => {
        // Legacy function - returns just convenience fee for backwards compatibility
        const state = get()
        const fees = state.calculateAllFees()
        return fees.totalFees
      },

      calculateAllFees: () => {
        const state = get()
        const subtotal = state.calculateSubtotal()
        const ticketCount = state.getItemCount()
        const feeConfig = state.currentEvent?.fees

        // Helper to calculate a single fee
        const calcFee = (
          amount: number | undefined,
          type: 'percentage' | 'fixed' | undefined,
          scope: 'per_ticket' | 'per_transaction' | undefined
        ): number => {
          if (!amount || amount <= 0) return 0
          const isPercentage = type === 'percentage'
          const isPerTicket = scope !== 'per_transaction'

          if (isPercentage) {
            // Percentage of subtotal
            return Math.round(subtotal * (amount / 100) * 100) / 100
          } else {
            // Fixed amount
            if (isPerTicket) {
              return Math.round(amount * ticketCount * 100) / 100
            }
            return Math.round(amount * 100) / 100
          }
        }

        // Calculate each fee
        const convenienceFee = calcFee(
          feeConfig?.serviceFee,
          feeConfig?.serviceFeeType,
          feeConfig?.serviceFeeScope
        )
        const parkingFee = calcFee(
          feeConfig?.parkingFee,
          feeConfig?.parkingFeeType,
          feeConfig?.parkingFeeScope
        )
        const venueFee = calcFee(
          feeConfig?.venueFee,
          feeConfig?.venueFeeType,
          feeConfig?.venueFeeScope
        )

        // Calculate custom fees
        const customFees = (feeConfig?.customFees || []).map(cf => ({
          name: cf.name || 'Fee',
          amount: calcFee(cf.amount, cf.type, cf.scope)
        })).filter(cf => cf.amount > 0)

        const customFeesTotal = customFees.reduce((sum, cf) => sum + cf.amount, 0)

        // Calculate discount
        const coupon = state.appliedCoupon
        let discount = 0
        if (coupon) {
          if (coupon.type === 'percentage') {
            discount = Math.round(subtotal * (coupon.value / 100) * 100) / 100
          } else {
            discount = Math.min(coupon.value, subtotal) // Don't discount more than subtotal
          }
        }

        // Calculate tax on (subtotal - discount + all fees)
        const taxableAmount = subtotal - discount + convenienceFee + parkingFee + venueFee + customFeesTotal
        const salesTax = feeConfig?.salesTax && taxableAmount > 0
          ? Math.round(taxableAmount * (feeConfig.salesTax / 100) * 100) / 100
          : 0

        const totalFees = convenienceFee + parkingFee + venueFee + customFeesTotal + salesTax - discount

        return {
          convenienceFee,
          parkingFee,
          venueFee,
          customFees,
          salesTax,
          discount,
          totalFees
        }
      },

      calculateTotal: () => {
        const state = get()
        const fees = state.calculateAllFees()
        return Math.round((state.calculateSubtotal() + fees.totalFees) * 100) / 100
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
        appliedCoupon: state.appliedCoupon,
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
      appliedCoupon: null as AppliedCoupon | null,
      selectedSeats: [] as CartItem[],
      _hasHydrated: false,
      addItem: store.addItem,
      removeItem: store.removeItem,
      updateQuantity: store.updateQuantity,
      setCurrentEvent: store.setCurrentEvent,
      applyCoupon: store.applyCoupon,
      removeCoupon: store.removeCoupon,
      clearCart: store.clearCart,
      setHasHydrated: store.setHasHydrated,
      calculateSubtotal: () => 0,
      calculateServiceFee: () => 0,
      calculateAllFees: () => ({
        convenienceFee: 0,
        parkingFee: 0,
        venueFee: 0,
        customFees: [],
        salesTax: 0,
        discount: 0,
        totalFees: 0
      }),
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
