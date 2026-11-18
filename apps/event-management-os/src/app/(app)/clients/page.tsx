import { Users } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prepareList } from '@/lib/resources/page'
import type { SP } from '@/lib/url'
import { CLIENT_STATUS, CLIENT_TYPE } from '@/lib/options'
import { formatDate } from '@/lib/dates'
import { fullName } from '@/lib/utils'
import { AppHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Table, THead, Th, Tr, Td, TitleCell, Pagination } from '@/components/ui/table'
import { OptBadge } from '@/components/ui/badge'
import { Avatar, UserChip } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { ListToolbar } from '@/components/resource/list-toolbar'
import { ResourceSheet } from '@/components/resource/resource-sheet'
import { ImportButton } from '@/components/resource/import-button'
import type { Client } from '@prisma/client'

export const metadata = { title: 'Clients' }
type Row = Client & { owner: { name: string; color: string } | null; _count: { projects: number; events: number; quotations: number } }

export default async function ClientsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requirePage('clients')
  const params = await searchParams
  const data = await prepareList<Row>(ctx, 'clients', params, { owner: { select: { name: true, color: true } }, _count: { select: { projects: { where: { deletedAt: null } }, events: { where: { deletedAt: null } }, quotations: { where: { deletedAt: null } } } } })
  const path = '/clients'
  return (
    <>
      <AppHeader
        icon={<Users />}
        title="Clients"
        description={`${data.total} clients · one profile per person or company, linked to every project, quote and payment`}
        actions={
          data.canWrite && (
            <>
              <ImportButton resource="clients" />
              <ResourceSheet {...data.form} title="New client" description="Duplicates are detected by email." triggerLabel="New client" autoOpenParam />
            </>
          )
        }
      />
      <Card>
        <ListToolbar filters={data.toolbarFilters} placeholder="Search name, company, email, phone, city…" exportResource="clients" />
        {data.rows.length === 0 ? (
          <EmptyState icon={<Users />} title="No clients found" />
        ) : (
          <>
            <Table>
              <THead>
                <Th sortKey="lastName" path={path} params={params} currentSort={data.sort}>Client</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Contact</Th>
                <Th sortKey="city" path={path} params={params} currentSort={data.sort}>Location</Th>
                <Th className="text-right">Projects</Th>
                <Th>Owner</Th>
                <Th sortKey="createdAt" path={path} params={params} currentSort={data.sort}>Since</Th>
              </THead>
              <tbody>
                {data.rows.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <TitleCell href={`/clients/${c.id}`} leading={<Avatar name={fullName(c)} color="#C9B8AA" size="sm" />} title={fullName(c)} subtitle={[c.company, c.ref].filter(Boolean).join(' · ')} />
                    </Td>
                    <Td><OptBadge options={CLIENT_TYPE} value={c.type} dot={false} /></Td>
                    <Td><OptBadge options={CLIENT_STATUS} value={c.status} /></Td>
                    <Td className="max-w-[220px]">
                      <span className="block truncate">{c.email ?? '—'}</span>
                      <span className="block truncate text-xs text-muted">{c.phone}</span>
                    </Td>
                    <Td className="text-muted">{[c.city, c.country].filter(Boolean).join(', ') || '—'}</Td>
                    <Td className="tabular text-right">{c._count.projects}</Td>
                    <Td><UserChip user={c.owner} /></Td>
                    <Td className="whitespace-nowrap text-muted">{formatDate(c.createdAt, { month: 'short', year: 'numeric' })}</Td>
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
