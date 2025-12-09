'use client'

import { useState, useEffect } from 'react'
import { AdminService } from '@/lib/admin/adminService'

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
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

      setOrders(enrichedOrders)
      setEvents(eventsData)
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(order =>
    statusFilter === 'all' || order.status === statusFilter
  )

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
        <div className="bg-white dark:bg-slate-800 backdrop-blur-sm rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Total Orders</p>
          <p className="text-4xl font-bold text-slate-900 dark:text-white">{orders.length}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 backdrop-blur-sm rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Total Revenue</p>
          <p className="text-4xl font-bold text-green-400">${totalRevenue.toFixed(2)}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 backdrop-blur-sm rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Avg Order Value</p>
          <p className="text-4xl font-bold text-slate-900 dark:text-white">${avgOrderValue.toFixed(2)}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 backdrop-blur-sm rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Completed</p>
          <p className="text-4xl font-bold text-green-400">{completedOrders}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 backdrop-blur-sm rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Pending</p>
          <p className="text-4xl font-bold text-yellow-400">{pendingOrders}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 text-slate-900 dark:text-white"
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-lg">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const customerInfo = getCustomerInfo(order)
            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-800 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:border-accent-500 transition-all cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Order #{order.orderId || order.id.slice(0, 8)}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          order.status === 'confirmed' || order.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : order.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : order.status === 'cancelled'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-gray-500/20 text-gray-400'
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
                          <p className="text-xl font-bold text-green-400">
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
                      <h3 className="text-sm font-semibold text-accent-500 dark:text-accent-400 mb-3">CUSTOMER DETAILS</h3>
                      <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg space-y-2">
                        <p><span className="text-slate-500 dark:text-slate-400">Name:</span> <span className="font-medium text-slate-900 dark:text-white">{customerInfo.name}</span></p>
                        <p><span className="text-slate-500 dark:text-slate-400">Email:</span> <span className="font-medium text-slate-900 dark:text-white">{customerInfo.email}</span></p>
                        <p><span className="text-slate-500 dark:text-slate-400">Phone:</span> <span className="font-medium text-slate-900 dark:text-white">{customerInfo.phone}</span></p>
                      </div>
                    </div>

                    {/* Event Info */}
                    {selectedOrder.event && (
                      <div>
                        <h3 className="text-sm font-semibold text-accent-500 dark:text-accent-400 mb-3">EVENT DETAILS</h3>
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg space-y-2">
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
                      <h3 className="text-sm font-semibold text-accent-500 dark:text-accent-400 mb-3">PAYMENT DETAILS</h3>
                      <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg space-y-2">
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
                        <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 font-bold text-lg">
                          <span className="text-slate-900 dark:text-white">Total:</span>
                          <span className="text-green-400">${(selectedOrder.pricing?.total || selectedOrder.total || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Tickets */}
                  <div>
                    <h3 className="text-sm font-semibold text-accent-500 dark:text-accent-400 mb-3">
                      TICKETS ({selectedOrder.tickets?.length || 0})
                    </h3>
                    <div className="space-y-4">
                      {selectedOrder.tickets?.map((ticket: any, index: number) => (
                        <div key={ticket.id || index} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
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
                              ticket.status === 'active' ? 'bg-green-500/20 text-green-400' :
                              ticket.status === 'used' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {ticket.status || 'active'}
                            </span>
                          </div>

                          {ticket.qrCode && (
                            <div className="mt-4 p-4 bg-white rounded-lg">
                              <img
                                src={ticket.qrCode}
                                alt="QR Code"
                                className="w-32 h-32 mx-auto"
                              />
                              <p className="text-xs text-gray-600 text-center mt-2">
                                Ticket #{ticket.ticketNumber || ticket.id?.slice(0, 8) || index + 1}
                              </p>
                            </div>
                          )}

                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => printTicket(ticket)}
                              className="flex-1 px-3 py-2 bg-accent-600 hover:bg-accent-700 rounded text-sm text-white"
                            >
                              🖨️ Print
                            </button>
                            <button
                              onClick={() => emailTicket(ticket)}
                              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
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
