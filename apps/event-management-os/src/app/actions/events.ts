'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ForbiddenError, requireAction, getCtx, type Ctx } from '@/lib/auth/context'
import { scopeWhere } from '@/lib/resources/server'
import { RESOURCES } from '@/lib/resources/registry'
import type { FormState } from './resources'

const fail = (e: unknown): FormState => ({ ok: false, message: e instanceof ForbiddenError ? e.message : 'Action failed.' })

async function eventFor(ctx: Ctx, eventId: string) {
  const e = await prisma.event.findFirst({ where: { ...scopeWhere(ctx, RESOURCES.events), id: eventId } })
  if (!e) throw new ForbiddenError('Event not found or access denied.')
  return e
}

/**
 * Guest-list access: staff with events:write, or a portal client whose client owns the event.
 * Portal clients can only manage guests of their own events.
 */
async function guestAccess(eventId: string) {
  const ctx = await getCtx()
  if (!ctx) throw new ForbiddenError('Session expired.')
  if (ctx.user.clientId) {
    const ev = await prisma.event.findFirst({ where: { id: eventId, organizationId: ctx.org.id, clientId: ctx.user.clientId, deletedAt: null } })
    if (!ev) throw new ForbiddenError()
    return { ctx, event: ev }
  }
  if (!ctx.can('events', 'write')) throw new ForbiddenError()
  return { ctx, event: await eventFor(ctx, eventId) }
}

const timelineSchema = z.object({ time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'), title: z.string().trim().min(1).max(200), category: z.enum(['SETUP', 'DELIVERY', 'STAFF', 'TECH', 'GUESTS', 'PROGRAM', 'BREAKDOWN']), notes: z.string().max(1000).optional() })

export async function addTimelineItem(eventId: string, _prev: FormState, form: FormData): Promise<FormState> {
  try {
    const ctx = await requireAction('events', 'write')
    await eventFor(ctx, eventId)
    const parsed = timelineSchema.safeParse({ time: form.get('time'), title: form.get('title'), category: form.get('category'), notes: form.get('notes') || undefined })
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message }
    await prisma.eventTimelineItem.create({ data: { eventId, ...parsed.data } })
    revalidatePath(`/events/${eventId}`)
    return { ok: true, message: 'Added to run-of-show.' }
  } catch (e) {
    return fail(e)
  }
}

export async function toggleTimelineItem(itemId: string): Promise<FormState> {
  try {
    const ctx = await requireAction('events', 'write')
    const item = await prisma.eventTimelineItem.findUnique({ where: { id: itemId } })
    if (!item) throw new ForbiddenError('Not found.')
    await eventFor(ctx, item.eventId)
    await prisma.eventTimelineItem.update({ where: { id: itemId }, data: { done: !item.done } })
    revalidatePath(`/events/${item.eventId}`)
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteTimelineItem(itemId: string): Promise<FormState> {
  try {
    const ctx = await requireAction('events', 'write')
    const item = await prisma.eventTimelineItem.findUnique({ where: { id: itemId } })
    if (!item) throw new ForbiddenError('Not found.')
    await eventFor(ctx, item.eventId)
    await prisma.eventTimelineItem.delete({ where: { id: itemId } })
    revalidatePath(`/events/${item.eventId}`)
    return { ok: true, message: 'Removed.' }
  } catch (e) {
    return fail(e)
  }
}

const guestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  rsvp: z.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'MAYBE']),
  dietary: z.string().max(200).optional(),
  table: z.string().max(50).optional(),
  plusOnes: z.coerce.number().int().min(0).max(10),
  requirements: z.string().max(1000).optional(),
})

export async function saveGuest(eventId: string, guestId: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  try {
    const { event } = await guestAccess(eventId)
    const raw = Object.fromEntries(['name', 'email', 'phone', 'rsvp', 'dietary', 'table', 'plusOnes', 'requirements'].map((k) => [k, (form.get(k) as string | null) ?? undefined]))
    const parsed = guestSchema.safeParse({ ...raw, rsvp: raw.rsvp || 'PENDING', plusOnes: raw.plusOnes || 0 })
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message }
    const data = { ...parsed.data, email: parsed.data.email || null, phone: parsed.data.phone || null, dietary: parsed.data.dietary || null, table: parsed.data.table || null, requirements: parsed.data.requirements || null }
    if (guestId) {
      const g = await prisma.guest.findFirst({ where: { id: guestId, eventId: event.id } })
      if (!g) throw new ForbiddenError('Guest not found.')
      await prisma.guest.update({ where: { id: guestId }, data })
    } else await prisma.guest.create({ data: { ...data, eventId: event.id } })
    revalidatePath(`/events/${eventId}`)
    revalidatePath('/portal')
    return { ok: true, message: guestId ? 'Guest updated.' : 'Guest added.' }
  } catch (e) {
    return fail(e)
  }
}

export async function setGuestRsvp(guestId: string, rsvp: string): Promise<FormState> {
  try {
    const guest = await prisma.guest.findUnique({ where: { id: guestId } })
    if (!guest) throw new ForbiddenError('Guest not found.')
    await guestAccess(guest.eventId)
    if (!['PENDING', 'ACCEPTED', 'DECLINED', 'MAYBE'].includes(rsvp)) throw new ForbiddenError('Invalid RSVP.')
    await prisma.guest.update({ where: { id: guestId }, data: { rsvp: rsvp as 'PENDING' } })
    revalidatePath(`/events/${guest.eventId}`)
    revalidatePath('/portal')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteGuest(guestId: string): Promise<FormState> {
  try {
    const guest = await prisma.guest.findUnique({ where: { id: guestId } })
    if (!guest) throw new ForbiddenError('Guest not found.')
    await guestAccess(guest.eventId)
    await prisma.guest.delete({ where: { id: guestId } })
    revalidatePath(`/events/${guest.eventId}`)
    revalidatePath('/portal')
    return { ok: true, message: 'Guest removed.' }
  } catch (e) {
    return fail(e)
  }
}
