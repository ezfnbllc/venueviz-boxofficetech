'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, userData, loading, signOut, isAdmin } = useFirebaseAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedPromoter, setSelectedPromoter] = useState<string>('all')
  const [promoters, setPromoters] = useState<any[]>([])
  const [showPromoterDropdown, setShowPromoterDropdown] = useState(false)

  // Load promoters for dropdown
  useEffect(() => {
    const loadPromoters = async () => {
      try {
        const response = await fetch('/api/promoters')
        const data = await response.json()
        if (data.success) {
          setPromoters(data.data || [])
        }
      } catch (error) {
        console.error('Error loading promoters:', error)
      }
    }
    
    if (user) {
      loadPromoters()
    }
  }, [user])

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      console.log('No user detected, redirecting to login')
      router.push('/login')
    }
  }, [user, loading, pathname, router])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // If not logged in, show nothing (redirect will happen)
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: '📊' },
    { label: 'Events', href: '/admin/events', icon: '🎫' },
    { label: 'Venues', href: '/admin/venues', icon: '🏟️' },
    { label: 'Orders', href: '/admin/orders', icon: '🛒' },
    { label: 'Customers', href: '/admin/customers', icon: '👥' },
    { label: 'Promoters', href: '/admin/promoters', icon: '🎭' },
    { label: 'Promotions', href: '/admin/promotions', icon: '🎁' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/admin" className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              VenueViz Admin
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    pathname === item.href
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* User Menu with Promoter Dropdown */}
            <div className="flex items-center gap-4">
              {/* Promoter Selector Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowPromoterDropdown(!showPromoterDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/10"
                >
                  <span className="text-sm">
                    {selectedPromoter === 'all' 
                      ? '🌐 All Promoters' 
                      : promoters.find(p => p.id === selectedPromoter)?.name || 'Select Promoter'}
                  </span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showPromoterDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-white/10 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setSelectedPromoter('all')
                          setShowPromoterDropdown(false)
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                          selectedPromoter === 'all'
                            ? 'bg-purple-600 text-white'
                            : 'hover:bg-white/10'
                        }`}
                      >
                        🌐 All Promoters
                      </button>
                      
                      {promoters.length > 0 && (
                        <>
                          <div className="border-t border-white/10 my-2"></div>
                          {promoters.map((promoter) => (
                            <button
                              key={promoter.id}
                              onClick={() => {
                                setSelectedPromoter(promoter.id)
                                setShowPromoterDropdown(false)
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
                                selectedPromoter === promoter.id
                                  ? 'bg-purple-600 text-white'
                                  : 'hover:bg-white/10'
                              }`}
                            >
                              {promoter.logo ? (
                                <img src={promoter.logo} alt="" className="w-6 h-6 rounded" />
                              ) : (
                                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded flex items-center justify-center text-xs">
                                  {promoter.name?.charAt(0) || '?'}
                                </div>
                              )}
                              <span className="flex-1 truncate">{promoter.name}</span>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <span className="text-sm text-gray-400 hidden md:block">
                {user.email}
              </span>
              
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-all"
              >
                Sign Out
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                ☰
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-gray-900">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    pathname === item.href
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="bg-gray-950 min-h-[calc(100vh-64px)]">
        {children}
      </main>

      {/* Click outside to close dropdown */}
      {showPromoterDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowPromoterDropdown(false)}
        />
      )}
    </div>
  )
}
