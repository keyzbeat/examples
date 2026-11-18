'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, X, Upload } from 'lucide-react'
import { clientApproveQuote, clientUpload, decideApproval, postClientMessage } from '@/app/actions/portal'
import type { FormState } from '@/app/actions/resources'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/inputs'

export function ApprovalDecision({ id }: { id: string }) {
  const [comment, setComment] = React.useState('')
  const [pending, start] = React.useTransition()
  const router = useRouter()
  const decide = (d: 'APPROVED' | 'REJECTED') =>
    start(async () => {
      const r = await decideApproval(id, d, comment)
      r.ok ? toast.success(r.message) : toast.error(r.message)
      router.refresh()
    })
  return (
    <div className="mt-3 space-y-2">
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment (optional)" rows={2} />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" disabled={pending} onClick={() => decide('REJECTED')} className="justify-center"><X /> Request changes</Button>
        <Button variant="primary" disabled={pending} onClick={() => decide('APPROVED')} className="justify-center"><Check /> Approve</Button>
      </div>
    </div>
  )
}

export function ApproveQuoteButton({ id }: { id: string }) {
  const [pending, start] = React.useTransition()
  const router = useRouter()
  return (
    <Button variant="primary" loading={pending} onClick={() => window.confirm('Approve this proposal?') && start(async () => { const r = await clientApproveQuote(id); r.ok ? toast.success(r.message) : toast.error(r.message); router.refresh() })}>
      <Check /> Approve proposal
    </Button>
  )
}

export function PortalMessageForm({ projectId }: { projectId: string }) {
  const action = React.useMemo(() => postClientMessage.bind(null, projectId), [projectId])
  const [state, formAction, pending] = React.useActionState(action, { ok: false } as FormState)
  const ref = React.useRef<HTMLFormElement>(null)
  const router = useRouter()
  React.useEffect(() => { if (state.ok) { ref.current?.reset(); router.refresh() } else if (state.message) toast.error(state.message) }, [state, router])
  return (
    <form ref={ref} action={formAction} className="flex gap-2 border-t border-line p-3">
      <Input name="body" placeholder="Message your planner…" autoComplete="off" />
      <Button type="submit" variant="primary" loading={pending}>Send</Button>
    </form>
  )
}

export function PortalUpload({ projectId }: { projectId: string }) {
  const action = React.useMemo(() => clientUpload.bind(null, projectId), [projectId])
  const [state, formAction, pending] = React.useActionState(action, { ok: false } as FormState)
  const ref = React.useRef<HTMLFormElement>(null)
  const router = useRouter()
  React.useEffect(() => { if (state.ok) { toast.success(state.message); ref.current?.reset(); router.refresh() } else if (state.message) toast.error(state.message) }, [state, router])
  return (
    <form ref={ref} action={formAction} className="flex flex-col gap-2 border-t border-line p-3 sm:flex-row">
      <input name="file" type="file" required className="flex-1 text-sm file:mr-3 file:rounded-lg file:border file:border-line file:bg-white file:px-3 file:py-1.5" />
      <Button type="submit" variant="secondary" loading={pending}><Upload /> Share a file</Button>
    </form>
  )
}
