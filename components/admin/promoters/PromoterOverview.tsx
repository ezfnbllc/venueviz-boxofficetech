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
    return <div className="animate-pulse text-secondary-contrast">Loading stats...</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="stat-card rounded-xl p-4">
          <div className="text-xs text-secondary-contrast mb-1 font-medium">Total Events</div>
          <div className="text-2xl font-bold text-primary-contrast">{stats.totalEvents}</div>
        </div>

        <div className="stat-card rounded-xl p-4">
          <div className="text-xs text-secondary-contrast mb-1 font-medium">Active Events</div>
          <div className="text-2xl font-bold text-money">{stats.activeEvents}</div>
        </div>

        <div className="stat-card rounded-xl p-4">
          <div className="text-xs text-secondary-contrast mb-1 font-medium">Tickets Sold</div>
          <div className="text-2xl font-bold text-primary-contrast">{stats.totalTicketsSold.toLocaleString()}</div>
        </div>

        <div className="stat-card rounded-xl p-4">
          <div className="text-xs text-secondary-contrast mb-1 font-medium">Total Revenue</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">${stats.totalRevenue.toLocaleString()}</div>
        </div>

        <div className="stat-card rounded-xl p-4">
          <div className="text-xs text-secondary-contrast mb-1 font-medium">Commission Owed</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            ${stats.pendingCommission.toLocaleString()}
          </div>
        </div>

        <div className="stat-card rounded-xl p-4">
          <div className="text-xs text-secondary-contrast mb-1 font-medium">Total Commission</div>
          <div className="text-2xl font-bold text-primary-contrast">${stats.totalCommission.toLocaleString()}</div>
        </div>
      </div>
    </div>
  )
}
