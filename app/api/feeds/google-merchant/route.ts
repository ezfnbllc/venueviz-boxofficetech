/**
 * Google Merchant Center Product Feed
 *
 * Generates an XML feed compatible with Google Merchant Center
 * for event ticket listings. This enables:
 * - Google Shopping listings
 * - Free product listings
 * - AI-powered shopping experiences
 *
 * GET /api/feeds/google-merchant
 * Query params:
 *   - promoterSlug: Filter by specific promoter (optional)
 *   - format: 'xml' (default) or 'json'
 *
 * The feed follows Google's Product Data Specification:
 * https://support.google.com/merchants/answer/7052112
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'

interface MerchantProduct {
  id: string
  title: string
  description: string
  link: string
  image_link: string
  availability: 'in_stock' | 'out_of_stock' | 'preorder'
  price: string
  sale_price?: string
  brand: string
  google_product_category: string
  product_type: string
  condition: 'new'
  // Event-specific fields
  event_id?: string
  event_date?: string
  event_time?: string
  event_venue?: string
  event_location?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const promoterSlug = searchParams.get('promoterSlug')
    const format = searchParams.get('format') || 'xml'

    const db = getAdminFirestore()
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://boxofficetech.com'
    const now = new Date()

    // Build query for published, upcoming events
    let eventsQuery = db.collection('events').where('status', '==', 'published')

    // Filter by promoter if specified
    let promoterId: string | null = null
    let promoterData: any = null

    if (promoterSlug) {
      const promoterSnapshot = await db.collection('promoters')
        .where('slug', '==', promoterSlug)
        .limit(1)
        .get()

      if (promoterSnapshot.empty) {
        return NextResponse.json({ error: 'Promoter not found' }, { status: 404 })
      }

      promoterId = promoterSnapshot.docs[0].id
      promoterData = promoterSnapshot.docs[0].data()
      eventsQuery = eventsQuery.where('promoterId', '==', promoterId)
    }

    const eventsSnapshot = await eventsQuery.limit(1000).get()

    // Cache promoter data
    const promoterCache: Record<string, any> = {}
    if (promoterData) {
      promoterCache[promoterId!] = promoterData
    }

    const products: MerchantProduct[] = []

    for (const doc of eventsSnapshot.docs) {
      const event = doc.data()

      // Skip past events
      const eventDate = event.startDate?.toDate?.() || event.startDate
      if (eventDate && new Date(eventDate) < now) {
        continue
      }

      // Get promoter
      if (!promoterCache[event.promoterId]) {
        const promoterDoc = await db.collection('promoters').doc(event.promoterId).get()
        promoterCache[event.promoterId] = promoterDoc.data()
      }
      const promoter = promoterCache[event.promoterId]
      const slug = promoter?.slug || 'events'

      // Format date and time
      const dateStr = eventDate
        ? new Date(eventDate).toISOString().split('T')[0]
        : ''
      const timeStr = event.startTime || ''

      // Build location string
      const locationParts = []
      if (event.venue?.streetAddress1) locationParts.push(event.venue.streetAddress1)
      if (event.venue?.city) locationParts.push(event.venue.city)
      if (event.venue?.state) locationParts.push(event.venue.state)
      if (event.venue?.zipCode) locationParts.push(event.venue.zipCode)
      const location = locationParts.join(', ')

      // Determine availability
      let availability: 'in_stock' | 'out_of_stock' | 'preorder' = 'in_stock'
      if (event.isSoldOut) {
        availability = 'out_of_stock'
      }

      // Price formatting (Google requires "price currency" format)
      const price = event.pricing?.minPrice || 0
      const currency = event.pricing?.currency?.toUpperCase() || 'USD'

      const product: MerchantProduct = {
        id: `event_${doc.id}`,
        title: event.name,
        description: sanitizeDescription(event.shortDescription || event.description || `Tickets for ${event.name}`),
        link: `${baseUrl}/p/${slug}/events/${event.slug || doc.id}`,
        image_link: event.bannerImage || event.thumbnail || `${baseUrl}/images/event-placeholder.png`,
        availability,
        price: `${price.toFixed(2)} ${currency}`,
        brand: promoter?.name || 'BoxOfficeTech',
        google_product_category: '5709', // Tickets & Events
        product_type: `Events > ${event.category || 'General'} > Tickets`,
        condition: 'new',
        event_id: doc.id,
        event_date: dateStr,
        event_time: timeStr,
        event_venue: event.venue?.name || '',
        event_location: location,
      }

      // Add sale price if there's a max price (price range)
      if (event.pricing?.maxPrice && event.pricing.maxPrice > price) {
        product.sale_price = `${price.toFixed(2)} ${currency}`
        product.price = `${event.pricing.maxPrice.toFixed(2)} ${currency}`
      }

      products.push(product)
    }

    if (format === 'json') {
      return NextResponse.json({
        products,
        totalCount: products.length,
        generatedAt: new Date().toISOString(),
      })
    }

    // Generate XML feed
    const xml = generateXMLFeed(products, baseUrl)

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error('Merchant feed error:', error)
    return NextResponse.json(
      { error: 'Failed to generate merchant feed' },
      { status: 500 }
    )
  }
}

function sanitizeDescription(text: string): string {
  // Remove HTML tags and limit length
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .substring(0, 5000)
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function generateXMLFeed(products: MerchantProduct[], baseUrl: string): string {
  const items = products.map(product => `
    <item>
      <g:id>${escapeXml(product.id)}</g:id>
      <g:title>${escapeXml(product.title)}</g:title>
      <g:description>${escapeXml(product.description)}</g:description>
      <g:link>${escapeXml(product.link)}</g:link>
      <g:image_link>${escapeXml(product.image_link)}</g:image_link>
      <g:availability>${product.availability}</g:availability>
      <g:price>${escapeXml(product.price)}</g:price>
      ${product.sale_price ? `<g:sale_price>${escapeXml(product.sale_price)}</g:sale_price>` : ''}
      <g:brand>${escapeXml(product.brand)}</g:brand>
      <g:google_product_category>${product.google_product_category}</g:google_product_category>
      <g:product_type>${escapeXml(product.product_type)}</g:product_type>
      <g:condition>${product.condition}</g:condition>
      ${product.event_date ? `<g:custom_label_0>${escapeXml(product.event_date)}</g:custom_label_0>` : ''}
      ${product.event_venue ? `<g:custom_label_1>${escapeXml(product.event_venue)}</g:custom_label_1>` : ''}
      ${product.event_location ? `<g:custom_label_2>${escapeXml(product.event_location)}</g:custom_label_2>` : ''}
    </item>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>BoxOfficeTech Event Tickets</title>
    <link>${baseUrl}</link>
    <description>Event tickets available for purchase</description>
    ${items}
  </channel>
</rss>`
}
