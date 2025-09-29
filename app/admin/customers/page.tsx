'use client'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'
import {auth, db} from '@/lib/firebase'
import {onAuthStateChanged} from 'firebase/auth'
import {doc, updateDoc, Timestamp, collection, query, where, getDocs} from 'firebase/firestore'
import AdminLayout from '@/components/AdminLayout'

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
        return {
          ...customer,
          totalOrders: stats.totalOrders || customer.totalOrders || 0,
          totalSpent: stats.totalSpent || customer.totalSpent || 0,
          lastOrderDate: stats.lastOrderDate || customer.lastOrderDate,
          eventCount: stats.events?.size || 0,
          // Calculate membership tier based on spending
          membershipTier: customer.membershipTier || calculateTier(stats.totalSpent || 0)
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
    setSelectedCustomer(customer)
    setEditValues({
      name: customer.name || '',
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
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-gray-400">View customer information and purchase history</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Total Customers</p>
            <p className="text-2xl font-bold">{customers.length}</p>
          </div>
          <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-green-400">
              ${customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0).toFixed(0)}
            </p>
          </div>
          <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Avg Customer Value</p>
            <p className="text-2xl font-bold">
              ${customers.length > 0 ? 
                (customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0) / customers.length).toFixed(0) : 
                '0'}
            </p>
          </div>
          <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-gray-400 text-sm mb-1">VIP Customers</p>
            <p className="text-2xl font-bold text-yellow-400">
              {customers.filter(c => ['gold', 'platinum'].includes(c.membershipTier)).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-4 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, email, phone..."
                className="w-full px-3 py-2 bg-white/10 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Membership Tier</label>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 rounded-lg"
              >
                <option value="all">All Tiers</option>
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 rounded-lg"
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
                className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 w-full"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-12 text-center">
            <p className="text-gray-400">No customers found</p>
          </div>
        ) : (
          <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="text-left p-4">Customer</th>
                    <th className="text-left p-4">Contact</th>
                    <th className="text-center p-4">Orders</th>
                    <th className="text-center p-4">Events</th>
                    <th className="text-right p-4">Total Spent</th>
                    <th className="text-center p-4">Tier</th>
                    <th className="text-center p-4">Last Order</th>
                    <th className="text-center p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer, idx) => (
                    <tr key={customer.id || idx} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-4">
                        <div className="font-semibold">{customer.name || 'Unknown'}</div>
                        <div className="text-sm text-gray-400">{customer.email}</div>
                      </td>
                      <td className="p-4 text-sm text-gray-400">
                        {customer.phone || 'No phone'}
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-sm">
                          {customer.totalOrders || 0}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm">
                          {customer.eventCount || 0}
                        </span>
                      </td>
                      <td className="p-4 text-right font-semibold">
                        ${formatCurrency(customer.totalSpent || 0)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTierColor(customer.membershipTier)}`}>
                          {customer.membershipTier || 'bronze'}
                        </span>
                      </td>
                      <td className="p-4 text-center text-sm">
                        {formatDate(customer.lastOrderDate)}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleViewDetails(customer)}
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

        {/* Customer Details Modal */}
        {showDetailsModal && selectedCustomer && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-5xl my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Customer Details</h2>
                <button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setSelectedCustomer(null)
                    setEditingField(null)
                  }}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Customer Header */}
              <div className="bg-black/40 rounded-xl p-4 mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {selectedCustomer.name?.charAt(0)?.toUpperCase() || selectedCustomer.email?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{selectedCustomer.name || 'Unknown Customer'}</h3>
                      <p className="text-gray-400">{selectedCustomer.email}</p>
                      <div className="flex gap-2 mt-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTierColor(selectedCustomer.membershipTier)}`}>
                          {selectedCustomer.membershipTier || 'bronze'}
                        </span>
                        {selectedCustomer.uid && (
                          <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-xs">
                            Registered User
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {selectedCustomer.loyaltyPoints > 0 && (
                      <div className="mb-2">
                        <p className="text-sm text-gray-400">Loyalty Points</p>
                        <p className="text-2xl font-bold text-yellow-400">{selectedCustomer.loyaltyPoints}</p>
                      </div>
                    )}
                    {selectedCustomer.id && (
                      <p className="text-xs text-gray-500 font-mono">ID: {selectedCustomer.id}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="bg-black/40 rounded-xl p-4 mb-6">
                <h3 className="font-semibold mb-3 text-purple-400">Personal Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Name</p>
                    {editingField === 'name' ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editValues.name}
                          onChange={(e) => setEditValues({...editValues, name: e.target.value})}
                          className="px-2 py-1 bg-white/10 rounded"
                        />
                        <button onClick={() => handleUpdateField('name')} className="px-2 py-1 bg-green-600 rounded text-xs">Save</button>
                        <button onClick={() => setEditingField(null)} className="px-2 py-1 bg-gray-600 rounded text-xs">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{selectedCustomer.name || 'N/A'}</p>
                        <button onClick={() => setEditingField('name')} className="text-blue-400 text-xs">Edit</button>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="font-semibold">{selectedCustomer.email}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400">Phone</p>
                    {editingField === 'phone' ? (
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          value={editValues.phone}
                          onChange={(e) => setEditValues({...editValues, phone: e.target.value})}
                          className="px-2 py-1 bg-white/10 rounded"
                        />
                        <button onClick={() => handleUpdateField('phone')} className="px-2 py-1 bg-green-600 rounded text-xs">Save</button>
                        <button onClick={() => setEditingField(null)} className="px-2 py-1 bg-gray-600 rounded text-xs">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{selectedCustomer.phone || 'N/A'}</p>
                        <button onClick={() => setEditingField('phone')} className="text-blue-400 text-xs">Edit</button>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400">Date of Birth</p>
                    {editingField === 'dateOfBirth' ? (
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={editValues.dateOfBirth}
                          onChange={(e) => setEditValues({...editValues, dateOfBirth: e.target.value})}
                          className="px-2 py-1 bg-white/10 rounded"
                        />
                        <button onClick={() => handleUpdateField('dateOfBirth')} className="px-2 py-1 bg-green-600 rounded text-xs">Save</button>
                        <button onClick={() => setEditingField(null)} className="px-2 py-1 bg-gray-600 rounded text-xs">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{formatDate(selectedCustomer.dateOfBirth)}</p>
                        <button onClick={() => setEditingField('dateOfBirth')} className="text-blue-400 text-xs">Edit</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-black/40 rounded-xl p-4 mb-6">
                <h3 className="font-semibold mb-3 text-purple-400">Address</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-400">Street Address</p>
                    {editingField === 'address.street' ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editValues.address.street}
                          onChange={(e) => setEditValues({
                            ...editValues,
                            address: {...editValues.address, street: e.target.value}
                          })}
                          className="flex-1 px-2 py-1 bg-white/10 rounded"
                        />
                        <button onClick={() => handleUpdateField('address.street')} className="px-2 py-1 bg-green-600 rounded text-xs">Save</button>
                        <button onClick={() => setEditingField(null)} className="px-2 py-1 bg-gray-600 rounded text-xs">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{selectedCustomer.address?.street || 'N/A'}</p>
                        <button onClick={() => setEditingField('address.street')} className="text-blue-400 text-xs">Edit</button>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400">City</p>
                    <p className="font-semibold">{selectedCustomer.address?.city || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400">State</p>
                    <p className="font-semibold">{selectedCustomer.address?.state || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400">ZIP Code</p>
                    <p className="font-semibold">{selectedCustomer.address?.zip || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400">Country</p>
                    <p className="font-semibold">{selectedCustomer.address?.country || 'USA'}</p>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="bg-black/40 rounded-xl p-4 mb-6">
                <h3 className="font-semibold mb-3 text-purple-400">Preferences</h3>
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
                    <span>Email Notifications</span>
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
                    <span>Newsletter</span>
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
                    <span>SMS Alerts</span>
                  </label>
                </div>
              </div>

              {/* Tags */}
              <div className="bg-black/40 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-purple-400">Tags</h3>
                  <button
                    onClick={handleAddTag}
                    className="px-3 py-1 bg-purple-600 rounded text-sm"
                  >
                    + Add Tag
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editValues.tags.length > 0 ? (
                    editValues.tags.map((tag: string) => (
                      <span key={tag} className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-sm flex items-center gap-2">
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
                    <p className="text-gray-500 text-sm">No tags</p>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div className="bg-black/40 rounded-xl p-4 mb-6">
                <h3 className="font-semibold mb-3 text-purple-400">Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Total Orders</p>
                    <p className="text-2xl font-bold">{selectedCustomer.totalOrders || 0}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Total Spent</p>
                    <p className="text-2xl font-bold text-green-400">${formatCurrency(selectedCustomer.totalSpent || 0)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Events Attended</p>
                    <p className="text-2xl font-bold">{selectedCustomer.eventCount || 0}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Last Order</p>
                    <p className="text-sm font-semibold">{formatDate(selectedCustomer.lastOrderDate)}</p>
                  </div>
                </div>
              </div>

              {/* Order History */}
              <div className="bg-black/40 rounded-xl p-4 mb-6">
                <h3 className="font-semibold mb-3 text-purple-400">Order History ({customerOrders.length})</h3>
                {customerOrders.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {customerOrders.map((order, idx) => (
                      <div key={order.id || idx} className="bg-white/5 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">{order.eventName || 'Unknown Event'}</p>
                            <p className="text-sm text-gray-400">{order.venueName || ''}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-400">
                              ${formatCurrency(order.pricing?.total || order.totalAmount || order.total || 0)}
                            </p>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              order.status === 'confirmed' || order.status === 'completed' 
                                ? 'bg-green-600/20 text-green-400' 
                                : order.status === 'cancelled' || order.status === 'refunded'
                                ? 'bg-red-600/20 text-red-400'
                                : 'bg-yellow-600/20 text-yellow-400'
                            }`}>
                              {order.status || 'pending'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <p className="text-gray-400">Order #</p>
                            <p className="font-mono">{order.orderNumber || order.id.slice(0, 8)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Date</p>
                            <p>{formatDate(order.purchaseDate || order.createdAt)}</p>
                          </div>
                          {order.tickets && order.tickets.length > 0 && (
                            <div>
                              <p className="text-gray-400">Tickets</p>
                              <p>{order.tickets.length}</p>
                            </div>
                          )}
                          <div>
                            <button
                              onClick={() => router.push(`/admin/orders`)}
                              className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded text-xs hover:bg-purple-600/30"
                            >
                              View Order
                            </button>
                          </div>
                        </div>
                        
                        {order.tickets && order.tickets.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-xs text-gray-400 mb-2">Seats:</p>
                            <div className="flex flex-wrap gap-2">
                              {order.tickets.map((ticket: any, tIdx: number) => (
                                <span key={tIdx} className="px-2 py-1 bg-black/30 rounded text-xs">
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
                  <p className="text-gray-500 text-center py-4">No orders yet</p>
                )}
              </div>

              {/* Notes */}
              <div className="bg-black/40 rounded-xl p-4 mb-6">
                <h3 className="font-semibold mb-3 text-purple-400">Internal Notes</h3>
                {editingField === 'notes' ? (
                  <div>
                    <textarea
                      value={editValues.notes}
                      onChange={(e) => setEditValues({...editValues, notes: e.target.value})}
                      className="w-full px-3 py-2 bg-white/10 rounded-lg h-24"
                      placeholder="Add notes about this customer..."
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleUpdateField('notes')} className="px-3 py-1 bg-green-600 rounded">Save</button>
                      <button onClick={() => setEditingField(null)} className="px-3 py-1 bg-gray-600 rounded">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-300">{selectedCustomer.notes || 'No notes'}</p>
                    <button onClick={() => setEditingField('notes')} className="text-blue-400 text-sm mt-2">Edit Notes</button>
                  </div>
                )}
              </div>

              {/* Account Information */}
              {(selectedCustomer.uid || selectedCustomer.stripeCustomerId) && (
                <div className="bg-black/40 rounded-xl p-4 mb-6">
                  <h3 className="font-semibold mb-3 text-purple-400">Account Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedCustomer.uid && (
                      <div>
                        <p className="text-sm text-gray-400">Firebase UID</p>
                        <p className="font-mono text-sm">{selectedCustomer.uid}</p>
                      </div>
                    )}
                    {selectedCustomer.stripeCustomerId && (
                      <div>
                        <p className="text-sm text-gray-400">Stripe Customer ID</p>
                        <p className="font-mono text-sm">{selectedCustomer.stripeCustomerId}</p>
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
                    <p className="text-sm text-gray-400">Customer Since</p>
                    <p className="font-semibold">{formatDate(selectedCustomer.createdAt)}</p>
                  </div>
                  {selectedCustomer.updatedAt && (
                    <div>
                      <p className="text-sm text-gray-400">Last Updated</p>
                      <p className="font-semibold">{formatDate(selectedCustomer.updatedAt)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    const subject = `Regarding your orders at VenueViz`
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
    </AdminLayout>
  )
}
