'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { KeyRound, Pencil, Plus, Trash2, Zap } from 'lucide-react'
import { changePassword, createRole, purgeDemoData, resetPassword, runAutomationsNow, saveOrganization, saveProfile, saveRolePermissions, saveUser } from '@/app/actions/admin'
import type { FormState } from '@/app/actions/resources'
import { ACTIONS, RESOURCES } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FieldShell, Input, Select } from '@/components/ui/inputs'
import { Modal, Sheet } from '@/components/ui/sheet'

type S = FormState & { password?: string }
function useToastState(action: (p: S, f: FormData) => Promise<S>, onOk?: (s: S) => void) {
  const [state, formAction, pending] = React.useActionState(action, { ok: false } as S)
  const router = useRouter()
  const last = React.useRef(state)
  React.useEffect(() => {
    if (state === last.current) return
    last.current = state
    if (state.ok) { if (!state.password) toast.success(state.message); onOk?.(state); router.refresh() } else if (state.message) toast.error(state.message)
  }, [state, router, onOk])
  return { state, formAction, pending }
}

export function UserSheet({ user, roles }: { user?: { id: string; name: string; email: string; title: string | null; roleId: string; active: boolean }; roles: { id: string; name: string }[] }) {
  const [open, setOpen] = React.useState(false)
  const action = React.useMemo(() => saveUser.bind(null, user?.id ?? null), [user?.id])
  const { state, formAction, pending } = useToastState(action, (s) => !s.password && setOpen(false))
  return (
    <>
      {user ? <Button size="icon-sm" variant="ghost" onClick={() => setOpen(true)} aria-label="Edit user"><Pencil /></Button> : <Button variant="primary" onClick={() => setOpen(true)}><Plus /> New user</Button>}
      <Sheet open={open} onClose={() => setOpen(false)} title={user ? 'Edit user' : 'New user'} width="max-w-md">
        <form action={formAction} className="space-y-3.5">
          <FieldShell label="Full name" required><Input name="name" defaultValue={user?.name} required /></FieldShell>
          <FieldShell label="Email" required><Input name="email" type="email" defaultValue={user?.email} required /></FieldShell>
          <FieldShell label="Job title"><Input name="title" defaultValue={user?.title ?? ''} /></FieldShell>
          <FieldShell label="Role" required><Select name="roleId" defaultValue={user?.roleId ?? roles[0]?.id}>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></FieldShell>
          {user && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={user.active} className="size-4 accent-[#F07F73]" /> Active (can sign in)</label>}
          {state.password && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">User created. Temporary password: <code className="font-semibold">{state.password}</code> (shown once)</div>}
          <div className="flex justify-end gap-2 border-t border-line pt-4"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Close</Button><Button type="submit" variant="primary" loading={pending}>{user ? 'Save' : 'Create user'}</Button></div>
        </form>
      </Sheet>
    </>
  )
}

export function ResetPasswordButton({ id }: { id: string }) {
  const [pw, setPw] = React.useState<string | null>(null)
  const [pending, start] = React.useTransition()
  return (
    <>
      <Button size="icon-sm" variant="ghost" loading={pending} aria-label="Reset password" onClick={() => window.confirm('Generate a new temporary password?') && start(async () => { const r = await resetPassword(id); if (r.ok) setPw(r.password ?? null); else toast.error(r.message) })}><KeyRound /></Button>
      <Modal open={!!pw} onClose={() => setPw(null)} title="Temporary password">
        <div className="px-5 py-4 text-sm">Share it securely — it is shown only once:<p className="mt-2 rounded-lg bg-offwhite px-3 py-2 font-mono text-base">{pw}</p></div>
      </Modal>
    </>
  )
}

export function PermissionMatrix({ role }: { role: { id: string; key: string; name: string; permissions: string[] } }) {
  const locked = role.key === 'admin' || role.key === 'client'
  const [perms, setPerms] = React.useState(new Set(role.permissions))
  const [pending, start] = React.useTransition()
  const router = useRouter()
  const has = (r: string, a: string) => perms.has('*') || perms.has(`${r}:*`) || perms.has(`${r}:${a}`) || (a === 'read' && perms.has(`${r}:write`))
  const toggle = (r: string, a: string) => {
    const n = new Set(perms)
    if (n.has(`${r}:*`)) { n.delete(`${r}:*`); ACTIONS.forEach((x) => n.add(`${r}:${x}`)) }
    if (n.has(`${r}:${a}`)) n.delete(`${r}:${a}`)
    else n.add(`${r}:${a}`)
    if (a === 'read' && !n.has(`${r}:read`)) { n.delete(`${r}:write`); n.delete(`${r}:delete`) }
    setPerms(n)
  }
  const scoped = perms.has('scope:assigned')
  return (
    <div>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[520px] text-[13px]">
          <thead><tr className="text-left text-[11px] tracking-wide text-ink/50 uppercase [&>th]:border-b [&>th]:border-line [&>th]:bg-beige/50 [&>th]:px-3 [&>th]:py-2 [&>th]:font-medium"><th>Module</th>{ACTIONS.map((a) => <th key={a} className="text-center">{a}</th>)}</tr></thead>
          <tbody>
            {RESOURCES.map((r) => (
              <tr key={r} className="border-b border-line">
                <td className="px-3 py-1.5 capitalize">{r}</td>
                {ACTIONS.map((a) => (
                  <td key={a} className="text-center">
                    <input type="checkbox" disabled={locked} checked={has(r, a)} onChange={() => toggle(r, a)} className="size-4 accent-[#F07F73]" aria-label={`${r} ${a}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
        <label className={cn('flex items-center gap-2 text-[13px]', locked && 'opacity-50')}>
          <input type="checkbox" disabled={locked} checked={scoped} onChange={() => { const n = new Set(perms); scoped ? n.delete('scope:assigned') : n.add('scope:assigned'); setPerms(n) }} className="size-4 accent-[#F07F73]" />
          Restrict to assigned projects, events and tasks only
        </label>
        {locked ? <span className="text-xs text-muted">This system role is locked.</span> : <Button variant="primary" size="sm" loading={pending} onClick={() => start(async () => { const r = await saveRolePermissions(role.id, [...perms]); r.ok ? toast.success(r.message) : toast.error(r.message); router.refresh() })}>Save permissions</Button>}
      </div>
    </div>
  )
}

export function NewRoleForm() {
  const { formAction, pending } = useToastState(createRole)
  return (
    <form action={formAction} className="flex gap-2">
      <Input name="name" placeholder="New role name (e.g. Finance)" className="w-64" />
      <Button type="submit" variant="secondary" loading={pending}><Plus /> Add role</Button>
    </form>
  )
}

export function PurgeDemo() {
  const [pending, start] = React.useTransition()
  const router = useRouter()
  return <Button variant="danger" loading={pending} onClick={() => window.confirm('Permanently delete all fictitious demo records? This cannot be undone.') && start(async () => { const r = await purgeDemoData(); r.ok ? toast.success(r.message) : toast.error(r.message); router.refresh() })}><Trash2 /> Purge demo data</Button>
}

export function RunAutomations() {
  const [pending, start] = React.useTransition()
  const router = useRouter()
  return <Button variant="secondary" loading={pending} onClick={() => start(async () => { const r = await runAutomationsNow(); r.ok ? toast.success(r.message) : toast.error(r.message); router.refresh() })}><Zap /> Run scheduled automations now</Button>
}

export function OrgForm({ org }: { org: { name: string; currency: string; taxRate: number } }) {
  const { formAction, pending } = useToastState(saveOrganization)
  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
      <FieldShell label="Company name" className="sm:col-span-3"><Input name="name" defaultValue={org.name} /></FieldShell>
      <FieldShell label="Currency"><Select name="currency" defaultValue={org.currency}>{['EUR', 'USD', 'GBP', 'CHF', 'AED', 'MAD'].map((c) => <option key={c}>{c}</option>)}</Select></FieldShell>
      <FieldShell label="Default tax rate (%)"><Input name="taxRate" type="number" step="0.1" defaultValue={org.taxRate} /></FieldShell>
      <div className="flex items-end justify-end"><Button type="submit" variant="primary" loading={pending}>Save</Button></div>
    </form>
  )
}

export function ProfileForm({ user }: { user: { name: string; title: string | null; locale: string } }) {
  const { formAction, pending } = useToastState(saveProfile)
  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
      <FieldShell label="Name"><Input name="name" defaultValue={user.name} /></FieldShell>
      <FieldShell label="Job title"><Input name="title" defaultValue={user.title ?? ''} /></FieldShell>
      <FieldShell label="Language"><Select name="locale" defaultValue={user.locale}><option value="en">English</option><option value="fr">Français</option></Select></FieldShell>
      <div className="flex justify-end sm:col-span-3"><Button type="submit" variant="primary" loading={pending}>Save profile</Button></div>
    </form>
  )
}

export function PasswordForm() {
  const ref = React.useRef<HTMLFormElement>(null)
  const { formAction, pending } = useToastState(changePassword, () => ref.current?.reset())
  return (
    <form ref={ref} action={formAction} className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
      <FieldShell label="Current password"><Input name="current" type="password" autoComplete="current-password" /></FieldShell>
      <FieldShell label="New password" help="10+ characters"><Input name="next" type="password" autoComplete="new-password" /></FieldShell>
      <FieldShell label="Confirm"><Input name="confirm" type="password" autoComplete="new-password" /></FieldShell>
      <div className="flex justify-end sm:col-span-3"><Button type="submit" variant="secondary" loading={pending}>Change password</Button></div>
    </form>
  )
}
