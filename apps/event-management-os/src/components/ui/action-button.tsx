'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button, type ButtonProps } from './button'

/** Runs a bound server action, toasts the result and refreshes (or navigates to `href`). */
export function ActionButton({ action, children, confirm, navigate = true, ...props }: Omit<ButtonProps, 'onClick'> & { action: () => Promise<{ ok: boolean; message?: string; href?: string }>; confirm?: string; navigate?: boolean }) {
  const [pending, start] = React.useTransition()
  const router = useRouter()
  return (
    <Button
      {...props}
      loading={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return
        start(async () => {
          const res = await action()
          if (res.ok) {
            if (res.message) toast.success(res.message)
            if (navigate && res.href) router.push(res.href)
            else router.refresh()
          } else toast.error(res.message ?? 'Action failed')
        })
      }}
    >
      {children}
    </Button>
  )
}
