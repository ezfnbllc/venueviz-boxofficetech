import { NextRequest, NextResponse } from 'next/server'

// Hardcoded domain mappings (fallback when API is unavailable)
// These are loaded automatically from Firestore, but kept as emergency fallback
const HARDCODED_DOMAIN_MAPPINGS: Record<string, string> = {
  'myticketplatform.com': 'bot',
}

// In-memory cache for domain mappings (refreshed periodically)
let domainCache: Record<string, string> = { ...HARDCODED_DOMAIN_MAPPINGS }
let lastCacheUpdate = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

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

async function refreshDomainCache(vercelHost: string): Promise<void> {
  const now = Date.now()
  if (now - lastCacheUpdate < CACHE_TTL) return

  try {
    // Use the Vercel host (not custom domain) to avoid loops
    const url = `https://${vercelHost}/api/domains`
    console.log('[Middleware] Refreshing domain cache from:', url)

    const response = await fetch(url, {
      headers: { 'x-middleware-request': '1' },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (response.ok) {
      const mappings = await response.json()
      domainCache = { ...HARDCODED_DOMAIN_MAPPINGS, ...mappings }
      lastCacheUpdate = now
      console.log('[Middleware] Domain cache refreshed:', Object.keys(domainCache))
    }
  } catch (error) {
    console.error('[Middleware] Failed to refresh domain cache:', error)
    // Keep using existing cache
  }
}

function getDomainSlug(hostname: string): string | null {
  // Normalize hostname
  const normalizedHost = hostname
    .toLowerCase()
    .replace(/:\d+$/, '') // Remove port
    .replace(/^www\./, '')

  // Check cache (includes both hardcoded and dynamic mappings)
  return domainCache[normalizedHost] || null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Use x-forwarded-host (original host from custom domain) if available,
  // otherwise fall back to host header
  const xForwardedHost = request.headers.get('x-forwarded-host')
  const hostHeader = request.headers.get('host') || ''
  const hostname = xForwardedHost || hostHeader

  // Debug logging
  console.log('[Middleware] =====================')
  console.log('[Middleware] Request:', {
    xForwardedHost,
    hostHeader,
    hostname,
    pathname,
    url: request.url,
  })

  // Don't process API routes, static files, or admin routes in middleware
  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
    console.log('[Middleware] Skipping - admin/api route')
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
    console.log('[Middleware] Subdomain routing:', subdomain, '->', url.pathname)
    return NextResponse.rewrite(url)
  }

  // Check for custom domain routing (new behavior)
  const isPlatform = isPlatformDomain(hostname)
  console.log('[Middleware] isPlatformDomain:', isPlatform, 'hostname:', hostname)

  if (!isPlatform) {
    // Try to refresh domain cache using Vercel host (not custom domain to avoid loops)
    if (hostHeader && hostHeader.includes('vercel.app')) {
      await refreshDomainCache(hostHeader)
    }

    const slug = getDomainSlug(hostname)
    console.log('[Middleware] Custom domain check - slug:', slug)

    if (slug) {
      const url = request.nextUrl.clone()

      // Don't double-rewrite if already on /p/[slug] path
      if (pathname.startsWith(`/p/${slug}`)) {
        console.log('[Middleware] Already on /p/slug path, skipping')
        return NextResponse.next()
      }

      // Rewrite root and other paths to /p/[slug]/[path]
      if (pathname === '/') {
        url.pathname = `/p/${slug}`
      } else {
        url.pathname = `/p/${slug}${pathname}`
      }

      console.log('[Middleware] REWRITING to:', url.pathname)

      const response = NextResponse.rewrite(url)
      response.headers.set('x-custom-domain', 'true')
      response.headers.set('x-promoter-slug', slug)
      response.headers.set('x-debug-original-host', hostname)
      return response
    } else {
      console.log('[Middleware] No slug mapping found for:', hostname)
    }
  }

  console.log('[Middleware] No routing applied, passing through')
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
}
