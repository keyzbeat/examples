import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AtSign, Globe, Mail, MapPin, MessageCircle, Phone, Star, AlertTriangle } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { getRecord, loadRelationOptions, relationKindsOf } from '@/lib/resources/server'
import { prepareForm } from '@/lib/resources/page'
import { RESOURCES } from '@/lib/resources/registry'
import { prisma } from '@/lib/prisma'
import { DOCUMENT_CATEGORY, PAYMENT_STATUS, PROJECT_STATUS, SUPPLIER_STATUS } from '@/lib/options'
import { formatMoney } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { OptBadge } from '@/components/ui/badge'
import { RatingStars } from '@/components/ui/rating'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, THead, Th, Tr, Td, TitleCell } from '@/components/ui/table'
import { DetailHeader, Stat } from '@/components/resource/detail'
import { FieldValues } from '@/components/resource/field-values'
import { ResourceSheet, DeleteButton } from '@/components/resource/resource-sheet'
import { RecordHistory } from '@/components/resource/record-history'
import { Crumb } from '@/components/shell/shell-context'
import { ContactForm, DeleteContact, FavoriteToggle } from '@/components/suppliers/supplier-bits'
import type { Supplier } from '@prisma/client'

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage('suppliers')
  const { id } = await params
  const s = await getRecord<Supplier & { categories: { id: string; name: string }[]; contacts: { id: string; name: string; role: string | null; email: string | null; phone: string | null; isPrimary: boolean }[] }>(ctx, RESOURCES.suppliers, id, { categories: true, contacts: { orderBy: { isPrimary: 'desc' } } })
  if (!s) notFound()
  const [projects, services, payments, reservations, documents, options] = await Promise.all([
    prisma.projectSupplier.findMany({ where: { supplierId: id, project: { deletedAt: null } }, include: { project: { select: { id: true, name: true, ref: true, status: true, startDate: true } } } }),
    prisma.service.findMany({ where: { supplierId: id, deletedAt: null } }),
    ctx.can('finance') ? prisma.payment.findMany({ where: { supplierId: id }, orderBy: { dueDate: 'desc' }, include: { project: { select: { name: true } } } }) : [],
    prisma.reservation.count({ where: { supplierId: id } }),
    ctx.can('documents') ? prisma.document.findMany({ where: { supplierId: id, deletedAt: null, next: null } }) : [],
    loadRelationOptions(ctx, relationKindsOf(RESOURCES.suppliers)),
  ])
  const form = await prepareForm(ctx, 'suppliers', { ...s, categories: s.categories } as unknown as Record<string, unknown>, undefined, options)
  const cur = ctx.org.currency
  const canWrite = ctx.can('suppliers', 'write')
  const confirmed = projects.filter((p) => p.status === 'CONFIRMED' || p.status === 'BOOKED').length
  const cancelled = projects.filter((p) => p.status === 'CANCELLED').length
  const paid = payments.filter((p) => p.status === 'PAID').reduce((a, p) => a + p.amount, 0)
  const due = payments.filter((p) => p.status === 'PENDING').reduce((a, p) => a + p.amount, 0)
  return (
    <>
      <Crumb label={s.companyName} />
      <DetailHeader
        refLabel={s.ref}
        title={<span className="inline-flex items-center gap-2">{s.companyName}<FavoriteToggle id={s.id} value={s.favorite} canWrite={canWrite} /></span>}
        badges={<><OptBadge options={SUPPLIER_STATUS} value={s.status} /><RatingStars value={s.rating} /></>}
        meta={<>{s.city && <span className="inline-flex items-center gap-1"><MapPin /> {s.city}{s.coverageArea && ` · ${s.coverageArea}`}</span>}{s.email && <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1 hover:text-coral-dark"><Mail /> {s.email}</a>}{s.phone && <span className="inline-flex items-center gap-1"><Phone /> {s.phone}</span>}{s.whatsapp && <a target="_blank" rel="noreferrer" href={`https://wa.me/${s.whatsapp.replace(/\D/g, '')}`} className="inline-flex items-center gap-1 hover:text-coral-dark"><MessageCircle /> WhatsApp</a>}{s.instagram && <span className="inline-flex items-center gap-1"><AtSign /> {s.instagram.replace('@', '')}</span>}{s.website && <a href={s.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-coral-dark"><Globe /> Website</a>}</>}
        actions={canWrite && <><ResourceSheet {...form} title="Edit supplier" triggerLabel="Edit" triggerVariant="secondary" icon="edit" />{ctx.can('suppliers', 'delete') && <DeleteButton resource="suppliers" id={id} redirectTo="/suppliers" size="icon-sm" />}</>}
      />
      {s.status === 'SUSPENDED' && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-800">
          <AlertTriangle className="size-4" /> Suspended — this supplier cannot be selected on projects, services, reservations, concierge requests or payments.
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-1.5">{s.categories.map((c) => <Link key={c.id} href={`/suppliers?categories=${c.id}`} className="rounded-md border border-line bg-white px-2 py-0.5 text-xs hover:border-coral/40">{c.name}</Link>)}</div>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Projects" value={projects.length} hint={`${confirmed} booked/confirmed · ${cancelled} cancelled`} />
        <Stat label="Reservations" value={reservations} />
        <Stat label="Catalog services" value={services.length} />
        <Stat label="Reliability" value={projects.length ? `${Math.round(((projects.length - cancelled) / projects.length) * 100)}%` : '—'} hint="Bookings not cancelled" />
        {ctx.can('finance') ? <Stat label="Paid / due" value={formatMoney(paid, cur)} hint={`${formatMoney(due, cur)} pending`} /> : <Stat label="Rating" value={<span className="inline-flex items-center gap-1">{s.rating ?? '—'}<Star className="size-4 fill-amber-400 text-amber-400" /></span>} />}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader title="Supplier profile" />
            <CardBody><FieldValues fields={RESOURCES.suppliers.fields} record={s as unknown as Record<string, unknown>} options={options} currency={cur} exclude={['companyName', 'categories', 'status', 'rating', 'favorite', 'email', 'phone', 'whatsapp', 'instagram', 'website']} /></CardBody>
          </Card>
          <Card>
            <CardHeader title="Collaboration history" description="Projects this supplier was assigned to" />
            {projects.length === 0 ? <EmptyState title="No projects yet" /> : (
              <Table>
                <THead><Th>Project</Th><Th>Date</Th><Th>Role</Th><Th>Booking</Th><Th>Project status</Th></THead>
                <tbody>
                  {projects.map((p) => (
                    <Tr key={p.projectId}>
                      <Td><TitleCell href={`/projects/${p.project.id}?tab=suppliers`} title={p.project.name} subtitle={p.project.ref} /></Td>
                      <Td>{formatDate(p.project.startDate)}</Td>
                      <Td>{p.role ?? '—'}</Td>
                      <Td className="text-xs">{p.status.toLowerCase()}</Td>
                      <Td><OptBadge options={PROJECT_STATUS} value={p.project.status} /></Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
          {ctx.can('finance') && (
            <Card>
              <CardHeader title="Supplier payments" />
              {payments.length === 0 ? <EmptyState title="No payments" /> : (
                <ul className="divide-y divide-line">{payments.map((p) => <li key={p.id} className="flex items-center justify-between px-4 py-2.5 text-[13px]"><span>{p.project?.name ?? '—'} <span className="text-xs text-muted">· due {formatDate(p.dueDate)}</span></span><span className="flex items-center gap-3"><span className="tabular">{formatMoney(p.amount, cur)}</span><OptBadge options={PAYMENT_STATUS} value={p.status} /></span></li>)}</ul>
              )}
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Contacts" />
            <ul className="divide-y divide-line">
              {s.contacts.length === 0 && <li className="px-4 py-5 text-center text-sm text-muted">No contacts.</li>}
              {s.contacts.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-2 px-4 py-2.5 text-[13px]">
                  <div>
                    <p className="font-medium">{c.name} {c.isPrimary && <span className="ml-1 rounded bg-coral-light px-1 text-[10px] text-coral-dark">primary</span>}</p>
                    <p className="text-xs text-muted">{[c.role, c.email, c.phone].filter(Boolean).join(' · ')}</p>
                  </div>
                  {canWrite && <DeleteContact id={c.id} />}
                </li>
              ))}
            </ul>
            {canWrite && <ContactForm supplierId={id} />}
          </Card>
          <Card>
            <CardHeader title="Services in catalog" action={<Link href={`/services?supplierId=${id}`} className="text-xs text-muted hover:text-coral-dark">View</Link>} />
            <ul className="divide-y divide-line">
              {services.length === 0 && <li className="px-4 py-5 text-center text-sm text-muted">None.</li>}
              {services.map((x) => <li key={x.id} className="flex justify-between px-4 py-2 text-[13px]"><Link href={`/services/${x.id}`} className="hover:text-coral-dark">{x.name}</Link><span className="tabular text-muted">{formatMoney(x.price, cur)}/{x.unit}</span></li>)}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Documents" action={<Link href={`/documents?supplierId=${id}`} className="text-xs text-muted hover:text-coral-dark">Upload</Link>} />
            <ul className="divide-y divide-line">
              {documents.length === 0 && <li className="px-4 py-5 text-center text-sm text-muted">No documents.</li>}
              {documents.map((d) => <li key={d.id} className="flex justify-between px-4 py-2 text-[13px]"><a className="hover:text-coral-dark" href={`/api/documents/${d.id}`}>{d.name}</a><OptBadge options={DOCUMENT_CATEGORY} value={d.category} dot={false} /></li>)}
            </ul>
          </Card>
          <RecordHistory organizationId={ctx.org.id} entityId={id} />
        </div>
      </div>
    </>
  )
}
