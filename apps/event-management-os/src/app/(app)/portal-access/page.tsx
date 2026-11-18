import Link from 'next/link'
import { MonitorSmartphone } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prisma } from '@/lib/prisma'
import { loadRelationOptions } from '@/lib/resources/server'
import { formatDate, relativeTime } from '@/lib/dates'
import { fullName } from '@/lib/utils'
import { AppHeader } from '@/components/ui/page-header'
import { Card, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, THead, Th, Tr, Td } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { InvitePortalUser, TogglePortalUser } from '@/components/portal/portal-admin'

export const metadata = { title: 'Client Portal' }

export default async function PortalAccessPage() {
  const ctx = await requirePage('clients')
  const [accounts, approvals, messages, options] = await Promise.all([
    prisma.user.findMany({ where: { organizationId: ctx.org.id, clientId: { not: null }, deletedAt: null }, include: { client: { select: { id: true, firstName: true, lastName: true, company: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.approval.findMany({ where: { organizationId: ctx.org.id }, orderBy: { createdAt: 'desc' }, take: 8, include: { project: { select: { id: true, name: true } } } }),
    prisma.message.findMany({ where: { organizationId: ctx.org.id, fromClient: true }, orderBy: { createdAt: 'desc' }, take: 6, include: { project: { select: { id: true, name: true } }, author: { select: { name: true } } } }),
    loadRelationOptions(ctx, ['client']),
  ])
  const canWrite = ctx.can('clients', 'write')
  return (
    <>
      <AppHeader icon={<MonitorSmartphone />} title="Client Portal" description="Separate, mobile-first space where clients follow their project, approve, pay, manage guests and message you — internal data is never exposed" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {canWrite && <Card><CardHeader title="Give a client access" description="Creates a login limited to the client portal" /><InvitePortalUser clients={options.client ?? []} /></Card>}
          <Card>
            <CardHeader title="Portal accounts" />
            {accounts.length === 0 ? <EmptyState title="No portal accounts yet" /> : (
              <Table>
                <THead><Th>Client</Th><Th>Login</Th><Th>Last login</Th><Th>Status</Th><Th /></THead>
                <tbody>
                  {accounts.map((u) => (
                    <Tr key={u.id}>
                      <Td>{u.client ? <Link className="font-medium hover:text-coral-dark" href={`/clients/${u.client.id}`}>{fullName(u.client)}</Link> : '—'}</Td>
                      <Td className="text-muted">{u.email}</Td>
                      <Td className="text-muted">{u.lastLoginAt ? relativeTime(u.lastLoginAt) : 'Never'}</Td>
                      <Td>{u.active ? <Badge tone="green" dot>Active</Badge> : <Badge tone="gray">Revoked</Badge>}</Td>
                      <Td className="text-right">{canWrite && <TogglePortalUser id={u.id} active={u.active} />}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Latest approvals" />
            <ul className="divide-y divide-line">
              {approvals.map((a) => <li key={a.id} className="px-4 py-2.5 text-[13px]"><Link className="hover:text-coral-dark" href={`/projects/${a.project.id}?tab=portal`}>{a.title}</Link><p className="flex items-center justify-between text-xs text-muted"><span>{a.project.name}</span><Badge tone={a.status === 'APPROVED' ? 'green' : a.status === 'REJECTED' ? 'red' : 'amber'}>{a.status.toLowerCase()}</Badge></p></li>)}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Latest client messages" />
            <ul className="divide-y divide-line">
              {messages.length === 0 && <li className="px-4 py-5 text-center text-sm text-muted">No messages.</li>}
              {messages.map((m) => <li key={m.id} className="px-4 py-2.5 text-[13px]"><Link className="line-clamp-2 hover:text-coral-dark" href={`/projects/${m.project.id}?tab=portal`}>{m.body}</Link><p className="text-xs text-muted">{m.author.name} · {formatDate(m.createdAt)}</p></li>)}
            </ul>
          </Card>
        </div>
      </div>
    </>
  )
}
