import { FolderKanban } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prepareList } from '@/lib/resources/page'
import { sp, type SP } from '@/lib/url'
import { PROJECT_STATUS, PROJECT_TYPE, PRIORITY } from '@/lib/options'
import { formatMoney } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { fullName } from '@/lib/utils'
import { AppHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Table, THead, Th, Tr, Td, TitleCell, Pagination } from '@/components/ui/table'
import { OptBadge } from '@/components/ui/badge'
import { UserChip } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/ui/empty-state'
import { ListToolbar } from '@/components/resource/list-toolbar'
import { ResourceSheet } from '@/components/resource/resource-sheet'
import { StatusBoard } from '@/components/resource/status-board'
import type { Project } from '@prisma/client'

export const metadata = { title: 'Projects' }
type Row = Project & { client: { firstName: string; lastName: string; company: string | null } | null; manager: { name: string; color: string } | null; _count: { tasks: number } }

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requirePage('projects')
  const params = await searchParams
  const kanban = sp(params, 'view') === 'kanban'
  const data = await prepareList<Row>(ctx, 'projects', params, { client: { select: { firstName: true, lastName: true, company: true } }, manager: { select: { name: true, color: true } }, _count: { select: { tasks: { where: { deletedAt: null, status: { notIn: ['COMPLETED', 'CANCELLED'] } } } } } }, undefined, kanban ? 100 : 25)
  const path = '/projects'
  const cur = ctx.org.currency
  return (
    <>
      <AppHeader
        icon={<FolderKanban />}
        title="Projects"
        description={ctx.assignedOnly ? 'Projects you are assigned to' : `${data.total} projects · weddings, events, travel and concierge`}
        actions={data.canWrite && <ResourceSheet {...data.form} title="New project" description="A default checklist is generated from the project type (editable as a template)." triggerLabel="New project" autoOpenParam />}
      />
      <Card>
        <ListToolbar filters={data.toolbarFilters} placeholder="Search projects…" views={['table', 'kanban']} exportResource="projects" />
        {data.rows.length === 0 ? (
          <EmptyState icon={<FolderKanban />} title="No projects found" />
        ) : kanban ? (
          <div className="p-3">
            <StatusBoard
              resource="projects"
              canWrite={data.canWrite}
              columns={PROJECT_STATUS}
              cards={data.rows.map((p) => ({ id: p.id, title: p.name, subtitle: p.client ? p.client.company ?? fullName(p.client) : p.ref, href: `/projects/${p.id}`, status: p.status, meta: formatDate(p.startDate, { day: 'numeric', month: 'short' }), avatar: p.manager, progress: p.progress, badge: { label: PROJECT_TYPE.find((t) => t.value === p.type)?.label ?? p.type } }))}
            />
          </div>
        ) : (
          <>
            <Table>
              <THead>
                <Th sortKey="name" path={path} params={params} currentSort={data.sort}>Project</Th>
                <Th>Type</Th>
                <Th sortKey="startDate" path={path} params={params} currentSort={data.sort}>Dates</Th>
                <Th sortKey="status" path={path} params={params} currentSort={data.sort}>Status</Th>
                <Th>Priority</Th>
                <Th sortKey="progress" path={path} params={params} currentSort={data.sort} className="w-40">Progress</Th>
                <Th>Manager</Th>
                <Th sortKey="budget" path={path} params={params} currentSort={data.sort} className="text-right">Budget</Th>
              </THead>
              <tbody>
                {data.rows.map((p) => (
                  <Tr key={p.id}>
                    <Td className="max-w-[300px]">
                      <TitleCell href={`/projects/${p.id}`} title={p.name} subtitle={[p.client ? p.client.company ?? fullName(p.client) : null, p.ref].filter(Boolean).join(' · ')} />
                    </Td>
                    <Td><OptBadge options={PROJECT_TYPE} value={p.type} dot={false} /></Td>
                    <Td className="whitespace-nowrap">
                      {formatDate(p.startDate)}
                      {p.location && <span className="block text-xs text-muted">{p.location}</span>}
                    </Td>
                    <Td><OptBadge options={PROJECT_STATUS} value={p.status} /></Td>
                    <Td><OptBadge options={PRIORITY} value={p.priority} dot={false} /></Td>
                    <Td>
                      <Progress value={p.progress} />
                      <span className="text-[11px] text-muted">{p._count.tasks} open tasks</span>
                    </Td>
                    <Td><UserChip user={p.manager} /></Td>
                    <Td className="tabular text-right">{formatMoney(p.budget, cur)}</Td>
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
