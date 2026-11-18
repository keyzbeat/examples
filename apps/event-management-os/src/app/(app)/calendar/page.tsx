import { CalendarDays } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prisma } from '@/lib/prisma'
import { prepareForm } from '@/lib/resources/page'
import { loadRelationOptions, scopeWhere } from '@/lib/resources/server'
import { RESOURCES } from '@/lib/resources/registry'
import { sp, type SP } from '@/lib/url'
import { addDays, toDateInput } from '@/lib/dates'
import { fullName } from '@/lib/utils'
import { AppHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { CalendarView, type CalItem } from '@/components/calendar/calendar-view'

export const metadata = { title: 'Calendar' }

export default async function CalendarPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requirePage('calendar')
  const params = await searchParams
  const view = (sp(params, 'view') ?? 'month') as 'month' | 'week' | 'day' | 'list'
  const anchor = sp(params, 'date') && /^\d{4}-\d{2}-\d{2}$/.test(sp(params, 'date')!) ? sp(params, 'date')! : toDateInput(new Date())
  const owner = sp(params, 'owner')
  const type = sp(params, 'type')
  const a = new Date(`${anchor}T00:00:00`)
  // Broad window around the anchor (covers month grid / 4-week list).
  const from = addDays(new Date(a.getFullYear(), a.getMonth(), 1), -7)
  const to = addDays(new Date(a.getFullYear(), a.getMonth() + 1, 1), 35)
  const org = ctx.org.id
  const want = (t: string) => !type || type === t
  const [cal, tasks, followUps, events, reservations, options, form] = await Promise.all([
    want('MEETING') || want('DEADLINE') || want('DELIVERY') || want('FOLLOW_UP') || want('RESERVATION') ? prisma.calendarEvent.findMany({ where: { ...scopeWhere(ctx, RESOURCES.calendar), start: { gte: from, lt: to }, ...(owner ? { ownerId: owner } : {}), ...(type ? { type: type as 'MEETING' } : {}) } }) : [],
    want('TASK') && ctx.can('tasks') ? prisma.task.findMany({ where: { ...scopeWhere(ctx, RESOURCES.tasks), parentId: null, dueDate: { gte: from, lt: to }, status: { notIn: ['CANCELLED'] }, ...(owner ? { assigneeId: owner } : {}) } }) : [],
    want('FOLLOW_UP') && ctx.can('leads') ? prisma.lead.findMany({ where: { organizationId: org, deletedAt: null, nextFollowUp: { gte: from, lt: to }, stage: { notIn: ['WON', 'LOST', 'ARCHIVED'] }, ...(owner ? { assignedToId: owner } : {}) } }) : [],
    want('EVENT') && ctx.can('events') && !owner ? prisma.event.findMany({ where: { ...scopeWhere(ctx, RESOURCES.events), date: { gte: from, lt: to } } }) : [],
    want('RESERVATION') && ctx.can('stays') && !owner ? prisma.reservation.findMany({ where: { organizationId: org, date: { gte: from, lt: to }, status: { not: 'CANCELLED' } } }) : [],
    loadRelationOptions(ctx, ['user', 'project', 'client']),
    prepareForm(ctx, 'calendar', null, { ownerId: owner ?? ctx.user.id }),
  ])
  const items: CalItem[] = [
    ...cal.map((c) => ({ id: c.id, kind: 'calendar' as const, type: c.type, title: c.title, start: c.start.toISOString(), end: c.end?.toISOString(), allDay: c.allDay, href: c.projectId ? `/projects/${c.projectId}` : c.clientId ? `/clients/${c.clientId}` : `/calendar?view=day&date=${toDateInput(c.start)}` })),
    ...tasks.map((t) => ({ id: t.id, kind: 'task' as const, type: 'TASK', title: t.title, start: t.dueDate!.toISOString(), href: `/tasks/${t.id}` })),
    ...followUps.map((l) => ({ id: l.id, kind: 'followup' as const, type: 'FOLLOW_UP', title: `Follow-up · ${fullName(l)}`, start: l.nextFollowUp!.toISOString(), href: `/leads/${l.id}` })),
    ...events.map((e) => ({ id: e.id, kind: 'event' as const, type: 'EVENT', title: e.name, start: e.date!.toISOString(), allDay: true, href: `/events/${e.id}` })),
    ...reservations.map((r) => ({ id: r.id, kind: 'reservation' as const, type: 'RESERVATION', title: r.title, start: (r.time ? new Date(`${toDateInput(r.date)}T${r.time}`) : r.date).toISOString(), href: r.stayId ? `/stays/${r.stayId}` : r.eventId ? `/events/${r.eventId}?tab=logistics` : '/stays' })),
  ]
  return (
    <>
      <AppHeader icon={<CalendarDays />} title="Calendar" description="Meetings, events, tasks, follow-ups, reservations, deadlines and deliveries — one view for the whole team" />
      <Card className="overflow-hidden">
        <CalendarView items={items} view={view} anchor={anchor} users={options.user ?? []} canWrite={ctx.can('calendar', 'write')} form={{ ...form, options }} />
      </Card>
      <p className="mt-3 text-xs text-muted">Calendar items carry <code>externalProvider</code>/<code>externalId</code> columns so a Google Calendar sync can be added later — the sync itself is not implemented yet.</p>
    </>
  )
}
