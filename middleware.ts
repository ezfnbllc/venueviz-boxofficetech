import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Allow all requests to pass through
  // Firebase Auth handles authentication
  return NextResponse.next()
}

export const config = {
  matcher: []
}
