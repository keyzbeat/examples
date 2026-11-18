import Link from 'next/link'
import { Wallet } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prepareList } from '@/lib/resources/page'
import type { SP } from '@/lib/url'
import { PAYMENT_DIRECTION, PAYMENT_STATUS, labelOf, PAYMENT_KIND } from '@/lib/options'
import { formatMoney } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { AppHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Table, THead, Th, Tr, Td, Pagination } from '@/components/ui/table'
import { OptBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ListToolbar } from '@/components/resource/list-toolbar'
import { ResourceSheet } from '@/components/resource/resource-sheet'
import { ActionButton } from '@/components/ui/action-button'
import { quickUpdate } from '@/app/actions/resources'
import type { Payment } from '@prisma/client'

export const metadata = { title: 'Payments' }
type Row = Payment & { supplier: { id: string; companyName: string } | null; project: { id: string; name: string } | null; invoice: { id: string; ref: string } | null }

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requirePage('finance')
  const params = await searchParams
  const data = await prepareList<Row>(ctx, 'payments', params, { supplier: { select: { id: true, companyName: true } }, project: { select: { id: true, name: true } }, invoice: { select: { id: true, ref: true } } })
  const path = '/finance/payments'
  const cur = ctx.org.currency
  return (
    <>
      <AppHeader icon={<Wallet />} title="Payments" description="Client deposits & balances, supplier payments and deadlines" actions={data.canWrite && <ResourceSheet {...data.form} title="Record a payment" triggerLabel="New payment" navigateOnCreate={false} autoOpenParam />} />
      <Card>
        <ListToolbar filters={data.toolbarFilters} placeholder="Search reference or notes…" exportResource="payments" />
        {data.rows.length === 0 ? <EmptyState icon={<Wallet />} title="No payments" /> : (
          <>
            <Table>
              <THead>
                <Th>Direction</Th>
                <Th>Kind</Th>
                <Th>Counterparty / reference</Th>
                <Th>Project</Th>
                <Th sortKey="dueDate" path={path} params={params} currentSort={data.sort}>Due</Th>
                <Th sortKey="paidAt" path={path} params={params} currentSort={data.sort}>Paid</Th>
                <Th sortKey="status" path={path} params={params} currentSort={data.sort}>Status</Th>
                <Th sortKey="amount" path={path} params={params} currentSort={data.sort} className="text-right">Amount</Th>
                <Th />
              </THead>
              <tbody>
                {data.rows.map((p) => (
                  <Tr key={p.id}>
                    <Td><OptBadge options={PAYMENT_DIRECTION} value={p.direction} dot={false} /></Td>
                    <Td className="text-muted">{labelOf(PAYMENT_KIND, p.kind)}</Td>
                    <Td>{p.supplier ? <Link className="hover:text-coral-dark" href={`/suppliers/${p.supplier.id}`}>{p.supplier.companyName}</Link> : p.invoice ? <Link className="hover:text-coral-dark" href={`/invoices/${p.invoice.id}`}>{p.invoice.ref}</Link> : p.reference ?? '—'}</Td>
                    <Td className="max-w-[220px] truncate">{p.project ? <Link className="text-muted hover:text-coral-dark" href={`/projects/${p.project.id}`}>{p.project.name}</Link> : '—'}</Td>
                    <Td className={cn('whitespace-nowrap', p.status === 'PENDING' && p.dueDate && p.dueDate < new Date() && 'font-medium text-red-600')}>{formatDate(p.dueDate)}</Td>
                    <Td className="whitespace-nowrap text-muted">{formatDate(p.paidAt)}</Td>
                    <Td><OptBadge options={PAYMENT_STATUS} value={p.status} /></Td>
                    <Td className={cn('tabular text-right font-medium', p.direction === 'OUTGOING' && 'text-ink/70')}>{p.direction === 'OUTGOING' ? '−' : ''}{formatMoney(p.amount, cur)}</Td>
                    <Td className="text-right">{data.canWrite && p.status === 'PENDING' && <ActionButton size="sm" variant="ghost" action={quickUpdate.bind(null, 'payments', p.id, 'status', 'PAID', undefined)} navigate={false}>Mark paid</ActionButton>}</Td>
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
