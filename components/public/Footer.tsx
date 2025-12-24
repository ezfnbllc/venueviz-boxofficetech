/**
 * Footer Component
 * Based on Barren theme .footer styles
 *
 * Public site footer with links, social, newsletter
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

export interface FooterLink {
  label: string
  href: string
}

export interface FooterSection {
  title: string
  links: FooterLink[]
}

export interface SocialLink {
  platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'youtube'
  href: string
}

export interface FooterProps {
  logo?: string
  siteName?: string
  description?: string
  sections?: FooterSection[]
  socialLinks?: SocialLink[]
  promoterSlug?: string
  showNewsletter?: boolean
  copyright?: string
  className?: string
}

const socialIcons = {
  facebook: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.77,7.46H14.5v-1.9c0-.9.6-1.1,1-1.1h3V.5L14.17.5C10.24.5,9.5,3.44,9.5,5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4Z" />
    </svg>
  ),
  twitter: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.44,4.83c-.8.37-1.5.38-2.22.02.93-.56.98-.96,1.32-2.02-.88.52-1.86.9-2.9,1.1-.82-.88-2-1.43-3.3-1.43-2.5,0-4.55,2.04-4.55,4.54,0,.36.03.7.1,1.04-3.77-.2-7.12-2-9.36-4.75-.4.67-.6,1.45-.6,2.3,0,1.56.8,2.95,2,3.77-.74-.03-1.44-.23-2.05-.57v.06c0,2.2,1.56,4.03,3.64,4.44-.67.2-1.37.2-2.06.08.58,1.8,2.26,3.12,4.25,3.16C5.78,18.1,3.37,18.74,1,18.46c2,1.3,4.4,2.04,6.97,2.04,8.35,0,12.92-6.92,12.92-12.93,0-.2,0-.4-.02-.6.9-.63,1.96-1.22,2.56-2.14Z" />
    </svg>
  ),
  instagram: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12,2.16c3.2,0,3.58.01,4.85.07,3.25.15,4.77,1.69,4.92,4.92.06,1.27.07,1.65.07,4.85s-.01,3.58-.07,4.85c-.15,3.23-1.66,4.77-4.92,4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.64-.07-4.85s.01-3.58.07-4.85C2.38,3.92,3.9,2.38,7.15,2.23,8.42,2.17,8.8,2.16,12,2.16ZM12,0C8.74,0,8.33.01,7.05.07c-4.27.2-6.78,2.71-6.98,6.98C.01,8.33,0,8.74,0,12s.01,3.67.07,4.95c.2,4.27,2.71,6.78,6.98,6.98,1.28.06,1.69.07,4.95.07s3.67-.01,4.95-.07c4.27-.2,6.78-2.71,6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.27-2.71-6.78-6.98-6.98C15.67.01,15.26,0,12,0Zm0,5.84A6.16,6.16,0,1,0,18.16,12,6.16,6.16,0,0,0,12,5.84ZM12,16a4,4,0,1,1,4-4A4,4,0,0,1,12,16ZM18.41,4.15a1.44,1.44,0,1,0,1.44,1.44A1.44,1.44,0,0,0,18.41,4.15Z" />
    </svg>
  ),
  linkedin: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.45,20.45H16.89V14.88c0-1.33-.02-3.04-1.85-3.04-1.85,0-2.14,1.45-2.14,2.94v5.67H9.34V9h3.41v1.56h.05a3.75,3.75,0,0,1,3.37-1.85c3.6,0,4.27,2.37,4.27,5.46v6.28ZM5.34,7.43A2.07,2.07,0,1,1,7.41,5.36,2.07,2.07,0,0,1,5.34,7.43Zm1.78,13H3.56V9H7.12ZM22.23,0H1.77A1.75,1.75,0,0,0,0,1.73V22.27A1.75,1.75,0,0,0,1.77,24H22.23A1.76,1.76,0,0,0,24,22.27V1.73A1.76,1.76,0,0,0,22.23,0Z" />
    </svg>
  ),
  youtube: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.5,6.19a3.02,3.02,0,0,0-2.12-2.14C19.5,3.5,12,3.5,12,3.5s-7.5,0-9.38.55A3.02,3.02,0,0,0,.5,6.19,31.66,31.66,0,0,0,0,12a31.66,31.66,0,0,0,.5,5.81,3.02,3.02,0,0,0,2.12,2.14C4.5,20.5,12,20.5,12,20.5s7.5,0,9.38-.55a3.02,3.02,0,0,0,2.12-2.14A31.66,31.66,0,0,0,24,12,31.66,31.66,0,0,0,23.5,6.19ZM9.55,15.57V8.43L15.82,12Z" />
    </svg>
  ),
}

export function Footer({
  logo: propLogo,
  siteName = 'BoxOfficeTech',
  description: propDescription,
  sections,
  socialLinks,
  promoterSlug,
  showNewsletter = false,
  copyright,
  className,
}: FooterProps) {
  const baseUrl = promoterSlug ? `/p/${promoterSlug}` : ''
  const currentYear = new Date().getFullYear()
  const [promoterData, setPromoterData] = useState<{ logo?: string; name?: string; description?: string } | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Track when component is mounted to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

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
              description: data.data.description,
            })
          }
        })
        .catch(err => console.error('Failed to fetch promoter:', err))
    }
  }, [promoterSlug, propLogo])

  // Use prop values first, then fetched promoter data (only after mount), then defaults
  const logo = propLogo || (isMounted && promoterData?.logo)
  const displayName = siteName !== 'BoxOfficeTech' ? siteName : (isMounted && promoterData?.name) || siteName
  const description = propDescription || (isMounted && promoterData?.description) || 'Your trusted platform for event ticketing and management.'

  const defaultSections: FooterSection[] = [
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: `${baseUrl}/about` },
        { label: 'Contact', href: `${baseUrl}/contact` },
        { label: 'FAQ', href: `${baseUrl}/faq` },
      ],
    },
    {
      title: 'Events',
      links: [
        { label: 'Browse Events', href: `${baseUrl}/events` },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Terms of Service', href: `${baseUrl}/terms` },
        { label: 'Privacy Policy', href: `${baseUrl}/privacy` },
      ],
    },
  ]

  const footerSections = sections || defaultSections

  return (
    <footer className={cn('bg-[#1d1d1d] text-white', className)}>
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href={`${baseUrl}/`} className="inline-block mb-4">
              {logo ? (
                // Use regular img for external URLs to avoid Next.js Image optimization issues
                <img
                  src={logo}
                  alt={displayName}
                  className="h-10 w-auto brightness-0 invert object-contain"
                />
              ) : (
                <span className="text-xl font-bold">{displayName}</span>
              )}
            </Link>
            <p className="text-[#a0a0a0] text-sm leading-relaxed mb-6 max-w-sm">
              {description}
            </p>

            {/* Social Links */}
            {socialLinks && socialLinks.length > 0 && (
              <div className="flex space-x-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.platform}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-[#2d2d2d] rounded-full flex items-center justify-center
                             text-[#a0a0a0] hover:bg-[#6ac045] hover:text-white transition-colors"
                  >
                    {socialIcons[social.platform]}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Link Sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-white font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[#a0a0a0] text-sm hover:text-[#6ac045] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        {showNewsletter && (
          <div className="mt-12 pt-8 border-t border-[#2d2d2d]">
            <div className="max-w-md">
              <h4 className="text-white font-semibold mb-2">Subscribe to our newsletter</h4>
              <p className="text-[#a0a0a0] text-sm mb-4">
                Get the latest events and updates delivered to your inbox.
              </p>
              <form className="flex">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2.5 bg-[#2d2d2d] text-white rounded-l-md
                           border-0 outline-none placeholder:text-[#717171]
                           focus:ring-2 focus:ring-[#6ac045]"
                />
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#6ac045] text-white font-medium rounded-r-md
                           hover:bg-[#7ad254] transition-colors"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-[#2d2d2d] text-center">
          <p className="text-[#a0a0a0] text-sm">
            {copyright || `© ${currentYear} ${displayName}. All rights reserved.`}
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
