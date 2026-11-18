'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/** Lightweight popover menu (click outside / Escape to close). */
export function Popover({ trigger, children, align = 'end', className, open: controlled, onOpenChange }: { trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode; children: React.ReactNode | ((close: () => void) => React.ReactNode); align?: 'start' | 'end'; className?: string; open?: boolean; onOpenChange?: (o: boolean) => void }) {
  const [inner, setInner] = React.useState(false)
  const open = controlled ?? inner
  const setOpen = React.useCallback((o: boolean) => (onOpenChange ? onOpenChange(o) : setInner(o)), [onOpenChange])
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen])
  const close = () => setOpen(false)
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen(!open) })}
      {open && (
        <div className={cn('animate-pop absolute top-full z-40 mt-1.5 min-w-48 rounded-xl border border-line bg-white p-1 shadow-pop', align === 'end' ? 'right-0' : 'left-0', className)}>
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  )
}

export function MenuItem({ icon, children, onClick, href, danger, className, hint }: { icon?: React.ReactNode; children: React.ReactNode; onClick?: () => void; href?: string; danger?: boolean; className?: string; hint?: React.ReactNode }) {
  const cls = cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors [&_svg]:size-4 [&_svg]:text-muted', danger ? 'text-red-600 hover:bg-red-50 [&_svg]:text-red-500' : 'text-ink hover:bg-lightgray', className)
  const inner = (
    <>
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </>
  )
  if (href)
    return (
      <a href={href} className={cls} onClick={onClick}>
        {inner}
      </a>
    )
  return (
    <button type="button" className={cls} onClick={onClick}>
      {inner}
    </button>
  )
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium tracking-wide text-muted uppercase">{children}</div>
}
export function MenuSeparator() {
  return <div className="my-1 h-px bg-line" />
}
