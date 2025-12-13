import { useMemo } from 'react'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import { usePromoterFilterStore } from '@/lib/store/promoterFilterStore'

interface PromoterAccessResult {
  // Whether the current user is a master admin
  isAdmin: boolean
  // Whether the current user is a promoter (non-admin)
  isPromoter: boolean
  // The promoter ID if user is a promoter, undefined otherwise
  userPromoterId: string | undefined
  // The currently selected promoter from the filter dropdown
  selectedPromoterId: string
  // The effective promoter ID(s) to filter by
  // For admins: follows the dropdown selection ('all' or specific ID)
  // For promoters: always their own promoterId (ignores dropdown)
  effectivePromoterId: string
  // Whether to show all data (admin with 'all' selected)
  showAll: boolean
  // Loading state
  loading: boolean
  // Filter function for arrays with promoterId field
  filterByPromoter: <T extends { promoterId?: string; promoter?: { promoterId?: string } }>(items: T[]) => T[]
  // Check if a specific item belongs to the current user/selection
  canAccess: (promoterId: string | undefined) => boolean
}

/**
 * Hook to manage promoter-based access control across admin pages.
 *
 * Usage:
 * ```tsx
 * const { isAdmin, effectivePromoterId, showAll, filterByPromoter, canAccess } = usePromoterAccess()
 *
 * // Filter a list of items
 * const filteredEvents = filterByPromoter(allEvents)
 *
 * // Check if user can access a specific item
 * if (canAccess(event.promoterId)) { ... }
 *
 * // Conditionally show admin-only features
 * {isAdmin && <AdminOnlyButton />}
 * ```
 */
export function usePromoterAccess(): PromoterAccessResult {
  const { user, userData, loading, isAdmin } = useFirebaseAuth()
  const { selectedPromoterId } = usePromoterFilterStore()

  const result = useMemo(() => {
    const isPromoter = !isAdmin && userData?.role === 'promoter'
    const userPromoterId = isPromoter ? userData?.promoterId : undefined

    // For promoters, always use their own promoterId regardless of dropdown
    // For admins, use the dropdown selection
    const effectivePromoterId = isPromoter && userPromoterId
      ? userPromoterId
      : selectedPromoterId

    // Show all only if admin and 'all' is selected
    const showAll = isAdmin && effectivePromoterId === 'all'

    // Filter function that respects access control
    const filterByPromoter = <T extends { promoterId?: string; promoter?: { promoterId?: string } }>(items: T[]): T[] => {
      if (showAll) return items

      return items.filter(item => {
        // Support both direct promoterId and nested promoter.promoterId
        const itemPromoterId = item.promoterId || item.promoter?.promoterId

        // If no promoter assigned and user is admin, show it
        if (!itemPromoterId && isAdmin) return true

        // Otherwise check if it matches the effective promoter
        return itemPromoterId === effectivePromoterId
      })
    }

    // Check if user can access a specific promoter's data
    const canAccess = (promoterId: string | undefined): boolean => {
      if (showAll) return true
      if (!promoterId && isAdmin) return true
      return promoterId === effectivePromoterId
    }

    return {
      isAdmin,
      isPromoter,
      userPromoterId,
      selectedPromoterId,
      effectivePromoterId,
      showAll,
      loading,
      filterByPromoter,
      canAccess,
    }
  }, [isAdmin, userData, selectedPromoterId, loading])

  return result
}
