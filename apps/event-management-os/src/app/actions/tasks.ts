'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { ForbiddenError, requireAction } from '@/lib/auth/context'
import { scopeWhere } from '@/lib/resources/server'
import { RESOURCES } from '@/lib/resources/registry'
import { nextRef } from '@/lib/refs'
import { notify } from '@/lib/activity'
import type { FormState } from './resources'

export async function addSubtask(parentId: string, _prev: FormState, form: FormData): Promise<FormState> {
  try {
    const ctx = await requireAction('tasks', 'write')
    const parent = await prisma.task.findFirst({ where: { ...scopeWhere(ctx, RESOURCES.tasks), id: parentId } })
    if (!parent) throw new ForbiddenError('Task not found.')
    const title = String(form.get('title') ?? '').trim()
    if (!title) return { ok: false, message: 'Enter a subtask title.' }
    await prisma.task.create({ data: { organizationId: ctx.org.id, ref: await nextRef(prisma, ctx.org.id, 'task'), title: title.slice(0, 300), parentId, projectId: parent.projectId, assigneeId: parent.assigneeId, createdById: ctx.user.id, priority: parent.priority, dueDate: parent.dueDate } })
    revalidatePath(`/tasks/${parentId}`)
    return { ok: true, message: 'Subtask added.' }
  } catch (e) {
    return { ok: false, message: e instanceof ForbiddenError ? e.message : 'Could not add subtask.' }
  }
}

export async function addTaskComment(taskId: string, _prev: FormState, form: FormData): Promise<FormState> {
  try {
    const ctx = await requireAction('tasks', 'read')
    const task = await prisma.task.findFirst({ where: { ...scopeWhere(ctx, RESOURCES.tasks), id: taskId } })
    if (!task) throw new ForbiddenError('Task not found.')
    const body = String(form.get('body') ?? '').trim()
    if (!body) return { ok: false, message: 'Write a comment.' }
    await prisma.taskComment.create({ data: { taskId, userId: ctx.user.id, body: body.slice(0, 4000) } })
    if (task.assigneeId && task.assigneeId !== ctx.user.id) await notify({ organizationId: ctx.org.id, userId: task.assigneeId, title: `${ctx.user.name} commented on “${task.title}”`, body: body.slice(0, 120), link: `/tasks/${taskId}` })
    revalidatePath(`/tasks/${taskId}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, message: e instanceof ForbiddenError ? e.message : 'Could not comment.' }
  }
}
