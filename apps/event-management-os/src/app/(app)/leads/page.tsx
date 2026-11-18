import { Target } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prepareList } from '@/lib/resources/page'
import { prisma } from '@/lib/prisma'
import { sp, type SP } from '@/lib/url'
import { LEAD_STAGE, PRIORITY } from '@/lib/options'
import { formatMoney } from '@/lib/money'
import { formatDate, formatDateTime } from '@/lib/dates'
import { fullName, cn } from '@/lib/utils'
import { AppHeader, Kpi, KpiGrid } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Table, THead, Th, Tr, Td, TitleCell, Pagination } from '@/components/ui/table'
import { OptBadge } from '@/components/ui/badge'
import { UserChip } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { ListToolbar } from '@/components/resource/list-toolbar'
import { ResourceSheet } from '@/components/resource/resource-sheet'
import { LeadKanban } from '@/components/crm/lead-kanban'
import { ImportButton } from '@/components/resource/import-button'
import type { Lead, User } from '@prisma/client'

export const metadata = { title: 'CRM & Sales' }
type Row = Lead & { assignedTo: Pick<User, 'name' | 'color'> | null }

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requirePage('leads')
  const params = await searchParams
  const view = sp(params, 'view') ?? 'table'
  const isKanban = view === 'kanban'
  const isCalendar = view === 'calendar'
  const extraWhere = sp(params, 'stage') || isKanban ? undefined : { stage: { notIn: ['ARCHIVED'] } }
  const data = await prepareList<Row>(ctx, 'leads', params, { assignedTo: { select: { name: true, color: true } } }, isCalendar ? { ...extraWhere, nextFollowUp: { not: null } } : extraWhere, isKanban ? 100 : isCalendar ? 100 : 25)
  const org = ctx.org.id
  const [open, won, lost, valueOpen] = await Promise.all([
    prisma.lead.count({ where: { organizationId: org, deletedAt: null, stage: { notIn: ['WON', 'LOST', 'ARCHIVED'] } } }),
    prisma.lead.count({ where: { organizationId: org, deletedAt: null, stage: 'WON' } }),
    prisma.lead.count({ where: { organizationId: org, deletedAt: null, stage: 'LOST' } }),
    prisma.lead.aggregate({ where: { organizationId: org, deletedAt: null, stage: { notIn: ['WON', 'LOST', 'ARCHIVED'] } }, _sum: { estimatedBudget: true } }),
  ])
  const cur = ctx.org.currency
  const path = '/leads'

  return (
    <>
      <AppHeader
        icon={<Target />}
        title="CRM & Sales"
        description="Leads, pipeline and follow-ups"
        actions={
          data.canWrite && (
            <>
              <ImportButton resource="leads" />
              <ResourceSheet {...data.form} title="New lead" description="Capture a new opportunity. A qualification task is created automatically." triggerLabel="New lead" autoOpenParam />
            </>
          )
        }
      />
      <KpiGrid className="mb-4">
        <Kpi label="Open leads" value={open} />
        <Kpi label="Pipeline value" value={formatMoney(valueOpen._sum.estimatedBudget ?? 0, cur, { compact: true })} />
        <Kpi label="Won" value={won} hint="All time" />
        <Kpi label="Win rate" value={won + lost ? `${Math.round((won / (won + lost)) * 100)}%` : '—'} hint="Won / (won + lost)" />
      </KpiGrid>
      <Card>
        <ListToolbar filters={data.toolbarFilters} placeholder="Search name, company, email, phone…" views={['table', 'kanban', 'calendar']} exportResource="leads" />
        {isKanban ? (
          <div className="p-3">
            <LeadKanban
              canWrite={data.canWrite}
              currency={cur}
              showArchived={sp(params, 'stage') === 'ARCHIVED'}
              leads={data.rows.map((l) => ({ id: l.id, ref: l.ref, name: fullName(l), company: l.company, service: l.serviceRequested, budget: l.estimatedBudget, stage: l.stage, priority: l.priority, followUp: l.nextFollowUp?.toISOString() ?? null, assignee: l.assignedTo, position: l.position }))}
            />
          </div>
        ) : isCalendar ? (
          <FollowUpAgenda rows={data.rows} />
        ) : data.rows.length === 0 ? (
          <EmptyState icon={<Target />} title="No leads match" description="Adjust filters or create a new lead." />
        ) : (
          <>
            <Table>
              <THead>
                <Th sortKey="lastName" path={path} params={params} currentSort={data.sort}>Lead</Th>
                <Th>Service</Th>
                <Th sortKey="estimatedBudget" path={path} params={params} currentSort={data.sort}>Budget</Th>
                <Th sortKey="stage" path={path} params={params} currentSort={data.sort}>Stage</Th>
                <Th>Priority</Th>
                <Th>Source</Th>
                <Th sortKey="nextFollowUp" path={path} params={params} currentSort={data.sort}>Next follow-up</Th>
                <Th>Salesperson</Th>
              </THead>
              <tbody>
                {data.rows.map((l) => (
                  <Tr key={l.id}>
                    <Td>
                      <TitleCell href={`/leads/${l.id}`} title={fullName(l)} subtitle={[l.company, l.ref].filter(Boolean).join(' · ')} />
                    </Td>
                    <Td>{l.serviceRequested ?? '—'}</Td>
                    <Td className="tabular">{formatMoney(l.estimatedBudget, cur)}</Td>
                    <Td><OptBadge options={LEAD_STAGE} value={l.stage} /></Td>
                    <Td><OptBadge options={PRIORITY} value={l.priority} dot={false} /></Td>
                    <Td className="text-muted">{l.source ?? '—'}</Td>
                    <Td className={cn('whitespace-nowrap', l.nextFollowUp && l.nextFollowUp < new Date() && !['WON', 'LOST', 'ARCHIVED'].includes(l.stage) && 'font-medium text-red-600')}>{formatDateTime(l.nextFollowUp)}</Td>
                    <Td><UserChip user={l.assignedTo} /></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pagination path={path} params={params} page={data.page} pageSize={data.pageSize} total={data.total} />
          </>
        )}
      </Card>
    </>
  )
}

function FollowUpAgenda({ rows }: { rows: Row[] }) {
  const sorted = [...rows].sort((a, b) => a.nextFollowUp!.getTime() - b.nextFollowUp!.getTime())
  const groups = new Map<string, Row[]>()
  for (const r of sorted) {
    const k = formatDate(r.nextFollowUp, { weekday: 'long', day: 'numeric', month: 'long' })
    groups.set(k, [...(groups.get(k) ?? []), r])
  }
  if (!sorted.length) return <EmptyState title="No follow-ups scheduled" />
  return (
    <div className="divide-y divide-line">
      {[...groups.entries()].map(([day, items]) => (
        <div key={day} className="flex flex-col gap-2 px-4 py-3 sm:flex-row">
          <div className="w-48 shrink-0 text-[13px] font-medium text-ink">{day}</div>
          <ul className="flex-1 space-y-1.5">
            {items.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 text-[13px]">
                <a href={`/leads/${l.id}`} className="hover:text-coral-dark">
                  <span className="tabular mr-2 text-muted">{l.nextFollowUp!.toTimeString().slice(0, 5)}</span>
                  {fullName(l)} <span className="text-muted">· {l.serviceRequested}</span>
                </a>
                <span className="flex items-center gap-2">
                  <OptBadge options={LEAD_STAGE} value={l.stage} />
                  <UserChip user={l.assignedTo} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
