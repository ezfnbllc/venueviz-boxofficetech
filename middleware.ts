import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // ADMIN PROTECTION
  if (pathname.startsWith('/admin')) {
    const authCookie = request.cookies.get('admin-auth')
    
    if (!authCookie && pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    return NextResponse.next()
  }

  // WHITE LABEL ROUTING
  const isPromoterDomain = 
    hostname.includes('.venueviz.com') && 
    !hostname.startsWith('www.') &&
    !hostname.startsWith('admin.')

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
    '/admin/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
}
