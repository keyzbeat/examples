'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Mail, MessageCircle, NotebookPen, Phone, Users } from 'lucide-react'
import { addInteraction } from '@/app/actions/crm'
import type { FormState } from '@/app/actions/resources'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/inputs'

const TYPES = [
  { v: 'NOTE', l: 'Note', I: NotebookPen },
  { v: 'CALL', l: 'Call', I: Phone },
  { v: 'EMAIL', l: 'Email', I: Mail },
  { v: 'WHATSAPP', l: 'WhatsApp', I: MessageCircle },
  { v: 'MEETING', l: 'Meeting', I: Users },
]

export function InteractionComposer({ target, id }: { target: 'lead' | 'client' | 'project'; id: string }) {
  const [type, setType] = React.useState('NOTE')
  const action = React.useMemo(() => addInteraction.bind(null, target, id), [target, id])
  const [state, formAction, pending] = React.useActionState(action, { ok: false } as FormState)
  const formRef = React.useRef<HTMLFormElement>(null)
  const router = useRouter()
  React.useEffect(() => {
    if (state.ok) {
      toast.success(state.message)
      formRef.current?.reset()
      router.refresh()
    } else if (state.message) toast.error(state.message)
  }, [state, router])
  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="type" value={type} />
      <div className="flex flex-wrap gap-1">
        {TYPES.map(({ v, l, I }) => (
          <button key={v} type="button" onClick={() => setType(v)} className={cn('inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium', type === v ? 'bg-coral-light text-coral-dark' : 'text-muted hover:bg-lightgray')}>
            <I className="size-3.5" />
            {l}
          </button>
        ))}
      </div>
      <Textarea name="summary" placeholder="What happened? Key points, next steps…" rows={2} aria-invalid={!!state.errors?.summary || undefined} />
      {state.errors?.summary && <p className="text-xs text-red-600">{state.errors.summary}</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" variant="primary" loading={pending}>
          Add to history
        </Button>
      </div>
    </form>
  )
}
