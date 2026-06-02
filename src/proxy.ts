import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/signup']
const SESSION_COOKIE = 'gestro_session'

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value)

  const isPublic = PUBLIC_ROUTES.includes(pathname)
  const isProtected = pathname === '/dashboard' || pathname.startsWith('/projects')

  // Checagem OTIMISTA (só presença do cookie). A validação real é na DAL.
  if (isProtected && !hasSessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (isPublic && hasSessionCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
}
