'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { SESSION_COOKIE, sessionCookieOptions, signSession } from '@/lib/auth/session'

const schema = z.object({ email: z.string().email(), password: z.string().min(1) })

// Naive in-memory brute-force protection (per instance). Use a shared store (Redis) in multi-instance deployments.
const attempts = new Map<string, { n: number; until: number }>()

export async function signIn(_prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const parsed = schema.safeParse({ email: String(form.get('email') ?? '').trim().toLowerCase(), password: form.get('password') })
  if (!parsed.success) return { error: 'Enter a valid email and password.' }
  const key = parsed.data.email
  const a = attempts.get(key)
  if (a && a.n >= 5 && a.until > Date.now()) return { error: 'Too many attempts. Try again in a few minutes.' }

  const user = await prisma.user.findFirst({ where: { email: parsed.data.email, active: true, deletedAt: null }, include: { role: true } })
  const ok = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false
  if (!user || !ok) {
    attempts.set(key, { n: (a?.n ?? 0) + 1, until: Date.now() + 5 * 60_000 })
    return { error: 'Invalid email or password.' }
  }
  attempts.delete(key)
  const portal = !!user.clientId && user.role.permissions.includes('portal:access')
  const token = await signSession({ uid: user.id, org: user.organizationId, portal })
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, sessionCookieOptions)
  jar.set('emos_locale', user.locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  const next = String(form.get('next') ?? '')
  redirect(portal ? '/portal' : next.startsWith('/') && !next.startsWith('//') ? next : '/')
}
