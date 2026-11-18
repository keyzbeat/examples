import Link from 'next/link'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { hrefWith, type SP } from '@/lib/url'

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('scrollbar-thin overflow-x-auto', className)}>
      <table className="w-full min-w-[720px] border-separate border-spacing-0 text-[13px]">{children}</table>
    </div>
  )
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="[&>th]:border-b [&>th]:border-line [&>th]:bg-beige/60 [&>th:first-child]:pl-4 [&>th:last-child]:pr-4">{children}</tr>
    </thead>
  )
}

export function Th({ children, className, sortKey, path, params, currentSort }: { children?: React.ReactNode; className?: string; sortKey?: string; path?: string; params?: SP; currentSort?: string }) {
  const base = 'h-9 px-3 text-left text-[11.5px] font-medium tracking-wide text-ink/55 uppercase whitespace-nowrap'
  if (!sortKey || !path || !params) return <th className={cn(base, className)}>{children}</th>
  const [f, d] = (currentSort ?? '').split('.')
  const active = f === sortKey
  const next = active && d === 'asc' ? 'desc' : 'asc'
  return (
    <th className={cn(base, className)}>
      <Link href={hrefWith(path, params, { sort: `${sortKey}.${next}`, page: null })} className={cn('inline-flex items-center gap-1 hover:text-ink', active && 'text-ink')}>
        {children}
        {active ? d === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ChevronsUpDown className="size-3 opacity-40" />}
      </Link>
    </th>
  )
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn('group transition-colors hover:bg-offwhite [&>td]:border-b [&>td]:border-line [&>td:first-child]:pl-4 [&>td:last-child]:pr-4', className)}>{children}</tr>
}

export function Td({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('h-12 px-3 align-middle text-ink/90', className)} {...props}>
      {children}
    </td>
  )
}

export function TitleCell({ href, title, subtitle, leading }: { href: string; title: React.ReactNode; subtitle?: React.ReactNode; leading?: React.ReactNode }) {
  return (
    <Link href={href} className="flex min-w-0 items-center gap-2.5">
      {leading}
      <span className="min-w-0">
        <span className="block truncate font-medium text-ink group-hover:text-coral-dark">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted">{subtitle}</span>}
      </span>
    </Link>
  )
}

export function Pagination({ path, params, page, pageSize, total }: { path: string; params: SP; page: number; pageSize: number; total: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const link = (p: number, label: React.ReactNode, disabled: boolean) =>
    disabled ? (
      <span className="inline-flex h-7 items-center rounded-md px-2.5 text-xs text-muted/50">{label}</span>
    ) : (
      <Link href={hrefWith(path, params, { page: p === 1 ? null : p })} className="inline-flex h-7 items-center rounded-md border border-line bg-white px-2.5 text-xs text-ink hover:bg-offwhite">
        {label}
      </Link>
    )
  return (
    <div className="flex items-center justify-between px-4 py-3 text-xs text-muted">
      <span className="tabular">
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1.5">
        {link(page - 1, 'Previous', page <= 1)}
        <span className="tabular px-1">
          {page} / {pages}
        </span>
        {link(page + 1, 'Next', page >= pages)}
      </div>
    </div>
  )
}
