import { Plane } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prepareList } from '@/lib/resources/page'
import type { SP } from '@/lib/url'
import { STAY_STATUS } from '@/lib/options'
import { formatMoney } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { fullName } from '@/lib/utils'
import { AppHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Table, THead, Th, Tr, Td, TitleCell, Pagination } from '@/components/ui/table'
import { OptBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ListToolbar } from '@/components/resource/list-toolbar'
import { ResourceSheet } from '@/components/resource/resource-sheet'
import type { Stay } from '@prisma/client'

export const metadata = { title: 'Stays & Travel' }
type Row = Stay & { client: { firstName: string; lastName: string } | null; _count: { reservations: number } }

export default async function StaysPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requirePage('stays')
  const params = await searchParams
  const data = await prepareList<Row>(ctx, 'stays', params, { client: { select: { firstName: true, lastName: true } }, _count: { select: { reservations: true } } })
  const path = '/stays'
  return (
    <>
      <AppHeader icon={<Plane />} title="Stays & Travel" description="Tailor-made stays, reservations and client itineraries" actions={data.canWrite && <ResourceSheet {...data.form} title="New stay" triggerLabel="New stay" autoOpenParam />} />
      <Card>
        <ListToolbar filters={data.toolbarFilters} placeholder="Search stays, destinations…" exportResource="stays" />
        {data.rows.length === 0 ? <EmptyState icon={<Plane />} title="No stays found" /> : (
          <>
            <Table>
              <THead>
                <Th sortKey="title" path={path} params={params} currentSort={data.sort}>Stay</Th>
                <Th sortKey="destination" path={path} params={params} currentSort={data.sort}>Destination</Th>
                <Th sortKey="checkIn" path={path} params={params} currentSort={data.sort}>Dates</Th>
                <Th sortKey="travelers" path={path} params={params} currentSort={data.sort}>Travellers</Th>
                <Th>Bookings</Th>
                <Th>Status</Th>
                <Th sortKey="budget" path={path} params={params} currentSort={data.sort} className="text-right">Budget</Th>
              </THead>
              <tbody>
                {data.rows.map((s) => (
                  <Tr key={s.id}>
                    <Td><TitleCell href={`/stays/${s.id}`} title={s.title} subtitle={[s.client && fullName(s.client), s.ref].filter(Boolean).join(' · ')} /></Td>
                    <Td>{s.destination}</Td>
                    <Td className="whitespace-nowrap">{formatDate(s.checkIn, { day: 'numeric', month: 'short' })} → {formatDate(s.checkOut)}</Td>
                    <Td className="tabular">{s.travelers}</Td>
                    <Td className="tabular">{s._count.reservations}</Td>
                    <Td><OptBadge options={STAY_STATUS} value={s.status} /></Td>
                    <Td className="tabular text-right">{formatMoney(s.budget, ctx.org.currency)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pagination path={path} params={params} page={data.page} pageSize={data.pageSize} total={data.total} />
          </>
        )}
      </Card>
    </>
  )
}
