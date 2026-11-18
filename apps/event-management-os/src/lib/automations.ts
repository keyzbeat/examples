/**
 * Automation engine.
 *
 * Event-driven rules run inside the same transaction as the triggering write
 * (onLeadCreated, onLeadWon, onProjectCreated, onQuoteApproved, onClientApproval).
 *
 * Time-driven rules (follow-ups due, overdue tasks, payment reminders, upcoming-event
 * checklists) are evaluated by runScheduledAutomations(), called by the
 * /api/cron/automations endpoint and opportunistically (throttled) on dashboard load.
 * Every scheduled rule is idempotent thanks to notification dedupe keys and task `source` keys.
 */
import type { Prisma, PrismaClient, ProjectType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logActivity, notify } from '@/lib/activity'
import { nextRef } from '@/lib/refs'
import { addDays, startOfDay } from '@/lib/dates'
import { normalizeEmail, fullName } from '@/lib/utils'

type Tx = PrismaClient | Prisma.TransactionClient

interface ChecklistItem {
  title: string
  offsetDays: number // relative to creation (positive) or to the project start (negative)
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
}

const BASE: ChecklistItem[] = [
  { title: 'Kick-off meeting with client', offsetDays: 3, priority: 'HIGH' },
  { title: 'Write and share the creative brief', offsetDays: 7 },
  { title: 'Build budget estimate', offsetDays: 7, priority: 'HIGH' },
  { title: 'Send proposal & quote', offsetDays: 10, priority: 'HIGH' },
]

export const DEFAULT_CHECKLISTS: Record<ProjectType, ChecklistItem[]> = {
  WEDDING: [
    ...BASE,
    { title: 'Shortlist and visit venues', offsetDays: 14 },
    { title: 'Book photographer & videographer', offsetDays: 30 },
    { title: 'Moodboard and decoration concept approval', offsetDays: 30 },
    { title: 'Catering tasting', offsetDays: 60 },
    { title: 'Guest list & RSVP tracking', offsetDays: 60 },
    { title: 'Seating plan', offsetDays: -14 },
    { title: 'Final run-of-show', offsetDays: -7, priority: 'HIGH' },
  ],
  BIRTHDAY: [...BASE, { title: 'Book venue', offsetDays: 14 }, { title: 'Entertainment booking', offsetDays: 21 }, { title: 'Confirm cake & catering', offsetDays: -7 }],
  PRIVATE_EVENT: [...BASE, { title: 'Venue & suppliers selection', offsetDays: 14 }, { title: 'Guest logistics', offsetDays: -10 }],
  CORPORATE_EVENT: [
    ...BASE,
    { title: 'Collect stakeholder requirements', offsetDays: 5 },
    { title: 'AV & technical rider', offsetDays: 21 },
    { title: 'Attendee registration setup', offsetDays: 21 },
    { title: 'Speaker & agenda confirmation', offsetDays: -14, priority: 'HIGH' },
  ],
  TRAVEL: [
    { title: 'Confirm traveller details & passports', offsetDays: 2, priority: 'HIGH' },
    { title: 'Book accommodation', offsetDays: 5, priority: 'HIGH' },
    { title: 'Arrange airport transfers', offsetDays: 10 },
    { title: 'Build day-by-day itinerary', offsetDays: 10 },
    { title: 'Send final itinerary to client', offsetDays: -5, priority: 'HIGH' },
  ],
  CONCIERGE: [{ title: 'Qualify request & preferences', offsetDays: 1 }, { title: 'Source and confirm supplier', offsetDays: 2 }],
  INTERNAL: [{ title: 'Define scope & owners', offsetDays: 3 }],
  CUSTOM: BASE,
}

export async function createChecklist(
  tx: Tx,
  args: { organizationId: string; projectId: string; type: ProjectType; assigneeId?: string | null; startDate?: Date | null; createdById?: string | null },
) {
  const template = await tx.projectTemplate.findFirst({ where: { organizationId: args.organizationId, projectType: args.type } })
  const items = (template?.tasks as unknown as ChecklistItem[] | undefined) ?? DEFAULT_CHECKLISTS[args.type]
  const now = startOfDay()
  for (const [i, item] of items.entries()) {
    let due = item.offsetDays >= 0 ? addDays(now, item.offsetDays) : args.startDate ? addDays(startOfDay(args.startDate), item.offsetDays) : addDays(now, 30)
    if (args.startDate && due > args.startDate) due = startOfDay(args.startDate)
    await tx.task.create({
      data: {
        organizationId: args.organizationId,
        ref: await nextRef(tx, args.organizationId, 'task'),
        title: item.title,
        projectId: args.projectId,
        assigneeId: args.assigneeId ?? null,
        createdById: args.createdById ?? null,
        priority: item.priority ?? 'MEDIUM',
        dueDate: due,
        position: i,
        source: 'automation:project-checklist',
      },
    })
  }
  return items.length
}

/** New Lead → Qualification Task */
export async function onLeadCreated(tx: Tx, lead: { id: string; organizationId: string; firstName: string; lastName: string; assignedToId: string | null; ref: string }, userId?: string) {
  await tx.task.create({
    data: {
      organizationId: lead.organizationId,
      ref: await nextRef(tx, lead.organizationId, 'task'),
      title: `Qualify lead ${fullName(lead)}`,
      description: 'Call the prospect, confirm budget, date, guest count and decision makers.',
      leadId: lead.id,
      assigneeId: lead.assignedToId ?? userId ?? null,
      createdById: userId ?? null,
      priority: 'HIGH',
      dueDate: addDays(startOfDay(), 1),
      source: 'automation:new-lead',
    },
  })
  if (lead.assignedToId && lead.assignedToId !== userId) {
    await notify({ organizationId: lead.organizationId, userId: lead.assignedToId, type: 'AUTOMATION', title: `New lead assigned: ${fullName(lead)}`, link: `/leads/${lead.id}` }, tx)
  }
}

/** Deal Won → Client (deduplicated) + Project + default checklist */
export async function onLeadWon(tx: Tx, leadId: string, userId?: string) {
  const lead = await tx.lead.findUniqueOrThrow({ where: { id: leadId } })
  let clientId = lead.clientId
  if (!clientId) {
    const email = normalizeEmail(lead.email)
    const existing = email ? await tx.client.findFirst({ where: { organizationId: lead.organizationId, emailNormalized: email, deletedAt: null } }) : null
    const client =
      existing ??
      (await tx.client.create({
        data: {
          organizationId: lead.organizationId,
          ref: await nextRef(tx, lead.organizationId, 'client'),
          type: lead.company ? 'COMPANY' : 'INDIVIDUAL',
          firstName: lead.firstName,
          lastName: lead.lastName,
          company: lead.company,
          email: lead.email,
          emailNormalized: email,
          phone: lead.phone,
          whatsapp: lead.whatsapp,
          city: lead.city,
          country: lead.country,
          ownerId: lead.assignedToId,
          isDemo: lead.isDemo,
        },
      }))
    clientId = client.id
  }
  let projectId = lead.projectId
  if (!projectId) {
    const type = guessProjectType(lead.serviceRequested)
    const project = await tx.project.create({
      data: {
        organizationId: lead.organizationId,
        ref: await nextRef(tx, lead.organizationId, 'project'),
        name: `${lead.serviceRequested || 'Project'} — ${fullName(lead)}`,
        clientId,
        managerId: lead.assignedToId,
        type,
        budget: lead.estimatedBudget,
        startDate: lead.eventDate,
        status: 'PLANNING',
        description: lead.notes,
        isDemo: lead.isDemo,
      },
    })
    projectId = project.id
    await createChecklist(tx, { organizationId: lead.organizationId, projectId, type, assigneeId: lead.assignedToId, startDate: lead.eventDate, createdById: userId })
    await logActivity({ organizationId: lead.organizationId, userId, action: 'automation', entityType: 'project', entityId: projectId, summary: `Project ${project.ref} created automatically from won deal ${lead.ref}`, link: `/projects/${projectId}` }, tx)
  }
  await tx.lead.update({ where: { id: leadId }, data: { clientId, projectId } })
  return { clientId, projectId }
}

export function guessProjectType(service?: string | null): ProjectType {
  const s = (service || '').toLowerCase()
  if (s.includes('wedding')) return 'WEDDING'
  if (s.includes('birthday')) return 'BIRTHDAY'
  if (s.includes('corporate') || s.includes('seminar') || s.includes('conference')) return 'CORPORATE_EVENT'
  if (s.includes('stay') || s.includes('travel') || s.includes('villa') || s.includes('trip')) return 'TRAVEL'
  if (s.includes('concierge')) return 'CONCIERGE'
  if (s.includes('event') || s.includes('party') || s.includes('dinner')) return 'PRIVATE_EVENT'
  return 'CUSTOM'
}

/** Quote Approved → project confirmed + manager notified */
export async function onQuoteApproved(tx: Tx, quote: { id: string; ref: string; organizationId: string; projectId: string | null }, userId?: string) {
  if (!quote.projectId) return
  const project = await tx.project.findUnique({ where: { id: quote.projectId } })
  if (!project) return
  if (project.status === 'DRAFT' || project.status === 'PLANNING') {
    await tx.project.update({ where: { id: project.id }, data: { status: 'CONFIRMED' } })
  }
  await logActivity({ organizationId: quote.organizationId, userId, action: 'automation', entityType: 'project', entityId: project.id, summary: `Quote ${quote.ref} approved — ${project.ref} marked as confirmed`, link: `/projects/${project.id}` }, tx)
  if (project.managerId) {
    await notify({ organizationId: quote.organizationId, userId: project.managerId, type: 'APPROVAL', title: `Quote ${quote.ref} approved`, body: project.name, link: `/quotes/${quote.id}` }, tx)
  }
}

/** Client Approval → Activity Log + manager notification */
export async function onClientApproval(tx: Tx, approval: { id: string; organizationId: string; projectId: string; title: string; status: string }, userId: string) {
  const project = await tx.project.findUnique({ where: { id: approval.projectId } })
  await logActivity({ organizationId: approval.organizationId, userId, action: approval.status === 'APPROVED' ? 'approved' : 'rejected', entityType: 'approval', entityId: approval.id, summary: `Client ${approval.status.toLowerCase()} “${approval.title}”`, link: `/projects/${approval.projectId}?tab=portal` }, tx)
  if (project?.managerId) {
    await notify({ organizationId: approval.organizationId, userId: project.managerId, type: 'APPROVAL', title: `Client ${approval.status.toLowerCase()}: ${approval.title}`, body: project.name, link: `/projects/${project.id}?tab=portal` }, tx)
  }
}

// ───────────────────────── Scheduled rules ─────────────────────────

const lastRun = new Map<string, number>()

export async function runScheduledAutomationsThrottled(organizationId: string, minutes = 10) {
  const now = Date.now()
  if ((lastRun.get(organizationId) ?? 0) > now - minutes * 60_000) return null
  lastRun.set(organizationId, now)
  try {
    return await runScheduledAutomations(organizationId)
  } catch (e) {
    console.error('[automations]', e)
    return null
  }
}

export async function runScheduledAutomations(organizationId: string) {
  const today = startOfDay()
  const tomorrow = addDays(today, 1)
  const stats = { followUps: 0, overdue: 0, payments: 0, eventChecklists: 0 }
  const admins = await prisma.user.findMany({ where: { organizationId, active: true, deletedAt: null, role: { key: { in: ['admin', 'management'] } } }, select: { id: true } })

  // Follow-up Due → Notification
  const leads = await prisma.lead.findMany({ where: { organizationId, deletedAt: null, nextFollowUp: { lt: tomorrow }, stage: { notIn: ['WON', 'LOST', 'ARCHIVED'] }, assignedToId: { not: null } } })
  for (const l of leads) {
    await notify({ organizationId, userId: l.assignedToId!, type: 'FOLLOW_UP', title: `Follow-up due: ${fullName(l)}`, body: l.serviceRequested ?? undefined, link: `/leads/${l.id}`, dedupeKey: `followup:${l.id}:${l.nextFollowUp!.toISOString().slice(0, 10)}` })
    stats.followUps++
  }

  // Overdue Task → Alert
  const overdue = await prisma.task.findMany({ where: { organizationId, deletedAt: null, dueDate: { lt: today }, status: { notIn: ['COMPLETED', 'CANCELLED'] }, assigneeId: { not: null } } })
  for (const t of overdue) {
    await notify({ organizationId, userId: t.assigneeId!, type: 'OVERDUE', title: `Overdue task: ${t.title}`, link: `/tasks/${t.id}`, dedupeKey: `overdue:${t.id}:${today.toISOString().slice(0, 10)}` })
    stats.overdue++
  }

  // Payment Due → Reminder (due in ≤ 3 days or late)
  const payments = await prisma.payment.findMany({ where: { organizationId, status: 'PENDING', dueDate: { lt: addDays(today, 4) } }, include: { invoice: true, supplier: true } })
  for (const p of payments) {
    for (const a of admins) {
      const label = p.direction === 'INCOMING' ? `Client payment due${p.invoice ? ` — ${p.invoice.ref}` : ''}` : `Supplier payment due${p.supplier ? ` — ${p.supplier.companyName}` : ''}`
      await notify({ organizationId, userId: a.id, type: 'PAYMENT', title: label, link: '/finance', dedupeKey: `payment:${p.id}:${p.dueDate!.toISOString().slice(0, 10)}` })
    }
    stats.payments++
  }

  // Upcoming Event (≤ 14 days) → Confirmation Checklist (created once per event)
  const events = await prisma.event.findMany({ where: { organizationId, deletedAt: null, date: { gte: today, lt: addDays(today, 15) }, status: { in: ['PLANNING', 'CONFIRMED', 'IN_PRODUCTION'] } }, include: { project: true } })
  for (const e of events) {
    const source = `automation:event-confirmations:${e.id}`
    const exists = await prisma.task.findFirst({ where: { organizationId, source } })
    if (exists) continue
    const assignee = e.project?.managerId ?? null
    const items = ['Reconfirm all suppliers & arrival times', 'Send final timeline to team', 'Confirm final guest count with caterer', 'Check balance payments received', 'Prepare day-of emergency kit']
    await prisma.$transaction(async (tx) => {
      for (const title of items) {
        await tx.task.create({ data: { organizationId, ref: await nextRef(tx, organizationId, 'task'), title: `${title} — ${e.name}`, eventId: e.id, projectId: e.projectId, assigneeId: assignee, priority: 'HIGH', dueDate: addDays(e.date!, -2) < today ? today : addDays(e.date!, -2), source } })
      }
      await logActivity({ organizationId, action: 'automation', entityType: 'event', entityId: e.id, summary: `Confirmation checklist generated for ${e.name}`, link: `/events/${e.id}` }, tx)
    })
    stats.eventChecklists++
  }
  return stats
}
