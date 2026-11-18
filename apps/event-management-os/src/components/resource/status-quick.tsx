'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { quickUpdate } from '@/app/actions/resources'
import type { Opt } from '@/lib/options'
import { cn } from '@/lib/utils'
import { DOTS } from '@/components/ui/badge'

/** Segmented control to change a record's status in one click. */
export function StatusQuick({ resource, id, field, value, options, canWrite }: { resource: string; id: string; field: string; value: string; options: Opt[]; canWrite: boolean }) {
  const [current, setCurrent] = React.useState(value)
  const [pending, start] = React.useTransition()
  const router = useRouter()
  React.useEffect(() => setCurrent(value), [value])
  return (
    <div className="scrollbar-thin flex overflow-x-auto rounded-xl border border-line bg-white p-1">
      {options.map((o) => (
        <button
          key={o.value}
          disabled={!canWrite || pending}
          onClick={() =>
            start(async () => {
              const prev = current
              setCurrent(o.value)
              const r = await quickUpdate(resource, id, field, o.value)
              if (!r.ok) {
                setCurrent(prev)
                toast.error(r.message)
              } else {
                toast.success('Updated')
                router.refresh()
              }
            })
          }
          className={cn('flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium whitespace-nowrap transition-colors', current === o.value ? 'bg-ink text-white' : 'text-muted hover:bg-lightgray hover:text-ink')}
        >
          <span className={cn('size-1.5 rounded-full', DOTS[o.tone ?? 'gray'])} />
          {o.label}
        </button>
      ))}
    </div>
  )
}
