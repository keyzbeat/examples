import Link from 'next/link'
import { BarChart3, Download } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prisma } from '@/lib/prisma'
import { getFinance } from '@/lib/finance'
import { computeTotals, formatMoney } from '@/lib/money'
import { LEAD_STAGE, PROJECT_TYPE, labelOf } from '@/lib/options'
import { fullName } from '@/lib/utils'
import { PremiumHeader, Kpi, KpiGrid } from '@/components/ui/page-header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { buttonClass } from '@/components/ui/button'
import { MoneyFormat, MoneyHBars, CountHBars } from '@/components/charts/money-format'

export const metadata = { title: 'Reports & Analytics' }

export default async function ReportsPage() {
  const ctx = await requirePage('reports')
  const org = ctx.org.id
  const nd = { organizationId: org, deletedAt: null }
  const [fin, leadsByStage, leadsBySource, projectsByType, quotes, tasks, supplierSpend, eventsCount, guestsAgg] = await Promise.all([
    ctx.can('finance') ? getFinance(org, 12) : null,
    prisma.lead.groupBy({ by: ['stage'], where: nd, _count: true, _sum: { estimatedBudget: true } }),
    prisma.lead.groupBy({ by: ['source'], where: nd, _count: true }),
    prisma.project.groupBy({ by: ['type'], where: nd, _count: true, _sum: { budget: true } }),
    prisma.quotation.findMany({ where: { ...nd, status: 'APPROVED' }, include: { items: true, client: { select: { id: true, firstName: true, lastName: true, company: true } } } }),
    prisma.task.groupBy({ by: ['status'], where: nd, _count: true }),
    prisma.payment.groupBy({ by: ['supplierId'], where: { organizationId: org, direction: 'OUTGOING', status: 'PAID', supplierId: { not: null } }, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } }, take: 6 }),
    prisma.event.count({ where: nd }),
    prisma.guest.count({ where: { event: nd, rsvp: 'ACCEPTED' } }),
  ])
  const suppliers = await prisma.supplier.findMany({ where: { id: { in: supplierSpend.map((s) => s.supplierId!) } }, select: { id: true, companyName: true } })
  const won = leadsByStage.find((l) => l.stage === 'WON')?._count ?? 0
  const lost = leadsByStage.find((l) => l.stage === 'LOST')?._count ?? 0
  const totalLeads = leadsByStage.reduce((a, l) => a + l._count, 0)
  const doneTasks = tasks.find((t) => t.status === 'COMPLETED')?._count ?? 0
  const totalTasks = tasks.filter((t) => t.status !== 'CANCELLED').reduce((a, t) => a + t._count, 0)
  const byClient = new Map<string, { name: string; value: number }>()
  for (const q of quotes) {
    const k = q.client.id
    const cur = byClient.get(k) ?? { name: q.client.company ?? fullName(q.client), value: 0 }
    cur.value += computeTotals(q.items, q.discountPct).net
    byClient.set(k, cur)
  }
  const topClients = [...byClient.values()].sort((a, b) => b.value - a.value).slice(0, 6)
  const cur = ctx.org.currency
  return (
    <>
      <PremiumHeader
        eyebrow="Analytics"
        title="Reports & Analytics"
        description="Commercial performance, operations and finance at a glance. Every list can also be exported to CSV/Excel from its module."
        actions={<><a className={buttonClass('secondary')} href="/api/export/leads"><Download /> Leads CSV</a><a className={buttonClass('secondary')} href="/api/export/projects"><Download /> Projects CSV</a>{ctx.can('finance') && <a className={buttonClass('secondary')} href="/api/export/payments"><Download /> Payments CSV</a>}</>}
        kpis={
          <KpiGrid>
            <Kpi label="Lead conversion" value={won + lost ? `${Math.round((won / (won + lost)) * 100)}%` : '—'} hint={`${won} won · ${lost} lost · ${totalLeads} total`} icon={<BarChart3 />} />
            <Kpi label="Approved business" value={formatMoney(quotes.reduce((a, q) => a + computeTotals(q.items, q.discountPct).net, 0), cur, { compact: true })} hint={`${quotes.length} approved quotes (net)`} />
            <Kpi label="Events delivered / planned" value={eventsCount} hint={`${guestsAgg} confirmed guests`} />
            <Kpi label="Task completion" value={totalTasks ? `${Math.round((doneTasks / totalTasks) * 100)}%` : '—'} hint={`${doneTasks}/${totalTasks} tasks`} />
          </KpiGrid>
        }
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {fin && (
          <Card className="xl:col-span-2">
            <CardHeader title="Revenue vs expenses — 12 months" description="Cash basis (paid payments)" />
            <CardBody><MoneyFormat currency={cur} labels={fin.series.map((s) => s.label)} series={[{ name: 'Revenue', values: fin.series.map((s) => s.revenue) }, { name: 'Expenses', values: fin.series.map((s) => s.expenses) }]} /></CardBody>
          </Card>
        )}
        <Card>
          <CardHeader title="Pipeline value by stage" description="Estimated budgets of leads" />
          <CardBody><MoneyHBars currency={cur} rows={LEAD_STAGE.filter((s) => s.value !== 'ARCHIVED').map((s) => { const r = leadsByStage.find((l) => l.stage === s.value); return { label: s.label, value: r?._sum.estimatedBudget ?? 0, hint: `${r?._count ?? 0} leads` } })} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Lead sources" />
          <CardBody><CountHBars rows={leadsBySource.sort((a, b) => b._count - a._count).map((s) => ({ label: s.source ?? 'Unknown', value: s._count }))} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Projects by type" description="Count and total client budget" />
          <CardBody><CountHBars rows={projectsByType.sort((a, b) => b._count - a._count).map((p) => ({ label: labelOf(PROJECT_TYPE, p.type), value: p._count, hint: formatMoney(p._sum.budget ?? 0, cur, { compact: true }) }))} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Top clients" description="Approved quotes, net" />
          <CardBody><MoneyHBars currency={cur} rows={topClients.map((c) => ({ label: c.name, value: c.value }))} /></CardBody>
        </Card>
        {ctx.can('finance') && (
          <Card>
            <CardHeader title="Top suppliers by spend" description="Paid supplier payments" action={<Link href="/suppliers" className="text-xs text-muted hover:text-coral-dark">Directory</Link>} />
            <CardBody><MoneyHBars currency={cur} rows={supplierSpend.map((s) => ({ label: suppliers.find((x) => x.id === s.supplierId)?.companyName ?? '—', value: s._sum.amount ?? 0 }))} /></CardBody>
          </Card>
        )}
      </div>
    </>
  )
}
