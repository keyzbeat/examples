import Link from 'next/link'
import type { Field, RelationOptions } from '@/lib/resources/fields'
import { formatMoney } from '@/lib/money'
import { formatDate, formatDateTime } from '@/lib/dates'
import { OptBadge } from '@/components/ui/badge'
import { RatingStars } from '@/components/ui/rating'
import { InfoGrid } from './detail'

const RELATION_PATH: Record<string, string> = { client: '/clients', project: '/projects', supplier: '/suppliers', partner: '/partners', event: '/events', stay: '/stays', lead: '/leads' }

export function renderValue(f: Field, value: unknown, options: RelationOptions, currency = 'EUR'): React.ReactNode {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)) return null
  switch (f.type) {
    case 'money':
      return formatMoney(value as number, currency)
    case 'percent':
      return `${value}%`
    case 'date':
      return formatDate(value as Date)
    case 'datetime':
      return formatDateTime(value as Date)
    case 'boolean':
      return value ? 'Yes' : 'No'
    case 'rating':
      return <RatingStars value={value as number} />
    case 'select':
      return f.options?.some((o) => o.tone) ? <OptBadge options={f.options} value={value as string} /> : f.options?.find((o) => o.value === value)?.label ?? String(value)
    case 'relation': {
      const label = options[f.relation!]?.find((o) => o.value === value)?.label ?? '—'
      const base = RELATION_PATH[f.relation!]
      return base ? <Link className="hover:text-coral-dark" href={`${base}/${value}`}>{label}</Link> : label
    }
    case 'url':
      return <a className="text-coral-dark hover:underline" href={String(value)} target="_blank" rel="noreferrer">{String(value).replace(/^https?:\/\//, '')}</a>
    case 'email':
      return <a className="hover:text-coral-dark" href={`mailto:${value}`}>{String(value)}</a>
    case 'multiselect':
      return (value as { name: string }[]).map((c) => c.name).join(', ')
    case 'tags':
      return (value as string[]).join(', ')
    default:
      return String(value)
  }
}

/** Auto-renders a record's fields as a definition grid, grouped by section. */
export function FieldValues({ fields, record, options, currency, exclude = [], sections }: { fields: Field[]; record: Record<string, unknown>; options: RelationOptions; currency?: string; exclude?: string[]; sections?: string[] }) {
  const visible = fields.filter((f) => !f.createOnly && !exclude.includes(f.name) && (!sections || sections.includes(f.section ?? '')))
  return <InfoGrid cols={3} items={visible.map((f) => ({ label: f.label, value: renderValue(f, record[f.name], options, currency), wide: f.type === 'textarea' }))} />
}
