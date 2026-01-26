/**
 * FAQ Page (CMS-Driven)
 *
 * This page renders content from the CMS `tenantPages` collection.
 * Content is managed through the admin page builder.
 *
 * The page fetches sections from the database and renders them
 * using the SectionRenderer component.
 *
 * See: components/public/SectionRenderer.tsx for section rendering logic
 * See: lib/services/systemPageSeederService.ts for default sections
 */

import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getPromoterBySlug, getCMSPage } from '@/lib/public/publicService'
import { Layout } from '@/components/public/Layout'
import { SectionRenderer } from '@/components/public/SectionRenderer'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const promoter = await getPromoterBySlug(slug)

  if (!promoter) {
    return { title: 'Not Found' }
  }

  // Try to get SEO from CMS page
  const cmsPage = await getCMSPage(promoter.id, 'faq')

  return {
    title: cmsPage?.seo?.title || `FAQ | ${promoter.name}`,
    description: cmsPage?.seo?.description || `Frequently asked questions about ${promoter.name}`,
    keywords: cmsPage?.seo?.keywords,
    openGraph: cmsPage?.seo?.ogImage ? {
      images: [cmsPage.seo.ogImage],
    } : undefined,
  }
}

export default async function FAQPage({ params }: PageProps) {
  const { slug } = await params
  const promoter = await getPromoterBySlug(slug)

  if (!promoter) {
    notFound()
  }

  // Fetch CMS page content
  const cmsPage = await getCMSPage(promoter.id, 'faq')

  return (
    <Layout
      promoterSlug={slug}
      header={{
        logo: promoter.logo,
        logoText: promoter.name,
        navItems: [
          { label: 'Home', href: `/p/${slug}` },
          { label: 'Events', href: `/p/${slug}/events` },
          { label: 'About', href: `/p/${slug}/about` },
          { label: 'Contact', href: `/p/${slug}/contact` },
        ],
      }}
      footer={{
        logoText: promoter.name,
        description: promoter.description,
      }}
    >
      {/* Render CMS sections */}
      <SectionRenderer
        sections={cmsPage?.sections || []}
        promoterSlug={slug}
      />
    </Layout>
  )
}
