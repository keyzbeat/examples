'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, CheckCheck, ChevronRight, Globe, LogOut, Menu, Plus, Search, Settings, User, Target, Users, FolderKanban, PartyPopper, Receipt, Truck, ListChecks } from 'lucide-react'
import { SEGMENT_LABELS } from '@/lib/nav'
import { relativeTime } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { markAllNotificationsRead, markNotificationRead, setLocale, signOut } from '@/app/actions/shell'
import { Avatar } from '@/components/ui/avatar'
import { MenuItem, MenuLabel, MenuSeparator, Popover } from '@/components/ui/menu'
import { useShell } from './shell-context'

export interface TopbarNotification {
  id: string
  title: string
  body: string | null
  link: string | null
  type: string
  readAt: string | null
  createdAt: string
}

export interface QuickAction {
  label: string
  href: string
  icon: 'client' | 'lead' | 'project' | 'event' | 'quote' | 'supplier' | 'task'
}
const QA_ICONS = { client: Users, lead: Target, project: FolderKanban, event: PartyPopper, quote: Receipt, supplier: Truck, task: ListChecks }

export function Topbar({ user, notifications, unread, quickActions, locale, labels }: { user: { name: string; email: string; color: string; role: string }; notifications: TopbarNotification[]; unread: number; quickActions: QuickAction[]; locale: string; labels: Record<string, string> }) {
  const { setMobileOpen, setPaletteOpen } = useShell()
  const t = (k: string) => labels[k] ?? k
  const router = useRouter()
  return (
    <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur-md sm:px-6">
      <button className="-ml-1 rounded-md p-1.5 text-ink/70 hover:bg-lightgray lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
        <Menu className="size-5" />
      </button>
      <Breadcrumbs t={t} />
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <button onClick={() => setPaletteOpen(true)} className="flex h-8 items-center gap-2 rounded-lg border border-line bg-offwhite px-2.5 text-[13px] text-muted transition-colors hover:border-line-strong hover:text-ink sm:w-60">
          <Search className="size-4" />
          <span className="hidden flex-1 text-left sm:inline">{t('Search…')}</span>
          <kbd className="hidden rounded border border-line bg-white px-1.5 font-sans text-[10.5px] text-muted sm:inline">⌘K</kbd>
        </button>
        {quickActions.length > 0 && (
          <Popover
            trigger={({ toggle }) => (
              <button onClick={toggle} className="flex h-8 items-center gap-1.5 rounded-lg bg-coral px-2.5 text-[13px] font-medium text-white shadow-soft hover:bg-coral-dark">
                <Plus className="size-4" />
                <span className="hidden sm:inline">{t('Create')}</span>
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuLabel>{t('Quick actions')}</MenuLabel>
                {quickActions.map((a) => {
                  const Icon = QA_ICONS[a.icon]
                  return (
                    <MenuItem
                      key={a.href}
                      icon={<Icon />}
                      onClick={() => {
                        close()
                        router.push(a.href)
                      }}
                    >
                      {t(a.label)}
                    </MenuItem>
                  )
                })}
              </>
            )}
          </Popover>
        )}
        <Popover
          className="w-[340px] p-0"
          trigger={({ toggle }) => (
            <button onClick={toggle} className="relative flex size-8 items-center justify-center rounded-lg text-ink/70 hover:bg-lightgray" aria-label={t('Notifications')}>
              <Bell className="size-[18px]" />
              {unread > 0 && <span className="tabular absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[9.5px] font-semibold text-white ring-2 ring-white">{unread > 9 ? '9+' : unread}</span>}
            </button>
          )}
        >
          {(close) => (
            <div>
              <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
                <span className="text-sm font-semibold">{t('Notifications')}</span>
                {unread > 0 && (
                  <button onClick={() => markAllNotificationsRead()} className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
                    <CheckCheck className="size-3.5" /> {t('Mark all as read')}
                  </button>
                )}
              </div>
              <div className="scrollbar-thin max-h-[380px] overflow-y-auto p-1">
                {notifications.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted">{t('No notifications')}</p>}
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={async () => {
                      close()
                      if (!n.readAt) await markNotificationRead(n.id)
                      if (n.link) router.push(n.link)
                    }}
                    className="flex w-full gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-lightgray"
                  >
                    <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-coral')} />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-[13px] leading-snug', n.readAt ? 'text-ink/70' : 'font-medium text-ink')}>{n.title}</span>
                      {n.body && <span className="block truncate text-xs text-muted">{n.body}</span>}
                      <span className="mt-0.5 block text-[11px] text-muted">{relativeTime(n.createdAt)}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="border-t border-line p-1">
                <MenuItem href="/notifications" onClick={close}>
                  View all
                </MenuItem>
              </div>
            </div>
          )}
        </Popover>
        <Popover
          trigger={({ toggle }) => (
            <button onClick={toggle} className="hidden size-8 items-center justify-center rounded-lg text-ink/70 hover:bg-lightgray sm:flex" aria-label="Language">
              <Globe className="size-[18px]" />
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuLabel>Language</MenuLabel>
              {[
                { v: 'en', l: 'English' },
                { v: 'fr', l: 'Français' },
              ].map((o) => (
                <MenuItem
                  key={o.v}
                  hint={locale === o.v ? '✓' : undefined}
                  onClick={async () => {
                    close()
                    await setLocale(o.v)
                    router.refresh()
                  }}
                >
                  {o.l}
                </MenuItem>
              ))}
            </>
          )}
        </Popover>
        <Popover
          trigger={({ toggle }) => (
            <button onClick={toggle} className="ml-0.5 flex items-center rounded-full" aria-label="Account">
              <Avatar name={user.name} color={user.color} size="md" />
            </button>
          )}
        >
          {(close) => (
            <>
              <div className="px-2.5 py-2">
                <div className="text-[13px] font-medium text-ink">{user.name}</div>
                <div className="text-xs text-muted">{user.email}</div>
                <div className="mt-1.5 inline-flex rounded bg-coral-light px-1.5 py-0.5 text-[10.5px] font-medium text-coral-dark">{user.role}</div>
              </div>
              <MenuSeparator />
              <MenuItem icon={<User />} href="/settings?tab=profile" onClick={close}>
                {t('Profile')}
              </MenuItem>
              <MenuItem icon={<Settings />} href="/settings" onClick={close}>
                {t('Settings')}
              </MenuItem>
              <MenuSeparator />
              <MenuItem icon={<LogOut />} onClick={() => signOut()}>
                {t('Sign out')}
              </MenuItem>
            </>
          )}
        </Popover>
      </div>
    </header>
  )
}

function Breadcrumbs({ t }: { t: (k: string) => string }) {
  const pathname = usePathname()
  const { crumb } = useShell()
  const segs = pathname.split('/').filter(Boolean)
  const items: { label: string; href: string }[] = [{ label: t('Dashboard'), href: '/' }]
  let acc = ''
  segs.forEach((s, i) => {
    acc += `/${s}`
    const known = SEGMENT_LABELS[s]
    if (known) items.push({ label: t(known), href: acc })
    else if (i === segs.length - 1 || segs[i + 1] === 'edit') items.push({ label: crumb ?? 'Details', href: acc })
    else if (s !== 'edit') items.push({ label: crumb ?? 'Details', href: acc })
  })
  if (segs.length === 0) items.length = 1
  return (
    <nav className="flex min-w-0 items-center gap-1 text-[13px]" aria-label="Breadcrumb">
      {items.map((it, i) => (
        <React.Fragment key={it.href + i}>
          {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted/60" />}
          {i === items.length - 1 ? (
            <span className="truncate font-medium text-ink">{it.label}</span>
          ) : (
            <Link href={it.href} className={cn('truncate text-muted hover:text-ink', i === 0 && items.length > 2 && 'hidden sm:inline')}>
              {it.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
