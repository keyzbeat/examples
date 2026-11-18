import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, Clock, MapPin, Users, User, Palette, Wallet, ListChecks, FolderKanban, Image as ImageIcon, Truck } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { getRecord, loadRelationOptions } from '@/lib/resources/server'
import { prepareForm } from '@/lib/resources/page'
import { RESOURCES } from '@/lib/resources/registry'
import { prisma } from '@/lib/prisma'
import { EVENT_STATUS, PROJECT_TYPE, RESERVATION_STATUS, RESERVATION_TYPE, APPROVAL_STATUS } from '@/lib/options'
import { formatMoney } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { hrefWith, sp, type SP } from '@/lib/url'
import { fullName } from '@/lib/utils'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { OptBadge } from '@/components/ui/badge'
import { LinkTabs } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/empty-state'
import { DetailHeader, InfoGrid, Stat } from '@/components/resource/detail'
import { ResourceSheet, DeleteButton } from '@/components/resource/resource-sheet'
import { Crumb } from '@/components/shell/shell-context'
import { TaskListMini } from '@/components/tasks/task-list-mini'
import { ServiceLines } from '@/components/projects/service-lines'
import { TeamManager } from '@/components/projects/collab'
import { TimelineEditor } from '@/components/events/timeline-editor'
import { GuestList } from '@/components/events/guest-list'
import type { Event } from '@prisma/client'

export default async function EventPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const ctx = await requirePage('events')
  const { id } = await params
  const query = await searchParams
  const tab = sp(query, 'tab') ?? 'overview'
  const event = await getRecord<Event & { client: { id: string; firstName: string; lastName: string } | null; project: { id: string; name: string; ref: string } | null }>(ctx, RESOURCES.events, id, { client: { select: { id: true, firstName: true, lastName: true } }, project: { select: { id: true, name: true, ref: true } } })
  if (!event) notFound()
  const org = ctx.org.id
  const [timeline, guests, lines, members, tasks, reservations, moodboards, approvals, catalog, opts, form, taskForm, resForm] = await Promise.all([
    prisma.eventTimelineItem.findMany({ where: { eventId: id } }),
    prisma.guest.findMany({ where: { eventId: id }, orderBy: { name: 'asc' } }),
    prisma.projectService.findMany({ where: { eventId: id }, include: { service: { include: { supplier: { select: { companyName: true, id: true } } } } } }),
    prisma.eventMember.findMany({ where: { eventId: id }, include: { user: { select: { name: true, color: true, title: true } } } }),
    prisma.task.findMany({ where: { eventId: id, deletedAt: null }, orderBy: { dueDate: 'asc' }, include: { assignee: { select: { name: true, color: true } } } }),
    prisma.reservation.findMany({ where: { eventId: id }, orderBy: { date: 'asc' }, include: { supplier: { select: { companyName: true } } } }),
    prisma.document.findMany({ where: { organizationId: org, deletedAt: null, next: null, OR: [{ eventId: id }, ...(event.projectId ? [{ projectId: event.projectId, category: 'MOODBOARD' }] : [])], mimeType: { startsWith: 'image/' } } }),
    event.projectId ? prisma.approval.findMany({ where: { projectId: event.projectId, category: { in: ['CONCEPT', 'MOODBOARD'] } } }) : [],
    prisma.service.findMany({ where: { organizationId: org, deletedAt: null, status: 'ACTIVE' }, include: { supplier: { select: { status: true } } }, orderBy: { name: 'asc' } }),
    loadRelationOptions(ctx, ['user']),
    prepareForm(ctx, 'events', event as unknown as Record<string, unknown>),
    prepareForm(ctx, 'tasks', null, { eventId: id, projectId: event.projectId, clientId: event.clientId }),
    prepareForm(ctx, 'reservations', null, { date: event.date, location: event.venue }),
  ])
  const canWrite = ctx.can('events', 'write')
  const cur = ctx.org.currency
  const planned = lines.reduce((a, l) => ({ price: a.price + l.quantity * l.unitPrice, cost: a.cost + l.quantity * l.unitCost }), { price: 0, cost: 0 })
  const accepted = guests.filter((g) => g.rsvp === 'ACCEPTED').reduce((a, g) => a + 1 + g.plusOnes, 0)
  const base = `/events/${id}`
  const suppliers = [...new Map(lines.filter((l) => l.service.supplier).map((l) => [l.service.supplier!.id, l.service.supplier!])).values()]
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'design', label: 'Concept & design' },
    { key: 'services', label: 'Services & budget', count: lines.length },
    { key: 'timeline', label: 'Run-of-show', count: timeline.length },
    { key: 'guests', label: 'Guests', count: guests.length },
    { key: 'logistics', label: 'Logistics & team', count: reservations.length + members.length },
  ].map((t) => ({ ...t, href: hrefWith(base, query, { tab: t.key === 'overview' ? null : t.key }) }))

  return (
    <>
      <Crumb label={event.name} />
      <DetailHeader
        refLabel={event.ref}
        title={event.name}
        badges={<><OptBadge options={EVENT_STATUS} value={event.status} /><OptBadge options={PROJECT_TYPE} value={event.type} dot={false} /></>}
        meta={
          <>
            {event.date && <span className="inline-flex items-center gap-1"><CalendarDays /> {formatDate(event.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>}
            {event.startTime && <span className="inline-flex items-center gap-1"><Clock /> {event.startTime}{event.endTime && ` – ${event.endTime}`}</span>}
            {(event.venue || event.location) && <span className="inline-flex items-center gap-1"><MapPin /> {[event.venue, event.location].filter(Boolean).join(', ')}</span>}
            {event.client && <Link href={`/clients/${event.client.id}`} className="inline-flex items-center gap-1 hover:text-coral-dark"><User /> {fullName(event.client)}</Link>}
          </>
        }
        actions={canWrite && (<><ResourceSheet {...form} title="Edit event" triggerLabel="Edit" triggerVariant="secondary" icon="edit" />{ctx.can('events', 'delete') && <DeleteButton resource="events" id={id} redirectTo="/events" size="icon-sm" />}</>)}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Guests expected" value={event.guestCount ?? '—'} hint={`${accepted} confirmed · ${guests.length} listed`} />
        <Stat label="Budget" value={formatMoney(event.budget, cur)} />
        <Stat label="Planned selling price" value={formatMoney(planned.price, cur)} />
        {ctx.can('finance') ? <Stat label="Supplier costs" value={formatMoney(planned.cost, cur)} hint={planned.price ? `Margin ${Math.round(((planned.price - planned.cost) / planned.price) * 100)}%` : undefined} /> : <Stat label="Services" value={lines.length} />}
        <Stat label="Run-of-show" value={`${timeline.filter((t) => t.done).length}/${timeline.length}`} hint="steps completed" />
      </div>
      <LinkTabs tabs={tabs} active={tab} />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Event information" />
            <CardBody>
              <InfoGrid cols={3} items={[
                { label: 'Event type', value: <OptBadge options={PROJECT_TYPE} value={event.type} dot={false} /> },
                { label: 'Client', value: event.client && <Link className="hover:text-coral-dark" href={`/clients/${event.client.id}`}>{fullName(event.client)}</Link> },
                { label: 'Project', value: event.project && <Link className="hover:text-coral-dark" href={`/projects/${event.project.id}`}>{event.project.name}</Link> },
                { label: 'Date', value: formatDate(event.date) },
                { label: 'Time', value: event.startTime ? `${event.startTime}${event.endTime ? ` – ${event.endTime}` : ''}` : null },
                { label: 'Guest count', value: event.guestCount },
                { label: 'Venue', value: event.venue },
                { label: 'Location', value: event.location },
                { label: 'Theme', value: event.theme },
                { label: 'Logistics', value: event.logistics, wide: true },
              ]} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Tasks" icon={<ListChecks />} action={ctx.can('tasks', 'write') && <ResourceSheet {...taskForm} parents={{ eventId: id }} navigateOnCreate={false} title="New task" triggerLabel="Add" triggerSize="sm" triggerVariant="secondary" />} />
            <TaskListMini tasks={tasks} canWrite={ctx.can('tasks', 'write')} />
          </Card>
        </div>
      )}

      {tab === 'design' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Concept" icon={<Palette />} />
            <CardBody className="space-y-5">
              <InfoGrid items={[{ label: 'Theme', value: event.theme, wide: true }, { label: 'Concept & decoration', value: event.concept, wide: true }]} />
              <div>
                <p className="mb-2 text-[11.5px] font-medium text-muted">Color palette</p>
                {event.palette.length ? (
                  <div className="flex flex-wrap gap-3">
                    {event.palette.map((c) => (
                      <div key={c} className="w-24 overflow-hidden rounded-xl border border-line">
                        <div className="h-16" style={{ background: c }} />
                        <div className="tabular px-2 py-1.5 text-xs uppercase">{c}</div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted">No palette defined — edit the event to add hex colors.</p>}
              </div>
              <div>
                <p className="mb-2 text-[11.5px] font-medium text-muted">Moodboard & inspirations</p>
                {moodboards.length ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {moodboards.map((d) => (
                      <a key={d.id} href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-xl border border-line">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/documents/${d.id}?inline=1`} alt={d.name} className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.02]" />
                        <p className="truncate px-2 py-1.5 text-xs">{d.name}</p>
                      </a>
                    ))}
                  </div>
                ) : <EmptyState icon={<ImageIcon />} title="No moodboard images" description="Upload images in Documents (category Moodboard) linked to this event or its project." />}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Client approvals" description="Concept & moodboard decisions from the portal" />
            {approvals.length === 0 ? <EmptyState title="No design approvals yet" /> : (
              <ul className="divide-y divide-line">
                {approvals.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-[13px]">
                    <span>{a.title}</span>
                    <OptBadge options={APPROVAL_STATUS} value={a.status} />
                  </li>
                ))}
              </ul>
            )}
            {event.project && <div className="border-t border-line px-4 py-2.5 text-xs"><Link className="text-coral-dark hover:underline" href={`/projects/${event.project.id}?tab=portal`}>Request a new approval →</Link></div>}
          </Card>
        </div>
      )}

      {tab === 'services' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Event services" description="Catering, decoration, furniture, lighting, sound, photography, entertainment, transport…" icon={<Wallet />} />
            <ServiceLines target="event" targetId={id} canWrite={canWrite} currency={cur} showCosts={ctx.can('finance') || ctx.can('services', 'write')}
              lines={lines.map((l) => ({ id: l.id, name: l.service.name, category: l.service.category, unit: l.service.unit, supplier: l.service.supplier?.companyName ?? null, quantity: l.quantity, unitCost: l.unitCost, unitPrice: l.unitPrice }))}
              catalog={catalog.map((s) => ({ value: s.id, label: s.name, hint: `${s.category} · ${formatMoney(s.price, cur)} / ${s.unit}`, disabled: s.supplier?.status === 'SUSPENDED' || s.supplier?.status === 'ARCHIVED' }))} />
          </Card>
          {ctx.can('finance') && (
            <Card>
              <CardHeader title="Event budget" />
              <CardBody>
                <InfoGrid cols={3} items={[
                  { label: 'Estimated budget', value: formatMoney(event.budget, cur) },
                  { label: 'Supplier costs', value: formatMoney(planned.cost, cur) },
                  { label: 'Selling prices', value: formatMoney(planned.price, cur) },
                  { label: 'Profit margin', value: `${formatMoney(planned.price - planned.cost, cur)} (${planned.price ? Math.round(((planned.price - planned.cost) / planned.price) * 100) : 0}%)` },
                  { label: 'Budget remaining', value: event.budget ? formatMoney(event.budget - planned.price, cur) : '—' },
                  { label: 'Payments & actual expenses', value: event.project ? <Link className="text-coral-dark hover:underline" href={`/projects/${event.project.id}?tab=finance`}>See project finance</Link> : 'Link a project to track payments' },
                ]} />
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {tab === 'timeline' && (
        <Card>
          <CardHeader title="Run-of-show" description="Setup, deliveries, staff arrivals, technical checks, guest arrival, program and breakdown" icon={<Clock />} />
          <TimelineEditor eventId={id} canWrite={canWrite} items={timeline} />
        </Card>
      )}

      {tab === 'guests' && (
        <Card>
          <CardHeader title="Guest management" description="RSVP, dietary preferences, seating and special requirements" icon={<Users />} />
          <GuestList eventId={id} canWrite={canWrite} guests={guests} />
        </Card>
      )}

      {tab === 'logistics' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Bookings & deliveries" icon={<Truck />} action={ctx.can('stays', 'write') && <ResourceSheet {...resForm} parents={{ eventId: id }} navigateOnCreate={false} title="New booking" triggerLabel="Add" triggerSize="sm" triggerVariant="secondary" />} />
            {reservations.length === 0 ? <EmptyState title="No bookings yet" description="Transport, deliveries, rentals…" /> : (
              <ul className="divide-y divide-line">
                {reservations.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
                    <div>
                      <p className="font-medium">{r.title}</p>
                      <p className="text-xs text-muted">{formatDate(r.date)} {r.time} · {r.supplier?.companyName ?? 'No supplier'}{r.confirmation && ` · ${r.confirmation}`}</p>
                    </div>
                    <span className="flex gap-1.5"><OptBadge options={RESERVATION_TYPE} value={r.type} dot={false} /><OptBadge options={RESERVATION_STATUS} value={r.status} /></span>
                  </li>
                ))}
              </ul>
            )}
            {suppliers.length > 0 && (
              <div className="border-t border-line px-4 py-3 text-[13px]">
                <p className="mb-1.5 text-[11.5px] font-medium text-muted">Suppliers involved</p>
                <div className="flex flex-wrap gap-1.5">{suppliers.map((s) => <Link key={s.id} href={`/suppliers/${s.id}`} className="rounded-md border border-line px-2 py-0.5 text-xs hover:border-coral/40">{s.companyName}</Link>)}</div>
              </div>
            )}
          </Card>
          <Card>
            <CardHeader title="Event team" icon={<FolderKanban />} />
            <TeamManager target="event" targetId={id} canWrite={canWrite} users={opts.user ?? []} members={members.map((m) => ({ userId: m.userId, name: m.user.name, color: m.user.color, role: m.role, title: m.user.title }))} />
          </Card>
        </div>
      )}
    </>
  )
}
