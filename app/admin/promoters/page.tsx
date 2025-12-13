'use client'
import {useState, useEffect, useCallback, useMemo} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'
import {StorageService} from '@/lib/storage/storageService'
import {db, auth} from '@/lib/firebase'
import {collection, getDocs, query, where, Timestamp, writeBatch, doc} from 'firebase/firestore'
import {createUserWithEmailAndPassword} from 'firebase/auth'
import {useFirebaseAuth} from '@/lib/firebase-auth'
import {PromoterProfile} from '@/lib/types/promoter'

// Default color scheme - single source of truth
const DEFAULT_COLOR_SCHEME = {
  primary: '#2563EB',      // accent-600 (Electric Blue)
  secondary: '#3B82F6',    // accent-500
  accent: '#0EA5E9',       // sky-500
  background: '#1E293B',   // slate-800
  text: '#F8FAFC'          // slate-50
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
  if (!url) return true // optional
  try { new URL(url); return true } catch { return false }
}
const isValidPhone = (phone: string) => {
  if (!phone) return true // optional
  return /^[\d\s\-\(\)\+]{10,}$/.test(phone)
}
const isValidHexColor = (color: string) => /^#[0-9A-Fa-f]{6}$/.test(color)

// Password strength checker
const getPasswordStrength = (password: string): { score: number; message: string } => {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  const messages = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong']
  return { score, message: messages[Math.min(score, 4)] }
}

// Format phone number
const formatPhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`
  }
  return phone
}

interface PromoterWithStats extends PromoterProfile {
  eventCount: number
  totalRevenue: number
  totalOrders: number
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning'
}

export default function PromotersManagement() {
  const router = useRouter()
  const { user, loading: authLoading } = useFirebaseAuth()

  // Data state
  const [promoters, setPromoters] = useState<PromoterWithStats[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [users, setUsers] = useState<Record<string, any>>({}) // userId -> user data
  const [loading, setLoading] = useState(true)

  // UI state
  const [showForm, setShowForm] = useState(false)
  const [showEventsModal, setShowEventsModal] = useState(false)
  const [showUsersModal, setShowUsersModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedPromoter, setSelectedPromoter] = useState<PromoterWithStats | null>(null)
  const [editingPromoter, setEditingPromoter] = useState<PromoterWithStats | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])

  // Search, filter, sort state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'events' | 'commission'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  // Form state
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // New user form state
  const [newUserData, setNewUserData] = useState({ email: '', password: '', name: '' })
  const [userFormErrors, setUserFormErrors] = useState<Record<string, string>>({})

  // Delete confirmation state
  const [deleteAction, setDeleteAction] = useState<'soft' | 'hard'>('soft')
  const [reassignPromoterId, setReassignPromoterId] = useState<string>('')

  // Toast helpers
  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  // Load data with optimized queries
  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch promoters and events in parallel
      const [promotersData, eventsData] = await Promise.all([
        AdminService.getPromoters(),
        AdminService.getEvents()
      ])

      // Group events by promoterId for O(1) lookup
      const eventsByPromoter: Record<string, any[]> = {}
      eventsData.forEach(event => {
        const pid = event.promoterId || event.promoter?.promoterId
        if (pid) {
          if (!eventsByPromoter[pid]) eventsByPromoter[pid] = []
          eventsByPromoter[pid].push(event)
        }
      })

      // Fetch all orders in a single query and group by eventId
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

      // Build promoters with stats using pre-computed data
      const promotersWithStats: PromoterWithStats[] = promotersData.map(promoter => {
        const promoterEvents = eventsByPromoter[promoter.id] || []
        let totalRevenue = 0
        let totalOrders = 0

        promoterEvents.forEach(event => {
          const eventStats = ordersByEvent[event.id]
          if (eventStats) {
            totalRevenue += eventStats.revenue
            totalOrders += eventStats.count
          }
        })

        return {
          ...promoter,
          eventCount: promoterEvents.length,
          totalRevenue,
          totalOrders,
          commission: promoter.commission || 10
        } as PromoterWithStats
      })

      // Fetch user details for all promoter users
      const allUserIds = new Set<string>()
      promotersWithStats.forEach(p => p.users?.forEach(uid => allUserIds.add(uid)))

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

      setPromoters(promotersWithStats)
      setEvents(eventsData)
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Failed to load promoters', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    if (user && !authLoading) {
      loadData()
    }
  }, [user, authLoading, loadData])

  // Filtered and sorted promoters
  const filteredPromoters = useMemo(() => {
    let result = [...promoters]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.name?.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query) ||
        p.slug?.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter(p => filterStatus === 'active' ? p.active : !p.active)
    }

    // Sort
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
  }, [promoters, searchQuery, filterStatus, sortBy, sortOrder])

  // Pagination
  const paginatedPromoters = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredPromoters.slice(start, start + itemsPerPage)
  }, [filteredPromoters, currentPage])

  const totalPages = Math.ceil(filteredPromoters.length / itemsPerPage)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus, sortBy, sortOrder])

  // Form validation
  const validateForm = useCallback(async (): Promise<boolean> => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) {
      errors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!isValidEmail(formData.email)) {
      errors.email = 'Invalid email format'
    }

    if (formData.phone && !isValidPhone(formData.phone)) {
      errors.phone = 'Invalid phone format'
    }

    if (formData.website && !isValidUrl(formData.website)) {
      errors.website = 'Invalid URL format'
    }

    if (formData.commission < 0 || formData.commission > 100) {
      errors.commission = 'Commission must be between 0-100%'
    }

    // Validate color scheme
    const colors = Object.entries(formData.colorScheme)
    for (const [key, value] of colors) {
      if (!isValidHexColor(value)) {
        errors[`color_${key}`] = `Invalid ${key} color`
      }
    }

    // Check slug uniqueness
    const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const existingPromoter = promoters.find(p =>
      p.slug === slug && p.id !== editingPromoter?.id
    )
    if (existingPromoter) {
      errors.slug = 'This slug is already in use'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [formData, promoters, editingPromoter])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    try {
      const url = await StorageService.uploadPromoterLogo(file)
      setLogoUrl(url)
      setFormData(prev => ({...prev, logo: url}))
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

      if (editingPromoter) {
        await AdminService.updatePromoter(editingPromoter.id, finalData)
        showToast(`${formData.name} updated successfully`)
      } else {
        await AdminService.createPromoter(finalData)
        showToast(`${formData.name} created successfully`)
      }

      setShowForm(false)
      resetForm()
      await loadData()
    } catch (error) {
      console.error('Error saving promoter:', error)
      showToast('Failed to save promoter', 'error')
    }
    setSubmitting(false)
  }

  const handleEdit = (promoter: PromoterWithStats) => {
    setEditingPromoter(promoter)
    setFormData({
      name: promoter.name || '',
      email: promoter.email || '',
      phone: promoter.phone || '',
      slug: promoter.slug || '',
      brandingType: promoter.brandingType || 'basic',
      colorScheme: promoter.colorScheme || DEFAULT_COLOR_SCHEME,
      logo: promoter.logo || '',
      commission: promoter.commission || 10,
      active: promoter.active !== false,
      users: promoter.users || [],
      website: promoter.website || '',
      description: promoter.description || ''
    })
    setLogoUrl(promoter.logo || '')
    setFormErrors({})
    setShowForm(true)
  }

  const handleDeleteClick = (promoter: PromoterWithStats) => {
    setSelectedPromoter(promoter)
    setDeleteAction('soft')
    setReassignPromoterId('')
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!selectedPromoter) return

    try {
      if (deleteAction === 'soft') {
        // Soft delete - mark as inactive
        await AdminService.updatePromoter(selectedPromoter.id, {
          active: false,
          deletedAt: Timestamp.now()
        })
        showToast(`${selectedPromoter.name} has been deactivated`)
      } else {
        // Hard delete - reassign events first if needed
        if (selectedPromoter.eventCount > 0 && reassignPromoterId) {
          const batch = writeBatch(db)
          const promoterEvents = events.filter(e =>
            e.promoterId === selectedPromoter.id ||
            e.promoter?.promoterId === selectedPromoter.id
          )

          const targetPromoter = promoters.find(p => p.id === reassignPromoterId)

          for (const event of promoterEvents) {
            const eventRef = doc(db, 'events', event.id)
            batch.update(eventRef, {
              promoterId: reassignPromoterId,
              promoter: {
                promoterId: reassignPromoterId,
                promoterName: targetPromoter?.name || '',
                commission: targetPromoter?.commission || 10
              }
            })
          }

          await batch.commit()
        }

        await AdminService.deletePromoter(selectedPromoter.id)
        showToast(`${selectedPromoter.name} has been deleted`)
      }

      setShowDeleteModal(false)
      setSelectedPromoter(null)
      await loadData()
    } catch (error) {
      console.error('Error deleting promoter:', error)
      showToast('Failed to delete promoter', 'error')
    }
  }

  const handleShowEvents = (promoter: PromoterWithStats) => {
    setSelectedPromoter(promoter)
    setShowEventsModal(true)
  }

  const handleShowUsers = (promoter: PromoterWithStats) => {
    setSelectedPromoter(promoter)
    setShowUsersModal(true)
  }

  const validateNewUser = (): boolean => {
    const errors: Record<string, string> = {}

    if (!newUserData.name.trim()) {
      errors.name = 'Name is required'
    }

    if (!newUserData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!isValidEmail(newUserData.email)) {
      errors.email = 'Invalid email format'
    }

    if (!newUserData.password) {
      errors.password = 'Password is required'
    } else {
      const strength = getPasswordStrength(newUserData.password)
      if (strength.score < 2) {
        errors.password = 'Password is too weak. Use 8+ chars with mixed case, numbers, and symbols.'
      }
    }

    setUserFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddUser = async () => {
    if (!selectedPromoter || !validateNewUser()) return

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUserData.email,
        newUserData.password
      )

      // Add user ID to promoter's users array
      const updatedUsers = [...(selectedPromoter.users || []), userCredential.user.uid]
      await AdminService.updatePromoter(selectedPromoter.id, { users: updatedUsers })

      // Store user details in users collection
      await AdminService.createUser({
        uid: userCredential.user.uid,
        email: newUserData.email,
        name: newUserData.name,
        role: 'promoter',
        promoterId: selectedPromoter.id,
        createdAt: Timestamp.now()
      })

      showToast(`User ${newUserData.name} created successfully`)
      setNewUserData({ email: '', password: '', name: '' })
      setUserFormErrors({})
      await loadData()
    } catch (error: any) {
      console.error('Error creating user:', error)
      showToast(error.message || 'Failed to create user', 'error')
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!selectedPromoter) return

    if (!confirm('Remove this user from the promoter? The user account will still exist but will lose access.')) {
      return
    }

    try {
      const updatedUsers = (selectedPromoter.users || []).filter(id => id !== userId)
      await AdminService.updatePromoter(selectedPromoter.id, { users: updatedUsers })

      // Update user record to remove promoter association
      await AdminService.updateUser(userId, {
        promoterId: null,
        role: 'user'
      })

      showToast('User removed from promoter')
      await loadData()
    } catch (error) {
      console.error('Error removing user:', error)
      showToast('Failed to remove user', 'error')
    }
  }

  const resetForm = () => {
    setEditingPromoter(null)
    setFormData(DEFAULT_FORM_DATA)
    setLogoUrl('')
    setFormErrors({})
  }

  const calculateEarnings = (promoter: PromoterWithStats) => {
    return (promoter.totalRevenue * (promoter.commission / 100)).toFixed(2)
  }

  const getPromoterEvents = (promoterId: string) => {
    return events.filter(e =>
      e.promoterId === promoterId ||
      e.promoter?.promoterId === promoterId
    )
  }

  const getPromoterPortalUrl = (slug: string) => {
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${slug}`
  }

  // Navigate to promoter detail page
  const handlePromoterClick = (promoter: PromoterWithStats) => {
    router.push(`/admin/promoters/${promoter.id}`)
  }

  if (authLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-accent-500"/>
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

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Promoters</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage promoters and their branded portals</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="px-6 py-2 bg-accent-600 rounded-lg hover:bg-accent-700"
        >
          + Add Promoter
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-5 gap-4 mb-8">
        <div className="stat-card p-4 rounded-xl">
          <p className="text-secondary-contrast text-sm mb-1 font-medium">Total Promoters</p>
          <p className="text-2xl font-bold text-primary-contrast">{promoters.length}</p>
        </div>
        <div className="stat-card p-4 rounded-xl">
          <p className="text-secondary-contrast text-sm mb-1 font-medium">Active</p>
          <p className="text-2xl font-bold text-money">
            {promoters.filter(p => p.active).length}
          </p>
        </div>
        <div className="stat-card p-4 rounded-xl">
          <p className="text-secondary-contrast text-sm mb-1 font-medium">Total Events</p>
          <p className="text-2xl font-bold text-primary-contrast">
            {promoters.reduce((sum, p) => sum + (p.eventCount || 0), 0)}
          </p>
        </div>
        <div className="stat-card p-4 rounded-xl">
          <p className="text-secondary-contrast text-sm mb-1 font-medium">Total Revenue</p>
          <p className="text-2xl font-bold text-primary-contrast">
            ${promoters.reduce((sum, p) => sum + (p.totalRevenue || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="stat-card p-4 rounded-xl">
          <p className="text-secondary-contrast text-sm mb-1 font-medium">Total Commissions</p>
          <p className="text-2xl font-bold text-money">
            ${promoters.reduce((sum, p) => sum + parseFloat(calculateEarnings(p)), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search, Filter, Sort Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search promoters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-accent-500 focus:outline-none text-slate-900 dark:text-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
        >
          <option value="name">Sort by Name</option>
          <option value="revenue">Sort by Revenue</option>
          <option value="events">Sort by Events</option>
          <option value="commission">Sort by Commission</option>
        </select>
        <button
          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white"
        >
          {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-accent-500"/>
        </div>
      ) : filteredPromoters.length === 0 ? (
        <div className="text-center py-12 card-elevated rounded-xl">
          <div className="text-6xl mb-4">🤝</div>
          <p className="text-secondary-contrast mb-4">
            {searchQuery || filterStatus !== 'all'
              ? 'No promoters match your filters'
              : 'No promoters yet. Add your first promoter!'
            }
          </p>
          {!searchQuery && filterStatus === 'all' && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-accent px-6 py-2 rounded-lg"
            >
              Add First Promoter
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedPromoters.map(promoter => (
              <div
                key={promoter.id}
                className="card-elevated rounded-xl overflow-hidden hover:border-accent-500/50 transition-all"
              >
                {/* Header with Logo and Branding - Clickable */}
                <div
                  className="p-6 pb-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => handlePromoterClick(promoter)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      {promoter.logo ? (
                        <img src={promoter.logo} alt={promoter.name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-accent-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                          {promoter.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-bold text-primary-contrast hover:text-blue-600 dark:hover:text-accent-400 transition-colors">
                          {promoter.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            promoter.brandingType === 'advanced'
                              ? 'badge-info'
                              : 'bg-slate-200 dark:bg-slate-600/20 text-slate-600 dark:text-slate-400'
                          }`}>
                            {promoter.brandingType || 'basic'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            promoter.active
                              ? 'badge-success'
                              : 'badge-error'
                          }`}>
                            {promoter.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Color Scheme Preview */}
                  {promoter.colorScheme && (
                    <div className="flex gap-1 mb-3">
                      {['primary', 'secondary', 'accent'].map(key => (
                        <div
                          key={key}
                          className="w-8 h-8 rounded"
                          style={{ backgroundColor: promoter.colorScheme[key as keyof typeof promoter.colorScheme] }}
                          title={key}
                        />
                      ))}
                    </div>
                  )}

                  {/* Portal URL */}
                  {promoter.slug && (
                    <div className="mb-3 p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                      <p className="text-xs text-secondary-contrast mb-1">Portal URL</p>
                      <a
                        href={getPromoterPortalUrl(promoter.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-accent-400 hover:underline truncate block font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        /p/{promoter.slug}
                      </a>
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-1 mb-3 text-sm">
                    <div className="flex items-center gap-2 text-secondary-contrast">
                      <span>📧</span>
                      <span className="truncate">{promoter.email}</span>
                    </div>
                    {promoter.phone && (
                      <div className="flex items-center gap-2 text-secondary-contrast">
                        <span>📱</span>
                        <span>{promoter.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-slate-100 dark:bg-slate-700/50 p-2 rounded text-center border border-slate-200 dark:border-slate-600">
                      <p className="text-xs text-secondary-contrast">Events</p>
                      <p className="text-lg font-bold text-primary-contrast">{promoter.eventCount || 0}</p>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-700/50 p-2 rounded text-center border border-slate-200 dark:border-slate-600">
                      <p className="text-xs text-secondary-contrast">Orders</p>
                      <p className="text-lg font-bold text-primary-contrast">{promoter.totalOrders || 0}</p>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-700/50 p-2 rounded text-center border border-slate-200 dark:border-slate-600">
                      <p className="text-xs text-secondary-contrast">Users</p>
                      <p className="text-lg font-bold text-primary-contrast">{promoter.users?.length || 0}</p>
                    </div>
                  </div>

                  {/* Commission Info */}
                  <div className="p-3 bg-blue-50 dark:bg-accent-900/20 rounded-lg border border-blue-200 dark:border-accent-800/30">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs text-secondary-contrast">Revenue</span>
                        <p className="text-lg font-bold text-primary-contrast">${(promoter.totalRevenue || 0).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-secondary-contrast">Commission ({promoter.commission}%)</span>
                        <p className="text-lg font-bold text-money">${calculateEarnings(promoter)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions - Not clickable area */}
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(promoter) }}
                      className="px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShowEvents(promoter) }}
                      className="px-3 py-2 bg-accent-600/20 text-accent-500 dark:text-accent-400 rounded-lg hover:bg-accent-600/30 text-sm"
                    >
                      Events ({promoter.eventCount})
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShowUsers(promoter) }}
                      className="px-3 py-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 text-sm"
                    >
                      Users ({promoter.users?.length || 0})
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteClick(promoter) }}
                      className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 text-sm"
                    >
                      {promoter.active ? 'Deactivate' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white"
              >
                Previous
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg ${
                      currentPage === page
                        ? 'bg-accent-600 text-white'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-3xl my-8 border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-primary-contrast">
                {editingPromoter ? 'Edit Promoter' : 'Add New Promoter'}
              </h2>
              <button
                onClick={() => { setShowForm(false); resetForm() }}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 text-primary-contrast font-medium">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-accent-500 focus:outline-none ${formErrors.name ? 'border-red-500' : ''}`}
                    placeholder="Promoter Name"
                  />
                  {formErrors.name && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm mb-2 text-primary-contrast font-medium">Portal Slug *</label>
                  <div className="flex items-center">
                    <span className="text-secondary-contrast mr-2">/p/</span>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                      className={`flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-accent-500 focus:outline-none ${formErrors.slug ? 'border-red-500' : ''}`}
                      placeholder="promoter-name"
                    />
                  </div>
                  {formErrors.slug ? (
                    <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.slug}</p>
                  ) : (
                    <p className="text-xs text-secondary-contrast mt-1">Auto-generated if left empty</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 text-primary-contrast font-medium">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-accent-500 focus:outline-none ${formErrors.email ? 'border-red-500' : ''}`}
                    placeholder="promoter@example.com"
                  />
                  {formErrors.email && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm mb-2 text-primary-contrast font-medium">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-accent-500 focus:outline-none ${formErrors.phone ? 'border-red-500' : ''}`}
                    placeholder="(555) 123-4567"
                  />
                  {formErrors.phone && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.phone}</p>}
                </div>
              </div>

              {/* Branding */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 text-primary-contrast font-medium">Branding Type</label>
                  <select
                    value={formData.brandingType}
                    onChange={(e) => setFormData({...formData, brandingType: e.target.value as 'basic' | 'advanced'})}
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-accent-500 focus:outline-none"
                  >
                    <option value="basic">Basic</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-primary-contrast font-medium">Commission (%)</label>
                  <input
                    type="number"
                    value={formData.commission}
                    onChange={(e) => setFormData({...formData, commission: Math.max(0, Math.min(100, parseInt(e.target.value) || 0))})}
                    className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-accent-500 focus:outline-none ${formErrors.commission ? 'border-red-500' : ''}`}
                    min="0"
                    max="100"
                  />
                  {formErrors.commission && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.commission}</p>}
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm mb-2 text-primary-contrast font-medium">Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600"
                  disabled={uploadingLogo}
                />
                {uploadingLogo && <p className="text-xs text-blue-600 dark:text-accent-400 mt-2">Uploading logo...</p>}
                {logoUrl && (
                  <div className="mt-2">
                    <img src={logoUrl} alt="Logo preview" className="h-20 object-contain rounded" />
                  </div>
                )}
              </div>

              {/* Color Scheme */}
              <div>
                <label className="block text-sm mb-2 text-primary-contrast font-medium">Color Scheme</label>
                <div className="grid grid-cols-5 gap-3">
                  {(['primary', 'secondary', 'accent', 'background', 'text'] as const).map(key => (
                    <div key={key}>
                      <label className="text-xs text-secondary-contrast capitalize">{key}</label>
                      <input
                        type="color"
                        value={formData.colorScheme[key]}
                        onChange={(e) => setFormData({
                          ...formData,
                          colorScheme: {...formData.colorScheme, [key]: e.target.value}
                        })}
                        className="w-full h-10 rounded cursor-pointer border border-slate-200 dark:border-slate-600"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 text-primary-contrast font-medium">Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-accent-500 focus:outline-none ${formErrors.website ? 'border-red-500' : ''}`}
                    placeholder="https://example.com"
                  />
                  {formErrors.website && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.website}</p>}
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-primary-contrast">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({...formData, active: e.target.checked})}
                      className="rounded border-slate-300 dark:border-slate-600"
                    />
                    <span>Active (Can manage events)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-primary-contrast font-medium">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg h-20 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-accent-500 focus:outline-none"
                  placeholder="Notes about this promoter..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm() }}
                  className="btn-secondary px-6 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-accent px-6 py-2 rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingPromoter ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedPromoter && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-700 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-primary-contrast">
              {selectedPromoter.active ? 'Deactivate' : 'Delete'} {selectedPromoter.name}?
            </h2>

            <div className="space-y-4 mb-6">
              <label className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-600/10 border border-yellow-300 dark:border-yellow-600/30 rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="deleteAction"
                  checked={deleteAction === 'soft'}
                  onChange={() => setDeleteAction('soft')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-yellow-700 dark:text-yellow-400">Deactivate (Recommended)</p>
                  <p className="text-sm text-secondary-contrast">Promoter will be hidden but data preserved for reporting</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-600/10 border border-red-300 dark:border-red-600/30 rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="deleteAction"
                  checked={deleteAction === 'hard'}
                  onChange={() => setDeleteAction('hard')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-400">Permanently Delete</p>
                  <p className="text-sm text-secondary-contrast">Cannot be undone. All promoter data will be lost.</p>
                </div>
              </label>

              {deleteAction === 'hard' && selectedPromoter.eventCount > 0 && (
                <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <p className="text-sm text-secondary-contrast mb-2">
                    This promoter has {selectedPromoter.eventCount} events. Reassign to:
                  </p>
                  <select
                    value={reassignPromoterId}
                    onChange={(e) => setReassignPromoterId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-600 rounded-lg text-slate-900 dark:text-white border border-slate-200 dark:border-slate-500"
                  >
                    <option value="">Select a promoter...</option>
                    {promoters.filter(p => p.id !== selectedPromoter.id && p.active).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => { setShowDeleteModal(false); setSelectedPromoter(null) }}
                className="btn-secondary px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteAction === 'hard' && selectedPromoter.eventCount > 0 && !reassignPromoterId}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteAction === 'soft' ? 'Deactivate' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Events Modal */}
      {showEventsModal && selectedPromoter && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-4xl my-8 max-h-[80vh] overflow-y-auto border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-primary-contrast">Events for {selectedPromoter.name}</h2>
              <button
                onClick={() => { setShowEventsModal(false); setSelectedPromoter(null) }}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {getPromoterEvents(selectedPromoter.id).length === 0 ? (
              <p className="text-secondary-contrast text-center py-8">No events yet</p>
            ) : (
              <div className="grid gap-4">
                {getPromoterEvents(selectedPromoter.id).map(event => (
                  <div key={event.id} className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-primary-contrast">{event.name}</h3>
                      <p className="text-sm text-secondary-contrast">
                        {event.venueName || event.venue} • {
                          event.schedule?.date ?
                            new Date(event.schedule.date.toDate ? event.schedule.date.toDate() : event.schedule.date).toLocaleDateString() :
                            'Date TBD'
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/admin/events/edit/${event.id}`)}
                      className="btn-accent px-4 py-2 rounded-lg text-sm"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users Management Modal */}
      {showUsersModal && selectedPromoter && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-2xl my-8 border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-primary-contrast">Manage Users for {selectedPromoter.name}</h2>
              <button
                onClick={() => {
                  setShowUsersModal(false)
                  setSelectedPromoter(null)
                  setNewUserData({ email: '', password: '', name: '' })
                  setUserFormErrors({})
                }}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-primary-contrast">Current Users</h3>
              {selectedPromoter.users?.length > 0 ? (
                <div className="space-y-2">
                  {selectedPromoter.users.map((userId: string) => {
                    const userData = users[userId]
                    return (
                      <div key={userId} className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-primary-contrast">{userData?.name || 'Unknown User'}</p>
                          <p className="text-sm text-secondary-contrast">{userData?.email || userId}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveUser(userId)}
                          className="px-3 py-1 bg-red-100 dark:bg-red-600/20 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-600/30 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-secondary-contrast">No users assigned yet</p>
              )}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="text-lg font-semibold mb-3 text-primary-contrast">Add New User</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm mb-2 text-primary-contrast font-medium">Name *</label>
                  <input
                    type="text"
                    value={newUserData.name}
                    onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
                    className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-accent-500 focus:outline-none ${userFormErrors.name ? 'border-red-500' : ''}`}
                    placeholder="User Name"
                  />
                  {userFormErrors.name && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{userFormErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-2 text-primary-contrast font-medium">Email *</label>
                  <input
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                    className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-accent-500 focus:outline-none ${userFormErrors.email ? 'border-red-500' : ''}`}
                    placeholder="user@example.com"
                  />
                  {userFormErrors.email && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{userFormErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-2 text-primary-contrast font-medium">Password *</label>
                  <input
                    type="password"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                    className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-accent-500 focus:outline-none ${userFormErrors.password ? 'border-red-500' : ''}`}
                    placeholder="••••••••"
                  />
                  {userFormErrors.password && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{userFormErrors.password}</p>}
                  {newUserData.password && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(i => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded ${
                              i <= getPasswordStrength(newUserData.password).score
                                ? 'bg-green-500'
                                : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-secondary-contrast mt-1">
                        Strength: {getPasswordStrength(newUserData.password).message}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleAddUser}
                  className="w-full btn-accent px-4 py-2 rounded-lg"
                >
                  Create User
                </button>
              </div>
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
