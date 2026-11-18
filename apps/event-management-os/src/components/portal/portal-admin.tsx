'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { KeyRound } from 'lucide-react'
import { createPortalAccount, setPortalAccountActive } from '@/app/actions/portal'
import type { FormState } from '@/app/actions/resources'
import type { RelationOption } from '@/lib/resources/fields'
import { Button } from '@/components/ui/button'
import { FieldShell, Input } from '@/components/ui/inputs'
import { Combobox } from '@/components/resource/resource-form'

export function InvitePortalUser({ clients }: { clients: RelationOption[] }) {
  const [state, formAction, pending] = React.useActionState(createPortalAccount, { ok: false } as FormState & { password?: string })
  const router = useRouter()
  React.useEffect(() => { if (state.ok) router.refresh(); else if (state.message) toast.error(state.message) }, [state, router])
  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <FieldShell label="Client"><Combobox name="clientId" options={clients} placeholder="Select a client…" /></FieldShell>
      <FieldShell label="Login email"><Input name="email" type="email" required placeholder="client@example.com" /></FieldShell>
      <Button type="submit" variant="primary" loading={pending}><KeyRound /> Create access</Button>
      {state.ok && state.password && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 sm:col-span-3">
          {state.message} Temporary password: <code className="rounded bg-white px-1.5 py-0.5 font-semibold">{state.password}</code> — shown only once.
        </div>
      )}
    </form>
  )
}

export function TogglePortalUser({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = React.useTransition()
  const router = useRouter()
  return (
    <Button size="sm" variant={active ? 'ghost' : 'secondary'} loading={pending} onClick={() => start(async () => { const r = await setPortalAccountActive(id, !active); r.ok ? toast.success(r.message) : toast.error(r.message); router.refresh() })}>
      {active ? 'Revoke' : 'Restore'}
    </Button>
  )
}
