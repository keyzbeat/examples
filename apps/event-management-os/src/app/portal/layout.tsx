import { LogOut } from 'lucide-react'
import { requirePortal } from '@/lib/auth/context'
import { signOut } from '@/app/actions/shell'
import { Logo } from '@/components/shell/sidebar'

export const metadata = { title: 'Client Portal' }

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePortal()
  return (
    <div className="min-h-screen bg-offwhite">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden text-[13px] text-muted sm:inline">{ctx.user.name}</span>
            <form action={signOut}>
              <button className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-muted hover:bg-lightgray hover:text-ink"><LogOut className="size-4" /> Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  )
}
