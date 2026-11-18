import { cn } from '@/lib/utils'

export function DetailHeader({ title, refLabel, badges, meta, actions, leading }: { title: React.ReactNode; refLabel?: string | null; badges?: React.ReactNode; meta?: React.ReactNode; actions?: React.ReactNode; leading?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-start gap-3.5">
        {leading}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {refLabel && <span className="tabular rounded-md border border-line bg-white px-1.5 py-0.5 text-[11px] font-medium text-muted">{refLabel}</span>}
            {badges}
          </div>
          <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-ink sm:text-[22px]">{title}</h1>
          {meta && <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted [&_svg]:size-3.5">{meta}</div>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function InfoGrid({ items, cols = 2, className }: { items: { label: string; value: React.ReactNode; wide?: boolean }[]; cols?: 1 | 2 | 3; className?: string }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-3.5', cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3', className)}>
      {items.map((it) => (
        <div key={it.label} className={cn('min-w-0', it.wide && 'sm:col-span-full')}>
          <dt className="text-[11.5px] font-medium text-muted">{it.label}</dt>
          <dd className="mt-0.5 text-[13.5px] break-words whitespace-pre-line text-ink/90">{it.value === null || it.value === undefined || it.value === '' ? <span className="text-muted/70">—</span> : it.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Stat({ label, value, hint, className }: { label: string; value: React.ReactNode; hint?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-line bg-white px-3.5 py-3', className)}>
      <div className="text-[11.5px] font-medium text-muted">{label}</div>
      <div className="tabular mt-1 text-lg font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  )
}
