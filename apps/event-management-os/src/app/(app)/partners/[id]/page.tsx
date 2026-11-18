import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Globe, Mail, MapPin, Phone } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { getRecord, loadRelationOptions } from '@/lib/resources/server'
import { prepareForm } from '@/lib/resources/page'
import { RESOURCES } from '@/lib/resources/registry'
import { prisma } from '@/lib/prisma'
import { PARTNER_STATUS, DOCUMENT_CATEGORY } from '@/lib/options'
import { formatMoney } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { OptBadge, Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { DetailHeader, Stat } from '@/components/resource/detail'
import { FieldValues } from '@/components/resource/field-values'
import { ResourceSheet, DeleteButton } from '@/components/resource/resource-sheet'
import { RecordHistory } from '@/components/resource/record-history'
import { Crumb } from '@/components/shell/shell-context'
import type { Partner } from '@prisma/client'

export default async function PartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage('partners')
  const { id } = await params
  const p = await getRecord<Partner>(ctx, RESOURCES.partners, id)
  if (!p) notFound()
  const [commissions, documents, options, form] = await Promise.all([
    ctx.can('finance') ? prisma.commission.findMany({ where: { partnerId: id }, include: { project: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } }) : [],
    ctx.can('documents') ? prisma.document.findMany({ where: { partnerId: id, deletedAt: null, next: null } }) : [],
    loadRelationOptions(ctx, []),
    prepareForm(ctx, 'partners', p as unknown as Record<string, unknown>),
  ])
  const cur = ctx.org.currency
  const total = commissions.reduce((a, c) => a + c.amount, 0)
  const pending = commissions.filter((c) => c.status === 'PENDING').reduce((a, c) => a + c.amount, 0)
  return (
    <>
      <Crumb label={p.companyName} />
      <DetailHeader
        refLabel={p.ref}
        title={p.companyName}
        badges={<><OptBadge options={PARTNER_STATUS} value={p.status} /><Badge>{p.category}</Badge></>}
        meta={<>{p.city && <span className="inline-flex items-center gap-1"><MapPin /> {[p.city, p.country].filter(Boolean).join(', ')}</span>}{p.email && <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 hover:text-coral-dark"><Mail /> {p.email}</a>}{p.phone && <span className="inline-flex items-center gap-1"><Phone /> {p.phone}</span>}{p.website && <a href={p.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-coral-dark"><Globe /> Website</a>}</>}
        actions={ctx.can('partners', 'write') && <><ResourceSheet {...form} title="Edit partner" triggerLabel="Edit" triggerVariant="secondary" icon="edit" />{ctx.can('partners', 'delete') && <DeleteButton resource="partners" id={id} redirectTo="/partners" size="icon-sm" />}</>}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Commission rate" value={p.commissionRate !== null ? `${p.commissionRate}%` : '—'} />
        <Stat label="Referred projects" value={commissions.length} />
        {ctx.can('finance') && <Stat label="Commissions (total)" value={formatMoney(total, cur)} />}
        {ctx.can('finance') && <Stat label="Commissions to pay" value={formatMoney(pending, cur)} />}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader title="Partner profile" />
            <CardBody><FieldValues fields={RESOURCES.partners.fields} record={p as unknown as Record<string, unknown>} options={options} currency={cur} exclude={['companyName']} /></CardBody>
          </Card>
          {ctx.can('finance') && (
            <Card>
              <CardHeader title="Collaboration & commissions" />
              {commissions.length === 0 ? <EmptyState title="No commissions yet" /> : (
                <ul className="divide-y divide-line">
                  {commissions.map((c) => (
                    <li key={c.id} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                      <span>{c.project ? <Link href={`/projects/${c.project.id}`} className="hover:text-coral-dark">{c.project.name}</Link> : '—'} <span className="text-xs text-muted">· {formatDate(c.createdAt)}</span></span>
                      <span className="flex items-center gap-3"><span className="tabular">{formatMoney(c.amount, cur)}</span><Badge tone={c.status === 'PAID' ? 'green' : 'amber'}>{c.status.toLowerCase()}</Badge></span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Documents" action={<Link href={`/documents?partnerId=${id}`} className="text-xs text-muted hover:text-coral-dark">Upload</Link>} />
            {documents.length === 0 ? <p className="px-4 py-5 text-center text-sm text-muted">No documents.</p> : (
              <ul className="divide-y divide-line">{documents.map((d) => <li key={d.id} className="flex justify-between px-4 py-2 text-[13px]"><a className="hover:text-coral-dark" href={`/api/documents/${d.id}`}>{d.name}</a><OptBadge options={DOCUMENT_CATEGORY} value={d.category} dot={false} /></li>)}</ul>
            )}
          </Card>
          <RecordHistory organizationId={ctx.org.id} entityId={id} title="Collaboration history" />
        </div>
      </div>
    </>
  )
}
