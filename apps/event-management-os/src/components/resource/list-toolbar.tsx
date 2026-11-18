'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Download, LayoutGrid, List, Search, X, CalendarDays } from 'lucide-react'
import type { RelationOption } from '@/lib/resources/fields'
import { cn } from '@/lib/utils'
import { Select } from '@/components/ui/inputs'
import { buttonClass } from '@/components/ui/button'

export interface ToolbarFilter {
  name: string
  label: string
  options: RelationOption[]
}

const STORAGE_PREFIX = 'emos:filters:'

/**
 * Search + filters bound to the URL. The last used query string of each list is kept in
 * sessionStorage so that opening a record and coming back restores the same filters.
 */
export function ListToolbar({ filters = [], placeholder = 'Search…', views, exportResource, children }: { filters?: ToolbarFilter[]; placeholder?: string; views?: ('table' | 'kanban' | 'calendar')[]; exportResource?: string; children?: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [q, setQ] = React.useState(params.get('q') ?? '')
  const restored = React.useRef(false)

  // Restore persisted filters once when arriving on a bare list URL.
  React.useEffect(() => {
    if (restored.current) return
    restored.current = true
    try {
      const saved = sessionStorage.getItem(STORAGE_PREFIX + pathname)
      if (!params.toString() && saved) router.replace(`${pathname}?${saved}`, { scroll: false })
    } catch {}
  }, [params, pathname, router])

  // Persist current filters (excluding transient keys).
  React.useEffect(() => {
    try {
      const p = new URLSearchParams(params.toString())
      p.delete('new')
      sessionStorage.setItem(STORAGE_PREFIX + pathname, p.toString())
    } catch {}
  }, [params, pathname])

  React.useEffect(() => setQ(params.get('q') ?? ''), [params])

  const push = React.useCallback(
    (updates: Record<string, string | null>) => {
      const p = new URLSearchParams(params.toString())
      for (const [k, v] of Object.entries(updates)) {
        if (v) p.set(k, v)
        else p.delete(k)
      }
      p.delete('page')
      router.replace(p.size ? `${pathname}?${p}` : pathname, { scroll: false })
    },
    [params, pathname, router],
  )

  React.useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('q') ?? '') !== q) push({ q: q || null })
    }, 300)
    return () => clearTimeout(t)
  }, [q, params, push])

  const active = filters.filter((f) => params.get(f.name))
  const view = params.get('view') ?? views?.[0] ?? 'table'
  const exportHref = exportResource ? `/api/export/${exportResource}?${params.toString()}` : null

  return (
    <div className="flex flex-col gap-2 border-b border-line px-3 py-2.5 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1 lg:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="h-8 w-full rounded-lg border border-line bg-offwhite pr-7 pl-8 text-[13px] outline-none placeholder:text-muted/80 focus:border-coral focus:bg-white focus:ring-3 focus:ring-coral/10" />
        {q && (
          <button onClick={() => setQ('')} className="absolute top-1/2 right-2 -translate-y-1/2 text-muted hover:text-ink" aria-label="Clear search">
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {filters.map((f) => (
          <Select key={f.name} value={params.get(f.name) ?? ''} onChange={(e) => push({ [f.name]: e.target.value || null })} className={cn('h-8 w-auto max-w-44 py-0 text-[13px]', params.get(f.name) && 'border-coral/40 bg-coral-light/40')} aria-label={f.label}>
            <option value="">{f.label}: All</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        ))}
        {active.length > 0 && (
          <button onClick={() => push(Object.fromEntries(filters.map((f) => [f.name, null])))} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] text-muted hover:bg-lightgray hover:text-ink">
            <X className="size-3.5" /> Reset
          </button>
        )}
        {children}
      </div>
      <div className="flex items-center gap-2">
        {views && views.length > 1 && (
          <div className="flex rounded-lg border border-line bg-offwhite p-0.5">
            {views.map((v) => {
              const Icon = v === 'table' ? List : v === 'kanban' ? LayoutGrid : CalendarDays
              return (
                <button key={v} onClick={() => push({ view: v === views[0] ? null : v })} className={cn('inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium capitalize', view === v ? 'bg-white text-ink shadow-soft' : 'text-muted hover:text-ink')}>
                  <Icon className="size-3.5" />
                  {v}
                </button>
              )
            })}
          </div>
        )}
        {exportHref && (
          <a href={exportHref} className={buttonClass('secondary', 'sm')}>
            <Download /> Export
          </a>
        )}
      </div>
    </div>
  )
}
