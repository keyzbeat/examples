import { ShieldCheck } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prisma } from '@/lib/prisma'
import { AppHeader } from '@/components/ui/page-header'
import { Card, CardHeader } from '@/components/ui/card'
import { LinkTabs } from '@/components/ui/tabs'
import { PermissionMatrix, NewRoleForm } from '@/components/admin/admin-ui'
import { ADMIN_TABS } from '@/components/admin/tabs'

export const metadata = { title: 'Roles & permissions' }

export default async function RolesPage() {
  const ctx = await requirePage('admin')
  const roles = await prisma.role.findMany({ where: { organizationId: ctx.org.id }, include: { _count: { select: { users: true } } }, orderBy: { createdAt: 'asc' } })
  return (
    <>
      <AppHeader icon={<ShieldCheck />} title="Administration" description="Permissions are enforced on the server for every page, action, export and file" actions={ctx.can('admin', 'write') && <NewRoleForm />} />
      <LinkTabs tabs={ADMIN_TABS} active="roles" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {roles.map((r) => (
          <Card key={r.id}>
            <CardHeader title={r.name} description={`${r.description ?? ''} · ${r._count.users} user${r._count.users === 1 ? '' : 's'}`} />
            {r.key === 'admin' ? <p className="p-4 text-[13px] text-muted">Full access to everything (*). Locked.</p> : r.key === 'client' ? <p className="p-4 text-[13px] text-muted">Client portal only — never reaches the back office. Locked.</p> : <PermissionMatrix role={r} />}
          </Card>
        ))}
      </div>
    </>
  )
}
