'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { ForbiddenError, requireAction } from '@/lib/auth/context'
import { scopeWhere } from '@/lib/resources/server'
import { RESOURCES } from '@/lib/resources/registry'
import type { FormState } from './resources'

/** Drag & drop on the calendar: moves an item to another day, keeping its time of day. */
export async function moveCalendarItem(kind: 'calendar' | 'task' | 'followup', id: string, day: string): Promise<FormState> {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new ForbiddenError('Invalid date.')
    const [y, m, d] = day.split('-').map(Number) as [number, number, number]
    const moveTo = (orig: Date) => {
      const x = new Date(orig)
      x.setFullYear(y, m - 1, d)
      return x
    }
    if (kind === 'calendar') {
      const ctx = await requireAction('calendar', 'write')
      const ev = await prisma.calendarEvent.findFirst({ where: { ...scopeWhere(ctx, RESOURCES.calendar), id } })
      if (!ev) throw new ForbiddenError('Item not found.')
      const start = moveTo(ev.start)
      const end = ev.end ? new Date(ev.end.getTime() + (start.getTime() - ev.start.getTime())) : null
      await prisma.calendarEvent.update({ where: { id }, data: { start, end } })
    } else if (kind === 'task') {
      const ctx = await requireAction('tasks', 'write')
      const t = await prisma.task.findFirst({ where: { ...scopeWhere(ctx, RESOURCES.tasks), id } })
      if (!t || !t.dueDate) throw new ForbiddenError('Task not found.')
      await prisma.task.update({ where: { id }, data: { dueDate: moveTo(t.dueDate) } })
    } else {
      const ctx = await requireAction('leads', 'write')
      const l = await prisma.lead.findFirst({ where: { organizationId: ctx.org.id, id, deletedAt: null } })
      if (!l || !l.nextFollowUp) throw new ForbiddenError('Lead not found.')
      await prisma.lead.update({ where: { id }, data: { nextFollowUp: moveTo(l.nextFollowUp) } })
    }
    revalidatePath('/calendar')
    return { ok: true, message: 'Rescheduled.' }
  } catch (e) {
    return { ok: false, message: e instanceof ForbiddenError ? e.message : 'Could not move the item.' }
  }
}
