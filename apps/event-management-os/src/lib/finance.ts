import 'server-only'
import { prisma } from '@/lib/prisma'
import { computeTotals } from '@/lib/money'
import { addDays, startOfDay, startOfMonth } from '@/lib/dates'

/** Finance metrics. Revenue/expenses are cash-based (paid payments); forecasts use pending payments & approved quotes. */
export async function getFinance(organizationId: string, months = 6) {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)
  const [paid, pending, approvedQuotes, commissions, invoices] = await Promise.all([
    prisma.payment.findMany({ where: { organizationId, status: 'PAID', paidAt: { gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) } } }),
    prisma.payment.findMany({ where: { organizationId, status: 'PENDING' }, include: { supplier: { select: { companyName: true } }, invoice: { select: { ref: true, id: true, client: { select: { firstName: true, lastName: true, company: true } } } }, project: { select: { id: true, name: true } } }, orderBy: { dueDate: 'asc' } }),
    prisma.quotation.findMany({ where: { organizationId, deletedAt: null, status: 'APPROVED' }, include: { items: true, invoices: { include: { items: true } } } }),
    prisma.commission.findMany({ where: { organizationId }, include: { partner: { select: { companyName: true } } } }),
    prisma.invoice.findMany({ where: { organizationId, deletedAt: null, status: { notIn: ['CANCELLED', 'DRAFT'] } }, include: { items: true, payments: true } }),
  ])
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const series = Array.from({ length: months }, (_, i) => {
    const d = new Date(from.getFullYear(), from.getMonth() + i, 1)
    const k = monthKey(d)
    const inc = paid.filter((p) => p.direction === 'INCOMING' && p.paidAt && monthKey(p.paidAt) === k).reduce((a, p) => a + (p.kind === 'REFUND' ? -p.amount : p.amount), 0)
    const out = paid.filter((p) => p.direction === 'OUTGOING' && p.paidAt && monthKey(p.paidAt) === k).reduce((a, p) => a + p.amount, 0)
    return { key: k, label: d.toLocaleDateString('en-GB', { month: 'short' }), revenue: inc, expenses: out, profit: inc - out }
  })
  const ytdStart = new Date(now.getFullYear(), 0, 1)
  const ytd = paid.filter((p) => p.paidAt && p.paidAt >= ytdStart)
  const revenueYtd = ytd.filter((p) => p.direction === 'INCOMING').reduce((a, p) => a + p.amount, 0)
  const expensesYtd = ytd.filter((p) => p.direction === 'OUTGOING').reduce((a, p) => a + p.amount, 0)
  const monthStart = startOfMonth()
  const revenueMonth = paid.filter((p) => p.direction === 'INCOMING' && p.paidAt && p.paidAt >= monthStart).reduce((a, p) => a + p.amount, 0)
  const pendingIn = pending.filter((p) => p.direction === 'INCOMING')
  const pendingOut = pending.filter((p) => p.direction === 'OUTGOING')
  const overdueIn = pendingIn.filter((p) => p.dueDate && p.dueDate < startOfDay())
  // Backlog: approved quotes not yet invoiced (net amount).
  const backlog = approvedQuotes.reduce((a, q) => {
    const total = computeTotals(q.items, q.discountPct).total
    const invoiced = q.invoices.filter((i) => i.status !== 'CANCELLED').reduce((s, i) => s + computeTotals(i.items).total, 0)
    return a + Math.max(0, total - invoiced)
  }, 0)
  const grossMarginApproved = approvedQuotes.reduce((a, q) => a + computeTotals(q.items, q.discountPct).margin, 0)
  const netApproved = approvedQuotes.reduce((a, q) => a + computeTotals(q.items, q.discountPct).net, 0)
  const receivables = invoices.reduce((a, i) => a + computeTotals(i.items).total - i.payments.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0), 0)
  const next30In = pendingIn.filter((p) => !p.dueDate || p.dueDate <= addDays(now, 30)).reduce((a, p) => a + p.amount, 0)
  const next30Out = pendingOut.filter((p) => !p.dueDate || p.dueDate <= addDays(now, 30)).reduce((a, p) => a + p.amount, 0)
  return {
    series,
    revenueYtd,
    expensesYtd,
    profitYtd: revenueYtd - expensesYtd,
    revenueMonth,
    pendingIn,
    pendingOut,
    overdueIn,
    receivables,
    backlog,
    grossMarginPct: netApproved ? Math.round((grossMarginApproved / netApproved) * 1000) / 10 : 0,
    grossMarginApproved,
    commissions,
    forecast: { in30: next30In, out30: next30Out, net30: next30In - next30Out },
  }
}
