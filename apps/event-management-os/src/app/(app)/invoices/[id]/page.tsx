import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Download, Send, User, FolderKanban, Ban } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { getRecord } from '@/lib/resources/server'
import { prepareForm } from '@/lib/resources/page'
import { RESOURCES } from '@/lib/resources/registry'
import { prisma } from '@/lib/prisma'
import { INVOICE_STATUS, PAYMENT_STATUS, PAYMENT_KIND, labelOf } from '@/lib/options'
import { computeTotals, formatMoney } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { fullName } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/card'
import { OptBadge } from '@/components/ui/badge'
import { buttonClass } from '@/components/ui/button'
import { ActionButton } from '@/components/ui/action-button'
import { DetailHeader, Stat } from '@/components/resource/detail'
import { ResourceSheet, DeleteButton } from '@/components/resource/resource-sheet'
import { Crumb } from '@/components/shell/shell-context'
import { LinesEditor } from '@/components/commercial/lines-editor'
import { quickUpdate } from '@/app/actions/resources'
import type { Invoice } from '@prisma/client'

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage('invoices')
  const { id } = await params
  const inv = await getRecord<Invoice & { client: { id: string; firstName: string; lastName: string; company: string | null }; project: { id: string; name: string } | null; quotation: { id: string; ref: string } | null }>(ctx, RESOURCES.invoices, id, { client: { select: { id: true, firstName: true, lastName: true, company: true } }, project: { select: { id: true, name: true } }, quotation: { select: { id: true, ref: true } } })
  if (!inv) notFound()
  const [items, payments, catalog, form] = await Promise.all([
    prisma.invoiceItem.findMany({ where: { invoiceId: id }, orderBy: { position: 'asc' } }),
    prisma.payment.findMany({ where: { invoiceId: id }, orderBy: { createdAt: 'asc' } }),
    prisma.service.findMany({ where: { organizationId: ctx.org.id, deletedAt: null, status: 'ACTIVE' }, orderBy: { name: 'asc' } }),
    prepareForm(ctx, 'invoices', inv as unknown as Record<string, unknown>),
  ])
  const total = computeTotals(items).total
  const paid = payments.filter((p) => p.status === 'PAID').reduce((a, p) => a + (p.kind === 'REFUND' ? -p.amount : p.amount), 0)
  const balance = total - paid
  const canWrite = ctx.can('invoices', 'write')
  const canPay = ctx.can('finance', 'write')
  const payForm = canPay ? await prepareForm(ctx, 'payments', null, { direction: 'INCOMING', kind: paid === 0 ? 'DEPOSIT' : 'BALANCE', amount: balance > 0 ? balance : null, status: 'PAID', paidAt: new Date(), method: 'TRANSFER', reference: inv.ref, projectId: inv.projectId }) : null
  const cur = ctx.org.currency
  const locked = inv.status === 'PAID' || inv.status === 'CANCELLED' || !canWrite
  return (
    <>
      <Crumb label={inv.ref} />
      <DetailHeader
        refLabel={inv.ref}
        title={`Invoice ${inv.ref}`}
        badges={<OptBadge options={INVOICE_STATUS} value={inv.status} />}
        meta={<><Link href={`/clients/${inv.client.id}`} className="inline-flex items-center gap-1 hover:text-coral-dark"><User /> {inv.client.company ?? fullName(inv.client)}</Link>{inv.project && <Link href={`/projects/${inv.project.id}`} className="inline-flex items-center gap-1 hover:text-coral-dark"><FolderKanban /> {inv.project.name}</Link>}{inv.quotation && <Link href={`/quotes/${inv.quotation.id}`} className="hover:text-coral-dark">From {inv.quotation.ref}</Link>}<span>Issued {formatDate(inv.issueDate)} · due {formatDate(inv.dueDate)}</span></>}
        actions={
          <>
            <a href={`/api/pdf/invoice/${id}`} className={buttonClass('secondary')}><Download /> PDF</a>
            {canWrite && inv.status === 'DRAFT' && <ActionButton variant="primary" action={quickUpdate.bind(null, 'invoices', id, 'status', 'SENT', undefined)} navigate={false}><Send /> Mark as sent</ActionButton>}
            {canPay && payForm && balance > 0 && inv.status !== 'DRAFT' && inv.status !== 'CANCELLED' && <ResourceSheet {...payForm} parents={{ invoiceId: id }} navigateOnCreate={false} title="Record a payment" description="Invoice status updates automatically." triggerLabel="Record payment" />}
            {canWrite && inv.status !== 'CANCELLED' && inv.status !== 'PAID' && <ActionButton variant="ghost" confirm="Cancel this invoice?" action={quickUpdate.bind(null, 'invoices', id, 'status', 'CANCELLED', undefined)} navigate={false}><Ban /> Cancel</ActionButton>}
            {canWrite && <ResourceSheet {...form} title="Edit invoice" triggerLabel="Edit" triggerVariant="secondary" icon="edit" />}
            {ctx.can('invoices', 'delete') && <DeleteButton resource="invoices" id={id} redirectTo="/invoices" size="icon-sm" />}
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total" value={formatMoney(total, cur)} />
        <Stat label="Paid" value={formatMoney(paid, cur)} />
        <Stat label="Remaining balance" value={formatMoney(balance, cur)} />
        <Stat label="Due date" value={formatDate(inv.dueDate)} hint={inv.status === 'OVERDUE' ? 'Overdue' : undefined} />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Items" />
          <LinesEditor kind="invoice" id={id} currency={cur} locked={locked} showCosts={false} defaultTax={ctx.org.taxRate}
            initial={items.map((i) => ({ serviceId: null, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, discountPct: i.discountPct, taxRate: i.taxRate }))}
            catalog={catalog.map((s) => ({ id: s.id, name: s.name, price: s.price, cost: s.cost, taxRate: s.taxRate, unit: s.unit, category: s.category }))} />
        </Card>
        <Card>
          <CardHeader title="Payments" />
          <ul className="divide-y divide-line">
            {payments.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">No payments yet.</li>}
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                <div><p className="font-medium">{labelOf(PAYMENT_KIND, p.kind)}</p><p className="text-xs text-muted">{p.paidAt ? `Paid ${formatDate(p.paidAt)}` : `Due ${formatDate(p.dueDate)}`}{p.method && ` · ${p.method.toLowerCase()}`}</p></div>
                <span className="flex items-center gap-2"><span className="tabular">{formatMoney(p.amount, cur)}</span><OptBadge options={PAYMENT_STATUS} value={p.status} /></span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
