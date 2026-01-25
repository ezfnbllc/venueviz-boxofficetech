'use client'

import { PromoterProfile } from '@/lib/types/promoter'
import Link from 'next/link'

interface TenantSummaryWidgetProps {
  tenants: PromoterProfile[]
  selectedTenantId: string | null
  onSelectTenant: (id: string | null) => void
  loading?: boolean
}

export function TenantSummaryWidget({
  tenants,
  selectedTenantId,
  onSelectTenant,
  loading,
}: TenantSummaryWidgetProps) {
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
        <div className="animate-pulse">
          <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i}>
                <div className="h-8 bg-white/20 rounded w-12 mb-2"></div>
                <div className="h-4 bg-white/10 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const activeTenants = tenants.filter(t => t.active === true).length
  const advancedTenants = tenants.filter(t => t.brandingType === 'advanced').length
  const basicTenants = tenants.filter(t => t.brandingType === 'basic').length

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏢</span>
          <h2 className="text-xl font-bold">Platform Overview</h2>
        </div>
        <Link
          href="/admin/promoters"
          className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors"
        >
          Manage Promoters
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div>
          <p className="text-3xl font-bold">{tenants.length}</p>
          <p className="text-sm opacity-80">Total Promoters</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-green-200">{activeTenants}</p>
          <p className="text-sm opacity-80">Active</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-amber-200">{advancedTenants}</p>
          <p className="text-sm opacity-80">Advanced</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-blue-200">{basicTenants}</p>
          <p className="text-sm opacity-80">Basic</p>
        </div>
      </div>

      {/* Tenant Filter */}
      <div className="border-t border-white/20 pt-4">
        <label className="text-sm opacity-80 block mb-2">View Dashboard For:</label>
        <select
          value={selectedTenantId || 'all'}
          onChange={(e) => onSelectTenant(e.target.value === 'all' ? null : e.target.value)}
          className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-white/50 focus:outline-none"
        >
          <option value="all" className="text-slate-900">All Promoters (Platform View)</option>
          {tenants
            .filter(t => t.active)
            .map(tenant => (
              <option key={tenant.id} value={tenant.id} className="text-slate-900">
                {tenant.name} ({tenant.brandingType})
              </option>
            ))}
        </select>
      </div>
    </div>
  )
}

interface TenantInfoBannerProps {
  tenant: PromoterProfile | null
  tenantRole?: string
}

export function TenantInfoBanner({ tenant, tenantRole }: TenantInfoBannerProps) {
  if (!tenant) return null

  return (
    <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {tenant.logo && (
            <img
              src={tenant.logo}
              alt={tenant.name}
              className="w-10 h-10 rounded-lg object-contain bg-white p-1"
            />
          )}
          <div>
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">{tenant.name}</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                tenant.active
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {tenant.active ? 'Active' : 'Inactive'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                tenant.brandingType === 'advanced'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {tenant.brandingType}
              </span>
              {tenantRole && (
                <span className="text-slate-500 dark:text-slate-400">
                  • {tenantRole}
                </span>
              )}
            </div>
          </div>
        </div>
        <Link
          href={`/admin/promoters/${tenant.id}`}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View Details →
        </Link>
      </div>
    </div>
  )
}
