import { toDateInput, toDateTimeInput } from '@/lib/dates'
import type { Field } from './fields'

export type FormValues = Record<string, string | boolean | string[]>

/** Serializes a DB record into form values (strings) for the client form. */
export function toFormValues(fields: Field[], record?: Record<string, unknown> | null, extra?: Record<string, unknown>): FormValues {
  const out: FormValues = {}
  const src = { ...(record ?? {}), ...(extra ?? {}) }
  for (const f of fields) {
    const v = src[f.name]
    if (v === undefined || v === null) {
      if (!record && f.defaultValue !== undefined) out[f.name] = Array.isArray(f.defaultValue) ? f.defaultValue : typeof f.defaultValue === 'boolean' ? f.defaultValue : String(f.defaultValue)
      continue
    }
    switch (f.type) {
      case 'money':
        out[f.name] = String((v as number) / 100)
        break
      case 'date':
        out[f.name] = toDateInput(v as Date)
        break
      case 'datetime':
        out[f.name] = toDateTimeInput(v as Date)
        break
      case 'boolean':
        out[f.name] = Boolean(v)
        break
      case 'tags':
        out[f.name] = (v as string[]).join(', ')
        break
      case 'multiselect':
        out[f.name] = Array.isArray(v) ? (v as unknown[]).map((x) => (typeof x === 'object' && x && 'id' in x ? String((x as { id: string }).id) : String(x))) : []
        break
      default:
        out[f.name] = String(v)
    }
  }
  return out
}
