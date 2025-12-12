'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import { AdminService } from '@/lib/admin/adminService'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { PromoterProfile, PaymentGateway } from '@/lib/types/promoter'
import TenantOverview from '@/components/admin/white-label/TenantOverview'
import TenantPaymentGateway from '@/components/admin/white-label/TenantPaymentGateway'
import TenantProfileForm from '@/components/admin/white-label/TenantProfileForm'
import TenantEvents from '@/components/admin/white-label/TenantEvents'
import TenantCommissions from '@/components/admin/white-label/TenantCommissions'
import TenantDocuments from '@/components/admin/white-label/TenantDocuments'

type Tab = 'overview' | 'profile' | 'payment' | 'events' | 'commissions' | 'documents'

export default function TenantDetailPage() {
  const router = useRouter()
  const params = useParams()
  const tenantId = params.id as string
  const { user, isAdmin, loading: authLoading } = useFirebaseAuth()

  const [tenant, setTenant] = useState<PromoterProfile | null>(null)
  const [paymentGateway, setPaymentGateway] = useState<PaymentGateway | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  useEffect(() => {
    if (user && !authLoading && tenantId) {
      loadTenant()
    }
  }, [user, authLoading, tenantId])

  const loadTenant = async () => {
    try {
      setLoading(true)

      // Fetch tenant data
      const tenantDoc = await getDoc(doc(db, 'promoters', tenantId))
      if (!tenantDoc.exists()) {
        router.push('/admin/white-label')
        return
      }

      const tenantData = { id: tenantDoc.id, ...tenantDoc.data() } as PromoterProfile
      setTenant(tenantData)

      // Fetch payment gateway if exists
      const gatewayQuery = query(
        collection(db, 'payment_gateways'),
        where('promoterId', '==', tenantId)
      )
      const gatewaySnap = await getDocs(gatewayQuery)
      if (!gatewaySnap.empty) {
        setPaymentGateway({ id: gatewaySnap.docs[0].id, ...gatewaySnap.docs[0].data() } as PaymentGateway)
      }

    } catch (error) {
      console.error('Error loading tenant:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = () => {
    loadTenant()
  }

  const handleGatewayUpdate = () => {
    loadTenant()
  }

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Tenant not found</p>
        <button
          onClick={() => router.push('/admin/white-label')}
          className="mt-4 px-4 py-2 bg-purple-600 rounded-lg"
        >
          Back to White-Label Tenants
        </button>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'payment', label: 'Payment Gateway', icon: '💳' },
    { id: 'events', label: 'Events', icon: '🎫' },
    { id: 'commissions', label: 'Commissions', icon: '💰' },
    { id: 'documents', label: 'Documents', icon: '📄' },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/white-label')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            ← Back
          </button>

          <div className="flex items-center gap-4">
            {tenant.logo ? (
              <img
                src={tenant.logo}
                alt={tenant.name}
                className="w-16 h-16 rounded-xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl">
                {tenant.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}

            <div>
              <h1 className="text-3xl font-bold">{tenant.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-xs ${
                  tenant.active
                    ? 'bg-green-600/20 text-green-400'
                    : 'bg-red-600/20 text-red-400'
                }`}>
                  {tenant.active ? 'Active' : 'Inactive'}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  tenant.brandingType === 'advanced'
                    ? 'bg-purple-600/20 text-purple-400'
                    : 'bg-gray-600/20 text-gray-400'
                }`}>
                  {tenant.brandingType || 'basic'} branding
                </span>
                {tenant.slug && (
                  <a
                    href={`/p/${tenant.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-400 hover:underline"
                  >
                    /p/{tenant.slug}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Color Scheme Preview */}
        {tenant.colorScheme && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 mr-2">Brand Colors:</span>
            {['primary', 'secondary', 'accent'].map(key => (
              <div
                key={key}
                className="w-8 h-8 rounded-lg border border-white/20"
                style={{ backgroundColor: tenant.colorScheme?.[key as keyof typeof tenant.colorScheme] }}
                title={key}
              />
            ))}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-2 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <TenantOverview
            tenantId={tenantId}
            isMaster={isAdmin || false}
          />
        )}

        {activeTab === 'profile' && (
          <TenantProfileForm
            profile={tenant}
            onUpdate={handleProfileUpdate}
          />
        )}

        {activeTab === 'payment' && (
          <TenantPaymentGateway
            tenantId={tenantId}
            currentGateway={paymentGateway}
            isMaster={isAdmin || false}
            onUpdate={handleGatewayUpdate}
          />
        )}

        {activeTab === 'events' && (
          <TenantEvents tenantId={tenantId} />
        )}

        {activeTab === 'commissions' && (
          <TenantCommissions tenantId={tenantId} />
        )}

        {activeTab === 'documents' && (
          <TenantDocuments tenantId={tenantId} />
        )}
      </div>
    </div>
  )
}
