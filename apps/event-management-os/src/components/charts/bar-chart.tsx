'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Minimal grouped bar chart (SVG). Validated categorical palette (light surface):
 * series 1 #E8665A (coral), series 2 #3B76C4 (blue) — CVD ΔE 17.8, contrast ≥ 3:1.
 * One y-axis, thin bars with 4px rounded data-ends, 2px gaps, hover tooltip, legend, table view.
 */
export const SERIES_COLORS = ['#E8665A', '#3B76C4']

export interface BarSeries {
  name: string
  values: number[]
}

export function BarChart({ labels, series, format, height = 220, ariaLabel }: { labels: string[]; series: BarSeries[]; format: (n: number) => string; height?: number; ariaLabel: string }) {
  const [hover, setHover] = React.useState<number | null>(null)
  const [table, setTable] = React.useState(false)
  const max = Math.max(1, ...series.flatMap((s) => s.values))
  const nice = niceMax(max)
  const W = 640
  const H = height
  const pad = { l: 48, r: 8, t: 10, b: 24 }
  const iw = W - pad.l - pad.r
  const ih = H - pad.t - pad.b
  const group = iw / labels.length
  const barW = Math.min(22, (group * 0.62) / series.length)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * nice)
  const y = (v: number) => pad.t + ih - (v / nice) * ih
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {series.length > 1 &&
            series.map((s, i) => (
              <span key={s.name} className="inline-flex items-center gap-1.5 text-xs text-muted">
                <span className="size-2.5 rounded-sm" style={{ background: SERIES_COLORS[i] }} />
                {s.name}
              </span>
            ))}
        </div>
        <button onClick={() => setTable((t) => !t)} className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline">
          {table ? 'Show chart' : 'Show table'}
        </button>
      </div>
      {table ? (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-1 font-medium">Period</th>
              {series.map((s) => <th key={s.name} className="py-1 text-right font-medium">{s.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {labels.map((l, i) => (
              <tr key={l} className="border-t border-line">
                <td className="py-1.5">{l}</td>
                {series.map((s) => <td key={s.name} className="tabular py-1.5 text-right">{format(s.values[i] ?? 0)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#ECEBE8" strokeWidth={1} />
                <text x={pad.l - 8} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill="#777">{format(t)}</text>
              </g>
            ))}
            {labels.map((l, i) => {
              const gx = pad.l + group * i
              const total = series.length * barW + (series.length - 1) * 2
              return (
                <g key={l} onMouseEnter={() => setHover(i)}>
                  <rect x={gx} y={pad.t} width={group} height={ih} fill={hover === i ? '#F5F1ED' : 'transparent'} />
                  {series.map((s, si) => {
                    const v = Math.max(0, s.values[i] ?? 0)
                    const x = gx + (group - total) / 2 + si * (barW + 2)
                    const h = (v / nice) * ih
                    return <path key={s.name} d={roundedTop(x, pad.t + ih - h, barW, h, Math.min(4, h))} fill={SERIES_COLORS[si]} />
                  })}
                  <text x={gx + group / 2} y={H - 6} textAnchor="middle" fontSize={10.5} fill="#777">{l}</text>
                </g>
              )
            })}
          </svg>
          {hover !== null && (
            <div className={cn('pointer-events-none absolute top-1 z-10 rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-pop')} style={{ left: `${((pad.l + group * (hover + 0.5)) / W) * 100}%`, transform: 'translateX(-50%)' }}>
              <p className="mb-1 font-medium text-ink">{labels[hover]}</p>
              {series.map((s, si) => (
                <p key={s.name} className="flex items-center gap-1.5 text-ink/80">
                  <span className="size-2 rounded-sm" style={{ background: SERIES_COLORS[si] }} />
                  {s.name}: <span className="tabular font-medium text-ink">{format(s.values[hover] ?? 0)}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Horizontal single-series bars with direct value labels (e.g. pipeline by stage). */
export function HBarList({ rows, format }: { rows: { label: string; value: number; hint?: string }[]; format: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${format(r.value)}${r.hint ? ` · ${r.hint}` : ''}`}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-ink/80">{r.label}</span>
            <span className="tabular text-muted">{format(r.value)}{r.hint && ` · ${r.hint}`}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-lightgray">
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: SERIES_COLORS[0] }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function niceMax(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return ''
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`
}
