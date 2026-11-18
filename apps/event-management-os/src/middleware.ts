import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session'

const PUBLIC = ['/login', '/share/', '/api/cron/', '/api/share/']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next()
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value)
  if (!session) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : ''
    return NextResponse.redirect(url)
  }
  // Client-portal accounts can never reach the back office.
  if (session.portal && !pathname.startsWith('/portal') && !pathname.startsWith('/api/documents') && !pathname.startsWith('/api/pdf')) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const url = req.nextUrl.clone()
    url.pathname = '/portal'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp)$).*)'],
}
