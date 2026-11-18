import { ShieldCheck } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prisma } from '@/lib/prisma'
import { relativeTime } from '@/lib/dates'
import { AppHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { LinkTabs } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Table, THead, Th, Tr, Td } from '@/components/ui/table'
import { UserSheet, ResetPasswordButton } from '@/components/admin/admin-ui'
import { ADMIN_TABS } from '@/components/admin/tabs'

export const metadata = { title: 'Users' }

export default async function UsersPage() {
  const ctx = await requirePage('admin')
  const [users, roles] = await Promise.all([
    prisma.user.findMany({ where: { organizationId: ctx.org.id, clientId: null, deletedAt: null }, include: { role: true }, orderBy: { name: 'asc' } }),
    prisma.role.findMany({ where: { organizationId: ctx.org.id, key: { not: 'client' } }, orderBy: { createdAt: 'asc' } }),
  ])
  const canWrite = ctx.can('admin', 'write')
  return (
    <>
      <AppHeader icon={<ShieldCheck />} title="Administration" description="Team accounts, roles and the audit trail" actions={canWrite && <UserSheet roles={roles} />} />
      <LinkTabs tabs={ADMIN_TABS} active="users" />
      <Card>
        <Table>
          <THead><Th>User</Th><Th>Role</Th><Th>Title</Th><Th>Last login</Th><Th>Status</Th><Th /></THead>
          <tbody>
            {users.map((u) => (
              <Tr key={u.id}>
                <Td><span className="flex items-center gap-2.5"><Avatar name={u.name} color={u.color} size="sm" /><span><span className="block font-medium">{u.name}{u.id === ctx.user.id && <span className="ml-1 text-xs text-muted">(you)</span>}</span><span className="text-xs text-muted">{u.email}</span></span></span></Td>
                <Td><Badge tone={u.role.key === 'admin' ? 'coral' : 'gray'}>{u.role.name}</Badge></Td>
                <Td className="text-muted">{u.title ?? '—'}</Td>
                <Td className="text-muted">{u.lastLoginAt ? relativeTime(u.lastLoginAt) : 'Never'}</Td>
                <Td>{u.active ? <Badge tone="green" dot>Active</Badge> : <Badge>Disabled</Badge>}</Td>
                <Td className="text-right">{canWrite && <span className="inline-flex"><ResetPasswordButton id={u.id} /><UserSheet roles={roles} user={u} /></span>}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  )
}
