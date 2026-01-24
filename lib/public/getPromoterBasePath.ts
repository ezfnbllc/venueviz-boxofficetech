/**
 * Get the base path for promoter URLs
 *
 * On custom domains (e.g., myticketplatform.com):
 *   Returns "" - links should be /events, /about, etc.
 *
 * On platform domain (e.g., venueviz.com/p/bot):
 *   Returns "/p/bot" - links should be /p/bot/events, etc.
 */

import { headers } from 'next/headers'

export async function getPromoterBasePath(promoterSlug: string): Promise<string> {
  try {
    const headersList = await headers()
    const isCustomDomain = headersList.get('x-custom-domain') === 'true'

    if (isCustomDomain) {
      // On custom domain, no prefix needed
      return ''
    }
  } catch {
    // headers() might fail in some contexts, fall back to default
  }

  // Default: use /p/[slug] prefix
  return `/p/${promoterSlug}`
}

/**
 * Build a promoter URL with the correct base path
 */
export async function buildPromoterUrl(promoterSlug: string, path: string = ''): Promise<string> {
  const basePath = await getPromoterBasePath(promoterSlug)
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (basePath === '' && normalizedPath === '/') {
    return '/'
  }

  return `${basePath}${normalizedPath === '/' ? '' : normalizedPath}`
}
