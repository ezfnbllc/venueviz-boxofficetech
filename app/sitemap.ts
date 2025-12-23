/**
 * Dynamic Sitemap Generator
 *
 * Generates sitemap.xml with all public pages and events
 */

import { MetadataRoute } from 'next'
import { getAdminFirestore } from '@/lib/firebase-admin'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://boxofficetech.com'
  const db = getAdminFirestore()

  const sitemapEntries: MetadataRoute.Sitemap = []

  try {
    // Get all promoters (tenants)
    const promotersSnapshot = await db.collection('promoters').get()

    for (const promoterDoc of promotersSnapshot.docs) {
      const promoter = promoterDoc.data()
      const slug = promoter.slug

      if (!slug) continue

      // Add promoter main pages
      const promoterPages = [
        { url: `${baseUrl}/p/${slug}`, priority: 1.0 },
        { url: `${baseUrl}/p/${slug}/events`, priority: 0.9 },
        { url: `${baseUrl}/p/${slug}/about`, priority: 0.6 },
        { url: `${baseUrl}/p/${slug}/contact`, priority: 0.6 },
        { url: `${baseUrl}/p/${slug}/faq`, priority: 0.5 },
        { url: `${baseUrl}/p/${slug}/terms`, priority: 0.3 },
        { url: `${baseUrl}/p/${slug}/privacy`, priority: 0.3 },
      ]

      for (const page of promoterPages) {
        sitemapEntries.push({
          url: page.url,
          lastModified: new Date(),
          changeFrequency: page.priority > 0.8 ? 'daily' : 'weekly',
          priority: page.priority,
        })
      }

      // Get promoter's events
      const eventsSnapshot = await db.collection('events')
        .where('promoterId', '==', promoterDoc.id)
        .where('status', '==', 'published')
        .get()

      for (const eventDoc of eventsSnapshot.docs) {
        const event = eventDoc.data()
        const eventSlug = event.slug || eventDoc.id
        const lastModified = event.updatedAt?.toDate?.() || event.createdAt?.toDate?.() || new Date()

        sitemapEntries.push({
          url: `${baseUrl}/p/${slug}/events/${eventSlug}`,
          lastModified,
          changeFrequency: 'daily',
          priority: 0.8,
        })
      }
    }
  } catch (error) {
    console.error('Error generating sitemap:', error)
  }

  // Add static root pages if they exist
  sitemapEntries.unshift({
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1.0,
  })

  return sitemapEntries
}
