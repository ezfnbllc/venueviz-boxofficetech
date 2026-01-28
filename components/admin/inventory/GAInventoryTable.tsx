'use client'

import { useState } from 'react'
import type { GATierInventory, InventoryBlock, GAInventoryBlock } from '@/lib/types/inventory'

interface GAInventoryTableProps {
  tiers: GATierInventory[]
  blocks: InventoryBlock[]
  onAddCapacity: (tierId: string, tierName: string, currentCapacity: number) => void
  onRemoveCapacity: (tierId: string, tierName: string, currentCapacity: number) => void
  onBlock: (tierId: string, tierName: string, availableQuantity: number) => void
  onUnblock: (blockId: string) => void
}

export default function GAInventoryTable({
  tiers,
  blocks,
  onAddCapacity,
  onRemoveCapacity,
  onBlock,
  onUnblock,
}: GAInventoryTableProps) {
  const [expandedTier, setExpandedTier] = useState<string | null>(null)

  // Group blocks by tier
  const blocksByTier = blocks.reduce<Record<string, GAInventoryBlock[]>>((acc, block) => {
    if (block.type === 'ga') {
      const gaBlock = block as GAInventoryBlock
      if (!acc[gaBlock.tierId]) {
        acc[gaBlock.tierId] = []
      }
      acc[gaBlock.tierId].push(gaBlock)
    }
    return acc
  }, {})

  const formatDate = (date: any) => {
    const d = date?.toDate?.() || new Date(date)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">GA Ticket Tiers</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage capacity and block tickets for each tier
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tier
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Capacity
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sold
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Blocked
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Held
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Available
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tiers.map((tier) => {
              const tierBlocks = blocksByTier[tier.tierId] || []
              const hasBlocks = tierBlocks.length > 0
              const isExpanded = expandedTier === tier.tierId
              const soldPercentage = tier.capacity > 0 ? (tier.sold / tier.capacity) * 100 : 0
              const blockedPercentage = tier.capacity > 0 ? (tier.blocked / tier.capacity) * 100 : 0

              return (
                <>
                  <tr key={tier.tierId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {hasBlocks && (
                          <button
                            onClick={() => setExpandedTier(isExpanded ? null : tier.tierId)}
                            className="mr-2 text-gray-400 hover:text-gray-600"
                          >
                            <svg
                              className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                        <span className="font-medium text-gray-900">{tier.tierName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tier.capacity.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {tier.sold.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tier.blocked > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {tier.blocked.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tier.held > 0 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {tier.held.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {tier.available.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden flex">
                        <div
                          className="bg-green-500 h-full"
                          style={{ width: `${soldPercentage}%` }}
                        />
                        <div
                          className="bg-yellow-500 h-full"
                          style={{ width: `${blockedPercentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 mt-1">
                        {soldPercentage.toFixed(0)}% sold
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onAddCapacity(tier.tierId, tier.tierName, tier.capacity)}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                          title="Add Capacity"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onRemoveCapacity(tier.tierId, tier.tierName, tier.capacity)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Remove Capacity"
                          disabled={tier.available === 0}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onBlock(tier.tierId, tier.tierName, tier.available)}
                          className="text-yellow-600 hover:text-yellow-900 p-1 rounded hover:bg-yellow-50"
                          title="Block Tickets"
                          disabled={tier.available === 0}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Expanded block details */}
                  {isExpanded && hasBlocks && (
                    <tr key={`${tier.tierId}-blocks`}>
                      <td colSpan={8} className="px-6 py-4 bg-gray-50">
                        <div className="ml-6">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">
                            Active Blocks ({tierBlocks.length})
                          </h4>
                          <div className="space-y-2">
                            {tierBlocks.map((block) => (
                              <div
                                key={block.id}
                                className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-3"
                              >
                                <div className="flex items-center space-x-4">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    {block.quantity} tickets
                                  </span>
                                  <span className="text-sm text-gray-900">{block.reason}</span>
                                  {block.notes && (
                                    <span className="text-sm text-gray-500">- {block.notes}</span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-4">
                                  <span className="text-xs text-gray-500">
                                    {block.blockedByName} • {formatDate(block.blockedAt)}
                                  </span>
                                  <button
                                    onClick={() => onUnblock(block.id!)}
                                    className="text-sm text-indigo-600 hover:text-indigo-900"
                                  >
                                    Unblock
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {tiers.length === 0 && (
        <div className="px-6 py-12 text-center text-gray-500">
          No ticket tiers configured for this event
        </div>
      )}
    </div>
  )
}
