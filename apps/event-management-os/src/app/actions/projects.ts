'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ForbiddenError, requireAction, type Ctx } from '@/lib/auth/context'
import { logActivity, notify } from '@/lib/activity'
import { scopeWhere } from '@/lib/resources/server'
import { RESOURCES } from '@/lib/resources/registry'
import { startOfDay, DAY } from '@/lib/dates'
import type { FormState } from './resources'

const ok = (message: string): FormState => ({ ok: true, message })
const err = (e: unknown): FormState => {
  if (!(e instanceof ForbiddenError)) console.error(e)
  return { ok: false, message: e instanceof ForbiddenError ? e.message : 'Action failed.' }
}

async function ownProject(ctx: Ctx, id: string) {
  const p = await prisma.project.findFirst({ where: { ...scopeWhere(ctx, RESOURCES.projects), id } })
  if (!p) throw new ForbiddenError('Project not found or access denied.')
  return p
}
async function ownEvent(ctx: Ctx, id: string) {
  const e = await prisma.event.findFirst({ where: { ...scopeWhere(ctx, RESOURCES.events), id } })
  if (!e) throw new ForbiddenError('Event not found or access denied.')
  return e
}

// ───────────── Services / budget lines ─────────────

export async function addServiceLine(target: 'project' | 'event', targetId: string, serviceId: string, quantity: number): Promise<FormState> {
  try {
    const ctx = await requireAction(target === 'project' ? 'projects' : 'events', 'write')
    if (target === 'project') await ownProject(ctx, targetId)
    else await ownEvent(ctx, targetId)
    const service = await prisma.service.findFirst({ where: { id: serviceId, organizationId: ctx.org.id, deletedAt: null }, include: { supplier: true } })
    if (!service) throw new ForbiddenError('Service not found.')
    if (service.supplier && (service.supplier.status === 'SUSPENDED' || service.supplier.status === 'ARCHIVED')) throw new ForbiddenError(`${service.supplier.companyName} is suspended — this service cannot be added.`)
    const q = Math.max(1, Math.round(quantity || service.defaultQuantity))
    await prisma.projectService.create({ data: { [target === 'project' ? 'projectId' : 'eventId']: targetId, serviceId, quantity: q, unitCost: service.cost, unitPrice: service.price } })
    revalidatePath(`/${target}s/${targetId}`)
    return ok(`${service.name} added.`)
  } catch (e) {
    return err(e)
  }
}

export async function updateServiceLine(lineId: string, data: { quantity?: number; unitPrice?: number; unitCost?: number }): Promise<FormState> {
  try {
    const line = await prisma.projectService.findUnique({ where: { id: lineId }, include: { project: true, event: true } })
    if (!line) throw new ForbiddenError('Line not found.')
    const ctx = await requireAction(line.projectId ? 'projects' : 'events', 'write')
    if (line.projectId) await ownProject(ctx, line.projectId)
    else await ownEvent(ctx, line.eventId!)
    const clean: Prisma.ProjectServiceUpdateInput = {}
    if (data.quantity !== undefined) clean.quantity = Math.max(1, Math.round(data.quantity))
    if (data.unitPrice !== undefined) clean.unitPrice = Math.max(0, Math.round(data.unitPrice))
    if (data.unitCost !== undefined) clean.unitCost = Math.max(0, Math.round(data.unitCost))
    await prisma.projectService.update({ where: { id: lineId }, data: clean })
    revalidatePath(line.projectId ? `/projects/${line.projectId}` : `/events/${line.eventId}`)
    return ok('Line updated.')
  } catch (e) {
    return err(e)
  }
}

export async function removeServiceLine(lineId: string): Promise<FormState> {
  try {
    const line = await prisma.projectService.findUnique({ where: { id: lineId } })
    if (!line) throw new ForbiddenError('Line not found.')
    const ctx = await requireAction(line.projectId ? 'projects' : 'events', 'write')
    if (line.projectId) await ownProject(ctx, line.projectId)
    else await ownEvent(ctx, line.eventId!)
    await prisma.projectService.delete({ where: { id: lineId } })
    revalidatePath(line.projectId ? `/projects/${line.projectId}` : `/events/${line.eventId}`)
    return ok('Line removed.')
  } catch (e) {
    return err(e)
  }
}

// ───────────── Suppliers ─────────────

export async function assignSupplier(projectId: string, supplierId: string, role?: string): Promise<FormState> {
  try {
    const ctx = await requireAction('projects', 'write')
    const project = await ownProject(ctx, projectId)
    const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, organizationId: ctx.org.id, deletedAt: null } })
    if (!supplier) throw new ForbiddenError('Supplier not found.')
    if (supplier.status === 'SUSPENDED' || supplier.status === 'ARCHIVED') throw new ForbiddenError(`${supplier.companyName} is ${supplier.status.toLowerCase()} and cannot be assigned.`)
    await prisma.projectSupplier.upsert({ where: { projectId_supplierId: { projectId, supplierId } }, create: { projectId, supplierId, role }, update: { role } })
    await logActivity({ organizationId: ctx.org.id, userId: ctx.user.id, action: 'updated', entityType: 'projects', entityId: projectId, summary: `${supplier.companyName} assigned to ${project.name}`, link: `/projects/${projectId}?tab=suppliers` })
    revalidatePath(`/projects/${projectId}`)
    return ok('Supplier assigned.')
  } catch (e) {
    return err(e)
  }
}

export async function setProjectSupplierStatus(projectId: string, supplierId: string, status: string): Promise<FormState> {
  try {
    if (!['PROPOSED', 'BOOKED', 'CONFIRMED', 'CANCELLED'].includes(status)) throw new ForbiddenError('Invalid status.')
    const ctx = await requireAction('projects', 'write')
    await ownProject(ctx, projectId)
    await prisma.projectSupplier.update({ where: { projectId_supplierId: { projectId, supplierId } }, data: { status } })
    revalidatePath(`/projects/${projectId}`)
    return ok('Status updated.')
  } catch (e) {
    return err(e)
  }
}

export async function removeProjectSupplier(projectId: string, supplierId: string): Promise<FormState> {
  try {
    const ctx = await requireAction('projects', 'write')
    await ownProject(ctx, projectId)
    await prisma.projectSupplier.delete({ where: { projectId_supplierId: { projectId, supplierId } } })
    revalidatePath(`/projects/${projectId}`)
    return ok('Supplier removed from project.')
  } catch (e) {
    return err(e)
  }
}

// ───────────── Team ─────────────

export async function addMember(target: 'project' | 'event', targetId: string, userId: string, role?: string): Promise<FormState> {
  try {
    const ctx = await requireAction(target === 'project' ? 'projects' : 'events', 'write')
    if (target === 'project') await ownProject(ctx, targetId)
    else await ownEvent(ctx, targetId)
    const user = await prisma.user.findFirst({ where: { id: userId, organizationId: ctx.org.id, clientId: null, deletedAt: null } })
    if (!user) throw new ForbiddenError('User not found.')
    if (target === 'project') await prisma.projectMember.upsert({ where: { projectId_userId: { projectId: targetId, userId } }, create: { projectId: targetId, userId, role }, update: { role } })
    else await prisma.eventMember.upsert({ where: { eventId_userId: { eventId: targetId, userId } }, create: { eventId: targetId, userId, role }, update: { role } })
    if (userId !== ctx.user.id) await notify({ organizationId: ctx.org.id, userId, title: `You were added to a ${target}`, link: `/${target}s/${targetId}` })
    revalidatePath(`/${target}s/${targetId}`)
    return ok(`${user.name} added to the team.`)
  } catch (e) {
    return err(e)
  }
}

export async function removeMember(target: 'project' | 'event', targetId: string, userId: string): Promise<FormState> {
  try {
    const ctx = await requireAction(target === 'project' ? 'projects' : 'events', 'write')
    if (target === 'project') {
      await ownProject(ctx, targetId)
      await prisma.projectMember.delete({ where: { projectId_userId: { projectId: targetId, userId } } })
    } else {
      await ownEvent(ctx, targetId)
      await prisma.eventMember.delete({ where: { eventId_userId: { eventId: targetId, userId } } })
    }
    revalidatePath(`/${target}s/${targetId}`)
    return ok('Removed from team.')
  } catch (e) {
    return err(e)
  }
}

// ───────────── Client collaboration ─────────────

const approvalSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(4000).optional(),
  category: z.enum(['CONCEPT', 'MOODBOARD', 'PROPOSAL', 'QUOTE', 'TIMELINE', 'GENERAL']),
})

export async function requestApproval(projectId: string, _prev: FormState, form: FormData): Promise<FormState> {
  try {
    const ctx = await requireAction('projects', 'write')
    const project = await ownProject(ctx, projectId)
    const parsed = approvalSchema.safeParse({ title: form.get('title'), description: form.get('description') || undefined, category: form.get('category') })
    if (!parsed.success) return { ok: false, errors: { title: 'Enter a title (2+ characters).' } }
    await prisma.approval.create({ data: { organizationId: ctx.org.id, projectId, ...parsed.data } })
    const portalUsers = project.clientId ? await prisma.user.findMany({ where: { clientId: project.clientId, active: true } }) : []
    for (const u of portalUsers) await notify({ organizationId: ctx.org.id, userId: u.id, type: 'APPROVAL', title: `Approval requested: ${parsed.data.title}`, link: '/portal' })
    await logActivity({ organizationId: ctx.org.id, userId: ctx.user.id, action: 'created', entityType: 'approval', entityId: projectId, summary: `Approval requested from client: ${parsed.data.title}`, link: `/projects/${projectId}?tab=portal` })
    revalidatePath(`/projects/${projectId}`)
    return ok('Approval request shared in the client portal.')
  } catch (e) {
    return err(e)
  }
}

export async function postStaffMessage(projectId: string, _prev: FormState, form: FormData): Promise<FormState> {
  try {
    const ctx = await requireAction('projects', 'write')
    const project = await ownProject(ctx, projectId)
    const body = String(form.get('body') ?? '').trim()
    if (body.length < 1 || body.length > 4000) return { ok: false, errors: { body: 'Write a message.' } }
    await prisma.message.create({ data: { organizationId: ctx.org.id, projectId, authorId: ctx.user.id, body, fromClient: false } })
    const portalUsers = project.clientId ? await prisma.user.findMany({ where: { clientId: project.clientId, active: true } }) : []
    for (const u of portalUsers) await notify({ organizationId: ctx.org.id, userId: u.id, title: `New message from ${ctx.user.name}`, link: '/portal?tab=messages' })
    revalidatePath(`/projects/${projectId}`)
    return ok('Message sent to the client.')
  } catch (e) {
    return err(e)
  }
}

// ───────────── Templates ─────────────

/** Saves the project's current task list as the reusable default checklist for its project type. */
export async function saveChecklistTemplate(projectId: string): Promise<FormState> {
  try {
    const ctx = await requireAction('projects', 'write')
    const project = await ownProject(ctx, projectId)
    const tasks = await prisma.task.findMany({ where: { projectId, deletedAt: null, parentId: null, status: { not: 'CANCELLED' } }, orderBy: [{ dueDate: 'asc' }, { position: 'asc' }] })
    if (!tasks.length) return { ok: false, message: 'This project has no tasks to save.' }
    const anchor = project.startDate ? startOfDay(project.startDate) : null
    const created = startOfDay(project.createdAt)
    const items = tasks.map((t) => {
      // Tasks dated in the last 30 days before the start are stored relative to the start (negative offsets).
      const due = t.dueDate ? startOfDay(t.dueDate) : null
      let offsetDays = 7
      if (due && anchor && anchor.getTime() - due.getTime() <= 30 * DAY && due <= anchor) offsetDays = -Math.round((anchor.getTime() - due.getTime()) / DAY) || -1
      else if (due) offsetDays = Math.max(0, Math.round((due.getTime() - created.getTime()) / DAY))
      return { title: t.title, offsetDays, priority: t.priority }
    })
    const existing = await prisma.projectTemplate.findFirst({ where: { organizationId: ctx.org.id, projectType: project.type } })
    if (existing) await prisma.projectTemplate.update({ where: { id: existing.id }, data: { tasks: items, name: `${project.type} checklist (from ${project.ref})` } })
    else await prisma.projectTemplate.create({ data: { organizationId: ctx.org.id, projectType: project.type, tasks: items, name: `${project.type} checklist (from ${project.ref})` } })
    return ok(`Saved ${items.length} tasks as the default checklist for ${project.type.toLowerCase().replace('_', ' ')} projects.`)
  } catch (e) {
    return err(e)
  }
}
