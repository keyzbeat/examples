import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, MapPin, User, Wallet, ListChecks, Users, Truck, PartyPopper, FileText, MessageSquare, CheckCircle2, Bookmark, History } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { getRecord, loadRelationOptions } from '@/lib/resources/server'
import { prepareForm } from '@/lib/resources/page'
import { RESOURCES } from '@/lib/resources/registry'
import { prisma } from '@/lib/prisma'
import { APPROVAL_STATUS, DOCUMENT_CATEGORY, EVENT_STATUS, INVOICE_STATUS, PAYMENT_DIRECTION, PAYMENT_STATUS, PRIORITY, PROJECT_STATUS, PROJECT_TYPE, QUOTE_STATUS, STAY_STATUS, SUPPLIER_STATUS, TASK_STATUS } from '@/lib/options'
import { computeTotals, formatMoney } from '@/lib/money'
import { formatDate, formatDateTime, relativeTime, startOfWeek } from '@/lib/dates'
import { hrefWith, sp, type SP } from '@/lib/url'
import { fullName, cn } from '@/lib/utils'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { OptBadge } from '@/components/ui/badge'
import { UserChip, Avatar } from '@/components/ui/avatar'
import { LinkTabs } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/ui/empty-state'
import { RatingStars } from '@/components/ui/rating'
import { ActionButton } from '@/components/ui/action-button'
import { Table, THead, Th, Tr, Td, TitleCell } from '@/components/ui/table'
import { DetailHeader, InfoGrid, Stat } from '@/components/resource/detail'
import { ResourceSheet, DeleteButton } from '@/components/resource/resource-sheet'
import { StatusBoard } from '@/components/resource/status-board'
import { Crumb } from '@/components/shell/shell-context'
import { TaskListMini } from '@/components/tasks/task-list-mini'
import { ServiceLines } from '@/components/projects/service-lines'
import { SupplierAssign, SupplierStatusSelect, TeamManager, ApprovalRequestForm, StaffMessageForm } from '@/components/projects/collab'
import { InteractionComposer } from '@/components/crm/interactions'
import { InteractionHistory } from '@/components/crm/history'
import { saveChecklistTemplate } from '@/app/actions/projects'
import type { Project } from '@prisma/client'

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const ctx = await requirePage('projects')
  const { id } = await params
  const query = await searchParams
  const tab = sp(query, 'tab') ?? 'overview'
  const project = await getRecord<Project & { client: { id: string; firstName: string; lastName: string; company: string | null } | null; manager: { name: string; color: string } | null }>(ctx, RESOURCES.projects, id, {
    client: { select: { id: true, firstName: true, lastName: true, company: true } },
    manager: { select: { name: true, color: true } },
  })
  if (!project) notFound()
  const org = ctx.org.id
  const showFinance = ctx.can('finance') || ctx.can('quotes')
  const [tasks, members, lines, projectSuppliers, events, stays, documents, quotes, invoices, payments, approvals, messages, interactions, activity, form, taskForm, eventForm, catalog, opts] = await Promise.all([
    prisma.task.findMany({ where: { projectId: id, deletedAt: null, parentId: null }, orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { position: 'asc' }], include: { assignee: { select: { name: true, color: true } }, _count: { select: { subtasks: true } } } }),
    prisma.projectMember.findMany({ where: { projectId: id }, include: { user: { select: { name: true, color: true, title: true } } } }),
    prisma.projectService.findMany({ where: { projectId: id }, include: { service: { include: { supplier: { select: { companyName: true } } } } }, orderBy: { createdAt: 'asc' } }),
    prisma.projectSupplier.findMany({ where: { projectId: id }, include: { supplier: { include: { categories: true } } } }),
    prisma.event.findMany({ where: { projectId: id, deletedAt: null }, orderBy: { date: 'asc' } }),
    prisma.stay.findMany({ where: { projectId: id, deletedAt: null } }),
    ctx.can('documents') ? prisma.document.findMany({ where: { projectId: id, deletedAt: null, next: null }, orderBy: { createdAt: 'desc' } }) : [],
    ctx.can('quotes') ? prisma.quotation.findMany({ where: { projectId: id, deletedAt: null }, include: { items: true }, orderBy: { issueDate: 'desc' } }) : [],
    ctx.can('invoices') ? prisma.invoice.findMany({ where: { projectId: id, deletedAt: null }, include: { items: true, payments: true }, orderBy: { issueDate: 'desc' } }) : [],
    ctx.can('finance') ? prisma.payment.findMany({ where: { projectId: id, organizationId: org }, include: { supplier: { select: { companyName: true } } }, orderBy: { dueDate: 'asc' } }) : [],
    prisma.approval.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' } }),
    prisma.message.findMany({ where: { projectId: id }, orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true, color: true } } } }),
    prisma.interaction.findMany({ where: { projectId: id }, orderBy: { occurredAt: 'desc' }, include: { user: { select: { name: true } } } }),
    prisma.activityLog.findMany({ where: { organizationId: org, entityId: id }, orderBy: { createdAt: 'desc' }, take: 20, include: { user: { select: { name: true } } } }),
    prepareForm(ctx, 'projects', project as unknown as Record<string, unknown>),
    prepareForm(ctx, 'tasks', null, { projectId: id, clientId: project.clientId, assigneeId: project.managerId }),
    prepareForm(ctx, 'events', null, { projectId: id, clientId: project.clientId, date: project.startDate, location: project.location, type: project.type === 'TRAVEL' || project.type === 'CONCIERGE' || project.type === 'INTERNAL' || project.type === 'CUSTOM' ? 'PRIVATE_EVENT' : project.type }),
    prisma.service.findMany({ where: { organizationId: org, deletedAt: null, status: 'ACTIVE' }, include: { supplier: { select: { status: true, companyName: true } } }, orderBy: { name: 'asc' } }),
    loadRelationOptions(ctx, ['supplier', 'user']),
  ])
  const canWrite = ctx.can('projects', 'write')
  const cur = ctx.org.currency
  const planned = lines.reduce((a, l) => ({ price: a.price + l.quantity * l.unitPrice, cost: a.cost + l.quantity * l.unitCost }), { price: 0, cost: 0 })
  const actualCost = payments.filter((p) => p.direction === 'OUTGOING' && p.status === 'PAID').reduce((a, p) => a + p.amount, 0)
  const committedCost = payments.filter((p) => p.direction === 'OUTGOING' && p.status !== 'CANCELLED').reduce((a, p) => a + p.amount, 0)
  const received = payments.filter((p) => p.direction === 'INCOMING' && p.status === 'PAID').reduce((a, p) => a + p.amount, 0)
  const invoiced = invoices.reduce((a, i) => a + computeTotals(i.items).total, 0)
  const openTasks = tasks.filter((t) => !['COMPLETED', 'CANCELLED'].includes(t.status))
  const base = `/projects/${id}`
  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING').length
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'tasks', label: 'Tasks', count: openTasks.length },
    { key: 'budget', label: 'Services & budget', count: lines.length },
    { key: 'suppliers', label: 'Suppliers', count: projectSuppliers.length },
    { key: 'events', label: 'Events & stays', count: events.length + stays.length },
    ...(ctx.can('documents') ? [{ key: 'documents', label: 'Documents', count: documents.length }] : []),
    ...(showFinance ? [{ key: 'finance', label: 'Quotes & payments', count: quotes.length + invoices.length }] : []),
    { key: 'portal', label: 'Client portal', count: pendingApprovals || undefined },
    { key: 'activity', label: 'Activity' },
  ].map((t) => ({ ...t, href: hrefWith(base, query, { tab: t.key === 'overview' ? null : t.key, view: null }) }))
  const taskView = sp(query, 'view') ?? 'list'

  return (
    <>
      <Crumb label={project.name} />
      <DetailHeader
        refLabel={project.ref}
        title={project.name}
        badges={
          <>
            <OptBadge options={PROJECT_STATUS} value={project.status} />
            <OptBadge options={PROJECT_TYPE} value={project.type} dot={false} />
            <OptBadge options={PRIORITY} value={project.priority} dot={false} />
          </>
        }
        meta={
          <>
            {project.client && <Link href={`/clients/${project.client.id}`} className="inline-flex items-center gap-1 hover:text-coral-dark"><User /> {project.client.company ?? fullName(project.client)}</Link>}
            {project.startDate && <span className="inline-flex items-center gap-1"><CalendarDays /> {formatDate(project.startDate)}{project.endDate && +project.endDate !== +project.startDate ? ` → ${formatDate(project.endDate)}` : ''}</span>}
            {project.location && <span className="inline-flex items-center gap-1"><MapPin /> {project.location}</span>}
          </>
        }
        actions={
          canWrite && (
            <>
              <ResourceSheet {...form} title="Edit project" triggerLabel="Edit" triggerVariant="secondary" icon="edit" />
              {ctx.can('projects', 'delete') && <DeleteButton resource="projects" id={project.id} redirectTo="/projects" size="icon-sm" />}
            </>
          )
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Progress" value={`${project.progress}%`} hint={<Progress value={project.progress} showLabel={false} className="mt-1.5" />} />
        <Stat label="Open tasks" value={openTasks.length} hint={`${tasks.length - openTasks.length} completed`} />
        <Stat label="Budget" value={formatMoney(project.budget, cur)} hint="Client budget" />
        <Stat label="Planned selling price" value={formatMoney(planned.price, cur)} hint={`${lines.length} services`} />
        {ctx.can('finance') ? <Stat label="Planned margin" value={formatMoney(planned.price - planned.cost, cur)} hint={planned.price ? `${Math.round(((planned.price - planned.cost) / planned.price) * 100)}% gross margin` : '—'} /> : <Stat label="Suppliers" value={projectSuppliers.length} />}
      </div>
      <LinkTabs tabs={tabs} active={tab} />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <Card>
              <CardHeader title="Project details" />
              <CardBody>
                <InfoGrid
                  cols={3}
                  items={[
                    { label: 'Client', value: project.client ? <Link className="hover:text-coral-dark" href={`/clients/${project.client.id}`}>{fullName(project.client)}</Link> : 'Internal' },
                    { label: 'Project manager', value: <UserChip user={project.manager} /> },
                    { label: 'Category', value: <OptBadge options={PROJECT_TYPE} value={project.type} dot={false} /> },
                    { label: 'Start date', value: formatDate(project.startDate) },
                    { label: 'End date', value: formatDate(project.endDate) },
                    { label: 'Location', value: project.location },
                    { label: 'Description', value: project.description, wide: true },
                  ]}
                />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Next tasks" icon={<ListChecks />} action={<Link href={hrefWith(base, query, { tab: 'tasks' })} className="text-xs text-muted hover:text-coral-dark">All tasks</Link>} />
              <TaskListMini tasks={openTasks.slice(0, 6)} empty="Nothing left to do 🎉" canWrite={ctx.can('tasks', 'write')} />
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader title="Team" icon={<Users />} />
              <TeamManager target="project" targetId={id} canWrite={canWrite} users={opts.user ?? []} members={members.map((m) => ({ userId: m.userId, name: m.user.name, color: m.user.color, role: m.role, title: m.user.title }))} />
            </Card>
            {ctx.can('finance') && (
              <Card>
                <CardHeader title="Budget tracking" icon={<Wallet />} />
                <CardBody>
                  <BudgetBars currency={cur} rows={[
                    { label: 'Client budget', value: project.budget ?? 0 },
                    { label: 'Planned selling price', value: planned.price },
                    { label: 'Estimated costs', value: planned.cost },
                    { label: 'Supplier costs committed', value: committedCost },
                    { label: 'Actual costs paid', value: actualCost },
                    { label: 'Invoiced to client', value: invoiced },
                    { label: 'Received from client', value: received },
                  ]} />
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === 'tasks' && (
        <Card>
          <CardHeader
            title="Task checklist"
            description="Drag between columns in board view. Subtasks and comments are on each task."
            icon={<ListChecks />}
            action={
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-line bg-offwhite p-0.5 text-xs">
                  {['list', 'board', 'timeline'].map((v) => (
                    <Link key={v} href={hrefWith(base, query, { view: v === 'list' ? null : v })} className={cn('rounded-md px-2 py-1 capitalize', taskView === v ? 'bg-white font-medium shadow-soft' : 'text-muted')}>
                      {v}
                    </Link>
                  ))}
                </div>
                {canWrite && <ActionButton size="sm" variant="ghost" action={saveChecklistTemplate.bind(null, id)}><Bookmark /> Save as template</ActionButton>}
                {ctx.can('tasks', 'write') && <ResourceSheet {...taskForm} parents={{ projectId: id }} navigateOnCreate={false} title="New task" triggerLabel="Add task" triggerSize="sm" />}
              </div>
            }
          />
          {taskView === 'board' ? (
            <div className="p-3">
              <StatusBoard resource="tasks" canWrite={ctx.can('tasks', 'write')} columns={TASK_STATUS} cards={tasks.map((t) => ({ id: t.id, title: t.title, href: `/tasks/${t.id}`, status: t.status, avatar: t.assignee, meta: t.dueDate ? formatDate(t.dueDate, { day: 'numeric', month: 'short' }) : null, metaTone: t.dueDate && t.dueDate < new Date() && t.status !== 'COMPLETED' ? 'danger' : 'default', badge: t._count.subtasks ? { label: `${t._count.subtasks} subtasks` } : null }))} />
            </div>
          ) : taskView === 'timeline' ? (
            <TaskTimeline tasks={tasks} />
          ) : (
            <TaskListMini tasks={tasks} canWrite={ctx.can('tasks', 'write')} />
          )}
        </Card>
      )}

      {tab === 'budget' && (
        <Card>
          <CardHeader title="Services & budget" description="Items from the catalog. Prices are snapshotted when added and can be adjusted per project." icon={<Wallet />} />
          <ServiceLines
            target="project"
            targetId={id}
            canWrite={canWrite}
            currency={cur}
            showCosts={ctx.can('finance') || ctx.can('services', 'write')}
            lines={lines.map((l) => ({ id: l.id, name: l.service.name, category: l.service.category, unit: l.service.unit, supplier: l.service.supplier?.companyName ?? null, quantity: l.quantity, unitCost: l.unitCost, unitPrice: l.unitPrice }))}
            catalog={catalog.map((s) => ({ value: s.id, label: s.name, hint: `${s.category} · ${formatMoney(s.price, cur)} / ${s.unit}${s.supplier?.status === 'SUSPENDED' ? ' · supplier suspended' : ''}`, disabled: s.supplier?.status === 'SUSPENDED' || s.supplier?.status === 'ARCHIVED' }))}
          />
        </Card>
      )}

      {tab === 'suppliers' && (
        <Card>
          <CardHeader title="Supplier coordination" icon={<Truck />} />
          {projectSuppliers.length === 0 ? <EmptyState title="No suppliers assigned" /> : (
            <Table>
              <THead><Th>Supplier</Th><Th>Categories</Th><Th>Role</Th><Th>Rating</Th><Th>Supplier status</Th><Th>Booking</Th></THead>
              <tbody>
                {projectSuppliers.map((ps) => (
                  <Tr key={ps.supplierId}>
                    <Td><TitleCell href={`/suppliers/${ps.supplierId}`} title={ps.supplier.companyName} subtitle={[ps.supplier.phone, ps.supplier.email].filter(Boolean).join(' · ')} /></Td>
                    <Td className="max-w-[220px] truncate text-muted">{ps.supplier.categories.map((c) => c.name).join(', ')}</Td>
                    <Td>{ps.role ?? '—'}</Td>
                    <Td><RatingStars value={ps.supplier.rating} /></Td>
                    <Td><OptBadge options={SUPPLIER_STATUS} value={ps.supplier.status} /></Td>
                    <Td><SupplierStatusSelect projectId={id} supplierId={ps.supplierId} status={ps.status} canWrite={canWrite} /></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
          {canWrite && <SupplierAssign projectId={id} options={(opts.supplier ?? []).filter((o) => !projectSuppliers.some((p) => p.supplierId === o.value))} />}
        </Card>
      )}

      {tab === 'events' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Events" icon={<PartyPopper />} action={ctx.can('events', 'write') && <ResourceSheet {...eventForm} parents={{ projectId: id }} title="New event in this project" triggerLabel="Add event" triggerSize="sm" />} />
            {events.length === 0 ? <EmptyState title="No events yet" /> : (
              <Table>
                <THead><Th>Event</Th><Th>Date</Th><Th>Venue</Th><Th>Guests</Th><Th>Status</Th></THead>
                <tbody>
                  {events.map((e) => (
                    <Tr key={e.id}>
                      <Td><TitleCell href={`/events/${e.id}`} title={e.name} subtitle={e.ref} /></Td>
                      <Td>{formatDate(e.date)}</Td>
                      <Td className="text-muted">{e.venue ?? '—'}</Td>
                      <Td className="tabular">{e.guestCount ?? '—'}</Td>
                      <Td><OptBadge options={EVENT_STATUS} value={e.status} /></Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
          <Card>
            <CardHeader title="Stays" />
            {stays.length === 0 ? <EmptyState title="No stays linked" /> : (
              <ul className="divide-y divide-line">
                {stays.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                    <Link href={`/stays/${s.id}`} className="hover:text-coral-dark">{s.title} · {s.destination}</Link>
                    <OptBadge options={STAY_STATUS} value={s.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === 'documents' && (
        <Card>
          <CardHeader title="Documents" icon={<FileText />} action={<Link href={`/documents?projectId=${id}`} className="text-xs text-muted hover:text-coral-dark">Upload in library</Link>} />
          {documents.length === 0 ? <EmptyState title="No documents" /> : (
            <ul className="divide-y divide-line">
              {documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                  <a href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer" className="hover:text-coral-dark">{d.name} <span className="text-xs text-muted">v{d.version}</span></a>
                  <span className="flex items-center gap-3 text-muted">
                    {d.visibleToClient && <span className="text-[11px] text-emerald-700">Shared with client</span>}
                    <OptBadge options={DOCUMENT_CATEGORY} value={d.category} dot={false} />
                    {formatDate(d.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'finance' && (
        <div className="space-y-4">
          {ctx.can('quotes') && (
            <Card>
              <CardHeader title="Quotes" action={ctx.can('quotes', 'write') && project.clientId && <Link className="text-xs text-coral-dark hover:underline" href={`/quotes?new=1&projectId=${id}&clientId=${project.clientId}`}>New quote</Link>} />
              {quotes.length === 0 ? <EmptyState title="No quotes yet" /> : (
                <Table>
                  <THead><Th>Quote</Th><Th>Issued</Th><Th>Status</Th><Th className="text-right">Total</Th>{ctx.can('finance') && <Th className="text-right">Margin</Th>}</THead>
                  <tbody>
                    {quotes.map((q) => {
                      const t = computeTotals(q.items, q.discountPct)
                      return (
                        <Tr key={q.id}>
                          <Td><TitleCell href={`/quotes/${q.id}`} title={q.title ?? q.ref} subtitle={q.ref} /></Td>
                          <Td>{formatDate(q.issueDate)}</Td>
                          <Td><OptBadge options={QUOTE_STATUS} value={q.status} /></Td>
                          <Td className="tabular text-right">{formatMoney(t.total, cur)}</Td>
                          {ctx.can('finance') && <Td className="tabular text-right text-emerald-700">{formatMoney(t.margin, cur)} ({t.marginPct}%)</Td>}
                        </Tr>
                      )
                    })}
                  </tbody>
                </Table>
              )}
            </Card>
          )}
          {ctx.can('invoices') && (
            <Card>
              <CardHeader title="Invoices" />
              {invoices.length === 0 ? <EmptyState title="No invoices yet" /> : (
                <Table>
                  <THead><Th>Invoice</Th><Th>Due</Th><Th>Status</Th><Th className="text-right">Total</Th><Th className="text-right">Balance</Th></THead>
                  <tbody>
                    {invoices.map((i) => {
                      const total = computeTotals(i.items).total
                      const paid = i.payments.filter((p) => p.status === 'PAID').reduce((a, p) => a + p.amount, 0)
                      return (
                        <Tr key={i.id}>
                          <Td><TitleCell href={`/invoices/${i.id}`} title={i.ref} /></Td>
                          <Td>{formatDate(i.dueDate)}</Td>
                          <Td><OptBadge options={INVOICE_STATUS} value={i.status} /></Td>
                          <Td className="tabular text-right">{formatMoney(total, cur)}</Td>
                          <Td className="tabular text-right">{formatMoney(total - paid, cur)}</Td>
                        </Tr>
                      )
                    })}
                  </tbody>
                </Table>
              )}
            </Card>
          )}
          {ctx.can('finance') && (
            <Card>
              <CardHeader title="Payments (client & supplier)" action={<Link className="text-xs text-muted hover:text-coral-dark" href="/finance/payments">Manage payments</Link>} />
              {payments.length === 0 ? <EmptyState title="No payments recorded" /> : (
                <Table>
                  <THead><Th>Direction</Th><Th>Kind</Th><Th>Counterparty</Th><Th>Due</Th><Th>Status</Th><Th className="text-right">Amount</Th></THead>
                  <tbody>
                    {payments.map((p) => (
                      <Tr key={p.id}>
                        <Td><OptBadge options={PAYMENT_DIRECTION} value={p.direction} dot={false} /></Td>
                        <Td className="text-muted">{p.kind.toLowerCase()}</Td>
                        <Td>{p.supplier?.companyName ?? (p.direction === 'INCOMING' ? 'Client' : '—')}</Td>
                        <Td>{formatDate(p.dueDate)}</Td>
                        <Td><OptBadge options={PAYMENT_STATUS} value={p.status} /></Td>
                        <Td className="tabular text-right">{formatMoney(p.amount, cur)}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          )}
        </div>
      )}

      {tab === 'portal' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader title="Client approvals" icon={<CheckCircle2 />} description="Shown in the client portal — the client approves or rejects with a comment." />
            {approvals.length === 0 ? <EmptyState title="No approvals requested" /> : (
              <ul className="divide-y divide-line">
                {approvals.map((a) => (
                  <li key={a.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-medium">{a.title}</p>
                        {a.description && <p className="text-xs text-muted">{a.description}</p>}
                        {a.clientComment && <p className="mt-1 rounded-md bg-beige px-2 py-1 text-xs text-ink/80">“{a.clientComment}”</p>}
                      </div>
                      <div className="text-right">
                        <OptBadge options={APPROVAL_STATUS} value={a.status} />
                        <p className="mt-1 text-[11px] text-muted">{a.decidedAt ? formatDate(a.decidedAt) : `Requested ${relativeTime(a.createdAt)}`}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {canWrite && <ApprovalRequestForm projectId={id} />}
          </Card>
          <Card>
            <CardHeader title="Messages with client" icon={<MessageSquare />} />
            <div className="scrollbar-thin max-h-[420px] space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && <p className="py-6 text-center text-sm text-muted">No messages yet.</p>}
              {messages.map((m) => (
                <div key={m.id} className={cn('flex gap-2', m.fromClient ? '' : 'flex-row-reverse')}>
                  <Avatar name={m.author.name} color={m.author.color} size="sm" />
                  <div className={cn('max-w-[80%] rounded-xl px-3 py-2 text-[13px]', m.fromClient ? 'bg-beige' : 'bg-coral-light/60')}>
                    <p className="whitespace-pre-line">{m.body}</p>
                    <p className="mt-0.5 text-[10.5px] text-muted">{m.author.name} · {formatDateTime(m.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
            {canWrite && <StaffMessageForm projectId={id} />}
          </Card>
        </div>
      )}

      {tab === 'activity' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader title="Notes & communication" icon={<History />} />
            <CardBody className="space-y-5">
              {canWrite && <InteractionComposer target="project" id={id} />}
              <InteractionHistory items={interactions} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Activity history" />
            <ul className="divide-y divide-line">
              {activity.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">No activity yet.</li>}
              {activity.map((a) => (
                <li key={a.id} className="px-4 py-2.5 text-[13px]">
                  <p>{a.summary}</p>
                  <p className="text-[11.5px] text-muted">{a.user?.name ?? 'Automation'} · {relativeTime(a.createdAt)}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  )
}

function BudgetBars({ rows, currency }: { rows: { label: string; value: number }[]; currency: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted">{r.label}</span>
            <span className="tabular font-medium">{formatMoney(r.value, currency)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-lightgray">
            <div className="h-full rounded-full bg-coral/80" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function TaskTimeline({ tasks }: { tasks: { id: string; title: string; status: string; dueDate: Date | null; assignee: { name: string; color: string } | null }[] }) {
  const groups = new Map<string, typeof tasks>()
  for (const t of tasks) {
    const k = t.dueDate ? `Week of ${formatDate(startOfWeek(t.dueDate), { day: 'numeric', month: 'short', year: 'numeric' })}` : 'No deadline'
    groups.set(k, [...(groups.get(k) ?? []), t])
  }
  return (
    <div className="p-4">
      {[...groups.entries()].map(([label, items]) => (
        <div key={label} className="relative border-l border-line pb-5 pl-5 last:pb-0">
          <span className="absolute top-1 -left-[5px] size-2.5 rounded-full border-2 border-white bg-coral" />
          <p className="mb-2 text-xs font-semibold text-ink">{label}</p>
          <ul className="space-y-1">
            {items.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-1.5 text-[13px]">
                <Link href={`/tasks/${t.id}`} className={cn('truncate hover:text-coral-dark', t.status === 'COMPLETED' && 'text-muted line-through')}>{t.title}</Link>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted">{formatDate(t.dueDate, { weekday: 'short', day: 'numeric' })}</span>
                  <OptBadge options={TASK_STATUS} value={t.status} dot={false} />
                  {t.assignee && <Avatar name={t.assignee.name} color={t.assignee.color} size="xs" />}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {tasks.length === 0 && <p className="text-center text-sm text-muted">No tasks.</p>}
    </div>
  )
}
