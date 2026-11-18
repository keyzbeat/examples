import { Receipt } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prepareList, prepareForm } from '@/lib/resources/page'
import { prisma } from '@/lib/prisma'
import { sp, type SP } from '@/lib/url'
import { QUOTE_STATUS } from '@/lib/options'
import { computeTotals, formatMoney } from '@/lib/money'
import { addDays, formatDate } from '@/lib/dates'
import { fullName, cn } from '@/lib/utils'
import { AppHeader, Kpi, KpiGrid } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Table, THead, Th, Tr, Td, TitleCell, Pagination } from '@/components/ui/table'
import { OptBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ListToolbar } from '@/components/resource/list-toolbar'
import { ResourceSheet } from '@/components/resource/resource-sheet'
import type { Quotation, QuotationItem } from '@prisma/client'

export const metadata = { title: 'Quotes' }
type Row = Quotation & { items: QuotationItem[]; client: { firstName: string; lastName: string; company: string | null }; project: { name: string } | null }

export default async function QuotesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requirePage('quotes')
  const params = await searchParams
  const data = await prepareList<Row>(ctx, 'quotes', params, { items: true, client: { select: { firstName: true, lastName: true, company: true } }, project: { select: { name: true } } })
  const form = await prepareForm(ctx, 'quotes', null, { clientId: sp(params, 'clientId'), projectId: sp(params, 'projectId'), issueDate: new Date(), expiryDate: addDays(new Date(), 30) }, data.options)
  const all = await prisma.quotation.findMany({ where: { organizationId: ctx.org.id, deletedAt: null }, select: { status: true, discountPct: true, items: true } })
  const sum = (s: string[]) => all.filter((q) => s.includes(q.status)).reduce((a, q) => a + computeTotals(q.items, q.discountPct).net, 0)
  const decided = all.filter((q) => q.status === 'APPROVED' || q.status === 'REJECTED')
  const path = '/quotes'
  const cur = ctx.org.currency
  return (
    <>
      <AppHeader icon={<Receipt />} title="Quotes" description="Automatic references, catalog lines, discounts, taxes and premium PDF" actions={data.canWrite && <ResourceSheet {...form} title="New quote" description="Create the header, then add lines on the next screen." triggerLabel="New quote" autoOpenParam />} />
      <KpiGrid className="mb-4">
        <Kpi label="Drafts" value={formatMoney(sum(['DRAFT']), cur, { compact: true })} hint={`${all.filter((q) => q.status === 'DRAFT').length} quotes · net`} />
        <Kpi label="Awaiting answer" value={formatMoney(sum(['SENT']), cur, { compact: true })} hint={`${all.filter((q) => q.status === 'SENT').length} sent`} />
        <Kpi label="Approved" value={formatMoney(sum(['APPROVED']), cur, { compact: true })} tone="good" />
        <Kpi label="Acceptance rate" value={decided.length ? `${Math.round((decided.filter((q) => q.status === 'APPROVED').length / decided.length) * 100)}%` : '—'} />
      </KpiGrid>
      <Card>
        <ListToolbar filters={data.toolbarFilters} placeholder="Search reference or title…" exportResource="quotes" />
        {data.rows.length === 0 ? <EmptyState icon={<Receipt />} title="No quotes" /> : (
          <>
            <Table>
              <THead>
                <Th sortKey="ref" path={path} params={params} currentSort={data.sort}>Quote</Th>
                <Th>Client</Th>
                <Th sortKey="issueDate" path={path} params={params} currentSort={data.sort}>Issued</Th>
                <Th sortKey="expiryDate" path={path} params={params} currentSort={data.sort}>Expires</Th>
                <Th sortKey="status" path={path} params={params} currentSort={data.sort}>Status</Th>
                <Th className="text-right">Total</Th>
                {ctx.can('finance') && <Th className="text-right">Margin</Th>}
              </THead>
              <tbody>
                {data.rows.map((q) => {
                  const t = computeTotals(q.items, q.discountPct)
                  const expired = q.status === 'SENT' && q.expiryDate && q.expiryDate < new Date()
                  return (
                    <Tr key={q.id}>
                      <Td className="max-w-[320px]"><TitleCell href={`/quotes/${q.id}`} title={q.title ?? q.ref} subtitle={[q.ref, q.project?.name].filter(Boolean).join(' · ')} /></Td>
                      <Td>{q.client.company ?? fullName(q.client)}</Td>
                      <Td className="whitespace-nowrap">{formatDate(q.issueDate)}</Td>
                      <Td className={cn('whitespace-nowrap', expired && 'font-medium text-red-600')}>{formatDate(q.expiryDate)}</Td>
                      <Td><OptBadge options={QUOTE_STATUS} value={q.status} /></Td>
                      <Td className="tabular text-right font-medium">{formatMoney(t.total, cur)}</Td>
                      {ctx.can('finance') && <Td className="tabular text-right text-emerald-700">{t.marginPct}%</Td>}
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
