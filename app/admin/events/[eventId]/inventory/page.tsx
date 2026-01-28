'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { EventInventory, TierInventory } from '@/lib/types/inventory'

// Dynamic import for the seating chart to avoid SSR issues
const AdminSeatingChart = dynamic(
  () => import('@/components/admin/inventory/AdminSeatingChart'),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent-500"></div></div> }
)

export default function InventoryManagementPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.eventId as string

  const [inventory, setInventory] = useState<EventInventory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'ga' | 'reserved' | 'logs'>('ga')

  // Reserved seating state
  const [seatingLayout, setSeatingLayout] = useState<any>(null)
  const [soldSeats, setSoldSeats] = useState<string[]>([])
  const [blockedSeats, setBlockedSeats] = useState<string[]>([])
  const [loadingSeats, setLoadingSeats] = useState(false)

  // Modal state
  const [blockModal, setBlockModal] = useState<{ open: boolean; tier: TierInventory | null }>({ open: false, tier: null })
  const [capacityModal, setCapacityModal] = useState<{ open: boolean; tier: TierInventory | null }>({ open: false, tier: null })

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

  const loadSeatingData = useCallback(async () => {
    setLoadingSeats(true)
    try {
      // Load event to get seating layout
      const eventRes = await fetch(`/api/events/${eventId}`)
      if (eventRes.ok) {
        const eventData = await eventRes.json()
        // Check for layout (from event API) or seatingLayout (alternative field name)
        if (eventData.layout) {
          setSeatingLayout(eventData.layout)
        } else if (eventData.seatingLayout) {
          setSeatingLayout(eventData.seatingLayout)
        }
      }

      // Load seat inventory (sold and blocked)
      const seatsRes = await fetch(`/api/events/${eventId}/inventory/seats`)
      if (seatsRes.ok) {
        const seatsData = await seatsRes.json()
        setSoldSeats(seatsData.soldSeats || [])
        setBlockedSeats(seatsData.blockedSeats || [])
      }
    } catch (err) {
      console.error('Error loading seating data:', err)
    } finally {
      setLoadingSeats(false)
    }
  }, [eventId])

  const handleBlockSeats = async (seatIds: string[], reason: string) => {
    const res = await fetch(`/api/events/${eventId}/inventory/seats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatIds, reason }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to block seats')
    }
    // Refresh seat data
    await loadSeatingData()
  }

  const handleUnblockSeats = async (seatIds: string[]) => {
    const res = await fetch(`/api/events/${eventId}/inventory/seats`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatIds }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to unblock seats')
    }
    // Refresh seat data
    await loadSeatingData()
  }

  useEffect(() => {
    if (eventId) {
      loadInventory()
      loadSeatingData()
    }
  }, [eventId, loadSeatingData])

  const handleBlockSubmit = async (tierId: string, quantity: number, reason: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}/inventory/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId, quantity, reason }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to block tickets')
      }
      setBlockModal({ open: false, tier: null })
      loadInventory() // Refresh
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to block tickets')
    }
  }

  const handleCapacitySubmit = async (tierId: string, adjustment: number, reason: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}/inventory/capacity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId, adjustment, reason }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to adjust capacity')
      }
      setCapacityModal({ open: false, tier: null })
      loadInventory() // Refresh
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to adjust capacity')
    }
  }

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
            <GAInventoryTable
              tiers={inventory.tiers}
              onBlock={(tier) => setBlockModal({ open: true, tier })}
              onAdjustCapacity={(tier) => setCapacityModal({ open: true, tier })}
            />
          )}
          {activeTab === 'reserved' && (
            <ReservedSeatingSection
              layout={seatingLayout}
              eventId={eventId}
              soldSeats={soldSeats}
              blockedSeats={blockedSeats}
              loading={loadingSeats}
              onBlockSeats={handleBlockSeats}
              onUnblockSeats={handleUnblockSeats}
            />
          )}
          {activeTab === 'logs' && (
            <ActivityLogPlaceholder />
          )}
        </div>
      </div>

      {/* Block Tickets Modal */}
      {blockModal.open && blockModal.tier && (
        <BlockTicketsModal
          tier={blockModal.tier}
          onClose={() => setBlockModal({ open: false, tier: null })}
          onSubmit={handleBlockSubmit}
        />
      )}

      {/* Adjust Capacity Modal */}
      {capacityModal.open && capacityModal.tier && (
        <AdjustCapacityModal
          tier={capacityModal.tier}
          onClose={() => setCapacityModal({ open: false, tier: null })}
          onSubmit={handleCapacitySubmit}
        />
      )}
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

function GAInventoryTable({
  tiers,
  onBlock,
  onAdjustCapacity,
}: {
  tiers: TierInventory[]
  onBlock: (tier: TierInventory) => void
  onAdjustCapacity: (tier: TierInventory) => void
}) {
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
                      onClick={() => onBlock(tier)}
                      className="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded transition-colors"
                      title="Block tickets"
                    >
                      Block
                    </button>
                    <button
                      onClick={() => onAdjustCapacity(tier)}
                      className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded transition-colors"
                      title="Adjust capacity"
                    >
                      +/-
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

function BlockTicketsModal({
  tier,
  onClose,
  onSubmit,
}: {
  tier: TierInventory
  onClose: () => void
  onSubmit: (tierId: string, quantity: number, reason: string) => void
}) {
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (quantity < 1 || quantity > tier.available) {
      alert(`Quantity must be between 1 and ${tier.available}`)
      return
    }
    if (!reason.trim()) {
      alert('Please provide a reason for blocking')
      return
    }
    setSubmitting(true)
    await onSubmit(tier.tierId, quantity, reason)
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Block Tickets - {tier.tierName}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Quantity to Block
            </label>
            <input
              type="number"
              min={1}
              max={tier.available}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {tier.available} tickets available to block
            </p>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
            >
              <option value="">Select a reason...</option>
              <option value="VIP Reserve">VIP Reserve</option>
              <option value="Promoter Hold">Promoter Hold</option>
              <option value="Production Hold">Production Hold</option>
              <option value="Comp Tickets">Comp Tickets</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || quantity < 1 || !reason}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded-lg transition-colors"
            >
              {submitting ? 'Blocking...' : 'Block Tickets'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AdjustCapacityModal({
  tier,
  onClose,
  onSubmit,
}: {
  tier: TierInventory
  onClose: () => void
  onSubmit: (tierId: string, adjustment: number, reason: string) => void
}) {
  const [adjustment, setAdjustment] = useState(0)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const newCapacity = tier.capacity + adjustment
  const minCapacity = tier.sold + tier.blocked // Can't reduce below sold + blocked

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (adjustment === 0) {
      alert('Please enter an adjustment amount')
      return
    }
    if (newCapacity < minCapacity) {
      alert(`Cannot reduce capacity below ${minCapacity} (sold: ${tier.sold}, blocked: ${tier.blocked})`)
      return
    }
    if (!reason.trim()) {
      alert('Please provide a reason for the adjustment')
      return
    }
    setSubmitting(true)
    await onSubmit(tier.tierId, adjustment, reason)
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Adjust Capacity - {tier.tierName}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Current Capacity:</span>
              <span className="font-medium text-slate-900 dark:text-white">{tier.capacity}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-slate-600 dark:text-slate-400">Min Capacity (sold + blocked):</span>
              <span className="font-medium text-slate-900 dark:text-white">{minCapacity}</span>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Adjustment (+/-)
            </label>
            <input
              type="number"
              value={adjustment}
              onChange={(e) => setAdjustment(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              placeholder="e.g., +50 or -10"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              New capacity will be: <span className={newCapacity < minCapacity ? 'text-red-500' : 'text-green-600'}>{newCapacity}</span>
            </p>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              placeholder="e.g., Venue approved additional seating"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || adjustment === 0 || newCapacity < minCapacity || !reason}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ReservedSeatingSection({
  layout,
  eventId,
  soldSeats,
  blockedSeats,
  loading,
  onBlockSeats,
  onUnblockSeats,
}: {
  layout: any
  eventId: string
  soldSeats: string[]
  blockedSeats: string[]
  loading: boolean
  onBlockSeats: (seatIds: string[], reason: string) => Promise<void>
  onUnblockSeats: (seatIds: string[]) => Promise<void>
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent-500"></div>
      </div>
    )
  }

  if (!layout) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🪑</div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          No Seating Chart
        </h3>
        <p className="text-slate-500 dark:text-slate-400">
          This event does not have a reserved seating layout configured.
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
          Seating charts can be configured in the event editor.
        </p>
      </div>
    )
  }

  return (
    <div className="h-[600px]">
      <AdminSeatingChart
        layout={layout}
        eventId={eventId}
        soldSeats={soldSeats}
        blockedSeats={blockedSeats}
        onBlockSeats={onBlockSeats}
        onUnblockSeats={onUnblockSeats}
      />
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
