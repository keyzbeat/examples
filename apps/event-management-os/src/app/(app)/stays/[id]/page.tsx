import { notFound } from 'next/navigation'
import { CalendarDays, Download, MapPin, Users, Route, Share2, Wallet } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { getRecord, loadRelationOptions } from '@/lib/resources/server'
import { prepareForm } from '@/lib/resources/page'
import { RESOURCES } from '@/lib/resources/registry'
import { prisma } from '@/lib/prisma'
import { RESERVATION_STATUS, RESERVATION_TYPE, STAY_STATUS } from '@/lib/options'
import { formatMoney } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { OptBadge } from '@/components/ui/badge'
import { buttonClass } from '@/components/ui/button'
import { Table, THead, Th, Tr, Td } from '@/components/ui/table'
import { DetailHeader, Stat } from '@/components/resource/detail'
import { FieldValues } from '@/components/resource/field-values'
import { ResourceSheet, DeleteButton } from '@/components/resource/resource-sheet'
import { Crumb } from '@/components/shell/shell-context'
import { Itinerary } from '@/components/stays/itinerary'
import { ShareLink } from '@/components/stays/share-link'
import type { Stay } from '@prisma/client'

export default async function StayPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage('stays')
  const { id } = await params
  const stay = await getRecord<Stay>(ctx, RESOURCES.stays, id)
  if (!stay) notFound()
  const [reservations, options, form, resForm] = await Promise.all([
    prisma.reservation.findMany({ where: { stayId: id }, orderBy: [{ date: 'asc' }, { time: 'asc' }], include: { supplier: { select: { companyName: true } } } }),
    loadRelationOptions(ctx, ['client', 'project', 'supplier']),
    prepareForm(ctx, 'stays', stay as unknown as Record<string, unknown>),
    prepareForm(ctx, 'reservations', null, { date: stay.checkIn }),
  ])
  const canWrite = ctx.can('stays', 'write')
  const editForms = canWrite ? await Promise.all(reservations.map((r) => prepareForm(ctx, 'reservations', r as unknown as Record<string, unknown>, undefined, options))) : []
  const cur = ctx.org.currency
  const cost = reservations.reduce((a, r) => a + (r.cost ?? 0), 0)
  const price = reservations.reduce((a, r) => a + (r.price ?? 0), 0)
  const nights = stay.checkIn && stay.checkOut ? Math.round((stay.checkOut.getTime() - stay.checkIn.getTime()) / 86_400_000) : null
  const confirmed = reservations.filter((r) => r.status === 'CONFIRMED').length
  return (
    <>
      <Crumb label={stay.title} />
      <DetailHeader
        refLabel={stay.ref}
        title={stay.title}
        badges={<OptBadge options={STAY_STATUS} value={stay.status} />}
        meta={<><span className="inline-flex items-center gap-1"><MapPin /> {stay.destination}</span><span className="inline-flex items-center gap-1"><CalendarDays /> {formatDate(stay.checkIn)} → {formatDate(stay.checkOut)}</span><span className="inline-flex items-center gap-1"><Users /> {stay.travelers} travellers</span></>}
        actions={
          <>
            <a href={`/api/pdf/itinerary/${id}`} className={buttonClass('secondary')}><Download /> Itinerary PDF</a>
            {canWrite && <ResourceSheet {...form} title="Edit stay" triggerLabel="Edit" triggerVariant="secondary" icon="edit" />}
            {ctx.can('stays', 'delete') && <DeleteButton resource="stays" id={id} redirectTo="/stays" size="icon-sm" />}
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Nights" value={nights ?? '—'} />
        <Stat label="Reservations" value={reservations.length} hint={`${confirmed} confirmed`} />
        <Stat label="Budget" value={formatMoney(stay.budget, cur)} />
        {ctx.can('finance') ? <Stat label="Booked price / cost" value={formatMoney(price, cur)} hint={`Cost ${formatMoney(cost, cur)} · margin ${formatMoney(price - cost, cur)}`} /> : <Stat label="Booked value" value={formatMoney(price, cur)} />}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader title="Client itinerary" description="Grouped by day, as the client will see it" icon={<Route />} action={canWrite && <ResourceSheet {...resForm} parents={{ stayId: id }} navigateOnCreate={false} title="New reservation" description="Accommodation, transfer, activity, restaurant or experience." triggerLabel="Add" triggerSize="sm" />} />
            <Itinerary start={stay.checkIn} items={reservations.map((r) => ({ id: r.id, date: r.date, time: r.time, type: r.type, title: r.title, location: r.location, status: r.status, confirmation: r.confirmation, supplier: r.supplier?.companyName ?? null, notes: r.notes }))} />
          </Card>
          <Card>
            <CardHeader title="Reservations & confirmations" icon={<Wallet />} />
            <Table>
              <THead><Th>Reservation</Th><Th>Type</Th><Th>Supplier</Th><Th>Confirmation</Th><Th>Status</Th>{ctx.can('finance') && <Th className="text-right">Cost</Th>}<Th className="text-right">Price</Th><Th /></THead>
              <tbody>
                {reservations.map((r, i) => (
                  <Tr key={r.id}>
                    <Td><span className="font-medium">{r.title}</span><span className="block text-xs text-muted">{formatDate(r.date)} {r.time}</span></Td>
                    <Td><OptBadge options={RESERVATION_TYPE} value={r.type} dot={false} /></Td>
                    <Td className="text-muted">{r.supplier?.companyName ?? '—'}</Td>
                    <Td className="tabular">{r.confirmation ?? '—'}</Td>
                    <Td><OptBadge options={RESERVATION_STATUS} value={r.status} /></Td>
                    {ctx.can('finance') && <Td className="tabular text-right text-muted">{formatMoney(r.cost, cur)}</Td>}
                    <Td className="tabular text-right">{formatMoney(r.price, cur)}</Td>
                    <Td className="text-right">{canWrite && editForms[i] && <ResourceSheet {...editForms[i]} title="Edit reservation" triggerSize="icon-sm" triggerVariant="ghost" icon="edit" />}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Share with client" icon={<Share2 />} />
            <CardBody><ShareLink stayId={id} token={stay.shareToken} canWrite={canWrite} /></CardBody>
          </Card>
          <Card>
            <CardHeader title="Stay details" />
            <CardBody><FieldValues fields={RESOURCES.stays.fields} record={stay as unknown as Record<string, unknown>} options={options} currency={cur} exclude={['title', 'status']} /></CardBody>
          </Card>
        </div>
      </div>
    </>
  )
}
