import { describe, expect, it } from 'vitest'
import { computeTotals, formatMoney, marginOf, toCents } from '@/lib/money'

describe('money', () => {
  it('parses decimal input into cents', () => {
    expect(toCents('12,5')).toBe(1250)
    expect(toCents('1 200.99')).toBe(120099)
    expect(toCents('')).toBeNull()
    expect(toCents('abc')).toBeNull()
  })
  it('computes totals with line + global discount and tax', () => {
    const t = computeTotals([{ quantity: 2, unitPrice: 10000, unitCost: 6000, discountPct: 10, taxRate: 20 }], 5)
    // gross 200 → line disc 180 → global 171 → tax 34.2 → total 205.2
    expect(t.subtotal).toBe(20000)
    expect(t.net).toBe(17100)
    expect(t.tax).toBe(3420)
    expect(t.total).toBe(20520)
    expect(t.cost).toBe(12000)
    expect(t.margin).toBe(5100)
  })
  it('margin percentage', () => {
    expect(marginOf(6000, 10000)).toEqual({ margin: 4000, pct: 40 })
    expect(marginOf(100, 0).pct).toBe(0)
  })
  it('formats currency', () => {
    expect(formatMoney(150000, 'EUR')).toBe('€1,500')
    expect(formatMoney(150050, 'EUR')).toBe('€1,500.50')
    expect(formatMoney(null)).toBe('—')
  })
})
