'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ForbiddenError, getCtx, requireAction } from '@/lib/auth/context'
import { logActivity } from '@/lib/activity'
import { ACTIONS, RESOURCES } from '@/lib/permissions'
import { runScheduledAutomations } from '@/lib/automations'
import type { FormState } from './resources'

type WithPassword = FormState & { password?: string }
const fail = (e: unknown): FormState => {
  if (!(e instanceof ForbiddenError)) console.error(e)
  return { ok: false, message: e instanceof ForbiddenError ? e.message : 'Action failed.' }
}
const COLORS = ['#F07F73', '#8B7CF6', '#3BA3D9', '#2FB59A', '#E3A33B', '#D9608A', '#5B8DEF']

const userSchema = z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().toLowerCase().email(), title: z.string().max(120).optional(), roleId: z.string().min(1), active: z.boolean() })

export async function saveUser(userId: string | null, _prev: WithPassword, form: FormData): Promise<WithPassword> {
  try {
    const ctx = await requireAction('admin', 'write')
    const parsed = userSchema.safeParse({ name: form.get('name'), email: form.get('email'), title: form.get('title') || undefined, roleId: form.get('roleId'), active: form.get('active') === 'on' || !userId })
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message }
    const role = await prisma.role.findFirst({ where: { id: parsed.data.roleId, organizationId: ctx.org.id } })
    if (!role || role.key === 'client') return { ok: false, message: 'Pick a staff role (client accounts are managed from Client Portal).' }
    const dup = await prisma.user.findFirst({ where: { email: parsed.data.email, ...(userId ? { id: { not: userId } } : {}) } })
    if (dup) return { ok: false, message: 'Email already in use.' }
    if (userId) {
      const u = await prisma.user.findFirst({ where: { id: userId, organizationId: ctx.org.id, clientId: null } })
      if (!u) throw new ForbiddenError('User not found.')
      if (u.id === ctx.user.id && (!parsed.data.active || role.key !== 'admin')) return { ok: false, message: 'You cannot deactivate or demote yourself.' }
      await prisma.user.update({ where: { id: userId }, data: parsed.data })
      await logActivity({ organizationId: ctx.org.id, userId: ctx.user.id, action: 'updated', entityType: 'users', entityId: userId, summary: `Updated user ${parsed.data.name} (${role.name})`, before: { roleId: u.roleId, active: u.active }, after: { roleId: role.id, active: parsed.data.active } })
      revalidatePath('/admin/users')
      return { ok: true, message: 'User saved.' }
    }
    const password = randomBytes(9).toString('base64url')
    const created = await prisma.user.create({ data: { ...parsed.data, organizationId: ctx.org.id, passwordHash: await bcrypt.hash(password, 10), color: COLORS[Math.floor(Math.random() * COLORS.length)]! } })
    await logActivity({ organizationId: ctx.org.id, userId: ctx.user.id, action: 'created', entityType: 'users', entityId: created.id, summary: `Created user ${created.name} (${role.name})` })
    revalidatePath('/admin/users')
    return { ok: true, message: 'User created.', password }
  } catch (e) {
    return fail(e)
  }
}

export async function resetPassword(userId: string): Promise<WithPassword> {
  try {
    const ctx = await requireAction('admin', 'write')
    const u = await prisma.user.findFirst({ where: { id: userId, organizationId: ctx.org.id } })
    if (!u) throw new ForbiddenError('User not found.')
    const password = randomBytes(9).toString('base64url')
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(password, 10) } })
    await logActivity({ organizationId: ctx.org.id, userId: ctx.user.id, action: 'updated', entityType: 'users', entityId: userId, summary: `Password reset for ${u.name}` })
    return { ok: true, message: `New temporary password for ${u.name}: ${password}`, password }
  } catch (e) {
    return fail(e)
  }
}

const VALID_PERMS = new Set<string>(['*', 'scope:assigned', ...RESOURCES.flatMap((r) => [...ACTIONS.map((a) => `${r}:${a}`), `${r}:*`])])

export async function saveRolePermissions(roleId: string, permissions: string[]): Promise<FormState> {
  try {
    const ctx = await requireAction('admin', 'write')
    const role = await prisma.role.findFirst({ where: { id: roleId, organizationId: ctx.org.id } })
    if (!role) throw new ForbiddenError('Role not found.')
    if (role.key === 'admin' || role.key === 'client') throw new ForbiddenError('Administrator and Client roles are locked.')
    const clean = [...new Set(permissions)].filter((p) => VALID_PERMS.has(p) && p !== '*')
    await prisma.role.update({ where: { id: roleId }, data: { permissions: clean } })
    await logActivity({ organizationId: ctx.org.id, userId: ctx.user.id, action: 'updated', entityType: 'roles', entityId: roleId, summary: `Permissions updated for role ${role.name}`, before: role.permissions, after: clean })
    revalidatePath('/admin/roles')
    return { ok: true, message: `${role.name} permissions saved.` }
  } catch (e) {
    return fail(e)
  }
}

export async function createRole(_prev: FormState, form: FormData): Promise<FormState> {
  try {
    const ctx = await requireAction('admin', 'write')
    const name = String(form.get('name') ?? '').trim()
    if (name.length < 2) return { ok: false, message: 'Enter a role name.' }
    const key = `custom_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`.slice(0, 40)
    if (await prisma.role.findFirst({ where: { organizationId: ctx.org.id, key } })) return { ok: false, message: 'A role with this name exists.' }
    await prisma.role.create({ data: { organizationId: ctx.org.id, key, name, description: 'Custom role', permissions: ['dashboard:read'] } })
    revalidatePath('/admin/roles')
    return { ok: true, message: 'Role created — set its permissions below.' }
  } catch (e) {
    return fail(e)
  }
}

/** Permanently removes every record flagged as fictitious demo data in this organization. */
export async function purgeDemoData(): Promise<FormState> {
  try {
    const ctx = await requireAction('admin', 'delete')
    const org = ctx.org.id
    await prisma.$transaction(async (tx) => {
      const demoProjects = await tx.project.findMany({ where: { organizationId: org, isDemo: true }, select: { id: true } })
      const pids = demoProjects.map((p) => p.id)
      await tx.payment.deleteMany({ where: { organizationId: org, OR: [{ isDemo: true }, { projectId: { in: pids } }] } })
      await tx.commission.deleteMany({ where: { organizationId: org, projectId: { in: pids } } })
      await tx.invoice.deleteMany({ where: { organizationId: org, isDemo: true } })
      await tx.quotation.deleteMany({ where: { organizationId: org, isDemo: true } })
      await tx.task.deleteMany({ where: { organizationId: org, isDemo: true } })
      await tx.conciergeRequest.deleteMany({ where: { organizationId: org, isDemo: true } })
      await tx.reservation.deleteMany({ where: { organizationId: org, OR: [{ stay: { isDemo: true } }, { event: { isDemo: true } }] } })
      await tx.stay.deleteMany({ where: { organizationId: org, isDemo: true } })
      await tx.event.deleteMany({ where: { organizationId: org, isDemo: true } })
      await tx.document.deleteMany({ where: { organizationId: org, OR: [{ projectId: { in: pids } }, { client: { isDemo: true } }, { supplier: { isDemo: true } }] } })
      await tx.calendarEvent.deleteMany({ where: { organizationId: org, projectId: { in: pids } } })
      await tx.lead.deleteMany({ where: { organizationId: org, isDemo: true } })
      await tx.project.deleteMany({ where: { id: { in: pids } } })
      await tx.service.deleteMany({ where: { organizationId: org, isDemo: true } })
      await tx.partner.deleteMany({ where: { organizationId: org, isDemo: true } })
      await tx.supplier.deleteMany({ where: { organizationId: org, isDemo: true } })
      await tx.user.deleteMany({ where: { organizationId: org, client: { isDemo: true } } })
      await tx.interaction.deleteMany({ where: { organizationId: org, client: { isDemo: true } } })
      await tx.task.deleteMany({ where: { organizationId: org, client: { isDemo: true } } })
      await tx.client.deleteMany({ where: { organizationId: org, isDemo: true } })
      await logActivity({ organizationId: org, userId: ctx.user.id, action: 'deleted', entityType: 'organization', entityId: org, summary: 'All fictitious demo data purged' }, tx)
    }, { timeout: 60_000 })
    revalidatePath('/', 'layout')
    return { ok: true, message: 'Demo data removed.' }
  } catch (e) {
    return fail(e)
  }
}

export async function runAutomationsNow(): Promise<FormState> {
  try {
    const ctx = await requireAction('settings', 'write')
    const s = await runScheduledAutomations(ctx.org.id)
    revalidatePath('/', 'layout')
    return { ok: true, message: `Checked: ${s.followUps} follow-ups, ${s.overdue} overdue tasks, ${s.payments} payment reminders, ${s.eventChecklists} new event checklists.` }
  } catch (e) {
    return fail(e)
  }
}

// ── Settings ──

const orgSchema = z.object({ name: z.string().trim().min(2).max(120), currency: z.enum(['EUR', 'USD', 'GBP', 'CHF', 'AED', 'MAD']), taxRate: z.coerce.number().min(0).max(50) })

export async function saveOrganization(_prev: FormState, form: FormData): Promise<FormState> {
  try {
    const ctx = await requireAction('settings', 'write')
    const parsed = orgSchema.safeParse({ name: form.get('name'), currency: form.get('currency'), taxRate: form.get('taxRate') })
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message }
    await prisma.organization.update({ where: { id: ctx.org.id }, data: parsed.data })
    await logActivity({ organizationId: ctx.org.id, userId: ctx.user.id, action: 'updated', entityType: 'organization', entityId: ctx.org.id, summary: 'Organization settings updated', after: parsed.data })
    revalidatePath('/', 'layout')
    return { ok: true, message: 'Organization settings saved.' }
  } catch (e) {
    return fail(e)
  }
}

export async function saveProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await getCtx()
  if (!ctx) return { ok: false, message: 'Session expired.' }
  const name = String(form.get('name') ?? '').trim()
  const title = String(form.get('title') ?? '').trim()
  const locale = String(form.get('locale') ?? 'en')
  if (name.length < 2 || !['en', 'fr'].includes(locale)) return { ok: false, message: 'Invalid profile.' }
  await prisma.user.update({ where: { id: ctx.user.id }, data: { name, title: title || null, locale } })
  revalidatePath('/', 'layout')
  return { ok: true, message: 'Profile saved.' }
}

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await getCtx()
  if (!ctx) return { ok: false, message: 'Session expired.' }
  const current = String(form.get('current') ?? '')
  const next = String(form.get('next') ?? '')
  if (next.length < 10) return { ok: false, message: 'Use at least 10 characters.' }
  if (next !== String(form.get('confirm') ?? '')) return { ok: false, message: 'Passwords do not match.' }
  const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id } })
  if (!(await bcrypt.compare(current, user.passwordHash))) return { ok: false, message: 'Current password is incorrect.' }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } })
  return { ok: true, message: 'Password changed.' }
}
