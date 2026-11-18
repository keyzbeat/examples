/** Field schema shared by server (validation/persistence) and client (forms). Plain data only. */
import type { Opt } from '@/lib/options'

export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'url'
  | 'textarea'
  | 'number'
  | 'money'
  | 'percent'
  | 'date'
  | 'datetime'
  | 'time'
  | 'select'
  | 'multiselect'
  | 'relation'
  | 'boolean'
  | 'rating'
  | 'tags'

export type RelationKind = 'client' | 'user' | 'project' | 'supplier' | 'partner' | 'event' | 'stay' | 'lead'

export interface Field {
  name: string
  label: string
  type: FieldType
  required?: boolean
  options?: Opt[]
  /** For multiselect fields whose options come from the DB (supplier categories). */
  dynamicOptions?: 'supplierCategories'
  relation?: RelationKind
  placeholder?: string
  help?: string
  section?: string
  wide?: boolean
  min?: number
  max?: number
  defaultValue?: string | number | boolean | string[]
  /** Only on create forms. */
  createOnly?: boolean
}

export interface RelationOption {
  value: string
  label: string
  hint?: string
  disabled?: boolean
}
export type RelationOptions = Partial<Record<RelationKind | 'supplierCategories', RelationOption[]>>
