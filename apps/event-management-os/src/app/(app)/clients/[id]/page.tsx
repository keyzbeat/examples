import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Building2, Globe2, Mail, MapPin, Phone, Heart, KeyRound } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { getRecord } from '@/lib/resources/server'
import { prepareForm } from '@/lib/resources/page'
import { RESOURCES } from '@/lib/resources/registry'
import { prisma } from '@/lib/prisma'
import { CLIENT_STATUS, CLIENT_TYPE, EVENT_STATUS, INVOICE_STATUS, LANGUAGES, PAYMENT_STATUS, PROJECT_STATUS, QUOTE_STATUS, STAY_STATUS, CONCIERGE_STATUS, DOCUMENT_CATEGORY, LEAD_STAGE, labelOf } from '@/lib/options'
import { computeTotals, formatMoney } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { hrefWith, sp, type SP } from '@/lib/url'
import { fullName } from '@/lib/utils'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { OptBadge } from '@/components/ui/badge'
import { Avatar, UserChip } from '@/components/ui/avatar'
import { LinkTabs } from '@/components/ui/tabs'
import { DetailHeader, InfoGrid, Stat } from '@/components/resource/detail'
import { ResourceSheet, DeleteButton } from '@/components/resource/resource-sheet'
import { Crumb } from '@/components/shell/shell-context'
import { InteractionComposer } from '@/components/crm/interactions'
import { InteractionHistory } from '@/components/crm/history'
import { Progress } from '@/components/ui/progress'
import { Table, THead, Th, Tr, Td, TitleCell } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import type { Client } from '@prisma/client'

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const ctx = await requirePage('clients')
  const { id } = await params
  const query = await searchParams
  const tab = sp(query, 'tab') ?? 'overview'
  const client = await getRecord<Client & { owner: { name: string; color: string } | null; contacts: { id: string; name: string; role: string | null; email: string | null; phone: string | null }[] }>(ctx, RESOURCES.clients, id, { owner: { select: { name: true, color: true } }, contacts: true })
  if (!client) notFound()
  const org = ctx.org.id
  const nd = { deletedAt: null, organizationId: org }
  const [projects, events, stays, concierge, quotes, invoices, documents, interactions, leads, portalUsers, form, projectForm] = await Promise.all([
    prisma.project.findMany({ where: { ...nd, clientId: id }, orderBy: { startDate: 'desc' }, include: { manager: { select: { name: true, color: true } } } }),
    prisma.event.findMany({ where: { ...nd, clientId: id }, orderBy: { date: 'desc' } }),
    prisma.stay.findMany({ where: { ...nd, clientId: id }, orderBy: { checkIn: 'desc' } }),
    prisma.conciergeRequest.findMany({ where: { ...nd, clientId: id }, orderBy: { createdAt: 'desc' } }),
    ctx.can('quotes') ? prisma.quotation.findMany({ where: { ...nd, clientId: id }, orderBy: { issueDate: 'desc' }, include: { items: true } }) : [],
    ctx.can('invoices') ? prisma.invoice.findMany({ where: { ...nd, clientId: id }, orderBy: { issueDate: 'desc' }, include: { items: true, payments: true } }) : [],
    ctx.can('documents') ? prisma.document.findMany({ where: { ...nd, clientId: id, next: null }, orderBy: { createdAt: 'desc' } }) : [],
    prisma.interaction.findMany({ where: { clientId: id }, orderBy: { occurredAt: 'desc' }, include: { user: { select: { name: true } } } }),
    ctx.can('leads') ? prisma.lead.findMany({ where: { ...nd, clientId: id } }) : [],
    prisma.user.findMany({ where: { clientId: id, deletedAt: null }, select: { id: true, email: true, active: true, lastLoginAt: true } }),
    prepareForm(ctx, 'clients', client as unknown as Record<string, unknown>),
    prepareForm(ctx, 'projects', null, { clientId: id, managerId: ctx.user.id }),
  ])
  const cur = ctx.org.currency
  const invoiced = invoices.reduce((a, i) => a + computeTotals(i.items).total, 0)
  const paid = invoices.flatMap((i) => i.payments).filter((p) => p.status === 'PAID' && p.direction === 'INCOMING').reduce((a, p) => a + p.amount, 0)
  const base = `/clients/${id}`
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'projects', label: 'Projects & events', count: projects.length + events.length },
    { key: 'stays', label: 'Stays & requests', count: stays.length + concierge.length },
    ...(ctx.can('quotes') ? [{ key: 'finance', label: 'Quotes, invoices & payments', count: quotes.length + invoices.length }] : []),
    ...(ctx.can('documents') ? [{ key: 'documents', label: 'Documents', count: documents.length }] : []),
    { key: 'history', label: 'Communication', count: interactions.length },
  ].map((t) => ({ ...t, href: hrefWith(base, query, { tab: t.key === 'overview' ? null : t.key }) }))
  const name = fullName(client)

  return (
    <>
      <Crumb label={name} />
      <DetailHeader
        leading={<Avatar name={name} color="#C9B8AA" size="lg" />}
        refLabel={client.ref}
        title={name}
        badges={
          <>
            <OptBadge options={CLIENT_STATUS} value={client.status} />
            <OptBadge options={CLIENT_TYPE} value={client.type} dot={false} />
          </>
        }
        meta={
          <>
            {client.company && <span className="inline-flex items-center gap-1"><Building2 /> {client.company}</span>}
            {(client.city || client.country) && <span className="inline-flex items-center gap-1"><MapPin /> {[client.city, client.country].filter(Boolean).join(', ')}</span>}
            <span className="inline-flex items-center gap-1"><Globe2 /> {labelOf(LANGUAGES, client.language)}</span>
          </>
        }
        actions={
          ctx.can('clients', 'write') && (
            <>
              {ctx.can('projects', 'write') && <ResourceSheet {...projectForm} title="New project for this client" triggerLabel="New project" triggerVariant="secondary" />}
              <ResourceSheet {...form} title="Edit client" triggerLabel="Edit" triggerVariant="secondary" icon="edit" />
              {ctx.can('clients', 'delete') && <DeleteButton resource="clients" id={client.id} redirectTo="/clients" size="icon-sm" />}
            </>
          )
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Projects" value={projects.length} hint={`${projects.filter((p) => !['COMPLETED', 'CANCELLED'].includes(p.status)).length} active`} />
        <Stat label="Events & stays" value={events.length + stays.length} />
        {ctx.can('invoices') ? <Stat label="Invoiced" value={formatMoney(invoiced, cur)} /> : <Stat label="Concierge requests" value={concierge.length} />}
        {ctx.can('invoices') ? <Stat label="Outstanding" value={formatMoney(invoiced - paid, cur)} hint={`${formatMoney(paid, cur)} paid`} /> : <Stat label="Interactions" value={interactions.length} />}
      </div>
      <LinkTabs tabs={tabs} active={tab} />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Profile" />
            <CardBody>
              <InfoGrid
                items={[
                  { label: 'Email', value: client.email && <a href={`mailto:${client.email}`} className="hover:text-coral-dark">{client.email}</a> },
                  { label: 'Phone', value: client.phone },
                  { label: 'WhatsApp', value: client.whatsapp && <a target="_blank" rel="noreferrer" className="hover:text-coral-dark" href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`}>{client.whatsapp}</a> },
                  { label: 'Language', value: labelOf(LANGUAGES, client.language) },
                  { label: 'Address', value: [client.address, client.city, client.country].filter(Boolean).join(', '), wide: true },
                  { label: 'Account owner', value: <UserChip user={client.owner} /> },
                  { label: 'Client since', value: formatDate(client.createdAt) },
                  { label: 'Internal notes', value: client.notes, wide: true },
                ]}
              />
            </CardBody>
          </Card>
          <div className="space-y-4">
            <Card>
              <CardHeader title="Preferences & requests" icon={<Heart />} />
              <CardBody>
                <p className="text-[13px] whitespace-pre-line text-ink/90">{client.preferences || <span className="text-muted">No preferences recorded.</span>}</p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Client portal access" icon={<KeyRound />} action={<Link href="/portal-access" className="text-xs text-muted hover:text-coral-dark">Manage</Link>} />
              <CardBody className="text-[13px]">
                {portalUsers.length === 0 ? <span className="text-muted">No portal account yet.</span> : portalUsers.map((u) => <div key={u.id} className="flex justify-between"><span>{u.email}</span><span className="text-muted">{u.lastLoginAt ? `Last login ${formatDate(u.lastLoginAt)}` : 'Never logged in'}</span></div>)}
              </CardBody>
            </Card>
            {leads.length > 0 && (
              <Card>
                <CardHeader title="Originating leads" />
                <ul className="divide-y divide-line">
                  {leads.map((l) => (
                    <li key={l.id} className="flex items-center justify-between px-4 py-2 text-[13px]">
                      <Link href={`/leads/${l.id}`} className="hover:text-coral-dark">{l.ref} · {l.serviceRequested}</Link>
                      <OptBadge options={LEAD_STAGE} value={l.stage} />
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === 'projects' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Projects" />
            {projects.length === 0 ? <EmptyState title="No projects yet" /> : (
              <Table>
                <THead><Th>Project</Th><Th>Dates</Th><Th>Status</Th><Th className="w-40">Progress</Th><Th>Manager</Th><Th className="text-right">Budget</Th></THead>
                <tbody>
                  {projects.map((p) => (
                    <Tr key={p.id}>
                      <Td><TitleCell href={`/projects/${p.id}`} title={p.name} subtitle={p.ref} /></Td>
                      <Td className="whitespace-nowrap">{formatDate(p.startDate)}</Td>
                      <Td><OptBadge options={PROJECT_STATUS} value={p.status} /></Td>
                      <Td><Progress value={p.progress} /></Td>
                      <Td><UserChip user={p.manager} /></Td>
                      <Td className="tabular text-right">{formatMoney(p.budget, cur)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
          <Card>
            <CardHeader title="Events" />
            {events.length === 0 ? <EmptyState title="No events yet" /> : (
              <Table>
                <THead><Th>Event</Th><Th>Date</Th><Th>Venue</Th><Th>Guests</Th><Th>Status</Th></THead>
                <tbody>
                  {events.map((e) => (
                    <Tr key={e.id}>
                      <Td><TitleCell href={`/events/${e.id}`} title={e.name} subtitle={e.ref} /></Td>
                      <Td>{formatDate(e.date)}</Td>
                      <Td className="text-muted">{e.venue ?? e.location ?? '—'}</Td>
                      <Td className="tabular">{e.guestCount ?? '—'}</Td>
                      <Td><OptBadge options={EVENT_STATUS} value={e.status} /></Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {tab === 'stays' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Stays" />
            {stays.length === 0 ? <EmptyState title="No stays yet" /> : (
              <Table>
                <THead><Th>Stay</Th><Th>Destination</Th><Th>Dates</Th><Th>Travellers</Th><Th>Status</Th></THead>
                <tbody>
                  {stays.map((s) => (
                    <Tr key={s.id}>
                      <Td><TitleCell href={`/stays/${s.id}`} title={s.title} subtitle={s.ref} /></Td>
                      <Td>{s.destination}</Td>
                      <Td className="whitespace-nowrap">{formatDate(s.checkIn, { day: 'numeric', month: 'short' })} → {formatDate(s.checkOut)}</Td>
                      <Td className="tabular">{s.travelers}</Td>
                      <Td><OptBadge options={STAY_STATUS} value={s.status} /></Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
          <Card>
            <CardHeader title="Concierge requests" />
            {concierge.length === 0 ? <EmptyState title="No requests yet" /> : (
              <Table>
                <THead><Th>Request</Th><Th>Category</Th><Th>Requested for</Th><Th>Status</Th></THead>
                <tbody>
                  {concierge.map((c) => (
                    <Tr key={c.id}>
                      <Td><TitleCell href={`/concierge/${c.id}`} title={c.title} subtitle={c.ref} /></Td>
                      <Td>{c.category}</Td>
                      <Td>{formatDate(c.requestedDate)}</Td>
                      <Td><OptBadge options={CONCIERGE_STATUS} value={c.status} /></Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {tab === 'finance' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Quotes" />
            {quotes.length === 0 ? <EmptyState title="No quotes yet" /> : (
              <Table>
                <THead><Th>Quote</Th><Th>Issued</Th><Th>Expires</Th><Th>Status</Th><Th className="text-right">Total</Th></THead>
                <tbody>
                  {quotes.map((q) => (
                    <Tr key={q.id}>
                      <Td><TitleCell href={`/quotes/${q.id}`} title={q.title ?? q.ref} subtitle={q.ref} /></Td>
                      <Td>{formatDate(q.issueDate)}</Td>
                      <Td>{formatDate(q.expiryDate)}</Td>
                      <Td><OptBadge options={QUOTE_STATUS} value={q.status} /></Td>
                      <Td className="tabular text-right">{formatMoney(computeTotals(q.items, q.discountPct).total, cur)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
          <Card>
            <CardHeader title="Invoices & payments" />
            {invoices.length === 0 ? <EmptyState title="No invoices yet" /> : (
              <Table>
                <THead><Th>Invoice</Th><Th>Issued</Th><Th>Due</Th><Th>Status</Th><Th className="text-right">Total</Th><Th className="text-right">Paid</Th><Th>Payments</Th></THead>
                <tbody>
                  {invoices.map((i) => {
                    const total = computeTotals(i.items).total
                    const p = i.payments.filter((x) => x.status === 'PAID').reduce((a, x) => a + x.amount, 0)
                    return (
                      <Tr key={i.id}>
                        <Td><TitleCell href={`/invoices/${i.id}`} title={i.ref} /></Td>
                        <Td>{formatDate(i.issueDate)}</Td>
                        <Td>{formatDate(i.dueDate)}</Td>
                        <Td><OptBadge options={INVOICE_STATUS} value={i.status} /></Td>
                        <Td className="tabular text-right">{formatMoney(total, cur)}</Td>
                        <Td className="tabular text-right">{formatMoney(p, cur)}</Td>
                        <Td>{i.payments.map((x) => <OptBadge key={x.id} options={PAYMENT_STATUS} value={x.status} dot={false} />)}</Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {tab === 'documents' && (
        <Card>
          <CardHeader title="Documents" action={<Link href={`/documents?clientId=${id}`} className="text-xs text-muted hover:text-coral-dark">Open in library</Link>} />
          {documents.length === 0 ? <EmptyState title="No documents" /> : (
            <ul className="divide-y divide-line">
              {documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                  <a href={`/api/documents/${d.id}`} className="hover:text-coral-dark">{d.name}</a>
                  <span className="flex items-center gap-3 text-muted">
                    <OptBadge options={DOCUMENT_CATEGORY} value={d.category} dot={false} />
                    {formatDate(d.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'history' && (
        <Card>
          <CardHeader title="Communication history" />
          <CardBody className="space-y-5">
            {ctx.can('clients', 'write') && <InteractionComposer target="client" id={id} />}
            <InteractionHistory items={interactions} />
          </CardBody>
        </Card>
      )}
      <ContactsList contacts={client.contacts} />
    </>
  )
}

function ContactsList({ contacts }: { contacts: { id: string; name: string; role: string | null; email: string | null; phone: string | null }[] }) {
  if (!contacts.length) return null
  return (
    <Card className="mt-4">
      <CardHeader title="Additional contacts" />
      <ul className="divide-y divide-line">
        {contacts.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-4 px-4 py-2.5 text-[13px]">
            <span className="font-medium">{c.name}</span>
            <span className="text-muted">{c.role}</span>
            {c.email && <span className="inline-flex items-center gap-1"><Mail className="size-3.5 text-muted" />{c.email}</span>}
            {c.phone && <span className="inline-flex items-center gap-1"><Phone className="size-3.5 text-muted" />{c.phone}</span>}
          </li>
        ))}
      </ul>
    </Card>
  )
}

