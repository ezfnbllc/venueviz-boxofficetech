'use client'

import { useState, useMemo } from 'react'
import type { SectionInventory, SeatInventory, SeatStatus } from '@/lib/types/inventory'

interface SeatInventoryTableProps {
  sections: SectionInventory[]
  onBlockSeats: (seats: Array<{
    seatId: string
    sectionId: string
    sectionName: string
    row: string
    seatNumber: string
  }>) => void
  onUnblockSeats: (blockIds: string[]) => void
}

export default function SeatInventoryTable({
  sections,
  onBlockSeats,
  onUnblockSeats,
}: SeatInventoryTableProps) {
  const [selectedSection, setSelectedSection] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<SeatStatus | 'all'>('all')
  const [rowFilter, setRowFilter] = useState<string>('')
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  // Get filtered seats
  const filteredSeats = useMemo(() => {
    let seats: SeatInventory[] = []

    if (selectedSection === 'all') {
      sections.forEach(section => {
        seats = seats.concat(section.seats)
      })
    } else {
      const section = sections.find(s => s.sectionId === selectedSection)
      seats = section?.seats || []
    }

    if (statusFilter !== 'all') {
      seats = seats.filter(seat => seat.status === statusFilter)
    }

    if (rowFilter) {
      seats = seats.filter(seat =>
        seat.row.toLowerCase().includes(rowFilter.toLowerCase())
      )
    }

    return seats
  }, [sections, selectedSection, statusFilter, rowFilter])

  // Get unique rows for the current filter
  const availableRows = useMemo(() => {
    const rows = new Set<string>()
    filteredSeats.forEach(seat => rows.add(seat.row))
    return Array.from(rows).sort()
  }, [filteredSeats])

  // Get selectable seats (only available seats can be selected for blocking)
  const selectableSeats = useMemo(() => {
    return filteredSeats.filter(seat => seat.status === 'available')
  }, [filteredSeats])

  // Get blocked seats that can be unblocked
  const blockedSeats = useMemo(() => {
    return filteredSeats.filter(seat => seat.status === 'blocked')
  }, [filteredSeats])

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedSeats(new Set())
      setSelectAll(false)
    } else {
      setSelectedSeats(new Set(selectableSeats.map(s => s.seatId)))
      setSelectAll(true)
    }
  }

  // Handle individual seat selection
  const handleSeatSelect = (seatId: string) => {
    const newSelected = new Set(selectedSeats)
    if (newSelected.has(seatId)) {
      newSelected.delete(seatId)
    } else {
      newSelected.add(seatId)
    }
    setSelectedSeats(newSelected)
    setSelectAll(newSelected.size === selectableSeats.length && selectableSeats.length > 0)
  }

  // Handle block selected
  const handleBlockSelected = () => {
    const seatsToBlock = filteredSeats
      .filter(seat => selectedSeats.has(seat.seatId))
      .map(seat => ({
        seatId: seat.seatId,
        sectionId: seat.sectionId,
        sectionName: seat.sectionName,
        row: seat.row,
        seatNumber: seat.seatNumber,
      }))

    if (seatsToBlock.length > 0) {
      onBlockSeats(seatsToBlock)
      setSelectedSeats(new Set())
      setSelectAll(false)
    }
  }

  // Handle unblock selected
  const handleUnblockSelected = () => {
    const blockIdsToUnblock = blockedSeats
      .filter(seat => selectedSeats.has(seat.seatId) && seat.blockId)
      .map(seat => seat.blockId!)

    if (blockIdsToUnblock.length > 0) {
      onUnblockSeats(blockIdsToUnblock)
      setSelectedSeats(new Set())
      setSelectAll(false)
    }
  }

  // Status badge component
  const StatusBadge = ({ status }: { status: SeatStatus }) => {
    const config = {
      available: { bg: 'bg-green-100', text: 'text-green-800', icon: '🟢' },
      sold: { bg: 'bg-gray-100', text: 'text-gray-800', icon: '🔴' },
      blocked: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '🟡' },
      held: { bg: 'bg-orange-100', text: 'text-orange-800', icon: '🟠' },
    }
    const { bg, text, icon } = config[status]
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
        {icon} {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  // Section summary cards
  const sectionSummaries = sections.map(section => ({
    ...section,
    availablePercent: section.totalSeats > 0 ? (section.available / section.totalSeats) * 100 : 0,
  }))

  return (
    <div className="space-y-6">
      {/* Section Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sectionSummaries.map(section => (
          <div
            key={section.sectionId}
            className={`bg-white rounded-lg border p-4 cursor-pointer transition-all ${
              selectedSection === section.sectionId
                ? 'border-indigo-500 ring-2 ring-indigo-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedSection(
              selectedSection === section.sectionId ? 'all' : section.sectionId
            )}
          >
            <h4 className="font-medium text-gray-900">{section.sectionName}</h4>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Available:</span>{' '}
                <span className="font-medium text-green-600">{section.available}</span>
              </div>
              <div>
                <span className="text-gray-500">Sold:</span>{' '}
                <span className="font-medium">{section.sold}</span>
              </div>
              <div>
                <span className="text-gray-500">Blocked:</span>{' '}
                <span className="font-medium text-yellow-600">{section.blocked}</span>
              </div>
              <div>
                <span className="text-gray-500">Total:</span>{' '}
                <span className="font-medium">{section.totalSeats}</span>
              </div>
            </div>
            <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden flex">
              <div
                className="bg-gray-400 h-full"
                style={{ width: `${(section.sold / section.totalSeats) * 100}%` }}
              />
              <div
                className="bg-yellow-500 h-full"
                style={{ width: `${(section.blocked / section.totalSeats) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Section Filter */}
              <div>
                <label htmlFor="section-filter" className="sr-only">Filter by section</label>
                <select
                  id="section-filter"
                  value={selectedSection}
                  onChange={(e) => {
                    setSelectedSection(e.target.value)
                    setSelectedSeats(new Set())
                    setSelectAll(false)
                  }}
                  className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="all">All Sections</option>
                  {sections.map(section => (
                    <option key={section.sectionId} value={section.sectionId}>
                      {section.sectionName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label htmlFor="status-filter" className="sr-only">Filter by status</label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as SeatStatus | 'all')
                    setSelectedSeats(new Set())
                    setSelectAll(false)
                  }}
                  className="block w-36 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="all">All Status</option>
                  <option value="available">Available</option>
                  <option value="sold">Sold</option>
                  <option value="blocked">Blocked</option>
                  <option value="held">Held</option>
                </select>
              </div>

              {/* Row Filter */}
              <div>
                <label htmlFor="row-filter" className="sr-only">Filter by row</label>
                <input
                  id="row-filter"
                  type="text"
                  value={rowFilter}
                  onChange={(e) => setRowFilter(e.target.value)}
                  placeholder="Filter by row..."
                  className="block w-32 pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                />
              </div>

              <span className="text-sm text-gray-500">
                Showing {filteredSeats.length} seats
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {selectedSeats.size > 0 && (
                <>
                  <span className="text-sm text-gray-600 mr-2">
                    {selectedSeats.size} selected
                  </span>
                  <button
                    onClick={handleBlockSelected}
                    disabled={!selectableSeats.some(s => selectedSeats.has(s.seatId))}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Block Selected
                  </button>
                  <button
                    onClick={handleUnblockSelected}
                    disabled={!blockedSeats.some(s => selectedSeats.has(s.seatId))}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    Unblock Selected
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Seats Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectAll && selectableSeats.length > 0}
                    onChange={handleSelectAll}
                    disabled={selectableSeats.length === 0}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Section
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Row
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seat
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Block Reason
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSeats.slice(0, 100).map((seat) => {
                const isSelectable = seat.status === 'available' || seat.status === 'blocked'
                return (
                  <tr
                    key={seat.seatId}
                    className={`hover:bg-gray-50 ${selectedSeats.has(seat.seatId) ? 'bg-indigo-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedSeats.has(seat.seatId)}
                        onChange={() => handleSeatSelect(seat.seatId)}
                        disabled={!isSelectable}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {seat.sectionName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {seat.row}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {seat.seatNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={seat.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {seat.blockReason || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {seat.price ? `$${seat.price.toFixed(2)}` : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredSeats.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            No seats match the current filters
          </div>
        )}

        {filteredSeats.length > 100 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-500 text-center">
            Showing first 100 of {filteredSeats.length} seats. Use filters to narrow down results.
          </div>
        )}
      </div>
    </div>
  )
}
