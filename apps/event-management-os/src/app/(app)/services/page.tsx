import { PackageSearch } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prepareList } from '@/lib/resources/page'
import type { SP } from '@/lib/url'
import { SERVICE_STATUS } from '@/lib/options'
import { formatMoney, marginOf } from '@/lib/money'
import { AppHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Table, THead, Th, Tr, Td, TitleCell, Pagination } from '@/components/ui/table'
import { OptBadge, Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ListToolbar } from '@/components/resource/list-toolbar'
import { ResourceSheet } from '@/components/resource/resource-sheet'
import { ImportButton } from '@/components/resource/import-button'
import type { Service } from '@prisma/client'

export const metadata = { title: 'Services Catalog' }

export default async function ServicesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requirePage('services')
  const params = await searchParams
  const data = await prepareList<Service & { supplier: { companyName: string; status: string } | null }>(ctx, 'services', params, { supplier: { select: { companyName: true, status: true } } })
  const path = '/services'
  const showCost = ctx.can('finance') || ctx.can('services', 'write')
  const cur = ctx.org.currency
  return (
    <>
      <AppHeader icon={<PackageSearch />} title="Services Catalog" description="Reusable prestations with costs, prices and margins — add them to projects, events, quotes and reservations" actions={data.canWrite && <><ImportButton resource="services" /><ResourceSheet {...data.form} title="New service" triggerLabel="New service" autoOpenParam /></>} />
      <Card>
        <ListToolbar filters={data.toolbarFilters} placeholder="Search services…" exportResource="services" />
        {data.rows.length === 0 ? <EmptyState icon={<PackageSearch />} title="No services found" /> : (
          <>
            <Table>
              <THead>
                <Th sortKey="name" path={path} params={params} currentSort={data.sort}>Service</Th>
                <Th sortKey="category" path={path} params={params} currentSort={data.sort}>Category</Th>
                <Th>Supplier</Th>
                <Th>Unit</Th>
                {showCost && <Th sortKey="cost" path={path} params={params} currentSort={data.sort} className="text-right">Cost</Th>}
                <Th sortKey="price" path={path} params={params} currentSort={data.sort} className="text-right">Price</Th>
                {showCost && <Th className="text-right">Margin</Th>}
                <Th>Tax</Th>
                <Th>Status</Th>
              </THead>
              <tbody>
                {data.rows.map((s) => {
                  const m = marginOf(s.cost, s.price)
                  return (
                    <Tr key={s.id}>
                      <Td className="max-w-[280px]"><TitleCell href={`/services/${s.id}`} title={s.name} subtitle={s.ref} /></Td>
                      <Td><Badge>{s.category}</Badge></Td>
                      <Td className="text-muted">{s.supplier ? <>{s.supplier.companyName}{s.supplier.status === 'SUSPENDED' && <Badge tone="red" className="ml-1">suspended</Badge>}</> : 'In-house'}</Td>
                      <Td className="text-muted">{s.unit}</Td>
                      {showCost && <Td className="tabular text-right text-muted">{formatMoney(s.cost, cur)}</Td>}
                      <Td className="tabular text-right font-medium">{formatMoney(s.price, cur)}</Td>
                      {showCost && <Td className="tabular text-right text-emerald-700">{formatMoney(m.margin, cur)} <span className="text-xs text-muted">{m.pct}%</span></Td>}
                      <Td className="tabular text-muted">{s.taxRate}%</Td>
                      <Td><OptBadge options={SERVICE_STATUS} value={s.status} /></Td>
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
