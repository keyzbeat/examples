'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { ForbiddenError, requireAction } from '@/lib/auth/context'
import { logActivity } from '@/lib/activity'
import type { FormState } from './resources'

/** Creates (or rotates) an unguessable read-only share link for a client itinerary. */
export async function shareItinerary(stayId: string): Promise<FormState> {
  try {
    const ctx = await requireAction('stays', 'write')
    const stay = await prisma.stay.findFirst({ where: { id: stayId, organizationId: ctx.org.id, deletedAt: null } })
    if (!stay) throw new ForbiddenError('Stay not found.')
    const token = randomBytes(24).toString('base64url')
    await prisma.stay.update({ where: { id: stayId }, data: { shareToken: token } })
    await logActivity({ organizationId: ctx.org.id, userId: ctx.user.id, action: 'updated', entityType: 'stays', entityId: stayId, summary: `Itinerary share link ${stay.shareToken ? 'rotated' : 'created'} for ${stay.title}` })
    revalidatePath(`/stays/${stayId}`)
    return { ok: true, message: stay.shareToken ? 'New link generated — the previous one no longer works.' : 'Share link created.' }
  } catch (e) {
    return { ok: false, message: e instanceof ForbiddenError ? e.message : 'Could not create the link.' }
  }
}

export async function revokeItinerary(stayId: string): Promise<FormState> {
  try {
    const ctx = await requireAction('stays', 'write')
    const res = await prisma.stay.updateMany({ where: { id: stayId, organizationId: ctx.org.id }, data: { shareToken: null } })
    if (!res.count) throw new ForbiddenError('Stay not found.')
    revalidatePath(`/stays/${stayId}`)
    return { ok: true, message: 'Share link revoked.' }
  } catch (e) {
    return { ok: false, message: e instanceof ForbiddenError ? e.message : 'Could not revoke the link.' }
  }
}
