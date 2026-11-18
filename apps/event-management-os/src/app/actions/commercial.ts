'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ForbiddenError, requireAction } from '@/lib/auth/context'
import { logActivity } from '@/lib/activity'
import { nextRef } from '@/lib/refs'
import { addDays } from '@/lib/dates'
import { recomputeInvoiceStatus } from '@/lib/recompute'
import type { FormState } from './resources'

const lineSchema = z.object({
  serviceId: z.string().nullable().optional(),
  description: z.string().trim().min(1, 'Every line needs a description').max(500),
  quantity: z.number().positive('Quantity must be positive').max(100000),
  unitPrice: z.number().int().min(0),
  unitCost: z.number().int().min(0).optional(),
  discountPct: z.number().min(0).max(100),
  taxRate: z.number().min(0).max(100),
})
export type LineInput = z.infer<typeof lineSchema>

const fail = (e: unknown): FormState => {
  if (!(e instanceof ForbiddenError)) console.error(e)
  return { ok: false, message: e instanceof ForbiddenError ? e.message : 'Could not save.' }
}

/** Replaces all lines of a quote or invoice (validated, tenant-checked). */
export async function saveLines(kind: 'quote' | 'invoice', id: string, lines: LineInput[]): Promise<FormState> {
  try {
    const ctx = await requireAction(kind === 'quote' ? 'quotes' : 'invoices', 'write')
    const parsed = z.array(lineSchema).max(200).safeParse(lines)
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message }
    const serviceIds = parsed.data.map((l) => l.serviceId).filter(Boolean) as string[]
    if (serviceIds.length) {
      const n = await prisma.service.count({ where: { organizationId: ctx.org.id, id: { in: serviceIds } } })
      if (n !== new Set(serviceIds).size) throw new ForbiddenError('Unknown service.')
    }
    await prisma.$transaction(async (tx) => {
      if (kind === 'quote') {
        const q = await tx.quotation.findFirst({ where: { id, organizationId: ctx.org.id, deletedAt: null } })
        if (!q) throw new ForbiddenError('Quote not found.')
        if (q.status === 'APPROVED') throw new ForbiddenError('Approved quotes are locked. Duplicate it to make changes.')
        await tx.quotationItem.deleteMany({ where: { quotationId: id } })
        await tx.quotationItem.createMany({ data: parsed.data.map((l, i) => ({ quotationId: id, serviceId: l.serviceId || null, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, unitCost: l.unitCost ?? 0, discountPct: l.discountPct, taxRate: l.taxRate, position: i })) })
      } else {
        const inv = await tx.invoice.findFirst({ where: { id, organizationId: ctx.org.id, deletedAt: null } })
        if (!inv) throw new ForbiddenError('Invoice not found.')
        if (inv.status === 'PAID' || inv.status === 'CANCELLED') throw new ForbiddenError('Paid or cancelled invoices are locked.')
        await tx.invoiceItem.deleteMany({ where: { invoiceId: id } })
        await tx.invoiceItem.createMany({ data: parsed.data.map((l, i) => ({ invoiceId: id, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, discountPct: l.discountPct, taxRate: l.taxRate, position: i })) })
        await recomputeInvoiceStatus(tx, id)
      }
    })
    revalidatePath(`/${kind === 'quote' ? 'quotes' : 'invoices'}/${id}`)
    return { ok: true, message: 'Lines saved.' }
  } catch (e) {
    return fail(e)
  }
}

/** Quote → Invoice (full amount, or a deposit percentage). */
export async function quoteToInvoice(quoteId: string, sharePct = 100): Promise<FormState> {
  try {
    const ctx = await requireAction('invoices', 'write')
    const pct = Math.min(100, Math.max(1, sharePct))
    const inv = await prisma.$transaction(async (tx) => {
      const q = await tx.quotation.findFirst({ where: { id: quoteId, organizationId: ctx.org.id, deletedAt: null }, include: { items: { orderBy: { position: 'asc' } } } })
      if (!q) throw new ForbiddenError('Quote not found.')
      if (q.status !== 'APPROVED') throw new ForbiddenError('Only approved quotes can be invoiced.')
      const g = 1 - q.discountPct / 100
      const invoice = await tx.invoice.create({
        data: {
          organizationId: ctx.org.id,
          ref: await nextRef(tx, ctx.org.id, 'invoice'),
          clientId: q.clientId,
          projectId: q.projectId,
          quotationId: q.id,
          issueDate: new Date(),
          dueDate: addDays(new Date(), 15),
          status: 'DRAFT',
          terms: 'Payment by bank transfer within 15 days.',
          items: {
            create:
              pct === 100
                ? q.items.map((it, i) => ({ description: it.description, quantity: it.quantity, unitPrice: Math.round(it.unitPrice * g), discountPct: it.discountPct, taxRate: it.taxRate, position: i }))
                : [{ description: `Deposit ${pct}% — ${q.title ?? q.ref}`, quantity: 1, unitPrice: Math.round((q.items.reduce((a, it) => a + it.quantity * it.unitPrice * (1 - it.discountPct / 100), 0) * g * pct) / 100), taxRate: q.items[0]?.taxRate ?? 20, discountPct: 0, position: 0 }],
          },
        },
      })
      await logActivity({ organizationId: ctx.org.id, userId: ctx.user.id, action: 'created', entityType: 'invoices', entityId: invoice.id, summary: `Invoice ${invoice.ref} created from quote ${q.ref}${pct < 100 ? ` (deposit ${pct}%)` : ''}`, link: `/invoices/${invoice.id}` }, tx)
      return invoice
    })
    revalidatePath('/invoices')
    return { ok: true, message: `Invoice ${inv.ref} created.`, href: `/invoices/${inv.id}` }
  } catch (e) {
    return fail(e)
  }
}

export async function duplicateQuote(quoteId: string): Promise<FormState> {
  try {
    const ctx = await requireAction('quotes', 'write')
    const copy = await prisma.$transaction(async (tx) => {
      const q = await tx.quotation.findFirst({ where: { id: quoteId, organizationId: ctx.org.id }, include: { items: true } })
      if (!q) throw new ForbiddenError('Quote not found.')
      return tx.quotation.create({
        data: { organizationId: ctx.org.id, ref: await nextRef(tx, ctx.org.id, 'quote'), title: q.title, clientId: q.clientId, projectId: q.projectId, issueDate: new Date(), expiryDate: addDays(new Date(), 30), discountPct: q.discountPct, terms: q.terms, notes: q.notes, items: { create: q.items.map(({ id: _i, quotationId: _q, ...it }) => it) } },
      })
    })
    revalidatePath('/quotes')
    return { ok: true, message: `Duplicated as ${copy.ref}.`, href: `/quotes/${copy.id}` }
  } catch (e) {
    return fail(e)
  }
}
