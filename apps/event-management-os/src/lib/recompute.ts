import type { Prisma, PrismaClient } from '@prisma/client'
import { computeTotals } from '@/lib/money'

type Tx = PrismaClient | Prisma.TransactionClient

/** Project progress = completed tasks / active tasks (cancelled excluded). */
export async function recomputeProjectProgress(tx: Tx, projectId: string) {
  const tasks = await tx.task.groupBy({ by: ['status'], where: { projectId, deletedAt: null, parentId: null }, _count: true })
  const total = tasks.filter((t) => t.status !== 'CANCELLED').reduce((a, t) => a + t._count, 0)
  const done = tasks.find((t) => t.status === 'COMPLETED')?._count ?? 0
  const progress = total ? Math.round((done / total) * 100) : 0
  await tx.project.update({ where: { id: projectId }, data: { progress } })
  return progress
}

export async function invoiceTotals(tx: Tx, invoiceId: string) {
  const inv = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { items: true, payments: true } })
  const totals = computeTotals(inv.items)
  const paid = inv.payments.filter((p) => p.status === 'PAID' && p.direction === 'INCOMING').reduce((a, p) => a + (p.kind === 'REFUND' ? -p.amount : p.amount), 0)
  return { inv, totals, paid, balance: totals.total - paid }
}

/** Keeps invoice status in sync with recorded payments. */
export async function recomputeInvoiceStatus(tx: Tx, invoiceId: string) {
  const { inv, totals, paid } = await invoiceTotals(tx, invoiceId)
  if (inv.status === 'CANCELLED' || inv.status === 'DRAFT') return inv.status
  let status = inv.status
  if (totals.total > 0 && paid >= totals.total) status = 'PAID'
  else if (paid > 0) status = 'PARTIALLY_PAID'
  else if (inv.dueDate && inv.dueDate < new Date()) status = 'OVERDUE'
  else status = 'SENT'
  if (status !== inv.status) await tx.invoice.update({ where: { id: invoiceId }, data: { status } })
  return status
}
