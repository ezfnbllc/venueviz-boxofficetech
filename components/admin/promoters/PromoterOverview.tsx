'use client'

import { useState, useEffect } from 'react'
import PromoterService from '@/lib/services/promoterService'

interface PromoterOverviewProps {
  promoterId: string
  isMaster: boolean
}

export default function PromoterOverview({ promoterId, isMaster }: PromoterOverviewProps) {
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalCommission: 0,
    pendingCommission: 0,
    totalTicketsSold: 0,
    totalRevenue: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [promoterId])

  const loadStats = async () => {
    try {
      const data = await PromoterService.getPromoterStats(promoterId)
      setStats(data)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse">Loading stats...</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-black/40 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Total Events</div>
          <div className="text-2xl font-bold">{stats.totalEvents}</div>
        </div>
        
        <div className="bg-black/40 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Active Events</div>
          <div className="text-2xl font-bold text-green-400">{stats.activeEvents}</div>
        </div>
        
        <div className="bg-black/40 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Tickets Sold</div>
          <div className="text-2xl font-bold">{stats.totalTicketsSold.toLocaleString()}</div>
        </div>
        
        <div className="bg-black/40 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Total Revenue</div>
          <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
        </div>
        
        <div className="bg-black/40 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Commission Owed</div>
          <div className="text-2xl font-bold text-yellow-400">
            ${stats.pendingCommission.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-black/40 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Total Commission</div>
          <div className="text-2xl font-bold">${stats.totalCommission.toLocaleString()}</div>
        </div>
      </div>
    </div>
  )
}
