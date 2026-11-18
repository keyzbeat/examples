import { notFound } from 'next/navigation'
import { CalendarDays, MapPin, Users, Download } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/dates'
import { Itinerary } from '@/components/stays/itinerary'
import { Logo } from '@/components/shell/sidebar'

export const metadata = { title: 'Your itinerary', robots: { index: false, follow: false } }

/** Public, read-only itinerary. Exposes no costs, suppliers or internal notes. */
export default async function SharedItinerary({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!token || token.length < 16) notFound()
  const stay = await prisma.stay.findFirst({ where: { shareToken: token, deletedAt: null }, include: { organization: { select: { name: true } }, client: { select: { firstName: true } }, reservations: { where: { status: { not: 'CANCELLED' } }, orderBy: [{ date: 'asc' }, { time: 'asc' }] } } })
  if (!stay) notFound()
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <Logo />
        <a href={`/api/share/itinerary/${token}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] shadow-soft hover:bg-offwhite"><Download className="size-4" /> PDF</a>
      </div>
      <p className="text-sm text-coral-dark">{stay.client ? `Prepared for ${stay.client.firstName}` : 'Your itinerary'}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{stay.title}</h1>
      <div className="mt-2 flex flex-wrap gap-4 text-[13px] text-muted">
        <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {stay.destination}</span>
        <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> {formatDate(stay.checkIn)} → {formatDate(stay.checkOut)}</span>
        <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {stay.travelers} travellers</span>
      </div>
      {stay.accommodation && <p className="mt-4 rounded-xl border border-line bg-white px-4 py-3 text-[13px]"><span className="text-muted">Accommodation · </span>{stay.accommodation}</p>}
      <div className="mt-6 rounded-xl border border-line bg-offwhite">
        <Itinerary clientSafe start={stay.checkIn} items={stay.reservations.map((r) => ({ id: r.id, date: r.date, time: r.time, type: r.type, title: r.title, location: r.location, status: r.status, confirmation: r.confirmation, supplier: null, notes: null }))} />
      </div>
      <p className="mt-8 text-center text-xs text-muted">Prepared by {stay.organization.name}</p>
    </div>
  )
}
