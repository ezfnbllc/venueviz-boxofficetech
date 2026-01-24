/**
 * Debug endpoint for custom domain routing
 * Visit this URL to see what the middleware sees
 */

import { NextRequest, NextResponse } from 'next/server'

// Same mappings as middleware
const HARDCODED_DOMAIN_MAPPINGS: Record<string, string> = {
  'myticketplatform.com': 'bot',
}

const PLATFORM_DOMAINS = [
  'vercel.app',
  'venueviz.com',
  'localhost',
  '127.0.0.1',
]

export async function GET(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const xForwardedHost = request.headers.get('x-forwarded-host') || ''
  const xCustomDomain = request.headers.get('x-custom-domain') || ''
  const xPromoterSlug = request.headers.get('x-promoter-slug') || ''

  const normalizedHost = hostname
    .toLowerCase()
    .replace(/:\d+$/, '')
    .replace(/^www\./', '')

  const isPlatform = PLATFORM_DOMAINS.some(domain => hostname.includes(domain))
  const mappedSlug = HARDCODED_DOMAIN_MAPPINGS[normalizedHost] || null

  const debugInfo = {
    timestamp: new Date().toISOString(),
    request: {
      hostname,
      xForwardedHost,
      normalizedHost,
      url: request.url,
      pathname: request.nextUrl.pathname,
    },
    detection: {
      isPlatformDomain: isPlatform,
      isCustomDomain: !isPlatform,
      matchedInHardcodedMappings: !!HARDCODED_DOMAIN_MAPPINGS[normalizedHost],
      mappedSlug,
    },
    middlewareHeaders: {
      xCustomDomain: xCustomDomain || '(not set)',
      xPromoterSlug: xPromoterSlug || '(not set)',
    },
    config: {
      hardcodedMappings: HARDCODED_DOMAIN_MAPPINGS,
      platformDomains: PLATFORM_DOMAINS,
    },
    conclusion: isPlatform
      ? 'This is a platform domain - no custom routing applied'
      : mappedSlug
        ? `Custom domain detected! Should route to /p/${mappedSlug}`
        : 'Custom domain but NO MAPPING FOUND - will not route',
  }

  return NextResponse.json(debugInfo, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
