import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Copy, Download, FileCheck2, FileText, Send, ThumbsDown, ThumbsUp, User, FolderKanban } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { getRecord } from '@/lib/resources/server'
import { prepareForm } from '@/lib/resources/page'
import { RESOURCES } from '@/lib/resources/registry'
import { prisma } from '@/lib/prisma'
import { INVOICE_STATUS, QUOTE_STATUS } from '@/lib/options'
import { computeTotals, formatMoney } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { fullName } from '@/lib/utils'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { OptBadge } from '@/components/ui/badge'
import { buttonClass } from '@/components/ui/button'
import { ActionButton } from '@/components/ui/action-button'
import { DetailHeader, InfoGrid } from '@/components/resource/detail'
import { ResourceSheet, DeleteButton } from '@/components/resource/resource-sheet'
import { Crumb } from '@/components/shell/shell-context'
import { LinesEditor } from '@/components/commercial/lines-editor'
import { quickUpdate } from '@/app/actions/resources'
import { duplicateQuote, quoteToInvoice } from '@/app/actions/commercial'
import type { Quotation } from '@prisma/client'

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage('quotes')
  const { id } = await params
  const q = await getRecord<Quotation & { client: { id: string; firstName: string; lastName: string; company: string | null; email: string | null }; project: { id: string; name: string } | null }>(ctx, RESOURCES.quotes, id, { client: { select: { id: true, firstName: true, lastName: true, company: true, email: true } }, project: { select: { id: true, name: true } } })
  if (!q) notFound()
  const [items, invoices, catalog, form] = await Promise.all([
    prisma.quotationItem.findMany({ where: { quotationId: id }, orderBy: { position: 'asc' } }),
    prisma.invoice.findMany({ where: { quotationId: id, deletedAt: null }, include: { items: true } }),
    prisma.service.findMany({ where: { organizationId: ctx.org.id, deletedAt: null, status: 'ACTIVE' }, include: { supplier: { select: { status: true } } }, orderBy: { name: 'asc' } }),
    prepareForm(ctx, 'quotes', q as unknown as Record<string, unknown>),
  ])
  const canWrite = ctx.can('quotes', 'write')
  const t = computeTotals(items, q.discountPct)
  const cur = ctx.org.currency
  const showCosts = ctx.can('finance')
  return (
    <>
      <Crumb label={q.ref} />
      <DetailHeader
        refLabel={q.ref}
        title={q.title ?? `Quote ${q.ref}`}
        badges={<OptBadge options={QUOTE_STATUS} value={q.status} />}
        meta={<><Link href={`/clients/${q.client.id}`} className="inline-flex items-center gap-1 hover:text-coral-dark"><User /> {q.client.company ?? fullName(q.client)}</Link>{q.project && <Link href={`/projects/${q.project.id}`} className="inline-flex items-center gap-1 hover:text-coral-dark"><FolderKanban /> {q.project.name}</Link>}<span>Issued {formatDate(q.issueDate)} · valid until {formatDate(q.expiryDate)}</span></>}
        actions={
          <>
            <a href={`/api/pdf/quote/${id}`} className={buttonClass('secondary')}><Download /> PDF</a>
            {canWrite && q.status === 'DRAFT' && <ActionButton variant="secondary" action={quickUpdate.bind(null, 'quotes', id, 'status', 'SENT', undefined)} navigate={false}><Send /> Mark as sent</ActionButton>}
            {canWrite && (q.status === 'SENT' || q.status === 'DRAFT') && <ActionButton variant="primary" action={quickUpdate.bind(null, 'quotes', id, 'status', 'APPROVED', undefined)} navigate={false}><ThumbsUp /> Approve</ActionButton>}
            {canWrite && q.status === 'SENT' && <ActionButton variant="ghost" action={quickUpdate.bind(null, 'quotes', id, 'status', 'REJECTED', undefined)} navigate={false}><ThumbsDown /> Rejected</ActionButton>}
            {q.status === 'APPROVED' && ctx.can('invoices', 'write') && <><ActionButton variant="primary" action={quoteToInvoice.bind(null, id, 30)}><FileCheck2 /> Deposit invoice 30%</ActionButton><ActionButton variant="secondary" action={quoteToInvoice.bind(null, id, 100)}><FileText /> Full invoice</ActionButton></>}
            {canWrite && <ActionButton variant="ghost" action={duplicateQuote.bind(null, id)}><Copy /> Duplicate</ActionButton>}
            {canWrite && q.status !== 'APPROVED' && <ResourceSheet {...form} title="Edit quote" triggerLabel="Edit" triggerVariant="secondary" icon="edit" />}
            {ctx.can('quotes', 'delete') && <DeleteButton resource="quotes" id={id} redirectTo="/quotes" size="icon-sm" />}
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Services" description="Quantities, unit prices, discounts and taxes — saved in one click" />
          <LinesEditor kind="quote" id={id} currency={cur} locked={q.status === 'APPROVED' || !canWrite} globalDiscount={q.discountPct} showCosts={showCosts} defaultTax={ctx.org.taxRate}
            initial={items.map((i) => ({ serviceId: i.serviceId, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, unitCost: i.unitCost, discountPct: i.discountPct, taxRate: i.taxRate }))}
            catalog={catalog.map((s) => ({ id: s.id, name: s.name, price: s.price, cost: s.cost, taxRate: s.taxRate, unit: s.unit, category: s.category, disabled: s.supplier?.status === 'SUSPENDED' }))} />
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Summary" />
            <CardBody>
              <InfoGrid cols={1} items={[
                { label: 'Total (incl. tax)', value: <span className="text-lg font-semibold">{formatMoney(t.total, cur)}</span> },
                { label: 'Net / tax', value: `${formatMoney(t.net, cur)} + ${formatMoney(t.tax, cur)}` },
                ...(showCosts ? [{ label: 'Margin', value: `${formatMoney(t.margin, cur)} (${t.marginPct}%)` }] : []),
                { label: 'Client email', value: q.client.email },
                { label: 'Approved on', value: q.approvedAt ? formatDate(q.approvedAt) : null },
              ]} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Terms & notes" />
            <CardBody><InfoGrid cols={1} items={[{ label: 'Terms & conditions', value: q.terms }, { label: 'Notes', value: q.notes }]} /></CardBody>
          </Card>
          {invoices.length > 0 && (
            <Card>
              <CardHeader title="Invoices from this quote" />
              <ul className="divide-y divide-line">{invoices.map((i) => <li key={i.id} className="flex items-center justify-between px-4 py-2.5 text-[13px]"><Link href={`/invoices/${i.id}`} className="hover:text-coral-dark">{i.ref}</Link><span className="flex items-center gap-2"><span className="tabular">{formatMoney(computeTotals(i.items).total, cur)}</span><OptBadge options={INVOICE_STATUS} value={i.status} /></span></li>)}</ul>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
