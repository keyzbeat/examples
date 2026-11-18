import { Mail, MessageCircle, NotebookPen, Phone, Users } from 'lucide-react'
import { relativeTime, formatDateTime } from '@/lib/dates'

const ICON = { NOTE: NotebookPen, CALL: Phone, EMAIL: Mail, WHATSAPP: MessageCircle, MEETING: Users }

export function InteractionHistory({ items }: { items: { id: string; type: keyof typeof ICON; summary: string; occurredAt: Date; user: { name: string } | null }[] }) {
  if (!items.length) return <p className="py-4 text-center text-sm text-muted">No interactions yet.</p>
  return (
    <ul className="space-y-0">
      {items.map((it, i) => {
        const Icon = ICON[it.type]
        return (
          <li key={it.id} className="relative flex gap-3 pb-4">
            {i < items.length - 1 && <span className="absolute top-7 bottom-0 left-[13px] w-px bg-line" />}
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-white text-muted">
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] whitespace-pre-line text-ink/90">{it.summary}</p>
              <p className="mt-0.5 text-[11.5px] text-muted" title={formatDateTime(it.occurredAt)}>
                {it.type.charAt(0) + it.type.slice(1).toLowerCase()} · {it.user?.name ?? 'System'} · {relativeTime(it.occurredAt)}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
