'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ForbiddenError, getCtx, requireAction } from '@/lib/auth/context'
import { logActivity, notify } from '@/lib/activity'
import { onClientApproval, onQuoteApproved } from '@/lib/automations'
import { ALLOWED_MIME, MAX_UPLOAD, putFile } from '@/lib/storage'
import type { FormState } from './resources'

async function portalCtx() {
  const ctx = await getCtx()
  if (!ctx || !ctx.user.clientId) throw new ForbiddenError('Client portal access only.')
  return ctx as typeof ctx & { user: { clientId: string } }
}
const fail = (e: unknown): FormState => ({ ok: false, message: e instanceof ForbiddenError ? e.message : 'Something went wrong.' })

export async function decideApproval(approvalId: string, decision: 'APPROVED' | 'REJECTED', comment: string): Promise<FormState> {
  try {
    const ctx = await portalCtx()
    if (!['APPROVED', 'REJECTED'].includes(decision)) throw new ForbiddenError('Invalid decision.')
    const a = await prisma.approval.findFirst({ where: { id: approvalId, organizationId: ctx.org.id, project: { clientId: ctx.user.clientId } } })
    if (!a) throw new ForbiddenError('Not found.')
    if (a.status !== 'PENDING') return { ok: false, message: 'This item was already answered.' }
    await prisma.$transaction(async (tx) => {
      const updated = await tx.approval.update({ where: { id: a.id }, data: { status: decision, clientComment: comment.trim().slice(0, 2000) || null, decidedAt: new Date() } })
      await onClientApproval(tx, updated, ctx.user.id)
    })
    revalidatePath('/portal')
    return { ok: true, message: decision === 'APPROVED' ? 'Approved — thank you!' : 'Feedback sent to your planner.' }
  } catch (e) {
    return fail(e)
  }
}

export async function clientApproveQuote(quoteId: string): Promise<FormState> {
  try {
    const ctx = await portalCtx()
    const q = await prisma.quotation.findFirst({ where: { id: quoteId, organizationId: ctx.org.id, clientId: ctx.user.clientId, status: 'SENT', deletedAt: null } })
    if (!q) throw new ForbiddenError('This proposal cannot be approved.')
    await prisma.$transaction(async (tx) => {
      const updated = await tx.quotation.update({ where: { id: q.id }, data: { status: 'APPROVED', approvedAt: new Date() } })
      await logActivity({ organizationId: ctx.org.id, userId: ctx.user.id, action: 'approved', entityType: 'quotes', entityId: q.id, summary: `Client approved quote ${q.ref} in the portal`, link: `/quotes/${q.id}` }, tx)
      await onQuoteApproved(tx, updated, ctx.user.id)
    })
    revalidatePath('/portal')
    return { ok: true, message: 'Proposal approved. Your planner has been notified.' }
  } catch (e) {
    return fail(e)
  }
}

export async function postClientMessage(projectId: string, _prev: FormState, form: FormData): Promise<FormState> {
  try {
    const ctx = await portalCtx()
    const p = await prisma.project.findFirst({ where: { id: projectId, organizationId: ctx.org.id, clientId: ctx.user.clientId, deletedAt: null } })
    if (!p) throw new ForbiddenError('Project not found.')
    const body = String(form.get('body') ?? '').trim()
    if (!body) return { ok: false, message: 'Write a message.' }
    await prisma.message.create({ data: { organizationId: ctx.org.id, projectId, authorId: ctx.user.id, body: body.slice(0, 4000), fromClient: true } })
    if (p.managerId) await notify({ organizationId: ctx.org.id, userId: p.managerId, title: `New client message — ${p.name}`, body: body.slice(0, 120), link: `/projects/${p.id}?tab=portal` })
    revalidatePath('/portal')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function clientUpload(projectId: string, _prev: FormState, form: FormData): Promise<FormState> {
  try {
    const ctx = await portalCtx()
    const p = await prisma.project.findFirst({ where: { id: projectId, organizationId: ctx.org.id, clientId: ctx.user.clientId, deletedAt: null } })
    if (!p) throw new ForbiddenError('Project not found.')
    const file = form.get('file')
    if (!(file instanceof File) || !file.size) return { ok: false, message: 'Choose a file.' }
    if (file.size > MAX_UPLOAD || !ALLOWED_MIME.test(file.type)) return { ok: false, message: 'File type or size not allowed (10 MB max).' }
    const key = await putFile(ctx.org.id, file.name, Buffer.from(await file.arrayBuffer()))
    await prisma.document.create({ data: { organizationId: ctx.org.id, name: file.name, category: 'CLIENT', mimeType: file.type, size: file.size, storageKey: key, projectId, clientId: ctx.user.clientId, visibleToClient: true, uploadedById: ctx.user.id } })
    if (p.managerId) await notify({ organizationId: ctx.org.id, userId: p.managerId, title: `Client uploaded ${file.name}`, link: `/documents?projectId=${p.id}` })
    revalidatePath('/portal')
    return { ok: true, message: 'File shared with your planner.' }
  } catch (e) {
    return fail(e)
  }
}

// ── Staff side: manage portal accounts ──

const inviteSchema = z.object({ clientId: z.string().min(1), email: z.string().trim().toLowerCase().email() })

export async function createPortalAccount(_prev: FormState & { password?: string }, form: FormData): Promise<FormState & { password?: string }> {
  try {
    const ctx = await requireAction('clients', 'write')
    const parsed = inviteSchema.safeParse({ clientId: form.get('clientId'), email: form.get('email') })
    if (!parsed.success) return { ok: false, message: 'Select a client and a valid email.' }
    const client = await prisma.client.findFirst({ where: { id: parsed.data.clientId, organizationId: ctx.org.id, deletedAt: null } })
    if (!client) throw new ForbiddenError('Client not found.')
    if (await prisma.user.findUnique({ where: { email: parsed.data.email } })) return { ok: false, message: 'This email already has an account.' }
    const role = await prisma.role.findFirst({ where: { organizationId: ctx.org.id, key: 'client' } })
    if (!role) throw new ForbiddenError('Client role missing.')
    const password = randomBytes(9).toString('base64url')
    await prisma.user.create({ data: { organizationId: ctx.org.id, email: parsed.data.email, name: `${client.firstName} ${client.lastName}`, roleId: role.id, clientId: client.id, passwordHash: await bcrypt.hash(password, 10), locale: client.language === 'fr' ? 'fr' : 'en', color: '#B85650' } })
    await logActivity({ organizationId: ctx.org.id, userId: ctx.user.id, action: 'created', entityType: 'portal', entityId: client.id, summary: `Portal access created for ${client.firstName} ${client.lastName}` })
    revalidatePath('/portal-access')
    return { ok: true, message: 'Portal account created. Share the temporary password securely.', password }
  } catch (e) {
    return fail(e)
  }
}

export async function setPortalAccountActive(userId: string, active: boolean): Promise<FormState> {
  try {
    const ctx = await requireAction('clients', 'write')
    const res = await prisma.user.updateMany({ where: { id: userId, organizationId: ctx.org.id, clientId: { not: null } }, data: { active } })
    if (!res.count) throw new ForbiddenError('Account not found.')
    revalidatePath('/portal-access')
    return { ok: true, message: active ? 'Access restored.' : 'Access revoked.' }
  } catch (e) {
    return fail(e)
  }
}
