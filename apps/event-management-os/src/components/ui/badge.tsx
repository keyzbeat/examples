import { cn } from '@/lib/utils'
import { findOpt, type Opt, type Tone } from '@/lib/options'

export const TONES: Record<Tone, string> = {
  coral: 'bg-coral-light text-coral-dark ring-coral/15',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/10',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/10',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/10',
  gray: 'bg-lightgray text-muted ring-black/5',
  red: 'bg-red-50 text-red-700 ring-red-600/10',
  teal: 'bg-teal-50 text-teal-700 ring-teal-600/10',
}
export const DOTS: Record<Tone, string> = {
  coral: 'bg-coral',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  blue: 'bg-sky-500',
  violet: 'bg-violet-500',
  gray: 'bg-neutral-400',
  red: 'bg-red-500',
  teal: 'bg-teal-500',
}

export function Badge({ tone = 'gray', dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex h-[22px] items-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset', TONES[tone], className)}>
      {dot && <span className={cn('size-1.5 rounded-full', DOTS[tone])} />}
      {children}
    </span>
  )
}

export function OptBadge({ options, value, dot = true }: { options: Opt[]; value?: string | null; dot?: boolean }) {
  if (!value) return <span className="text-muted">—</span>
  const opt = findOpt(options, value)
  return (
    <Badge tone={opt?.tone ?? 'gray'} dot={dot}>
      {opt?.label ?? value}
    </Badge>
  )
}
