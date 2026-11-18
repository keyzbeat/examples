'use client'

import * as React from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { deleteResource } from '@/app/actions/resources'
import { Button } from '@/components/ui/button'
import { Modal, Sheet } from '@/components/ui/sheet'
import { ResourceForm, type ResourceFormProps } from './resource-form'

type SheetProps = Omit<ResourceFormProps, 'onDone' | 'formId' | 'hideActions'> & {
  title: string
  description?: string
  triggerLabel?: string
  triggerVariant?: 'primary' | 'secondary' | 'ghost' | 'subtle'
  triggerSize?: 'sm' | 'md' | 'icon-sm'
  icon?: 'plus' | 'edit'
  /** Opens automatically when the URL contains ?new=1 (quick create from the topbar). */
  autoOpenParam?: boolean
}

export function ResourceSheet({ title, description, triggerLabel, triggerVariant = 'primary', triggerSize = 'md', icon = 'plus', autoOpenParam, ...form }: SheetProps) {
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    if (autoOpenParam && params.get('new') === '1') setOpen(true)
  }, [autoOpenParam, params])
  const close = React.useCallback(() => {
    setOpen(false)
    if (autoOpenParam && params.get('new') === '1') {
      const p = new URLSearchParams(params.toString())
      p.delete('new')
      router.replace(p.size ? `${pathname}?${p}` : pathname, { scroll: false })
    }
  }, [autoOpenParam, params, pathname, router])
  const formId = React.useId()
  const [pending, setPending] = React.useState(false)
  return (
    <>
      <Button variant={triggerVariant} size={triggerSize} onClick={() => setOpen(true)}>
        {icon === 'plus' ? <Plus /> : <Pencil />}
        {triggerLabel}
      </Button>
      <Sheet
        open={open}
        onClose={close}
        title={title}
        description={description}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" form={formId} variant="primary" loading={pending}>
              {form.id ? 'Save changes' : 'Create'}
            </Button>
          </div>
        }
      >
        <ResourceForm
          {...form}
          formId={formId}
          hideActions
          onPendingChange={setPending}
          onDone={(s) => {
            if (s.ok) close()
          }}
        />
      </Sheet>
    </>
  )
}

export function DeleteButton({ resource, id, label = 'Archive', redirectTo, size = 'md', confirmText }: { resource: string; id: string; label?: string; redirectTo?: string; size?: 'sm' | 'md' | 'icon-sm'; confirmText?: string }) {
  const [open, setOpen] = React.useState(false)
  const [pending, start] = React.useTransition()
  const router = useRouter()
  return (
    <>
      <Button variant={size === 'icon-sm' ? 'ghost' : 'danger'} size={size} onClick={() => setOpen(true)} aria-label={label}>
        <Trash2 />
        {size !== 'icon-sm' && label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`${label} this record?`}>
        <div className="px-5 py-4 text-sm text-muted">{confirmText ?? 'The record will be hidden from lists. It stays in the audit log and can be restored by an administrator.'}</div>
        <div className="flex justify-end gap-2 border-t border-line bg-offwhite px-5 py-3">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await deleteResource(resource, id)
                if (res.ok) {
                  toast.success(res.message)
                  setOpen(false)
                  if (redirectTo) router.push(redirectTo)
                  else router.refresh()
                } else toast.error(res.message)
              })
            }
          >
            {label}
          </Button>
        </div>
      </Modal>
    </>
  )
}
