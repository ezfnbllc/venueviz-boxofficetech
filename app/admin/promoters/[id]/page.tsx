'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import { AdminService } from '@/lib/admin/adminService'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { PromoterProfile, PaymentGateway } from '@/lib/types/promoter'
import PromoterOverview from '@/components/admin/promoters/PromoterOverview'
import PaymentGatewaySetup from '@/components/admin/promoters/PaymentGatewaySetup'
import PromoterProfileForm from '@/components/admin/promoters/PromoterProfileForm'
import PromoterEvents from '@/components/admin/promoters/PromoterEvents'
import PromoterCommissions from '@/components/admin/promoters/PromoterCommissions'
import PromoterDocuments from '@/components/admin/promoters/PromoterDocuments'

type Tab = 'overview' | 'profile' | 'payment' | 'events' | 'commissions' | 'documents'

export default function PromoterDetailPage() {
  const router = useRouter()
  const params = useParams()
  const promoterId = params.id as string
  const { user, isAdmin, loading: authLoading } = useFirebaseAuth()

  const [promoter, setPromoter] = useState<PromoterProfile | null>(null)
  const [paymentGateway, setPaymentGateway] = useState<PaymentGateway | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  useEffect(() => {
    if (user && !authLoading && promoterId) {
      loadPromoter()
    }
  }, [user, authLoading, promoterId])

  const loadPromoter = async () => {
    try {
      setLoading(true)

      // Fetch promoter data
      const promoterDoc = await getDoc(doc(db, 'promoters', promoterId))
      if (!promoterDoc.exists()) {
        router.push('/admin/promoters')
        return
      }

      const promoterData = { id: promoterDoc.id, ...promoterDoc.data() } as PromoterProfile
      setPromoter(promoterData)

      // Fetch payment gateway if exists
      const gatewayQuery = query(
        collection(db, 'payment_gateways'),
        where('promoterId', '==', promoterId)
      )
      const gatewaySnap = await getDocs(gatewayQuery)
      if (!gatewaySnap.empty) {
        setPaymentGateway({ id: gatewaySnap.docs[0].id, ...gatewaySnap.docs[0].data() } as PaymentGateway)
      }

    } catch (error) {
      console.error('Error loading promoter:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = () => {
    loadPromoter()
  }

  const handleGatewayUpdate = () => {
    loadPromoter()
  }

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"/>
      </div>
    )
  }

  if (!promoter) {
    return (
      <div className="text-center py-12 card-elevated rounded-xl p-8">
        <p className="text-secondary-contrast mb-4">Promoter not found</p>
        <button
          onClick={() => router.push('/admin/promoters')}
          className="mt-4 btn-accent px-5 py-2.5 rounded-xl font-medium"
        >
          Back to Promoters
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
      <div className="card-elevated rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/promoters')}
              className="btn-secondary p-2.5 rounded-xl"
            >
              ← Back
            </button>

            <div className="flex items-center gap-4">
              {promoter.logo ? (
                <img
                  src={promoter.logo}
                  alt={promoter.name}
                  className="w-16 h-16 rounded-xl object-cover ring-2 ring-slate-200 dark:ring-white/10"
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/30">
                  {promoter.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}

              <div>
                <h1 className="text-3xl font-bold text-primary-contrast">{promoter.name}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    promoter.active
                      ? 'badge-success'
                      : 'badge-error'
                  }`}>
                    {promoter.active ? 'Active' : 'Inactive'}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    promoter.brandingType === 'advanced'
                      ? 'badge-info'
                      : 'bg-slate-200 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-500/30'
                  }`}>
                    {promoter.brandingType || 'basic'} branding
                  </span>
                  {promoter.slug && (
                    <a
                      href={`/p/${promoter.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 hover:underline transition-colors font-medium"
                    >
                      /p/{promoter.slug}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Color Scheme Preview */}
          {promoter.colorScheme && (
            <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-700/50 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600">
              <span className="text-sm text-secondary-contrast">Brand Colors:</span>
              {['primary', 'secondary', 'accent'].map(key => (
                <div
                  key={key}
                  className="w-8 h-8 rounded-lg ring-2 ring-slate-300 dark:ring-white/20 shadow-lg"
                  style={{ backgroundColor: promoter.colorScheme?.[key as keyof typeof promoter.colorScheme] }}
                  title={key}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 pb-2 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'btn-accent'
                : 'btn-secondary'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card-elevated rounded-2xl p-6 min-h-[400px]">
        {activeTab === 'overview' && (
          <PromoterOverview
            promoterId={promoterId}
            isMaster={isAdmin || false}
          />
        )}

        {activeTab === 'profile' && (
          <PromoterProfileForm
            profile={promoter}
            onUpdate={handleProfileUpdate}
          />
        )}

        {activeTab === 'payment' && (
          <PaymentGatewaySetup
            promoterId={promoterId}
            currentGateway={paymentGateway}
            isMaster={isAdmin || false}
            onUpdate={handleGatewayUpdate}
          />
        )}

        {activeTab === 'events' && (
          <PromoterEvents promoterId={promoterId} />
        )}

        {activeTab === 'commissions' && (
          <PromoterCommissions promoterId={promoterId} />
        )}

        {activeTab === 'documents' && (
          <PromoterDocuments promoterId={promoterId} />
        )}
      </div>
    </div>
  )
}
