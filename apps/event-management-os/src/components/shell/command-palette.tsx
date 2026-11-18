'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CornerDownLeft, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/sheet'
import { useShell } from './shell-context'

interface Hit {
  type: string
  id: string
  title: string
  subtitle?: string
  href: string
}

export function CommandPalette({ pages }: { pages: { label: string; href: string }[] }) {
  const { paletteOpen, setPaletteOpen } = useShell()
  const router = useRouter()
  const [q, setQ] = React.useState('')
  const [hits, setHits] = React.useState<Hit[]>([])
  const [loading, setLoading] = React.useState(false)
  const [index, setIndex] = React.useState(0)
  const [type, setType] = React.useState<string>('All')

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setPaletteOpen])

  React.useEffect(() => {
    if (!paletteOpen) {
      setQ('')
      setHits([])
      setType('All')
    }
  }, [paletteOpen])

  React.useEffect(() => {
    if (q.trim().length < 2) {
      setHits([])
      return
    }
    const ctrl = new AbortController()
    setLoading(true)
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => {
          setHits(d.results ?? [])
          setIndex(0)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 160)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [q])

  const pageHits: Hit[] = q.trim() ? pages.filter((p) => p.label.toLowerCase().includes(q.toLowerCase())).map((p) => ({ type: 'Pages', id: p.href, title: p.label, href: p.href })) : pages.slice(0, 8).map((p) => ({ type: 'Pages', id: p.href, title: p.label, href: p.href }))
  const all = [...pageHits, ...hits]
  const types = ['All', ...Array.from(new Set(all.map((h) => h.type)))]
  const list = type === 'All' ? all : all.filter((h) => h.type === type)
  const go = (h: Hit) => {
    setPaletteOpen(false)
    router.push(h.href)
  }
  let last = ''
  return (
    <Modal open={paletteOpen} onClose={() => setPaletteOpen(false)} className="max-w-xl">
      <div className="flex items-center gap-2.5 border-b border-line px-4">
        <Search className="size-4 text-muted" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setIndex((i) => Math.min(list.length - 1, i + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setIndex((i) => Math.max(0, i - 1))
            } else if (e.key === 'Enter' && list[index]) go(list[index])
          }}
          placeholder="Search clients, leads, projects, suppliers, documents…"
          className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted/70"
        />
        {loading && <span className="size-3.5 animate-spin rounded-full border-2 border-coral border-r-transparent" />}
      </div>
      {types.length > 2 && (
        <div className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-line px-3 py-2">
          {types.map((t) => (
            <button key={t} onClick={() => setType(t)} className={cn('h-6 rounded-md px-2 text-xs font-medium whitespace-nowrap', type === t ? 'bg-coral-light text-coral-dark' : 'text-muted hover:bg-lightgray')}>
              {t}
            </button>
          ))}
        </div>
      )}
      <div className="scrollbar-thin max-h-[50vh] overflow-y-auto p-1.5">
        {list.length === 0 && <p className="py-10 text-center text-sm text-muted">{q.trim().length < 2 ? 'Type at least 2 characters' : loading ? 'Searching…' : 'No results'}</p>}
        {list.map((h, i) => {
          const header = h.type !== last ? h.type : null
          last = h.type
          return (
            <React.Fragment key={h.type + h.id}>
              {header && <div className="px-2.5 pt-2 pb-1 text-[10.5px] font-semibold tracking-wider text-muted uppercase">{header}</div>}
              <button onMouseEnter={() => setIndex(i)} onClick={() => go(h)} className={cn('flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left', i === index ? 'bg-lightgray' : '')}>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] text-ink">{h.title}</span>
                  {h.subtitle && <span className="block truncate text-xs text-muted">{h.subtitle}</span>}
                </span>
                {i === index && <CornerDownLeft className="size-3.5 text-muted" />}
              </button>
            </React.Fragment>
          )
        })}
      </div>
    </Modal>
  )
}
