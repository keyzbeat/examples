import 'server-only'
import type { Ctx } from '@/lib/auth/context'
import { sp, type SP } from '@/lib/url'
import { getResource, type ResourceKey } from './registry'
import { listRecords, loadRelationOptions, relationKindsOf } from './server'
import { toFormValues } from './values'
import type { RelationOptions } from './fields'

export async function prepareForm(ctx: Ctx, key: ResourceKey, record?: Record<string, unknown> | null, extra?: Record<string, unknown>, options?: RelationOptions) {
  const def = getResource(key)
  const opts = options ?? (await loadRelationOptions(ctx, relationKindsOf(def)))
  return { resource: key, fields: def.fields, options: opts, values: toFormValues(def.fields, record, extra), id: (record?.id as string | undefined) ?? null }
}

/** Loads rows + everything a list page needs (filters, form options, pagination). */
export async function prepareList<T = Record<string, unknown>>(ctx: Ctx, key: ResourceKey, params: SP, include?: Record<string, unknown>, extraWhere?: Record<string, unknown>, pageSize?: number) {
  const def = getResource(key)
  const filters: Record<string, string | undefined> = {}
  for (const f of def.filters) filters[f.name] = sp(params, f.name)
  const options = await loadRelationOptions(ctx, relationKindsOf(def))
  const list = await listRecords<T>(ctx, def, { q: sp(params, 'q'), page: Number(sp(params, 'page') ?? 1), sort: sp(params, 'sort'), filters, extraWhere, pageSize }, include)
  const toolbarFilters = def.filters.map((f) => ({
    name: f.name,
    label: f.label,
    options: f.options ?? (f.relation ? options[f.relation] : f.dynamicOptions ? options[f.dynamicOptions] : undefined) ?? [],
  }))
  const form = await prepareForm(ctx, key, null, undefined, options)
  return { def, ...list, options, toolbarFilters, form, canWrite: ctx.can(def.permission, 'write'), canDelete: ctx.can(def.permission, 'delete') }
}
