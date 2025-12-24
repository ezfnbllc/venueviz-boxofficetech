/**
 * Header Component
 * Based on Barren theme .header and .navbar styles
 *
 * Public site header with navigation, logo, auth buttons
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export interface NavItem {
  label: string
  href: string
  children?: NavItem[]
}

export interface HeaderProps {
  logo?: string
  logoAlt?: string
  darkLogo?: string
  siteName?: string
  navItems?: NavItem[]
  promoterSlug?: string
  showAuth?: boolean
  isLoggedIn?: boolean
  userName?: string
  onSignIn?: () => void
  onSignOut?: () => void
  className?: string
}

export function Header({
  logo: propLogo,
  logoAlt = 'Logo',
  darkLogo,
  siteName = 'BoxOfficeTech',
  navItems = [],
  promoterSlug,
  showAuth = true,
  isLoggedIn = false,
  userName,
  onSignIn,
  onSignOut,
  className,
}: HeaderProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [promoterData, setPromoterData] = useState<{ logo?: string; name?: string } | null>(null)

  // Fetch promoter data if we have a slug but no logo prop
  useEffect(() => {
    if (promoterSlug && !propLogo) {
      fetch(`/api/promoters?slug=${promoterSlug}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setPromoterData({
              logo: data.data.logo,
              name: data.data.name,
            })
          }
        })
        .catch(err => console.error('Failed to fetch promoter:', err))
    }
  }, [promoterSlug, propLogo])

  // Use prop logo first, then fetched promoter logo, then default
  const logo = propLogo || promoterData?.logo || '/images/logo.svg'
  const displayName = siteName !== 'BoxOfficeTech' ? siteName : (promoterData?.name || siteName)

  const baseUrl = promoterSlug ? `/p/${promoterSlug}` : ''

  const defaultNavItems: NavItem[] = [
    { label: 'Home', href: `${baseUrl}/` },
    { label: 'Events', href: `${baseUrl}/events` },
    { label: 'About', href: `${baseUrl}/about` },
    { label: 'Contact', href: `${baseUrl}/contact` },
  ]

  const navigation = navItems.length > 0 ? navItems : defaultNavItems

  const isActive = (href: string) => {
    if (href === `${baseUrl}/` || href === '/') {
      return pathname === href || pathname === `${baseUrl}`
    }
    return pathname.startsWith(href)
  }

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'bg-white border-b border-[#efefef]',
        'shadow-[0px_2px_15px_-9px_rgba(0,0,0,0.05)]',
        className
      )}
    >
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-[70px]">
          {/* Logo */}
          <Link href={`${baseUrl}/`} className="flex items-center">
            {logo ? (
              <Image
                src={logo}
                alt={logoAlt}
                width={150}
                height={40}
                className="h-10 w-auto"
                priority
              />
            ) : (
              <span className="text-xl font-bold text-[#000]">{displayName}</span>
            )}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigation.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => item.children && setActiveDropdown(item.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  href={item.href}
                  className={cn(
                    'px-4 py-2 text-base font-medium rounded-md transition-colors',
                    isActive(item.href)
                      ? 'text-[#6ac045]'
                      : 'text-[#000] hover:text-[#6ac045]'
                  )}
                >
                  {item.label}
                  {item.children && (
                    <svg
                      className="w-4 h-4 ml-1 inline-block"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  )}
                </Link>

                {/* Dropdown Menu */}
                {item.children && activeDropdown === item.label && (
                  <div className="absolute top-full left-0 mt-1 py-2 bg-white border border-[#efefef] rounded-lg shadow-lg min-w-[200px]">
                    {item.children.map((child) => (
                      <Link
                        key={child.label}
                        href={child.href}
                        className="block px-4 py-2 text-sm text-[#717171] hover:text-[#6ac045] hover:bg-[#f9f9f9]"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right Side - Auth & Create Event */}
          <div className="hidden lg:flex items-center space-x-3">
            {showAuth && (
              <>
                {isLoggedIn ? (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-[#717171]">{userName}</span>
                    <Button variant="ghost" size="sm" onClick={onSignOut}>
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={onSignIn}>
                      Sign In
                    </Button>
                    <Link href={`${baseUrl}/register`}>
                      <Button variant="primary" size="sm">
                        Sign Up
                      </Button>
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-[#717171] hover:text-[#000]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-[#efefef]">
            <div className="flex flex-col space-y-2">
              {navigation.map((item) => (
                <div key={item.label}>
                  <Link
                    href={item.href}
                    className={cn(
                      'block px-4 py-2 text-base font-medium rounded-md',
                      isActive(item.href)
                        ? 'text-[#6ac045] bg-[#e8f7f7]'
                        : 'text-[#000] hover:bg-[#f9f9f9]'
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                  {item.children?.map((child) => (
                    <Link
                      key={child.label}
                      href={child.href}
                      className="block px-8 py-2 text-sm text-[#717171] hover:text-[#6ac045]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ))}

              {showAuth && (
                <div className="pt-4 mt-4 border-t border-[#efefef] px-4 space-y-2">
                  {isLoggedIn ? (
                    <Button variant="outline" className="w-full" onClick={onSignOut}>
                      Sign Out
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" className="w-full" onClick={onSignIn}>
                        Sign In
                      </Button>
                      <Link href={`${baseUrl}/register`} className="block">
                        <Button variant="primary" className="w-full">
                          Sign Up
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
