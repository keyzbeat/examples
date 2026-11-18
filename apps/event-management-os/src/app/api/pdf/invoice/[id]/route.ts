import { createElement } from 'react'
import { getCtx } from '@/lib/auth/context'
import { prisma } from '@/lib/prisma'
import { CommercialPdf } from '@/lib/pdf/templates'
import { pdfResponse } from '@/lib/pdf/render'
import { fullName } from '@/lib/utils'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getCtx()
  if (!ctx) return new Response('Unauthorized', { status: 401 })
  const where = ctx.user.clientId ? { id, organizationId: ctx.org.id, clientId: ctx.user.clientId, deletedAt: null, status: { not: 'DRAFT' as const } } : ctx.can('invoices') ? { id, organizationId: ctx.org.id, deletedAt: null } : null
  if (!where) return new Response('Forbidden', { status: 403 })
  const inv = await prisma.invoice.findFirst({ where, include: { client: true, project: true, items: { orderBy: { position: 'asc' } }, payments: true, organization: true } })
  if (!inv) return new Response('Not found', { status: 404 })
  const paid = inv.payments.filter((p) => p.status === 'PAID' && p.direction === 'INCOMING').reduce((a, p) => a + (p.kind === 'REFUND' ? -p.amount : p.amount), 0)
  return pdfResponse(
    createElement(CommercialPdf, { d: { kind: 'INVOICE', ref: inv.ref, org: { name: inv.organization.name, currency: inv.organization.currency }, client: { name: fullName(inv.client), company: inv.client.company, email: inv.client.email, phone: inv.client.phone, address: [inv.client.address, inv.client.city, inv.client.country].filter(Boolean).join(', ') || null }, project: inv.project?.name, issueDate: inv.issueDate, secondDate: inv.dueDate, status: inv.status, items: inv.items, terms: inv.terms, notes: inv.notes, paid } }),
    `${inv.ref}.pdf`,
  )
}
