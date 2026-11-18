import { Handshake } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prepareList } from '@/lib/resources/page'
import type { SP } from '@/lib/url'
import { PARTNER_STATUS, PARTNERSHIP_TYPE, labelOf } from '@/lib/options'
import { AppHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Table, THead, Th, Tr, Td, TitleCell, Pagination } from '@/components/ui/table'
import { OptBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ListToolbar } from '@/components/resource/list-toolbar'
import { ResourceSheet } from '@/components/resource/resource-sheet'
import { ImportButton } from '@/components/resource/import-button'
import type { Partner } from '@prisma/client'

export const metadata = { title: 'Partners' }

export default async function PartnersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requirePage('partners')
  const params = await searchParams
  const data = await prepareList<Partner & { _count: { commissions: number } }>(ctx, 'partners', params, { _count: { select: { commissions: true } } })
  const path = '/partners'
  return (
    <>
      <AppHeader icon={<Handshake />} title="Partners" description="Commercial and strategic partners — referrals, commissions and agreements (distinct from suppliers)" actions={data.canWrite && <><ImportButton resource="partners" /><ResourceSheet {...data.form} title="New partner" triggerLabel="New partner" autoOpenParam /></>} />
      <Card>
        <ListToolbar filters={data.toolbarFilters} placeholder="Search partners…" exportResource="partners" />
        {data.rows.length === 0 ? <EmptyState icon={<Handshake />} title="No partners found" /> : (
          <>
            <Table>
              <THead>
                <Th sortKey="companyName" path={path} params={params} currentSort={data.sort}>Partner</Th>
                <Th sortKey="category" path={path} params={params} currentSort={data.sort}>Category</Th>
                <Th>Partnership</Th>
                <Th>Main contact</Th>
                <Th sortKey="city" path={path} params={params} currentSort={data.sort}>City</Th>
                <Th sortKey="commissionRate" path={path} params={params} currentSort={data.sort}>Commission</Th>
                <Th>Status</Th>
              </THead>
              <tbody>
                {data.rows.map((p) => (
                  <Tr key={p.id}>
                    <Td><TitleCell href={`/partners/${p.id}`} title={p.companyName} subtitle={p.ref} /></Td>
                    <Td>{p.category}</Td>
                    <Td className="text-muted">{labelOf(PARTNERSHIP_TYPE, p.partnershipType)}</Td>
                    <Td>{p.contactName ?? '—'}<span className="block text-xs text-muted">{p.email}</span></Td>
                    <Td className="text-muted">{p.city ?? '—'}</Td>
                    <Td className="tabular">{p.commissionRate !== null ? `${p.commissionRate}%` : '—'}</Td>
                    <Td><OptBadge options={PARTNER_STATUS} value={p.status} /></Td>
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
