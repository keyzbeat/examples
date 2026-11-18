'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ForbiddenError, requireAction } from '@/lib/auth/context'
import { logActivity } from '@/lib/activity'
import { onLeadWon } from '@/lib/automations'
import { nextRef } from '@/lib/refs'
import { normalizeEmail, fullName } from '@/lib/utils'
import type { FormState } from './resources'

const interactionSchema = z.object({
  type: z.enum(['NOTE', 'CALL', 'EMAIL', 'WHATSAPP', 'MEETING']),
  summary: z.string().trim().min(2, 'Write a short summary.').max(4000),
  occurredAt: z.string().optional(),
})

/** Adds a note / call / email / WhatsApp / meeting to a lead, client or project timeline. */
export async function addInteraction(target: 'lead' | 'client' | 'project', id: string, _prev: FormState, form: FormData): Promise<FormState> {
  try {
    const ctx = await requireAction(target === 'lead' ? 'leads' : target === 'client' ? 'clients' : 'projects', 'write')
    const parsed = interactionSchema.safeParse({ type: form.get('type'), summary: form.get('summary'), occurredAt: form.get('occurredAt') || undefined })
    if (!parsed.success) return { ok: false, errors: { summary: parsed.error.issues[0]!.message } }
    const owner =
      target === 'lead'
        ? await prisma.lead.findFirst({ where: { id, organizationId: ctx.org.id } })
        : target === 'client'
          ? await prisma.client.findFirst({ where: { id, organizationId: ctx.org.id } })
          : await prisma.project.findFirst({ where: { id, organizationId: ctx.org.id } })
    if (!owner) throw new ForbiddenError('Record not found.')
    await prisma.interaction.create({
      data: {
        organizationId: ctx.org.id,
        type: parsed.data.type,
        summary: parsed.data.summary,
        occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
        userId: ctx.user.id,
        leadId: target === 'lead' ? id : null,
        clientId: target === 'client' ? id : target === 'lead' ? (owner as { clientId: string | null }).clientId : null,
        projectId: target === 'project' ? id : null,
      },
    })
    revalidatePath(`/${target}s/${id}`)
    return { ok: true, message: 'Added to history.' }
  } catch (e) {
    return { ok: false, message: e instanceof ForbiddenError ? e.message : 'Could not save the interaction.' }
  }
}

/** Lead → Client (with duplicate detection by email). */
export async function convertLeadToClient(leadId: string): Promise<FormState> {
  try {
    const ctx = await requireAction('leads', 'write')
    if (!ctx.can('clients', 'write')) throw new ForbiddenError()
    const result = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findFirst({ where: { id: leadId, organizationId: ctx.org.id, deletedAt: null } })
      if (!lead) throw new ForbiddenError('Lead not found.')
      if (lead.clientId) return { clientId: lead.clientId, existed: true }
      const email = normalizeEmail(lead.email)
      const dup = email ? await tx.client.findFirst({ where: { organizationId: ctx.org.id, emailNormalized: email, deletedAt: null } }) : null
      const client =
        dup ??
        (await tx.client.create({
          data: { organizationId: ctx.org.id, ref: await nextRef(tx, ctx.org.id, 'client'), type: lead.company ? 'COMPANY' : 'INDIVIDUAL', firstName: lead.firstName, lastName: lead.lastName, company: lead.company, email: lead.email, emailNormalized: email, phone: lead.phone, whatsapp: lead.whatsapp, city: lead.city, country: lead.country, ownerId: lead.assignedToId, isDemo: lead.isDemo },
        }))
      await tx.lead.update({ where: { id: lead.id }, data: { clientId: client.id } })
      await tx.interaction.updateMany({ where: { leadId: lead.id, clientId: null }, data: { clientId: client.id } })
      await logActivity({ organizationId: ctx.org.id, userId: ctx.user.id, action: 'converted', entityType: 'leads', entityId: lead.id, summary: dup ? `Lead ${lead.ref} linked to existing client ${dup.ref} (duplicate avoided)` : `Lead ${lead.ref} converted to client ${client.ref} — ${fullName(client)}`, link: `/clients/${client.id}` }, tx)
      return { clientId: client.id, existed: !!dup }
    })
    revalidatePath('/', 'layout')
    return { ok: true, message: result.existed ? 'Linked to the existing client (no duplicate created).' : 'Client created.', href: `/clients/${result.clientId}` }
  } catch (e) {
    return { ok: false, message: e instanceof ForbiddenError ? e.message : 'Conversion failed.' }
  }
}

/** Lead → Project: marks the deal as won and runs the “Deal Won” automation. */
export async function convertLeadToProject(leadId: string): Promise<FormState> {
  try {
    const ctx = await requireAction('leads', 'write')
    if (!ctx.can('projects', 'write') && !ctx.can('leads', 'write')) throw new ForbiddenError()
    const res = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findFirst({ where: { id: leadId, organizationId: ctx.org.id, deletedAt: null } })
      if (!lead) throw new ForbiddenError('Lead not found.')
      if (lead.stage !== 'WON') await tx.lead.update({ where: { id: lead.id }, data: { stage: 'WON' } })
      const out = await onLeadWon(tx, lead.id, ctx.user.id)
      await logActivity({ organizationId: ctx.org.id, userId: ctx.user.id, action: 'converted', entityType: 'leads', entityId: lead.id, summary: `Deal won — ${fullName(lead)} (${lead.ref})`, link: `/projects/${out.projectId}` }, tx)
      return out
    })
    revalidatePath('/', 'layout')
    return { ok: true, message: 'Deal won — project created with its default checklist.', href: `/projects/${res.projectId}` }
  } catch (e) {
    return { ok: false, message: e instanceof ForbiddenError ? e.message : 'Conversion failed.' }
  }
}
