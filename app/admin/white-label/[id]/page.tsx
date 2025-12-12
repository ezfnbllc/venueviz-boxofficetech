'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import { AdminService } from '@/lib/admin/adminService'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, where, doc, getDoc, updateDoc, Timestamp, addDoc, deleteDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { PromoterProfile, PaymentGateway } from '@/lib/types/promoter'
import { StorageService } from '@/lib/storage/storageService'

type Tab = 'overview' | 'profile' | 'payment' | 'events' | 'commissions' | 'documents' | 'users'

interface TenantStats {
  eventCount: number
  totalRevenue: number
  totalOrders: number
  totalTickets: number
  avgOrderValue: number
}

interface Commission {
  id: string
  eventId: string
  eventName: string
  orderCount: number
  grossRevenue: number
  commissionRate: number
  commissionAmount: number
  status: 'pending' | 'paid' | 'processing'
  period: string
  paidAt?: any
}

interface Document {
  id: string
  name: string
  type: string
  url: string
  uploadedAt: any
  size: number
}

export default function TenantDetailPage() {
  const router = useRouter()
  const params = useParams()
  const tenantId = params.id as string
  const { user, isAdmin, loading: authLoading } = useFirebaseAuth()

  const [tenant, setTenant] = useState<PromoterProfile | null>(null)
  const [paymentGateway, setPaymentGateway] = useState<PaymentGateway | null>(null)
  const [stats, setStats] = useState<TenantStats | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  // Form states
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileData, setProfileData] = useState<any>({})
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // User management
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUserData, setNewUserData] = useState({ name: '', email: '', password: '' })
  const [addingUser, setAddingUser] = useState(false)

  // Document upload
  const [uploadingDoc, setUploadingDoc] = useState(false)

  // Payment gateway form
  const [gatewayData, setGatewayData] = useState({
    provider: 'stripe',
    stripeAccountId: '',
    stripePublishableKey: '',
    stripeSecretKey: '',
    paypalClientId: '',
    paypalClientSecret: '',
    squareAccessToken: '',
    squareLocationId: '',
    isLive: false
  })
  const [savingGateway, setSavingGateway] = useState(false)
  const [testingGateway, setTestingGateway] = useState(false)

  useEffect(() => {
    if (user && !authLoading && tenantId) {
      loadTenantData()
    }
  }, [user, authLoading, tenantId])

  const loadTenantData = async () => {
    try {
      setLoading(true)

      // Fetch tenant data
      const tenantDoc = await getDoc(doc(db, 'promoters', tenantId))
      if (!tenantDoc.exists()) {
        router.push('/admin/white-label')
        return
      }

      const tenantData = { id: tenantDoc.id, ...tenantDoc.data() } as PromoterProfile
      setTenant(tenantData)
      setProfileData({
        name: tenantData.name || '',
        email: tenantData.email || '',
        phone: tenantData.phone || '',
        slug: tenantData.slug || '',
        website: tenantData.website || '',
        description: tenantData.description || '',
        brandingType: tenantData.brandingType || 'basic',
        commission: tenantData.commission || 10,
        logo: tenantData.logo || '',
        colorScheme: tenantData.colorScheme || {
          primary: '#9333EA',
          secondary: '#EC4899',
          accent: '#F59E0B',
          background: '#1F2937',
          text: '#F3F4F6'
        },
        active: tenantData.active !== false
      })

      // Fetch payment gateway
      const gatewayQuery = query(
        collection(db, 'payment_gateways'),
        where('promoterId', '==', tenantId)
      )
      const gatewaySnap = await getDocs(gatewayQuery)
      if (!gatewaySnap.empty) {
        const gw = { id: gatewaySnap.docs[0].id, ...gatewaySnap.docs[0].data() } as PaymentGateway
        setPaymentGateway(gw)
        setGatewayData({
          provider: gw.provider || 'stripe',
          stripeAccountId: gw.stripeAccountId || '',
          stripePublishableKey: gw.stripePublishableKey || '',
          stripeSecretKey: gw.stripeSecretKey || '',
          paypalClientId: gw.paypalClientId || '',
          paypalClientSecret: gw.paypalClientSecret || '',
          squareAccessToken: gw.squareAccessToken || '',
          squareLocationId: gw.squareLocationId || '',
          isLive: gw.isLive || false
        })
      }

      // Fetch events for this tenant
      const eventsSnapshot = await getDocs(collection(db, 'events'))
      const tenantEvents = eventsSnapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((e: any) => e.promoterId === tenantId || e.promoter?.promoterId === tenantId)
      setEvents(tenantEvents)

      // Fetch orders for stats and commissions
      const ordersSnapshot = await getDocs(collection(db, 'orders'))
      const allOrders = ordersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))

      // Calculate stats
      let totalRevenue = 0
      let totalOrders = 0
      let totalTickets = 0
      const eventIds = new Set(tenantEvents.map(e => e.id))

      allOrders.forEach((order: any) => {
        if (eventIds.has(order.eventId)) {
          totalOrders++
          totalRevenue += order.pricing?.total || order.total || 0
          totalTickets += order.tickets?.length || 1
        }
      })

      setStats({
        eventCount: tenantEvents.length,
        totalRevenue,
        totalOrders,
        totalTickets,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
      })

      // Calculate commissions per event
      const commissionsData: Commission[] = tenantEvents.map((event: any) => {
        const eventOrders = allOrders.filter((o: any) => o.eventId === event.id)
        const grossRevenue = eventOrders.reduce((sum: number, o: any) => sum + (o.pricing?.total || o.total || 0), 0)
        const commissionRate = tenantData.commission || 10
        return {
          id: event.id,
          eventId: event.id,
          eventName: event.name,
          orderCount: eventOrders.length,
          grossRevenue,
          commissionRate,
          commissionAmount: grossRevenue * (commissionRate / 100),
          status: 'pending' as const,
          period: new Date().toISOString().slice(0, 7)
        }
      }).filter(c => c.grossRevenue > 0)

      setCommissions(commissionsData)

      // Fetch documents
      const docsQuery = query(
        collection(db, 'tenant_documents'),
        where('tenantId', '==', tenantId)
      )
      const docsSnap = await getDocs(docsQuery)
      const docsData = docsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Document[]
      setDocuments(docsData)

      // Fetch users
      if (tenantData.users?.length > 0) {
        const usersSnapshot = await getDocs(collection(db, 'users'))
        const usersData = usersSnapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((u: any) => tenantData.users?.includes(u.id))
        setUsers(usersData)
      }

    } catch (error) {
      console.error('Error loading tenant:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      await updateDoc(doc(db, 'promoters', tenantId), {
        ...profileData,
        updatedAt: Timestamp.now()
      })
      setTenant(prev => prev ? { ...prev, ...profileData } : null)
      setEditingProfile(false)
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile')
    }
    setSavingProfile(false)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    try {
      const url = await StorageService.uploadPromoterLogo(file)
      setProfileData((prev: any) => ({ ...prev, logo: url }))
    } catch (error) {
      console.error('Error uploading logo:', error)
      alert('Failed to upload logo')
    }
    setUploadingLogo(false)
  }

  const handleSaveGateway = async () => {
    setSavingGateway(true)
    try {
      const data = {
        promoterId: tenantId,
        ...gatewayData,
        updatedAt: Timestamp.now()
      }

      if (paymentGateway) {
        await updateDoc(doc(db, 'payment_gateways', paymentGateway.id), data)
      } else {
        const docRef = await addDoc(collection(db, 'payment_gateways'), {
          ...data,
          createdAt: Timestamp.now()
        })
        setPaymentGateway({ id: docRef.id, ...data } as any)
      }

      alert('Payment gateway saved successfully')
    } catch (error) {
      console.error('Error saving gateway:', error)
      alert('Failed to save payment gateway')
    }
    setSavingGateway(false)
  }

  const handleTestGateway = async () => {
    setTestingGateway(true)
    try {
      const endpoint = gatewayData.provider === 'stripe' ? '/api/payment/test-stripe' :
                       gatewayData.provider === 'paypal' ? '/api/payment/test-paypal' :
                       '/api/payment/test-square'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gatewayData)
      })

      const result = await response.json()
      if (result.success) {
        alert('Payment gateway test successful!')
      } else {
        alert(`Test failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Error testing gateway:', error)
      alert('Failed to test payment gateway')
    }
    setTestingGateway(false)
  }

  const handleAddUser = async () => {
    if (!newUserData.name || !newUserData.email || !newUserData.password) {
      alert('Please fill in all fields')
      return
    }

    setAddingUser(true)
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUserData.email,
        newUserData.password
      )

      await AdminService.createUser({
        uid: userCredential.user.uid,
        email: newUserData.email,
        name: newUserData.name,
        role: 'promoter',
        promoterId: tenantId,
        createdAt: Timestamp.now()
      })

      const updatedUsers = [...(tenant?.users || []), userCredential.user.uid]
      await updateDoc(doc(db, 'promoters', tenantId), { users: updatedUsers })

      setUsers(prev => [...prev, { id: userCredential.user.uid, ...newUserData }])
      setNewUserData({ name: '', email: '', password: '' })
      setShowAddUser(false)
      alert('User created successfully')
    } catch (error: any) {
      console.error('Error creating user:', error)
      alert(error.message || 'Failed to create user')
    }
    setAddingUser(false)
  }

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Remove this user from the tenant?')) return

    try {
      const updatedUsers = (tenant?.users || []).filter(id => id !== userId)
      await updateDoc(doc(db, 'promoters', tenantId), { users: updatedUsers })
      await AdminService.updateUser(userId, { promoterId: null, role: 'user' })
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch (error) {
      console.error('Error removing user:', error)
      alert('Failed to remove user')
    }
  }

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingDoc(true)
    try {
      const url = await StorageService.uploadDocument(file, tenantId)
      const docRef = await addDoc(collection(db, 'tenant_documents'), {
        tenantId,
        name: file.name,
        type: file.type,
        url,
        size: file.size,
        uploadedAt: Timestamp.now()
      })
      setDocuments(prev => [...prev, { id: docRef.id, name: file.name, type: file.type, url, size: file.size, uploadedAt: Timestamp.now() }])
    } catch (error) {
      console.error('Error uploading document:', error)
      alert('Failed to upload document')
    }
    setUploadingDoc(false)
  }

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Delete this document?')) return

    try {
      await deleteDoc(doc(db, 'tenant_documents', docId))
      setDocuments(prev => prev.filter(d => d.id !== docId))
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Failed to delete document')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Tenant not found</p>
        <button
          onClick={() => router.push('/admin/white-label')}
          className="mt-4 px-4 py-2 bg-purple-600 rounded-lg"
        >
          Back to White-Label
        </button>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'payment', label: 'Payment Gateway', icon: '💳' },
    { id: 'events', label: 'Events', icon: '🎫' },
    { id: 'commissions', label: 'Commissions', icon: '💰' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'documents', label: 'Documents', icon: '📄' },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/white-label')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            ← Back
          </button>

          <div className="flex items-center gap-4">
            {tenant.logo ? (
              <img
                src={tenant.logo}
                alt={tenant.name}
                className="w-16 h-16 rounded-xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl">
                {tenant.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}

            <div>
              <h1 className="text-3xl font-bold">{tenant.name}</h1>
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
                  {tenant.brandingType || 'basic'} branding
                </span>
                {tenant.slug && (
                  <a
                    href={`/p/${tenant.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-400 hover:underline"
                  >
                    /p/{tenant.slug}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Color Scheme Preview */}
        {tenant.colorScheme && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 mr-2">Brand Colors:</span>
            {['primary', 'secondary', 'accent'].map(key => (
              <div
                key={key}
                className="w-8 h-8 rounded-lg border border-white/20"
                style={{ backgroundColor: tenant.colorScheme?.[key as keyof typeof tenant.colorScheme] }}
                title={key}
              />
            ))}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-2 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid md:grid-cols-5 gap-4">
              <div className="bg-black/40 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                <p className="text-gray-400 text-sm mb-1">Total Events</p>
                <p className="text-3xl font-bold">{stats.eventCount}</p>
              </div>
              <div className="bg-black/40 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                <p className="text-gray-400 text-sm mb-1">Total Orders</p>
                <p className="text-3xl font-bold">{stats.totalOrders}</p>
              </div>
              <div className="bg-black/40 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                <p className="text-gray-400 text-sm mb-1">Tickets Sold</p>
                <p className="text-3xl font-bold">{stats.totalTickets}</p>
              </div>
              <div className="bg-black/40 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-green-400">${stats.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-black/40 backdrop-blur-xl rounded-xl p-6 border border-purple-500/30">
                <p className="text-gray-400 text-sm mb-1">Commission ({tenant.commission}%)</p>
                <p className="text-3xl font-bold text-purple-400">
                  ${(stats.totalRevenue * (tenant.commission || 10) / 100).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Quick Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-black/40 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                <h3 className="font-bold mb-4">Contact Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email</span>
                    <span>{tenant.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Phone</span>
                    <span>{tenant.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Website</span>
                    <span>{tenant.website || 'Not provided'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                <h3 className="font-bold mb-4">Payment Gateway Status</h3>
                {paymentGateway ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Provider</span>
                      <span className="capitalize">{paymentGateway.provider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Mode</span>
                      <span className={paymentGateway.isLive ? 'text-green-400' : 'text-yellow-400'}>
                        {paymentGateway.isLive ? 'Live' : 'Test Mode'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status</span>
                      <span className="text-green-400">Configured</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-400 mb-2">No payment gateway configured</p>
                    <button
                      onClick={() => setActiveTab('payment')}
                      className="px-4 py-2 bg-purple-600 rounded-lg text-sm"
                    >
                      Set Up Now
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Events */}
            <div className="bg-black/40 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Recent Events</h3>
                <button
                  onClick={() => setActiveTab('events')}
                  className="text-purple-400 text-sm hover:underline"
                >
                  View All
                </button>
              </div>
              {events.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No events yet</p>
              ) : (
                <div className="space-y-3">
                  {events.slice(0, 5).map(event => (
                    <div key={event.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <div>
                        <p className="font-medium">{event.name}</p>
                        <p className="text-sm text-gray-400">{event.venueName}</p>
                      </div>
                      <button
                        onClick={() => router.push(`/admin/events/edit/${event.id}`)}
                        className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded text-sm"
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

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-black/40 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Tenant Profile</h3>
              {!editingProfile && (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="px-4 py-2 bg-purple-600 rounded-lg"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {editingProfile ? (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Name</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Slug</label>
                    <input
                      type="text"
                      value={profileData.slug}
                      onChange={(e) => setProfileData({ ...profileData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Email</label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Phone</label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Commission Rate (%)</label>
                    <input
                      type="number"
                      value={profileData.commission}
                      onChange={(e) => setProfileData({ ...profileData, commission: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Branding Tier</label>
                    <select
                      value={profileData.brandingType}
                      onChange={(e) => setProfileData({ ...profileData, brandingType: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    >
                      <option value="basic">Basic</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2">Logo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    disabled={uploadingLogo}
                  />
                  {uploadingLogo && <p className="text-purple-400 text-sm mt-1">Uploading...</p>}
                  {profileData.logo && (
                    <img src={profileData.logo} alt="Logo" className="h-20 mt-2 rounded" />
                  )}
                </div>

                <div>
                  <label className="block text-sm mb-2">Brand Colors</label>
                  <div className="grid grid-cols-5 gap-3">
                    {['primary', 'secondary', 'accent', 'background', 'text'].map(key => (
                      <div key={key}>
                        <label className="text-xs text-gray-400 capitalize">{key}</label>
                        <input
                          type="color"
                          value={profileData.colorScheme?.[key] || '#9333EA'}
                          onChange={(e) => setProfileData({
                            ...profileData,
                            colorScheme: { ...profileData.colorScheme, [key]: e.target.value }
                          })}
                          className="w-full h-10 rounded cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={profileData.active}
                    onChange={(e) => setProfileData({ ...profileData, active: e.target.checked })}
                    className="rounded"
                  />
                  <label>Active (Can manage events)</label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setEditingProfile(false)}
                    className="px-6 py-2 bg-gray-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="px-6 py-2 bg-purple-600 rounded-lg disabled:opacity-50"
                  >
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <p className="text-gray-400 text-sm">Name</p>
                    <p className="font-medium">{tenant.name}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <p className="text-gray-400 text-sm">Portal Slug</p>
                    <p className="font-medium">/p/{tenant.slug}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <p className="text-gray-400 text-sm">Email</p>
                    <p className="font-medium">{tenant.email}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <p className="text-gray-400 text-sm">Phone</p>
                    <p className="font-medium">{tenant.phone || 'Not provided'}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <p className="text-gray-400 text-sm">Commission Rate</p>
                    <p className="font-medium">{tenant.commission}%</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <p className="text-gray-400 text-sm">Branding Tier</p>
                    <p className="font-medium capitalize">{tenant.brandingType || 'basic'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payment Gateway Tab */}
        {activeTab === 'payment' && (
          <div className="bg-black/40 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold mb-6">Payment Gateway Configuration</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Provider</label>
                <select
                  value={gatewayData.provider}
                  onChange={(e) => setGatewayData({ ...gatewayData, provider: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                >
                  <option value="stripe">Stripe</option>
                  <option value="paypal">PayPal</option>
                  <option value="square">Square</option>
                </select>
              </div>

              {gatewayData.provider === 'stripe' && (
                <>
                  <div>
                    <label className="block text-sm mb-2">Stripe Account ID</label>
                    <input
                      type="text"
                      value={gatewayData.stripeAccountId}
                      onChange={(e) => setGatewayData({ ...gatewayData, stripeAccountId: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="acct_..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Publishable Key</label>
                    <input
                      type="text"
                      value={gatewayData.stripePublishableKey}
                      onChange={(e) => setGatewayData({ ...gatewayData, stripePublishableKey: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="pk_..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Secret Key</label>
                    <input
                      type="password"
                      value={gatewayData.stripeSecretKey}
                      onChange={(e) => setGatewayData({ ...gatewayData, stripeSecretKey: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      placeholder="sk_..."
                    />
                  </div>
                </>
              )}

              {gatewayData.provider === 'paypal' && (
                <>
                  <div>
                    <label className="block text-sm mb-2">Client ID</label>
                    <input
                      type="text"
                      value={gatewayData.paypalClientId}
                      onChange={(e) => setGatewayData({ ...gatewayData, paypalClientId: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Client Secret</label>
                    <input
                      type="password"
                      value={gatewayData.paypalClientSecret}
                      onChange={(e) => setGatewayData({ ...gatewayData, paypalClientSecret: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    />
                  </div>
                </>
              )}

              {gatewayData.provider === 'square' && (
                <>
                  <div>
                    <label className="block text-sm mb-2">Access Token</label>
                    <input
                      type="password"
                      value={gatewayData.squareAccessToken}
                      onChange={(e) => setGatewayData({ ...gatewayData, squareAccessToken: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Location ID</label>
                    <input
                      type="text"
                      value={gatewayData.squareLocationId}
                      onChange={(e) => setGatewayData({ ...gatewayData, squareLocationId: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 rounded-lg"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg">
                <input
                  type="checkbox"
                  checked={gatewayData.isLive}
                  onChange={(e) => setGatewayData({ ...gatewayData, isLive: e.target.checked })}
                  className="rounded"
                />
                <div>
                  <p className="font-medium">Live Mode</p>
                  <p className="text-sm text-gray-400">Enable to process real payments</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleTestGateway}
                  disabled={testingGateway}
                  className="px-6 py-2 bg-yellow-600 rounded-lg disabled:opacity-50"
                >
                  {testingGateway ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={handleSaveGateway}
                  disabled={savingGateway}
                  className="px-6 py-2 bg-purple-600 rounded-lg disabled:opacity-50"
                >
                  {savingGateway ? 'Saving...' : 'Save Gateway'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Events ({events.length})</h3>
              <button
                onClick={() => router.push('/admin/events/new')}
                className="px-4 py-2 bg-purple-600 rounded-lg"
              >
                + Create Event
              </button>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-12 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
                <p className="text-gray-400 mb-4">No events yet</p>
                <button
                  onClick={() => router.push('/admin/events/new')}
                  className="px-6 py-2 bg-purple-600 rounded-lg"
                >
                  Create First Event
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {events.map(event => (
                  <div key={event.id} className="bg-black/40 backdrop-blur-xl rounded-xl p-4 border border-white/10 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold">{event.name}</h4>
                      <p className="text-sm text-gray-400">
                        {event.venueName || event.venue} • {
                          event.schedule?.date ?
                            new Date(event.schedule.date.toDate ? event.schedule.date.toDate() : event.schedule.date).toLocaleDateString() :
                            'Date TBD'
                        }
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/admin/events/edit/${event.id}`)}
                        className="px-4 py-2 bg-purple-600 rounded-lg text-sm"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Commissions Tab */}
        {activeTab === 'commissions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Commission Report</h3>
              <div className="text-right">
                <p className="text-gray-400 text-sm">Total Commissions</p>
                <p className="text-2xl font-bold text-green-400">
                  ${commissions.reduce((sum, c) => sum + c.commissionAmount, 0).toLocaleString()}
                </p>
              </div>
            </div>

            {commissions.length === 0 ? (
              <div className="text-center py-12 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
                <p className="text-gray-400">No commission data yet</p>
              </div>
            ) : (
              <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-4 px-6 text-gray-400 font-medium">Event</th>
                      <th className="text-right py-4 px-4 text-gray-400 font-medium">Orders</th>
                      <th className="text-right py-4 px-4 text-gray-400 font-medium">Revenue</th>
                      <th className="text-right py-4 px-4 text-gray-400 font-medium">Rate</th>
                      <th className="text-right py-4 px-4 text-gray-400 font-medium">Commission</th>
                      <th className="text-right py-4 px-6 text-gray-400 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map(comm => (
                      <tr key={comm.id} className="border-b border-white/5">
                        <td className="py-4 px-6 font-medium">{comm.eventName}</td>
                        <td className="py-4 px-4 text-right">{comm.orderCount}</td>
                        <td className="py-4 px-4 text-right">${comm.grossRevenue.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right">{comm.commissionRate}%</td>
                        <td className="py-4 px-4 text-right text-green-400 font-medium">
                          ${comm.commissionAmount.toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className={`px-2 py-1 rounded text-xs ${
                            comm.status === 'paid' ? 'bg-green-600/20 text-green-400' :
                            comm.status === 'processing' ? 'bg-yellow-600/20 text-yellow-400' :
                            'bg-gray-600/20 text-gray-400'
                          }`}>
                            {comm.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">User Management ({users.length})</h3>
              <button
                onClick={() => setShowAddUser(true)}
                className="px-4 py-2 bg-purple-600 rounded-lg"
              >
                + Add User
              </button>
            </div>

            {users.length === 0 ? (
              <div className="text-center py-12 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
                <p className="text-gray-400 mb-4">No users assigned</p>
                <button
                  onClick={() => setShowAddUser(true)}
                  className="px-6 py-2 bg-purple-600 rounded-lg"
                >
                  Add First User
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map(user => (
                  <div key={user.id} className="bg-black/40 backdrop-blur-xl rounded-xl p-4 border border-white/10 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveUser(user.id)}
                      className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add User Modal */}
            {showAddUser && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
                  <h3 className="text-xl font-bold mb-4">Add New User</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm mb-2">Name</label>
                      <input
                        type="text"
                        value={newUserData.name}
                        onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Email</label>
                      <input
                        type="email"
                        value={newUserData.email}
                        onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Password</label>
                      <input
                        type="password"
                        value={newUserData.password}
                        onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowAddUser(false)}
                        className="flex-1 px-4 py-2 bg-gray-700 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddUser}
                        disabled={addingUser}
                        className="flex-1 px-4 py-2 bg-purple-600 rounded-lg disabled:opacity-50"
                      >
                        {addingUser ? 'Creating...' : 'Create User'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Documents ({documents.length})</h3>
              <label className="px-4 py-2 bg-purple-600 rounded-lg cursor-pointer">
                {uploadingDoc ? 'Uploading...' : '+ Upload Document'}
                <input
                  type="file"
                  onChange={handleDocumentUpload}
                  className="hidden"
                  disabled={uploadingDoc}
                />
              </label>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-12 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
                <p className="text-gray-400 mb-4">No documents uploaded</p>
                <label className="px-6 py-2 bg-purple-600 rounded-lg cursor-pointer">
                  Upload First Document
                  <input
                    type="file"
                    onChange={handleDocumentUpload}
                    className="hidden"
                    disabled={uploadingDoc}
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map(doc => (
                  <div key={doc.id} className="bg-black/40 backdrop-blur-xl rounded-xl p-4 border border-white/10 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                        📄
                      </div>
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-gray-400">
                          {(doc.size / 1024).toFixed(1)} KB • {
                            doc.uploadedAt?.toDate?.()?.toLocaleDateString() || 'Recently'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-sm"
                      >
                        View
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
