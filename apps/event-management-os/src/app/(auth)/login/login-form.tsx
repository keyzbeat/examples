'use client'

import * as React from 'react'
import { signIn } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { FieldShell, Input } from '@/components/ui/inputs'

export function LoginForm({ next, demo }: { next?: string; demo?: boolean }) {
  const [state, action, pending] = React.useActionState(signIn, {})
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next ?? ''} />
      <FieldShell label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={demo ? 'admin@demo.events' : undefined} />
      </FieldShell>
      <FieldShell label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required defaultValue={demo ? 'demo1234' : undefined} />
      </FieldShell>
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <Button type="submit" variant="primary" className="w-full justify-center" loading={pending}>
        Sign in
      </Button>
    </form>
  )
}
