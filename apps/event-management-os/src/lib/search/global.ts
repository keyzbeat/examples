import 'server-only'
import { prisma } from '@/lib/prisma'
import type { Ctx } from '@/lib/auth/context'
import { fullName } from '@/lib/utils'
import { scopeWhere } from '@/lib/resources/server'
import { RESOURCES } from '@/lib/resources/registry'

export interface SearchHit {
  type: string
  id: string
  title: string
  subtitle?: string
  href: string
}

const ci = (q: string) => ({ contains: q, mode: 'insensitive' as const })

/** Universal search across modules, respecting permissions and assigned-only scope. */
export async function globalSearch(ctx: Ctx, q: string, limit = 6): Promise<SearchHit[]> {
  const term = q.trim()
  if (term.length < 2) return []
  const org = ctx.org.id
  const jobs: Promise<SearchHit[]>[] = []
  if (ctx.can('clients'))
    jobs.push(
      prisma.client
        .findMany({ where: { organizationId: org, deletedAt: null, OR: [{ firstName: ci(term) }, { lastName: ci(term) }, { company: ci(term) }, { email: ci(term) }, { ref: ci(term) }] }, take: limit })
        .then((r) => r.map((c) => ({ type: 'Clients', id: c.id, title: fullName(c), subtitle: [c.company, c.ref].filter(Boolean).join(' · '), href: `/clients/${c.id}` }))),
    )
  if (ctx.can('leads'))
    jobs.push(
      prisma.lead
        .findMany({ where: { organizationId: org, deletedAt: null, OR: [{ firstName: ci(term) }, { lastName: ci(term) }, { company: ci(term) }, { email: ci(term) }, { ref: ci(term) }] }, take: limit })
        .then((r) => r.map((l) => ({ type: 'Leads', id: l.id, title: fullName(l), subtitle: [l.serviceRequested, l.ref].filter(Boolean).join(' · '), href: `/leads/${l.id}` }))),
    )
  if (ctx.can('projects'))
    jobs.push(
      prisma.project
        .findMany({ where: { ...scopeWhere(ctx, RESOURCES.projects), AND: [{ OR: [{ name: ci(term) }, { ref: ci(term) }, { location: ci(term) }] }] }, take: limit })
        .then((r) => r.map((p) => ({ type: 'Projects', id: p.id, title: p.name, subtitle: p.ref, href: `/projects/${p.id}` }))),
    )
  if (ctx.can('events'))
    jobs.push(
      prisma.event
        .findMany({ where: { ...scopeWhere(ctx, RESOURCES.events), AND: [{ OR: [{ name: ci(term) }, { ref: ci(term) }, { venue: ci(term) }] }] }, take: limit })
        .then((r) => r.map((e) => ({ type: 'Events', id: e.id, title: e.name, subtitle: [e.venue, e.ref].filter(Boolean).join(' · '), href: `/events/${e.id}` }))),
    )
  if (ctx.can('stays'))
    jobs.push(
      prisma.stay
        .findMany({ where: { organizationId: org, deletedAt: null, OR: [{ title: ci(term) }, { destination: ci(term) }, { ref: ci(term) }] }, take: limit })
        .then((r) => r.map((s) => ({ type: 'Stays', id: s.id, title: s.title, subtitle: s.destination, href: `/stays/${s.id}` }))),
    )
  if (ctx.can('concierge'))
    jobs.push(
      prisma.conciergeRequest
        .findMany({ where: { organizationId: org, deletedAt: null, OR: [{ title: ci(term) }, { ref: ci(term) }] }, take: limit })
        .then((r) => r.map((s) => ({ type: 'Concierge', id: s.id, title: s.title, subtitle: s.ref, href: `/concierge/${s.id}` }))),
    )
  if (ctx.can('partners'))
    jobs.push(
      prisma.partner
        .findMany({ where: { organizationId: org, deletedAt: null, OR: [{ companyName: ci(term) }, { contactName: ci(term) }, { ref: ci(term) }] }, take: limit })
        .then((r) => r.map((p) => ({ type: 'Partners', id: p.id, title: p.companyName, subtitle: p.category, href: `/partners/${p.id}` }))),
    )
  if (ctx.can('suppliers'))
    jobs.push(
      prisma.supplier
        .findMany({ where: { organizationId: org, deletedAt: null, OR: [{ companyName: ci(term) }, { servicesOffered: ci(term) }, { ref: ci(term) }, { city: ci(term) }] }, take: limit, include: { categories: true } })
        .then((r) => r.map((s) => ({ type: 'Suppliers', id: s.id, title: s.companyName, subtitle: s.categories.map((c) => c.name).join(', '), href: `/suppliers/${s.id}` }))),
    )
  if (ctx.can('services'))
    jobs.push(
      prisma.service
        .findMany({ where: { organizationId: org, deletedAt: null, OR: [{ name: ci(term) }, { ref: ci(term) }, { category: ci(term) }] }, take: limit })
        .then((r) => r.map((s) => ({ type: 'Services', id: s.id, title: s.name, subtitle: s.category, href: `/services/${s.id}` }))),
    )
  if (ctx.can('tasks'))
    jobs.push(
      prisma.task
        .findMany({ where: { ...scopeWhere(ctx, RESOURCES.tasks), AND: [{ OR: [{ title: ci(term) }, { ref: ci(term) }] }] }, take: limit })
        .then((r) => r.map((t) => ({ type: 'Tasks', id: t.id, title: t.title, subtitle: t.ref, href: `/tasks/${t.id}` }))),
    )
  if (ctx.can('quotes'))
    jobs.push(
      prisma.quotation
        .findMany({ where: { organizationId: org, deletedAt: null, OR: [{ title: ci(term) }, { ref: ci(term) }] }, take: limit })
        .then((r) => r.map((t) => ({ type: 'Quotes', id: t.id, title: t.title ?? t.ref, subtitle: t.ref, href: `/quotes/${t.id}` }))),
    )
  if (ctx.can('invoices'))
    jobs.push(
      prisma.invoice
        .findMany({ where: { organizationId: org, deletedAt: null, ref: ci(term) }, take: limit, include: { client: true } })
        .then((r) => r.map((t) => ({ type: 'Invoices', id: t.id, title: t.ref, subtitle: fullName(t.client), href: `/invoices/${t.id}` }))),
    )
  if (ctx.can('documents'))
    jobs.push(
      prisma.document
        .findMany({ where: { organizationId: org, deletedAt: null, next: null, name: ci(term) }, take: limit })
        .then((r) => r.map((d) => ({ type: 'Documents', id: d.id, title: d.name, subtitle: d.category, href: `/documents?q=${encodeURIComponent(d.name)}` }))),
    )
  return (await Promise.all(jobs)).flat()
}
