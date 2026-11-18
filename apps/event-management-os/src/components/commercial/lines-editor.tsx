'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Lock, Plus, Trash2 } from 'lucide-react'
import { saveLines, type LineInput } from '@/app/actions/commercial'
import { computeTotals, formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/resource/resource-form'

interface CatalogItem { id: string; name: string; price: number; cost: number; taxRate: number; unit: string; category: string; disabled?: boolean }
type Row = LineInput & { key: string }

const num = (v: string) => (v === '' ? 0 : Number(v.replace(',', '.')))

export function LinesEditor({ kind, id, initial, catalog, currency, locked, globalDiscount = 0, showCosts, defaultTax }: { kind: 'quote' | 'invoice'; id: string; initial: LineInput[]; catalog: CatalogItem[]; currency: string; locked: boolean; globalDiscount?: number; showCosts: boolean; defaultTax: number }) {
  const [rows, setRows] = React.useState<Row[]>(initial.map((l, i) => ({ ...l, key: String(i) })))
  const [dirty, setDirty] = React.useState(false)
  const [pending, start] = React.useTransition()
  const router = useRouter()
  const update = (key: string, patch: Partial<LineInput>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
    setDirty(true)
  }
  const add = (item?: CatalogItem) => {
    setRows((rs) => [...rs, { key: crypto.randomUUID(), serviceId: item?.id ?? null, description: item?.name ?? '', quantity: 1, unitPrice: item?.price ?? 0, unitCost: item?.cost ?? 0, discountPct: 0, taxRate: item?.taxRate ?? defaultTax }])
    setDirty(true)
  }
  const move = (i: number, d: number) => {
    setRows((rs) => {
      const n = [...rs]
      const j = i + d
      if (j < 0 || j >= n.length) return rs
      ;[n[i], n[j]] = [n[j]!, n[i]!]
      return n
    })
    setDirty(true)
  }
  const totals = computeTotals(rows, globalDiscount)
  const save = () =>
    start(async () => {
      const r = await saveLines(kind, id, rows.map(({ key: _k, ...l }) => l))
      if (r.ok) { toast.success(r.message); setDirty(false); router.refresh() } else toast.error(r.message)
    })
  const cell = 'h-8 w-full rounded-md border border-transparent bg-transparent px-2 text-[13px] outline-none hover:border-line focus:border-coral focus:bg-white disabled:hover:border-transparent'
  return (
    <div>
      {locked && <div className="flex items-center gap-2 border-b border-line bg-offwhite px-4 py-2 text-xs text-muted"><Lock className="size-3.5" /> Locked — {kind === 'quote' ? 'approved quotes cannot be edited (duplicate it instead)' : 'paid or cancelled invoices cannot be edited'}.</div>}
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[820px] text-[13px]">
          <thead>
            <tr className="text-left text-[11px] tracking-wide text-ink/50 uppercase [&>th]:border-b [&>th]:border-line [&>th]:bg-beige/50 [&>th]:px-2 [&>th]:py-2 [&>th]:font-medium [&>th:first-child]:pl-4">
              <th>Description</th>
              <th className="w-20 text-right">Qty</th>
              <th className="w-28 text-right">Unit price</th>
              {showCosts && kind === 'quote' && <th className="w-24 text-right">Unit cost</th>}
              <th className="w-20 text-right">Disc. %</th>
              <th className="w-20 text-right">Tax %</th>
              <th className="w-28 text-right">Total HT</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const lineNet = r.quantity * r.unitPrice * (1 - r.discountPct / 100)
              return (
                <tr key={r.key} className="border-b border-line [&>td]:px-1 [&>td]:py-1 [&>td:first-child]:pl-3">
                  <td><input disabled={locked} value={r.description} onChange={(e) => update(r.key, { description: e.target.value })} className={cn(cell, !r.description && 'border-red-200')} placeholder="Description" /></td>
                  <td><input disabled={locked} inputMode="decimal" value={r.quantity} onChange={(e) => update(r.key, { quantity: num(e.target.value) })} className={cn(cell, 'tabular text-right')} /></td>
                  <td><input disabled={locked} inputMode="decimal" defaultValue={r.unitPrice / 100} onBlur={(e) => update(r.key, { unitPrice: Math.round(num(e.target.value) * 100) })} className={cn(cell, 'tabular text-right')} /></td>
                  {showCosts && kind === 'quote' && <td><input disabled={locked} inputMode="decimal" defaultValue={(r.unitCost ?? 0) / 100} onBlur={(e) => update(r.key, { unitCost: Math.round(num(e.target.value) * 100) })} className={cn(cell, 'tabular text-right text-muted')} /></td>}
                  <td><input disabled={locked} inputMode="decimal" value={r.discountPct} onChange={(e) => update(r.key, { discountPct: num(e.target.value) })} className={cn(cell, 'tabular text-right')} /></td>
                  <td><input disabled={locked} inputMode="decimal" value={r.taxRate} onChange={(e) => update(r.key, { taxRate: num(e.target.value) })} className={cn(cell, 'tabular text-right')} /></td>
                  <td className="tabular pr-2 text-right font-medium">{formatMoney(Math.round(lineNet), currency)}</td>
                  <td>
                    {!locked && (
                      <div className="flex justify-end">
                        <button onClick={() => move(i, -1)} className="rounded p-1 text-muted hover:bg-lightgray" aria-label="Move up"><ArrowUp className="size-3.5" /></button>
                        <button onClick={() => move(i, 1)} className="rounded p-1 text-muted hover:bg-lightgray" aria-label="Move down"><ArrowDown className="size-3.5" /></button>
                        <button onClick={() => { setRows((rs) => rs.filter((x) => x.key !== r.key)); setDirty(true) }} className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Remove"><Trash2 className="size-3.5" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-sm text-muted">No lines yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between">
        {!locked ? (
          <div className="flex w-full max-w-md flex-col gap-2">
            <Combobox key={rows.length} name="svc" options={catalog.map((c) => ({ value: c.id, label: c.name, hint: `${c.category} · ${formatMoney(c.price, currency)} / ${c.unit}`, disabled: c.disabled }))} placeholder="Add a service from the catalog…" onChange={(v) => { const c = catalog.find((x) => x.id === v); if (c) add(c) }} />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => add()}><Plus /> Custom line</Button>
              <Button size="sm" variant="primary" disabled={!dirty} loading={pending} onClick={save} className="ml-auto">Save lines</Button>
            </div>
            {dirty && <p className="text-xs text-amber-700">Unsaved changes</p>}
          </div>
        ) : <span />}
        <dl className="w-full max-w-xs space-y-1.5 text-[13px]">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular">{formatMoney(totals.subtotal, currency)}</dd></div>
          {totals.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discounts{globalDiscount ? ` (incl. ${globalDiscount}% global)` : ''}</dt><dd className="tabular">−{formatMoney(totals.discount, currency)}</dd></div>}
          <div className="flex justify-between"><dt className="text-muted">Net (excl. tax)</dt><dd className="tabular">{formatMoney(totals.net, currency)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Tax</dt><dd className="tabular">{formatMoney(totals.tax, currency)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Total</dt><dd className="tabular">{formatMoney(totals.total, currency)}</dd></div>
          {showCosts && kind === 'quote' && <div className="flex justify-between text-xs text-emerald-700"><dt>Gross margin</dt><dd className="tabular">{formatMoney(totals.margin, currency)} ({totals.marginPct}%)</dd></div>}
        </dl>
      </div>
    </div>
  )
}
