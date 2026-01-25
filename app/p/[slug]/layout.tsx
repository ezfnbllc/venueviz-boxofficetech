/**
 * Promoter Layout
 *
 * This layout wraps all pages under /p/[slug] and injects the promoter's
 * theme CSS. It runs on the server and provides:
 *
 * 1. Theme CSS injection via ThemeStyles component
 * 2. Metadata for SEO (can be extended)
 * 3. Common wrapper for all promoter pages
 */

import { ThemeStyles } from '@/components/public/ThemeStyles'

interface PromoterLayoutProps {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function PromoterLayout({
  children,
  params,
}: PromoterLayoutProps) {
  const { slug } = await params

  return (
    <>
      {/* Inject theme CSS variables for this promoter */}
      <ThemeStyles promoterSlug={slug} />

      {/* Render page content */}
      {children}
    </>
  )
}
