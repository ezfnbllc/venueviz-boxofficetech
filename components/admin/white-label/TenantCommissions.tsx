'use client'

import { useState, useEffect } from 'react'
import PromoterService from '@/lib/services/promoterService'
import { Commission } from '@/lib/types/promoter'

interface TenantCommissionsProps {
  tenantId: string
}

export default function TenantCommissions({ tenantId }: TenantCommissionsProps) {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCommissions()
  }, [tenantId])

  const loadCommissions = async () => {
    try {
      const data = await PromoterService.getCommissions(tenantId)
      setCommissions(data)
    } catch (error) {
      console.error('Error loading commissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalOwed = commissions
    .filter(c => c.paymentStatus === 'pending')
    .reduce((sum, c) => sum + c.amountOwed, 0)

  if (loading) {
    return <div className="animate-pulse">Loading commissions...</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-yellow-600/10 border border-yellow-600/50 rounded-xl p-4">
        <div className="text-yellow-400 text-sm mb-2">Total Commission Owed</div>
        <div className="text-3xl font-bold text-yellow-400">${totalOwed.toLocaleString()}</div>
      </div>

      <div className="bg-black/40 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-3 text-left text-sm">Event</th>
              <th className="px-6 py-3 text-left text-sm">Sales</th>
              <th className="px-6 py-3 text-left text-sm">Commission</th>
              <th className="px-6 py-3 text-left text-sm">Status</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map(c => (
              <tr key={c.id} className="border-t border-gray-800">
                <td className="px-6 py-4 text-sm">{c.eventName}</td>
                <td className="px-6 py-4 text-sm">${c.totalSales.toLocaleString()}</td>
                <td className="px-6 py-4 text-sm">${c.amountOwed.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    c.paymentStatus === 'paid'
                      ? 'bg-green-600/20 text-green-400'
                      : 'bg-yellow-600/20 text-yellow-400'
                  }`}>
                    {c.paymentStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
