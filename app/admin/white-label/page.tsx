'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AdminService } from '@/lib/admin/adminService'
import { StorageService } from '@/lib/storage/storageService'
import { db, auth } from '@/lib/firebase'
import { collection, getDocs, query, where, Timestamp, writeBatch, doc } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import { PromoterProfile } from '@/lib/types/promoter'

// Default color scheme
const DEFAULT_COLOR_SCHEME = {
  primary: '#9333EA',
  secondary: '#EC4899',
  accent: '#F59E0B',
  background: '#1F2937',
  text: '#F3F4F6'
}

const DEFAULT_FORM_DATA = {
  name: '',
  email: '',
  phone: '',
  slug: '',
  brandingType: 'basic' as 'basic' | 'advanced',
  colorScheme: DEFAULT_COLOR_SCHEME,
  logo: '',
  commission: 10,
  active: true,
  users: [] as string[],
  website: '',
  description: ''
}

// Validation helpers
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const isValidUrl = (url: string) => {
  if (!url) return true
  try { new URL(url); return true } catch { return false }
}
const isValidPhone = (phone: string) => {
  if (!phone) return true
  return /^[\d\s\-\(\)\+]{10,}$/.test(phone)
}
const isValidHexColor = (color: string) => /^#[0-9A-Fa-f]{6}$/.test(color)

const formatPhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

interface TenantWithStats extends PromoterProfile {
  eventCount: number
  totalRevenue: number
  totalOrders: number
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning'
}

export default function WhiteLabelManagement() {
  const router = useRouter()
  const { user, loading: authLoading } = useFirebaseAuth()

  // Data state
  const [tenants, setTenants] = useState<TenantWithStats[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [users, setUsers] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  // UI state
  const [showForm, setShowForm] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<TenantWithStats | null>(null)
  const [editingTenant, setEditingTenant] = useState<TenantWithStats | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])

  // Search, filter, sort state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'events' | 'commission'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  // Form state
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Delete confirmation state
  const [deleteAction, setDeleteAction] = useState<'soft' | 'hard'>('soft')
  const [reassignTenantId, setReassignTenantId] = useState<string>('')

  // Toast helpers
  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      const [tenantsData, eventsData] = await Promise.all([
        AdminService.getPromoters(),
        AdminService.getEvents()
      ])

      // Group events by tenantId
      const eventsByTenant: Record<string, any[]> = {}
      eventsData.forEach(event => {
        const pid = event.promoterId || event.promoter?.promoterId
        if (pid) {
          if (!eventsByTenant[pid]) eventsByTenant[pid] = []
          eventsByTenant[pid].push(event)
        }
      })

      // Fetch all orders
      const ordersSnapshot = await getDocs(collection(db, 'orders'))
      const ordersByEvent: Record<string, { count: number; revenue: number }> = {}

      ordersSnapshot.docs.forEach(orderDoc => {
        const order = orderDoc.data()
        const eventId = order.eventId
        if (!ordersByEvent[eventId]) {
          ordersByEvent[eventId] = { count: 0, revenue: 0 }
        }
        ordersByEvent[eventId].count++
        ordersByEvent[eventId].revenue += order.pricing?.total || order.totalAmount || order.total || 0
      })

      // Build tenants with stats
      const tenantsWithStats: TenantWithStats[] = tenantsData.map(tenant => {
        const tenantEvents = eventsByTenant[tenant.id] || []
        let totalRevenue = 0
        let totalOrders = 0

        tenantEvents.forEach(event => {
          const eventStats = ordersByEvent[event.id]
          if (eventStats) {
            totalRevenue += eventStats.revenue
            totalOrders += eventStats.count
          }
        })

        return {
          ...tenant,
          eventCount: tenantEvents.length,
          totalRevenue,
          totalOrders,
          commission: tenant.commission || 10
        } as TenantWithStats
      })

      // Fetch user details
      const allUserIds = new Set<string>()
      tenantsWithStats.forEach(p => p.users?.forEach(uid => allUserIds.add(uid)))

      if (allUserIds.size > 0) {
        const usersSnapshot = await getDocs(collection(db, 'users'))
        const usersMap: Record<string, any> = {}
        usersSnapshot.docs.forEach(doc => {
          if (allUserIds.has(doc.id)) {
            usersMap[doc.id] = { id: doc.id, ...doc.data() }
          }
        })
        setUsers(usersMap)
      }

      setTenants(tenantsWithStats)
      setEvents(eventsData)
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Failed to load tenants', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    if (user && !authLoading) {
      loadData()
    }
  }, [user, authLoading, loadData])

  // Filtered and sorted tenants
  const filteredTenants = useMemo(() => {
    let result = [...tenants]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.name?.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query) ||
        p.slug?.toLowerCase().includes(query)
      )
    }

    if (filterStatus !== 'all') {
      result = result.filter(p => filterStatus === 'active' ? p.active : !p.active)
    }

    result.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '')
          break
        case 'revenue':
          comparison = (a.totalRevenue || 0) - (b.totalRevenue || 0)
          break
        case 'events':
          comparison = (a.eventCount || 0) - (b.eventCount || 0)
          break
        case 'commission':
          comparison = (a.commission || 0) - (b.commission || 0)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [tenants, searchQuery, filterStatus, sortBy, sortOrder])

  // Pagination
  const paginatedTenants = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredTenants.slice(start, start + itemsPerPage)
  }, [filteredTenants, currentPage])

  const totalPages = Math.ceil(filteredTenants.length / itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus, sortBy, sortOrder])

  // Form validation
  const validateForm = useCallback(async (): Promise<boolean> => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) errors.name = 'Name is required'
    if (!formData.email.trim()) errors.email = 'Email is required'
    else if (!isValidEmail(formData.email)) errors.email = 'Invalid email format'
    if (formData.phone && !isValidPhone(formData.phone)) errors.phone = 'Invalid phone format'
    if (formData.website && !isValidUrl(formData.website)) errors.website = 'Invalid URL format'
    if (formData.commission < 0 || formData.commission > 100) errors.commission = 'Commission must be 0-100%'

    const colors = Object.entries(formData.colorScheme)
    for (const [key, value] of colors) {
      if (!isValidHexColor(value)) errors[`color_${key}`] = `Invalid ${key} color`
    }

    const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const existingTenant = tenants.find(p => p.slug === slug && p.id !== editingTenant?.id)
    if (existingTenant) errors.slug = 'This slug is already in use'

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [formData, tenants, editingTenant])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    try {
      const url = await StorageService.uploadPromoterLogo(file)
      setLogoUrl(url)
      setFormData(prev => ({ ...prev, logo: url }))
      showToast('Logo uploaded successfully')
    } catch (error) {
      console.error('Error uploading logo:', error)
      showToast('Failed to upload logo', 'error')
    }
    setUploadingLogo(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!(await validateForm())) {
      showToast('Please fix the form errors', 'error')
      return
    }

    setSubmitting(true)
    try {
      const finalData = {
        ...formData,
        slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        phone: formatPhoneNumber(formData.phone)
      }

      if (editingTenant) {
        await AdminService.updatePromoter(editingTenant.id, finalData)
        showToast(`${formData.name} updated successfully`)
      } else {
        await AdminService.createPromoter(finalData)
        showToast(`${formData.name} created successfully`)
      }

      setShowForm(false)
      resetForm()
      await loadData()
    } catch (error) {
      console.error('Error saving tenant:', error)
      showToast('Failed to save tenant', 'error')
    }
    setSubmitting(false)
  }

  const handleEdit = (tenant: TenantWithStats) => {
    setEditingTenant(tenant)
    setFormData({
      name: tenant.name || '',
      email: tenant.email || '',
      phone: tenant.phone || '',
      slug: tenant.slug || '',
      brandingType: tenant.brandingType || 'basic',
      colorScheme: tenant.colorScheme || DEFAULT_COLOR_SCHEME,
      logo: tenant.logo || '',
      commission: tenant.commission || 10,
      active: tenant.active !== false,
      users: tenant.users || [],
      website: tenant.website || '',
      description: tenant.description || ''
    })
    setLogoUrl(tenant.logo || '')
    setFormErrors({})
    setShowForm(true)
  }

  const handleDeleteClick = (tenant: TenantWithStats) => {
    setSelectedTenant(tenant)
    setDeleteAction('soft')
    setReassignTenantId('')
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!selectedTenant) return

    try {
      if (deleteAction === 'soft') {
        await AdminService.updatePromoter(selectedTenant.id, {
          active: false,
          deletedAt: Timestamp.now()
        })
        showToast(`${selectedTenant.name} has been deactivated`)
      } else {
        if (selectedTenant.eventCount > 0 && reassignTenantId) {
          const batch = writeBatch(db)
          const tenantEvents = events.filter(e =>
            e.promoterId === selectedTenant.id ||
            e.promoter?.promoterId === selectedTenant.id
          )

          const targetTenant = tenants.find(p => p.id === reassignTenantId)

          for (const event of tenantEvents) {
            const eventRef = doc(db, 'events', event.id)
            batch.update(eventRef, {
              promoterId: reassignTenantId,
              promoter: {
                promoterId: reassignTenantId,
                promoterName: targetTenant?.name || '',
                commission: targetTenant?.commission || 10
              }
            })
          }

          await batch.commit()
        }

        await AdminService.deletePromoter(selectedTenant.id)
        showToast(`${selectedTenant.name} has been deleted`)
      }

      setShowDeleteModal(false)
      setSelectedTenant(null)
      await loadData()
    } catch (error) {
      console.error('Error deleting tenant:', error)
      showToast('Failed to delete tenant', 'error')
    }
  }

  const handleTenantClick = (tenant: TenantWithStats) => {
    router.push(`/admin/white-label/${tenant.id}`)
  }

  const resetForm = () => {
    setEditingTenant(null)
    setFormData(DEFAULT_FORM_DATA)
    setLogoUrl('')
    setFormErrors({})
  }

  const calculateEarnings = (tenant: TenantWithStats) => {
    return (tenant.totalRevenue * (tenant.commission / 100)).toFixed(2)
  }

  const getPortalUrl = (slug: string) => {
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${slug}`
  }

  // Stats calculations
  const stats = useMemo(() => ({
    total: tenants.length,
    active: tenants.filter(p => p.active).length,
    inactive: tenants.filter(p => !p.active).length,
    totalEvents: tenants.reduce((sum, p) => sum + (p.eventCount || 0), 0),
    totalRevenue: tenants.reduce((sum, p) => sum + (p.totalRevenue || 0), 0),
    totalCommissions: tenants.reduce((sum, p) => sum + parseFloat(calculateEarnings(p)), 0),
    totalUsers: tenants.reduce((sum, p) => sum + (p.users?.length || 0), 0)
  }), [tenants])

  if (authLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Toast Notifications */}
      <div className="fixed top-20 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm animate-slide-in ${
              toast.type === 'success' ? 'bg-green-600/90 text-white' :
              toast.type === 'error' ? 'bg-red-600/90 text-white' :
              'bg-yellow-600/90 text-white'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Page Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            White-Label Tenants
          </h1>
          <p className="text-gray-400 mt-1">Manage white-label partners, their branding, payments, and events</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl hover:from-purple-700 hover:to-pink-700 font-medium shadow-lg shadow-purple-500/20"
        >
          + Add Tenant
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Tenants</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-green-500/20">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Active</p>
          <p className="text-2xl font-bold text-green-400">{stats.active}</p>
        </div>
        <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-red-500/20">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Inactive</p>
          <p className="text-2xl font-bold text-red-400">{stats.inactive}</p>
        </div>
        <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Events</p>
          <p className="text-2xl font-bold">{stats.totalEvents}</p>
        </div>
        <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Users</p>
          <p className="text-2xl font-bold">{stats.totalUsers}</p>
        </div>
        <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Revenue</p>
          <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-purple-500/20">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Commissions</p>
          <p className="text-2xl font-bold text-green-400">${stats.totalCommissions.toLocaleString()}</p>
        </div>
      </div>

      {/* Search, Filter, Sort Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-lg focus:border-purple-500 focus:outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg"
        >
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg"
        >
          <option value="name">Sort by Name</option>
          <option value="revenue">Sort by Revenue</option>
          <option value="events">Sort by Events</option>
          <option value="commission">Sort by Commission</option>
        </select>
        <button
          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg hover:bg-white/10"
        >
          {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
        </button>
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 ${viewMode === 'grid' ? 'bg-purple-600' : 'bg-black/40 hover:bg-white/10'}`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 ${viewMode === 'table' ? 'bg-purple-600' : 'bg-black/40 hover:bg-white/10'}`}
          >
            Table
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500" />
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="text-center py-12 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
          <div className="text-6xl mb-4">🏢</div>
          <p className="text-gray-400 mb-4">
            {searchQuery || filterStatus !== 'all'
              ? 'No tenants match your filters'
              : 'No white-label tenants yet. Add your first tenant!'
            }
          </p>
          {!searchQuery && filterStatus === 'all' && (
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              Add First Tenant
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <>
          {/* Grid View */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedTenants.map(tenant => (
              <div
                key={tenant.id}
                className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden hover:border-purple-500/50 transition-all group"
              >
                {/* Clickable Header */}
                <div
                  className="p-6 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => handleTenantClick(tenant)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      {tenant.logo ? (
                        <img src={tenant.logo} alt={tenant.name} className="w-14 h-14 rounded-xl object-cover" />
                      ) : (
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                          {tenant.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-bold group-hover:text-purple-400 transition-colors">
                          {tenant.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            tenant.active
                              ? 'bg-green-600/20 text-green-400'
                              : 'bg-red-600/20 text-red-400'
                          }`}>
                            {tenant.active ? 'Active' : 'Inactive'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            tenant.brandingType === 'advanced'
                              ? 'bg-purple-600/20 text-purple-400'
                              : 'bg-gray-600/20 text-gray-400'
                          }`}>
                            {tenant.brandingType || 'basic'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Color Preview */}
                  {tenant.colorScheme && (
                    <div className="flex gap-1 mb-3">
                      {['primary', 'secondary', 'accent'].map(key => (
                        <div
                          key={key}
                          className="w-8 h-8 rounded-lg"
                          style={{ backgroundColor: tenant.colorScheme[key as keyof typeof tenant.colorScheme] }}
                          title={key}
                        />
                      ))}
                    </div>
                  )}

                  {/* Portal URL */}
                  {tenant.slug && (
                    <div className="mb-3 p-2 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Portal URL</p>
                      <a
                        href={getPortalUrl(tenant.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-purple-400 hover:underline truncate block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        /p/{tenant.slug}
                      </a>
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="bg-white/5 p-2 rounded text-center">
                      <p className="text-xs text-gray-400">Events</p>
                      <p className="text-lg font-bold">{tenant.eventCount || 0}</p>
                    </div>
                    <div className="bg-white/5 p-2 rounded text-center">
                      <p className="text-xs text-gray-400">Orders</p>
                      <p className="text-lg font-bold">{tenant.totalOrders || 0}</p>
                    </div>
                    <div className="bg-white/5 p-2 rounded text-center">
                      <p className="text-xs text-gray-400">Users</p>
                      <p className="text-lg font-bold">{tenant.users?.length || 0}</p>
                    </div>
                    <div className="bg-white/5 p-2 rounded text-center">
                      <p className="text-xs text-gray-400">Rate</p>
                      <p className="text-lg font-bold">{tenant.commission}%</p>
                    </div>
                  </div>

                  {/* Revenue Info */}
                  <div className="p-3 bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs text-gray-400">Revenue</span>
                        <p className="text-lg font-bold">${(tenant.totalRevenue || 0).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-400">Commission</span>
                        <p className="text-lg font-bold text-green-400">${calculateEarnings(tenant)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(tenant) }}
                      className="px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTenantClick(tenant) }}
                      className="px-3 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 text-sm"
                    >
                      Events
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTenantClick(tenant) }}
                      className="px-3 py-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 text-sm"
                    >
                      Users
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteClick(tenant) }}
                      className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 text-sm"
                    >
                      {tenant.active ? 'Deactivate' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Table View */}
          <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">Tenant</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-right py-4 px-4 text-gray-400 font-medium">Events</th>
                  <th className="text-right py-4 px-4 text-gray-400 font-medium">Users</th>
                  <th className="text-right py-4 px-4 text-gray-400 font-medium">Revenue</th>
                  <th className="text-right py-4 px-4 text-gray-400 font-medium">Commission</th>
                  <th className="text-right py-4 px-6 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTenants.map(tenant => (
                  <tr
                    key={tenant.id}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                    onClick={() => handleTenantClick(tenant)}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {tenant.logo ? (
                          <img src={tenant.logo} alt={tenant.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold">
                            {tenant.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{tenant.name}</p>
                          <p className="text-xs text-gray-400">{tenant.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        tenant.active
                          ? 'bg-green-600/20 text-green-400'
                          : 'bg-red-600/20 text-red-400'
                      }`}>
                        {tenant.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">{tenant.eventCount}</td>
                    <td className="py-4 px-4 text-right">{tenant.users?.length || 0}</td>
                    <td className="py-4 px-4 text-right">${tenant.totalRevenue.toLocaleString()}</td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-green-400">${calculateEarnings(tenant)}</span>
                      <span className="text-gray-500 text-xs ml-1">({tenant.commission}%)</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(tenant) }}
                          className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(tenant) }}
                          className="px-3 py-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 text-sm"
                        >
                          {tenant.active ? 'Deactivate' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg disabled:opacity-50 hover:bg-white/10"
          >
            Previous
          </button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let page = i + 1
              if (totalPages > 5) {
                if (currentPage > 3) page = currentPage - 2 + i
                if (currentPage > totalPages - 2) page = totalPages - 4 + i
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-lg ${
                    currentPage === page
                      ? 'bg-purple-600 text-white'
                      : 'bg-black/40 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {page}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg disabled:opacity-50 hover:bg-white/10"
          >
            Next
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {editingTenant ? 'Edit Tenant' : 'Add New Tenant'}
              </h2>
              <button
                onClick={() => { setShowForm(false); resetForm() }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Tenant Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-2 bg-white/10 rounded-lg ${formErrors.name ? 'border border-red-500' : ''}`}
                    placeholder="Company Name"
                  />
                  {formErrors.name && <p className="text-red-400 text-xs mt-1">{formErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm mb-2">Portal Slug *</label>
                  <div className="flex items-center">
                    <span className="text-gray-400 mr-2">/p/</span>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      className={`flex-1 px-4 py-2 bg-white/10 rounded-lg ${formErrors.slug ? 'border border-red-500' : ''}`}
                      placeholder="company-name"
                    />
                  </div>
                  {formErrors.slug ? (
                    <p className="text-red-400 text-xs mt-1">{formErrors.slug}</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Auto-generated if left empty</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-4 py-2 bg-white/10 rounded-lg ${formErrors.email ? 'border border-red-500' : ''}`}
                    placeholder="contact@company.com"
                  />
                  {formErrors.email && <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full px-4 py-2 bg-white/10 rounded-lg ${formErrors.phone ? 'border border-red-500' : ''}`}
                    placeholder="(555) 123-4567"
                  />
                  {formErrors.phone && <p className="text-red-400 text-xs mt-1">{formErrors.phone}</p>}
                </div>
              </div>

              {/* Branding */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Branding Tier</label>
                  <select
                    value={formData.brandingType}
                    onChange={(e) => setFormData({ ...formData, brandingType: e.target.value as 'basic' | 'advanced' })}
                    className="w-full px-4 py-2 bg-white/10 rounded-lg"
                  >
                    <option value="basic">Basic (Colors only)</option>
                    <option value="advanced">Advanced (Full branding)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2">Commission Rate (%)</label>
                  <input
                    type="number"
                    value={formData.commission}
                    onChange={(e) => setFormData({ ...formData, commission: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                    className={`w-full px-4 py-2 bg-white/10 rounded-lg ${formErrors.commission ? 'border border-red-500' : ''}`}
                    min="0"
                    max="100"
                  />
                  {formErrors.commission && <p className="text-red-400 text-xs mt-1">{formErrors.commission}</p>}
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm mb-2">Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                  disabled={uploadingLogo}
                />
                {uploadingLogo && <p className="text-xs text-purple-400 mt-2">Uploading logo...</p>}
                {logoUrl && (
                  <div className="mt-2">
                    <img src={logoUrl} alt="Logo preview" className="h-20 object-contain rounded" />
                  </div>
                )}
              </div>

              {/* Color Scheme */}
              <div>
                <label className="block text-sm mb-2">Brand Colors</label>
                <div className="grid grid-cols-5 gap-3">
                  {(['primary', 'secondary', 'accent', 'background', 'text'] as const).map(key => (
                    <div key={key}>
                      <label className="text-xs text-gray-400 capitalize">{key}</label>
                      <input
                        type="color"
                        value={formData.colorScheme[key]}
                        onChange={(e) => setFormData({
                          ...formData,
                          colorScheme: { ...formData.colorScheme, [key]: e.target.value }
                        })}
                        className="w-full h-10 rounded cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className={`w-full px-4 py-2 bg-white/10 rounded-lg ${formErrors.website ? 'border border-red-500' : ''}`}
                    placeholder="https://company.com"
                  />
                  {formErrors.website && <p className="text-red-400 text-xs mt-1">{formErrors.website}</p>}
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="rounded"
                    />
                    <span>Active (Can manage events)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">Notes</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg h-20"
                  placeholder="Internal notes about this tenant..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm() }}
                  className="px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingTenant ? 'Update Tenant' : 'Create Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedTenant && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">
              {selectedTenant.active ? 'Deactivate' : 'Delete'} {selectedTenant.name}?
            </h2>

            <div className="space-y-4 mb-6">
              <label className="flex items-start gap-3 p-3 bg-yellow-600/10 border border-yellow-600/30 rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="deleteAction"
                  checked={deleteAction === 'soft'}
                  onChange={() => setDeleteAction('soft')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-yellow-400">Deactivate (Recommended)</p>
                  <p className="text-sm text-gray-400">Tenant will be hidden but data preserved</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-red-600/10 border border-red-600/30 rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="deleteAction"
                  checked={deleteAction === 'hard'}
                  onChange={() => setDeleteAction('hard')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-red-400">Permanently Delete</p>
                  <p className="text-sm text-gray-400">Cannot be undone. All data will be lost.</p>
                </div>
              </label>

              {deleteAction === 'hard' && selectedTenant.eventCount > 0 && (
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-sm text-gray-400 mb-2">
                    This tenant has {selectedTenant.eventCount} events. Reassign to:
                  </p>
                  <select
                    value={reassignTenantId}
                    onChange={(e) => setReassignTenantId(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg"
                  >
                    <option value="">Select a tenant...</option>
                    {tenants.filter(p => p.id !== selectedTenant.id && p.active).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setSelectedTenant(null) }}
                className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteAction === 'hard' && selectedTenant.eventCount > 0 && !reassignTenantId}
                className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteAction === 'soft' ? 'Deactivate' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
