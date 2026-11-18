'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Trash2 } from 'lucide-react'
import { addTimelineItem, deleteTimelineItem, toggleTimelineItem } from '@/app/actions/events'
import type { FormState } from '@/app/actions/resources'
import { TIMELINE_CATEGORY, findOpt } from '@/lib/options'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/inputs'

export interface TimelineItem {
  id: string
  time: string
  title: string
  category: string
  notes: string | null
  done: boolean
}

export function TimelineEditor({ eventId, items, canWrite }: { eventId: string; items: TimelineItem[]; canWrite: boolean }) {
  const router = useRouter()
  const action = React.useMemo(() => addTimelineItem.bind(null, eventId), [eventId])
  const [state, formAction, pending] = React.useActionState(action, { ok: false } as FormState)
  const ref = React.useRef<HTMLFormElement>(null)
  const [, start] = React.useTransition()
  React.useEffect(() => {
    if (state.ok) {
      ref.current?.reset()
      router.refresh()
    } else if (state.message) toast.error(state.message)
  }, [state, router])
  const sorted = [...items].sort((a, b) => sortTime(a.time) - sortTime(b.time))
  return (
    <div>
      <ol className="px-4 py-3">
        {sorted.map((it, i) => {
          const cat = findOpt(TIMELINE_CATEGORY, it.category)
          return (
            <li key={it.id} className="group relative flex gap-4 pb-3">
              {i < sorted.length - 1 && <span className="absolute top-7 bottom-0 left-[60px] w-px bg-line" />}
              <span className="tabular w-11 shrink-0 pt-1 text-right text-[13px] font-semibold text-ink">{it.time}</span>
              <button disabled={!canWrite} onClick={() => start(async () => { await toggleTimelineItem(it.id); router.refresh() })} className={cn('relative z-10 mt-1 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 bg-white', it.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-coral')} aria-label="Toggle done">
                {it.done && <Check className="size-2.5" strokeWidth={3} />}
              </button>
              <div className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn('text-[13px] font-medium', it.done && 'text-muted line-through')}>{it.title}</span>
                  <span className="flex items-center gap-1.5">
                    {cat && <Badge tone={cat.tone}>{cat.label}</Badge>}
                    {canWrite && (
                      <button onClick={() => start(async () => { await deleteTimelineItem(it.id); router.refresh() })} className="rounded p-1 text-muted opacity-0 group-hover:opacity-100 hover:text-red-600" aria-label="Delete">
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </span>
                </div>
                {it.notes && <p className="mt-0.5 text-xs text-muted">{it.notes}</p>}
              </div>
            </li>
          )
        })}
        {sorted.length === 0 && <li className="py-6 text-center text-sm text-muted">No run-of-show items yet.</li>}
      </ol>
      {canWrite && (
        <form ref={ref} action={formAction} className="flex flex-col gap-2 border-t border-line p-3 sm:flex-row">
          <Input name="time" type="time" required className="sm:w-28" />
          <Input name="title" placeholder="e.g. Florist delivery at service entrance" required />
          <Select name="category" defaultValue="PROGRAM" className="sm:w-40">
            {TIMELINE_CATEGORY.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="primary" loading={pending}>
            Add
          </Button>
        </form>
      )}
    </div>
  )
}

function sortTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  // Treat early-morning times (00:00–05:59) as after midnight of the event day.
  return ((h! < 6 ? h! + 24 : h!) * 60 + m!) as number
}
