'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarClock } from 'lucide-react'
import { quickUpdate } from '@/app/actions/resources'
import { LEAD_STAGE, PRIORITY, findOpt } from '@/lib/options'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { DOTS, OptBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'

export interface KanbanLead {
  id: string
  ref: string
  name: string
  company: string | null
  service: string | null
  budget: number | null
  stage: string
  priority: string
  followUp: string | null
  assignee: { name: string; color: string } | null
  position: number
}

export function LeadKanban({ leads: initial, currency, showArchived, canWrite }: { leads: KanbanLead[]; currency: string; showArchived: boolean; canWrite: boolean }) {
  const [leads, setLeads] = React.useState(initial)
  React.useEffect(() => setLeads(initial), [initial])
  const [dragId, setDragId] = React.useState<string | null>(null)
  const [over, setOver] = React.useState<string | null>(null)
  const router = useRouter()
  const stages = LEAD_STAGE.filter((s) => showArchived || s.value !== 'ARCHIVED')

  const drop = async (stage: string) => {
    setOver(null)
    const id = dragId
    setDragId(null)
    if (!id) return
    const lead = leads.find((l) => l.id === id)
    if (!lead || lead.stage === stage) return
    const prev = leads
    const position = Math.max(0, ...leads.filter((l) => l.stage === stage).map((l) => l.position)) + 1
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, stage, position } : l)))
    const res = await quickUpdate('leads', id, 'stage', stage, position)
    if (!res.ok) {
      setLeads(prev)
      toast.error(res.message)
    } else {
      toast.success(stage === 'WON' ? 'Deal won — client & project created automatically' : `Moved to ${findOpt(LEAD_STAGE, stage)?.label}`)
      router.refresh()
    }
  }

  return (
    <div className="scrollbar-thin -mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
      {stages.map((s) => {
        const items = leads.filter((l) => l.stage === s.value).sort((a, b) => a.position - b.position)
        const total = items.reduce((a, l) => a + (l.budget ?? 0), 0)
        return (
          <div
            key={s.value}
            onDragOver={(e) => {
              if (!canWrite) return
              e.preventDefault()
              setOver(s.value)
            }}
            onDragLeave={() => setOver((o) => (o === s.value ? null : o))}
            onDrop={() => drop(s.value)}
            className={cn('flex w-[272px] shrink-0 flex-col rounded-xl border border-line bg-beige/50 transition-colors', over === s.value && 'border-coral/40 bg-coral-light/40')}
          >
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <div className="flex items-center gap-2">
                <span className={cn('size-2 rounded-full', DOTS[s.tone ?? 'gray'])} />
                <span className="text-[13px] font-semibold text-ink">{s.label}</span>
                <span className="tabular rounded bg-white px-1.5 text-[11px] text-muted">{items.length}</span>
              </div>
              <span className="tabular text-[11px] text-muted">{formatMoney(total, currency, { compact: true })}</span>
            </div>
            <div className="scrollbar-thin flex max-h-[calc(100vh-280px)] min-h-24 flex-col gap-2 overflow-y-auto px-2 pb-2">
              {items.map((l) => {
                const late = l.followUp && new Date(l.followUp) < new Date()
                return (
                  <div
                    key={l.id}
                    draggable={canWrite}
                    onDragStart={() => setDragId(l.id)}
                    onDragEnd={() => setDragId(null)}
                    className={cn('group rounded-lg border border-line bg-white p-3 shadow-soft transition-shadow hover:shadow-pop', canWrite && 'cursor-grab active:cursor-grabbing', dragId === l.id && 'opacity-50')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/leads/${l.id}`} className="min-w-0 text-[13px] leading-snug font-medium text-ink hover:text-coral-dark">
                        {l.name}
                        {l.company && <span className="block truncate text-xs font-normal text-muted">{l.company}</span>}
                      </Link>
                      {l.assignee && <Avatar name={l.assignee.name} color={l.assignee.color} size="xs" />}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {l.service && <span className="rounded bg-lightgray px-1.5 py-0.5 text-[11px] text-ink/70">{l.service}</span>}
                      <OptBadge options={PRIORITY} value={l.priority} dot={false} />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[11.5px]">
                      <span className="tabular font-medium text-ink/85">{formatMoney(l.budget, currency, { compact: true })}</span>
                      {l.followUp && (
                        <span className={cn('inline-flex items-center gap-1', late ? 'font-medium text-red-600' : 'text-muted')}>
                          <CalendarClock className="size-3" />
                          {new Date(l.followUp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              {items.length === 0 && <div className="rounded-lg border border-dashed border-line-strong/70 py-6 text-center text-xs text-muted">Drop leads here</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
