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
        className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-all border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white"
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
          <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto">
            <div className="p-2">
              <button
                onClick={() => {
                  setSelectedPromoterId('all')
                  setShowDropdown(false)
                }}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                  selectedPromoterId === 'all'
                    ? 'bg-accent-600 text-white'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                🌐 All Promoters
              </button>

              {promoters.length > 0 && (
                <>
                  <div className="border-t border-slate-200 dark:border-slate-700 my-2"></div>
                  {promoters.map((promoter) => (
                    <button
                      key={promoter.id}
                      onClick={() => {
                        setSelectedPromoterId(promoter.id)
                        setShowDropdown(false)
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-3 ${
                        selectedPromoterId === promoter.id
                          ? 'bg-accent-600 text-white'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {promoter.logo ? (
                        <img src={promoter.logo} alt="" className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 bg-accent-600 rounded flex items-center justify-center text-sm font-bold text-white">
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
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          selectedPromoterId === promoter.id
                            ? 'bg-white/20 text-white'
                            : 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400'
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
