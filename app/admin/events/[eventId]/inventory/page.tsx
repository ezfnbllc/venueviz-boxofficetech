'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import type {
  EventInventorySummary,
  InventoryBlock,
  InventoryLog,
} from '@/lib/types/inventory'
import InventorySummary from '@/components/admin/inventory/InventorySummary'
import GAInventoryTable from '@/components/admin/inventory/GAInventoryTable'
import SeatInventoryTable from '@/components/admin/inventory/SeatInventoryTable'
import InventoryLogTable from '@/components/admin/inventory/InventoryLogTable'
import CapacityModal from '@/components/admin/inventory/CapacityModal'
import BlockModal from '@/components/admin/inventory/BlockModal'

type TabType = 'ga' | 'seats' | 'logs'

export default function EventInventoryPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.eventId as string

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [inventory, setInventory] = useState<EventInventorySummary | null>(null)
  const [blocks, setBlocks] = useState<InventoryBlock[]>([])
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('ga')
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showCapacityModal, setShowCapacityModal] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [capacityModalData, setCapacityModalData] = useState<{
    tierId: string
    tierName: string
    currentCapacity: number
    mode: 'add' | 'remove'
  } | null>(null)
  const [blockModalData, setBlockModalData] = useState<{
    type: 'ga' | 'reserved'
    tierId?: string
    tierName?: string
    availableQuantity?: number
    selectedSeats?: Array<{
      seatId: string
      sectionId: string
      sectionName: string
      row: string
      seatNumber: string
    }>
  } | null>(null)

  // Get auth token for API calls
  const getAuthToken = useCallback(async () => {
    if (!user) return null
    try {
      return await user.getIdToken()
    } catch (error) {
      console.error('Error getting auth token:', error)
      return null
    }
  }, [user])

  // Load inventory data
  const loadInventory = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/inventory`)
      if (!response.ok) {
        throw new Error('Failed to load inventory')
      }
      const data = await response.json()
      setInventory(data)

      // Set default tab based on seating type
      if (data.seatingType === 'reserved') {
        setActiveTab('seats')
      }
    } catch (err: any) {
      setError(err.message)
    }
  }, [eventId])

  // Load blocks
  const loadBlocks = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/inventory/blocks`)
      if (response.ok) {
        const data = await response.json()
        setBlocks(data.blocks || [])
      }
    } catch (err) {
      console.error('Error loading blocks:', err)
    }
  }, [eventId])

  // Load logs
  const loadLogs = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/inventory/logs?limit=100`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (err) {
      console.error('Error loading logs:', err)
    }
  }, [eventId])

  // Load all data
  const loadAllData = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadInventory(), loadBlocks(), loadLogs()])
    setLoading(false)
  }, [loadInventory, loadBlocks, loadLogs])

  // Auth check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setUser(authUser)
      } else {
        router.push('/login')
      }
    })
    return () => unsubscribe()
  }, [router])

  // Load data when user is authenticated
  useEffect(() => {
    if (user && eventId) {
      loadAllData()
    }
  }, [user, eventId, loadAllData])

  // Capacity modal handlers
  const handleOpenCapacityModal = (tierId: string, tierName: string, currentCapacity: number, mode: 'add' | 'remove') => {
    setCapacityModalData({ tierId, tierName, currentCapacity, mode })
    setShowCapacityModal(true)
  }

  const handleCapacitySubmit = async (change: number, reason: string, notes?: string) => {
    if (!capacityModalData) return

    const token = await getAuthToken()
    if (!token) {
      alert('Authentication required')
      return
    }

    try {
      const response = await fetch(`/api/events/${eventId}/inventory`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tierId: capacityModalData.tierId,
          tierName: capacityModalData.tierName,
          change,
          reason,
          notes,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        alert(result.error || 'Failed to update capacity')
        return
      }

      setShowCapacityModal(false)
      setCapacityModalData(null)
      await loadAllData()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  // Block modal handlers
  const handleOpenBlockModal = (
    type: 'ga' | 'reserved',
    tierId?: string,
    tierName?: string,
    availableQuantity?: number,
    selectedSeats?: Array<{
      seatId: string
      sectionId: string
      sectionName: string
      row: string
      seatNumber: string
    }>
  ) => {
    setBlockModalData({ type, tierId, tierName, availableQuantity, selectedSeats })
    setShowBlockModal(true)
  }

  const handleBlockSubmit = async (quantity: number | undefined, reason: string, notes?: string) => {
    if (!blockModalData) return

    const token = await getAuthToken()
    if (!token) {
      alert('Authentication required')
      return
    }

    try {
      const body: any = {
        type: blockModalData.type,
        reason,
        notes,
      }

      if (blockModalData.type === 'ga') {
        body.tierId = blockModalData.tierId
        body.tierName = blockModalData.tierName
        body.quantity = quantity
      } else {
        body.seats = blockModalData.selectedSeats
      }

      const response = await fetch(`/api/events/${eventId}/inventory/blocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const result = await response.json()
      if (!response.ok) {
        alert(result.error || 'Failed to block inventory')
        return
      }

      setShowBlockModal(false)
      setBlockModalData(null)
      await loadAllData()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  // Unblock handler
  const handleUnblock = async (type: 'ga' | 'reserved', blockIds: string[]) => {
    if (blockIds.length === 0) return

    const token = await getAuthToken()
    if (!token) {
      alert('Authentication required')
      return
    }

    const confirmMsg = blockIds.length === 1
      ? 'Unblock this inventory?'
      : `Unblock ${blockIds.length} items?`

    if (!confirm(confirmMsg)) return

    try {
      const response = await fetch(`/api/events/${eventId}/inventory/blocks`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ type, blockIds }),
      })

      const result = await response.json()
      if (!response.ok) {
        alert(result.error || 'Failed to unblock')
        return
      }

      await loadAllData()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/admin/events" className="text-indigo-600 hover:underline">
            Back to Events
          </Link>
        </div>
      </div>
    )
  }

  if (!inventory) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Event not found</p>
          <Link href="/admin/events" className="text-indigo-600 hover:underline">
            Back to Events
          </Link>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'ga' as TabType, label: 'GA Inventory', show: inventory.seatingType === 'general' || inventory.gaTiers?.length },
    { id: 'seats' as TabType, label: 'Reserved Seating', show: inventory.seatingType === 'reserved' },
    { id: 'logs' as TabType, label: 'Activity Log', show: true },
  ].filter(tab => tab.show)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href={`/admin/events/${eventId}`}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Inventory Management
                </h1>
                <p className="text-sm text-gray-500">{inventory.eventName}</p>
              </div>
            </div>
            <button
              onClick={() => loadAllData()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <InventorySummary inventory={inventory} />

        {/* Tabs */}
        <div className="mt-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'ga' && inventory.gaTiers && (
              <GAInventoryTable
                tiers={inventory.gaTiers}
                blocks={blocks.filter(b => b.type === 'ga')}
                onAddCapacity={(tierId, tierName, capacity) =>
                  handleOpenCapacityModal(tierId, tierName, capacity, 'add')
                }
                onRemoveCapacity={(tierId, tierName, capacity) =>
                  handleOpenCapacityModal(tierId, tierName, capacity, 'remove')
                }
                onBlock={(tierId, tierName, available) =>
                  handleOpenBlockModal('ga', tierId, tierName, available)
                }
                onUnblock={(blockId) => handleUnblock('ga', [blockId])}
              />
            )}

            {activeTab === 'seats' && inventory.sections && (
              <SeatInventoryTable
                sections={inventory.sections}
                onBlockSeats={(seats) => handleOpenBlockModal('reserved', undefined, undefined, undefined, seats)}
                onUnblockSeats={(blockIds) => handleUnblock('reserved', blockIds)}
              />
            )}

            {activeTab === 'logs' && (
              <InventoryLogTable logs={logs} />
            )}
          </div>
        </div>
      </div>

      {/* Capacity Modal */}
      {showCapacityModal && capacityModalData && (
        <CapacityModal
          isOpen={showCapacityModal}
          onClose={() => {
            setShowCapacityModal(false)
            setCapacityModalData(null)
          }}
          tierName={capacityModalData.tierName}
          currentCapacity={capacityModalData.currentCapacity}
          mode={capacityModalData.mode}
          onSubmit={handleCapacitySubmit}
        />
      )}

      {/* Block Modal */}
      {showBlockModal && blockModalData && (
        <BlockModal
          isOpen={showBlockModal}
          onClose={() => {
            setShowBlockModal(false)
            setBlockModalData(null)
          }}
          type={blockModalData.type}
          tierName={blockModalData.tierName}
          availableQuantity={blockModalData.availableQuantity}
          selectedSeats={blockModalData.selectedSeats}
          onSubmit={handleBlockSubmit}
        />
      )}
    </div>
  )
}
