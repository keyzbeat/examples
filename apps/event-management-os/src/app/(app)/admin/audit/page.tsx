import { ShieldCheck } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prisma } from '@/lib/prisma'
import { sp, type SP } from '@/lib/url'
import { formatDateTime } from '@/lib/dates'
import { AppHeader } from '@/components/ui/page-header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { LinkTabs } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Table, THead, Th, Tr, Td, Pagination } from '@/components/ui/table'
import { ListToolbar } from '@/components/resource/list-toolbar'
import { PurgeDemo } from '@/components/admin/admin-ui'
import { ADMIN_TABS } from '@/components/admin/tabs'

export const metadata = { title: 'Audit log' }

export default async function AuditPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requirePage('admin')
  const params = await searchParams
  const page = Math.max(1, Number(sp(params, 'page') ?? 1))
  const where = { organizationId: ctx.org.id, ...(sp(params, 'entityType') ? { entityType: sp(params, 'entityType') } : {}), ...(sp(params, 'action') ? { action: sp(params, 'action') } : {}), ...(sp(params, 'q') ? { entityId: sp(params, 'q') } : {}) }
  const [logs, total, types, demo] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 30, take: 30, include: { user: { select: { name: true } } } }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ['entityType'], where: { organizationId: ctx.org.id } }),
    prisma.client.count({ where: { organizationId: ctx.org.id, isDemo: true } }),
  ])
  return (
    <>
      <AppHeader icon={<ShieldCheck />} title="Administration" description="Immutable record of every create, update, delete and automation — with before/after values" />
      <LinkTabs tabs={ADMIN_TABS} active="audit" />
      <Card>
        <ListToolbar placeholder="Filter by record id…" filters={[{ name: 'entityType', label: 'Entity', options: types.map((t) => ({ value: t.entityType, label: t.entityType })) }, { name: 'action', label: 'Action', options: ['created', 'updated', 'deleted', 'converted', 'approved', 'rejected', 'automation'].map((a) => ({ value: a, label: a })) }]} />
        <Table>
          <THead><Th>When</Th><Th>User</Th><Th>Action</Th><Th>Entity</Th><Th>Changes</Th></THead>
          <tbody>
            {logs.map((l) => (
              <Tr key={l.id}>
                <Td className="whitespace-nowrap text-muted">{formatDateTime(l.createdAt)}</Td>
                <Td>{l.user?.name ?? 'System'}</Td>
                <Td><Badge tone={l.action === 'deleted' ? 'red' : l.action === 'created' ? 'blue' : l.action === 'automation' ? 'violet' : 'gray'}>{l.action}</Badge></Td>
                <Td className="text-muted">{l.entityType}<span className="block font-mono text-[10.5px]">{l.entityId}</span></Td>
                <Td className="max-w-[420px]">{diff(l.before, l.after)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <Pagination path="/admin/audit" params={params} page={page} pageSize={30} total={total} />
      </Card>
      {ctx.can('admin', 'delete') && (
        <Card className="mt-4">
          <CardHeader title="Demo data" description="All demonstration records are fictitious and flagged in the database" />
          <CardBody className="flex items-center justify-between gap-4 text-[13px]"><span className="text-muted">{demo} demo clients currently in this workspace.</span><PurgeDemo /></CardBody>
        </Card>
      )}
    </>
  )
}

const SKIP = new Set(['updatedAt', 'createdAt', 'organizationId', 'id', 'emailNormalized', 'nameNormalized'])
function diff(before: unknown, after: unknown) {
  if (!before || typeof before !== 'object' || !after || typeof after !== 'object') return <span className="text-xs text-muted">—</span>
  const b = before as Record<string, unknown>
  const a = after as Record<string, unknown>
  const keys = Object.keys(a).filter((k) => !SKIP.has(k) && JSON.stringify(a[k]) !== JSON.stringify(b[k]))
  if (!keys.length) return <span className="text-xs text-muted">No field changes</span>
  return (
    <ul className="space-y-0.5 text-xs">
      {keys.slice(0, 5).map((k) => <li key={k} className="truncate"><span className="text-muted">{k}:</span> <span className="line-through opacity-60">{fmt(b[k])}</span> → <span className="font-medium">{fmt(a[k])}</span></li>)}
      {keys.length > 5 && <li className="text-muted">+{keys.length - 5} more</li>}
    </ul>
  )
}
const fmt = (v: unknown) => (v === null || v === undefined ? '∅' : typeof v === 'string' ? v.slice(0, 40) : JSON.stringify(v).slice(0, 40))
