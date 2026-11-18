import { ConciergeBell } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prepareList } from '@/lib/resources/page'
import { sp, type SP } from '@/lib/url'
import { CONCIERGE_STATUS, PRIORITY } from '@/lib/options'
import { formatMoney } from '@/lib/money'
import { formatDateTime } from '@/lib/dates'
import { fullName, cn } from '@/lib/utils'
import { AppHeader, Kpi, KpiGrid } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Table, THead, Th, Tr, Td, TitleCell, Pagination } from '@/components/ui/table'
import { OptBadge } from '@/components/ui/badge'
import { UserChip } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { ListToolbar } from '@/components/resource/list-toolbar'
import { ResourceSheet } from '@/components/resource/resource-sheet'
import { StatusBoard } from '@/components/resource/status-board'
import { prisma } from '@/lib/prisma'
import type { ConciergeRequest } from '@prisma/client'

export const metadata = { title: 'Concierge' }
type Row = ConciergeRequest & { client: { firstName: string; lastName: string } | null; assignedTo: { name: string; color: string } | null; supplier: { companyName: string } | null }

export default async function ConciergePage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requirePage('concierge')
  const params = await searchParams
  const board = sp(params, 'view') === 'kanban'
  const data = await prepareList<Row>(ctx, 'concierge', params, { client: { select: { firstName: true, lastName: true } }, assignedTo: { select: { name: true, color: true } }, supplier: { select: { companyName: true } } }, undefined, board ? 100 : 25)
  const counts = await prisma.conciergeRequest.groupBy({ by: ['status'], where: { organizationId: ctx.org.id, deletedAt: null }, _count: true })
  const c = (s: string) => counts.find((x) => x.status === s)?._count ?? 0
  const urgent = await prisma.conciergeRequest.count({ where: { organizationId: ctx.org.id, deletedAt: null, priority: 'URGENT', status: { notIn: ['COMPLETED', 'CANCELLED'] } } })
  const path = '/concierge'
  const cur = ctx.org.currency
  return (
    <>
      <AppHeader icon={<ConciergeBell />} title="Concierge" description="Reservations, transfers, villa services, experiences and special requests" actions={data.canWrite && <ResourceSheet {...data.form} title="New concierge request" triggerLabel="New request" autoOpenParam />} />
      <KpiGrid className="mb-4">
        <Kpi label="New" value={c('NEW')} />
        <Kpi label="In progress" value={c('IN_PROGRESS') + c('WAITING_SUPPLIER')} hint={`${c('WAITING_SUPPLIER')} waiting for supplier`} />
        <Kpi label="Confirmed" value={c('CONFIRMED')} />
        <Kpi label="Urgent open" value={urgent} tone={urgent ? 'warn' : 'good'} />
      </KpiGrid>
      <Card>
        <ListToolbar filters={data.toolbarFilters} placeholder="Search requests…" views={['table', 'kanban']} exportResource="concierge" />
        {data.rows.length === 0 ? <EmptyState icon={<ConciergeBell />} title="No requests" /> : board ? (
          <div className="p-3">
            <StatusBoard resource="concierge" canWrite={data.canWrite} columns={CONCIERGE_STATUS} cards={data.rows.map((r) => ({ id: r.id, title: r.title, subtitle: [r.category, r.client && fullName(r.client)].filter(Boolean).join(' · '), href: `/concierge/${r.id}`, status: r.status, avatar: r.assignedTo, meta: r.deadline ? `Due ${formatDateTime(r.deadline)}` : null, metaTone: r.deadline && r.deadline < new Date() && !['COMPLETED', 'CANCELLED'].includes(r.status) ? 'danger' : 'default', badge: r.priority === 'URGENT' || r.priority === 'HIGH' ? { label: r.priority.toLowerCase(), className: 'bg-red-50 text-red-700' } : null }))} />
          </div>
        ) : (
          <>
            <Table>
              <THead>
                <Th sortKey="title" path={path} params={params} currentSort={data.sort}>Request</Th>
                <Th>Category</Th>
                <Th>Client</Th>
                <Th sortKey="requestedDate" path={path} params={params} currentSort={data.sort}>Requested for</Th>
                <Th sortKey="deadline" path={path} params={params} currentSort={data.sort}>Deadline</Th>
                <Th>Priority</Th>
                <Th sortKey="status" path={path} params={params} currentSort={data.sort}>Status</Th>
                <Th>Agent</Th>
                <Th sortKey="price" path={path} params={params} currentSort={data.sort} className="text-right">Price</Th>
              </THead>
              <tbody>
                {data.rows.map((r) => (
                  <Tr key={r.id}>
                    <Td className="max-w-[280px]"><TitleCell href={`/concierge/${r.id}`} title={r.title} subtitle={[r.ref, r.supplier?.companyName].filter(Boolean).join(' · ')} /></Td>
                    <Td className="text-muted">{r.category}</Td>
                    <Td>{r.client ? fullName(r.client) : '—'}</Td>
                    <Td className="whitespace-nowrap">{formatDateTime(r.requestedDate)}</Td>
                    <Td className={cn('whitespace-nowrap', r.deadline && r.deadline < new Date() && !['COMPLETED', 'CANCELLED'].includes(r.status) && 'font-medium text-red-600')}>{formatDateTime(r.deadline)}</Td>
                    <Td><OptBadge options={PRIORITY} value={r.priority} dot={false} /></Td>
                    <Td><OptBadge options={CONCIERGE_STATUS} value={r.status} /></Td>
                    <Td><UserChip user={r.assignedTo} /></Td>
                    <Td className="tabular text-right">{formatMoney(r.price, cur)}</Td>
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
