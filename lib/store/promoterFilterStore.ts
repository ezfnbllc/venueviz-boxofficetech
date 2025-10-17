import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PromoterFilterState {
  selectedPromoterId: string
  setSelectedPromoterId: (id: string) => void
  clearFilter: () => void
}

export const usePromoterFilterStore = create<PromoterFilterState>()(
  persist(
    (set) => ({
      selectedPromoterId: 'all',
      setSelectedPromoterId: (id: string) => set({ selectedPromoterId: id }),
      clearFilter: () => set({ selectedPromoterId: 'all' })
    }),
    {
      name: 'promoter-filter-storage'
    }
  )
)
