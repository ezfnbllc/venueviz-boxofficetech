'use client'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'
import {auth, db} from '@/lib/firebase'
import {onAuthStateChanged} from 'firebase/auth'
import {doc, updateDoc, Timestamp, collection, query, where, getDocs} from 'firebase/firestore'

export default function CustomersManagement() {
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
  const [allOrders, setAllOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [customerOrders, setCustomerOrders] = useState<any[]>([])
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTier, setFilterTier] = useState('all')
  const [sortBy, setSortBy] = useState('totalSpent')
  const [editValues, setEditValues] = useState<any>({})

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        loadData()
      } else {
        router.push('/login')
      }
    })
    return () => unsubscribe()
  }, [router])

  const loadData = async () => {
    try {
      const [customersData, ordersData] = await Promise.all([
        AdminService.getCustomers(),
        AdminService.getOrders()
      ])

      // Calculate customer statistics from orders
      const customerStats = new Map()

      ordersData.forEach((order: any) => {
        const email = order.customerEmail
        if (!email) return

        const stats = customerStats.get(email) || {
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: null,
          events: new Set()
        }

        stats.totalOrders++
        stats.totalSpent += order.pricing?.total || order.totalAmount || order.total || 0

        const orderDate = order.purchaseDate || order.createdAt
        if (!stats.lastOrderDate || orderDate > stats.lastOrderDate) {
          stats.lastOrderDate = orderDate
        }

        if (order.eventName) {
          stats.events.add(order.eventName)
        }

        customerStats.set(email, stats)
      })

      // Merge stats with customer data
      const enhancedCustomers = customersData.map((customer: any) => {
        const stats = customerStats.get(customer.email) || {}
        // Handle both name schemas: single 'name' field or 'firstName' + 'lastName'
        const customerName = customer.name ||
          [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
          customer.email?.split('@')[0] || 'Unknown'
        return {
          ...customer,
          name: customerName,
          totalOrders: stats.totalOrders || customer.totalOrders || customer.orderCount || 0,
          totalSpent: stats.totalSpent || customer.totalSpent || 0,
          lastOrderDate: stats.lastOrderDate || customer.lastOrderDate || customer.lastLoginAt,
          eventCount: stats.events?.size || 0,
          // Calculate membership tier based on spending
          membershipTier: customer.membershipTier || calculateTier(stats.totalSpent || customer.totalSpent || 0)
        }
      })

      setCustomers(enhancedCustomers)
      setAllOrders(ordersData)
    } catch (error) {
      console.error('Error loading data:', error)
    }
    setLoading(false)
  }

  const calculateTier = (totalSpent: number) => {
    if (totalSpent >= 10000) return 'platinum'
    if (totalSpent >= 5000) return 'gold'
    if (totalSpent >= 1000) return 'silver'
    return 'bronze'
  }

  const getTierColor = (tier: string) => {
    switch(tier) {
      case 'platinum': return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900'
      case 'gold': return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white'
      case 'silver': return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
      default: return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white'
    }
  }

  const handleViewDetails = async (customer: any) => {
    // Handle both name schemas
    const displayName = customer.name ||
      [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
      customer.email?.split('@')[0] || ''
    setSelectedCustomer({ ...customer, name: displayName })
    setEditValues({
      name: displayName,
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      email: customer.email || '',
      phone: customer.phone || '',
      dateOfBirth: customer.dateOfBirth ? formatDateForInput(customer.dateOfBirth) : '',
      address: {
        street: customer.address?.street || '',
        city: customer.address?.city || '',
        state: customer.address?.state || '',
        zip: customer.address?.zip || '',
        country: customer.address?.country || 'USA'
      },
      preferences: {
        notifications: customer.preferences?.notifications !== false,
        newsletter: customer.preferences?.newsletter !== false,
        smsAlerts: customer.preferences?.smsAlerts !== false
      },
      loyaltyPoints: customer.loyaltyPoints || 0,
      membershipTier: customer.membershipTier || 'bronze',
      tags: customer.tags || [],
      notes: customer.notes || ''
    })

    // Load customer's orders
    const orders = allOrders.filter(order =>
      order.customerEmail === customer.email ||
      order.customerId === customer.id
    ).sort((a, b) => {
      const dateA = a.purchaseDate?.toDate?.() || a.createdAt?.toDate?.() || new Date(0)
      const dateB = b.purchaseDate?.toDate?.() || b.createdAt?.toDate?.() || new Date(0)
      return dateB.getTime() - dateA.getTime()
    })

    setCustomerOrders(orders)
    setShowDetailsModal(true)
    setEditingField(null)
  }

  const handleUpdateField = async (fieldPath: string) => {
    if (!selectedCustomer) return

    try {
      const customerRef = doc(db, 'customers', selectedCustomer.id)
      let updateData: any = {}

      if (fieldPath.includes('.')) {
        // Nested field
        const parts = fieldPath.split('.')
        updateData[parts[0]] = { ...selectedCustomer[parts[0]] }
        let current = updateData[parts[0]]
        let editCurrent = editValues[parts[0]]

        for (let i = 1; i < parts.length - 1; i++) {
          current = current[parts[i]]
          editCurrent = editCurrent[parts[i]]
        }

        current[parts[parts.length - 1]] = editCurrent[parts[parts.length - 1]]
      } else {
        updateData[fieldPath] = editValues[fieldPath]
      }

      updateData.updatedAt = Timestamp.now()

      await updateDoc(customerRef, updateData)

      // Update local state
      const updatedCustomers = customers.map(c =>
        c.id === selectedCustomer.id ? { ...c, ...updateData } : c
      )
      setCustomers(updatedCustomers)
      setSelectedCustomer({ ...selectedCustomer, ...updateData })
      setEditingField(null)

      alert('Customer updated successfully!')
    } catch (error) {
      console.error('Error updating customer:', error)
      alert('Error updating customer')
    }
  }

  const handleAddTag = async () => {
    const newTag = prompt('Enter new tag:')
    if (!newTag) return

    const updatedTags = [...(editValues.tags || []), newTag]
    setEditValues({ ...editValues, tags: updatedTags })

    // Auto-save tags
    if (selectedCustomer) {
      try {
        const customerRef = doc(db, 'customers', selectedCustomer.id)
        await updateDoc(customerRef, {
          tags: updatedTags,
          updatedAt: Timestamp.now()
        })
        setSelectedCustomer({ ...selectedCustomer, tags: updatedTags })
      } catch (error) {
        console.error('Error adding tag:', error)
      }
    }
  }

  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = editValues.tags.filter((tag: string) => tag !== tagToRemove)
    setEditValues({ ...editValues, tags: updatedTags })

    // Auto-save tags
    if (selectedCustomer) {
      try {
        const customerRef = doc(db, 'customers', selectedCustomer.id)
        await updateDoc(customerRef, {
          tags: updatedTags,
          updatedAt: Timestamp.now()
        })
        setSelectedCustomer({ ...selectedCustomer, tags: updatedTags })
      } catch (error) {
        console.error('Error removing tag:', error)
      }
    }
  }

  const formatCurrency = (amount: any) => {
    return (parseFloat(amount) || 0).toFixed(2)
  }

  const formatDate = (date: any) => {
    if (!date) return 'N/A'
    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toLocaleDateString()
  }

  const formatDateForInput = (date: any) => {
    if (!date) return ''
    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toISOString().split('T')[0]
  }

  // Filter and sort customers
  const filteredCustomers = customers
    .filter(customer => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchesSearch =
          customer.name?.toLowerCase().includes(search) ||
          customer.email?.toLowerCase().includes(search) ||
          customer.phone?.toLowerCase().includes(search)
        if (!matchesSearch) return false
      }

      // Tier filter
      if (filterTier !== 'all' && customer.membershipTier !== filterTier) return false

      return true
    })
    .sort((a, b) => {
      switch(sortBy) {
        case 'totalSpent':
          return (b.totalSpent || 0) - (a.totalSpent || 0)
        case 'totalOrders':
          return (b.totalOrders || 0) - (a.totalOrders || 0)
        case 'lastOrderDate':
          const dateA = a.lastOrderDate?.toDate?.() || a.lastOrderDate || new Date(0)
          const dateB = b.lastOrderDate?.toDate?.() || b.lastOrderDate || new Date(0)
          return dateB.getTime() - dateA.getTime()
        case 'name':
          return (a.name || '').localeCompare(b.name || '')
        default:
          return 0
      }
    })

  return (
    <>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Customers</h1>
          <p className="text-slate-500 dark:text-slate-400">View customer information and purchase history</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="stat-card p-4 rounded-xl">
            <p className="text-secondary-contrast text-sm mb-1 font-medium">Total Customers</p>
            <p className="text-2xl font-bold text-primary-contrast">{customers.length}</p>
          </div>
          <div className="stat-card p-4 rounded-xl">
            <p className="text-secondary-contrast text-sm mb-1 font-medium">Total Revenue</p>
            <p className="text-2xl font-bold text-money">
              ${customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0).toFixed(0)}
            </p>
          </div>
          <div className="stat-card p-4 rounded-xl">
            <p className="text-secondary-contrast text-sm mb-1 font-medium">Avg Customer Value</p>
            <p className="text-2xl font-bold text-primary-contrast">
              ${customers.length > 0 ?
                (customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0) / customers.length).toFixed(0) :
                '0'}
            </p>
          </div>
          <div className="stat-card p-4 rounded-xl">
            <p className="text-secondary-contrast text-sm mb-1 font-medium">VIP Customers</p>
            <p className="text-2xl font-bold text-amber-500 dark:text-yellow-400">
              {customers.filter(c => ['gold', 'platinum'].includes(c.membershipTier)).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="card-elevated rounded-xl p-4 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm mb-2 text-slate-900 dark:text-white">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, email, phone..."
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm mb-2 text-slate-900 dark:text-white">Membership Tier</label>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="all">All Tiers</option>
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-2 text-slate-900 dark:text-white">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="totalSpent">Total Spent</option>
                <option value="totalOrders">Total Orders</option>
                <option value="lastOrderDate">Last Order</option>
                <option value="name">Name</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadData}
                className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 w-full"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500 dark:border-accent-500"/>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="card-elevated rounded-xl p-12 text-center">
            <p className="text-secondary-contrast">No customers found</p>
          </div>
        ) : (
          <div className="table-container rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left p-4 text-slate-900 dark:text-white">Customer</th>
                    <th className="text-left p-4 text-slate-900 dark:text-white">Tenant</th>
                    <th className="text-left p-4 text-slate-900 dark:text-white">Contact</th>
                    <th className="text-center p-4 text-slate-900 dark:text-white">Orders</th>
                    <th className="text-center p-4 text-slate-900 dark:text-white">Events</th>
                    <th className="text-right p-4 text-slate-900 dark:text-white">Total Spent</th>
                    <th className="text-center p-4 text-slate-900 dark:text-white">Tier</th>
                    <th className="text-center p-4 text-slate-900 dark:text-white">Last Order</th>
                    <th className="text-center p-4 text-slate-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer, idx) => (
                    <tr key={customer.id || idx} className="table-row hover:bg-blue-50/50 dark:hover:bg-slate-700">
                      <td className="p-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{customer.name || 'Unknown'}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{customer.email}</div>
                        {customer.isGuest && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-full">Guest</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-slate-500 dark:text-slate-400">
                        {customer.promoterSlug || '-'}
                      </td>
                      <td className="p-4 text-sm text-slate-500 dark:text-slate-400">
                        {customer.phone || 'No phone'}
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-3 py-1 badge-info rounded-full text-sm">
                          {customer.totalOrders || 0}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-3 py-1 bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-full text-sm border border-blue-500/20">
                          {customer.eventCount || 0}
                        </span>
                      </td>
                      <td className="p-4 text-right font-semibold text-money">
                        ${formatCurrency(customer.totalSpent || 0)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTierColor(customer.membershipTier)}`}>
                          {customer.membershipTier || 'bronze'}
                        </span>
                      </td>
                      <td className="p-4 text-center text-sm text-slate-900 dark:text-white">
                        {formatDate(customer.lastOrderDate)}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleViewDetails(customer)}
                          className="px-3 py-1 btn-accent rounded-lg text-sm"
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

        {/* Customer Details Modal */}
        {showDetailsModal && selectedCustomer && (
          <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-5xl my-8 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Customer Details</h2>
                <button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setSelectedCustomer(null)
                    setEditingField(null)
                  }}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Customer Header */}
              <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/30">
                      {selectedCustomer.name?.charAt(0)?.toUpperCase() || selectedCustomer.email?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedCustomer.name || 'Unknown Customer'}</h3>
                      <p className="text-slate-500 dark:text-slate-400">{selectedCustomer.email}</p>
                      <div className="flex gap-2 mt-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTierColor(selectedCustomer.membershipTier)}`}>
                          {selectedCustomer.membershipTier || 'bronze'}
                        </span>
                        {selectedCustomer.firebaseUid && (
                          <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-xs">
                            Registered User
                          </span>
                        )}
                        {selectedCustomer.isGuest && (
                          <span className="px-3 py-1 bg-yellow-600/20 text-yellow-400 rounded-full text-xs">
                            Guest
                          </span>
                        )}
                        {selectedCustomer.promoterSlug && (
                          <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs">
                            Tenant: {selectedCustomer.promoterSlug}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {selectedCustomer.loyaltyPoints > 0 && (
                      <div className="mb-2">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Loyalty Points</p>
                        <p className="text-2xl font-bold text-yellow-400">{selectedCustomer.loyaltyPoints}</p>
                      </div>
                    )}
                    {selectedCustomer.id && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">ID: {selectedCustomer.id}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold mb-3 text-blue-600 dark:text-accent-400">Personal Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">First Name</p>
                    {editingField === 'firstName' ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editValues.firstName}
                          onChange={(e) => setEditValues({...editValues, firstName: e.target.value})}
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-900 dark:text-white"
                        />
                        <button onClick={() => handleUpdateField('firstName')} className="px-2 py-1 bg-green-600 rounded text-xs text-white">Save</button>
                        <button onClick={() => setEditingField(null)} className="px-2 py-1 bg-gray-600 rounded text-xs text-white">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white">{selectedCustomer.firstName || 'N/A'}</p>
                        <button onClick={() => setEditingField('firstName')} className="text-blue-400 text-xs">Edit</button>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Last Name</p>
                    {editingField === 'lastName' ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editValues.lastName}
                          onChange={(e) => setEditValues({...editValues, lastName: e.target.value})}
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-900 dark:text-white"
                        />
                        <button onClick={() => handleUpdateField('lastName')} className="px-2 py-1 bg-green-600 rounded text-xs text-white">Save</button>
                        <button onClick={() => setEditingField(null)} className="px-2 py-1 bg-gray-600 rounded text-xs text-white">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white">{selectedCustomer.lastName || 'N/A'}</p>
                        <button onClick={() => setEditingField('lastName')} className="text-blue-400 text-xs">Edit</button>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{selectedCustomer.email}</p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
                    {editingField === 'phone' ? (
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          value={editValues.phone}
                          onChange={(e) => setEditValues({...editValues, phone: e.target.value})}
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-900 dark:text-white"
                        />
                        <button onClick={() => handleUpdateField('phone')} className="px-2 py-1 bg-green-600 rounded text-xs text-white">Save</button>
                        <button onClick={() => setEditingField(null)} className="px-2 py-1 bg-gray-600 rounded text-xs text-white">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white">{selectedCustomer.phone || 'N/A'}</p>
                        <button onClick={() => setEditingField('phone')} className="text-blue-400 text-xs">Edit</button>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Date of Birth</p>
                    {editingField === 'dateOfBirth' ? (
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={editValues.dateOfBirth}
                          onChange={(e) => setEditValues({...editValues, dateOfBirth: e.target.value})}
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-900 dark:text-white"
                        />
                        <button onClick={() => handleUpdateField('dateOfBirth')} className="px-2 py-1 bg-green-600 rounded text-xs text-white">Save</button>
                        <button onClick={() => setEditingField(null)} className="px-2 py-1 bg-gray-600 rounded text-xs text-white">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white">{formatDate(selectedCustomer.dateOfBirth)}</p>
                        <button onClick={() => setEditingField('dateOfBirth')} className="text-blue-400 text-xs">Edit</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold mb-3 text-blue-600 dark:text-accent-400">Address</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Street Address</p>
                    {editingField === 'address.street' ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editValues.address.street}
                          onChange={(e) => setEditValues({
                            ...editValues,
                            address: {...editValues.address, street: e.target.value}
                          })}
                          className="flex-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-900 dark:text-white"
                        />
                        <button onClick={() => handleUpdateField('address.street')} className="px-2 py-1 bg-green-600 rounded text-xs text-white">Save</button>
                        <button onClick={() => setEditingField(null)} className="px-2 py-1 bg-gray-600 rounded text-xs text-white">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white">{selectedCustomer.address?.street || 'N/A'}</p>
                        <button onClick={() => setEditingField('address.street')} className="text-blue-400 text-xs">Edit</button>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">City</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{selectedCustomer.address?.city || 'N/A'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">State</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{selectedCustomer.address?.state || 'N/A'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">ZIP Code</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{selectedCustomer.address?.zip || 'N/A'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Country</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{selectedCustomer.address?.country || 'USA'}</p>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold mb-3 text-blue-600 dark:text-accent-400">Preferences</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editValues.preferences.notifications}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        preferences: {...editValues.preferences, notifications: e.target.checked}
                      })}
                      className="rounded"
                    />
                    <span className="text-slate-900 dark:text-white">Email Notifications</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editValues.preferences.newsletter}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        preferences: {...editValues.preferences, newsletter: e.target.checked}
                      })}
                      className="rounded"
                    />
                    <span className="text-slate-900 dark:text-white">Newsletter</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editValues.preferences.smsAlerts}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        preferences: {...editValues.preferences, smsAlerts: e.target.checked}
                      })}
                      className="rounded"
                    />
                    <span className="text-slate-900 dark:text-white">SMS Alerts</span>
                  </label>
                </div>
              </div>

              {/* Tags */}
              <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-blue-600 dark:text-accent-400">Tags</h3>
                  <button
                    onClick={handleAddTag}
                    className="px-3 py-1 btn-accent rounded text-sm"
                  >
                    + Add Tag
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editValues.tags.length > 0 ? (
                    editValues.tags.map((tag: string) => (
                      <span key={tag} className="px-3 py-1 bg-accent-600/20 text-accent-500 dark:text-accent-400 rounded-full text-sm flex items-center gap-2">
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      </span>
                    ))
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 text-sm">No tags</p>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold mb-3 text-blue-600 dark:text-accent-400">Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="stat-card rounded-lg p-3">
                    <p className="text-xs text-secondary-contrast font-medium">Total Orders</p>
                    <p className="text-2xl font-bold text-primary-contrast">{selectedCustomer.totalOrders || 0}</p>
                  </div>
                  <div className="stat-card rounded-lg p-3">
                    <p className="text-xs text-secondary-contrast font-medium">Total Spent</p>
                    <p className="text-2xl font-bold text-money">${formatCurrency(selectedCustomer.totalSpent || 0)}</p>
                  </div>
                  <div className="stat-card rounded-lg p-3">
                    <p className="text-xs text-secondary-contrast font-medium">Events Attended</p>
                    <p className="text-2xl font-bold text-primary-contrast">{selectedCustomer.eventCount || 0}</p>
                  </div>
                  <div className="stat-card rounded-lg p-3">
                    <p className="text-xs text-secondary-contrast font-medium">Last Order</p>
                    <p className="text-sm font-semibold text-primary-contrast">{formatDate(selectedCustomer.lastOrderDate)}</p>
                  </div>
                </div>
              </div>

              {/* Order History */}
              <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold mb-3 text-blue-600 dark:text-accent-400">Order History ({customerOrders.length})</h3>
                {customerOrders.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {customerOrders.map((order, idx) => (
                      <div key={order.id || idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{order.eventName || 'Unknown Event'}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{order.venueName || ''}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-money">
                              ${formatCurrency(order.pricing?.total || order.totalAmount || order.total || 0)}
                            </p>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              order.status === 'confirmed' || order.status === 'completed'
                                ? 'badge-success'
                                : order.status === 'cancelled' || order.status === 'refunded'
                                ? 'badge-error'
                                : 'badge-warning'
                            }`}>
                              {order.status || 'pending'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">Order #</p>
                            <p className="font-mono text-slate-900 dark:text-white">{order.orderNumber || order.id.slice(0, 8)}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">Date</p>
                            <p className="text-slate-900 dark:text-white">{formatDate(order.purchaseDate || order.createdAt)}</p>
                          </div>
                          {order.tickets && order.tickets.length > 0 && (
                            <div>
                              <p className="text-slate-500 dark:text-slate-400">Tickets</p>
                              <p className="text-slate-900 dark:text-white">{order.tickets.length}</p>
                            </div>
                          )}
                          <div>
                            <button
                              onClick={() => router.push(`/admin/orders`)}
                              className="px-3 py-1 badge-info rounded text-xs hover:opacity-80"
                            >
                              View Order
                            </button>
                          </div>
                        </div>

                        {order.tickets && order.tickets.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Seats:</p>
                            <div className="flex flex-wrap gap-2">
                              {order.tickets.map((ticket: any, tIdx: number) => (
                                <span key={tIdx} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-900 dark:text-white">
                                  {ticket.sectionName || 'Section'} - Row {ticket.rowNumber} - Seat {ticket.seatNumber}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-4">No orders yet</p>
                )}
              </div>

              {/* Notes */}
              <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold mb-3 text-blue-600 dark:text-accent-400">Internal Notes</h3>
                {editingField === 'notes' ? (
                  <div>
                    <textarea
                      value={editValues.notes}
                      onChange={(e) => setEditValues({...editValues, notes: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg h-24 text-slate-900 dark:text-white"
                      placeholder="Add notes about this customer..."
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleUpdateField('notes')} className="px-3 py-1 bg-green-600 text-white rounded">Save</button>
                      <button onClick={() => setEditingField(null)} className="px-3 py-1 bg-gray-600 text-white rounded">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-slate-600 dark:text-slate-300">{selectedCustomer.notes || 'No notes'}</p>
                    <button onClick={() => setEditingField('notes')} className="text-blue-400 text-sm mt-2">Edit Notes</button>
                  </div>
                )}
              </div>

              {/* Account Information */}
              {(selectedCustomer.uid || selectedCustomer.firebaseUid || selectedCustomer.stripeCustomerId || selectedCustomer.promoterSlug) && (
                <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
                  <h3 className="font-semibold mb-3 text-blue-600 dark:text-accent-400">Account Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {(selectedCustomer.uid || selectedCustomer.firebaseUid) && (
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Firebase UID</p>
                        <p className="font-mono text-sm text-slate-900 dark:text-white">{selectedCustomer.firebaseUid || selectedCustomer.uid}</p>
                      </div>
                    )}
                    {selectedCustomer.promoterSlug && (
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Tenant</p>
                        <p className="font-mono text-sm text-slate-900 dark:text-white">{selectedCustomer.promoterSlug}</p>
                      </div>
                    )}
                    {selectedCustomer.stripeCustomerId && (
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Stripe Customer ID</p>
                        <p className="font-mono text-sm text-slate-900 dark:text-white">{selectedCustomer.stripeCustomerId}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold mb-3 text-blue-600 dark:text-accent-400">Timestamps</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Customer Since</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{formatDate(selectedCustomer.createdAt)}</p>
                  </div>
                  {selectedCustomer.updatedAt && (
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Last Updated</p>
                      <p className="font-semibold text-slate-900 dark:text-white">{formatDate(selectedCustomer.updatedAt)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    const subject = `Regarding your orders at BoxOfficeTech`
                    const body = `Dear ${selectedCustomer.name || 'Customer'},\n\n`
                    window.location.href = `mailto:${selectedCustomer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
                  }}
                  className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-lg hover:bg-blue-600/30"
                >
                  Send Email
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-green-600/20 text-green-400 border border-green-600/30 rounded-lg hover:bg-green-600/30"
                >
                  Print Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
