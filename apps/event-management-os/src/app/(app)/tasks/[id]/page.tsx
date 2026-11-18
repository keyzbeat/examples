import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarClock, MessageSquare, ListTree, Paperclip } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { getRecord, loadRelationOptions, relationKindsOf } from '@/lib/resources/server'
import { prepareForm } from '@/lib/resources/page'
import { RESOURCES } from '@/lib/resources/registry'
import { prisma } from '@/lib/prisma'
import { PRIORITY, TASK_STATUS } from '@/lib/options'
import { formatDateTime, relativeTime } from '@/lib/dates'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { OptBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { DetailHeader } from '@/components/resource/detail'
import { FieldValues } from '@/components/resource/field-values'
import { ResourceSheet, DeleteButton } from '@/components/resource/resource-sheet'
import { StatusQuick } from '@/components/resource/status-quick'
import { Crumb } from '@/components/shell/shell-context'
import { TaskListMini } from '@/components/tasks/task-list-mini'
import { CommentForm, SubtaskForm } from '@/components/tasks/task-forms'
import type { Task } from '@prisma/client'

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage('tasks')
  const { id } = await params
  const task = await getRecord<Task & { parent: { id: string; title: string } | null; createdBy: { name: string } | null }>(ctx, RESOURCES.tasks, id, { parent: { select: { id: true, title: true } }, createdBy: { select: { name: true } } })
  if (!task) notFound()
  const [subtasks, comments, options] = await Promise.all([
    prisma.task.findMany({ where: { parentId: id, deletedAt: null }, orderBy: { createdAt: 'asc' }, include: { assignee: { select: { name: true, color: true } } } }),
    prisma.taskComment.findMany({ where: { taskId: id }, orderBy: { createdAt: 'asc' }, include: { user: { select: { name: true, color: true } } } }),
    loadRelationOptions(ctx, relationKindsOf(RESOURCES.tasks)),
  ])
  const form = await prepareForm(ctx, 'tasks', task as unknown as Record<string, unknown>, undefined, options)
  const attachments = task.projectId && ctx.can('documents') ? await prisma.document.findMany({ where: { projectId: task.projectId, deletedAt: null, next: null }, take: 6, orderBy: { createdAt: 'desc' } }) : []
  const canWrite = ctx.can('tasks', 'write')
  const overdue = task.dueDate && task.dueDate < new Date() && !['COMPLETED', 'CANCELLED'].includes(task.status)
  return (
    <>
      <Crumb label={task.title} />
      <DetailHeader
        refLabel={task.ref}
        title={task.title}
        badges={<><OptBadge options={TASK_STATUS} value={task.status} /><OptBadge options={PRIORITY} value={task.priority} dot={false} />{task.source?.startsWith('automation') && <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[11px] text-violet-700">Created by automation</span>}</>}
        meta={<>{task.dueDate && <span className={`inline-flex items-center gap-1 ${overdue ? 'font-medium text-red-600' : ''}`}><CalendarClock /> Due {formatDateTime(task.dueDate)}</span>}{task.parent && <Link href={`/tasks/${task.parent.id}`} className="hover:text-coral-dark">Subtask of “{task.parent.title}”</Link>}<span>Created by {task.createdBy?.name ?? 'automation'} · {relativeTime(task.createdAt)}</span></>}
        actions={canWrite && <><ResourceSheet {...form} title="Edit task" triggerLabel="Edit" triggerVariant="secondary" icon="edit" />{ctx.can('tasks', 'delete') && <DeleteButton resource="tasks" id={id} redirectTo="/tasks" size="icon-sm" />}</>}
      />
      <div className="mb-4"><StatusQuick resource="tasks" id={id} field="status" value={task.status} options={TASK_STATUS} canWrite={canWrite} /></div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader title="Details" />
            <CardBody><FieldValues fields={RESOURCES.tasks.fields} record={task as unknown as Record<string, unknown>} options={options} exclude={['title', 'status', 'priority']} /></CardBody>
          </Card>
          <Card>
            <CardHeader title="Subtasks" icon={<ListTree />} description={`${subtasks.filter((s) => s.status === 'COMPLETED').length}/${subtasks.length} completed`} />
            <TaskListMini tasks={subtasks} empty="No subtasks." canWrite={canWrite} />
            {canWrite && <SubtaskForm parentId={id} />}
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Comments" icon={<MessageSquare />} />
            <ul className="space-y-3 p-4">
              {comments.length === 0 && <li className="text-center text-sm text-muted">No comments yet.</li>}
              {comments.map((c) => (
                <li key={c.id} className="flex gap-2.5">
                  <Avatar name={c.user.name} color={c.user.color} size="sm" />
                  <div className="min-w-0 flex-1 rounded-lg bg-offwhite px-3 py-2">
                    <p className="text-[11.5px] text-muted"><span className="font-medium text-ink">{c.user.name}</span> · {relativeTime(c.createdAt)}</p>
                    <p className="text-[13px] whitespace-pre-line">{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <CommentForm taskId={id} />
          </Card>
          {attachments.length > 0 && (
            <Card>
              <CardHeader title="Project attachments" icon={<Paperclip />} />
              <ul className="divide-y divide-line">{attachments.map((d) => <li key={d.id} className="px-4 py-2 text-[13px]"><a className="hover:text-coral-dark" href={`/api/documents/${d.id}`}>{d.name}</a></li>)}</ul>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
