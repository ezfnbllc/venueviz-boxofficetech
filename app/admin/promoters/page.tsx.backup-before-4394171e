'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { db } from '@/lib/firebase'
import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs } from 'firebase/firestore'
import PromoterService from '@/lib/services/promoterService'
import { PromoterProfile, PaymentGateway } from '@/lib/types/promoter'
import PaymentGatewaySetup from '@/components/admin/promoters/PaymentGatewaySetup'
import PromoterDocuments from '@/components/admin/promoters/PromoterDocuments'
import PromoterCommissions from '@/components/admin/promoters/PromoterCommissions'
import PromoterEvents from '@/components/admin/promoters/PromoterEvents'
import PromoterOverview from '@/components/admin/promoters/PromoterOverview'
import PromoterProfileForm from '@/components/admin/promoters/PromoterProfileForm'

const MASTER_PROMOTER_ID = 'PAqFLcCQwxUYKr7i8g5t'

export default function PromotersPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [promoterProfile, setPromoterProfile] = useState<PromoterProfile | null>(null)
  const [paymentGateway, setPaymentGateway] = useState<PaymentGateway | null>(null)
  const [isMasterUser, setIsMasterUser] = useState(false)
  const [currentPromoterId, setCurrentPromoterId] = useState<string>('')
  const [allPromoters, setAllPromoters] = useState<any[]>([])
  const [showPromoterSelector, setShowPromoterSelector] = useState(false)

  useEffect(() => {
    console.log('PromotersPage - User:', user)
    if (user) {
      initializePromoter()
    } else {
      setLoading(false)
    }
  }, [user])

  const initializePromoter = async () => {
    try {
      setLoading(true)
      
      // Check if user is master admin
      const isUserMaster = user?.isMaster === true && user?.role === 'admin'
      setIsMasterUser(isUserMaster)
      
      // If master admin, load all promoters
      if (isUserMaster) {
        console.log('Master admin detected - loading all promoters')
        await loadAllPromoters()
        
        // Default to BoxOfficeTech promoter
        setCurrentPromoterId(MASTER_PROMOTER_ID)
        await loadPromoterData(MASTER_PROMOTER_ID)
        return
      }
      
      // For non-master users, find their promoter
      let foundPromoterId = user?.promoterId || ''
      
      if (!foundPromoterId && user?.email) {
        console.log('Searching for promoter by email:', user.email)
        const promotersRef = collection(db, 'promoters')
        const q = query(promotersRef, where('email', '==', user.email))
        const querySnapshot = await getDocs(q)
        
        if (!querySnapshot.empty) {
          foundPromoterId = querySnapshot.docs[0].id
          console.log('Found promoter by email:', foundPromoterId)
        }
      }
      
      // If still no promoter, create one for regular users
      if (!foundPromoterId && user?.uid && !isUserMaster) {
        console.log('Creating new promoter profile')
        const newPromoterRef = doc(collection(db, 'promoters'))
        const newPromoter = {
          email: user.email || '',
          name: user.displayName || user.email?.split('@')[0] || 'New Promoter',
          userId: user.uid,
          createdAt: new Date().toISOString(),
          setupComplete: false,
          setupStep: 'profile',
          active: true
        }
        
        await setDoc(newPromoterRef, newPromoter)
        foundPromoterId = newPromoterRef.id
        console.log('Created new promoter:', foundPromoterId)
      }
      
      if (foundPromoterId) {
        setCurrentPromoterId(foundPromoterId)
        await loadPromoterData(foundPromoterId)
      } else if (!isUserMaster) {
        console.error('Could not find or create promoter')
        setLoading(false)
      }
    } catch (error) {
      console.error('Error initializing promoter:', error)
      setLoading(false)
    }
  }

  const loadAllPromoters = async () => {
    try {
      const promotersRef = collection(db, 'promoters')
      const snapshot = await getDocs(promotersRef)
      const promotersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      console.log('Loaded all promoters:', promotersList.length)
      setAllPromoters(promotersList)
    } catch (error) {
      console.error('Error loading all promoters:', error)
    }
  }

  const loadPromoterData = async (promoterId: string) => {
    try {
      console.log('Loading data for promoter:', promoterId)
      
      const [profile, gateway] = await Promise.all([
        PromoterService.getPromoterProfile(promoterId),
        PromoterService.getPaymentGateway(promoterId)
      ])
      
      console.log('Loaded profile:', profile)
      console.log('Loaded gateway:', gateway)
      
      setPromoterProfile(profile)
      setPaymentGateway(gateway)
      
      // Reset to overview when switching promoters
      if (isMasterUser) {
        setActiveTab('overview')
      } else if (!profile?.setupComplete) {
        if (!profile?.companyName) {
          setActiveTab('settings')
        } else if (!gateway) {
          setActiveTab('payment')
        } else {
          setActiveTab('documents')
        }
      }
    } catch (error) {
      console.error('Error loading promoter data:', error)
    } finally {
      setLoading(false)
    }
  }

  const switchPromoter = async (promoterId: string) => {
    setLoading(true)
    setCurrentPromoterId(promoterId)
    await loadPromoterData(promoterId)
    setShowPromoterSelector(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="bg-red-600/10 border border-red-600/50 rounded-xl p-6 text-center">
          <p className="text-red-400">You must be logged in to view this page</p>
        </div>
      </div>
    )
  }

  if (!currentPromoterId && !isMasterUser) {
    return (
      <div className="p-6">
        <div className="bg-yellow-600/10 border border-yellow-600/50 rounded-xl p-6 text-center">
          <p className="text-yellow-400">No promoter profile found. Please contact support.</p>
        </div>
      </div>
    )
  }

  const isSetupComplete = promoterProfile?.setupComplete && paymentGateway !== null
  const isViewingMasterPromoter = currentPromoterId === MASTER_PROMOTER_ID

  return (
    <div className="p-6">
      {/* Master Admin Promoter Selector */}
      {isMasterUser && (
        <div className="mb-6 p-4 bg-purple-600/10 border border-purple-600/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-purple-400 font-medium">🔑 Platform Admin Mode</span>
              <span className="text-gray-400">|</span>
              <span className="text-white">
                Viewing: <strong>{promoterProfile?.name || promoterProfile?.companyName || 'Loading...'}</strong>
              </span>
            </div>
            <button
              onClick={() => setShowPromoterSelector(!showPromoterSelector)}
              className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 text-white"
            >
              Switch Promoter
            </button>
          </div>
          
          {/* Promoter Selector Dropdown */}
          {showPromoterSelector && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allPromoters.map(promoter => (
                <button
                  key={promoter.id}
                  onClick={() => switchPromoter(promoter.id)}
                  className={`p-3 text-left rounded-lg transition-all ${
                    currentPromoterId === promoter.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  <div className="font-medium">{promoter.name || promoter.companyName || 'Unnamed'}</div>
                  <div className="text-sm opacity-70">{promoter.email}</div>
                  {promoter.id === MASTER_PROMOTER_ID && (
                    <span className="text-xs bg-purple-500/20 px-2 py-1 rounded mt-1 inline-block">
                      Master
                    </span>
                  )}
                </button>
              ))}
              {allPromoters.length === 0 && (
                <p className="text-gray-400 col-span-3">No promoters found</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {promoterProfile?.companyName || promoterProfile?.name || 'Promoter Dashboard'}
            </h1>
            <p className="text-gray-400">
              {isMasterUser ? 'Managing promoter account and settings' : 'Manage your promoter account and settings'}
            </p>
          </div>
          
          {/* Environment Indicator */}
          {paymentGateway && (
            <div className={`px-4 py-2 rounded-lg font-medium ${
              paymentGateway.environment === 'live' 
                ? 'bg-green-600/20 text-green-400 border border-green-600/50' 
                : 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/50'
            }`}>
              {paymentGateway.environment === 'live' ? '✅ Live Mode' : '🧪 Sandbox Mode'}
            </div>
          )}
        </div>

        {/* Current Promoter Badge */}
        {isViewingMasterPromoter && (
          <div className="mt-4 p-3 bg-blue-600/20 border border-blue-600/50 rounded-lg">
            <span className="text-blue-400 font-medium">
              📊 BoxOfficeTech Master Promoter Account
            </span>
          </div>
        )}
      </div>

      {/* Setup Progress - Only show for non-master promoters or when not in master admin mode */}
      {!isSetupComplete && (!isMasterUser || !isViewingMasterPromoter) && (
        <div className="mb-6 p-4 bg-yellow-600/10 border border-yellow-600/50 rounded-lg">
          <h3 className="text-yellow-400 font-medium mb-2">
            {isMasterUser ? 'Promoter Setup Status' : 'Complete Your Setup'}
          </h3>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${
              promoterProfile?.companyName ? 'text-green-400' : 'text-gray-400'
            }`}>
              {promoterProfile?.companyName ? '✅' : '⭕'} Profile
            </div>
            <div className="text-gray-600">→</div>
            <div className="text-gray-400">
              ⭕ Documents
            </div>
            <div className="text-gray-600">→</div>
            <div className={`flex items-center gap-2 ${
              paymentGateway ? 'text-green-400' : 'text-gray-400'
            }`}>
              {paymentGateway ? '✅' : '⭕'} Payment Gateway
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-700 overflow-x-auto">
        {['overview', 'payment', 'documents', 'events', 'commissions', 'settings'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 capitalize transition-all whitespace-nowrap ${
              activeTab === tab
                ? 'border-b-2 border-purple-600 text-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
            {tab === 'payment' && !paymentGateway && (
              <span className="ml-2 text-red-400">!</span>
            )}
          </button>
        ))}
        
        {isMasterUser && (
          <button
            onClick={() => setActiveTab('platform')}
            className={`px-4 py-2 ml-auto transition-all ${
              activeTab === 'platform'
                ? 'border-b-2 border-purple-600 text-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Platform Stats
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <PromoterOverview 
            promoterId={currentPromoterId} 
            isMaster={isViewingMasterPromoter}
          />
        )}
        
        {activeTab === 'payment' && (
          <PaymentGatewaySetup
            promoterId={currentPromoterId}
            currentGateway={paymentGateway}
            isMaster={isViewingMasterPromoter}
            onUpdate={() => loadPromoterData(currentPromoterId)}
          />
        )}
        
        {activeTab === 'documents' && (
          <PromoterDocuments 
            promoterId={currentPromoterId}
          />
        )}
        
        {activeTab === 'events' && (
          <PromoterEvents 
            promoterId={currentPromoterId}
          />
        )}
        
        {activeTab === 'commissions' && (
          <PromoterCommissions 
            promoterId={currentPromoterId}
          />
        )}
        
        {activeTab === 'settings' && (
          <PromoterProfileForm
            profile={promoterProfile}
            onUpdate={() => loadPromoterData(currentPromoterId)}
          />
        )}
        
        {activeTab === 'platform' && isMasterUser && (
          <PlatformAdminStats allPromoters={allPromoters} />
        )}
      </div>
    </div>
  )
}

// Platform Stats Component
function PlatformAdminStats({ allPromoters }: { allPromoters: any[] }) {
  const [stats, setStats] = useState({
    totalPromoters: 0,
    activePromoters: 0,
    totalEvents: 0,
    totalRevenue: 0
  })

  useEffect(() => {
    calculateStats()
  }, [allPromoters])

  const calculateStats = async () => {
    const active = allPromoters.filter(p => p.active !== false).length
    
    // Get all events count
    const eventsRef = collection(db, 'events')
    const eventsSnapshot = await getDocs(eventsRef)
    
    setStats({
      totalPromoters: allPromoters.length,
      activePromoters: active,
      totalEvents: eventsSnapshot.size,
      totalRevenue: 0 // Will be calculated from orders
    })
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Platform Statistics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-black/40 rounded-xl p-6">
          <div className="text-gray-400 text-sm mb-2">Total Promoters</div>
          <div className="text-3xl font-bold">{stats.totalPromoters}</div>
        </div>
        
        <div className="bg-black/40 rounded-xl p-6">
          <div className="text-gray-400 text-sm mb-2">Active Promoters</div>
          <div className="text-3xl font-bold text-green-400">{stats.activePromoters}</div>
        </div>
        
        <div className="bg-black/40 rounded-xl p-6">
          <div className="text-gray-400 text-sm mb-2">Total Events</div>
          <div className="text-3xl font-bold">{stats.totalEvents}</div>
        </div>
        
        <div className="bg-black/40 rounded-xl p-6">
          <div className="text-gray-400 text-sm mb-2">Platform Revenue</div>
          <div className="text-3xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
        </div>
      </div>

      {/* Promoters List */}
      <div className="bg-black/40 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4">All Promoters</h3>
        <div className="space-y-3">
          {allPromoters.map(promoter => (
            <div key={promoter.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <p className="font-medium">{promoter.name || promoter.companyName || 'Unnamed'}</p>
                <p className="text-sm text-gray-400">{promoter.email}</p>
              </div>
              <div className="flex items-center gap-3">
                {promoter.id === 'PAqFLcCQwxUYKr7i8g5t' && (
                  <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-xs">
                    Master
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full text-xs ${
                  promoter.active !== false
                    ? 'bg-green-600/20 text-green-400'
                    : 'bg-gray-600/20 text-gray-400'
                }`}>
                  {promoter.active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
