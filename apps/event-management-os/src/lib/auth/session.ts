import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'emos_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export interface SessionPayload {
  uid: string
  org: string
  portal: boolean
}

function secret() {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < 32) throw new Error('AUTH_SECRET must be set (32+ characters).')
  return new TextEncoder().encode(s)
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret())
}

export async function verifySession(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    if (typeof payload.uid !== 'string' || typeof payload.org !== 'string') return null
    return { uid: payload.uid, org: payload.org, portal: Boolean(payload.portal) }
  } catch {
    return null
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  // Set COOKIE_SECURE=false only to test over plain http on a local network (e.g. from a phone).
  secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE,
}
