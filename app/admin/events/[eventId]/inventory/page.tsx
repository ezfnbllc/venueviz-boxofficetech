'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { EventInventory, TierInventory } from '@/lib/types/inventory'

export default function InventoryManagementPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.eventId as string

  const [inventory, setInventory] = useState<EventInventory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'ga' | 'reserved' | 'logs'>('ga')

  useEffect(() => {
    const loadInventory = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/inventory`)
        if (!res.ok) {
          throw new Error('Failed to load inventory')
        }
        const data = await res.json()
        setInventory(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load inventory')
      } finally {
        setLoading(false)
      }
    }

    if (eventId) {
      loadInventory()
    }
  }, [eventId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-accent-500"></div>
      </div>
    )
  }

  if (error || !inventory) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">{error || 'Inventory not found'}</p>
          <Link href="/admin/events" className="text-accent-600 hover:underline mt-2 inline-block">
            &larr; Back to Events
          </Link>
        </div>
      </div>
    )
  }

  const soldPercentage = inventory.totalCapacity > 0
    ? Math.round((inventory.totalSold / inventory.totalCapacity) * 100)
    : 0

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/events"
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          &larr; Back to Events
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {inventory.eventName}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Inventory Management</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          label="Total Capacity"
          value={inventory.totalCapacity}
          icon="🎫"
          color="slate"
        />
        <SummaryCard
          label="Sold"
          value={inventory.totalSold}
          subtext={`${soldPercentage}%`}
          icon="✅"
          color="green"
        />
        <SummaryCard
          label="Blocked"
          value={inventory.totalBlocked}
          icon="🔒"
          color="orange"
        />
        <SummaryCard
          label="Available"
          value={inventory.totalAvailable}
          icon="🎯"
          color="blue"
        />
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 mb-6">
        <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
          <span>Sales Progress</span>
          <span>{inventory.totalSold} of {inventory.totalCapacity} tickets sold</span>
        </div>
        <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full flex">
            {/* Sold portion */}
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${(inventory.totalSold / inventory.totalCapacity) * 100}%` }}
            />
            {/* Blocked portion */}
            <div
              className="bg-orange-500 transition-all"
              style={{ width: `${(inventory.totalBlocked / inventory.totalCapacity) * 100}%` }}
            />
            {/* Held portion */}
            <div
              className="bg-yellow-500 transition-all"
              style={{ width: `${(inventory.totalHeld / inventory.totalCapacity) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span> Sold
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-orange-500 rounded-full"></span> Blocked
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-yellow-500 rounded-full"></span> Held
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-slate-300 dark:bg-slate-600 rounded-full"></span> Available
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <TabButton
            active={activeTab === 'ga'}
            onClick={() => setActiveTab('ga')}
          >
            GA Inventory
          </TabButton>
          <TabButton
            active={activeTab === 'reserved'}
            onClick={() => setActiveTab('reserved')}
          >
            Reserved Seating
          </TabButton>
          <TabButton
            active={activeTab === 'logs'}
            onClick={() => setActiveTab('logs')}
          >
            Activity Log
          </TabButton>
        </div>

        <div className="p-6">
          {activeTab === 'ga' && (
            <GAInventoryTable tiers={inventory.tiers} />
          )}
          {activeTab === 'reserved' && (
            <ReservedSeatingPlaceholder />
          )}
          {activeTab === 'logs' && (
            <ActivityLogPlaceholder />
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  subtext,
  icon,
  color,
}: {
  label: string
  value: number
  subtext?: string
  icon: string
  color: 'slate' | 'green' | 'orange' | 'blue'
}) {
  const colorClasses = {
    slate: 'bg-slate-100 dark:bg-slate-700/50',
    green: 'bg-green-100 dark:bg-green-900/30',
    orange: 'bg-orange-100 dark:bg-orange-900/30',
    blue: 'bg-blue-100 dark:bg-blue-900/30',
  }

  return (
    <div className={`${colorClasses[color]} rounded-xl p-4`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {subtext && (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded">
            {subtext}
          </span>
        )}
      </div>
      <div className="mt-2">
        <div className="text-2xl font-bold text-slate-900 dark:text-white">
          {value.toLocaleString()}
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 text-sm font-medium transition-colors ${
        active
          ? 'text-accent-600 border-b-2 border-accent-600'
          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  )
}

function GAInventoryTable({ tiers }: { tiers: TierInventory[] }) {
  if (tiers.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        No ticket tiers configured for this event.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
            <th className="pb-3 font-medium">Tier</th>
            <th className="pb-3 font-medium text-right">Price</th>
            <th className="pb-3 font-medium text-right">Capacity</th>
            <th className="pb-3 font-medium text-right">Sold</th>
            <th className="pb-3 font-medium text-right">Blocked</th>
            <th className="pb-3 font-medium text-right">Held</th>
            <th className="pb-3 font-medium text-right">Available</th>
            <th className="pb-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier) => {
            const soldPercent = tier.capacity > 0
              ? Math.round((tier.sold / tier.capacity) * 100)
              : 0
            return (
              <tr
                key={tier.tierId}
                className="border-b border-slate-100 dark:border-slate-700/50 last:border-0"
              >
                <td className="py-4">
                  <div className="font-medium text-slate-900 dark:text-white">
                    {tier.tierName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {soldPercent}% sold
                  </div>
                </td>
                <td className="py-4 text-right text-slate-600 dark:text-slate-300">
                  {tier.price ? `$${tier.price.toFixed(2)}` : '-'}
                </td>
                <td className="py-4 text-right text-slate-900 dark:text-white font-medium">
                  {tier.capacity.toLocaleString()}
                </td>
                <td className="py-4 text-right text-green-600 dark:text-green-400">
                  {tier.sold.toLocaleString()}
                </td>
                <td className="py-4 text-right text-orange-600 dark:text-orange-400">
                  {tier.blocked.toLocaleString()}
                </td>
                <td className="py-4 text-right text-yellow-600 dark:text-yellow-400">
                  {tier.held.toLocaleString()}
                </td>
                <td className="py-4 text-right text-blue-600 dark:text-blue-400 font-medium">
                  {tier.available.toLocaleString()}
                </td>
                <td className="py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded transition-colors"
                      title="Block tickets"
                    >
                      Block
                    </button>
                    <button
                      className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded transition-colors"
                      title="Add capacity"
                    >
                      +
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ReservedSeatingPlaceholder() {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-4">🪑</div>
      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
        Reserved Seating Management
      </h3>
      <p className="text-slate-500 dark:text-slate-400">
        Reserved seating inventory management will be available in a future update.
      </p>
    </div>
  )
}

function ActivityLogPlaceholder() {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-4">📋</div>
      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
        Activity Log
      </h3>
      <p className="text-slate-500 dark:text-slate-400">
        Inventory activity logging will be available in a future update.
      </p>
    </div>
  )
}
