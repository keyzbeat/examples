import Link from 'next/link'
import { Wallet, TrendingUp, ArrowDownLeft, ArrowUpRight, AlertTriangle, Handshake } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { getFinance } from '@/lib/finance'
import { formatMoney } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { fullName } from '@/lib/utils'
import { PremiumHeader, Kpi, KpiGrid } from '@/components/ui/page-header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { BarChart } from '@/components/charts/bar-chart'
import { MoneyFormat } from '@/components/charts/money-format'

export const metadata = { title: 'Finance' }

export default async function FinancePage() {
  const ctx = await requirePage('finance')
  const f = await getFinance(ctx.org.id)
  const cur = ctx.org.currency
  const m = (n: number) => formatMoney(n, cur)
  return (
    <>
      <PremiumHeader
        eyebrow="Finance"
        title="Financial overview"
        description="Cash-based revenue and expenses, receivables, supplier payables, commissions and 30-day forecast."
        actions={<><ButtonLink href="/finance/payments">All payments</ButtonLink>{ctx.can('reports') && <ButtonLink href="/reports" variant="primary">Reports</ButtonLink>}</>}
        kpis={
          <KpiGrid>
            <Kpi label="Revenue (YTD)" value={formatMoney(f.revenueYtd, cur, { compact: true })} hint={`${formatMoney(f.revenueMonth, cur, { compact: true })} this month`} icon={<TrendingUp />} tone="good" />
            <Kpi label="Expenses (YTD)" value={formatMoney(f.expensesYtd, cur, { compact: true })} hint="Supplier payments made" icon={<ArrowUpRight />} />
            <Kpi label="Profit (YTD)" value={formatMoney(f.profitYtd, cur, { compact: true })} hint={`Gross margin on approved quotes ${f.grossMarginPct}%`} icon={<Wallet />} />
            <Kpi label="Receivables" value={formatMoney(f.receivables, cur, { compact: true })} hint={`${f.overdueIn.length} overdue client payments`} icon={<ArrowDownLeft />} tone={f.overdueIn.length ? 'warn' : 'default'} />
          </KpiGrid>
        }
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Cash flow — last 6 months" description="Paid client payments vs paid supplier payments" />
          <CardBody>
            <MoneyFormat currency={cur} labels={f.series.map((s) => s.label)} series={[{ name: 'Revenue', values: f.series.map((s) => s.revenue) }, { name: 'Expenses', values: f.series.map((s) => s.expenses) }]} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Forecast — next 30 days" />
          <CardBody className="space-y-3 text-[13px]">
            <div className="flex justify-between"><span className="text-muted">Expected in (client payments)</span><span className="tabular font-medium text-emerald-700">+{m(f.forecast.in30)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Expected out (suppliers)</span><span className="tabular font-medium">−{m(f.forecast.out30)}</span></div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><span>Net cash forecast</span><span className="tabular">{m(f.forecast.net30)}</span></div>
            <div className="flex justify-between border-t border-line pt-3"><span className="text-muted">Backlog (approved, not invoiced)</span><span className="tabular">{m(f.backlog)}</span></div>
          </CardBody>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Pending client payments" description="Deposits and balances to collect" icon={<ArrowDownLeft />} action={<Link className="text-xs text-muted hover:text-coral-dark" href="/finance/payments?direction=INCOMING&status=PENDING">View all</Link>} />
          <ul className="divide-y divide-line">
            {f.pendingIn.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">Nothing to collect.</li>}
            {f.pendingIn.slice(0, 8).map((p) => {
              const late = p.dueDate && p.dueDate < new Date()
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.invoice ? <Link className="hover:text-coral-dark" href={`/invoices/${p.invoice.id}`}>{p.invoice.ref}</Link> : p.reference ?? 'Payment'} <span className="font-normal text-muted">· {p.invoice ? p.invoice.client.company ?? fullName(p.invoice.client) : p.project?.name}</span></p>
                    <p className={late ? 'text-xs font-medium text-red-600' : 'text-xs text-muted'}>{late && <AlertTriangle className="mr-1 inline size-3" />}Due {formatDate(p.dueDate)} · {p.kind.toLowerCase()}</p>
                  </div>
                  <span className="tabular font-medium">{m(p.amount)}</span>
                </li>
              )
            })}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Supplier payments due" icon={<ArrowUpRight />} />
          <ul className="divide-y divide-line">
            {f.pendingOut.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">Nothing due.</li>}
            {f.pendingOut.slice(0, 8).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
                <div className="min-w-0"><p className="truncate">{p.supplier?.companyName ?? '—'}</p><p className="text-xs text-muted">Due {formatDate(p.dueDate)}{p.project && ` · ${p.project.name}`}</p></div>
                <span className="tabular">{m(p.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader title="Partner commissions" icon={<Handshake />} />
          <ul className="divide-y divide-line">
            {f.commissions.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">No commissions.</li>}
            {f.commissions.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                <Link href={`/partners/${c.partnerId}`} className="hover:text-coral-dark">{c.partner.companyName} <span className="text-muted">· {c.rate}%</span></Link>
                <span className="flex items-center gap-3"><span className="tabular">{m(c.amount)}</span><Badge tone={c.status === 'PAID' ? 'green' : 'amber'}>{c.status.toLowerCase()}</Badge></span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
