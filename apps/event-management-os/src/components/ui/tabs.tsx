import Link from 'next/link'
import { cn } from '@/lib/utils'

export function LinkTabs({ tabs, active, className }: { tabs: { key: string; label: string; href: string; count?: number }[]; active: string; className?: string }) {
  return (
    <div className={cn('scrollbar-thin -mx-1 mb-4 flex items-center gap-1 overflow-x-auto border-b border-line px-1', className)}>
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          scroll={false}
          className={cn(
            'relative -mb-px inline-flex h-9 items-center gap-1.5 border-b-2 px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors',
            active === t.key ? 'border-coral text-ink' : 'border-transparent text-muted hover:text-ink',
          )}
        >
          {t.label}
          {t.count !== undefined && <span className={cn('tabular rounded px-1.5 text-[11px]', active === t.key ? 'bg-coral-light text-coral-dark' : 'bg-lightgray text-muted')}>{t.count}</span>}
        </Link>
      ))}
    </div>
  )
}
