import { NextRequest, NextResponse } from 'next/server'

// Hardcoded domain mappings (fallback when API is unavailable)
// Format: domain (without protocol/www) -> promoter slug
const HARDCODED_DOMAIN_MAPPINGS: Record<string, string> = {
  'myticketplatform.com': 'bot',
}

// In-memory cache for domain mappings (refreshed periodically)
let domainCache: Record<string, string> = { ...HARDCODED_DOMAIN_MAPPINGS }
let lastCacheUpdate = 0
const CACHE_TTL = 60 * 1000 // 60 seconds

// Known platform domains that should NOT be treated as custom domains
const PLATFORM_DOMAINS = [
  'vercel.app',
  'venueviz.com',
  'localhost',
  '127.0.0.1',
]

function isPlatformDomain(hostname: string): boolean {
  return PLATFORM_DOMAINS.some(domain => hostname.includes(domain))
}

function getDomainSlug(hostname: string): string | null {
  // Normalize hostname
  const normalizedHost = hostname
    .toLowerCase()
    .replace(/:\d+$/, '') // Remove port
    .replace(/^www\./, '')

  // Check hardcoded mappings first (always available)
  if (HARDCODED_DOMAIN_MAPPINGS[normalizedHost]) {
    return HARDCODED_DOMAIN_MAPPINGS[normalizedHost]
  }

  // Check cache
  return domainCache[normalizedHost] || null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Don't process API routes, static files, or admin routes in middleware
  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Check for venueviz.com subdomain routing (existing behavior)
  const isPromoterSubdomain =
    hostname.includes('.venueviz.com') &&
    !hostname.startsWith('www.') &&
    !hostname.startsWith('admin.') &&
    !hostname.includes('vercel.app')

  if (isPromoterSubdomain) {
    const subdomain = hostname.split('.')[0]
    const url = request.nextUrl.clone()
    url.pathname = `/p/${subdomain}${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url)
  }

  // Check for custom domain routing (new behavior)
  if (!isPlatformDomain(hostname)) {
    const slug = getDomainSlug(hostname)

    if (slug) {
      const url = request.nextUrl.clone()

      // Don't double-rewrite if already on /p/[slug] path
      if (pathname.startsWith(`/p/${slug}`)) {
        return NextResponse.next()
      }

      // Rewrite root and other paths to /p/[slug]/[path]
      // e.g., myticketplatform.com/events -> /p/bot/events
      // e.g., myticketplatform.com/ -> /p/bot
      if (pathname === '/') {
        url.pathname = `/p/${slug}`
      } else {
        url.pathname = `/p/${slug}${pathname}`
      }

      // Set headers to indicate custom domain routing
      // This allows pages to generate correct URLs (without /p/[slug] prefix)
      const response = NextResponse.rewrite(url)
      response.headers.set('x-custom-domain', 'true')
      response.headers.set('x-promoter-slug', slug)
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
}
