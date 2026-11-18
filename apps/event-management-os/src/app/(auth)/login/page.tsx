import { LoginForm } from './login-form'
import { Logo } from '@/components/shell/sidebar'

export const metadata = { title: 'Sign in' }

const DEMO = [
  { role: 'Administrator', email: 'admin@demo.events' },
  { role: 'Management', email: 'direction@demo.events' },
  { role: 'Sales', email: 'sales@demo.events' },
  { role: 'Project Manager', email: 'pm@demo.events' },
  { role: 'Team Member', email: 'team@demo.events' },
  { role: 'Client (portal)', email: 'client@demo.events' },
]

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const showDemo = process.env.NODE_ENV !== 'production' || process.env.SHOW_DEMO_ACCOUNTS === 'true'
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_520px]">
      <div className="relative hidden overflow-hidden bg-beige lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#FCE9E6_0,transparent_55%)]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo />
          <div className="max-w-md">
            <p className="text-[28px] leading-tight font-semibold tracking-tight text-ink">Every lead, event, supplier and invoice — in one calm workspace.</p>
            <p className="mt-3 text-sm text-muted">CRM, projects, events, stays, concierge, suppliers, quotes, finance and a client portal, connected end to end.</p>
          </div>
          <p className="text-xs text-muted">Event Management OS</p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted">Welcome back. Enter your credentials to continue.</p>
          <LoginForm next={next} demo={showDemo} />
          {showDemo && (
            <div className="mt-8 rounded-xl border border-line bg-offwhite p-4">
              <p className="text-xs font-semibold text-ink">Demo accounts (fictitious data)</p>
              <p className="mt-0.5 text-xs text-muted">
                Password for all: <code className="rounded bg-white px-1 text-ink">demo1234</code>
              </p>
              <ul className="mt-2.5 space-y-1">
                {DEMO.map((d) => (
                  <li key={d.email} className="flex justify-between text-xs">
                    <span className="text-muted">{d.role}</span>
                    <code className="text-ink">{d.email}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
