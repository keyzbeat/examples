'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'
import { importCsv, type ImportResult } from '@/app/actions/import'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/sheet'

export function ImportButton({ resource }: { resource: string }) {
  const [open, setOpen] = React.useState(false)
  const action = React.useMemo(() => importCsv.bind(null, resource), [resource])
  const [state, formAction, pending] = React.useActionState(action, { ok: false } as ImportResult)
  const router = useRouter()
  React.useEffect(() => {
    if (state.ok) router.refresh()
  }, [state, router])
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Upload /> Import
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Import from CSV">
        <form action={formAction} className="space-y-3 px-5 py-4">
          <p className="text-[13px] text-muted">
            First row = column headers matching field names (e.g. <em>First name, Last name, Email, Company</em>). Duplicates are detected and skipped. Max 1,000 rows.
          </p>
          <input name="file" type="file" accept=".csv,text/csv" required className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-line file:bg-white file:px-3 file:py-1.5 file:text-sm" />
          {state.message && (
            <div className={state.ok ? 'rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800' : 'rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700'}>
              {state.message}
              {state.skipped && state.skipped.length > 0 && (
                <ul className="mt-1 max-h-32 list-disc overflow-y-auto pl-4 text-xs">
                  {state.skipped.slice(0, 20).map((s) => (
                    <li key={s.row}>
                      Row {s.row}: {s.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              Import
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
