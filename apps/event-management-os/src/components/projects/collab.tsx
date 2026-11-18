'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import { addMember, assignSupplier, postStaffMessage, removeMember, removeProjectSupplier, requestApproval, setProjectSupplierStatus } from '@/app/actions/projects'
import type { FormState } from '@/app/actions/resources'
import type { RelationOption } from '@/lib/resources/fields'
import { APPROVAL_CATEGORY } from '@/lib/options'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/inputs'
import { Avatar } from '@/components/ui/avatar'
import { Combobox } from '@/components/resource/resource-form'

function useRun() {
  const router = useRouter()
  const [pending, start] = React.useTransition()
  const run = (p: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const r = await p()
      if (r.ok) toast.success(r.message)
      else toast.error(r.message)
      router.refresh()
    })
  return { pending, run }
}

export function SupplierAssign({ projectId, options }: { projectId: string; options: RelationOption[] }) {
  const [id, setId] = React.useState('')
  const [role, setRole] = React.useState('')
  const { pending, run } = useRun()
  return (
    <div className="flex flex-col gap-2 border-t border-line p-3 sm:flex-row">
      <div className="flex-1">
        <Combobox key={pending ? 'p' : 'r'} name="supplierId" options={options} placeholder="Assign a supplier… (suspended suppliers are locked)" onChange={setId} />
      </div>
      <Input placeholder="Role (e.g. Catering)" value={role} onChange={(e) => setRole(e.target.value)} className="sm:w-48" />
      <Button variant="primary" disabled={!id} loading={pending} onClick={() => run(() => assignSupplier(projectId, id, role || undefined))}>
        <Plus /> Assign
      </Button>
    </div>
  )
}

export function SupplierStatusSelect({ projectId, supplierId, status, canWrite }: { projectId: string; supplierId: string; status: string; canWrite: boolean }) {
  const { pending, run } = useRun()
  return (
    <div className="flex items-center gap-1">
      <Select disabled={!canWrite || pending} defaultValue={status} onChange={(e) => run(() => setProjectSupplierStatus(projectId, supplierId, e.target.value))} className="h-8 w-36 py-0 text-xs">
        {['PROPOSED', 'BOOKED', 'CONFIRMED', 'CANCELLED'].map((s) => (
          <option key={s} value={s}>
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </option>
        ))}
      </Select>
      {canWrite && (
        <button onClick={() => run(() => removeProjectSupplier(projectId, supplierId))} className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Remove">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

export function TeamManager({ target, targetId, members, users, canWrite }: { target: 'project' | 'event'; targetId: string; members: { userId: string; name: string; color: string; role: string | null; title: string | null }[]; users: RelationOption[]; canWrite: boolean }) {
  const [id, setId] = React.useState('')
  const [role, setRole] = React.useState('')
  const { pending, run } = useRun()
  return (
    <div>
      <ul className="divide-y divide-line">
        {members.map((m) => (
          <li key={m.userId} className="flex items-center gap-3 px-4 py-2.5">
            <Avatar name={m.name} color={m.color} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium">{m.name}</div>
              <div className="text-xs text-muted">{[m.role, m.title].filter(Boolean).join(' · ')}</div>
            </div>
            {canWrite && (
              <button onClick={() => run(() => removeMember(target, targetId, m.userId))} className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Remove">
                <X className="size-3.5" />
              </button>
            )}
          </li>
        ))}
        {members.length === 0 && <li className="px-4 py-5 text-center text-sm text-muted">No team members yet.</li>}
      </ul>
      {canWrite && (
        <div className="flex flex-col gap-2 border-t border-line p-3">
          <Combobox key={members.length} name="userId" options={users.filter((u) => !members.some((m) => m.userId === u.value))} placeholder="Add a team member…" onChange={setId} />
          <div className="flex gap-2">
            <Input placeholder="Role on this project" value={role} onChange={(e) => setRole(e.target.value)} />
            <Button variant="secondary" disabled={!id} loading={pending} onClick={() => run(() => addMember(target, targetId, id, role || undefined))}>
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function ApprovalRequestForm({ projectId }: { projectId: string }) {
  const action = React.useMemo(() => requestApproval.bind(null, projectId), [projectId])
  const [state, formAction, pending] = React.useActionState(action, { ok: false } as FormState)
  const ref = React.useRef<HTMLFormElement>(null)
  const router = useRouter()
  React.useEffect(() => {
    if (state.ok) {
      toast.success(state.message)
      ref.current?.reset()
      router.refresh()
    } else if (state.message) toast.error(state.message)
  }, [state, router])
  return (
    <form ref={ref} action={formAction} className="space-y-2 border-t border-line p-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input name="title" placeholder="What should the client approve?" aria-invalid={!!state.errors?.title || undefined} />
        <Select name="category" defaultValue="GENERAL" className="sm:w-40">
          {APPROVAL_CATEGORY.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>
      <Textarea name="description" placeholder="Details shown to the client (optional)" rows={2} />
      <div className="flex justify-end">
        <Button type="submit" size="sm" variant="primary" loading={pending}>
          Request approval
        </Button>
      </div>
    </form>
  )
}

export function StaffMessageForm({ projectId }: { projectId: string }) {
  const action = React.useMemo(() => postStaffMessage.bind(null, projectId), [projectId])
  const [state, formAction, pending] = React.useActionState(action, { ok: false } as FormState)
  const ref = React.useRef<HTMLFormElement>(null)
  const router = useRouter()
  React.useEffect(() => {
    if (state.ok) {
      ref.current?.reset()
      router.refresh()
    } else if (state.message) toast.error(state.message)
  }, [state, router])
  return (
    <form ref={ref} action={formAction} className="flex gap-2 border-t border-line p-3">
      <Input name="body" placeholder="Write to the client…" autoComplete="off" />
      <Button type="submit" variant="primary" loading={pending}>
        Send
      </Button>
    </form>
  )
}
