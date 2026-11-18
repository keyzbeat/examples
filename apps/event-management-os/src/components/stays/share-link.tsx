'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Copy, Link2, RefreshCw, X } from 'lucide-react'
import { revokeItinerary, shareItinerary } from '@/app/actions/stays'
import { Button } from '@/components/ui/button'

export function ShareLink({ stayId, token, canWrite }: { stayId: string; token: string | null; canWrite: boolean }) {
  const [pending, start] = React.useTransition()
  const router = useRouter()
  const [origin, setOrigin] = React.useState('')
  React.useEffect(() => setOrigin(window.location.origin), [])
  const url = token ? `${origin}/share/itinerary/${token}` : null
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const r = await fn()
      r.ok ? toast.success(r.message) : toast.error(r.message)
      router.refresh()
    })
  return (
    <div className="space-y-2">
      {url ? (
        <>
          <div className="flex items-center gap-2 rounded-lg border border-line bg-offwhite px-2.5 py-2 text-xs">
            <Link2 className="size-3.5 shrink-0 text-muted" />
            <span className="truncate">{url}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => { navigator.clipboard.writeText(url); toast.success('Link copied') }}><Copy /> Copy</Button>
            {canWrite && <Button size="sm" variant="ghost" loading={pending} onClick={() => run(() => shareItinerary(stayId))}><RefreshCw /> Rotate</Button>}
            {canWrite && <Button size="sm" variant="ghost" loading={pending} onClick={() => run(() => revokeItinerary(stayId))}><X /> Revoke</Button>}
          </div>
          <p className="text-[11px] text-muted">Read-only, unguessable link. Costs, suppliers and internal notes are never shown.</p>
        </>
      ) : canWrite ? (
        <Button size="sm" variant="secondary" loading={pending} onClick={() => run(() => shareItinerary(stayId))}><Link2 /> Create secure share link</Button>
      ) : (
        <p className="text-xs text-muted">Not shared.</p>
      )}
    </div>
  )
}
