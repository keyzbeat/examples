import { Truck } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prepareList } from '@/lib/resources/page'
import type { SP } from '@/lib/url'
import { SUPPLIER_STATUS } from '@/lib/options'
import { AppHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Table, THead, Th, Tr, Td, TitleCell, Pagination } from '@/components/ui/table'
import { OptBadge } from '@/components/ui/badge'
import { RatingStars } from '@/components/ui/rating'
import { EmptyState } from '@/components/ui/empty-state'
import { ListToolbar } from '@/components/resource/list-toolbar'
import { ResourceSheet } from '@/components/resource/resource-sheet'
import { ImportButton } from '@/components/resource/import-button'
import { CompareBar, CompareCheckbox, FavoriteToggle } from '@/components/suppliers/supplier-bits'
import type { Supplier } from '@prisma/client'

export const metadata = { title: 'Suppliers' }
type Row = Supplier & { categories: { id: string; name: string }[]; _count: { projects: number } }

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requirePage('suppliers')
  const params = await searchParams
  const data = await prepareList<Row>(ctx, 'suppliers', params, { categories: { select: { id: true, name: true } }, _count: { select: { projects: true } } })
  const path = '/suppliers'
  return (
    <>
      <AppHeader icon={<Truck />} title="Suppliers" description="One record per supplier, across all its categories — venues, catering, florists, AV, transport…" actions={data.canWrite && <><ImportButton resource="suppliers" /><ResourceSheet {...data.form} title="New supplier" description="Duplicate names are detected automatically." triggerLabel="New supplier" autoOpenParam /></>} />
      <Card>
        <ListToolbar filters={data.toolbarFilters} placeholder="Search name, service, city, area…" exportResource="suppliers">
          <CompareBar />
        </ListToolbar>
        {data.rows.length === 0 ? <EmptyState icon={<Truck />} title="No suppliers found" /> : (
          <>
            <Table>
              <THead>
                <Th className="w-8" />
                <Th sortKey="companyName" path={path} params={params} currentSort={data.sort}>Supplier</Th>
                <Th>Categories</Th>
                <Th sortKey="city" path={path} params={params} currentSort={data.sort}>City / coverage</Th>
                <Th>Contact</Th>
                <Th sortKey="rating" path={path} params={params} currentSort={data.sort}>Rating</Th>
                <Th>Projects</Th>
                <Th>Status</Th>
                <Th className="w-10" />
              </THead>
              <tbody>
                {data.rows.map((s) => (
                  <Tr key={s.id} className={s.status === 'SUSPENDED' ? 'opacity-70' : undefined}>
                    <Td><CompareCheckbox id={s.id} /></Td>
                    <Td className="max-w-[240px]"><TitleCell href={`/suppliers/${s.id}`} title={s.companyName} subtitle={[s.ref, s.instagram].filter(Boolean).join(' · ')} /></Td>
                    <Td className="max-w-[260px]">
                      <div className="flex flex-wrap gap-1">{s.categories.map((c) => <span key={c.id} className="rounded bg-beige px-1.5 py-0.5 text-[11px] text-ink/75">{c.name}</span>)}</div>
                    </Td>
                    <Td className="text-muted">{s.city ?? '—'}<span className="block text-xs">{s.coverageArea}</span></Td>
                    <Td className="max-w-[200px] truncate">{s.phone ?? '—'}<span className="block truncate text-xs text-muted">{s.email}</span></Td>
                    <Td><RatingStars value={s.rating} /></Td>
                    <Td className="tabular">{s._count.projects}</Td>
                    <Td><OptBadge options={SUPPLIER_STATUS} value={s.status} /></Td>
                    <Td><FavoriteToggle id={s.id} value={s.favorite} canWrite={data.canWrite} /></Td>
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
