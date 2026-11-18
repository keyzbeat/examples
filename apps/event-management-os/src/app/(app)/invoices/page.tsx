import { FileText } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prepareList, prepareForm } from '@/lib/resources/page'
import { sp, type SP } from '@/lib/url'
import { INVOICE_STATUS } from '@/lib/options'
import { computeTotals, formatMoney } from '@/lib/money'
import { addDays, formatDate } from '@/lib/dates'
import { fullName, cn } from '@/lib/utils'
import { AppHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Table, THead, Th, Tr, Td, TitleCell, Pagination } from '@/components/ui/table'
import { OptBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ListToolbar } from '@/components/resource/list-toolbar'
import { ResourceSheet } from '@/components/resource/resource-sheet'
import type { Invoice, InvoiceItem, Payment } from '@prisma/client'

export const metadata = { title: 'Invoices' }
type Row = Invoice & { items: InvoiceItem[]; payments: Payment[]; client: { firstName: string; lastName: string; company: string | null }; project: { name: string } | null }

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requirePage('invoices')
  const params = await searchParams
  const data = await prepareList<Row>(ctx, 'invoices', params, { items: true, payments: true, client: { select: { firstName: true, lastName: true, company: true } }, project: { select: { name: true } } })
  const form = await prepareForm(ctx, 'invoices', null, { clientId: sp(params, 'clientId'), projectId: sp(params, 'projectId'), issueDate: new Date(), dueDate: addDays(new Date(), 15) }, data.options)
  const path = '/invoices'
  const cur = ctx.org.currency
  return (
    <>
      <AppHeader icon={<FileText />} title="Invoices" description="Invoices, payments received and remaining balances" actions={data.canWrite && <ResourceSheet {...form} title="New invoice" triggerLabel="New invoice" autoOpenParam />} />
      <Card>
        <ListToolbar filters={data.toolbarFilters} placeholder="Search invoice number…" exportResource="invoices" />
        {data.rows.length === 0 ? <EmptyState icon={<FileText />} title="No invoices" /> : (
          <>
            <Table>
              <THead>
                <Th sortKey="ref" path={path} params={params} currentSort={data.sort}>Invoice</Th>
                <Th>Client</Th>
                <Th sortKey="issueDate" path={path} params={params} currentSort={data.sort}>Issued</Th>
                <Th sortKey="dueDate" path={path} params={params} currentSort={data.sort}>Due</Th>
                <Th sortKey="status" path={path} params={params} currentSort={data.sort}>Status</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-right">Paid</Th>
                <Th className="text-right">Balance</Th>
              </THead>
              <tbody>
                {data.rows.map((i) => {
                  const total = computeTotals(i.items).total
                  const paid = i.payments.filter((p) => p.status === 'PAID' && p.direction === 'INCOMING').reduce((a, p) => a + p.amount, 0)
                  return (
                    <Tr key={i.id}>
                      <Td><TitleCell href={`/invoices/${i.id}`} title={i.ref} subtitle={i.project?.name} /></Td>
                      <Td>{i.client.company ?? fullName(i.client)}</Td>
                      <Td className="whitespace-nowrap">{formatDate(i.issueDate)}</Td>
                      <Td className={cn('whitespace-nowrap', i.status === 'OVERDUE' && 'font-medium text-red-600')}>{formatDate(i.dueDate)}</Td>
                      <Td><OptBadge options={INVOICE_STATUS} value={i.status} /></Td>
                      <Td className="tabular text-right">{formatMoney(total, cur)}</Td>
                      <Td className="tabular text-right text-muted">{formatMoney(paid, cur)}</Td>
                      <Td className="tabular text-right font-medium">{formatMoney(total - paid, cur)}</Td>
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
