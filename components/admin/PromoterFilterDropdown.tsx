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
        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/10 text-sm"
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
          <div className="absolute right-0 mt-2 w-72 bg-gray-800 border border-white/10 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto">
            <div className="p-2">
              <button
                onClick={() => {
                  setSelectedPromoterId('all')
                  setShowDropdown(false)
                }}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                  selectedPromoterId === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'hover:bg-white/10 text-gray-300'
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
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-3 ${
                        selectedPromoterId === promoter.id
                          ? 'bg-purple-600 text-white'
                          : 'hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      {promoter.logo ? (
                        <img src={promoter.logo} alt="" className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded flex items-center justify-center text-sm font-bold">
                          {promoter.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{promoter.name}</p>
                        {promoter.company && (
                          <p className="text-xs text-gray-400 truncate">{promoter.company}</p>
                        )}
                      </div>
                      {promoter.brandingType === 'advanced' && (
                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
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
