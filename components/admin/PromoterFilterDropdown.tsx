'use client'

import { useState, useEffect, useRef } from 'react'
import { usePromoterFilter } from '@/lib/store/promoterFilterStore'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const MASTER_PROMOTER_ID = 'PAqFLcCQwxUYKr7i8g5t'

interface PromoterFilterDropdownProps {
  isMasterAdmin: boolean
  currentPromoterId?: string
  onFilterChange?: (promoterIds: string[]) => void
}

export default function PromoterFilterDropdown({ 
  isMasterAdmin, 
  currentPromoterId,
  onFilterChange 
}: PromoterFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const {
    selectedPromoterIds,
    isAllSelected,
    availablePromoters,
    setAvailablePromoters,
    selectAll,
    clearAll,
    togglePromoter
  } = usePromoterFilter()

  useEffect(() => {
    const loadPromoters = async () => {
      if (!isMasterAdmin) {
        setLoading(false)
        return
      }

      try {
        const promotersRef = collection(db, 'promoters')
        const q = query(promotersRef, where('active', '==', true))
        const snapshot = await getDocs(q)
        
        const promoters = snapshot.docs.map(doc => ({
          id: doc.id,
          companyName: doc.data().companyName || doc.data().name || 'Unnamed Promoter',
          active: doc.data().active,
          isMaster: doc.id === MASTER_PROMOTER_ID
        }))

        promoters.sort((a, b) => {
          if (a.isMaster) return -1
          if (b.isMaster) return 1
          return a.companyName.localeCompare(b.companyName)
        })

        setAvailablePromoters(promoters)
      } catch (error) {
        console.error('Error loading promoters:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPromoters()
  }, [isMasterAdmin, setAvailablePromoters])

  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(selectedPromoterIds)
    }
  }, [selectedPromoterIds, onFilterChange])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!isMasterAdmin) {
    return null
  }

  const filteredPromoters = availablePromoters.filter(p =>
    p.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedCount = selectedPromoterIds.length
  const totalCount = availablePromoters.length

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button - Compact */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg border border-gray-700 transition-all"
        title={isAllSelected ? 'All Promoters' : `${selectedCount} Promoters`}
      >
        <span className="text-xs font-medium">
          🎯 {isAllSelected ? 'All' : selectedCount}
        </span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu - Compact */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-800">
            <h3 className="font-semibold text-white text-sm mb-2">Filter by Promoter</h3>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 bg-white/10 border border-gray-700 rounded text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="p-2 border-b border-gray-800 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => e.target.checked ? selectAll() : clearAll()}
                className="w-3 h-3 rounded"
              />
              <span className="text-xs font-medium text-white">Select All</span>
            </label>
            <button
              onClick={clearAll}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Clear
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-gray-400 text-xs">Loading...</div>
            ) : filteredPromoters.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-xs">No promoters found</div>
            ) : (
              <div className="p-1">
                {filteredPromoters.map(promoter => (
                  <label
                    key={promoter.id}
                    className="flex items-center gap-2 p-2 hover:bg-white/5 rounded cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPromoterIds.includes(promoter.id)}
                      onChange={() => togglePromoter(promoter.id)}
                      className="w-3 h-3 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white group-hover:text-purple-400 truncate">
                        {promoter.companyName}
                        {promoter.isMaster && (
                          <span className="ml-1 text-[10px] bg-purple-600/20 text-purple-400 px-1.5 py-0.5 rounded-full">
                            ⭐
                          </span>
                        )}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="p-2 border-t border-gray-800 bg-gray-800/50">
            <p className="text-[10px] text-gray-400 text-center">
              {selectedCount} of {totalCount} selected
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
