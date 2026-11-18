'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, ChevronDown, Search, Star } from 'lucide-react'
import { saveResource, type FormState } from '@/app/actions/resources'
import type { Field, RelationOption, RelationOptions } from '@/lib/resources/fields'
import type { FormValues } from '@/lib/resources/values'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FieldShell, Input, Select, Textarea, inputClass } from '@/components/ui/inputs'

export interface ResourceFormProps {
  resource: string
  fields: Field[]
  options: RelationOptions
  values: FormValues
  id?: string | null
  parents?: Record<string, string>
  onDone?: (state: FormState) => void
  submitLabel?: string
  navigateOnCreate?: boolean
  formId?: string
  hideActions?: boolean
  onPendingChange?: (pending: boolean) => void
}

export function ResourceForm({ resource, fields, options, values, id, parents, onDone, submitLabel, navigateOnCreate = true, formId, hideActions, onPendingChange }: ResourceFormProps) {
  const router = useRouter()
  const action = React.useMemo(() => saveResource.bind(null, resource, id ?? null), [resource, id])
  const [state, formAction, pending] = React.useActionState(action, { ok: false } as FormState)
  const handled = React.useRef<FormState | null>(null)
  React.useEffect(() => onPendingChange?.(pending), [pending, onPendingChange])

  React.useEffect(() => {
    if (state === handled.current || (!state.ok && !state.message)) return
    handled.current = state
    if (state.ok) {
      toast.success(state.message ?? 'Saved')
      onDone?.(state)
      if (!id && navigateOnCreate && state.href) router.push(state.href)
      else router.refresh()
    } else if (state.message) toast.error(state.message)
  }, [state, id, navigateOnCreate, onDone, router])

  const isCreate = !id
  const visible = fields.filter((f) => !(f.createOnly && !isCreate))
  const sections = groupBySection(visible)
  const errors = state.ok ? {} : state.errors ?? {}

  return (
    <form id={formId} action={formAction} className="space-y-6" noValidate>
      {Object.entries(parents ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name="__parent" value={`${k}:${v}`} />
      ))}
      {sections.map(([section, list]) => (
        <fieldset key={section} className="space-y-3">
          {section !== '_' && <legend className="mb-3 text-[11.5px] font-semibold tracking-wide text-muted uppercase">{section}</legend>}
          <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
            {list.map((f) => (
              <FieldInput key={f.name} field={f} value={values[f.name]} error={errors[f.name]} options={f.relation ? options[f.relation] : f.dynamicOptions ? options[f.dynamicOptions] : undefined} />
            ))}
          </div>
        </fieldset>
      ))}
      {!hideActions && (
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="submit" variant="primary" loading={pending}>
            {submitLabel ?? (isCreate ? 'Create' : 'Save changes')}
          </Button>
        </div>
      )}
    </form>
  )
}

function groupBySection(fields: Field[]) {
  const map = new Map<string, Field[]>()
  for (const f of fields) {
    const k = f.section ?? '_'
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(f)
  }
  return [...map.entries()]
}

function FieldInput({ field: f, value, error, options }: { field: Field; value: FormValues[string] | undefined; error?: string; options?: RelationOption[] }) {
  const id = `f-${f.name}`
  const common = { id, name: f.name, 'aria-invalid': error ? true : undefined, placeholder: f.placeholder }
  const str = typeof value === 'string' ? value : ''
  let control: React.ReactNode
  switch (f.type) {
    case 'textarea':
      control = <Textarea {...common} defaultValue={str} rows={3} />
      break
    case 'select':
      control = (
        <Select {...common} defaultValue={str}>
          {!f.required && <option value="">—</option>}
          {f.required && !str && <option value="">Select…</option>}
          {f.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      )
      break
    case 'relation':
      control = <Combobox name={f.name} id={id} options={options ?? []} defaultValue={str} invalid={!!error} placeholder={`Select ${f.label.toLowerCase()}…`} />
      break
    case 'multiselect':
      control = <MultiSelect name={f.name} options={options ?? f.options ?? []} defaultValue={Array.isArray(value) ? value : []} />
      break
    case 'boolean':
      return (
        <label className={cn('flex cursor-pointer items-center gap-2.5 self-end rounded-lg py-2 text-sm text-ink/90', f.wide && 'sm:col-span-2')}>
          <input type="checkbox" name={f.name} defaultChecked={value === true} className="size-4 rounded border-line-strong accent-[#F07F73]" />
          {f.label}
        </label>
      )
    case 'rating':
      control = <RatingInput name={f.name} defaultValue={Number(str) || 0} />
      break
    case 'money':
      control = (
        <div className="relative">
          <Input {...common} defaultValue={str} inputMode="decimal" className="pl-7 tabular" />
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">€</span>
        </div>
      )
      break
    case 'percent':
      control = (
        <div className="relative">
          <Input {...common} defaultValue={str} inputMode="decimal" className="pr-7 tabular" />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">%</span>
        </div>
      )
      break
    case 'number':
      control = <Input {...common} type="number" defaultValue={str} min={f.min} max={f.max} className="tabular" />
      break
    case 'date':
      control = <Input {...common} type="date" defaultValue={str} />
      break
    case 'datetime':
      control = <Input {...common} type="datetime-local" defaultValue={str} />
      break
    case 'time':
      control = <Input {...common} type="time" defaultValue={str} />
      break
    default:
      control = <Input {...common} type={f.type === 'tags' ? 'text' : f.type} defaultValue={str} />
  }
  return (
    <FieldShell label={f.label} htmlFor={id} required={f.required} error={error} help={f.help} className={cn(f.wide && 'sm:col-span-2')}>
      {control}
    </FieldShell>
  )
}

export function Combobox({ name, id, options, defaultValue, invalid, placeholder, onChange }: { name: string; id?: string; options: RelationOption[]; defaultValue?: string; invalid?: boolean; placeholder?: string; onChange?: (v: string) => void }) {
  const [value, setValue] = React.useState(defaultValue ?? '')
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState('')
  const ref = React.useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)
  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase()
    return (s ? options.filter((o) => o.label.toLowerCase().includes(s) || o.hint?.toLowerCase().includes(s)) : options).slice(0, 80)
  }, [q, options])
  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  const pick = (v: string) => {
    setValue(v)
    onChange?.(v)
    setOpen(false)
    setQ('')
  }
  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={value} />
      <button id={id} type="button" aria-invalid={invalid || undefined} onClick={() => setOpen((o) => !o)} className={cn(inputClass, 'flex items-center justify-between text-left')}>
        <span className={cn('truncate', !selected && 'text-muted/70')}>{selected ? selected.label : placeholder ?? 'Select…'}</span>
        <ChevronDown className="size-4 text-muted" />
      </button>
      {open && (
        <div className="animate-pop absolute z-50 mt-1 w-full rounded-xl border border-line bg-white p-1 shadow-pop">
          <div className="flex items-center gap-2 border-b border-line px-2 pb-1.5">
            <Search className="size-3.5 text-muted" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-7 w-full text-sm outline-none" />
          </div>
          <div className="scrollbar-thin max-h-60 overflow-y-auto pt-1">
            <button type="button" onClick={() => pick('')} className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-[13px] text-muted hover:bg-lightgray">
              None
            </button>
            {filtered.map((o) => (
              <button key={o.value} type="button" disabled={o.disabled} onClick={() => pick(o.value)} className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-lightgray disabled:cursor-not-allowed disabled:opacity-50">
                <span className="min-w-0">
                  <span className="block truncate text-ink">{o.label}</span>
                  {o.hint && <span className="block truncate text-[11px] text-muted">{o.hint}</span>}
                </span>
                {o.value === value && <Check className="size-3.5 text-coral" />}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-2.5 py-3 text-center text-xs text-muted">No results</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function MultiSelect({ name, options, defaultValue }: { name: string; options: { value: string; label: string }[]; defaultValue: string[] }) {
  const [values, setValues] = React.useState<string[]>(defaultValue)
  const toggle = (v: string) => setValues((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]))
  return (
    <div className="flex flex-wrap gap-1.5 rounded-lg border border-line-strong bg-white p-2 shadow-soft">
      {values.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
      {options.map((o) => {
        const on = values.includes(o.value)
        return (
          <button key={o.value} type="button" onClick={() => toggle(o.value)} className={cn('inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors', on ? 'border-coral/30 bg-coral-light text-coral-dark' : 'border-line bg-white text-ink/70 hover:border-line-strong')}>
            {on && <Check className="size-3" />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function RatingInput({ name, defaultValue }: { name: string; defaultValue: number }) {
  const [v, setV] = React.useState(defaultValue)
  return (
    <div className="flex h-9 items-center gap-1">
      <input type="hidden" name={name} value={v || ''} />
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => setV(i === v ? 0 : i)} aria-label={`${i} stars`}>
          <Star className={cn('size-5 transition-colors', i <= v ? 'fill-amber-400 text-amber-400' : 'text-line-strong hover:text-amber-300')} />
        </button>
      ))}
    </div>
  )
}
