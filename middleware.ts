import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Don't block admin routes - let client-side auth handle it
  if (pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // White label subdomain routing
  const isPromoterDomain = 
    hostname.includes('.venueviz.com') && 
    !hostname.startsWith('www.') &&
    !hostname.startsWith('admin.') &&
    !hostname.includes('vercel.app')

  if (isPromoterDomain) {
    const subdomain = hostname.split('.')[0]
    const url = request.nextUrl.clone()
    url.pathname = `/p/${subdomain}${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
}
