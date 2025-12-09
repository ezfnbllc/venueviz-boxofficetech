'use client'
import { usePromoterFilterStore } from '@/lib/store/promoterFilterStore'
import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function PromoterFilterDropdown() {
  const { selectedPromoterId, setSelectedPromoterId } = usePromoterFilterStore()
  const [promoters, setPromoters] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPromoters = async () => {
      try {
        const promotersRef = collection(db, 'promoters')
        const q = query(promotersRef, where('active', '==', true))
        const snapshot = await getDocs(q)

        const promotersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        setPromoters(promotersList)
      } catch (error) {
        console.error('Error loading promoters:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPromoters()
  }, [])

  const selectedPromoter = promoters.find(p => p.id === selectedPromoterId)

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="glass-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-slate-700 dark:text-slate-200 font-medium"
        disabled={loading}
      >
        <span>
          {loading ? '⏳ Loading...' :
           selectedPromoterId === 'all'
            ? '🌐 All Promoters'
            : selectedPromoter?.name || 'Select Promoter'}
        </span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-72 glass-card-elevated rounded-xl z-50 max-h-96 overflow-y-auto">
            <div className="p-2">
              <button
                onClick={() => {
                  setSelectedPromoterId('all')
                  setShowDropdown(false)
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${
                  selectedPromoterId === 'all'
                    ? 'glass-btn-accent text-white'
                    : 'glass-btn text-slate-700 dark:text-slate-300'
                }`}
              >
                🌐 All Promoters
              </button>

              {promoters.length > 0 && (
                <>
                  <div className="border-t border-white/10 my-2"></div>
                  {promoters.map((promoter) => (
                    <button
                      key={promoter.id}
                      onClick={() => {
                        setSelectedPromoterId(promoter.id)
                        setShowDropdown(false)
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 ${
                        selectedPromoterId === promoter.id
                          ? 'glass-btn-accent text-white'
                          : 'glass-btn text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {promoter.logo ? (
                        <img src={promoter.logo} alt="" className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/20" />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-blue-500/30">
                          {promoter.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{promoter.name}</p>
                        {promoter.company && (
                          <p className={`text-xs truncate ${selectedPromoterId === promoter.id ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'}`}>{promoter.company}</p>
                        )}
                      </div>
                      {promoter.brandingType === 'advanced' && (
                        <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${
                          selectedPromoterId === promoter.id
                            ? 'bg-white/20 text-white'
                            : 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                        }`}>
                          Premium
                        </span>
                      )}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
