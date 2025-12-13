'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { usePromoterAccess } from '@/lib/hooks/usePromoterAccess'
import { AdminService } from '@/lib/admin/adminService'
import { StorageService } from '@/lib/storage/storageService'
import { PromoterProfile, PaymentGateway } from '@/lib/types/promoter'
import { db, auth } from '@/lib/firebase'
import { collection, getDocs, query, where, Timestamp, writeBatch, doc, getDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import PromoterOverview from '@/components/admin/promoters/PromoterOverview'
import PaymentGatewaySetup from '@/components/admin/promoters/PaymentGatewaySetup'
import PromoterEvents from '@/components/admin/promoters/PromoterEvents'
import PromoterCommissions from '@/components/admin/promoters/PromoterCommissions'
import PromoterDocuments from '@/components/admin/promoters/PromoterDocuments'

type TabType = 'tenants' | 'branding' | 'users' | 'payment' | 'events' | 'commissions' | 'documents' | 'domains'

// Default color scheme
const DEFAULT_COLOR_SCHEME = {
  primary: '#3B82F6',
  secondary: '#6366F1',
  accent: '#F59E0B',
  background: '#FFFFFF',
  text: '#111827',
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

export default function WhiteLabelPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('tenants')
  const [loading, setLoading] = useState(true)
  const [promoters, setPromoters] = useState<PromoterWithStats[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [users, setUsers] = useState<Record<string, any>>({})
  const [selectedPromoter, setSelectedPromoter] = useState<PromoterWithStats | null>(null)
  const [paymentGateway, setPaymentGateway] = useState<PaymentGateway | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  // Modal states
  const [showForm, setShowForm] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showUsersModal, setShowUsersModal] = useState(false)
  const [editingPromoter, setEditingPromoter] = useState<PromoterWithStats | null>(null)

  // Form state
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')

  // Search, filter, sort state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'events' | 'commission'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  // Delete state
  const [deleteAction, setDeleteAction] = useState<'soft' | 'hard'>('soft')
  const [reassignPromoterId, setReassignPromoterId] = useState('')

  // New user form state
  const [newUserData, setNewUserData] = useState({ email: '', password: '', name: '' })
  const [userFormErrors, setUserFormErrors] = useState<Record<string, string>>({})

  // Branding form state
  const [brandingForm, setBrandingForm] = useState({
    name: '',
    logo: '',
    brandingType: 'basic' as 'basic' | 'advanced',
    colorScheme: DEFAULT_COLOR_SCHEME,
    website: '',
    description: '',
  })
  const [savingBranding, setSavingBranding] = useState(false)

  const { isAdmin, effectivePromoterId, showAll } = usePromoterAccess()

  // Toast helper
  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [promotersData, eventsData] = await Promise.all([
        AdminService.getPromoters(),
        AdminService.getEvents()
      ])

      // Group events by promoterId
      const eventsByPromoter: Record<string, any[]> = {}
      eventsData.forEach(event => {
        const pid = event.promoterId || event.promoter?.promoterId
        if (pid) {
          if (!eventsByPromoter[pid]) eventsByPromoter[pid] = []
          eventsByPromoter[pid].push(event)
        }
      })

      // Fetch orders and group by event
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

      // Build promoters with stats
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

      // Fetch user details
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

      if (showAll) {
        setPromoters(promotersWithStats)
        if (promotersWithStats.length > 0 && !selectedPromoter) {
          setSelectedPromoter(promotersWithStats[0])
          populateBrandingForm(promotersWithStats[0])
        }
      } else {
        const myPromoter = promotersWithStats.find(p => p.id === effectivePromoterId)
        if (myPromoter) {
          setPromoters([myPromoter])
          setSelectedPromoter(myPromoter)
          populateBrandingForm(myPromoter)
        }
      }

      setEvents(eventsData)
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }, [effectivePromoterId, showAll, showToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Load payment gateway when selected promoter changes
  useEffect(() => {
    const loadPaymentGateway = async () => {
      if (!selectedPromoter) {
        setPaymentGateway(null)
        return
      }
      try {
        const gatewayQuery = query(
          collection(db, 'payment_gateways'),
          where('promoterId', '==', selectedPromoter.id)
        )
        const gatewaySnap = await getDocs(gatewayQuery)
        if (!gatewaySnap.empty) {
          setPaymentGateway({ id: gatewaySnap.docs[0].id, ...gatewaySnap.docs[0].data() } as PaymentGateway)
        } else {
          setPaymentGateway(null)
        }
      } catch (error) {
        console.error('Error loading payment gateway:', error)
      }
    }
    loadPaymentGateway()
  }, [selectedPromoter])

  const populateBrandingForm = (promoter: PromoterProfile) => {
    setBrandingForm({
      name: promoter.name || '',
      logo: promoter.logo || '',
      brandingType: promoter.brandingType || 'basic',
      colorScheme: {
        primary: promoter.colorScheme?.primary || DEFAULT_COLOR_SCHEME.primary,
        secondary: promoter.colorScheme?.secondary || DEFAULT_COLOR_SCHEME.secondary,
        accent: promoter.colorScheme?.accent || DEFAULT_COLOR_SCHEME.accent,
        background: promoter.colorScheme?.background || DEFAULT_COLOR_SCHEME.background,
        text: promoter.colorScheme?.text || DEFAULT_COLOR_SCHEME.text,
      },
      website: promoter.website || '',
      description: promoter.description || '',
    })
  }

  // Filtered and sorted promoters
  const filteredPromoters = useMemo(() => {
    let result = [...promoters]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.slug?.toLowerCase().includes(q)
      )
    }
    if (filterStatus !== 'all') {
      result = result.filter(p => filterStatus === 'active' ? p.active : !p.active)
    }
    result.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name': comparison = (a.name || '').localeCompare(b.name || ''); break
        case 'revenue': comparison = (a.totalRevenue || 0) - (b.totalRevenue || 0); break
        case 'events': comparison = (a.eventCount || 0) - (b.eventCount || 0); break
        case 'commission': comparison = (a.commission || 0) - (b.commission || 0); break
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

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus, sortBy, sortOrder])

  // Stats
  const stats = useMemo(() => ({
    totalTenants: promoters.length,
    activeTenants: promoters.filter(p => p.active).length,
    advancedPlans: promoters.filter(p => p.brandingType === 'advanced').length,
    basicPlans: promoters.filter(p => p.brandingType === 'basic' || !p.brandingType).length,
    totalEvents: promoters.reduce((sum, p) => sum + (p.eventCount || 0), 0),
    totalRevenue: promoters.reduce((sum, p) => sum + (p.totalRevenue || 0), 0),
    totalCommissions: promoters.reduce((sum, p) => sum + (p.totalRevenue * (p.commission / 100)), 0),
  }), [promoters])

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
    const existingPromoter = promoters.find(p => p.slug === slug && p.id !== editingPromoter?.id)
    if (existingPromoter) errors.slug = 'This slug is already in use'

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [formData, promoters, editingPromoter])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const url = await StorageService.uploadPromoterLogo(file, formData.name || 'promoter')
      setLogoUrl(url)
      setFormData(prev => ({ ...prev, logo: url }))
      showToast('Logo uploaded successfully')
    } catch (error) {
      console.error('Error uploading logo:', error)
      showToast('Failed to upload logo', 'error')
    }
    setUploadingLogo(false)
  }

  const handleBrandingLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const url = await StorageService.uploadPromoterLogo(file, brandingForm.name || 'promoter')
      setBrandingForm(prev => ({ ...prev, logo: url }))
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
        await AdminService.updatePromoter(selectedPromoter.id, {
          active: false,
          deletedAt: Timestamp.now()
        })
        showToast(`${selectedPromoter.name} has been deactivated`)
      } else {
        if (selectedPromoter.eventCount > 0 && reassignPromoterId) {
          const batch = writeBatch(db)
          const promoterEvents = events.filter(e =>
            e.promoterId === selectedPromoter.id || e.promoter?.promoterId === selectedPromoter.id
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

  const handleSelectPromoter = (promoter: PromoterWithStats) => {
    setSelectedPromoter(promoter)
    populateBrandingForm(promoter)
  }

  const handleSaveBranding = async () => {
    if (!selectedPromoter) return
    setSavingBranding(true)
    try {
      await AdminService.updatePromoter(selectedPromoter.id, {
        name: brandingForm.name,
        logo: brandingForm.logo,
        brandingType: brandingForm.brandingType,
        colorScheme: brandingForm.colorScheme,
        website: brandingForm.website,
        description: brandingForm.description,
      })
      showToast('Branding saved successfully!')
      await loadData()
    } catch (error) {
      console.error('Error saving branding:', error)
      showToast('Failed to save branding', 'error')
    } finally {
      setSavingBranding(false)
    }
  }

  const handleShowUsers = (promoter: PromoterWithStats) => {
    setSelectedPromoter(promoter)
    setShowUsersModal(true)
  }

  const validateNewUser = (): boolean => {
    const errors: Record<string, string> = {}
    if (!newUserData.name.trim()) errors.name = 'Name is required'
    if (!newUserData.email.trim()) errors.email = 'Email is required'
    else if (!isValidEmail(newUserData.email)) errors.email = 'Invalid email format'
    if (!newUserData.password) errors.password = 'Password is required'
    else {
      const strength = getPasswordStrength(newUserData.password)
      if (strength.score < 2) errors.password = 'Password is too weak'
    }
    setUserFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddUser = async () => {
    if (!selectedPromoter || !validateNewUser()) return
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, newUserData.email, newUserData.password)
      const updatedUsers = [...(selectedPromoter.users || []), userCredential.user.uid]
      await AdminService.updatePromoter(selectedPromoter.id, { users: updatedUsers })
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
    if (!confirm('Remove this user from the tenant? The user account will still exist but will lose access.')) return
    try {
      const updatedUsers = (selectedPromoter.users || []).filter(id => id !== userId)
      await AdminService.updatePromoter(selectedPromoter.id, { users: updatedUsers })
      await AdminService.updateUser(userId, { promoterId: null, role: 'user' })
      showToast('User removed from tenant')
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

  const getPromoterPortalUrl = (slug: string) => {
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${slug}`
  }

  const getStatusColor = (active: boolean) => {
    return active
      ? 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30'
      : 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30'
  }

  const getPlanColor = (brandingType: string) => {
    return brandingType === 'advanced'
      ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30'
      : 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
      </div>
    )
  }

  const adminTabs: TabType[] = ['tenants', 'branding', 'users', 'payment', 'events', 'commissions', 'documents', 'domains']
  const promoterTabs: TabType[] = ['branding', 'payment', 'events', 'commissions', 'documents']

  return (
    <div className="space-y-6">
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isAdmin ? 'White-Label Platform' : 'Your Portal'}
          </h1>
          <p className="text-slate-600 dark:text-gray-400 mt-1">
            {isAdmin
              ? 'Manage tenants, branding, users, and platform settings'
              : 'Customize your portal appearance and settings'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            + Add Tenant
          </button>
        )}
      </div>

      {/* Stats - Admin Only */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
            <p className="text-slate-500 dark:text-gray-400 text-xs">Total Tenants</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalTenants}</p>
          </div>
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
            <p className="text-slate-500 dark:text-gray-400 text-xs">Active</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.activeTenants}</p>
          </div>
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
            <p className="text-slate-500 dark:text-gray-400 text-xs">Advanced Plans</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.advancedPlans}</p>
          </div>
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
            <p className="text-slate-500 dark:text-gray-400 text-xs">Basic Plans</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.basicPlans}</p>
          </div>
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
            <p className="text-slate-500 dark:text-gray-400 text-xs">Total Events</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalEvents}</p>
          </div>
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
            <p className="text-slate-500 dark:text-gray-400 text-xs">Total Revenue</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">${stats.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-slate-200 dark:border-white/10">
            <p className="text-slate-500 dark:text-gray-400 text-xs">Total Commissions</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">${stats.totalCommissions.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-lg w-fit overflow-x-auto">
        {(isAdmin ? adminTabs : promoterTabs).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize whitespace-nowrap ${
              activeTab === tab
                ? 'bg-purple-600 text-white'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            {tab === 'tenants' ? 'Tenants' : tab}
          </button>
        ))}
      </div>

      {/* TENANTS TAB - Card Grid with Search/Filter */}
      {activeTab === 'tenants' && isAdmin && (
        <div className="space-y-6">
          {/* Search, Filter, Sort Controls */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search tenants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-purple-500 focus:outline-none text-slate-900 dark:text-white"
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

          {/* Card Grid */}
          {filteredPromoters.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
              <div className="text-6xl mb-4">🏢</div>
              <p className="text-slate-500 dark:text-gray-400 mb-4">
                {searchQuery || filterStatus !== 'all' ? 'No tenants match your filters' : 'No tenants yet. Add your first tenant!'}
              </p>
              {!searchQuery && filterStatus === 'all' && (
                <button onClick={() => setShowForm(true)} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
                  Add First Tenant
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedPromoters.map(promoter => (
                  <div
                    key={promoter.id}
                    className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden hover:border-purple-500/50 transition-all"
                  >
                    {/* Header */}
                    <div className="p-6 pb-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          {promoter.logo ? (
                            <img src={promoter.logo} alt={promoter.name} className="w-12 h-12 rounded-lg object-cover" />
                          ) : (
                            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                              {promoter.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                          )}
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{promoter.name}</h3>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs border ${getPlanColor(promoter.brandingType || 'basic')}`}>
                                {promoter.brandingType || 'basic'}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs border ${getStatusColor(promoter.active)}`}>
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
                          <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">Portal URL</p>
                          <a
                            href={getPromoterPortalUrl(promoter.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-purple-600 dark:text-purple-400 hover:underline truncate block font-medium"
                          >
                            /p/{promoter.slug}
                          </a>
                        </div>
                      )}

                      {/* Contact Info */}
                      <div className="space-y-1 mb-3 text-sm">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400">
                          <span>📧</span>
                          <span className="truncate">{promoter.email}</span>
                        </div>
                        {promoter.phone && (
                          <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400">
                            <span>📱</span>
                            <span>{promoter.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-slate-100 dark:bg-slate-700/50 p-2 rounded text-center border border-slate-200 dark:border-slate-600">
                          <p className="text-xs text-slate-500 dark:text-gray-400">Events</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">{promoter.eventCount || 0}</p>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700/50 p-2 rounded text-center border border-slate-200 dark:border-slate-600">
                          <p className="text-xs text-slate-500 dark:text-gray-400">Orders</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">{promoter.totalOrders || 0}</p>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700/50 p-2 rounded text-center border border-slate-200 dark:border-slate-600">
                          <p className="text-xs text-slate-500 dark:text-gray-400">Users</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">{promoter.users?.length || 0}</p>
                        </div>
                      </div>

                      {/* Commission Info */}
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800/30">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-xs text-slate-500 dark:text-gray-400">Revenue</span>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">${(promoter.totalRevenue || 0).toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-slate-500 dark:text-gray-400">Commission ({promoter.commission}%)</span>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">${calculateEarnings(promoter)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-6 pb-6">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleEdit(promoter)}
                          className="px-3 py-2 bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-600/30 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => { handleSelectPromoter(promoter); setActiveTab('branding') }}
                          className="px-3 py-2 bg-purple-600/20 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-600/30 text-sm"
                        >
                          Branding
                        </button>
                        <button
                          onClick={() => handleShowUsers(promoter)}
                          className="px-3 py-2 bg-green-600/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-600/30 text-sm"
                        >
                          Users ({promoter.users?.length || 0})
                        </button>
                        <button
                          onClick={() => handleDeleteClick(promoter)}
                          className="px-3 py-2 bg-red-600/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-600/30 text-sm"
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
                            ? 'bg-purple-600 text-white'
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
        </div>
      )}

      {/* BRANDING TAB */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tenant Selector - Admin Only */}
          {isAdmin && promoters.length > 1 && (
            <div className="lg:col-span-1 bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Select Tenant</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {promoters.map(promoter => (
                  <button
                    key={promoter.id}
                    onClick={() => handleSelectPromoter(promoter)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      selectedPromoter?.id === promoter.id
                        ? 'bg-purple-500/20 border border-purple-500/30'
                        : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    {promoter.logo ? (
                      <img src={promoter.logo} alt={promoter.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-gray-400">
                        {promoter.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 dark:text-white font-medium truncate">{promoter.name}</p>
                      <p className="text-slate-500 dark:text-gray-400 text-sm capitalize">{promoter.brandingType || 'basic'} Plan</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Branding Form */}
          <div className={`${isAdmin && promoters.length > 1 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {selectedPromoter ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Basic Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-slate-600 dark:text-gray-400 text-sm">Tenant Name</label>
                      <input
                        type="text"
                        value={brandingForm.name}
                        onChange={(e) => setBrandingForm({ ...brandingForm, name: e.target.value })}
                        className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-gray-400 text-sm">Logo</label>
                      <div className="mt-1 space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBrandingLogoUpload}
                          disabled={uploadingLogo}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white"
                        />
                        {uploadingLogo && <p className="text-xs text-purple-600 dark:text-purple-400">Uploading logo...</p>}
                        {brandingForm.logo && (
                          <div className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg inline-block">
                            <img src={brandingForm.logo} alt="Preview" className="h-12 object-contain" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-gray-400 text-sm">Website</label>
                      <input
                        type="url"
                        value={brandingForm.website}
                        onChange={(e) => setBrandingForm({ ...brandingForm, website: e.target.value })}
                        placeholder="https://..."
                        className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-gray-400 text-sm">Description</label>
                      <textarea
                        value={brandingForm.description}
                        onChange={(e) => setBrandingForm({ ...brandingForm, description: e.target.value })}
                        rows={3}
                        className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-gray-400 text-sm">Plan Type</label>
                      <div className="flex gap-4 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="brandingType"
                            value="basic"
                            checked={brandingForm.brandingType === 'basic'}
                            onChange={() => setBrandingForm({ ...brandingForm, brandingType: 'basic' })}
                            className="text-purple-600"
                          />
                          <span className="text-slate-900 dark:text-white">Basic</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="brandingType"
                            value="advanced"
                            checked={brandingForm.brandingType === 'advanced'}
                            onChange={() => setBrandingForm({ ...brandingForm, brandingType: 'advanced' })}
                            className="text-purple-600"
                          />
                          <span className="text-slate-900 dark:text-white">Advanced</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Color Scheme */}
                <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Color Scheme</h3>
                  <div className="space-y-4">
                    {Object.entries(brandingForm.colorScheme).map(([key, value]) => (
                      <div key={key}>
                        <label className="text-slate-600 dark:text-gray-400 text-sm capitalize">{key} Color</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="color"
                            value={value}
                            onChange={(e) => setBrandingForm({
                              ...brandingForm,
                              colorScheme: { ...brandingForm.colorScheme, [key]: e.target.value }
                            })}
                            className="w-12 h-10 rounded cursor-pointer border-0"
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => setBrandingForm({
                              ...brandingForm,
                              colorScheme: { ...brandingForm.colorScheme, [key]: e.target.value }
                            })}
                            className="flex-1 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Preview */}
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10">
                    <h4 className="text-sm font-medium text-slate-600 dark:text-gray-400 mb-3">Preview</h4>
                    <div className="p-4 rounded-lg" style={{ backgroundColor: brandingForm.colorScheme.background }}>
                      <div className="p-3 rounded" style={{ backgroundColor: brandingForm.colorScheme.primary }}>
                        <span style={{ color: '#fff' }}>Primary Button</span>
                      </div>
                      <p className="mt-3 font-medium" style={{ color: brandingForm.colorScheme.text }}>Sample Text</p>
                      <p className="text-sm" style={{ color: brandingForm.colorScheme.secondary }}>Secondary Element</p>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="lg:col-span-2">
                  <button
                    onClick={handleSaveBranding}
                    disabled={savingBranding}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-colors font-medium"
                  >
                    {savingBranding ? 'Saving...' : 'Save Branding'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-slate-200 dark:border-white/10 text-center">
                <p className="text-slate-500 dark:text-gray-400">Select a tenant to edit their branding</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tenant Selector */}
          {isAdmin && promoters.length > 1 && (
            <div className="lg:col-span-1 bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Select Tenant</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {promoters.map(promoter => (
                  <button
                    key={promoter.id}
                    onClick={() => handleSelectPromoter(promoter)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      selectedPromoter?.id === promoter.id
                        ? 'bg-purple-500/20 border border-purple-500/30'
                        : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    {promoter.logo ? (
                      <img src={promoter.logo} alt={promoter.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-gray-400">
                        {promoter.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 dark:text-white font-medium truncate">{promoter.name}</p>
                      <p className="text-slate-500 dark:text-gray-400 text-sm">{promoter.users?.length || 0} users</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Users Management */}
          <div className={`${isAdmin && promoters.length > 1 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {selectedPromoter ? (
              <div className="space-y-6">
                {/* Current Users */}
                <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Current Users ({selectedPromoter.users?.length || 0})
                  </h3>
                  {selectedPromoter.users?.length > 0 ? (
                    <div className="space-y-2">
                      {selectedPromoter.users.map((userId: string) => {
                        const userData = users[userId]
                        return (
                          <div key={userId} className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-3 flex justify-between items-center">
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">{userData?.name || 'Unknown User'}</p>
                              <p className="text-sm text-slate-500 dark:text-gray-400">{userData?.email || userId}</p>
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
                    <p className="text-slate-500 dark:text-gray-400">No users assigned yet</p>
                  )}
                </div>

                {/* Add New User */}
                <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Add New User</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm mb-2 text-slate-900 dark:text-white font-medium">Name *</label>
                      <input
                        type="text"
                        value={newUserData.name}
                        onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                        className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border ${userFormErrors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} focus:border-purple-500 focus:outline-none`}
                        placeholder="User Name"
                      />
                      {userFormErrors.name && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{userFormErrors.name}</p>}
                    </div>
                    <div>
                      <label className="block text-sm mb-2 text-slate-900 dark:text-white font-medium">Email *</label>
                      <input
                        type="email"
                        value={newUserData.email}
                        onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                        className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border ${userFormErrors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} focus:border-purple-500 focus:outline-none`}
                        placeholder="user@example.com"
                      />
                      {userFormErrors.email && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{userFormErrors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-sm mb-2 text-slate-900 dark:text-white font-medium">Password *</label>
                      <input
                        type="password"
                        value={newUserData.password}
                        onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                        className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border ${userFormErrors.password ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} focus:border-purple-500 focus:outline-none`}
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
                                  i <= getPasswordStrength(newUserData.password).score ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                            Strength: {getPasswordStrength(newUserData.password).message}
                          </p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleAddUser}
                      className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
                    >
                      Create User
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-slate-200 dark:border-white/10 text-center">
                <p className="text-slate-500 dark:text-gray-400">Select a tenant to manage their users</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAYMENT TAB */}
      {activeTab === 'payment' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tenant Selector */}
          {isAdmin && promoters.length > 1 && (
            <div className="lg:col-span-1 bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Select Tenant</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {promoters.map(promoter => (
                  <button
                    key={promoter.id}
                    onClick={() => handleSelectPromoter(promoter)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      selectedPromoter?.id === promoter.id
                        ? 'bg-purple-500/20 border border-purple-500/30'
                        : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    {promoter.logo ? (
                      <img src={promoter.logo} alt={promoter.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-gray-400">
                        {promoter.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 dark:text-white font-medium truncate">{promoter.name}</p>
                      <p className="text-slate-500 dark:text-gray-400 text-sm capitalize">{promoter.brandingType || 'basic'} Plan</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payment Gateway Setup */}
          <div className={`${isAdmin && promoters.length > 1 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {selectedPromoter ? (
              <PaymentGatewaySetup
                promoterId={selectedPromoter.id}
                currentGateway={paymentGateway}
                isMaster={isAdmin || false}
                onUpdate={loadData}
              />
            ) : (
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-slate-200 dark:border-white/10 text-center">
                <p className="text-slate-500 dark:text-gray-400">Select a tenant to configure their payment gateway</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EVENTS TAB */}
      {activeTab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tenant Selector */}
          {isAdmin && promoters.length > 1 && (
            <div className="lg:col-span-1 bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Select Tenant</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {promoters.map(promoter => (
                  <button
                    key={promoter.id}
                    onClick={() => handleSelectPromoter(promoter)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      selectedPromoter?.id === promoter.id
                        ? 'bg-purple-500/20 border border-purple-500/30'
                        : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    {promoter.logo ? (
                      <img src={promoter.logo} alt={promoter.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-gray-400">
                        {promoter.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 dark:text-white font-medium truncate">{promoter.name}</p>
                      <p className="text-slate-500 dark:text-gray-400 text-sm">{promoter.eventCount || 0} events</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Events List */}
          <div className={`${isAdmin && promoters.length > 1 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {selectedPromoter ? (
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Events for {selectedPromoter.name}
                </h3>
                <PromoterEvents promoterId={selectedPromoter.id} />
              </div>
            ) : (
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-slate-200 dark:border-white/10 text-center">
                <p className="text-slate-500 dark:text-gray-400">Select a tenant to view their events</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMMISSIONS TAB */}
      {activeTab === 'commissions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tenant Selector */}
          {isAdmin && promoters.length > 1 && (
            <div className="lg:col-span-1 bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Select Tenant</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {promoters.map(promoter => (
                  <button
                    key={promoter.id}
                    onClick={() => handleSelectPromoter(promoter)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      selectedPromoter?.id === promoter.id
                        ? 'bg-purple-500/20 border border-purple-500/30'
                        : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    {promoter.logo ? (
                      <img src={promoter.logo} alt={promoter.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-gray-400">
                        {promoter.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 dark:text-white font-medium truncate">{promoter.name}</p>
                      <p className="text-slate-500 dark:text-gray-400 text-sm">{promoter.commission}% commission</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Commissions */}
          <div className={`${isAdmin && promoters.length > 1 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {selectedPromoter ? (
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Commissions for {selectedPromoter.name}
                </h3>
                <PromoterCommissions promoterId={selectedPromoter.id} />
              </div>
            ) : (
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-slate-200 dark:border-white/10 text-center">
                <p className="text-slate-500 dark:text-gray-400">Select a tenant to view their commissions</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DOCUMENTS TAB */}
      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tenant Selector */}
          {isAdmin && promoters.length > 1 && (
            <div className="lg:col-span-1 bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Select Tenant</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {promoters.map(promoter => (
                  <button
                    key={promoter.id}
                    onClick={() => handleSelectPromoter(promoter)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      selectedPromoter?.id === promoter.id
                        ? 'bg-purple-500/20 border border-purple-500/30'
                        : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    {promoter.logo ? (
                      <img src={promoter.logo} alt={promoter.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-gray-400">
                        {promoter.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 dark:text-white font-medium truncate">{promoter.name}</p>
                      <p className="text-slate-500 dark:text-gray-400 text-sm capitalize">{promoter.brandingType || 'basic'} Plan</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          <div className={`${isAdmin && promoters.length > 1 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {selectedPromoter ? (
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-slate-200 dark:border-white/10">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Documents for {selectedPromoter.name}
                </h3>
                <PromoterDocuments promoterId={selectedPromoter.id} />
              </div>
            ) : (
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-slate-200 dark:border-white/10 text-center">
                <p className="text-slate-500 dark:text-gray-400">Select a tenant to view their documents</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DOMAINS TAB - Admin Only */}
      {activeTab === 'domains' && isAdmin && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Tenant Portals</h3>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Tenant</th>
                  <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Portal Slug</th>
                  <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Custom Domain</th>
                  <th className="text-left p-4 text-slate-500 dark:text-gray-400 font-medium">Status</th>
                  <th className="text-right p-4 text-slate-500 dark:text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promoters.filter(p => p.active).map((promoter) => (
                  <tr key={promoter.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="p-4">
                      <p className="text-slate-900 dark:text-white font-medium">{promoter.name}</p>
                    </td>
                    <td className="p-4">
                      {promoter.slug ? (
                        <a
                          href={`/p/${promoter.slug}`}
                          target="_blank"
                          className="text-purple-600 dark:text-purple-400 hover:text-purple-500"
                        >
                          /p/{promoter.slug}
                        </a>
                      ) : (
                        <span className="text-slate-400">Not set</span>
                      )}
                    </td>
                    <td className="p-4">
                      {promoter.website ? (
                        <a
                          href={promoter.website}
                          target="_blank"
                          className="text-purple-600 dark:text-purple-400 hover:text-purple-500"
                        >
                          {promoter.website.replace('https://', '').replace('http://', '')}
                        </a>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(promoter.active)}`}>
                        {promoter.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="px-3 py-1 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-lg text-sm transition-colors">
                        Configure
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE/EDIT TENANT MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-3xl my-8 border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {editingPromoter ? 'Edit Tenant' : 'Add New Tenant'}
              </h2>
              <button onClick={() => { setShowForm(false); resetForm() }} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 text-slate-900 dark:text-white font-medium">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border ${formErrors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} focus:border-purple-500 focus:outline-none`}
                    placeholder="Tenant Name"
                  />
                  {formErrors.name && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-2 text-slate-900 dark:text-white font-medium">Portal Slug *</label>
                  <div className="flex items-center">
                    <span className="text-slate-500 dark:text-gray-400 mr-2">/p/</span>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      className={`flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border ${formErrors.slug ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} focus:border-purple-500 focus:outline-none`}
                      placeholder="tenant-name"
                    />
                  </div>
                  {formErrors.slug ? (
                    <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.slug}</p>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Auto-generated if left empty</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 text-slate-900 dark:text-white font-medium">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border ${formErrors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} focus:border-purple-500 focus:outline-none`}
                    placeholder="tenant@example.com"
                  />
                  {formErrors.email && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-2 text-slate-900 dark:text-white font-medium">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border ${formErrors.phone ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} focus:border-purple-500 focus:outline-none`}
                    placeholder="(555) 123-4567"
                  />
                  {formErrors.phone && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.phone}</p>}
                </div>
              </div>

              {/* Branding */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 text-slate-900 dark:text-white font-medium">Branding Type</label>
                  <select
                    value={formData.brandingType}
                    onChange={(e) => setFormData({ ...formData, brandingType: e.target.value as 'basic' | 'advanced' })}
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="basic">Basic</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2 text-slate-900 dark:text-white font-medium">Commission (%)</label>
                  <input
                    type="number"
                    value={formData.commission}
                    onChange={(e) => setFormData({ ...formData, commission: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                    className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border ${formErrors.commission ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} focus:border-purple-500 focus:outline-none`}
                    min="0"
                    max="100"
                  />
                  {formErrors.commission && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.commission}</p>}
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm mb-2 text-slate-900 dark:text-white font-medium">Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600"
                  disabled={uploadingLogo}
                />
                {uploadingLogo && <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">Uploading logo...</p>}
                {logoUrl && (
                  <div className="mt-2">
                    <img src={logoUrl} alt="Logo preview" className="h-20 object-contain rounded" />
                  </div>
                )}
              </div>

              {/* Color Scheme */}
              <div>
                <label className="block text-sm mb-2 text-slate-900 dark:text-white font-medium">Color Scheme</label>
                <div className="grid grid-cols-5 gap-3">
                  {(['primary', 'secondary', 'accent', 'background', 'text'] as const).map(key => (
                    <div key={key}>
                      <label className="text-xs text-slate-500 dark:text-gray-400 capitalize">{key}</label>
                      <input
                        type="color"
                        value={formData.colorScheme[key]}
                        onChange={(e) => setFormData({
                          ...formData,
                          colorScheme: { ...formData.colorScheme, [key]: e.target.value }
                        })}
                        className="w-full h-10 rounded cursor-pointer border border-slate-200 dark:border-slate-600"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 text-slate-900 dark:text-white font-medium">Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border ${formErrors.website ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} focus:border-purple-500 focus:outline-none`}
                    placeholder="https://example.com"
                  />
                  {formErrors.website && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.website}</p>}
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="rounded border-slate-300 dark:border-slate-600"
                    />
                    <span>Active (Can manage events)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-slate-900 dark:text-white font-medium">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg h-20 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 focus:border-purple-500 focus:outline-none"
                  placeholder="Notes about this tenant..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm() }}
                  className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingPromoter ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && selectedPromoter && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-700 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
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
                  <p className="text-sm text-slate-500 dark:text-gray-400">Tenant will be hidden but data preserved for reporting</p>
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
                  <p className="text-sm text-slate-500 dark:text-gray-400">Cannot be undone. All tenant data will be lost.</p>
                </div>
              </label>

              {deleteAction === 'hard' && selectedPromoter.eventCount > 0 && (
                <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <p className="text-sm text-slate-500 dark:text-gray-400 mb-2">
                    This tenant has {selectedPromoter.eventCount} events. Reassign to:
                  </p>
                  <select
                    value={reassignPromoterId}
                    onChange={(e) => setReassignPromoterId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-600 rounded-lg text-slate-900 dark:text-white border border-slate-200 dark:border-slate-500"
                  >
                    <option value="">Select a tenant...</option>
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
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
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

      {/* USERS MANAGEMENT MODAL */}
      {showUsersModal && selectedPromoter && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-2xl my-8 border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Manage Users for {selectedPromoter.name}</h2>
              <button
                onClick={() => {
                  setShowUsersModal(false)
                  setNewUserData({ email: '', password: '', name: '' })
                  setUserFormErrors({})
                }}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white">Current Users</h3>
              {selectedPromoter.users?.length > 0 ? (
                <div className="space-y-2">
                  {selectedPromoter.users.map((userId: string) => {
                    const userData = users[userId]
                    return (
                      <div key={userId} className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{userData?.name || 'Unknown User'}</p>
                          <p className="text-sm text-slate-500 dark:text-gray-400">{userData?.email || userId}</p>
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
                <p className="text-slate-500 dark:text-gray-400">No users assigned yet</p>
              )}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white">Add New User</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm mb-2 text-slate-900 dark:text-white font-medium">Name *</label>
                  <input
                    type="text"
                    value={newUserData.name}
                    onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                    className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border ${userFormErrors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} focus:border-purple-500 focus:outline-none`}
                    placeholder="User Name"
                  />
                  {userFormErrors.name && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{userFormErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-2 text-slate-900 dark:text-white font-medium">Email *</label>
                  <input
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border ${userFormErrors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} focus:border-purple-500 focus:outline-none`}
                    placeholder="user@example.com"
                  />
                  {userFormErrors.email && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{userFormErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-2 text-slate-900 dark:text-white font-medium">Password *</label>
                  <input
                    type="password"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white border ${userFormErrors.password ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} focus:border-purple-500 focus:outline-none`}
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
                              i <= getPasswordStrength(newUserData.password).score ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                        Strength: {getPasswordStrength(newUserData.password).message}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleAddUser}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
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
