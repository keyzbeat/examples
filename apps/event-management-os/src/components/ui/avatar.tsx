import { cn, initials } from '@/lib/utils'

export function Avatar({ name, color = '#F07F73', size = 'md', className }: { name: string; color?: string; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { xs: 'size-5 text-[9px]', sm: 'size-6 text-[10px]', md: 'size-8 text-xs', lg: 'size-12 text-base' }[size]
  return (
    <span
      title={name}
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white', s, className)}
      style={{ backgroundColor: color }}
    >
      {initials(name)}
    </span>
  )
}

export function UserChip({ user }: { user?: { name: string; color?: string | null } | null }) {
  if (!user) return <span className="text-muted">Unassigned</span>
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <Avatar name={user.name} color={user.color ?? undefined} size="xs" />
      <span className="text-ink/90">{user.name}</span>
    </span>
  )
}
