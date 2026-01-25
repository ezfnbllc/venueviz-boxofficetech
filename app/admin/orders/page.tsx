'use client'

import { useState, useEffect } from 'react'
import { AdminService } from '@/lib/admin/adminService'
import TicketQRCode from '@/components/shared/TicketQRCode'

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [ordersData, eventsData] = await Promise.all([
        AdminService.getOrders(),
        AdminService.getEvents()
      ])

      console.log('[Orders] Sample order data:', ordersData[0])

      const eventsMap = new Map(eventsData.map(e => [e.id, e]))

      const enrichedOrders = ordersData.map(order => ({
        ...order,
        event: eventsMap.get(order.eventId),
        eventPromoterName: eventsMap.get(order.eventId)?.promoter?.promoterName
      }))

      // Sort by createdAt descending (most recent first)
      enrichedOrders.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || a.createdAt || new Date(0)
        const dateB = b.createdAt?.toDate?.() || b.createdAt || new Date(0)
        return new Date(dateB).getTime() - new Date(dateA).getTime()
      })

      setOrders(enrichedOrders)
      setEvents(eventsData)
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter orders by status and search query
  const filteredOrders = orders.filter(order => {
    // Status filter
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const customerInfo = getCustomerInfo(order)
      const eventName = (order.eventName || order.event?.name || '').toLowerCase()
      const venueName = (order.event?.venueName || order.event?.venue?.name || '').toLowerCase()
      const orderId = (order.orderId || order.id || '').toLowerCase()

      return (
        customerInfo.name.toLowerCase().includes(query) ||
        customerInfo.email.toLowerCase().includes(query) ||
        eventName.includes(query) ||
        venueName.includes(query) ||
        orderId.includes(query)
      )
    }

    return true
  })

  const totalRevenue = orders.reduce((sum, order) => sum + (order.pricing?.total || order.total || 0), 0)
  const completedOrders = orders.filter(o => o.status === 'confirmed' || o.status === 'completed').length
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0

  // Helper function to get customer info from various possible locations
  const getCustomerInfo = (order: any) => {
    return {
      name: order.customer?.name || order.customerName || order.buyerName || 'N/A',
      email: order.customer?.email || order.customerEmail || order.buyerEmail || order.email || 'N/A',
      phone: order.customer?.phone || order.customerPhone || order.buyerPhone || order.phone || 'N/A'
    }
  }

  const printTicket = (ticket: any) => {
    window.print()
  }

  const emailTicket = (ticket: any) => {
    alert('Email functionality coming soon!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-accent-500"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-slate-900 dark:text-white">Orders Management</h1>
        <p className="text-slate-500 dark:text-slate-400">View and manage customer orders</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="stat-card rounded-xl p-6">
          <p className="text-secondary-contrast text-sm mb-2 font-medium">Total Orders</p>
          <p className="text-4xl font-bold text-primary-contrast">{orders.length}</p>
        </div>

        <div className="stat-card rounded-xl p-6">
          <p className="text-secondary-contrast text-sm mb-2 font-medium">Total Revenue</p>
          <p className="text-4xl font-bold text-money">${totalRevenue.toFixed(2)}</p>
        </div>

        <div className="stat-card rounded-xl p-6">
          <p className="text-secondary-contrast text-sm mb-2 font-medium">Avg Order Value</p>
          <p className="text-4xl font-bold text-primary-contrast">${avgOrderValue.toFixed(2)}</p>
        </div>

        <div className="stat-card rounded-xl p-6">
          <p className="text-secondary-contrast text-sm mb-2 font-medium">Completed</p>
          <p className="text-4xl font-bold text-money">{completedOrders}</p>
        </div>

        <div className="stat-card rounded-xl p-6">
          <p className="text-secondary-contrast text-sm mb-2 font-medium">Pending</p>
          <p className="text-4xl font-bold text-amber-500 dark:text-yellow-400">{pendingOrders}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search Box */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by customer name, email, event, venue, or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 text-slate-900 dark:text-white placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 text-slate-900 dark:text-white min-w-[160px]"
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Results count */}
      {(searchQuery || statusFilter !== 'all') && (
        <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Showing {filteredOrders.length} of {orders.length} orders
          {searchQuery && <span> matching &quot;{searchQuery}&quot;</span>}
        </div>
      )}

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="card-elevated rounded-xl p-12 text-center">
          <p className="text-secondary-contrast text-lg">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const customerInfo = getCustomerInfo(order)
            return (
              <div
                key={order.id}
                className="card-elevated rounded-xl overflow-hidden hover:border-blue-500 dark:hover:border-accent-500 transition-all cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Order #{order.orderId || order.id.slice(0, 8)}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          order.status === 'confirmed' || order.status === 'completed'
                            ? 'badge-success'
                            : order.status === 'pending'
                            ? 'badge-warning'
                            : order.status === 'cancelled'
                            ? 'badge-error'
                            : 'bg-gray-500/20 text-gray-500 dark:text-gray-400'
                        }`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500 dark:text-slate-400 mb-1">Customer</p>
                          <p className="font-medium text-slate-900 dark:text-white">{customerInfo.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{customerInfo.email}</p>
                        </div>

                        <div>
                          <p className="text-slate-500 dark:text-slate-400 mb-1">Event</p>
                          <p className="font-medium text-slate-900 dark:text-white">{order.eventName || order.event?.name || 'N/A'}</p>
                        </div>

                        <div>
                          <p className="text-slate-500 dark:text-slate-400 mb-1">Tickets</p>
                          <p className="font-medium text-slate-900 dark:text-white">{order.tickets?.length || order.quantity || 0}</p>
                        </div>

                        <div>
                          <p className="text-slate-500 dark:text-slate-400 mb-1">Total</p>
                          <p className="text-xl font-bold text-money">
                            ${(order.pricing?.total || order.total || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        {order.createdAt?.toDate?.()?.toLocaleString() || 'Date N/A'}
                      </div>
                    </div>

                    <div className="ml-4">
                      <svg className="w-6 h-6 text-accent-500 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (() => {
        const customerInfo = getCustomerInfo(selectedOrder)
        return (
          <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Order Details</h2>
                  <p className="text-slate-500 dark:text-slate-400">#{selectedOrder.orderId || selectedOrder.id.slice(0, 8)}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Customer Info */}
                    <div>
                      <h3 className="text-sm font-semibold text-blue-600 dark:text-accent-400 mb-3">CUSTOMER DETAILS</h3>
                      <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg space-y-2 border border-slate-200 dark:border-slate-700">
                        <p><span className="text-slate-500 dark:text-slate-400">Name:</span> <span className="font-medium text-slate-900 dark:text-white">{customerInfo.name}</span></p>
                        <p><span className="text-slate-500 dark:text-slate-400">Email:</span> <span className="font-medium text-slate-900 dark:text-white">{customerInfo.email}</span></p>
                        <p><span className="text-slate-500 dark:text-slate-400">Phone:</span> <span className="font-medium text-slate-900 dark:text-white">{customerInfo.phone}</span></p>
                      </div>
                    </div>

                    {/* Event Info */}
                    {selectedOrder.event && (
                      <div>
                        <h3 className="text-sm font-semibold text-blue-600 dark:text-accent-400 mb-3">EVENT DETAILS</h3>
                        <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg space-y-2 border border-slate-200 dark:border-slate-700">
                          <p><span className="text-slate-500 dark:text-slate-400">Event:</span> <span className="font-medium text-slate-900 dark:text-white">{selectedOrder.event.name}</span></p>
                          <p><span className="text-slate-500 dark:text-slate-400">Venue:</span> <span className="font-medium text-slate-900 dark:text-white">{selectedOrder.event.venueName || 'N/A'}</span></p>
                          {selectedOrder.event.schedule?.performances?.[0]?.date && (
                            <p>
                              <span className="text-slate-500 dark:text-slate-400">Date:</span>{' '}
                              <span className="font-medium text-slate-900 dark:text-white">{new Date(selectedOrder.event.schedule.performances[0].date).toLocaleDateString()}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Payment Info */}
                    <div>
                      <h3 className="text-sm font-semibold text-blue-600 dark:text-accent-400 mb-3">PAYMENT DETAILS</h3>
                      <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg space-y-2 border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Subtotal:</span>
                          <span className="text-slate-900 dark:text-white">${(selectedOrder.pricing?.subtotal || selectedOrder.total || 0).toFixed(2)}</span>
                        </div>
                        {selectedOrder.pricing?.fees?.service > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Service Fee:</span>
                            <span className="text-slate-900 dark:text-white">${selectedOrder.pricing.fees.service.toFixed(2)}</span>
                          </div>
                        )}
                        {selectedOrder.pricing?.tax > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Tax:</span>
                            <span className="text-slate-900 dark:text-white">${selectedOrder.pricing.tax.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-slate-300 dark:border-slate-700 font-bold text-lg">
                          <span className="text-slate-900 dark:text-white">Total:</span>
                          <span className="text-money">${(selectedOrder.pricing?.total || selectedOrder.total || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Tickets */}
                  <div>
                    <h3 className="text-sm font-semibold text-blue-600 dark:text-accent-400 mb-3">
                      TICKETS ({selectedOrder.tickets?.length || 0})
                    </h3>
                    <div className="space-y-4">
                      {selectedOrder.tickets?.map((ticket: any, index: number) => (
                        <div key={ticket.id || index} className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">{ticket.tierName || 'General Admission'}</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {ticket.sectionName || ticket.section}
                                {ticket.row && ` • Row ${ticket.row}`}
                                {ticket.seat && ` • Seat ${ticket.seat}`}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              ticket.status === 'active' ? 'badge-success' :
                              ticket.status === 'used' ? 'badge-info' :
                              'bg-gray-500/20 text-gray-500 dark:text-gray-400'
                            }`}>
                              {ticket.status || 'active'}
                            </span>
                          </div>

                          <div className="mt-4 flex justify-center">
                            <div className="text-center">
                              <TicketQRCode ticketId={ticket.id} size={100} />
                              <p className="text-xs text-gray-600 text-center mt-2">
                                Ticket #{index + 1}
                              </p>
                              <p className="text-xs text-gray-400 truncate max-w-[120px]">
                                {ticket.id}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => printTicket(ticket)}
                              className="flex-1 px-3 py-2 btn-accent rounded text-sm"
                            >
                              🖨️ Print
                            </button>
                            <button
                              onClick={() => emailTicket(ticket)}
                              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white shadow-lg shadow-blue-500/25"
                            >
                              📧 Email
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
