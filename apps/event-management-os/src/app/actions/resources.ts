'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ForbiddenError, requireAction } from '@/lib/auth/context'
import { getResource } from '@/lib/resources/registry'
import { assertRelationsInOrg, delegate, parseForm, parseParents, prepareData, scopeWhere, type FieldErrors } from '@/lib/resources/server'
import { nextRef } from '@/lib/refs'
import { logActivity } from '@/lib/activity'
import { createChecklist, onLeadCreated, onLeadWon, onQuoteApproved } from '@/lib/automations'
import { toDateInput } from '@/lib/dates'
import { recomputeInvoiceStatus, recomputeProjectProgress } from '@/lib/recompute'

export interface FormState {
  ok: boolean
  message?: string
  errors?: FieldErrors
  id?: string
  href?: string
}

function fail(e: unknown): FormState {
  if (e instanceof ForbiddenError) return { ok: false, message: e.message }
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return { ok: false, message: 'A record with the same unique value already exists.' }
  console.error(e)
  return { ok: false, message: 'Something went wrong while saving. Please try again.' }
}

/** Generic create / update for every registered resource. */
export async function saveResource(key: string, id: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  try {
    const def = getResource(key)
    const ctx = await requireAction(def.permission, 'write')
    const isCreate = !id
    const { data, virtual, errors } = parseForm(def.fields, form, isCreate)
    const parents = parseParents(def, form)
    if (Object.keys(errors).length) return { ok: false, errors, message: 'Please correct the highlighted fields.' }

    const result = await prisma.$transaction(async (tx) => {
      let existing: Record<string, unknown> | null = null
      if (!isCreate) {
        existing = await delegate(tx, def).findFirst({ where: { ...scopeWhere(ctx, def), id } })
        if (!existing) throw new ForbiddenError('Record not found or access denied.')
      }
      const relErrors = await assertRelationsInOrg(tx, ctx, def.fields, data, parents, existing)
      if (Object.keys(relErrors).length) return { ok: false as const, errors: relErrors }
      const prepErrors = await prepareData(tx, ctx, def, data, id ?? undefined)
      if (Object.keys(prepErrors).length) return { ok: false as const, errors: prepErrors }

      let record: Record<string, unknown>
      if (isCreate) {
        const createData: Record<string, unknown> = { ...data, ...parents, organizationId: ctx.org.id }
        if (def.refKey) createData.ref = await nextRef(tx, ctx.org.id, def.refKey)
        if (def.key === 'tasks') createData.createdById = ctx.user.id
        record = await delegate(tx, def).create({ data: createData })
      } else {
        record = await delegate(tx, def).update({ where: { id }, data: { ...data, ...parents } })
      }

      // ── Automations & derived data ──
      if (def.key === 'leads') {
        const lead = record as { id: string; organizationId: string; firstName: string; lastName: string; assignedToId: string | null; ref: string; stage: string }
        if (isCreate) await onLeadCreated(tx, lead, ctx.user.id)
        if (lead.stage === 'WON' && (isCreate || existing?.stage !== 'WON')) await onLeadWon(tx, lead.id, ctx.user.id)
      }
      if (def.key === 'projects' && isCreate && virtual.applyChecklist) {
        const p = record as { id: string; type: never; managerId: string | null; startDate: Date | null }
        await createChecklist(tx, { organizationId: ctx.org.id, projectId: p.id, type: p.type, assigneeId: p.managerId, startDate: p.startDate, createdById: ctx.user.id })
      }
      if (def.key === 'quotes' && record.status === 'APPROVED' && existing?.status !== 'APPROVED') {
        await tx.quotation.update({ where: { id: record.id as string }, data: { approvedAt: new Date() } })
        await onQuoteApproved(tx, record as never, ctx.user.id)
      }
      if (def.key === 'tasks') {
        const pids = new Set([record.projectId, existing?.projectId].filter(Boolean) as string[])
        for (const pid of pids) await recomputeProjectProgress(tx, pid)
      }
      if (def.key === 'payments' && record.invoiceId) await recomputeInvoiceStatus(tx, record.invoiceId as string)

      const title = def.titleOf(record)
      await logActivity(
        {
          organizationId: ctx.org.id,
          userId: ctx.user.id,
          action: isCreate ? 'created' : 'updated',
          entityType: def.key,
          entityId: record.id as string,
          summary: `${isCreate ? 'Created' : 'Updated'} ${def.singular.toLowerCase()} ${record.ref ? `${record.ref} — ` : ''}${title}`,
          link: detailHref(def.key, record),
          before: existing ?? undefined,
          after: record,
        },
        tx,
      )
      return { ok: true as const, record }
    })

    if (!result.ok) return { ok: false, errors: result.errors, message: 'Please correct the highlighted fields.' }
    revalidatePath('/', 'layout')
    return { ok: true, id: result.record.id as string, href: detailHref(def.key, result.record), message: `${def.singular} ${isCreate ? 'created' : 'saved'}.` }
  } catch (e) {
    return fail(e)
  }
}

function detailHref(key: string, r: Record<string, unknown>) {
  switch (key) {
    case 'payments':
      return '/finance'
    case 'reservations':
      return r.stayId ? `/stays/${r.stayId}` : r.eventId ? `/events/${r.eventId}` : '/stays'
    case 'calendar':
      return '/calendar'
    default:
      return `${getResource(key).basePath}/${r.id}`
  }
}

/** Soft delete (or hard delete for non-soft resources). */
export async function deleteResource(key: string, id: string): Promise<FormState> {
  try {
    const def = getResource(key)
    const ctx = await requireAction(def.permission, 'delete')
    await prisma.$transaction(async (tx) => {
      const existing = await delegate(tx, def).findFirst({ where: { ...scopeWhere(ctx, def), id } })
      if (!existing) throw new ForbiddenError('Record not found or access denied.')
      if (def.softDelete) await delegate(tx, def).update({ where: { id }, data: { deletedAt: new Date() } })
      else await delegate(tx, def).delete({ where: { id } })
      if (def.key === 'tasks' && existing.projectId) await recomputeProjectProgress(tx, existing.projectId)
      if (def.key === 'payments' && existing.invoiceId) await recomputeInvoiceStatus(tx, existing.invoiceId)
      await logActivity(
        { organizationId: ctx.org.id, userId: ctx.user.id, action: 'deleted', entityType: def.key, entityId: id, summary: `${def.softDelete ? 'Archived' : 'Deleted'} ${def.singular.toLowerCase()} ${existing.ref ?? ''} ${def.titleOf(existing)}`.trim(), before: existing },
        tx,
      )
    })
    revalidatePath('/', 'layout')
    return { ok: true, message: `${def.singular} ${def.softDelete ? 'archived' : 'deleted'}.`, href: def.basePath }
  } catch (e) {
    return fail(e)
  }
}

/** Updates a single enumerated field (status / stage / priority) — used by Kanban boards and quick actions. */
const QUICK_FIELDS: Record<string, string[]> = {
  leads: ['stage', 'priority'],
  tasks: ['status', 'priority'],
  projects: ['status'],
  events: ['status'],
  concierge: ['status'],
  quotes: ['status'],
  invoices: ['status'],
  payments: ['status'],
  suppliers: ['favorite', 'status'],
  reservations: ['status'],
  stays: ['status'],
}

export async function quickUpdate(key: string, id: string, field: string, value: string, position?: number): Promise<FormState> {
  try {
    const def = getResource(key)
    if (!QUICK_FIELDS[key]?.includes(field)) throw new ForbiddenError('Field not editable.')
    const f = def.fields.find((x) => x.name === field)
    let parsed: unknown = value
    if (f?.type === 'boolean') parsed = value === 'true'
    else if (f?.options && !f.options.some((o) => o.value === value)) return { ok: false, message: 'Invalid value.' }
    const ctx = await requireAction(def.permission, 'write')
    const fd = new FormData()
    // Reuse the full save path so automations & audit run identically.
    const existing = await delegate(prisma, def).findFirst({ where: { ...scopeWhere(ctx, def), id } })
    if (!existing) throw new ForbiddenError('Record not found or access denied.')
    for (const field of def.fields) {
      const v = existing[field.name]
      if (field.createOnly) continue
      if (field.type === 'multiselect') continue
      if (v === null || v === undefined) continue
      if (field.type === 'boolean') fd.set(field.name, v ? 'true' : 'false')
      else if (field.type === 'money') fd.set(field.name, String((v as number) / 100))
      else if (field.type === 'date') fd.set(field.name, toDateInput(v))
      else if (field.type === 'datetime') fd.set(field.name, new Date(v).toISOString())
      else if (field.type === 'tags') fd.set(field.name, (v as string[]).join(', '))
      else fd.set(field.name, String(v))
    }
    if (def.key === 'suppliers') {
      const cats = await prisma.category.findMany({ where: { suppliers: { some: { id } } }, select: { id: true } })
      for (const c of cats) fd.append('categories', c.id)
    }
    fd.set(field, typeof parsed === 'boolean' ? String(parsed) : value)
    const res = await saveResource(key, id, { ok: true }, fd)
    if (res.ok && position !== undefined && (key === 'leads' || key === 'tasks')) {
      await delegate(prisma, def).update({ where: { id }, data: { position } })
    }
    return res
  } catch (e) {
    return fail(e)
  }
}
