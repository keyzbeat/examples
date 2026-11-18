import { cn } from '@/lib/utils'

/** Premium header: title, description, contextual KPIs and primary actions. */
export function PremiumHeader({ eyebrow, title, description, actions, kpis, className }: { eyebrow?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; kpis?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1.5 text-xs font-medium text-coral-dark">{eyebrow}</div>}
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {kpis && <div className="mt-5">{kpis}</div>}
    </div>
  )
}

/** App header: compact title + short description + actions (lists / tools). */
export function AppHeader({ title, description, actions, icon, className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-coral-dark shadow-soft [&_svg]:size-[18px]">{icon}</span>}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight text-ink">{title}</h1>
          {description && <p className="truncate text-[13px] text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function KpiGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-3 md:grid-cols-4', className)}>{children}</div>
}

export function Kpi({ label, value, hint, icon, tone = 'default', href }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode; tone?: 'default' | 'warn' | 'good'; href?: string }) {
  const body = (
    <div className={cn('group h-full rounded-xl border border-line bg-white px-4 py-3.5 shadow-soft transition-colors', href && 'hover:border-line-strong')}>
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-medium text-muted">{label}</span>
        {icon && <span className={cn('flex size-6 items-center justify-center rounded-md [&_svg]:size-3.5', tone === 'warn' ? 'bg-red-50 text-red-600' : tone === 'good' ? 'bg-emerald-50 text-emerald-600' : 'bg-coral-light text-coral-dark')}>{icon}</span>}
      </div>
      <div className="tabular mt-1.5 text-[22px] leading-none font-semibold tracking-tight text-ink">{value}</div>
      {hint && <div className="mt-1.5 truncate text-xs text-muted">{hint}</div>}
    </div>
  )
  return href ? (
    <a href={href} className="block">
      {body}
    </a>
  ) : (
    body
  )
}
