import Link from 'next/link'
import { Bell } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prisma } from '@/lib/prisma'
import { relativeTime } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { AppHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ActionButton } from '@/components/ui/action-button'
import { markAllNotificationsRead } from '@/app/actions/shell'

export const metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const ctx = await requirePage()
  const items = await prisma.notification.findMany({ where: { userId: ctx.user.id }, orderBy: { createdAt: 'desc' }, take: 100 })
  return (
    <>
      <AppHeader icon={<Bell />} title="Notifications" description="Follow-ups, overdue tasks, payment reminders, approvals and automations" actions={<ActionButton variant="secondary" action={async () => { 'use server'; await markAllNotificationsRead(); return { ok: true, message: 'All read' } }}>Mark all as read</ActionButton>} />
      <Card>
        {items.length === 0 ? <EmptyState icon={<Bell />} title="No notifications" /> : (
          <ul className="divide-y divide-line">
            {items.map((n) => (
              <li key={n.id} className={cn('flex items-start gap-3 px-4 py-3', !n.readAt && 'bg-coral-light/20')}>
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.readAt ? 'bg-line-strong' : 'bg-coral')} />
                <div className="min-w-0 flex-1 text-[13px]">
                  {n.link ? <Link href={n.link} className="font-medium hover:text-coral-dark">{n.title}</Link> : <span className="font-medium">{n.title}</span>}
                  {n.body && <p className="text-muted">{n.body}</p>}
                  <p className="text-[11.5px] text-muted">{relativeTime(n.createdAt)}</p>
                </div>
                <Badge>{n.type.toLowerCase().replace('_', ' ')}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
