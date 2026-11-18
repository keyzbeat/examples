import { cookies } from 'next/headers'
import { requirePage } from '@/lib/auth/context'
import { prisma } from '@/lib/prisma'
import { NAV, type NavGroup } from '@/lib/nav'
import { translator } from '@/lib/i18n'
import { ShellProvider } from '@/components/shell/shell-context'
import { Sidebar } from '@/components/shell/sidebar'
import { Topbar, type QuickAction } from '@/components/shell/topbar'
import { CommandPalette } from '@/components/shell/command-palette'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePage()
  const jar = await cookies()
  const locale = jar.get('emos_locale')?.value ?? ctx.user.locale ?? 'en'
  const t = translator(locale)

  const nav: NavGroup[] = NAV.map((g) => ({
    ...g,
    items: g.items
      .filter((i) => !i.permission || ctx.can(i.permission))
      .map((i) => ({ ...i, children: i.children?.filter((c) => !c.permission || ctx.can(c.permission)) })),
  })).filter((g) => g.items.length)

  const labels: Record<string, string> = {}
  const collect = (k: string) => (labels[k] = t(k))
  for (const g of NAV) {
    if (g.label) collect(g.label)
    for (const i of g.items) {
      collect(i.label)
      i.children?.forEach((c) => collect(c.label))
    }
  }
  ;['Settings', 'Collapse', 'Search…', 'Create', 'Notifications', 'Mark all as read', 'No notifications', 'Sign out', 'Profile', 'Quick actions', 'Dashboard', 'New Client', 'New Lead', 'New Project', 'New Event', 'New Quote', 'New Supplier', 'New Task'].forEach(collect)

  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: ctx.user.id }, orderBy: { createdAt: 'desc' }, take: 12 }),
    prisma.notification.count({ where: { userId: ctx.user.id, readAt: null } }),
  ])

  const qa: (QuickAction & { perm: Parameters<typeof ctx.can>[0] })[] = [
    { label: 'New Client', href: '/clients?new=1', icon: 'client', perm: 'clients' },
    { label: 'New Lead', href: '/leads?new=1', icon: 'lead', perm: 'leads' },
    { label: 'New Project', href: '/projects?new=1', icon: 'project', perm: 'projects' },
    { label: 'New Event', href: '/events?new=1', icon: 'event', perm: 'events' },
    { label: 'New Quote', href: '/quotes?new=1', icon: 'quote', perm: 'quotes' },
    { label: 'New Supplier', href: '/suppliers?new=1', icon: 'supplier', perm: 'suppliers' },
    { label: 'New Task', href: '/tasks?new=1', icon: 'task', perm: 'tasks' },
  ]
  const quickActions = qa.filter((a) => ctx.can(a.perm, 'write')).map(({ perm: _perm, ...a }) => a)
  const pages = nav.flatMap((g) => g.items.flatMap((i) => [{ label: t(i.label), href: i.href }, ...(i.children ?? []).map((c) => ({ label: `${t(i.label)} › ${t(c.label)}`, href: c.href }))]))

  return (
    <ShellProvider>
      <div className="flex min-h-screen">
        <Sidebar nav={nav} initialCollapsed={jar.get('emos_sidebar')?.value === '1'} labels={labels} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            user={{ name: ctx.user.name, email: ctx.user.email, color: ctx.user.color, role: ctx.role.name }}
            notifications={notifications.map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, type: n.type, readAt: n.readAt?.toISOString() ?? null, createdAt: n.createdAt.toISOString() }))}
            unread={unread}
            quickActions={quickActions}
            locale={locale}
            labels={labels}
          />
          <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">{children}</main>
        </div>
      </div>
      <CommandPalette pages={pages} />
    </ShellProvider>
  )
}
