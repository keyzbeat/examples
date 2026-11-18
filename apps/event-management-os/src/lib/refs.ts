import type { Prisma, PrismaClient } from '@prisma/client'

type Tx = PrismaClient | Prisma.TransactionClient

export const REF_PREFIX = {
  client: 'CLI',
  lead: 'LEAD',
  project: 'PRJ',
  event: 'EVT',
  stay: 'STY',
  concierge: 'CON',
  partner: 'PAR',
  supplier: 'SUP',
  service: 'SRV',
  task: 'TSK',
  quote: 'Q',
  invoice: 'INV',
} as const
export type RefKey = keyof typeof REF_PREFIX

/** Atomically increments a per-organization counter and returns a human reference (e.g. PRJ-0042, Q-2026-0007). */
export async function nextRef(tx: Tx, organizationId: string, key: RefKey) {
  const yearly = key === 'quote' || key === 'invoice'
  const counterKey = yearly ? `${key}:${new Date().getFullYear()}` : key
  const counter = await tx.counter.upsert({
    where: { organizationId_key: { organizationId, key: counterKey } },
    create: { organizationId, key: counterKey, value: 1 },
    update: { value: { increment: 1 } },
  })
  const n = String(counter.value).padStart(4, '0')
  return yearly ? `${REF_PREFIX[key]}-${new Date().getFullYear()}-${n}` : `${REF_PREFIX[key]}-${n}`
}
