import { getCtx } from '@/lib/auth/context'
import { prisma } from '@/lib/prisma'
import { itineraryPdf } from '@/lib/pdf/itinerary'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getCtx()
  if (!ctx) return new Response('Unauthorized', { status: 401 })
  const where = ctx.user.clientId ? { id, organizationId: ctx.org.id, clientId: ctx.user.clientId, deletedAt: null } : ctx.can('stays') ? { id, organizationId: ctx.org.id, deletedAt: null } : null
  if (!where) return new Response('Forbidden', { status: 403 })
  const stay = await prisma.stay.findFirst({ where, include: { organization: true, client: true, reservations: { where: { status: { not: 'CANCELLED' } }, orderBy: [{ date: 'asc' }, { time: 'asc' }] } } })
  if (!stay) return new Response('Not found', { status: 404 })
  return itineraryPdf(stay)
}
