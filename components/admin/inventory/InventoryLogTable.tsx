'use client'

import { useState, useMemo } from 'react'
import type { InventoryLog, InventoryLogAction, InventoryLogType } from '@/lib/types/inventory'

interface InventoryLogTableProps {
  logs: InventoryLog[]
}

export default function InventoryLogTable({ logs }: InventoryLogTableProps) {
  const [actionFilter, setActionFilter] = useState<InventoryLogAction | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<InventoryLogType | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false
      if (typeFilter !== 'all' && log.type !== typeFilter) return false
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchesReason = log.reason?.toLowerCase().includes(term)
        const matchesNotes = log.notes?.toLowerCase().includes(term)
        const matchesUser = log.performedByName?.toLowerCase().includes(term)
        const matchesTier = log.tierName?.toLowerCase().includes(term)
        if (!matchesReason && !matchesNotes && !matchesUser && !matchesTier) return false
      }
      return true
    })
  }, [logs, actionFilter, typeFilter, searchTerm])

  // Format date
  const formatDate = (date: any) => {
    const d = date?.toDate?.() || new Date(date)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  // Get action display info
  const getActionInfo = (action: InventoryLogAction) => {
    const config: Record<InventoryLogAction, { label: string; color: string; icon: string }> = {
      add_capacity: {
        label: 'Added Capacity',
        color: 'bg-green-100 text-green-800',
        icon: '+',
      },
      remove_capacity: {
        label: 'Removed Capacity',
        color: 'bg-red-100 text-red-800',
        icon: '-',
      },
      block: {
        label: 'Blocked',
        color: 'bg-yellow-100 text-yellow-800',
        icon: '🔒',
      },
      unblock: {
        label: 'Unblocked',
        color: 'bg-blue-100 text-blue-800',
        icon: '🔓',
      },
      bulk_block: {
        label: 'Bulk Blocked',
        color: 'bg-yellow-100 text-yellow-800',
        icon: '🔒',
      },
      bulk_unblock: {
        label: 'Bulk Unblocked',
        color: 'bg-blue-100 text-blue-800',
        icon: '🔓',
      },
    }
    return config[action]
  }

  // Get change display
  const getChangeDisplay = (log: InventoryLog) => {
    if (log.quantityChange !== undefined) {
      const prefix = log.quantityChange > 0 ? '+' : ''
      return `${prefix}${log.quantityChange}`
    }
    if (log.seatIds && log.seatIds.length > 0) {
      return `${log.seatIds.length} seat${log.seatIds.length !== 1 ? 's' : ''}`
    }
    return '-'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Activity Log</h2>
            <p className="text-sm text-gray-500 mt-1">
              Track all inventory changes and who made them
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search logs..."
                className="block w-48 pl-10 pr-3 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Action Filter */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as InventoryLogAction | 'all')}
              className="block w-40 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
            >
              <option value="all">All Actions</option>
              <option value="add_capacity">Added Capacity</option>
              <option value="remove_capacity">Removed Capacity</option>
              <option value="block">Blocked</option>
              <option value="unblock">Unblocked</option>
              <option value="bulk_block">Bulk Blocked</option>
              <option value="bulk_unblock">Bulk Unblocked</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as InventoryLogType | 'all')}
              className="block w-32 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
            >
              <option value="all">All Types</option>
              <option value="ga">GA</option>
              <option value="reserved">Reserved</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Change
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reason
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                By
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLogs.map((log) => {
              const actionInfo = getActionInfo(log.action)
              return (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(log.performedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${actionInfo.color}`}>
                      {actionInfo.icon} {actionInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      log.type === 'ga' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {log.type === 'ga' ? 'GA' : 'Reserved'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.tierName && (
                      <span>{log.tierName}</span>
                    )}
                    {log.sectionName && (
                      <span>{log.sectionName}</span>
                    )}
                    {log.previousValue !== undefined && log.newValue !== undefined && (
                      <span className="text-gray-500 ml-2">
                        ({log.previousValue} → {log.newValue})
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`font-medium ${
                      log.quantityChange !== undefined && log.quantityChange > 0
                        ? 'text-green-600'
                        : log.quantityChange !== undefined && log.quantityChange < 0
                        ? 'text-red-600'
                        : 'text-gray-900'
                    }`}>
                      {getChangeDisplay(log)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={log.reason}>
                    {log.reason}
                    {log.notes && (
                      <span className="block text-xs text-gray-400 truncate" title={log.notes}>
                        {log.notes}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.performedByName}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filteredLogs.length === 0 && (
        <div className="px-6 py-12 text-center text-gray-500">
          {logs.length === 0 ? (
            <>No inventory changes logged yet</>
          ) : (
            <>No logs match the current filters</>
          )}
        </div>
      )}

      {filteredLogs.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-500">
          Showing {filteredLogs.length} of {logs.length} log entries
        </div>
      )}
    </div>
  )
}
