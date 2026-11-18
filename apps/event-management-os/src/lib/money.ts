/** All amounts are integer cents. */

export function toCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === '') return null
  const n = typeof input === 'number' ? input : Number(String(input).replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}

export function fromCents(cents: number | null | undefined): number | null {
  if (cents === null || cents === undefined) return null
  return cents / 100
}

export function formatMoney(cents: number | null | undefined, currency = 'EUR', opts: { compact?: boolean } = {}) {
  if (cents === null || cents === undefined) return '—'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    notation: opts.compact ? 'compact' : 'standard',
    minimumFractionDigits: opts.compact || cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: opts.compact ? 1 : cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}

export interface LineInput {
  quantity: number
  unitPrice: number // cents
  unitCost?: number // cents
  discountPct?: number
  taxRate?: number
}

export interface Totals {
  subtotal: number
  discount: number
  net: number
  tax: number
  total: number
  cost: number
  margin: number
  marginPct: number
}

/** Computes document totals. Line discounts apply first, then the global discount, then tax. */
export function computeTotals(lines: LineInput[], globalDiscountPct = 0): Totals {
  let subtotal = 0
  let lineNet = 0
  let tax = 0
  let cost = 0
  const g = 1 - (globalDiscountPct || 0) / 100
  for (const l of lines) {
    const gross = l.quantity * l.unitPrice
    const afterLine = gross * (1 - (l.discountPct || 0) / 100)
    const net = afterLine * g
    subtotal += gross
    lineNet += net
    tax += net * ((l.taxRate ?? 0) / 100)
    cost += l.quantity * (l.unitCost || 0)
  }
  const net = Math.round(lineNet)
  const margin = net - Math.round(cost)
  return {
    subtotal: Math.round(subtotal),
    discount: Math.round(subtotal - lineNet),
    net,
    tax: Math.round(tax),
    total: Math.round(lineNet + tax),
    cost: Math.round(cost),
    margin,
    marginPct: net > 0 ? Math.round((margin / net) * 1000) / 10 : 0,
  }
}

export function marginOf(cost: number, price: number) {
  const margin = price - cost
  return { margin, pct: price > 0 ? Math.round((margin / price) * 1000) / 10 : 0 }
}
