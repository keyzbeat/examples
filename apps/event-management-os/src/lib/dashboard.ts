import 'server-only'
import { prisma } from '@/lib/prisma'
import type { Ctx } from '@/lib/auth/context'
import { addDays, endOfDay, startOfDay, startOfMonth } from '@/lib/dates'
import { scopeWhere } from '@/lib/resources/server'
import { RESOURCES } from '@/lib/resources/registry'

export async function getDashboard(ctx: Ctx) {
  const org = ctx.org.id
  const today = startOfDay()
  const in7 = endOfDay(addDays(today, 6))
  const in30 = addDays(today, 30)
  const monthStart = startOfMonth()
  const prevMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)
  const projectWhere = scopeWhere(ctx, RESOURCES.projects)
  const eventWhere = scopeWhere(ctx, RESOURCES.events)
  const canFinance = ctx.can('finance')

  const [
    totalClients,
    newClientsMonth,
    activeLeads,
    pipelineValue,
    activeProjects,
    upcomingEventsCount,
    pendingQuotes,
    pendingQuotesValue,
    overdueTasks,
    pendingPayments,
    revenueMonth,
    revenuePrevMonth,
    projects,
    myTasks,
    upcomingEvents,
    calendarItems,
    followUps,
    taskDeadlines,
    reservations,
    activity,
    pipeline,
  ] = await Promise.all([
    prisma.client.count({ where: { organizationId: org, deletedAt: null } }),
    prisma.client.count({ where: { organizationId: org, deletedAt: null, createdAt: { gte: monthStart } } }),
    prisma.lead.count({ where: { organizationId: org, deletedAt: null, stage: { notIn: ['WON', 'LOST', 'ARCHIVED'] } } }),
    prisma.lead.aggregate({ where: { organizationId: org, deletedAt: null, stage: { notIn: ['WON', 'LOST', 'ARCHIVED'] } }, _sum: { estimatedBudget: true } }),
    prisma.project.count({ where: { ...projectWhere, status: { in: ['PLANNING', 'CONFIRMED', 'IN_PROGRESS'] } } }),
    prisma.event.count({ where: { ...eventWhere, date: { gte: today, lt: in30 }, status: { not: 'CANCELLED' } } }),
    prisma.quotation.count({ where: { organizationId: org, deletedAt: null, status: { in: ['DRAFT', 'SENT'] } } }),
    prisma.quotation.findMany({ where: { organizationId: org, deletedAt: null, status: 'SENT' }, select: { discountPct: true, items: { select: { quantity: true, unitPrice: true, discountPct: true } } } }),
    prisma.task.count({ where: { ...scopeWhere(ctx, RESOURCES.tasks), dueDate: { lt: today }, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    canFinance ? prisma.payment.aggregate({ where: { organizationId: org, direction: 'INCOMING', status: 'PENDING' }, _sum: { amount: true }, _count: true }) : null,
    canFinance ? prisma.payment.aggregate({ where: { organizationId: org, direction: 'INCOMING', status: 'PAID', paidAt: { gte: monthStart } }, _sum: { amount: true } }) : null,
    canFinance ? prisma.payment.aggregate({ where: { organizationId: org, direction: 'INCOMING', status: 'PAID', paidAt: { gte: prevMonthStart, lt: monthStart } }, _sum: { amount: true } }) : null,
    prisma.project.findMany({
      where: { ...projectWhere, status: { in: ['PLANNING', 'CONFIRMED', 'IN_PROGRESS'] } },
      orderBy: [{ startDate: { sort: 'asc', nulls: 'last' } }],
      take: 6,
      include: { client: { select: { firstName: true, lastName: true, company: true } }, manager: { select: { name: true, color: true } } },
    }),
    prisma.task.findMany({
      where: { organizationId: org, deletedAt: null, assigneeId: ctx.user.id, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { priority: 'desc' }],
      take: 7,
      include: { project: { select: { name: true } }, lead: { select: { firstName: true, lastName: true } } },
    }),
    prisma.event.findMany({
      where: { ...eventWhere, date: { gte: today }, status: { not: 'CANCELLED' } },
      orderBy: { date: 'asc' },
      take: 5,
      include: { client: { select: { firstName: true, lastName: true } } },
    }),
    prisma.calendarEvent.findMany({ where: { ...scopeWhere(ctx, RESOURCES.calendar), start: { gte: today, lte: in7 } }, orderBy: { start: 'asc' }, take: 20 }),
    ctx.can('leads')
      ? prisma.lead.findMany({ where: { organizationId: org, deletedAt: null, nextFollowUp: { lte: in7 }, stage: { notIn: ['WON', 'LOST', 'ARCHIVED'] } }, orderBy: { nextFollowUp: 'asc' }, take: 10 })
      : [],
    prisma.task.findMany({ where: { ...scopeWhere(ctx, RESOURCES.tasks), dueDate: { gte: today, lte: in7 }, status: { notIn: ['COMPLETED', 'CANCELLED'] }, priority: { in: ['HIGH', 'URGENT'] } }, orderBy: { dueDate: 'asc' }, take: 10 }),
    ctx.can('stays') ? prisma.reservation.findMany({ where: { organizationId: org, date: { gte: today, lte: in7 }, status: { not: 'CANCELLED' } }, orderBy: { date: 'asc' }, take: 10 }) : [],
    prisma.activityLog.findMany({ where: { organizationId: org }, orderBy: { createdAt: 'desc' }, take: 8, include: { user: { select: { name: true, color: true } } } }),
    ctx.can('leads') ? prisma.lead.groupBy({ by: ['stage'], where: { organizationId: org, deletedAt: null }, _count: true, _sum: { estimatedBudget: true } }) : [],
  ])

  const sentQuotesValue = pendingQuotesValue.reduce((a, q) => a + q.items.reduce((s, it) => s + it.quantity * it.unitPrice * (1 - it.discountPct / 100), 0) * (1 - q.discountPct / 100), 0)

  type AgendaItem = { id: string; date: Date; title: string; kind: 'MEETING' | 'DEADLINE' | 'DELIVERY' | 'FOLLOW_UP' | 'TASK' | 'RESERVATION' | 'EVENT'; href: string; allDay?: boolean }
  const agenda: AgendaItem[] = [
    ...calendarItems.map((c) => ({ id: c.id, date: c.start, title: c.title, kind: c.type as AgendaItem['kind'], href: '/calendar', allDay: c.allDay })),
    ...followUps.map((l) => ({ id: l.id, date: l.nextFollowUp!, title: `Follow-up · ${l.firstName} ${l.lastName}`, kind: 'FOLLOW_UP' as const, href: `/leads/${l.id}` })),
    ...taskDeadlines.map((t) => ({ id: t.id, date: t.dueDate!, title: t.title, kind: 'TASK' as const, href: `/tasks/${t.id}` })),
    ...reservations.map((r) => ({ id: r.id, date: r.time ? new Date(`${r.date.toISOString().slice(0, 10)}T${r.time}`) : r.date, title: `${r.title}${r.status !== 'CONFIRMED' ? ' (to confirm)' : ''}`, kind: 'RESERVATION' as const, href: r.stayId ? `/stays/${r.stayId}` : '/stays' })),
    ...upcomingEvents.filter((e) => e.date && e.date <= in7).map((e) => ({ id: e.id, date: e.date!, title: e.name, kind: 'EVENT' as const, href: `/events/${e.id}`, allDay: true })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime())

  return {
    kpis: {
      totalClients,
      newClientsMonth,
      activeLeads,
      pipelineValue: pipelineValue._sum.estimatedBudget ?? 0,
      activeProjects,
      upcomingEvents: upcomingEventsCount,
      pendingQuotes,
      sentQuotesValue: Math.round(sentQuotesValue),
      overdueTasks,
      pendingPayments: pendingPayments?._sum.amount ?? null,
      pendingPaymentsCount: pendingPayments?._count ?? 0,
      revenueMonth: revenueMonth?._sum.amount ?? null,
      revenuePrevMonth: revenuePrevMonth?._sum.amount ?? null,
    },
    projects,
    myTasks,
    upcomingEvents,
    agenda,
    activity,
    pipeline,
  }
}
