import Link from 'next/link'
import { cookies } from 'next/headers'
import {
  ArrowRight,

  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  FileText,
  FolderKanban,
  ListChecks,
  MapPin,
  PartyPopper,
  Receipt,
  Target,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Activity,
  Zap,
  AlertTriangle,
} from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { getDashboard } from '@/lib/dashboard'
import { runScheduledAutomationsThrottled } from '@/lib/automations'
import { formatMoney } from '@/lib/money'
import { daysUntil, formatDate, isSameDay, relativeTime, addDays, startOfDay } from '@/lib/dates'
import { translator } from '@/lib/i18n'
import { LEAD_STAGE, PRIORITY, PROJECT_STATUS, EVENT_STATUS, type Tone } from '@/lib/options'
import { cn, fullName } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/card'
import { Kpi, KpiGrid, PremiumHeader } from '@/components/ui/page-header'
import { OptBadge, Badge, DOTS } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { UserChip, Avatar } from '@/components/ui/avatar'
import { ButtonLink } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { TaskToggle } from '@/components/tasks/task-toggle'

export const metadata = { title: 'Dashboard' }

const AGENDA_TONE: Record<string, Tone> = { MEETING: 'blue', DEADLINE: 'red', DELIVERY: 'amber', FOLLOW_UP: 'violet', TASK: 'gray', RESERVATION: 'teal', EVENT: 'coral' }
const AGENDA_LABEL: Record<string, string> = { MEETING: 'Meeting', DEADLINE: 'Deadline', DELIVERY: 'Delivery', FOLLOW_UP: 'Follow-up', TASK: 'Task', RESERVATION: 'Reservation', EVENT: 'Event' }

export default async function DashboardPage() {
  const ctx = await requirePage('dashboard')
  await runScheduledAutomationsThrottled(ctx.org.id)
  const data = await getDashboard(ctx)
  const locale = (await cookies()).get('emos_locale')?.value ?? ctx.user.locale
  const t = translator(locale)
  const cur = ctx.org.currency
  const k = data.kpis
  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('Good morning') : hour < 18 ? t('Good afternoon') : t('Good evening')
  const revenueDelta = k.revenueMonth !== null && k.revenuePrevMonth ? Math.round(((k.revenueMonth - k.revenuePrevMonth) / k.revenuePrevMonth) * 100) : null

  const quick = [
    { label: t('New Client'), href: '/clients?new=1', icon: Users, perm: 'clients' as const },
    { label: t('New Lead'), href: '/leads?new=1', icon: Target, perm: 'leads' as const },
    { label: t('New Project'), href: '/projects?new=1', icon: FolderKanban, perm: 'projects' as const },
    { label: t('New Event'), href: '/events?new=1', icon: PartyPopper, perm: 'events' as const },
    { label: t('New Quote'), href: '/quotes?new=1', icon: Receipt, perm: 'quotes' as const },
    { label: t('New Supplier'), href: '/suppliers?new=1', icon: Truck, perm: 'suppliers' as const },
    { label: t('New Task'), href: '/tasks?new=1', icon: ListChecks, perm: 'tasks' as const },
  ].filter((q) => ctx.can(q.perm, 'write'))

  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(), i))
  const openStages = LEAD_STAGE.filter((s) => !['WON', 'LOST', 'ARCHIVED'].includes(s.value))
  const pipelineMax = Math.max(1, ...openStages.map((s) => data.pipeline.find((p) => p.stage === s.value)?._count ?? 0))

  return (
    <>
      <PremiumHeader
        eyebrow={formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}
        title={`${greeting}, ${ctx.user.name.split(' ')[0]}`}
        description={`Here is what’s happening across ${ctx.org.name} today.`}
        actions={
          <>
            {ctx.can('calendar') && (
              <ButtonLink href="/calendar" variant="secondary">
                <CalendarDays /> Calendar
              </ButtonLink>
            )}
            {ctx.can('leads', 'write') && (
              <ButtonLink href="/leads?new=1" variant="primary">
                <Target /> {t('New Lead')}
              </ButtonLink>
            )}
          </>
        }
        kpis={
          <KpiGrid>
            {ctx.can('clients') && <Kpi label="Total Clients" value={k.totalClients} hint={`+${k.newClientsMonth} this month`} icon={<Users />} href="/clients" />}
            {ctx.can('leads') && <Kpi label="Active Leads" value={k.activeLeads} hint={`${formatMoney(k.pipelineValue, cur, { compact: true })} in pipeline`} icon={<Target />} href="/leads?view=kanban" />}
            <Kpi label="Active Projects" value={k.activeProjects} hint="Planning, confirmed or in progress" icon={<FolderKanban />} href="/projects" />
            <Kpi label="Upcoming Events" value={k.upcomingEvents} hint="Next 30 days" icon={<PartyPopper />} href="/events" />
            {ctx.can('quotes') && <Kpi label="Pending Quotes" value={k.pendingQuotes} hint={`${formatMoney(k.sentQuotesValue, cur, { compact: true })} awaiting answer`} icon={<Receipt />} href="/quotes?status=SENT" />}
            <Kpi label="Overdue Tasks" value={k.overdueTasks} hint={k.overdueTasks ? 'Need attention' : 'All on track'} icon={k.overdueTasks ? <AlertTriangle /> : <CheckCircle2 />} tone={k.overdueTasks ? 'warn' : 'good'} href="/tasks?view=overdue" />
            {k.pendingPayments !== null && <Kpi label="Pending Payments" value={formatMoney(k.pendingPayments, cur, { compact: true })} hint={`${k.pendingPaymentsCount} client payments`} icon={<Wallet />} href="/finance/payments?status=PENDING&direction=INCOMING" />}
            {k.revenueMonth !== null && (
              <Kpi
                label="Monthly Revenue"
                value={formatMoney(k.revenueMonth, cur, { compact: true })}
                hint={revenueDelta === null ? 'Collected this month' : <span className={revenueDelta >= 0 ? 'text-emerald-600' : 'text-red-600'}>{revenueDelta >= 0 ? '+' : ''}{revenueDelta}% vs last month</span>}
                icon={<TrendingUp />}
                tone="good"
                href="/finance"
              />
            )}
          </KpiGrid>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Active projects */}
        <Card className="xl:col-span-2">
          <CardHeader title="Active Projects" description="Closest start dates first" icon={<FolderKanban />} action={<SeeAll href="/projects" />} />
          {data.projects.length === 0 ? (
            <EmptyState title="No active projects" description="Projects appear here once they are planned or confirmed." />
          ) : (
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[640px] text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] tracking-wide text-ink/50 uppercase [&>th]:bg-beige/50 [&>th]:px-3 [&>th]:py-2 [&>th]:font-medium [&>th:first-child]:pl-4 [&>th:last-child]:pr-4">
                    <th>Project</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="w-36">Progress</th>
                    <th>Manager</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projects.map((p) => (
                    <tr key={p.id} className="group border-t border-line hover:bg-offwhite [&>td]:px-3 [&>td]:py-2.5 [&>td:first-child]:pl-4 [&>td:last-child]:pr-4">
                      <td className="max-w-[260px]">
                        <Link href={`/projects/${p.id}`} className="block truncate font-medium text-ink group-hover:text-coral-dark">
                          {p.name}
                        </Link>
                        <span className="block truncate text-xs text-muted">{p.client ? p.client.company ?? fullName(p.client) : 'Internal'}</span>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="text-ink/90">{formatDate(p.startDate, { day: 'numeric', month: 'short' })}</span>
                        {p.startDate && <span className="block text-xs text-muted">{daysLabel(daysUntil(p.startDate))}</span>}
                      </td>
                      <td>
                        <OptBadge options={PROJECT_STATUS} value={p.status} />
                      </td>
                      <td>
                        <Progress value={p.progress} />
                      </td>
                      <td>
                        <UserChip user={p.manager} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* My tasks */}
        <Card>
          <CardHeader title="My Tasks" description={`${data.myTasks.length} open · assigned to you`} icon={<ListChecks />} action={<SeeAll href="/tasks" />} />
          {data.myTasks.length === 0 ? (
            <EmptyState icon={<CheckCircle2 />} title="You’re all caught up" description="No open tasks assigned to you." />
          ) : (
            <ul className="divide-y divide-line">
              {data.myTasks.map((task) => {
                const overdue = task.dueDate && task.dueDate < startOfDay()
                return (
                  <li key={task.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-offwhite">
                    <span className="pt-0.5">
                      <TaskToggle id={task.id} done={false} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/tasks/${task.id}`} className="block truncate text-[13px] font-medium text-ink hover:text-coral-dark">
                        {task.title}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                        <span className={cn('inline-flex items-center gap-1', overdue && 'font-medium text-red-600')}>
                          <Clock className="size-3" />
                          {task.dueDate ? (overdue ? `Overdue · ${formatDate(task.dueDate, { day: 'numeric', month: 'short' })}` : relativeTime(task.dueDate)) : 'No deadline'}
                        </span>
                        {(task.project || task.lead) && <span className="truncate">· {task.project?.name ?? fullName(task.lead!)}</span>}
                      </div>
                    </div>
                    <OptBadge options={PRIORITY} value={task.priority} dot={false} />
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Calendar & follow-ups */}
        <Card className="xl:col-span-2">
          <CardHeader title="Calendar & Follow-ups" description="Meetings, deadlines, reminders, follow-ups and confirmations — next 7 days" icon={<CalendarClock />} action={<SeeAll href="/calendar?view=week" />} />
          <div className="grid grid-cols-1 divide-y divide-line md:grid-cols-7 md:divide-x md:divide-y-0">
            {days.map((day, i) => {
              const items = data.agenda.filter((a) => isSameDay(a.date, day))
              return (
                <div key={i} className={cn('min-h-[148px] p-2.5', i === 0 && 'bg-coral-light/25')}>
                  <div className="mb-2 flex items-baseline justify-between md:block">
                    <span className={cn('text-[11px] font-medium tracking-wide uppercase', i === 0 ? 'text-coral-dark' : 'text-muted')}>{i === 0 ? 'Today' : formatDate(day, { weekday: 'short' })}</span>
                    <span className={cn('tabular text-lg font-semibold md:block', i === 0 ? 'text-coral-dark' : 'text-ink')}>{day.getDate()}</span>
                  </div>
                  <ul className="space-y-1">
                    {items.slice(0, 4).map((a) => (
                      <li key={a.kind + a.id}>
                        <Link href={a.href} title={`${AGENDA_LABEL[a.kind]} · ${a.title}`} className="flex items-start gap-1.5 rounded-md px-1 py-0.5 text-[11.5px] leading-snug hover:bg-white">
                          <span className={cn('mt-[5px] size-1.5 shrink-0 rounded-full', DOTS[AGENDA_TONE[a.kind]!])} />
                          <span className="min-w-0">
                            {!a.allDay && a.kind !== 'TASK' && <span className="tabular mr-1 text-muted">{a.date.toTimeString().slice(0, 5)}</span>}
                            <span className="line-clamp-2 text-ink/85">{a.title}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                    {items.length > 4 && <li className="px-1 text-[11px] text-muted">+{items.length - 4} more</li>}
                    {items.length === 0 && <li className="px-1 text-[11px] text-muted/60">—</li>}
                  </ul>
                </div>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-3 border-t border-line px-4 py-2.5">
            {Object.entries(AGENDA_LABEL).map(([key, label]) => (
              <span key={key} className="inline-flex items-center gap-1.5 text-[11px] text-muted">
                <span className={cn('size-1.5 rounded-full', DOTS[AGENDA_TONE[key]!])} />
                {label}
              </span>
            ))}
          </div>
        </Card>

        {/* Upcoming events */}
        <Card>
          <CardHeader title="Upcoming Events" icon={<PartyPopper />} action={<SeeAll href="/events" />} />
          {data.upcomingEvents.length === 0 ? (
            <EmptyState title="No upcoming events" />
          ) : (
            <ul className="divide-y divide-line">
              {data.upcomingEvents.map((e) => (
                <li key={e.id}>
                  <Link href={`/events/${e.id}`} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-offwhite">
                    <div className="flex w-11 shrink-0 flex-col items-center rounded-lg border border-line bg-white py-1">
                      <span className="text-[9.5px] font-semibold tracking-wide text-coral-dark uppercase">{e.date ? formatDate(e.date, { month: 'short' }) : '—'}</span>
                      <span className="tabular text-base leading-tight font-semibold">{e.date?.getDate() ?? '—'}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink group-hover:text-coral-dark">{e.name}</p>
                      <p className="flex items-center gap-1 truncate text-xs text-muted">
                        <MapPin className="size-3 shrink-0" />
                        {e.venue ?? e.location ?? 'Location TBC'}
                        {e.client && <> · {fullName(e.client)}</>}
                      </p>
                    </div>
                    <OptBadge options={EVENT_STATUS} value={e.status} dot={false} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent activity */}
        <Card className="xl:col-span-2">
          <CardHeader title="Recent Activity" description="Leads, project updates, approvals, task completions and payments" icon={<Activity />} action={ctx.can('admin') ? <SeeAll href="/admin/audit" /> : undefined} />
          {data.activity.length === 0 ? (
            <EmptyState title="No activity yet" />
          ) : (
            <ul className="px-4 py-2">
              {data.activity.map((a, i) => (
                <li key={a.id} className="relative flex gap-3 py-2">
                  {i < data.activity.length - 1 && <span className="absolute top-8 bottom-[-8px] left-[11px] w-px bg-line" />}
                  {a.user ? <Avatar name={a.user.name} color={a.user.color} size="sm" /> : <span className="flex size-6 items-center justify-center rounded-full bg-coral-light text-coral-dark"><Zap className="size-3" /></span>}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug text-ink/90">
                      {a.link ? (
                        <Link href={a.link} className="hover:text-coral-dark">
                          {a.summary}
                        </Link>
                      ) : (
                        a.summary
                      )}
                    </p>
                    <p className="text-[11.5px] text-muted">
                      {a.user?.name ?? 'Automation'} · {relativeTime(a.createdAt)}
                    </p>
                  </div>
                  <ActivityBadge action={a.action} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          {/* Quick actions */}
          {quick.length > 0 && (
            <Card>
              <CardHeader title={t('Quick actions')} icon={<Zap />} />
              <div className="grid grid-cols-2 gap-2 p-3">
                {quick.map((q) => (
                  <Link key={q.href} href={q.href} className="group flex items-center gap-2 rounded-lg border border-line px-2.5 py-2 text-[12.5px] font-medium text-ink/85 transition-colors hover:border-coral/30 hover:bg-coral-light/30 hover:text-coral-dark">
                    <q.icon className="size-4 text-muted group-hover:text-coral-dark" />
                    <span className="truncate">{q.label}</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}
          {/* Pipeline snapshot */}
          {ctx.can('leads') && (
            <Card>
              <CardHeader title="Sales Pipeline" icon={<CircleDollarSign />} action={<SeeAll href="/leads?view=kanban" />} />
              <ul className="space-y-2 p-4">
                {openStages.map((s) => {
                  const row = data.pipeline.find((p) => p.stage === s.value)
                  const count = row?._count ?? 0
                  return (
                    <li key={s.value}>
                      <Link href={`/leads?stage=${s.value}`} className="block">
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-ink/80">{s.label}</span>
                          <span className="tabular text-muted">
                            {count} · {formatMoney(row?._sum.estimatedBudget ?? 0, cur, { compact: true })}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-lightgray">
                          <div className="h-full rounded-full bg-coral/80" style={{ width: `${(count / pipelineMax) * 100}%` }} />
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
        </div>
      </div>
      <p className="mt-6 flex items-center gap-1.5 text-[11.5px] text-muted">
        <FileText className="size-3" /> All names, companies and amounts in this workspace are fictitious demonstration data.
      </p>
    </>
  )
}

function SeeAll({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-coral-dark">
      View all <ArrowRight className="size-3" />
    </Link>
  )
}

function daysLabel(n: number) {
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n < 0) return `${-n} days ago`
  return `In ${n} days`
}

function ActivityBadge({ action }: { action: string }) {
  const map: Record<string, { tone: Tone; label: string }> = {
    created: { tone: 'blue', label: 'New' },
    updated: { tone: 'gray', label: 'Update' },
    approved: { tone: 'green', label: 'Approved' },
    rejected: { tone: 'red', label: 'Rejected' },
    completed: { tone: 'green', label: 'Done' },
    paid: { tone: 'green', label: 'Payment' },
    deleted: { tone: 'gray', label: 'Archived' },
    automation: { tone: 'violet', label: 'Automation' },
    converted: { tone: 'coral', label: 'Converted' },
  }
  const m = map[action] ?? { tone: 'gray' as Tone, label: action }
  return (
    <Badge tone={m.tone} className="hidden sm:inline-flex">
      {m.label}
    </Badge>
  )
}

