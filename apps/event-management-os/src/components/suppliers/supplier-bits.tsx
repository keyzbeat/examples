'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Columns3, Heart, Trash2 } from 'lucide-react'
import { quickUpdate, type FormState } from '@/app/actions/resources'
import { addSupplierContact, deleteSupplierContact } from '@/app/actions/suppliers'
import { cn } from '@/lib/utils'
import { Button, buttonClass } from '@/components/ui/button'
import { Input } from '@/components/ui/inputs'

export function FavoriteToggle({ id, value, canWrite }: { id: string; value: boolean; canWrite: boolean }) {
  const [on, setOn] = React.useOptimistic(value)
  const [, start] = React.useTransition()
  const router = useRouter()
  return (
    <button
      disabled={!canWrite}
      aria-label={on ? 'Remove from favourites' : 'Add to favourites'}
      onClick={() => start(async () => { setOn(!on); const r = await quickUpdate('suppliers', id, 'favorite', String(!on)); if (!r.ok) toast.error(r.message); router.refresh() })}
      className="rounded p-1 hover:bg-coral-light/50"
    >
      <Heart className={cn('size-4', on ? 'fill-coral text-coral' : 'text-line-strong')} />
    </button>
  )
}

/** Comparison basket stored in the URL (?cmp=id1,id2). */
export function CompareCheckbox({ id }: { id: string }) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const ids = (params.get('cmp') ?? '').split(',').filter(Boolean)
  const checked = ids.includes(id)
  return (
    <input
      type="checkbox"
      aria-label="Compare"
      checked={checked}
      onChange={() => {
        const next = checked ? ids.filter((x) => x !== id) : [...ids, id].slice(-4)
        const p = new URLSearchParams(params.toString())
        if (next.length) p.set('cmp', next.join(','))
        else p.delete('cmp')
        router.replace(`${pathname}?${p}`, { scroll: false })
      }}
      className="size-4 rounded border-line-strong accent-[#F07F73]"
    />
  )
}

export function CompareBar() {
  const params = useSearchParams()
  const ids = (params.get('cmp') ?? '').split(',').filter(Boolean)
  if (ids.length === 0) return null
  return (
    <Link href={`/suppliers/compare?ids=${ids.join(',')}`} className={buttonClass(ids.length >= 2 ? 'primary' : 'secondary', 'sm')}>
      <Columns3 /> Compare ({ids.length})
    </Link>
  )
}

export function ContactForm({ supplierId }: { supplierId: string }) {
  const action = React.useMemo(() => addSupplierContact.bind(null, supplierId), [supplierId])
  const [state, formAction, pending] = React.useActionState(action, { ok: false } as FormState)
  const ref = React.useRef<HTMLFormElement>(null)
  const router = useRouter()
  React.useEffect(() => {
    if (state.ok) { toast.success(state.message); ref.current?.reset(); router.refresh() } else if (state.message) toast.error(state.message)
  }, [state, router])
  return (
    <form ref={ref} action={formAction} className="grid grid-cols-2 gap-2 border-t border-line p-3">
      <Input name="name" placeholder="Name" required />
      <Input name="role" placeholder="Role" />
      <Input name="email" type="email" placeholder="Email" />
      <Input name="phone" placeholder="Phone" />
      <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="isPrimary" className="accent-[#F07F73]" /> Primary contact</label>
      <Button type="submit" size="sm" variant="secondary" loading={pending} className="justify-self-end">Add contact</Button>
    </form>
  )
}

export function DeleteContact({ id }: { id: string }) {
  const [, start] = React.useTransition()
  const router = useRouter()
  return (
    <button onClick={() => start(async () => { const r = await deleteSupplierContact(id); r.ok ? toast.success(r.message) : toast.error(r.message); router.refresh() })} className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Delete contact">
      <Trash2 className="size-3.5" />
    </button>
  )
}
