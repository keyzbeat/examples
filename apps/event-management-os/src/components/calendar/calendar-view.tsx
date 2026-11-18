'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { moveCalendarItem } from '@/app/actions/calendar'
import { CALENDAR_TYPE, findOpt } from '@/lib/options'
import { cn } from '@/lib/utils'
import { DOTS, TONES } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/inputs'
import { Sheet } from '@/components/ui/sheet'
import { ResourceForm, type ResourceFormProps } from '@/components/resource/resource-form'

export interface CalItem {
  id: string
  kind: 'calendar' | 'task' | 'followup' | 'event' | 'reservation'
  type: string
  title: string
  start: string // ISO
  end?: string | null
  allDay?: boolean
  href: string
  owner?: string | null
}

type View = 'month' | 'week' | 'day' | 'list'
const DAY = 86_400_000
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const mondayOf = (d: Date) => new Date(sod(d).getTime() - ((d.getDay() + 6) % 7) * DAY)

export function CalendarView({ items, view, anchor, users, form, canWrite }: { items: CalItem[]; view: View; anchor: string; users: { value: string; label: string }[]; form: Omit<ResourceFormProps, 'values'> & { values: Record<string, string | boolean | string[]> }; canWrite: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const a = new Date(`${anchor}T00:00:00`)
  const [createAt, setCreateAt] = React.useState<string | null>(null)
  const [drag, setDrag] = React.useState<CalItem | null>(null)
  const [over, setOver] = React.useState<string | null>(null)
  const [local, setLocal] = React.useState(items)
  React.useEffect(() => setLocal(items), [items])

  const nav = (updates: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(updates)) v ? p.set(k, v) : p.delete(k)
    router.push(`${pathname}?${p}`, { scroll: false })
  }
  const shift = (dir: number) => {
    const n = new Date(a)
    if (view === 'month') n.setMonth(n.getMonth() + dir)
    else if (view === 'week' || view === 'list') n.setDate(n.getDate() + 7 * dir)
    else n.setDate(n.getDate() + dir)
    nav({ date: key(n) })
  }
  const byDay = React.useMemo(() => {
    const m = new Map<string, CalItem[]>()
    for (const it of local) {
      const k = key(new Date(it.start))
      m.set(k, [...(m.get(k) ?? []), it])
    }
    for (const list of m.values()) list.sort((x, y) => +new Date(x.start) - +new Date(y.start))
    return m
  }, [local])

  const drop = async (dayKey: string) => {
    setOver(null)
    const it = drag
    setDrag(null)
    if (!it || !['calendar', 'task', 'followup'].includes(it.kind) || key(new Date(it.start)) === dayKey) return
    const prev = local
    setLocal((ls) => ls.map((x) => (x.id === it.id && x.kind === it.kind ? { ...x, start: `${dayKey}T${new Date(it.start).toTimeString().slice(0, 8)}` } : x)))
    const r = await moveCalendarItem(it.kind as 'calendar', it.id, dayKey)
    if (!r.ok) { setLocal(prev); toast.error(r.message) } else { toast.success(r.message); router.refresh() }
  }

  const title = view === 'month' ? a.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : view === 'day' ? a.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : `Week of ${mondayOf(a).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`

  const Chip = ({ it, compact }: { it: CalItem; compact?: boolean }) => {
    const tone = findOpt(CALENDAR_TYPE, it.type)?.tone ?? 'gray'
    const movable = canWrite && ['calendar', 'task', 'followup'].includes(it.kind)
    const t0 = new Date(it.start).toTimeString().slice(0, 5)
    const time = !it.allDay && it.kind !== 'event' && t0 !== '00:00' ? t0 : null
    return (
      <Link
        href={it.href}
        draggable={movable}
        onDragStart={(e) => { e.stopPropagation(); setDrag(it) }}
        onDragEnd={() => setDrag(null)}
        onClick={(e) => e.stopPropagation()}
        title={`${findOpt(CALENDAR_TYPE, it.type)?.label} · ${it.title}`}
        className={cn('flex items-center gap-1.5 truncate rounded-md px-1.5 py-[3px] text-[11.5px] ring-1 ring-inset', TONES[tone], movable && 'cursor-grab', compact ? '' : 'py-1.5 text-[12.5px]')}
      >
        <span className={cn('size-1.5 shrink-0 rounded-full', DOTS[tone])} />
        {time && <span className="tabular opacity-70">{time}</span>}
        <span className="truncate">{it.title}</span>
      </Link>
    )
  }

  const DayCell = ({ d, muted, tall }: { d: Date; muted?: boolean; tall?: boolean }) => {
    const k = key(d)
    const list = byDay.get(k) ?? []
    const today = k === key(new Date())
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(k) }}
        onDragLeave={() => setOver((o) => (o === k ? null : o))}
        onDrop={() => drop(k)}
        onDoubleClick={() => canWrite && setCreateAt(k)}
        className={cn('group relative bg-white p-1.5', tall ? 'min-h-[420px]' : 'min-h-[112px]', muted && 'bg-offwhite/70', over === k && 'bg-coral-light/50')}
      >
        <div className="mb-1 flex items-center justify-between">
          <span className={cn('tabular flex size-6 items-center justify-center rounded-full text-xs', today ? 'bg-coral font-semibold text-white' : muted ? 'text-muted/60' : 'text-ink/80')}>{d.getDate()}</span>
          {canWrite && <button onClick={() => setCreateAt(k)} className="rounded p-0.5 text-muted opacity-0 group-hover:opacity-100 hover:bg-lightgray" aria-label="Add"><Plus className="size-3.5" /></button>}
        </div>
        <div className="space-y-1">
          {(tall ? list : list.slice(0, 3)).map((it) => <Chip key={it.kind + it.id} it={it} compact={!tall} />)}
          {!tall && list.length > 3 && <button onClick={() => nav({ view: 'day', date: k })} className="px-1 text-[11px] text-muted hover:text-ink">+{list.length - 3} more</button>}
        </div>
      </div>
    )
  }

  let body: React.ReactNode
  if (view === 'month') {
    const first = new Date(a.getFullYear(), a.getMonth(), 1)
    const start = mondayOf(first)
    const days = Array.from({ length: 42 }, (_, i) => new Date(start.getTime() + i * DAY + 3_600_000)).map(sod)
    body = (
      <>
        <div className="grid grid-cols-7 border-b border-line bg-beige/50 text-center text-[11px] font-medium tracking-wide text-muted uppercase">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="py-2">{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-px bg-line">{days.map((d) => <DayCell key={key(d)} d={d} muted={d.getMonth() !== a.getMonth()} />)}</div>
      </>
    )
  } else if (view === 'week') {
    const start = mondayOf(a)
    const days = Array.from({ length: 7 }, (_, i) => sod(new Date(start.getTime() + i * DAY + 3_600_000)))
    body = (
      <>
        <div className="grid grid-cols-7 border-b border-line bg-beige/50 text-center text-[11px] font-medium text-muted">{days.map((d) => <div key={key(d)} className="py-2">{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>)}</div>
        <div className="grid grid-cols-7 gap-px bg-line">{days.map((d) => <DayCell key={key(d)} d={d} tall />)}</div>
      </>
    )
  } else if (view === 'day') {
    body = <div className="bg-line p-px"><DayCell d={a} tall /></div>
  } else {
    const start = mondayOf(a)
    const days = Array.from({ length: 28 }, (_, i) => sod(new Date(start.getTime() + i * DAY + 3_600_000))).filter((d) => byDay.get(key(d))?.length)
    body = (
      <div className="divide-y divide-line">
        {days.length === 0 && <p className="py-10 text-center text-sm text-muted">Nothing scheduled in the next 4 weeks.</p>}
        {days.map((d) => (
          <div key={key(d)} className="flex flex-col gap-2 px-4 py-3 sm:flex-row">
            <div className="w-44 shrink-0 text-[13px] font-medium">{d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
            <div className="flex-1 space-y-1">{byDay.get(key(d))!.map((it) => <Chip key={it.kind + it.id} it={it} />)}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-2 border-b border-line px-3 py-2.5 lg:flex-row lg:items-center">
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost" onClick={() => shift(-1)} aria-label="Previous"><ChevronLeft /></Button>
          <Button size="sm" variant="secondary" onClick={() => nav({ date: null })}>Today</Button>
          <Button size="icon-sm" variant="ghost" onClick={() => shift(1)} aria-label="Next"><ChevronRight /></Button>
          <h2 className="ml-2 text-[15px] font-semibold">{title}</h2>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
          <Select value={params.get('owner') ?? ''} onChange={(e) => nav({ owner: e.target.value || null })} className="h-8 w-auto py-0 text-[13px]" aria-label="Team member">
            <option value="">Whole team</option>
            {users.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </Select>
          <Select value={params.get('type') ?? ''} onChange={(e) => nav({ type: e.target.value || null })} className="h-8 w-auto py-0 text-[13px]" aria-label="Type">
            <option value="">All items</option>
            {CALENDAR_TYPE.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <div className="flex rounded-lg border border-line bg-offwhite p-0.5">
            {(['day', 'week', 'month', 'list'] as View[]).map((v) => (
              <button key={v} onClick={() => nav({ view: v === 'month' ? null : v })} className={cn('h-7 rounded-md px-2.5 text-xs font-medium capitalize', view === v ? 'bg-white shadow-soft' : 'text-muted hover:text-ink')}>{v}</button>
            ))}
          </div>
          {canWrite && <Button size="sm" variant="primary" onClick={() => setCreateAt(key(view === 'month' ? new Date() : a))}><Plus /> New</Button>}
        </div>
      </div>
      {body}
      <div className="flex flex-wrap gap-3 border-t border-line px-4 py-2.5 text-[11px] text-muted">
        {CALENDAR_TYPE.map((t) => <span key={t.value} className="inline-flex items-center gap-1.5"><span className={cn('size-1.5 rounded-full', DOTS[t.tone ?? 'gray'])} />{t.label}</span>)}
        <span className="ml-auto">Drag meetings, tasks and follow-ups to reschedule · double-click a day to create</span>
      </div>
      {createAt && (
        <Sheet open onClose={() => setCreateAt(null)} title="New calendar item" description="Meeting, deadline, delivery, follow-up or reservation reminder.">
          <ResourceForm {...form} values={{ ...form.values, start: `${createAt}T09:00`, end: `${createAt}T10:00` }} navigateOnCreate={false} onDone={(s) => s.ok && setCreateAt(null)} />
        </Sheet>
      )}
    </div>
  )
}
