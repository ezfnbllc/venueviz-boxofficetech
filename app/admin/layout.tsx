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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-black text-white">
      {/* Header */}
      <header className="bg-black/40 border-b border-purple-500/30 sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left - Logo & Nav */}
            <div className="flex items-center gap-8">
              <Link href="/admin" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🏢</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    VenueViz
                  </h1>
                  <p className="text-xs text-gray-400">Admin</p>
                </div>
              </Link>
              
              {/* Navigation */}
              <nav className="hidden lg:flex items-center gap-2">
                {navItems.map(item => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                          : 'text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Right - Filter & User */}
            <div className="flex items-center gap-3">
              {/* Promoter Filter */}
              <PromoterFilterDropdown
                isMasterAdmin={isAdmin}
                currentPromoterId={currentPromoterId}
              />

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center hover:scale-105 transition-transform"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-800">
                      <p className="text-sm font-medium text-white truncate">{user.email}</p>
                      {isAdmin && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-purple-600/30 text-purple-400 text-xs rounded-full">
                          Master Admin
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => signOut()}
                      className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-purple-500/30 bg-black/60 backdrop-blur-sm">
            <div className="px-4 py-3 space-y-1">
              {navItems.map(item => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
