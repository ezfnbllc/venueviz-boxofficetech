'use client'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'
import {auth, db} from '@/lib/firebase'
import {onAuthStateChanged} from 'firebase/auth'
import {doc, updateDoc, Timestamp} from 'firebase/firestore'

export default function OrdersManagement() {
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [editingStatus, setEditingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        loadOrders()
      } else {
        router.push('/login')
      }
    })
    return () => unsubscribe()
  }, [router])

  const loadOrders = async () => {
    try {
      const [ordersData, orderStats] = await Promise.all([
        AdminService.getOrders(),
        AdminService.getOrderStats()
      ])
      
      // Sort orders by date (most recent first)
      const sortedOrders = ordersData.sort((a: any, b: any) => {
        const dateA = a.purchaseDate?.toDate?.() || a.createdAt?.toDate?.() || new Date(0)
        const dateB = b.purchaseDate?.toDate?.() || b.createdAt?.toDate?.() || new Date(0)
        return dateB.getTime() - dateA.getTime()
      })
      
      setOrders(sortedOrders)
      setStats(orderStats)
    } catch (error) {
      console.error('Error loading orders:', error)
    }
    setLoading(false)
  }

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order)
    setNewStatus(order.status || 'pending')
    setEditingStatus(false)
    setShowDetailsModal(true)
  }

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return
    
    try {
      const orderRef = doc(db, 'orders', selectedOrder.id)
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      })
      
      // Update local state
      const updatedOrders = orders.map(order => 
        order.id === selectedOrder.id 
          ? { ...order, status: newStatus, updatedAt: Timestamp.now() }
          : order
      )
      setOrders(updatedOrders)
      setSelectedOrder({ ...selectedOrder, status: newStatus })
      setEditingStatus(false)
      
      alert('Order status updated successfully!')
    } catch (error) {
      console.error('Error updating order status:', error)
      alert('Error updating order status')
    }
  }

  const handleRefund = async () => {
    if (!selectedOrder) return
    
    if (!confirm('Are you sure you want to refund this order? This action cannot be undone.')) return
    
    try {
      const orderRef = doc(db, 'orders', selectedOrder.id)
      await updateDoc(orderRef, {
        status: 'refunded',
        paymentStatus: 'refunded',
        refundInfo: {
          refundedAt: Timestamp.now(),
          refundedBy: auth.currentUser?.email,
          amount: selectedOrder.pricing?.total || 0,
          reason: 'Admin initiated refund'
        },
        updatedAt: Timestamp.now()
      })
      
      alert('Order refunded successfully!')
      await loadOrders()
      setShowDetailsModal(false)
    } catch (error) {
      console.error('Error refunding order:', error)
      alert('Error processing refund')
    }
  }

  const formatCurrency = (amount: any) => {
    return (parseFloat(amount) || 0).toFixed(2)
  }

  const formatDate = (date: any) => {
    if (!date) return 'N/A'
    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString()
  }

  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'confirmed':
      case 'completed':
        return 'bg-green-600/20 text-green-400 border-green-500/30'
      case 'pending':
        return 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30'
      case 'cancelled':
      case 'refunded':
        return 'bg-red-600/20 text-red-400 border-red-500/30'
      default:
        return 'bg-gray-600/20 text-gray-400 border-gray-500/30'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'paid':
      case 'completed':
        return 'text-green-400'
      case 'pending':
        return 'text-yellow-400'
      case 'failed':
      case 'refunded':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  // Filter orders based on search and filters
  const filteredOrders = orders.filter(order => {
    // Status filter
    if (filterStatus !== 'all' && order.status !== filterStatus) return false
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const matchesSearch = 
        order.orderNumber?.toLowerCase().includes(search) ||
        order.customerName?.toLowerCase().includes(search) ||
        order.customerEmail?.toLowerCase().includes(search) ||
        order.eventName?.toLowerCase().includes(search)
      if (!matchesSearch) return false
    }
    
    // Date range filter
    if (dateRange.start || dateRange.end) {
      const orderDate = order.purchaseDate?.toDate?.() || order.createdAt?.toDate?.() || new Date()
      if (dateRange.start && orderDate < new Date(dateRange.start)) return false
      if (dateRange.end && orderDate > new Date(dateRange.end + 'T23:59:59')) return false
    }
    
    return true
  })

  return (
    <>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Orders Management</h1>
          <p className="text-gray-400">View and manage customer orders</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid md:grid-cols-5 gap-4 mb-8">
            <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
              <p className="text-gray-400 text-sm mb-1">Total Orders</p>
              <p className="text-2xl font-bold">{stats.totalOrders || 0}</p>
            </div>
            <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
              <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-green-400">${formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
              <p className="text-gray-400 text-sm mb-1">Avg Order Value</p>
              <p className="text-2xl font-bold">${formatCurrency(stats.averageOrderValue)}</p>
            </div>
            <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
              <p className="text-gray-400 text-sm mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-400">{stats.completedOrders || 0}</p>
            </div>
            <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
              <p className="text-gray-400 text-sm mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.pendingOrders || 0}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-4 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Order #, customer, event..."
                className="w-full px-3 py-2 bg-white/10 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 rounded-lg"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-2">From Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">To Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-gray-400">No orders found</p>
          </div>
        ) : (
          <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="text-left p-4">Order ID</th>
                    <th className="text-left p-4">Customer</th>
                    <th className="text-left p-4">Event</th>
                    <th className="text-left p-4">Date</th>
                    <th className="text-right p-4">Amount</th>
                    <th className="text-center p-4">Status</th>
                    <th className="text-center p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => (
                    <tr key={order.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-4">
                        <p className="font-mono text-sm">{order.orderNumber || order.id.slice(0, 8)}</p>
                        <p className="text-xs text-gray-500">{order.id}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold">{order.customerName || 'N/A'}</p>
                        <p className="text-sm text-gray-400">{order.customerEmail || ''}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold">{order.eventName || 'N/A'}</p>
                        <p className="text-sm text-gray-400">{order.venueName || ''}</p>
                      </td>
                      <td className="p-4 text-sm">
                        {formatDate(order.purchaseDate || order.createdAt)}
                      </td>
                      <td className="p-4 text-right font-semibold">
                        ${formatCurrency(order.pricing?.total || order.totalAmount || order.total || 0)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs border ${getStatusColor(order.status)}`}>
                          {order.status || 'pending'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleViewDetails(order)}
                          className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 text-sm"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Order Details Modal */}
        {showDetailsModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Order Details</h2>
                <button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setSelectedOrder(null)
                  }}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Order Header */}
              <div className="bg-black/40 rounded-xl p-4 mb-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Order Number</p>
                    <p className="font-mono font-bold text-lg">{selectedOrder.orderNumber || selectedOrder.id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500 mt-1">ID: {selectedOrder.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Order Date</p>
                    <p className="font-semibold">{formatDate(selectedOrder.purchaseDate || selectedOrder.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      {editingStatus ? (
                        <>
                          <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="px-3 py-1 bg-white/10 rounded-lg text-sm"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="refunded">Refunded</option>
                          </select>
                          <button
                            onClick={handleUpdateStatus}
                            className="px-2 py-1 bg-green-600 rounded text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingStatus(false)
                              setNewStatus(selectedOrder.status || 'pending')
                            }}
                            className="px-2 py-1 bg-gray-600 rounded text-xs"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(selectedOrder.status)}`}>
                            {selectedOrder.status || 'pending'}
                          </span>
                          <button
                            onClick={() => setEditingStatus(true)}
                            className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs"
                          >
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Event & Venue Information */}
              <div className="bg-black/40 rounded-xl p-4 mb-6">
                <h3 className="font-semibold mb-3 text-purple-400">Event Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Event Name</p>
                    <p className="font-semibold">{selectedOrder.eventName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Venue</p>
                    <p className="font-semibold">{selectedOrder.venueName || 'N/A'}</p>
                  </div>
                  {selectedOrder.eventId && (
                    <div>
                      <p className="text-sm text-gray-400">Event ID</p>
                      <p className="font-mono text-sm">{selectedOrder.eventId}</p>
                    </div>
                  )}
                  {selectedOrder.venueId && (
                    <div>
                      <p className="text-sm text-gray-400">Venue ID</p>
                      <p className="font-mono text-sm">{selectedOrder.venueId}</p>
                    </div>
                  )}
                  {selectedOrder.promoterId && (
                    <div>
                      <p className="text-sm text-gray-400">Promoter ID</p>
                      <p className="font-mono text-sm">{selectedOrder.promoterId}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-black/40 rounded-xl p-4 mb-6">
                <h3 className="font-semibold mb-3 text-purple-400">Customer Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Name</p>
                    <p className="font-semibold">{selectedOrder.customerName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="font-semibold">{selectedOrder.customerEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Phone</p>
                    <p className="font-semibold">{selectedOrder.customerPhone || 'N/A'}</p>
                  </div>
                  {selectedOrder.customerId && (
                    <div>
                      <p className="text-sm text-gray-400">Customer ID</p>
                      <p className="font-mono text-sm">{selectedOrder.customerId}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tickets Information */}
              {selectedOrder.tickets && selectedOrder.tickets.length > 0 && (
                <div className="bg-black/40 rounded-xl p-4 mb-6">
                  <h3 className="font-semibold mb-3 text-purple-400">Tickets ({selectedOrder.tickets.length})</h3>
                  <div className="space-y-2">
                    {selectedOrder.tickets.map((ticket: any, index: number) => (
                      <div key={index} className="bg-white/5 rounded-lg p-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <p className="text-xs text-gray-400">Section</p>
                            <p className="font-semibold">{ticket.sectionName || ticket.sectionId || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Row</p>
                            <p className="font-semibold">{ticket.rowNumber || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Seat</p>
                            <p className="font-semibold">{ticket.seatNumber || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Price</p>
                            <p className="font-semibold">${formatCurrency(ticket.price)}</p>
                          </div>
                        </div>
                        {ticket.ticketType && (
                          <div className="mt-2">
                            <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs">
                              {ticket.ticketType}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing Breakdown */}
              <div className="bg-black/40 rounded-xl p-4 mb-6">
                <h3 className="font-semibold mb-3 text-purple-400">Pricing Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="font-semibold">
                      ${formatCurrency(selectedOrder.pricing?.subtotal || 0)}
                    </span>
                  </div>
                  {selectedOrder.pricing?.serviceFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Service Fee</span>
                      <span>${formatCurrency(selectedOrder.pricing.serviceFee)}</span>
                    </div>
                  )}
                  {selectedOrder.pricing?.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tax</span>
                      <span>${formatCurrency(selectedOrder.pricing.tax)}</span>
                    </div>
                  )}
                  {selectedOrder.pricing?.discountAmount > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>Discount ({selectedOrder.pricing.discountCode})</span>
                      <span>-${formatCurrency(selectedOrder.pricing.discountAmount)}</span>
                    </div>
                  )}
                  <div className="border-t border-white/10 pt-2 flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-xl text-green-400">
                      ${formatCurrency(selectedOrder.pricing?.total || selectedOrder.totalAmount || selectedOrder.total || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-black/40 rounded-xl p-4 mb-6">
                <h3 className="font-semibold mb-3 text-purple-400">Payment Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Payment Method</p>
                    <p className="font-semibold">{selectedOrder.paymentMethod || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Payment Status</p>
                    <p className={`font-semibold ${getPaymentStatusColor(selectedOrder.paymentStatus)}`}>
                      {selectedOrder.paymentStatus || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Check-in Status */}
              {selectedOrder.checkInStatus && (
                <div className="bg-black/40 rounded-xl p-4 mb-6">
                  <h3 className="font-semibold mb-3 text-purple-400">Check-in Status</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Status</p>
                      <p className="font-semibold">
                        {typeof selectedOrder.checkInStatus === 'object' 
                          ? selectedOrder.checkInStatus.status 
                          : selectedOrder.checkInStatus}
                      </p>
                    </div>
                    {selectedOrder.checkInStatus.checkedInAt && (
                      <div>
                        <p className="text-sm text-gray-400">Checked In At</p>
                        <p className="font-semibold">
                          {formatDate(selectedOrder.checkInStatus.checkedInAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Special Requests */}
              {selectedOrder.specialRequests && (
                <div className="bg-black/40 rounded-xl p-4 mb-6">
                  <h3 className="font-semibold mb-3 text-purple-400">Special Requests</h3>
                  <p className="text-gray-300">{selectedOrder.specialRequests}</p>
                </div>
              )}

              {/* Refund Information */}
              {selectedOrder.refundInfo && (
                <div className="bg-red-600/10 border border-red-600/30 rounded-xl p-4 mb-6">
                  <h3 className="font-semibold mb-3 text-red-400">Refund Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Refunded Amount</p>
                      <p className="font-semibold">${formatCurrency(selectedOrder.refundInfo.amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Refunded At</p>
                      <p className="font-semibold">{formatDate(selectedOrder.refundInfo.refundedAt)}</p>
                    </div>
                    {selectedOrder.refundInfo.reason && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-400">Reason</p>
                        <p className="font-semibold">{selectedOrder.refundInfo.reason}</p>
                      </div>
                    )}
                    {selectedOrder.refundInfo.refundedBy && (
                      <div>
                        <p className="text-sm text-gray-400">Refunded By</p>
                        <p className="font-semibold">{selectedOrder.refundInfo.refundedBy}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="bg-black/40 rounded-xl p-4 mb-6">
                <h3 className="font-semibold mb-3 text-purple-400">Timestamps</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Created At</p>
                    <p className="font-semibold">{formatDate(selectedOrder.createdAt)}</p>
                  </div>
                  {selectedOrder.updatedAt && (
                    <div>
                      <p className="text-sm text-gray-400">Last Updated</p>
                      <p className="font-semibold">{formatDate(selectedOrder.updatedAt)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                {selectedOrder.status !== 'refunded' && selectedOrder.status !== 'cancelled' && (
                  <button
                    onClick={handleRefund}
                    className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg hover:bg-red-600/30"
                  >
                    Process Refund
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-lg hover:bg-blue-600/30"
                >
                  Print Order
                </button>
                <button
                  onClick={() => {
                    // Could implement email functionality here
                    alert('Email functionality to be implemented')
                  }}
                  className="px-4 py-2 bg-green-600/20 text-green-400 border border-green-600/30 rounded-lg hover:bg-green-600/30"
                >
                  Email Receipt
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
