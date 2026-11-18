'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2, Search } from 'lucide-react'
import { deleteGuest, saveGuest, setGuestRsvp } from '@/app/actions/events'
import type { FormState } from '@/app/actions/resources'
import { RSVP } from '@/lib/options'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FieldShell, Input, Select, Textarea } from '@/components/ui/inputs'
import { Sheet } from '@/components/ui/sheet'
import { TONES } from '@/components/ui/badge'

export interface GuestRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  rsvp: string
  dietary: string | null
  table: string | null
  plusOnes: number
  requirements: string | null
}

export function GuestList({ eventId, guests, canWrite, mobile }: { eventId: string; guests: GuestRow[]; canWrite: boolean; mobile?: boolean }) {
  const [editing, setEditing] = React.useState<GuestRow | 'new' | null>(null)
  const [q, setQ] = React.useState('')
  const [view, setView] = React.useState<'list' | 'seating'>('list')
  const router = useRouter()
  const [, start] = React.useTransition()
  const filtered = guests.filter((g) => !q || g.name.toLowerCase().includes(q.toLowerCase()) || g.table?.toLowerCase().includes(q.toLowerCase()))
  const stats = RSVP.map((r) => ({ ...r, count: guests.filter((g) => g.rsvp === r.value).reduce((a, g) => a + 1 + (r.value === 'ACCEPTED' ? g.plusOnes : 0), 0) }))
  const tables = [...new Set(guests.map((g) => g.table ?? 'Unassigned'))].sort()
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
        {stats.map((s) => (
          <span key={s.value} className={cn('rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset', TONES[s.tone ?? 'gray'])}>
            {s.label} · {s.count}
          </span>
        ))}
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guests / tables" className="h-8 w-48 rounded-lg border border-line bg-offwhite pr-2 pl-7 text-[13px] outline-none focus:border-coral" />
        </div>
        {!mobile && (
          <div className="flex rounded-lg border border-line bg-offwhite p-0.5 text-xs">
            {(['list', 'seating'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={cn('rounded-md px-2 py-1 capitalize', view === v ? 'bg-white font-medium shadow-soft' : 'text-muted')}>
                {v}
              </button>
            ))}
          </div>
        )}
        {canWrite && (
          <Button size="sm" variant="primary" onClick={() => setEditing('new')}>
            <Plus /> Guest
          </Button>
        )}
      </div>
      {view === 'seating' ? (
        <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          {tables.map((t) => {
            const list = filtered.filter((g) => (g.table ?? 'Unassigned') === t)
            return (
              <div key={t} className="rounded-xl border border-line bg-white">
                <div className="flex justify-between border-b border-line px-3 py-2 text-[13px] font-semibold">
                  {t} <span className="text-xs font-normal text-muted">{list.reduce((a, g) => a + 1 + g.plusOnes, 0)} seats</span>
                </div>
                <ul className="space-y-1 p-2 text-[12.5px]">
                  {list.map((g) => (
                    <li key={g.id} className="flex justify-between gap-2">
                      <span className="truncate">{g.name}{g.plusOnes ? ` +${g.plusOnes}` : ''}</span>
                      {g.dietary && <span className="shrink-0 text-[11px] text-amber-700">{g.dietary}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {filtered.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium">
                  {g.name}
                  {g.plusOnes > 0 && <span className="ml-1 text-xs text-muted">+{g.plusOnes}</span>}
                </div>
                <div className="truncate text-xs text-muted">{[g.table, g.dietary, g.requirements, g.email].filter(Boolean).join(' · ') || '—'}</div>
              </div>
              <select
                disabled={!canWrite}
                value={g.rsvp}
                onChange={(e) => start(async () => { const r = await setGuestRsvp(g.id, e.target.value); if (!r.ok) toast.error(r.message); router.refresh() })}
                className={cn('h-7 rounded-md px-2 text-xs font-medium ring-1 ring-inset outline-none', TONES[RSVP.find((r) => r.value === g.rsvp)?.tone ?? 'gray'])}
              >
                {RSVP.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {canWrite && (
                <span className="flex">
                  <button onClick={() => setEditing(g)} className="rounded p-1.5 text-muted hover:bg-lightgray hover:text-ink" aria-label="Edit">
                    <Pencil className="size-3.5" />
                  </button>
                  <button onClick={() => start(async () => { const r = await deleteGuest(g.id); if (r.ok) toast.success(r.message); router.refresh() })} className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Delete">
                    <Trash2 className="size-3.5" />
                  </button>
                </span>
              )}
            </li>
          ))}
          {filtered.length === 0 && <li className="py-8 text-center text-sm text-muted">No guests.</li>}
        </ul>
      )}
      {editing && <GuestSheet eventId={eventId} guest={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function GuestSheet({ eventId, guest, onClose }: { eventId: string; guest: GuestRow | null; onClose: () => void }) {
  const action = React.useMemo(() => saveGuest.bind(null, eventId, guest?.id ?? null), [eventId, guest])
  const [state, formAction, pending] = React.useActionState(action, { ok: false } as FormState)
  const router = useRouter()
  React.useEffect(() => {
    if (state.ok) {
      toast.success(state.message)
      router.refresh()
      onClose()
    } else if (state.message) toast.error(state.message)
  }, [state, router, onClose])
  return (
    <Sheet open onClose={onClose} title={guest ? 'Edit guest' : 'Add guest'} width="max-w-md">
      <form action={formAction} className="grid grid-cols-2 gap-3">
        <FieldShell label="Full name" required className="col-span-2"><Input name="name" defaultValue={guest?.name} required /></FieldShell>
        <FieldShell label="Email"><Input name="email" type="email" defaultValue={guest?.email ?? ''} /></FieldShell>
        <FieldShell label="Phone"><Input name="phone" defaultValue={guest?.phone ?? ''} /></FieldShell>
        <FieldShell label="RSVP">
          <Select name="rsvp" defaultValue={guest?.rsvp ?? 'PENDING'}>
            {RSVP.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        </FieldShell>
        <FieldShell label="Plus ones"><Input name="plusOnes" type="number" min={0} max={10} defaultValue={guest?.plusOnes ?? 0} /></FieldShell>
        <FieldShell label="Table / seating"><Input name="table" defaultValue={guest?.table ?? ''} placeholder="Table 4" /></FieldShell>
        <FieldShell label="Dietary preferences"><Input name="dietary" defaultValue={guest?.dietary ?? ''} placeholder="Vegetarian, gluten-free…" /></FieldShell>
        <FieldShell label="Special requirements" className="col-span-2"><Textarea name="requirements" defaultValue={guest?.requirements ?? ''} rows={2} /></FieldShell>
        <div className="col-span-2 flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={pending}>{guest ? 'Save' : 'Add guest'}</Button>
        </div>
      </form>
    </Sheet>
  )
}
