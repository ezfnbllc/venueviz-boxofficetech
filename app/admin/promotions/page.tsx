'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { collection, getDocs, doc, deleteDoc, updateDoc, query, where } from 'firebase/firestore'
import { useAuth } from '@/lib/useAuth'

interface Promotion {
  id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  maxUses?: number
  usedCount: number
  active: boolean
  description?: string
  createdAt?: string
}

interface EventPromotion extends Promotion {
  eventId: string
  eventName: string
  promoterId?: string
}

export default function PromotionsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [masterPromotions, setMasterPromotions] = useState<Promotion[]>([])
  const [eventPromotions, setEventPromotions] = useState<EventPromotion[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'master' | 'event'>('master')
  const [stats, setStats] = useState({
    totalMaster: 0,
    totalEvent: 0,
    activeMaster: 0,
    activeEvent: 0,
    totalUses: 0
  })

  const isMasterAdmin = user?.role === 'admin' && user?.isMaster === true

  useEffect(() => {
    if (user) {
      loadPromotions()
    }
  }, [user])

  const loadPromotions = async () => {
    try {
      // Load master promotions
      const promoSnapshot = await getDocs(collection(db, 'promotions'))
      const masterPromos: Promotion[] = promoSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Promotion))

      // Load event-specific promotions
      let eventsQuery = collection(db, 'events')
      
      // If not master admin, filter by promoter
      if (!isMasterAdmin && user?.promoterId) {
        eventsQuery = query(collection(db, 'events'), where('promoter.promoterId', '==', user.promoterId)) as any
      }
      
      const eventsSnapshot = await getDocs(eventsQuery)
      const eventPromos: EventPromotion[] = []
      
      eventsSnapshot.docs.forEach(eventDoc => {
        const eventData = eventDoc.data()
        const eventPromotions = eventData.promotions?.eventPromotions || []
        
        eventPromotions.forEach((promo: any) => {
          eventPromos.push({
            ...promo,
            eventId: eventDoc.id,
            eventName: eventData.name || 'Unnamed Event',
            promoterId: eventData.promoter?.promoterId,
            active: promo.active !== false
          })
        })
      })

      // Calculate stats
      const activeMaster = masterPromos.filter(p => p.active !== false).length
      const activeEvent = eventPromos.filter(p => p.active !== false).length
      const totalUses = [...masterPromos, ...eventPromos].reduce((sum, p) => sum + (p.usedCount || 0), 0)

      setStats({
        totalMaster: masterPromos.length,
        totalEvent: eventPromos.length,
        activeMaster,
        activeEvent,
        totalUses
      })

      setMasterPromotions(masterPromos)
      setEventPromotions(eventPromos)
      setLoading(false)
    } catch (error) {
      console.error('Error loading promotions:', error)
      setLoading(false)
    }
  }

  const handleDeleteMaster = async (promoId: string) => {
    if (confirm('Delete this promotion?')) {
      try {
        await deleteDoc(doc(db, 'promotions', promoId))
        await loadPromotions()
      } catch (error) {
        console.error('Error deleting promotion:', error)
      }
    }
  }

  const handleDeleteEvent = async (eventId: string, promoId: string) => {
    if (confirm('Remove this promotion from the event?')) {
      try {
        const eventDoc = await getDocs(query(collection(db, 'events'), where('__name__', '==', eventId)))
        if (!eventDoc.empty) {
          const eventData = eventDoc.docs[0].data()
          const updatedPromos = (eventData.promotions?.eventPromotions || []).filter((p: any) => p.id !== promoId)
          
          await updateDoc(doc(db, 'events', eventId), {
            'promotions.eventPromotions': updatedPromos
          })
          
          await loadPromotions()
        }
      } catch (error) {
        console.error('Error removing event promotion:', error)
      }
    }
  }

  const toggleActive = async (promoId: string, currentActive: boolean) => {
    try {
      await updateDoc(doc(db, 'promotions', promoId), {
        active: !currentActive
      })
      await loadPromotions()
    } catch (error) {
      console.error('Error toggling promotion:', error)
    }
  }

  const formatDiscount = (promo: Promotion | EventPromotion) => {
    if (!promo.value) return 'No discount'
    return promo.type === 'percentage' 
      ? `${promo.value}% OFF` 
      : `$${promo.value} OFF`
  }

  const getUsagePercentage = (promo: Promotion | EventPromotion) => {
    if (!promo.maxUses) return 0
    return Math.min(100, (promo.usedCount / promo.maxUses) * 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
      </div>
    )
  }

  const displayPromotions = activeTab === 'master' ? masterPromotions : eventPromotions

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Promotions</h1>
          <p className="text-gray-400">Manage discount codes and special offers</p>
        </div>
        <button
          onClick={() => router.push('/admin/promotions/new')}
          className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700"
        >
          + New Promotion
        </button>
      </div>

      {/* User Status */}
      <div className="mb-6 p-3 bg-white/5 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Viewing as:</span>
          <span className="text-sm font-medium">{user?.email}</span>
          {isMasterAdmin ? (
            <span className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded-full">
              🔑 Master Admin (All Promotions)
            </span>
          ) : (
            <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded-full">
              Promoter User
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-black/40 backdrop-blur-xl rounded-xl p-4">
          <div className="text-gray-400 text-xs mb-1">Master Promos</div>
          <div className="text-2xl font-bold">{stats.totalMaster}</div>
          <div className="text-xs text-green-400">{stats.activeMaster} active</div>
        </div>
        
        <div className="bg-black/40 backdrop-blur-xl rounded-xl p-4">
          <div className="text-gray-400 text-xs mb-1">Event Promos</div>
          <div className="text-2xl font-bold">{stats.totalEvent}</div>
          <div className="text-xs text-green-400">{stats.activeEvent} active</div>
        </div>
        
        <div className="bg-black/40 backdrop-blur-xl rounded-xl p-4">
          <div className="text-gray-400 text-xs mb-1">Total Active</div>
          <div className="text-2xl font-bold text-green-400">
            {stats.activeMaster + stats.activeEvent}
          </div>
        </div>
        
        <div className="bg-black/40 backdrop-blur-xl rounded-xl p-4">
          <div className="text-gray-400 text-xs mb-1">Total Uses</div>
          <div className="text-2xl font-bold">{stats.totalUses}</div>
        </div>
        
        <div className="bg-black/40 backdrop-blur-xl rounded-xl p-4">
          <div className="text-gray-400 text-xs mb-1">Total Promos</div>
          <div className="text-2xl font-bold text-purple-400">
            {stats.totalMaster + stats.totalEvent}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('master')}
          className={`px-6 py-2 rounded-lg transition-all ${
            activeTab === 'master'
              ? 'bg-purple-600 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          Master Promotions ({stats.totalMaster})
        </button>
        <button
          onClick={() => setActiveTab('event')}
          className={`px-6 py-2 rounded-lg transition-all ${
            activeTab === 'event'
              ? 'bg-purple-600 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          Event-Specific ({stats.totalEvent})
        </button>
      </div>

      {/* Promotions Grid */}
      {displayPromotions.length === 0 ? (
        <div className="text-center py-12 bg-black/40 rounded-xl">
          <p className="text-gray-400">
            {activeTab === 'master' 
              ? 'No master promotions found. Create your first promotion!'
              : 'No event-specific promotions found.'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayPromotions.map((promo) => (
            <div key={promo.id} className="bg-black/40 backdrop-blur-xl rounded-xl p-6">
              {/* Event Badge for Event Promos */}
              {activeTab === 'event' && 'eventName' in promo && (
                <div className="mb-3 pb-3 border-b border-white/10">
                  <div className="text-xs text-gray-400">Event</div>
                  <div className="text-sm font-medium text-purple-300 truncate">
                    {promo.eventName}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">{promo.code || 'NO CODE'}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  promo.active !== false
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-600 text-white'
                }`}>
                  {promo.active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mb-4">
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  {formatDiscount(promo)}
                </div>
                {promo.description && (
                  <p className="text-sm text-gray-400">{promo.description}</p>
                )}
              </div>

              {/* Usage Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Usage</span>
                  <span>
                    {promo.usedCount || 0} / {promo.maxUses || '∞'}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${getUsagePercentage(promo)}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {activeTab === 'master' ? (
                  <>
                    <button
                      onClick={() => router.push(`/admin/promotions/edit/${promo.id}`)}
                      className="flex-1 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(promo.id, promo.active)}
                      className={`px-4 py-2 rounded-lg ${
                        promo.active !== false
                          ? 'bg-yellow-600 hover:bg-yellow-700'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {promo.active !== false ? 'Pause' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleDeleteMaster(promo.id)}
                      className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => router.push(`/admin/events/edit/${(promo as EventPromotion).eventId}`)}
                      className="flex-1 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      Edit Event
                    </button>
                    <button
                      onClick={() => handleDeleteEvent((promo as EventPromotion).eventId, promo.id)}
                      className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
