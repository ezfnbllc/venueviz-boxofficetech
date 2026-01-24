/**
 * Domain Resolution API
 * Returns mapping of custom domains to promoter slugs
 * Used by middleware for custom domain routing
 */

import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Cache domain mappings for 60 seconds
let cachedMappings: Record<string, string> | null = null
let cacheTimestamp = 0
const CACHE_TTL = 60 * 1000 // 60 seconds

async function getDomainMappings(): Promise<Record<string, string>> {
  const now = Date.now()

  // Return cached mappings if still valid
  if (cachedMappings && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedMappings
  }

  try {
    const db = getAdminDb()
    const snapshot = await db.collection('promoters')
      .where('active', '==', true)
      .get()

    const mappings: Record<string, string> = {}

    for (const doc of snapshot.docs) {
      const data = doc.data()
      if (data.website && data.slug) {
        // Normalize domain (remove protocol, www, trailing slashes)
        const domain = data.website
          .toLowerCase()
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/\/$/, '')

        mappings[domain] = data.slug

        // Also add www variant
        mappings[`www.${domain}`] = data.slug
      }
    }

    // Update cache
    cachedMappings = mappings
    cacheTimestamp = now

    return mappings
  } catch (error) {
    console.error('Error fetching domain mappings:', error)
    // Return cached mappings even if expired, rather than failing
    return cachedMappings || {}
  }
}

export async function GET() {
  try {
    const mappings = await getDomainMappings()

    return NextResponse.json(mappings, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('Error in domain resolution API:', error)
    return NextResponse.json({}, { status: 500 })
  }
}
