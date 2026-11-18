'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { quickUpdate } from '@/app/actions/resources'
import type { Opt } from '@/lib/options'
import { cn } from '@/lib/utils'
import { DOTS } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'

export interface BoardCard {
  id: string
  title: string
  subtitle?: string | null
  href: string
  status: string
  meta?: string | null
  metaTone?: 'default' | 'danger'
  badge?: { label: string; className?: string } | null
  avatar?: { name: string; color: string } | null
  progress?: number | null
}

/** Generic drag & drop board for any enumerated status (projects, tasks, concierge…). */
export function StatusBoard({ resource, field = 'status', columns, cards: initial, canWrite }: { resource: string; field?: string; columns: Opt[]; cards: BoardCard[]; canWrite: boolean }) {
  const [cards, setCards] = React.useState(initial)
  React.useEffect(() => setCards(initial), [initial])
  const [drag, setDrag] = React.useState<string | null>(null)
  const [over, setOver] = React.useState<string | null>(null)
  const router = useRouter()
  const drop = async (status: string) => {
    setOver(null)
    const id = drag
    setDrag(null)
    const card = cards.find((c) => c.id === id)
    if (!id || !card || card.status === status) return
    const prev = cards
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)))
    const res = await quickUpdate(resource, id, field, status)
    if (!res.ok) {
      setCards(prev)
      toast.error(res.message)
    } else {
      toast.success('Status updated')
      router.refresh()
    }
  }
  return (
    <div className="scrollbar-thin -mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
      {columns.map((col) => {
        const items = cards.filter((c) => c.status === col.value)
        return (
          <div
            key={col.value}
            onDragOver={(e) => {
              if (!canWrite) return
              e.preventDefault()
              setOver(col.value)
            }}
            onDragLeave={() => setOver((o) => (o === col.value ? null : o))}
            onDrop={() => drop(col.value)}
            className={cn('flex w-[268px] shrink-0 flex-col rounded-xl border border-line bg-beige/50', over === col.value && 'border-coral/40 bg-coral-light/40')}
          >
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
              <span className={cn('size-2 rounded-full', DOTS[col.tone ?? 'gray'])} />
              <span className="text-[13px] font-semibold">{col.label}</span>
              <span className="tabular rounded bg-white px-1.5 text-[11px] text-muted">{items.length}</span>
            </div>
            <div className="scrollbar-thin flex max-h-[calc(100vh-260px)] min-h-24 flex-col gap-2 overflow-y-auto px-2 pb-2">
              {items.map((c) => (
                <div key={c.id} draggable={canWrite} onDragStart={() => setDrag(c.id)} onDragEnd={() => setDrag(null)} className={cn('rounded-lg border border-line bg-white p-3 shadow-soft hover:shadow-pop', canWrite && 'cursor-grab active:cursor-grabbing', drag === c.id && 'opacity-50')}>
                  <div className="flex items-start justify-between gap-2">
                    <Link href={c.href} className="min-w-0 text-[13px] leading-snug font-medium text-ink hover:text-coral-dark">
                      {c.title}
                      {c.subtitle && <span className="block truncate text-xs font-normal text-muted">{c.subtitle}</span>}
                    </Link>
                    {c.avatar && <Avatar name={c.avatar.name} color={c.avatar.color} size="xs" />}
                  </div>
                  {typeof c.progress === 'number' && (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-lightgray">
                      <div className="h-full rounded-full bg-coral" style={{ width: `${c.progress}%` }} />
                    </div>
                  )}
                  {(c.meta || c.badge) && (
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11.5px]">
                      <span className={cn(c.metaTone === 'danger' ? 'font-medium text-red-600' : 'text-muted')}>{c.meta}</span>
                      {c.badge && <span className={cn('rounded px-1.5 py-0.5 text-[10.5px] font-medium', c.badge.className ?? 'bg-lightgray text-muted')}>{c.badge.label}</span>}
                    </div>
                  )}
                </div>
              ))}
              {items.length === 0 && <div className="rounded-lg border border-dashed border-line-strong/70 py-6 text-center text-xs text-muted">Empty</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
