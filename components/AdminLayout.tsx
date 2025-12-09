'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: '📊' },
    { label: 'Events', href: '/admin/events', icon: '🎭' },
    { label: 'Venues', href: '/admin/venues', icon: '🏛️' },
    { label: 'Orders', href: '/admin/orders', icon: '🎫' },
    { label: 'Customers', href: '/admin/customers', icon: '👥' },
    { label: 'Promotions', href: '/admin/promotions', icon: '🎟️' },
    { label: 'Promoters', href: '/admin/promoters', icon: '🤝' }
  ]
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
      } else {
        router.push('/login')
      }
    })
    
    return () => unsubscribe()
  }, [router])
  
  const handleSignOut = async () => {
    await auth.signOut()
    router.push('/login')
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header Navigation */}
      <header className="bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <img
                src="https://firebasestorage.googleapis.com/v0/b/venueviz.firebasestorage.app/o/BOLogo.png?alt=media"
                alt="BoxOfficeTech"
                className="h-10 w-auto mr-4 rounded-lg"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                BoxOfficeTech Admin
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-4">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    pathname === item.href
                      ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
            
            {/* User Menu */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400 hidden md:block">
                {user?.email}
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
          <div className="md:hidden border-t border-white/10">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href)
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    pathname === item.href
                      ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>
      
      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  )
}
