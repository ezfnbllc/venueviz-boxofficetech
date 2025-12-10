'use client'

import { useFirebaseAuth } from '@/lib/firebase-auth'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import PromoterFilterDropdown from '@/components/admin/PromoterFilterDropdown'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, userData, loading, isAdmin, signOut } = useFirebaseAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [currentPromoterId, setCurrentPromoterId] = useState<string>()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && !isAdmin && userData?.role === 'promoter') {
      setCurrentPromoterId(userData?.promoterId)
    }
  }, [user, isAdmin, userData])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-black to-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/events', label: 'Events', icon: '🎫' },
    { href: '/admin/venues', label: 'Venues', icon: '🏟️' },
    { href: '/admin/orders', label: 'Orders', icon: '🛒' },
    { href: '/admin/customers', label: 'Customers', icon: '👥' },
    { href: '/admin/promotions', label: 'Promotions', icon: '🎁' },
    { href: '/admin/promoters', label: 'Promoters', icon: '🤝' },
    { href: '/analytics', label: 'Analytics', icon: '📈' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 text-white flex">
      {/* Left Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-black/60 backdrop-blur-xl border-r border-purple-500/20 flex flex-col transition-all duration-300 fixed h-full z-50`}>
        {/* Logo */}
        <div className="p-4 border-b border-purple-500/20">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🎭</span>
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  VenueViz
                </h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Box Office</p>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Toggle */}
        <div className="p-4 border-t border-purple-500/20">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            {sidebarCollapsed ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
                <span className="text-sm">Collapse</span>
              </>
            )}
          </button>
        </div>

        {/* User Section in Sidebar */}
        <div className="p-4 border-t border-purple-500/20">
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.email?.split('@')[0]}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {isAdmin ? 'Master Admin' : 'Promoter'}
                  </p>
                </div>
              )}
            </button>

            {/* User Dropdown */}
            {userMenuOpen && (
              <div className={`absolute ${sidebarCollapsed ? 'left-full ml-2' : 'left-0'} bottom-full mb-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden`}>
                <div className="p-4 border-b border-gray-800">
                  <p className="text-sm font-medium text-white truncate">{user.email}</p>
                  {isAdmin && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-purple-600/30 text-purple-400 text-xs rounded-full">
                      Master Admin
                    </span>
                  )}
                </div>
                <Link
                  href="/"
                  className="block px-4 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                >
                  🏠 View Public Site
                </Link>
                <button
                  onClick={() => signOut()}
                  className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 ${sidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300`}>
        {/* Top Header */}
        <header className="bg-black/40 border-b border-purple-500/20 sticky top-0 z-40 backdrop-blur-xl">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Page Title - will be set by individual pages */}
              <div className="flex items-center gap-4">
                {/* Breadcrumb or search could go here */}
              </div>

              {/* Right - Filter & Quick Actions */}
              <div className="flex items-center gap-4">
                {/* Promoter Filter */}
                <PromoterFilterDropdown
                  isMasterAdmin={isAdmin}
                  currentPromoterId={currentPromoterId}
                />

                {/* Quick Action Button */}
                <Link
                  href="/admin/events/new"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-sm font-medium transition-all shadow-lg shadow-purple-500/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Event
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
