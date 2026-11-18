'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { addServiceLine, removeServiceLine, updateServiceLine } from '@/app/actions/projects'
import { formatMoney } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/inputs'
import { Combobox } from '@/components/resource/resource-form'

export interface Line {
  id: string
  name: string
  category: string
  unit: string
  supplier: string | null
  quantity: number
  unitCost: number
  unitPrice: number
}

export function ServiceLines({ target, targetId, lines, catalog, currency, canWrite, showCosts }: { target: 'project' | 'event'; targetId: string; lines: Line[]; catalog: { value: string; label: string; hint?: string; disabled?: boolean }[]; currency: string; canWrite: boolean; showCosts: boolean }) {
  const router = useRouter()
  const [serviceId, setServiceId] = React.useState('')
  const [qty, setQty] = React.useState('1')
  const [pending, start] = React.useTransition()
  const run = (p: Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const r = await p
      if (r.ok) toast.success(r.message)
      else toast.error(r.message)
      router.refresh()
    })
  const totals = lines.reduce((a, l) => ({ price: a.price + l.quantity * l.unitPrice, cost: a.cost + l.quantity * l.unitCost }), { price: 0, cost: 0 })
  const margin = totals.price - totals.cost
  return (
    <div>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="text-left text-[11px] tracking-wide text-ink/50 uppercase [&>th]:border-b [&>th]:border-line [&>th]:bg-beige/50 [&>th]:px-3 [&>th]:py-2 [&>th]:font-medium [&>th:first-child]:pl-4">
              <th>Service</th>
              <th className="w-24">Qty</th>
              <th className="text-right">Unit price</th>
              {showCosts && <th className="text-right">Unit cost</th>}
              <th className="text-right">Total</th>
              {showCosts && <th className="text-right">Margin</th>}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-line [&>td]:px-3 [&>td]:py-2 [&>td:first-child]:pl-4">
                <td>
                  <div className="font-medium text-ink">{l.name}</div>
                  <div className="text-xs text-muted">
                    {l.category}
                    {l.supplier && ` · ${l.supplier}`}
                  </div>
                </td>
                <td>
                  {canWrite ? (
                    <Input type="number" min={1} defaultValue={l.quantity} className="h-8 w-20 tabular" onBlur={(e) => Number(e.target.value) !== l.quantity && run(updateServiceLine(l.id, { quantity: Number(e.target.value) }))} />
                  ) : (
                    <span className="tabular">{l.quantity}</span>
                  )}
                  <span className="ml-1 text-xs text-muted">{l.unit}</span>
                </td>
                <td className="tabular text-right">{formatMoney(l.unitPrice, currency)}</td>
                {showCosts && <td className="tabular text-right text-muted">{formatMoney(l.unitCost, currency)}</td>}
                <td className="tabular text-right font-medium">{formatMoney(l.quantity * l.unitPrice, currency)}</td>
                {showCosts && <td className="tabular text-right text-emerald-700">{formatMoney(l.quantity * (l.unitPrice - l.unitCost), currency)}</td>}
                <td>
                  {canWrite && (
                    <button onClick={() => run(removeServiceLine(l.id))} className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Remove line">
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted">
                  No services yet — add items from the catalog.
                </td>
              </tr>
            )}
          </tbody>
          {lines.length > 0 && (
            <tfoot>
              <tr className="bg-offwhite font-medium [&>td]:px-3 [&>td]:py-2.5 [&>td:first-child]:pl-4">
                <td colSpan={showCosts ? 4 : 3} className="text-right text-muted">
                  Totals (excl. tax)
                </td>
                <td className="tabular text-right">{formatMoney(totals.price, currency)}</td>
                {showCosts && (
                  <td className="tabular text-right text-emerald-700">
                    {formatMoney(margin, currency)} <span className="text-xs text-muted">({totals.price ? Math.round((margin / totals.price) * 100) : 0}%)</span>
                  </td>
                )}
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {canWrite && (
        <div className="flex flex-col gap-2 border-t border-line p-3 sm:flex-row">
          <div className="flex-1">
            <Combobox key={lines.length} name="serviceId" options={catalog} placeholder="Add a service from the catalog…" onChange={setServiceId} />
          </div>
          <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className="w-24 tabular" aria-label="Quantity" />
          <Button
            variant="primary"
            disabled={!serviceId}
            loading={pending}
            onClick={() => {
              run(addServiceLine(target, targetId, serviceId, Number(qty)))
              setServiceId('')
              setQty('1')
            }}
          >
            <Plus /> Add
          </Button>
        </div>
      )}
    </div>
  )
}
