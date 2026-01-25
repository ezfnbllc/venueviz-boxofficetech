/**
 * Checkout Page Layout
 * Provides noindex metadata - checkout pages should not be indexed
 */

import { Metadata } from 'next'
import { getPromoterBySlug } from '@/lib/public/publicService'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { slug } = await params
  const promoter = await getPromoterBySlug(slug)

  return {
    title: `Checkout | ${promoter?.name || 'Complete Your Order'}`,
    description: 'Complete your ticket purchase securely.',
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
    },
  }
}

export default function CheckoutLayout({ children }: LayoutProps) {
  return children
}
