'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import { quickUpdate } from '@/app/actions/resources'
import { cn } from '@/lib/utils'

/** Checkbox that toggles a task between TODO and COMPLETED (optimistic). */
export function TaskToggle({ id, done, disabled }: { id: string; done: boolean; disabled?: boolean }) {
  const [checked, setChecked] = React.useOptimistic(done)
  const [, start] = React.useTransition()
  const router = useRouter()
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={checked ? 'Mark as to do' : 'Mark as completed'}
      onClick={() =>
        start(async () => {
          setChecked(!checked)
          const res = await quickUpdate('tasks', id, 'status', checked ? 'TODO' : 'COMPLETED')
          if (!res.ok) toast.error(res.message)
          else toast.success(checked ? 'Task reopened' : 'Task completed')
          router.refresh()
        })
      }
      className={cn('flex size-[18px] shrink-0 items-center justify-center rounded-md border transition-colors', checked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-line-strong bg-white hover:border-coral')}
    >
      {checked && <Check className="size-3" strokeWidth={3} />}
    </button>
  )
}
