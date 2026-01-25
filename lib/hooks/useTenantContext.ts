/**
 * Tenant Context Hook
 *
 * Determines the user's access scope based on their role:
 * - Master Admin: Can view all tenants
 * - Tenant Admin: Can only view their assigned tenant
 * - Promoter: Can only view their promoter's data
 */

import { useState, useEffect, useMemo } from 'react'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import { WhiteLabelService, Tenant, TenantUser } from '@/lib/services/whiteLabelService'

export type UserScope = 'master' | 'tenant' | 'promoter' | 'none'

export interface TenantContext {
  scope: UserScope
  loading: boolean
  // For master admin
  allTenants: Tenant[]
  selectedTenantId: string | null
  setSelectedTenantId: (id: string | null) => void
  // For tenant admin
  currentTenant: Tenant | null
  tenantUser: TenantUser | null
  // For promoter
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
  const [allTenants, setAllTenants] = useState<Tenant[]>([])
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null)
  const [tenantUser, setTenantUser] = useState<TenantUser | null>(null)
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Determine user scope
  const scope = useMemo((): UserScope => {
    if (!user || !userData) return 'none'

    // Check if master admin (platform owner)
    if (userData.isMaster === true || userData.role === 'superadmin') {
      return 'master'
    }

    // Check if tenant admin
    if (userData.tenantId) {
      return 'tenant'
    }

    // Check if promoter
    if (userData.role === 'promoter') {
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
        switch (scope) {
          case 'master':
            // Master admins can see all tenants
            const tenants = await WhiteLabelService.getTenants()
            setAllTenants(tenants)
            break

          case 'tenant':
            // Tenant admins see only their tenant
            if (userData?.tenantId) {
              const tenant = await WhiteLabelService.getTenant(userData.tenantId)
              setCurrentTenant(tenant)

              // Get tenant user info
              if (tenant) {
                const users = await WhiteLabelService.getTenantUsers(tenant.id)
                const currentTenantUser = users.find(u => u.userId === user?.uid)
                setTenantUser(currentTenantUser || null)
              }
            }
            break

          case 'promoter':
            // Promoters don't need additional tenant data
            break
        }
      } catch (error) {
        console.error('[TenantContext] Error loading context:', error)
      } finally {
        setLoading(false)
      }
    }

    loadContextData()
  }, [scope, authLoading, userData?.tenantId, user?.uid])

  const isMasterAdmin = scope === 'master'
  const isTenantAdmin = scope === 'tenant'
  const isPromoter = scope === 'promoter'
  const canViewAllTenants = isMasterAdmin

  const scopeLabel = useMemo(() => {
    switch (scope) {
      case 'master': return 'Platform Admin'
      case 'tenant': return currentTenant?.name || 'Tenant Admin'
      case 'promoter': return 'Promoter'
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
    tenantUser,
    promoterId: userData?.promoterId || null,
    isMasterAdmin,
    isTenantAdmin,
    isPromoter,
    canViewAllTenants,
    scopeLabel,
  }
}
