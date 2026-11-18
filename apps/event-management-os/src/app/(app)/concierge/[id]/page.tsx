import { notFound } from 'next/navigation'
import { CalendarClock, User } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { getRecord, loadRelationOptions, relationKindsOf } from '@/lib/resources/server'
import { prepareForm } from '@/lib/resources/page'
import { RESOURCES } from '@/lib/resources/registry'
import { CONCIERGE_STATUS, PRIORITY } from '@/lib/options'
import { formatMoney, marginOf } from '@/lib/money'
import { formatDateTime } from '@/lib/dates'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { OptBadge } from '@/components/ui/badge'
import { DetailHeader, Stat } from '@/components/resource/detail'
import { FieldValues } from '@/components/resource/field-values'
import { ResourceSheet, DeleteButton } from '@/components/resource/resource-sheet'
import { RecordHistory } from '@/components/resource/record-history'
import { StatusQuick } from '@/components/resource/status-quick'
import { Crumb } from '@/components/shell/shell-context'
import type { ConciergeRequest } from '@prisma/client'

export default async function ConciergeRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage('concierge')
  const { id } = await params
  const r = await getRecord<ConciergeRequest>(ctx, RESOURCES.concierge, id)
  if (!r) notFound()
  const options = await loadRelationOptions(ctx, relationKindsOf(RESOURCES.concierge))
  const form = await prepareForm(ctx, 'concierge', r as unknown as Record<string, unknown>, undefined, options)
  const canWrite = ctx.can('concierge', 'write')
  const m = marginOf(r.cost ?? 0, r.price ?? 0)
  const cur = ctx.org.currency
  const agent = options.user?.find((u) => u.value === r.assignedToId)?.label
  return (
    <>
      <Crumb label={r.title} />
      <DetailHeader
        refLabel={r.ref}
        title={r.title}
        badges={<><OptBadge options={CONCIERGE_STATUS} value={r.status} /><OptBadge options={PRIORITY} value={r.priority} dot={false} /><span className="text-xs text-muted">{r.category}</span></>}
        meta={<>{r.requestedDate && <span className="inline-flex items-center gap-1"><CalendarClock /> For {formatDateTime(r.requestedDate)}</span>}{agent && <span className="inline-flex items-center gap-1"><User /> {agent}</span>}</>}
        actions={canWrite && <><ResourceSheet {...form} title="Edit request" triggerLabel="Edit" triggerVariant="secondary" icon="edit" />{ctx.can('concierge', 'delete') && <DeleteButton resource="concierge" id={id} redirectTo="/concierge" size="icon-sm" />}</>}
      />
      <div className="mb-4">
        <StatusQuick resource="concierge" id={id} field="status" value={r.status} options={CONCIERGE_STATUS} canWrite={canWrite} />
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Deadline" value={r.deadline ? formatDateTime(r.deadline) : '—'} />
        <Stat label="Selling price" value={formatMoney(r.price, cur)} />
        {ctx.can('finance') && <Stat label="Cost" value={formatMoney(r.cost, cur)} />}
        {ctx.can('finance') && <Stat label="Margin" value={formatMoney(m.margin, cur)} hint={`${m.pct}%`} />}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Request details" />
          <CardBody><FieldValues fields={RESOURCES.concierge.fields} record={r as unknown as Record<string, unknown>} options={options} currency={cur} exclude={ctx.can('finance') ? ['title'] : ['title', 'cost']} /></CardBody>
        </Card>
        <RecordHistory organizationId={ctx.org.id} entityId={id} />
      </div>
    </>
  )
}
