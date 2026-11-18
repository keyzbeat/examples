import { prisma } from '@/lib/prisma'
import { itineraryPdf } from '@/lib/pdf/itinerary'

/** Public PDF for a shared itinerary (token-gated, read-only, no internal data). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!token || token.length < 16) return new Response('Not found', { status: 404 })
  const stay = await prisma.stay.findFirst({ where: { shareToken: token, deletedAt: null }, include: { organization: true, client: true, reservations: { where: { status: { not: 'CANCELLED' } }, orderBy: [{ date: 'asc' }, { time: 'asc' }] } } })
  if (!stay) return new Response('Not found', { status: 404 })
  return itineraryPdf(stay)
}
