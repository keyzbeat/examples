import { ListChecks } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prepareList } from '@/lib/resources/page'
import { prisma } from '@/lib/prisma'
import { hrefWith, sp, type SP } from '@/lib/url'
import { PRIORITY, TASK_STATUS } from '@/lib/options'
import { addDays, endOfDay, formatDate, formatDateTime, startOfDay, startOfWeek } from '@/lib/dates'
import { fullName, cn } from '@/lib/utils'
import { AppHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Table, THead, Th, Tr, Td, Pagination } from '@/components/ui/table'
import { OptBadge } from '@/components/ui/badge'
import { UserChip } from '@/components/ui/avatar'
import { LinkTabs } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/empty-state'
import { ListToolbar } from '@/components/resource/list-toolbar'
import { ResourceSheet } from '@/components/resource/resource-sheet'
import { StatusBoard } from '@/components/resource/status-board'
import { TaskToggle } from '@/components/tasks/task-toggle'
import Link from 'next/link'
import type { Task } from '@prisma/client'

export const metadata = { title: 'Tasks & Follow-ups' }
type Row = Task & { assignee: { name: string; color: string } | null; project: { id: string; name: string } | null; client: { id: string; firstName: string; lastName: string } | null; lead: { id: string; firstName: string; lastName: string } | null; event: { id: string; name: string } | null; _count: { subtasks: number; comments: number } }

const OPEN = { notIn: ['COMPLETED', 'CANCELLED'] }

export default async function TasksPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requirePage('tasks')
  const params = await searchParams
  const view = sp(params, 'view') ?? 'mine'
  const today = startOfDay()
  const views: Record<string, { label: string; where: Record<string, unknown> }> = {
    mine: { label: 'My tasks', where: { assigneeId: ctx.user.id, status: OPEN } },
    today: { label: 'Today', where: { dueDate: { gte: today, lte: endOfDay() }, status: OPEN } },
    week: { label: 'This week', where: { dueDate: { gte: startOfWeek(), lt: addDays(startOfWeek(), 7) }, status: OPEN } },
    overdue: { label: 'Overdue', where: { dueDate: { lt: today }, status: OPEN } },
    all: { label: 'All tasks', where: {} },
    kanban: { label: 'Kanban', where: {} },
    calendar: { label: 'Calendar', where: { dueDate: { not: null } } },
  }
  const v = views[view] ?? views.mine!
  const extra = { ...v.where, parentId: null }
  const big = view === 'kanban' || view === 'calendar'
  const data = await prepareList<Row>(ctx, 'tasks', params, { assignee: { select: { name: true, color: true } }, project: { select: { id: true, name: true } }, client: { select: { id: true, firstName: true, lastName: true } }, lead: { select: { id: true, firstName: true, lastName: true } }, event: { select: { id: true, name: true } }, _count: { select: { subtasks: true, comments: true } } }, extra, big ? 100 : 30)
  const base = { organizationId: ctx.org.id, deletedAt: null, parentId: null, ...(ctx.assignedOnly ? { assigneeId: ctx.user.id } : {}) }
  const [cMine, cToday, cOverdue] = await Promise.all([
    prisma.task.count({ where: { ...base, ...views.mine!.where } }),
    prisma.task.count({ where: { ...base, ...views.today!.where } }),
    prisma.task.count({ where: { ...base, ...views.overdue!.where } }),
  ])
  const counts: Record<string, number> = { mine: cMine, today: cToday, overdue: cOverdue }
  const path = '/tasks'
  const tabs = Object.entries(views).map(([k, x]) => ({ key: k, label: x.label, count: counts[k], href: hrefWith(path, params, { view: k === 'mine' ? null : k, page: null }) }))
  const related = (t: Row) => t.project ? { href: `/projects/${t.project.id}`, label: t.project.name } : t.event ? { href: `/events/${t.event.id}`, label: t.event.name } : t.lead ? { href: `/leads/${t.lead.id}`, label: `Lead · ${fullName(t.lead)}` } : t.client ? { href: `/clients/${t.client.id}`, label: fullName(t.client) } : null
  return (
    <>
      <AppHeader icon={<ListChecks />} title="Tasks & Follow-ups" description="Everything to do, across projects, events, leads and clients" actions={data.canWrite && <ResourceSheet {...data.form} title="New task" triggerLabel="New task" autoOpenParam navigateOnCreate={false} />} />
      <LinkTabs tabs={tabs} active={view} />
      <Card>
        <ListToolbar filters={data.toolbarFilters.filter((f) => !(view === 'mine' && f.name === 'assigneeId'))} placeholder="Search tasks…" exportResource="tasks" />
        {data.rows.length === 0 ? <EmptyState icon={<ListChecks />} title={view === 'overdue' ? 'Nothing overdue 🎉' : 'No tasks here'} /> : view === 'kanban' ? (
          <div className="p-3">
            <StatusBoard resource="tasks" canWrite={data.canWrite} columns={TASK_STATUS} cards={data.rows.map((t) => ({ id: t.id, title: t.title, subtitle: related(t)?.label, href: `/tasks/${t.id}`, status: t.status, avatar: t.assignee, meta: t.dueDate ? formatDate(t.dueDate, { day: 'numeric', month: 'short' }) : null, metaTone: t.dueDate && t.dueDate < today && !['COMPLETED', 'CANCELLED'].includes(t.status) ? 'danger' : 'default', badge: t.priority === 'URGENT' || t.priority === 'HIGH' ? { label: t.priority.toLowerCase(), className: t.priority === 'URGENT' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700' } : null }))} />
          </div>
        ) : view === 'calendar' ? (
          <TaskCalendar rows={data.rows} />
        ) : (
          <>
            <Table>
              <THead>
                <Th className="w-8" />
                <Th sortKey="title" path={path} params={params} currentSort={data.sort}>Task</Th>
                <Th>Related to</Th>
                <Th sortKey="priority" path={path} params={params} currentSort={data.sort}>Priority</Th>
                <Th sortKey="status" path={path} params={params} currentSort={data.sort}>Status</Th>
                <Th sortKey="dueDate" path={path} params={params} currentSort={data.sort}>Deadline</Th>
                <Th>Assignee</Th>
              </THead>
              <tbody>
                {data.rows.map((t) => {
                  const r = related(t)
                  const overdue = t.dueDate && t.dueDate < today && !['COMPLETED', 'CANCELLED'].includes(t.status)
                  return (
                    <Tr key={t.id}>
                      <Td><TaskToggle id={t.id} done={t.status === 'COMPLETED'} disabled={!data.canWrite} /></Td>
                      <Td className="max-w-[340px]">
                        <Link href={`/tasks/${t.id}`} className={cn('block truncate font-medium hover:text-coral-dark', t.status === 'COMPLETED' && 'text-muted line-through')}>{t.title}</Link>
                        <span className="text-xs text-muted">{t.ref}{t._count.subtasks > 0 && ` · ${t._count.subtasks} subtasks`}{t._count.comments > 0 && ` · ${t._count.comments} comments`}{t.source?.startsWith('automation') && ' · auto'}</span>
                      </Td>
                      <Td className="max-w-[220px] truncate">{r ? <Link href={r.href} className="text-muted hover:text-coral-dark">{r.label}</Link> : <span className="text-muted">—</span>}</Td>
                      <Td><OptBadge options={PRIORITY} value={t.priority} dot={false} /></Td>
                      <Td><OptBadge options={TASK_STATUS} value={t.status} /></Td>
                      <Td className={cn('whitespace-nowrap', overdue && 'font-medium text-red-600')}>{formatDateTime(t.dueDate)}</Td>
                      <Td><UserChip user={t.assignee} /></Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
            <Pagination path={path} params={params} page={data.page} pageSize={data.pageSize} total={data.total} />
          </>
        )}
      </Card>
    </>
  )
}

function TaskCalendar({ rows }: { rows: Row[] }) {
  const start = startOfWeek()
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i))
  return (
    <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-7">
      {days.map((d) => {
        const items = rows.filter((t) => t.dueDate && startOfDay(t.dueDate).getTime() === d.getTime())
        const isToday = d.getTime() === startOfDay().getTime()
        return (
          <div key={d.toISOString()} className={cn('min-h-28 bg-white p-2', isToday && 'bg-coral-light/30')}>
            <p className={cn('mb-1 text-xs font-medium', isToday ? 'text-coral-dark' : 'text-muted')}>{formatDate(d, { weekday: 'short', day: 'numeric' })}</p>
            <ul className="space-y-1">
              {items.map((t) => <li key={t.id}><Link href={`/tasks/${t.id}`} className={cn('block truncate rounded bg-beige px-1.5 py-0.5 text-[11.5px] hover:bg-coral-light', t.status === 'COMPLETED' && 'text-muted line-through')}>{t.title}</Link></li>)}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
