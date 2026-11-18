'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { addSubtask, addTaskComment } from '@/app/actions/tasks'
import type { FormState } from '@/app/actions/resources'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/inputs'

function useForm(action: (prev: FormState, fd: FormData) => Promise<FormState>) {
  const [state, formAction, pending] = React.useActionState(action, { ok: false } as FormState)
  const ref = React.useRef<HTMLFormElement>(null)
  const router = useRouter()
  React.useEffect(() => {
    if (state.ok) { ref.current?.reset(); router.refresh() } else if (state.message) toast.error(state.message)
  }, [state, router])
  return { ref, formAction, pending }
}

export function SubtaskForm({ parentId }: { parentId: string }) {
  const { ref, formAction, pending } = useForm(React.useMemo(() => addSubtask.bind(null, parentId), [parentId]))
  return (
    <form ref={ref} action={formAction} className="flex gap-2 border-t border-line p-3">
      <Input name="title" placeholder="Add a subtask…" />
      <Button type="submit" variant="secondary" loading={pending}>Add</Button>
    </form>
  )
}

export function CommentForm({ taskId }: { taskId: string }) {
  const { ref, formAction, pending } = useForm(React.useMemo(() => addTaskComment.bind(null, taskId), [taskId]))
  return (
    <form ref={ref} action={formAction} className="space-y-2 border-t border-line p-3">
      <Textarea name="body" placeholder="Write a comment…" rows={2} />
      <div className="flex justify-end"><Button type="submit" size="sm" variant="primary" loading={pending}>Comment</Button></div>
    </form>
  )
}
