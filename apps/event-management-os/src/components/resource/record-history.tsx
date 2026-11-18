import { prisma } from '@/lib/prisma'
import { relativeTime } from '@/lib/dates'
import { Card, CardHeader } from '@/components/ui/card'

/** Activity history for any record (from activity_logs). */
export async function RecordHistory({ organizationId, entityId, title = 'History' }: { organizationId: string; entityId: string; title?: string }) {
  const items = await prisma.activityLog.findMany({ where: { organizationId, entityId }, orderBy: { createdAt: 'desc' }, take: 25, include: { user: { select: { name: true } } } })
  return (
    <Card>
      <CardHeader title={title} />
      <ul className="divide-y divide-line">
        {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">No history yet.</li>}
        {items.map((a) => (
          <li key={a.id} className="px-4 py-2.5 text-[13px]">
            <p className="text-ink/90">{a.summary}</p>
            <p className="text-[11.5px] text-muted">{a.user?.name ?? 'Automation'} · {relativeTime(a.createdAt)}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}
