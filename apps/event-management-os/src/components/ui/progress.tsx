import { cn } from '@/lib/utils'

export function Progress({ value, className, showLabel = true }: { value: number; className?: string; showLabel?: boolean }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-lightgray">
        <div className={cn('h-full rounded-full transition-all', v === 100 ? 'bg-emerald-500' : 'bg-coral')} style={{ width: `${v}%` }} />
      </div>
      {showLabel && <span className="tabular w-8 text-right text-xs text-muted">{v}%</span>}
    </div>
  )
}
