import { ButtonLink } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <p className="text-sm font-medium text-coral-dark">404</p>
      <h1 className="mt-1 text-lg font-semibold">This page or record doesn’t exist</h1>
      <p className="mt-1 max-w-sm text-sm text-muted">It may have been archived, or you may not have access to it.</p>
      <ButtonLink href="/" variant="secondary" className="mt-5">
        Back to dashboard
      </ButtonLink>
    </div>
  )
}
