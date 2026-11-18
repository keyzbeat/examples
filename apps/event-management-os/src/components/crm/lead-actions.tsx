'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, FolderPlus, UserPlus } from 'lucide-react'
import { convertLeadToClient, convertLeadToProject } from '@/app/actions/crm'
import { quickUpdate } from '@/app/actions/resources'
import { LEAD_STAGE } from '@/lib/options'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function LeadConvertButtons({ id, hasClient, hasProject }: { id: string; hasClient: boolean; hasProject: boolean }) {
  const [pending, start] = React.useTransition()
  const router = useRouter()
  const run = (fn: () => Promise<{ ok: boolean; message?: string; href?: string }>) =>
    start(async () => {
      const res = await fn()
      if (res.ok) {
        toast.success(res.message)
        if (res.href) router.push(res.href)
      } else toast.error(res.message)
    })
  return (
    <>
      {!hasClient && (
        <Button variant="secondary" disabled={pending} onClick={() => run(() => convertLeadToClient(id))}>
          <UserPlus /> Convert to client
        </Button>
      )}
      {!hasProject && (
        <Button variant="primary" disabled={pending} onClick={() => run(() => convertLeadToProject(id))}>
          <FolderPlus /> Won → create project
        </Button>
      )}
    </>
  )
}

export function StageStepper({ id, stage, canWrite }: { id: string; stage: string; canWrite: boolean }) {
  const [current, setCurrent] = React.useState(stage)
  const [pending, start] = React.useTransition()
  const router = useRouter()
  React.useEffect(() => setCurrent(stage), [stage])
  const steps = LEAD_STAGE.filter((s) => !['LOST', 'ARCHIVED'].includes(s.value))
  const idx = steps.findIndex((s) => s.value === current)
  const set = (v: string) =>
    start(async () => {
      const prev = current
      setCurrent(v)
      const res = await quickUpdate('leads', id, 'stage', v)
      if (!res.ok) {
        setCurrent(prev)
        toast.error(res.message)
      } else {
        toast.success(v === 'WON' ? 'Deal won — client & project created' : 'Stage updated')
        router.refresh()
      }
    })
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <div className="scrollbar-thin flex flex-1 overflow-x-auto rounded-xl border border-line bg-white p-1">
        {steps.map((s, i) => {
          const done = idx >= 0 && i < idx
          const active = s.value === current
          return (
            <button key={s.value} disabled={!canWrite || pending} onClick={() => set(s.value)} className={cn('flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-medium whitespace-nowrap transition-colors', active ? (s.value === 'WON' ? 'bg-emerald-500 text-white' : 'bg-coral text-white') : done ? 'text-coral-dark hover:bg-coral-light/60' : 'text-muted hover:bg-lightgray')}>
              {done && <Check className="size-3" />}
              {s.label}
            </button>
          )
        })}
      </div>
      <div className="flex gap-1">
        {['LOST', 'ARCHIVED'].map((v) => (
          <button key={v} disabled={!canWrite || pending} onClick={() => set(v)} className={cn('h-8 rounded-lg border px-2.5 text-xs font-medium', current === v ? 'border-red-200 bg-red-50 text-red-700' : 'border-line bg-white text-muted hover:text-ink')}>
            {v === 'LOST' ? 'Lost' : 'Archive'}
          </button>
        ))}
      </div>
    </div>
  )
}
