import { PartyPopper } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prepareList } from '@/lib/resources/page'
import type { SP } from '@/lib/url'
import { EVENT_STATUS, PROJECT_TYPE } from '@/lib/options'
import { formatMoney } from '@/lib/money'
import { formatDate, daysUntil } from '@/lib/dates'
import { fullName } from '@/lib/utils'
import { AppHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Table, THead, Th, Tr, Td, TitleCell, Pagination } from '@/components/ui/table'
import { OptBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ListToolbar } from '@/components/resource/list-toolbar'
import { ResourceSheet } from '@/components/resource/resource-sheet'
import type { Event } from '@prisma/client'

export const metadata = { title: 'Events' }
type Row = Event & { client: { firstName: string; lastName: string } | null; _count: { guests: number } }

export default async function EventsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requirePage('events')
  const params = await searchParams
  const data = await prepareList<Row>(ctx, 'events', params, { client: { select: { firstName: true, lastName: true } }, _count: { select: { guests: true } } })
  const path = '/events'
  return (
    <>
      <AppHeader icon={<PartyPopper />} title="Events" description="Concept, services, run-of-show, guests and budget for every event" actions={data.canWrite && <ResourceSheet {...data.form} title="New event" triggerLabel="New event" autoOpenParam />} />
      <Card>
        <ListToolbar filters={data.toolbarFilters} placeholder="Search events, venues, themes…" exportResource="events" />
        {data.rows.length === 0 ? (
          <EmptyState icon={<PartyPopper />} title="No events found" />
        ) : (
          <>
            <Table>
              <THead>
                <Th sortKey="name" path={path} params={params} currentSort={data.sort}>Event</Th>
                <Th sortKey="date" path={path} params={params} currentSort={data.sort}>Date</Th>
                <Th>Venue</Th>
                <Th>Type</Th>
                <Th sortKey="guestCount" path={path} params={params} currentSort={data.sort}>Guests</Th>
                <Th sortKey="status" path={path} params={params} currentSort={data.sort}>Status</Th>
                <Th sortKey="budget" path={path} params={params} currentSort={data.sort} className="text-right">Budget</Th>
              </THead>
              <tbody>
                {data.rows.map((e) => {
                  const d = e.date ? daysUntil(e.date) : null
                  return (
                    <Tr key={e.id}>
                      <Td className="max-w-[300px]">
                        <TitleCell href={`/events/${e.id}`} title={e.name} subtitle={[e.client && fullName(e.client), e.ref].filter(Boolean).join(' · ')} leading={e.palette.length ? <span className="flex -space-x-1">{e.palette.slice(0, 3).map((c) => <span key={c} className="size-3.5 rounded-full ring-2 ring-white" style={{ background: c }} />)}</span> : undefined} />
                      </Td>
                      <Td className="whitespace-nowrap">
                        {formatDate(e.date)}
                        {d !== null && d >= 0 && <span className="block text-xs text-muted">{d === 0 ? 'Today' : `In ${d} days`}</span>}
                      </Td>
                      <Td className="max-w-[200px] truncate text-muted">{e.venue ?? e.location ?? '—'}</Td>
                      <Td><OptBadge options={PROJECT_TYPE} value={e.type} dot={false} /></Td>
                      <Td className="tabular">{e.guestCount ?? '—'} <span className="text-xs text-muted">({e._count.guests} listed)</span></Td>
                      <Td><OptBadge options={EVENT_STATUS} value={e.status} /></Td>
                      <Td className="tabular text-right">{formatMoney(e.budget, ctx.org.currency)}</Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
            <Pagination path={path} params={params} page={data.page} pageSize={data.pageSize} total={data.total} />
          </>
        )}
      </Card>
    </>
  )
}
