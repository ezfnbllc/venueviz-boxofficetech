import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // ==========================================
  // 1. ADMIN PROTECTION
  // ==========================================
  if (pathname.startsWith('/admin')) {
    // Check for auth cookie
    const authCookie = request.cookies.get('admin-auth')
    
    // If not authenticated and not on login page, redirect to login
    if (!authCookie && pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    return NextResponse.next()
  }

  // ==========================================
  // 2. WHITE LABEL SUBDOMAIN ROUTING
  // ==========================================
  // Check if this is a promoter subdomain
  const isPromoterDomain = 
    hostname.includes('.venueviz.com') && 
    !hostname.startsWith('www.') &&
    !hostname.startsWith('admin.') &&
    !hostname.includes('vercel.app')

  if (isPromoterDomain) {
    const subdomain = hostname.split('.')[0]
    
    // Rewrite to promoter route
    const url = request.nextUrl.clone()
    url.pathname = `/p/${subdomain}${pathname === '/' ? '' : pathname}`
    
    return NextResponse.rewrite(url)
  }

  // ==========================================
  // 3. DEFAULT: Continue to platform
  // ==========================================
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
}
