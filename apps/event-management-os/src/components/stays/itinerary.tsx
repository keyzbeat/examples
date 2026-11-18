import { BedDouble, Car, Compass, Sparkles, Utensils, CircleDot } from 'lucide-react'
import { RESERVATION_STATUS } from '@/lib/options'
import { formatDate } from '@/lib/dates'
import { OptBadge } from '@/components/ui/badge'

const ICONS: Record<string, typeof Car> = { ACCOMMODATION: BedDouble, TRANSFER: Car, ACTIVITY: Compass, RESTAURANT: Utensils, EXPERIENCE: Sparkles, OTHER: CircleDot }

export interface ItineraryItem {
  id: string
  date: Date
  time: string | null
  type: string
  title: string
  location: string | null
  status: string
  confirmation: string | null
  supplier: string | null
  notes: string | null
}

/** Day-by-day itinerary. `clientSafe` hides internal fields (costs are never passed in). */
export function Itinerary({ items, start, clientSafe }: { items: ItineraryItem[]; start?: Date | null; clientSafe?: boolean }) {
  const days = new Map<string, ItineraryItem[]>()
  for (const it of [...items].sort((a, b) => a.date.getTime() - b.date.getTime() || (a.time ?? '').localeCompare(b.time ?? ''))) {
    const k = it.date.toISOString().slice(0, 10)
    days.set(k, [...(days.get(k) ?? []), it])
  }
  if (!items.length) return <p className="px-4 py-8 text-center text-sm text-muted">No itinerary items yet.</p>
  return (
    <div className="space-y-5 p-4">
      {[...days.entries()].map(([k, list]) => {
        const date = new Date(`${k}T00:00:00`)
        const dayN = start ? Math.round((date.getTime() - new Date(start.toISOString().slice(0, 10) + 'T00:00:00').getTime()) / 86_400_000) + 1 : null
        return (
          <section key={k}>
            <h3 className="mb-2 flex items-baseline gap-2 text-[13px] font-semibold">
              {dayN !== null && dayN > 0 && <span className="rounded-md bg-coral-light px-1.5 py-0.5 text-[11px] text-coral-dark">Day {dayN}</span>}
              {formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <ul className="space-y-2">
              {list.map((it) => {
                const Icon = ICONS[it.type] ?? CircleDot
                return (
                  <li key={it.id} className="flex gap-3 rounded-xl border border-line bg-white p-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-beige text-ink/70">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[13.5px] font-medium">
                          {it.time && <span className="tabular mr-2 text-coral-dark">{it.time}</span>}
                          {it.title}
                        </p>
                        <OptBadge options={RESERVATION_STATUS} value={it.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted">{[it.location, !clientSafe && it.supplier, it.confirmation && `Confirmation ${it.confirmation}`].filter(Boolean).join(' · ')}</p>
                      {!clientSafe && it.notes && <p className="mt-1 text-xs text-ink/70">{it.notes}</p>}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
