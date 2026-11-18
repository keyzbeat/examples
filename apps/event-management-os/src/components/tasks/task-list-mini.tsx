import Link from 'next/link'
import { Clock } from 'lucide-react'
import { PRIORITY, TASK_STATUS } from '@/lib/options'
import { formatDate, startOfDay } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { OptBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { TaskToggle } from './task-toggle'

export interface MiniTask {
  id: string
  title: string
  status: string
  priority: string
  dueDate: Date | null
  assignee: { name: string; color: string } | null
  source?: string | null
}

export function TaskListMini({ tasks, empty = 'No tasks yet.', canWrite = true }: { tasks: MiniTask[]; empty?: string; canWrite?: boolean }) {
  if (!tasks.length) return <p className="px-4 py-6 text-center text-sm text-muted">{empty}</p>
  return (
    <ul className="divide-y divide-line">
      {tasks.map((t) => {
        const done = t.status === 'COMPLETED'
        const overdue = !done && t.status !== 'CANCELLED' && t.dueDate && t.dueDate < startOfDay()
        return (
          <li key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-offwhite">
            <TaskToggle id={t.id} done={done} disabled={!canWrite} />
            <div className="min-w-0 flex-1">
              <Link href={`/tasks/${t.id}`} className={cn('block truncate text-[13px] text-ink hover:text-coral-dark', done && 'text-muted line-through')}>
                {t.title}
              </Link>
              <div className="flex items-center gap-2 text-[11.5px] text-muted">
                {t.dueDate && (
                  <span className={cn('inline-flex items-center gap-1', overdue && 'font-medium text-red-600')}>
                    <Clock className="size-3" />
                    {formatDate(t.dueDate, { day: 'numeric', month: 'short' })}
                  </span>
                )}
                {t.source?.startsWith('automation') && <span className="rounded bg-violet-50 px-1 text-[10.5px] text-violet-700">auto</span>}
              </div>
            </div>
            {!done && t.status !== 'TODO' && <OptBadge options={TASK_STATUS} value={t.status} dot={false} />}
            <OptBadge options={PRIORITY} value={t.priority} dot={false} />
            {t.assignee && <Avatar name={t.assignee.name} color={t.assignee.color} size="xs" />}
          </li>
        )
      })}
    </ul>
  )
}
