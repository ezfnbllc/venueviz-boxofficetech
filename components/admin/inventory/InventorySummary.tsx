'use client'

import type { EventInventorySummary } from '@/lib/types/inventory'

interface InventorySummaryProps {
  inventory: EventInventorySummary
}

export default function InventorySummary({ inventory }: InventorySummaryProps) {
  const {
    totalCapacity,
    totalSold,
    totalBlocked,
    totalHeld,
    totalAvailable,
  } = inventory

  const soldPercentage = totalCapacity > 0 ? (totalSold / totalCapacity) * 100 : 0
  const blockedPercentage = totalCapacity > 0 ? (totalBlocked / totalCapacity) * 100 : 0
  const heldPercentage = totalCapacity > 0 ? (totalHeld / totalCapacity) * 100 : 0
  const availablePercentage = totalCapacity > 0 ? (totalAvailable / totalCapacity) * 100 : 0

  const cards = [
    {
      label: 'Total Capacity',
      value: totalCapacity.toLocaleString(),
      color: 'bg-gray-100 text-gray-800',
      icon: (
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      label: 'Sold',
      value: totalSold.toLocaleString(),
      percentage: soldPercentage,
      color: 'bg-green-100 text-green-800',
      barColor: 'bg-green-500',
      icon: (
        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Blocked',
      value: totalBlocked.toLocaleString(),
      percentage: blockedPercentage,
      color: 'bg-yellow-100 text-yellow-800',
      barColor: 'bg-yellow-500',
      icon: (
        <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    {
      label: 'Available',
      value: totalAvailable.toLocaleString(),
      percentage: availablePercentage,
      color: 'bg-blue-100 text-blue-800',
      barColor: 'bg-blue-500',
      icon: (
        <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{card.value}</p>
              {card.percentage !== undefined && (
                <p className="mt-1 text-sm text-gray-500">
                  {card.percentage.toFixed(1)}% of capacity
                </p>
              )}
            </div>
            <div className={`p-3 rounded-full ${card.color}`}>
              {card.icon}
            </div>
          </div>
          {card.barColor && card.percentage !== undefined && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${card.barColor} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${Math.min(card.percentage, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Held indicator (if any) */}
      {totalHeld > 0 && (
        <div className="col-span-full">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center">
            <svg className="w-5 h-5 text-orange-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-orange-800">
              <strong>{totalHeld.toLocaleString()}</strong> tickets currently held in checkout
              (auto-releases in 5 minutes if not purchased)
            </span>
          </div>
        </div>
      )}

      {/* Overall progress bar */}
      <div className="col-span-full bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Inventory Breakdown</h3>
        <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden flex">
          {soldPercentage > 0 && (
            <div
              className="bg-green-500 h-full transition-all duration-300"
              style={{ width: `${soldPercentage}%` }}
              title={`Sold: ${totalSold} (${soldPercentage.toFixed(1)}%)`}
            />
          )}
          {blockedPercentage > 0 && (
            <div
              className="bg-yellow-500 h-full transition-all duration-300"
              style={{ width: `${blockedPercentage}%` }}
              title={`Blocked: ${totalBlocked} (${blockedPercentage.toFixed(1)}%)`}
            />
          )}
          {heldPercentage > 0 && (
            <div
              className="bg-orange-500 h-full transition-all duration-300"
              style={{ width: `${heldPercentage}%` }}
              title={`Held: ${totalHeld} (${heldPercentage.toFixed(1)}%)`}
            />
          )}
          {availablePercentage > 0 && (
            <div
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${availablePercentage}%` }}
              title={`Available: ${totalAvailable} (${availablePercentage.toFixed(1)}%)`}
            />
          )}
        </div>
        <div className="flex justify-between mt-3 text-xs text-gray-500">
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-green-500 mr-1"></span>
            Sold
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></span>
            Blocked
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-orange-500 mr-1"></span>
            Held
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
            Available
          </div>
        </div>
      </div>
    </div>
  )
}
