'use client'

import { formatMoney } from '@/lib/money'
import { BarChart, HBarList, type BarSeries } from './bar-chart'

/** Client wrappers so server pages can pass a currency instead of a formatter function. */
export function MoneyFormat({ currency, labels, series }: { currency: string; labels: string[]; series: BarSeries[] }) {
  return <BarChart labels={labels} series={series} format={(n) => formatMoney(n, currency, { compact: true })} ariaLabel={series.map((s) => s.name).join(' vs ')} />
}
export function MoneyHBars({ currency, rows }: { currency: string; rows: { label: string; value: number; hint?: string }[] }) {
  return <HBarList rows={rows} format={(n) => formatMoney(n, currency, { compact: true })} />
}
export function CountHBars({ rows }: { rows: { label: string; value: number; hint?: string }[] }) {
  return <HBarList rows={rows} format={(n) => String(n)} />
}
