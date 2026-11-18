import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { can, isAssignedScope, type Action, type Resource } from '@/lib/permissions'
import { SESSION_COOKIE, verifySession } from './session'

export class ForbiddenError extends Error {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export interface Ctx {
  user: { id: string; name: string; email: string; title: string | null; color: string; locale: string; clientId: string | null }
  org: { id: string; name: string; currency: string; taxRate: number }
  role: { key: string; name: string }
  permissions: string[]
  assignedOnly: boolean
  can: (resource: Resource, action?: Action) => boolean
}

/** Resolves the authenticated user. Cached per request. Returns null when not signed in. */
export const getCtx = cache(async (): Promise<Ctx | null> => {
  const jar = await cookies()
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value)
  if (!session) return null
  const user = await prisma.user.findFirst({
    where: { id: session.uid, organizationId: session.org, active: true, deletedAt: null },
    include: { role: true, organization: true },
  })
  if (!user) return null
  const permissions = user.role.permissions
  return {
    user: { id: user.id, name: user.name, email: user.email, title: user.title, color: user.color, locale: user.locale, clientId: user.clientId },
    org: { id: user.organization.id, name: user.organization.name, currency: user.organization.currency, taxRate: user.organization.taxRate },
    role: { key: user.role.key, name: user.role.name },
    permissions,
    assignedOnly: isAssignedScope(permissions),
    can: (resource, action = 'read') => can(permissions, resource, action),
  }
})

/** For pages: redirects to /login when signed out, and to /forbidden on missing permission. */
export async function requirePage(resource?: Resource, action: Action = 'read'): Promise<Ctx> {
  const ctx = await getCtx()
  if (!ctx) redirect('/login')
  if (ctx.permissions.includes('portal:access') && !ctx.permissions.includes('*')) redirect('/portal')
  if (resource && !ctx.can(resource, action)) redirect('/forbidden')
  return ctx
}

/** For server actions / route handlers: throws instead of redirecting. */
export async function requireAction(resource: Resource, action: Action = 'write'): Promise<Ctx> {
  const ctx = await getCtx()
  if (!ctx) throw new ForbiddenError('Your session has expired. Please sign in again.')
  if (!ctx.can(resource, action)) throw new ForbiddenError()
  return ctx
}

export async function requirePortal(): Promise<Ctx & { user: Ctx['user'] & { clientId: string } }> {
  const ctx = await getCtx()
  if (!ctx) redirect('/login')
  if (!ctx.user.clientId) redirect('/')
  return ctx as Ctx & { user: Ctx['user'] & { clientId: string } }
}
