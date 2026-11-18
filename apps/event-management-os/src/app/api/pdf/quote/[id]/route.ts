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
  // Staff need quotes:read; a portal client can only download its own, non-draft quotes.
  const where = ctx.user.clientId ? { id, organizationId: ctx.org.id, clientId: ctx.user.clientId, deletedAt: null, status: { not: 'DRAFT' as const } } : ctx.can('quotes') ? { id, organizationId: ctx.org.id, deletedAt: null } : null
  if (!where) return new Response('Forbidden', { status: 403 })
  const q = await prisma.quotation.findFirst({ where, include: { client: true, project: true, items: { orderBy: { position: 'asc' } }, organization: true } })
  if (!q) return new Response('Not found', { status: 404 })
  return pdfResponse(
    createElement(CommercialPdf, { d: { kind: 'QUOTE', ref: q.ref, title: q.title, org: { name: q.organization.name, currency: q.organization.currency }, client: { name: fullName(q.client), company: q.client.company, email: q.client.email, phone: q.client.phone, address: [q.client.address, q.client.city, q.client.country].filter(Boolean).join(', ') || null }, project: q.project?.name, issueDate: q.issueDate, secondDate: q.expiryDate, status: q.status, discountPct: q.discountPct, items: q.items, terms: q.terms, notes: q.notes } }),
    `${q.ref}.pdf`,
  )
}
