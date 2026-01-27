/**
 * Tenant Context Hook
 *
 * IMPORTANT TERMINOLOGY:
 * ----------------------
 * In this system, "TENANTS" and "PROMOTERS" are used INTERCHANGEABLY.
 * - "Promoter" = Business term (event promoters/organizers who sell tickets)
 * - "Tenant" = Technical term (multi-tenant architecture)
 * - Both refer to the SAME entity
 *
 * DATA STORAGE:
 * - Business data (name, email, slug, commission) stored in `promoters` collection
 * - Theme/branding config stored in `tenants` collection (links via promoterId)
 *
 * USER SCOPES:
 * - 'master': Platform admin - can view ALL promoters' data
 * - 'promoter': Promoter admin - can only view THEIR promoter's data
 * - 'none': No special access
 *
 * USAGE:
 * - Master admins see a dropdown to select which promoter to view
 * - When "All Promoters" selected, dashboard shows aggregated data
 * - When specific promoter selected, dashboard filters to that promoter
 */

import { useState, useEffect, useMemo } from 'react'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import { PromoterService } from '@/lib/services/promoterService'
import { PromoterProfile } from '@/lib/types/promoter'

export type UserScope = 'master' | 'tenant' | 'promoter' | 'none'

export interface TenantContext {
  scope: UserScope
  loading: boolean
  // For master admin - all promoters (tenants)
  allTenants: PromoterProfile[]
  selectedTenantId: string | null
  setSelectedTenantId: (id: string | null) => void
  // For tenant admin / promoter
  currentTenant: PromoterProfile | null
  // For promoter filtering
  promoterId: string | null
  // Helpers
  isMasterAdmin: boolean
  isTenantAdmin: boolean
  isPromoter: boolean
  canViewAllTenants: boolean
  scopeLabel: string
}

export function useTenantContext(): TenantContext {
  const { user, userData, isAdmin, loading: authLoading } = useFirebaseAuth()
  const [allTenants, setAllTenants] = useState<PromoterProfile[]>([])
  const [currentTenant, setCurrentTenant] = useState<PromoterProfile | null>(null)
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Determine user scope
  const scope = useMemo((): UserScope => {
    if (!user || !userData) return 'none'

    // Check if master admin (platform owner)
    if (userData.isMaster === true || userData.role === 'superadmin' || userData.role === 'admin') {
      return 'master'
    }

    // Check if promoter role with specific promoterId
    if (userData.role === 'promoter' && userData.promoterId) {
      return 'promoter'
    }

    // Legacy admin check
    if (isAdmin) {
      return 'master'
    }

    return 'none'
  }, [user, userData, isAdmin])

  // Load context data based on scope
  useEffect(() => {
    if (authLoading) return

    const loadContextData = async () => {
      setLoading(true)

      try {
        // Master admins can see all promoters (tenants)
        // NOTE: We load from `promoters` collection, NOT `tenants` collection
        // The `tenants` collection only stores theme config, not business data
        if (scope === 'master') {
          const promoters = await PromoterService.getPromoters()
          setAllTenants(promoters as PromoterProfile[])
        }

        // Promoter users see only their promoter
        if (scope === 'promoter' && userData?.promoterId) {
          const promoter = await PromoterService.getPromoter(userData.promoterId)
          setCurrentTenant(promoter)
        }
      } catch (error) {
        console.error('[TenantContext] Error loading context:', error)
      } finally {
        setLoading(false)
      }
    }

    loadContextData()
  }, [scope, authLoading, userData?.promoterId])

  // When a tenant is selected, load its details
  useEffect(() => {
    if (selectedTenantId && scope === 'master') {
      const selected = allTenants.find(t => t.id === selectedTenantId)
      setCurrentTenant(selected || null)
    } else if (!selectedTenantId && scope === 'master') {
      setCurrentTenant(null)
    }
  }, [selectedTenantId, allTenants, scope])

  const isMasterAdmin = scope === 'master'
  const isTenantAdmin = false // Not used in current system - promoters are the tenants
  const isPromoter = scope === 'promoter'
  const canViewAllTenants = isMasterAdmin

  const scopeLabel = useMemo(() => {
    switch (scope) {
      case 'master': return 'Platform Admin'
      case 'promoter': return currentTenant?.name || 'Promoter'
      default: return 'User'
    }
  }, [scope, currentTenant])

  return {
    scope,
    loading: loading || authLoading,
    allTenants,
    selectedTenantId,
    setSelectedTenantId,
    currentTenant,
    promoterId: userData?.promoterId || null,
    isMasterAdmin,
    isTenantAdmin,
    isPromoter,
    canViewAllTenants,
    scopeLabel,
  }
}
