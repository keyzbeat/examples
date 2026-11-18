import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type Tx = PrismaClient | Prisma.TransactionClient

export interface LogInput {
  organizationId: string
  userId?: string | null
  action: string
  entityType: string
  entityId: string
  summary: string
  link?: string
  before?: unknown
  after?: unknown
}

/** Writes a human-readable activity entry and an immutable audit entry. */
export async function logActivity(input: LogInput, tx: Tx = prisma) {
  const { before, after, ...rest } = input
  await tx.activityLog.create({
    data: {
      organizationId: rest.organizationId,
      userId: rest.userId ?? null,
      action: rest.action,
      entityType: rest.entityType,
      entityId: rest.entityId,
      summary: rest.summary,
      link: rest.link,
    },
  })
  await tx.auditLog.create({
    data: {
      organizationId: rest.organizationId,
      userId: rest.userId ?? null,
      action: rest.action,
      entityType: rest.entityType,
      entityId: rest.entityId,
      before: before === undefined ? undefined : (JSON.parse(JSON.stringify(before)) as Prisma.InputJsonValue),
      after: after === undefined ? undefined : (JSON.parse(JSON.stringify(after)) as Prisma.InputJsonValue),
    },
  })
}

export async function notify(
  input: { organizationId: string; userId: string; title: string; body?: string; link?: string; type?: string; dedupeKey?: string },
  tx: Tx = prisma,
) {
  if (input.dedupeKey) {
    await tx.notification.upsert({
      where: { userId_dedupeKey: { userId: input.userId, dedupeKey: input.dedupeKey } },
      create: { ...input, type: input.type ?? 'INFO' },
      update: {},
    })
    return
  }
  await tx.notification.create({ data: { ...input, type: input.type ?? 'INFO' } })
}
