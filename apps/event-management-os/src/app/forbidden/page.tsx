import { ShieldAlert } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button'

export default function Forbidden() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-coral-light text-coral-dark">
        <ShieldAlert className="size-6" />
      </div>
      <h1 className="text-lg font-semibold">Access restricted</h1>
      <p className="mt-1 max-w-sm text-sm text-muted">Your role does not include access to this module. Ask an administrator to update your permissions.</p>
      <ButtonLink href="/" variant="primary" className="mt-5">
        Back to dashboard
      </ButtonLink>
    </div>
  )
}
