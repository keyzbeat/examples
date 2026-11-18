import Link from 'next/link'
import { Columns3 } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prisma } from '@/lib/prisma'
import { sp, type SP } from '@/lib/url'
import { SUPPLIER_STATUS } from '@/lib/options'
import { formatMoney } from '@/lib/money'
import { AppHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { OptBadge } from '@/components/ui/badge'
import { RatingStars } from '@/components/ui/rating'
import { ButtonLink } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

export const metadata = { title: 'Compare suppliers' }

export default async function CompareSuppliers({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requirePage('suppliers')
  const ids = (sp(await searchParams, 'ids') ?? '').split(',').filter(Boolean).slice(0, 4)
  const suppliers = await prisma.supplier.findMany({
    where: { organizationId: ctx.org.id, id: { in: ids }, deletedAt: null },
    include: { categories: true, services: { where: { deletedAt: null }, orderBy: { price: 'asc' } }, _count: { select: { projects: true, reservations: true } }, payments: { where: { status: 'PAID', direction: 'OUTGOING' }, select: { amount: true } } },
  })
  const rows: { label: string; render: (s: (typeof suppliers)[number]) => React.ReactNode }[] = [
    { label: 'Status', render: (s) => <OptBadge options={SUPPLIER_STATUS} value={s.status} /> },
    { label: 'Internal rating', render: (s) => <RatingStars value={s.rating} /> },
    { label: 'Categories', render: (s) => s.categories.map((c) => c.name).join(', ') },
    { label: 'City', render: (s) => s.city },
    { label: 'Coverage area', render: (s) => s.coverageArea },
    { label: 'Pricing', render: (s) => s.pricing },
    { label: 'Commercial conditions', render: (s) => s.conditions },
    { label: 'Availability', render: (s) => s.availability },
    { label: 'Catalog services', render: (s) => s.services.length ? s.services.map((x) => `${x.name} — ${formatMoney(x.price, ctx.org.currency)}/${x.unit}`).join('\n') : '—' },
    { label: 'Projects together', render: (s) => s._count.projects },
    { label: 'Reservations', render: (s) => s._count.reservations },
    ...(ctx.can('finance') ? [{ label: 'Total paid', render: (s: (typeof suppliers)[number]) => formatMoney(s.payments.reduce((a, p) => a + p.amount, 0), ctx.org.currency) }] : []),
    { label: 'Contact', render: (s) => [s.email, s.phone].filter(Boolean).join('\n') },
  ]
  return (
    <>
      <AppHeader icon={<Columns3 />} title="Supplier comparison" description="Side-by-side view to pick the right partner" actions={<ButtonLink href="/suppliers">Back to directory</ButtonLink>} />
      {suppliers.length < 2 ? (
        <Card><EmptyState title="Select 2 to 4 suppliers" description="Tick the compare checkbox in the supplier directory." action={<ButtonLink href="/suppliers" variant="primary">Open directory</ButtonLink>} /></Card>
      ) : (
        <Card className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="[&>th]:border-b [&>th]:border-line [&>th]:bg-beige/50 [&>th]:p-3 [&>th]:text-left">
                <th className="w-44" />
                {suppliers.map((s) => <th key={s.id}><Link href={`/suppliers/${s.id}`} className="font-semibold hover:text-coral-dark">{s.companyName}</Link><span className="block text-xs font-normal text-muted">{s.ref}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="[&>td]:border-b [&>td]:border-line [&>td]:p-3 [&>td]:align-top">
                  <td className="text-xs font-medium text-muted">{r.label}</td>
                  {suppliers.map((s) => <td key={s.id} className="whitespace-pre-line">{r.render(s) ?? '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  )
}
