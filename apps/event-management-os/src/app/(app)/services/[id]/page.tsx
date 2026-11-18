import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requirePage } from '@/lib/auth/context'
import { getRecord, loadRelationOptions, relationKindsOf } from '@/lib/resources/server'
import { prepareForm } from '@/lib/resources/page'
import { RESOURCES } from '@/lib/resources/registry'
import { prisma } from '@/lib/prisma'
import { SERVICE_STATUS } from '@/lib/options'
import { formatMoney, marginOf } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { OptBadge, Badge } from '@/components/ui/badge'
import { DetailHeader, Stat } from '@/components/resource/detail'
import { FieldValues } from '@/components/resource/field-values'
import { ResourceSheet, DeleteButton } from '@/components/resource/resource-sheet'
import { Crumb } from '@/components/shell/shell-context'
import type { Service } from '@prisma/client'

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage('services')
  const { id } = await params
  const s = await getRecord<Service>(ctx, RESOURCES.services, id)
  if (!s) notFound()
  const [usage, quoteUsage, options] = await Promise.all([
    prisma.projectService.findMany({ where: { serviceId: id }, include: { project: { select: { id: true, name: true } }, event: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.quotationItem.count({ where: { serviceId: id, quotation: { deletedAt: null } } }),
    loadRelationOptions(ctx, relationKindsOf(RESOURCES.services)),
  ])
  const form = await prepareForm(ctx, 'services', s as unknown as Record<string, unknown>, undefined, options)
  const m = marginOf(s.cost, s.price)
  const showCost = ctx.can('finance') || ctx.can('services', 'write')
  const cur = ctx.org.currency
  return (
    <>
      <Crumb label={s.name} />
      <DetailHeader refLabel={s.ref} title={s.name} badges={<><OptBadge options={SERVICE_STATUS} value={s.status} /><Badge>{s.category}</Badge></>} actions={ctx.can('services', 'write') && <><ResourceSheet {...form} title="Edit service" triggerLabel="Edit" triggerVariant="secondary" icon="edit" />{ctx.can('services', 'delete') && <DeleteButton resource="services" id={id} redirectTo="/services" size="icon-sm" />}</>} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Selling price" value={formatMoney(s.price, cur)} hint={`per ${s.unit} · tax ${s.taxRate}%`} />
        {showCost && <Stat label="Purchase cost" value={formatMoney(s.cost, cur)} />}
        {showCost && <Stat label="Margin" value={formatMoney(m.margin, cur)} hint={`${m.pct}% of price`} />}
        <Stat label="Used in" value={`${usage.length} projects/events`} hint={`${quoteUsage} quote lines`} />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Service details" />
          <CardBody>
            {s.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.imageUrl} alt={s.name} className="mb-4 max-h-56 rounded-xl border border-line object-cover" />
            )}
            <FieldValues fields={RESOURCES.services.fields} record={s as unknown as Record<string, unknown>} options={options} currency={cur} exclude={showCost ? ['name'] : ['name', 'cost']} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Recent usage" />
          <ul className="divide-y divide-line">
            {usage.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">Not used yet.</li>}
            {usage.map((u) => (
              <li key={u.id} className="flex justify-between px-4 py-2.5 text-[13px]">
                {u.project ? <Link href={`/projects/${u.project.id}?tab=budget`} className="hover:text-coral-dark">{u.project.name}</Link> : u.event ? <Link href={`/events/${u.event.id}?tab=services`} className="hover:text-coral-dark">{u.event.name}</Link> : '—'}
                <span className="text-muted">×{u.quantity} · {formatDate(u.createdAt, { day: 'numeric', month: 'short' })}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
