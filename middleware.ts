import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const isAdminPath = request.nextUrl.pathname.startsWith('/admin')
  const isAuthPath = request.nextUrl.pathname.startsWith('/auth')
  
  // Allow all requests for now (demo mode)
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}
