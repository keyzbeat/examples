'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Settings, Sparkles, X } from 'lucide-react'
import type { NavGroup } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { setSidebarCollapsed } from '@/app/actions/shell'
import { NAV_ICONS } from './icons'
import { useShell } from './shell-context'

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="relative flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-coral text-white shadow-soft">
        <Sparkles className="size-4" strokeWidth={2.25} />
      </span>
      {!collapsed && (
        <span className="leading-tight">
          <span className="block text-[14px] font-semibold tracking-tight text-ink">Event Management</span>
          <span className="block text-[11px] font-medium text-muted">Operating System</span>
        </span>
      )}
    </Link>
  )
}

export function Sidebar({ nav, initialCollapsed, labels }: { nav: NavGroup[]; initialCollapsed: boolean; labels: Record<string, string> }) {
  const [collapsed, setCollapsed] = React.useState(initialCollapsed)
  const { mobileOpen, setMobileOpen } = useShell()
  const pathname = usePathname()
  React.useEffect(() => setMobileOpen(false), [pathname, setMobileOpen])
  const t = (k: string) => labels[k] ?? k
  const toggle = () => {
    setCollapsed((c) => {
      void setSidebarCollapsed(!c)
      return !c
    })
  }
  return (
    <>
      {mobileOpen && <div className="animate-fade-in fixed inset-0 z-40 bg-ink/20 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-white transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          collapsed ? 'lg:w-[68px]' : 'lg:w-[248px]',
          'w-[272px]',
          mobileOpen ? 'translate-x-0 shadow-pop' : '-translate-x-full',
        )}
      >
        <div className={cn('flex h-14 shrink-0 items-center justify-between border-b border-line', collapsed ? 'lg:justify-center lg:px-0' : '', 'px-4')}>
          <span className={cn(collapsed && 'lg:hidden')}>
            <Logo />
          </span>
          {collapsed && (
            <span className="hidden lg:block">
              <Logo collapsed />
            </span>
          )}
          <button className="rounded-md p-1 text-muted hover:bg-lightgray lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X className="size-4" />
          </button>
        </div>
        <nav className="scrollbar-thin flex-1 overflow-y-auto px-2.5 py-3">
          {nav.map((group, gi) => (
            <div key={gi} className={cn(gi > 0 && 'mt-4')}>
              {group.label && (
                <div className={cn('mb-1 px-2.5 text-[10.5px] font-semibold tracking-[0.08em] text-muted/80 uppercase', collapsed && 'lg:hidden')}>{t(group.label)}</div>
              )}
              {collapsed && gi > 0 && <div className="mx-3 mb-2 hidden h-px bg-line lg:block" />}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} collapsed={collapsed} t={t} />
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="shrink-0 border-t border-line p-2.5">
          <Link href="/settings" className={cn('flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-ink/75 hover:bg-lightgray hover:text-ink', pathname.startsWith('/settings') && 'bg-coral-light/60 text-coral-dark', collapsed && 'lg:justify-center lg:px-0')} title={t('Settings')}>
            <Settings className="size-[17px]" />
            <span className={cn(collapsed && 'lg:hidden')}>{t('Settings')}</span>
          </Link>
          <button onClick={toggle} className={cn('mt-0.5 hidden h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-muted hover:bg-lightgray hover:text-ink lg:flex', collapsed && 'lg:justify-center lg:px-0')} title={t('Collapse')}>
            {collapsed ? <PanelLeftOpen className="size-[17px]" /> : <PanelLeftClose className="size-[17px]" />}
            <span className={cn(collapsed && 'lg:hidden')}>{t('Collapse')}</span>
          </button>
        </div>
      </aside>
    </>
  )
}

function isActive(pathname: string, href: string) {
  const path = href.split('?')[0]!
  if (path === '/') return pathname === '/'
  return pathname === path || pathname.startsWith(path + '/')
}

function NavLink({ item, collapsed, t }: { item: NavGroup['items'][number]; collapsed: boolean; t: (k: string) => string }) {
  const pathname = usePathname()
  const search = useSearchParams()
  const Icon = NAV_ICONS[item.icon]
  const active = isActive(pathname, item.href) || !!item.children?.some((c) => isActive(pathname, c.href))
  const [open, setOpen] = React.useState(active)
  React.useEffect(() => {
    if (active) setOpen(true)
  }, [active])
  const hasChildren = !!item.children?.length && !collapsed
  return (
    <li>
      <div className="relative flex items-center">
        <Link
          href={item.href}
          title={t(item.label)}
          className={cn(
            'relative flex h-9 flex-1 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors',
            active ? 'bg-coral-light/60 text-coral-dark' : 'text-ink/75 hover:bg-lightgray hover:text-ink',
            collapsed && 'lg:justify-center lg:px-0',
          )}
        >
          {active && <span className="absolute top-2 bottom-2 -left-2.5 w-[3px] rounded-r-full bg-coral" />}
          <Icon className={cn('size-[17px] shrink-0', active ? 'text-coral-dark' : 'text-ink/55')} />
          <span className={cn('truncate', collapsed && 'lg:hidden')}>{t(item.label)}</span>
        </Link>
        {hasChildren && (
          <button onClick={() => setOpen((o) => !o)} className="absolute right-1 rounded-md p-1 text-muted hover:bg-white" aria-label="Toggle submenu">
            <ChevronDown className={cn('size-3.5 transition-transform', !open && '-rotate-90')} />
          </button>
        )}
      </div>
      {hasChildren && open && (
        <ul className="mt-0.5 mb-1 ml-[21px] space-y-0.5 border-l border-line pl-2.5">
          {item.children!.map((c) => {
            const [cp, cq] = c.href.split('?')
            const qActive = cq ? search.toString().includes(cq) : !search.get('view')
            const childActive = pathname === cp && qActive
            return (
              <li key={c.href}>
                <Link href={c.href} className={cn('flex h-7 items-center rounded-md px-2 text-[12.5px] transition-colors', childActive ? 'font-medium text-ink' : 'text-muted hover:text-ink')}>
                  {t(c.label)}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}
