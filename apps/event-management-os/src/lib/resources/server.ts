import 'server-only'
import { z } from 'zod'
import { Prisma, type PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { Ctx } from '@/lib/auth/context'
import { toCents } from '@/lib/money'
import { normalizeEmail, normalizeName, fullName } from '@/lib/utils'
import type { Field, RelationKind, RelationOptions } from './fields'
import type { ResourceDef } from './registry'

type Tx = PrismaClient | Prisma.TransactionClient
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDelegate = any

export function delegate(tx: Tx, def: ResourceDef): AnyDelegate {
  return (tx as unknown as Record<string, AnyDelegate>)[def.model]
}

/** Fields that drive behaviour but are not database columns. */
export const VIRTUAL_FIELDS = new Set(['applyChecklist'])

/** Parent links that may be passed as hidden inputs (`__parent=invoiceId:xyz`), per resource. */
const ALLOWED_PARENTS: Record<string, string[]> = {
  payments: ['invoiceId'],
  reservations: ['stayId', 'eventId'],
  tasks: ['parentId', 'projectId', 'eventId', 'clientId', 'leadId'],
  calendar: ['projectId', 'clientId'],
  quotes: ['projectId', 'clientId'],
  invoices: ['projectId', 'clientId', 'quotationId'],
  events: ['projectId', 'clientId'],
  stays: ['projectId', 'clientId'],
  concierge: ['projectId', 'clientId'],
  projects: ['clientId'],
}

const RELATION_MODEL: Record<RelationKind | 'parentId' | 'invoiceId' | 'quotationId' | 'stayId', string> = {
  client: 'client',
  user: 'user',
  project: 'project',
  supplier: 'supplier',
  partner: 'partner',
  event: 'event',
  stay: 'stay',
  lead: 'lead',
  parentId: 'task',
  invoiceId: 'invoice',
  quotationId: 'quotation',
  stayId: 'stay',
}
const PARENT_RELATION: Record<string, keyof typeof RELATION_MODEL> = {
  invoiceId: 'invoiceId',
  stayId: 'stayId',
  eventId: 'event',
  parentId: 'parentId',
  projectId: 'project',
  clientId: 'client',
  leadId: 'lead',
  quotationId: 'quotationId',
}

export type FieldErrors = Record<string, string>

const emailSchema = z.string().email()

/** Converts FormData into typed column values, validating each field. */
export function parseForm(fields: Field[], form: FormData, isCreate: boolean) {
  const data: Record<string, unknown> = {}
  const virtual: Record<string, unknown> = {}
  const errors: FieldErrors = {}
  for (const f of fields) {
    if (f.createOnly && !isCreate) continue
    const raw = form.get(f.name)
    const str = typeof raw === 'string' ? raw.trim() : ''
    let value: unknown = null
    switch (f.type) {
      case 'boolean':
        value = raw === 'on' || raw === 'true'
        break
      case 'multiselect':
        value = form.getAll(f.name).map(String).filter(Boolean)
        if (f.required && (value as string[]).length === 0) errors[f.name] = 'Select at least one option.'
        break
      case 'tags':
        value = str ? str.split(',').map((s) => s.trim()).filter(Boolean) : []
        break
      case 'number':
      case 'rating': {
        if (str === '') value = null
        else {
          const n = Number(str)
          if (!Number.isFinite(n)) errors[f.name] = 'Enter a valid number.'
          else if (f.min !== undefined && n < f.min) errors[f.name] = `Minimum is ${f.min}.`
          else if (f.max !== undefined && n > f.max) errors[f.name] = `Maximum is ${f.max}.`
          else value = Math.round(n)
        }
        break
      }
      case 'percent': {
        if (str === '') value = null
        else {
          const n = Number(str.replace(',', '.'))
          if (!Number.isFinite(n) || n < 0 || n > 100) errors[f.name] = 'Enter a percentage between 0 and 100.'
          else value = n
        }
        break
      }
      case 'money': {
        const c = toCents(str)
        if (str !== '' && c === null) errors[f.name] = 'Enter a valid amount.'
        else if (c !== null && c < 0) errors[f.name] = 'Amount cannot be negative.'
        value = c
        break
      }
      case 'date':
        value = str ? new Date(`${str}T00:00:00`) : null
        if (value && isNaN((value as Date).getTime())) errors[f.name] = 'Invalid date.'
        break
      case 'datetime':
        value = str ? new Date(str) : null
        if (value && isNaN((value as Date).getTime())) errors[f.name] = 'Invalid date.'
        break
      case 'email':
        value = str || null
        if (str && !emailSchema.safeParse(str).success) errors[f.name] = 'Enter a valid email address.'
        break
      case 'url':
        value = str ? (/^https?:\/\//i.test(str) ? str : `https://${str}`) : null
        break
      case 'select':
        value = str || null
        if (str && f.options && !f.options.some((o) => o.value === str)) errors[f.name] = 'Invalid option.'
        break
      default:
        value = str || null
    }
    if (f.required && (value === null || value === '') && !errors[f.name]) errors[f.name] = `${f.label} is required.`
    if (VIRTUAL_FIELDS.has(f.name)) virtual[f.name] = value
    else data[f.name] = value
  }
  // Non-nullable defaults: when a select has a default and was left empty, keep the default.
  for (const f of fields) {
    if (f.type === 'select' && data[f.name] === null && f.defaultValue !== undefined) data[f.name] = f.defaultValue
    if ((f.type === 'number' || f.type === 'percent') && data[f.name] === null && f.defaultValue !== undefined) data[f.name] = f.defaultValue
  }
  return { data, virtual, errors }
}

export function parseParents(def: ResourceDef, form: FormData) {
  const out: Record<string, string> = {}
  for (const raw of form.getAll('__parent')) {
    const [k, v] = String(raw).split(':')
    if (k && v && ALLOWED_PARENTS[def.key]?.includes(k)) out[k] = v
  }
  return out
}

/** Ensures every referenced id belongs to the caller's organization (tenant isolation). */
export async function assertRelationsInOrg(tx: Tx, ctx: Ctx, fields: Field[], data: Record<string, unknown>, parents: Record<string, string>, existing?: Record<string, unknown> | null) {
  const errors: FieldErrors = {}
  const checks: { key: string; model: string; id: string }[] = []
  for (const f of fields) {
    if (f.type === 'relation' && f.relation && typeof data[f.name] === 'string') checks.push({ key: f.name, model: RELATION_MODEL[f.relation], id: data[f.name] as string })
  }
  for (const [k, id] of Object.entries(parents)) checks.push({ key: k, model: RELATION_MODEL[PARENT_RELATION[k]!], id })
  for (const c of checks) {
    const d = (tx as unknown as Record<string, AnyDelegate>)[c.model]
    const where: Record<string, unknown> = { id: c.id, organizationId: ctx.org.id }
    const found = await d.findFirst({ where, select: c.model === 'supplier' ? { id: true, status: true, companyName: true } : { id: true } })
    if (!found) errors[c.key] = 'Selected record was not found.'
    else if (c.model === 'supplier' && existing?.[c.key] !== c.id && (found.status === 'SUSPENDED' || found.status === 'ARCHIVED')) errors[c.key] = `${found.companyName} is ${found.status.toLowerCase()} and cannot be selected.`
  }
  return errors
}

/** Base `where` for a resource: tenant + soft delete + assigned-only scope. */
export function scopeWhere(ctx: Ctx, def: ResourceDef): Record<string, unknown> {
  const where: Record<string, unknown> = { organizationId: ctx.org.id }
  if (def.softDelete) where.deletedAt = null
  if (ctx.assignedOnly) {
    const uid = ctx.user.id
    if (def.key === 'projects') where.OR = [{ managerId: uid }, { members: { some: { userId: uid } } }]
    if (def.key === 'events') where.OR = [{ members: { some: { userId: uid } } }, { project: { managerId: uid } }, { project: { members: { some: { userId: uid } } } }]
    if (def.key === 'tasks') where.assigneeId = uid
    if (def.key === 'calendar') where.ownerId = uid
  }
  return where
}

export interface ListParams {
  q?: string
  page?: number
  pageSize?: number
  sort?: string
  filters?: Record<string, string | undefined>
  extraWhere?: Record<string, unknown>
}

export function buildListQuery(ctx: Ctx, def: ResourceDef, params: ListParams) {
  const where: Record<string, unknown> = { ...scopeWhere(ctx, def), ...(params.extraWhere ?? {}) }
  const and: Record<string, unknown>[] = []
  if (params.q && params.q.trim()) {
    const q = params.q.trim()
    and.push({ OR: def.searchFields.map((f) => ({ [f]: { contains: q, mode: 'insensitive' } })) })
  }
  for (const filter of def.filters) {
    const v = params.filters?.[filter.name]
    if (!v) continue
    if (filter.mode === 'some') and.push({ [filter.name]: { some: { id: v } } })
    else if (filter.mode === 'has') and.push({ [filter.name]: { has: v } })
    else if (v === 'true' || v === 'false') and.push({ [filter.name]: v === 'true' })
    else and.push({ [filter.name]: v })
  }
  if (and.length) where.AND = and
  const [sf, sd] = (params.sort ?? '').split('.')
  const field = sf && def.sortable.includes(sf) ? sf : def.defaultSort.field
  const dir = sd === 'asc' || sd === 'desc' ? sd : def.defaultSort.dir
  const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 25))
  const page = Math.max(1, params.page ?? 1)
  const nullable = isNullable(def.model, field)
  return {
    where,
    orderBy: [{ [field]: nullable ? { sort: dir, nulls: 'last' } : dir }, { createdAt: 'desc' }] as unknown,
    skip: (page - 1) * pageSize,
    take: pageSize,
    page,
    pageSize,
    sort: `${field}.${dir}`,
  }
}

const nullableCache = new Map<string, boolean>()
/** Uses Prisma's DMMF to know whether `nulls: last` is allowed on a sort column. */
function isNullable(model: string, field: string) {
  const key = `${model}.${field}`
  if (!nullableCache.has(key)) {
    const m = Prisma.dmmf.datamodel.models.find((x) => x.name.toLowerCase() === model.toLowerCase())
    const f = m?.fields.find((x) => x.name === field)
    nullableCache.set(key, f ? !f.isRequired : false)
  }
  return nullableCache.get(key)!
}

export async function listRecords<T = Record<string, unknown>>(ctx: Ctx, def: ResourceDef, params: ListParams, include?: Record<string, unknown>) {
  const q = buildListQuery(ctx, def, params)
  const d = delegate(prisma, def)
  const orderBy = def.key === 'calendar' || !hasCreatedAt(def) ? (q.orderBy as unknown[]).slice(0, 1) : q.orderBy
  const [rows, total] = await Promise.all([d.findMany({ where: q.where, orderBy, skip: q.skip, take: q.take, include }), d.count({ where: q.where })])
  return { rows: rows as T[], total: total as number, page: q.page, pageSize: q.pageSize, sort: q.sort }
}

function hasCreatedAt(def: ResourceDef) {
  return def.key !== 'reservations'
}

export async function getRecord<T = Record<string, unknown>>(ctx: Ctx, def: ResourceDef, id: string, include?: Record<string, unknown>) {
  return (await delegate(prisma, def).findFirst({ where: { ...scopeWhere(ctx, def), id }, include })) as T | null
}

/** Loads the option lists needed by a set of fields / filters, restricted to the caller's organization. */
export async function loadRelationOptions(ctx: Ctx, kinds: Iterable<string>): Promise<RelationOptions> {
  const set = new Set(kinds)
  const org = ctx.org.id
  const out: RelationOptions = {}
  const jobs: Promise<void>[] = []
  if (set.has('user'))
    jobs.push(
      prisma.user
        .findMany({ where: { organizationId: org, active: true, deletedAt: null, clientId: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, title: true } })
        .then((r) => void (out.user = r.map((u) => ({ value: u.id, label: u.name, hint: u.title ?? undefined })))),
    )
  if (set.has('client'))
    jobs.push(
      prisma.client
        .findMany({ where: { organizationId: org, deletedAt: null }, orderBy: { lastName: 'asc' }, select: { id: true, firstName: true, lastName: true, company: true, ref: true } })
        .then((r) => void (out.client = r.map((c) => ({ value: c.id, label: fullName(c), hint: [c.company, c.ref].filter(Boolean).join(' · ') })))),
    )
  if (set.has('project')) {
    const where: Record<string, unknown> = { organizationId: org, deletedAt: null }
    if (ctx.assignedOnly) where.OR = [{ managerId: ctx.user.id }, { members: { some: { userId: ctx.user.id } } }]
    jobs.push(
      prisma.project
        .findMany({ where, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, ref: true } })
        .then((r) => void (out.project = r.map((p) => ({ value: p.id, label: p.name, hint: p.ref })))),
    )
  }
  if (set.has('supplier'))
    jobs.push(
      prisma.supplier
        .findMany({ where: { organizationId: org, deletedAt: null }, orderBy: { companyName: 'asc' }, select: { id: true, companyName: true, status: true, city: true } })
        .then(
          (r) =>
            void (out.supplier = r.map((s) => ({
              value: s.id,
              label: s.companyName,
              hint: s.status === 'SUSPENDED' || s.status === 'ARCHIVED' ? `${s.status.toLowerCase()} — not selectable` : s.city ?? undefined,
              disabled: s.status === 'SUSPENDED' || s.status === 'ARCHIVED',
            }))),
        ),
    )
  if (set.has('partner'))
    jobs.push(prisma.partner.findMany({ where: { organizationId: org, deletedAt: null }, orderBy: { companyName: 'asc' } }).then((r) => void (out.partner = r.map((p) => ({ value: p.id, label: p.companyName })))))
  if (set.has('event'))
    jobs.push(
      prisma.event
        .findMany({ where: { organizationId: org, deletedAt: null }, orderBy: { date: 'desc' }, select: { id: true, name: true, ref: true } })
        .then((r) => void (out.event = r.map((e) => ({ value: e.id, label: e.name, hint: e.ref })))),
    )
  if (set.has('lead'))
    jobs.push(
      prisma.lead
        .findMany({ where: { organizationId: org, deletedAt: null, stage: { notIn: ['WON', 'LOST', 'ARCHIVED'] } }, orderBy: { createdAt: 'desc' }, select: { id: true, firstName: true, lastName: true, ref: true } })
        .then((r) => void (out.lead = r.map((l) => ({ value: l.id, label: fullName(l), hint: l.ref })))),
    )
  if (set.has('stay'))
    jobs.push(prisma.stay.findMany({ where: { organizationId: org, deletedAt: null }, select: { id: true, title: true, ref: true } }).then((r) => void (out.stay = r.map((s) => ({ value: s.id, label: s.title, hint: s.ref })))))
  if (set.has('supplierCategories'))
    jobs.push(
      prisma.category
        .findMany({ where: { organizationId: org, kind: 'SUPPLIER' }, orderBy: { name: 'asc' } })
        .then((r) => void (out.supplierCategories = r.map((c) => ({ value: c.id, label: c.name })))),
    )
  await Promise.all(jobs)
  return out
}

export function relationKindsOf(def: ResourceDef) {
  const kinds = new Set<string>()
  for (const f of def.fields) {
    if (f.relation) kinds.add(f.relation)
    if (f.dynamicOptions) kinds.add(f.dynamicOptions)
  }
  for (const f of def.filters) {
    if (f.relation) kinds.add(f.relation)
    if (f.dynamicOptions) kinds.add(f.dynamicOptions)
  }
  return kinds
}

/** Resource specific normalisation and duplicate prevention. Returns field errors. */
export async function prepareData(tx: Tx, ctx: Ctx, def: ResourceDef, data: Record<string, unknown>, existingId?: string): Promise<FieldErrors> {
  const errors: FieldErrors = {}
  const org = ctx.org.id
  const notSelf = existingId ? { id: { not: existingId } } : {}
  if (def.key === 'clients') {
    data.emailNormalized = normalizeEmail(data.email as string | null)
    if (data.emailNormalized) {
      const dup = await tx.client.findFirst({ where: { organizationId: org, emailNormalized: data.emailNormalized as string, ...notSelf } })
      if (dup) errors.email = `A client with this email already exists (${dup.ref} — ${fullName(dup)}).`
    }
  }
  if (def.key === 'partners' || def.key === 'suppliers') {
    const n = normalizeName(String(data.companyName ?? ''))
    data.nameNormalized = n
    const model = def.key === 'partners' ? tx.partner : tx.supplier
    const dup = await (model as AnyDelegate).findFirst({ where: { organizationId: org, nameNormalized: n, ...notSelf } })
    if (dup) errors.companyName = `${dup.companyName} already exists (${dup.ref}${dup.deletedAt ? ', archived' : ''}). Add categories to the existing record instead of creating a duplicate.`
  }
  if (def.key === 'suppliers') {
    const ids = (data.categories as string[]) ?? []
    const valid = await tx.category.count({ where: { organizationId: org, kind: 'SUPPLIER', id: { in: ids } } })
    if (valid !== ids.length) errors.categories = 'Unknown category.'
    data.categories = existingId ? { set: ids.map((id) => ({ id })) } : { connect: ids.map((id) => ({ id })) }
  }
  if (def.key === 'tasks' && data.status) {
    data.completedAt = data.status === 'COMPLETED' ? new Date() : null
  }
  if ((def.key === 'projects' || def.key === 'stays') && data.startDate && data.endDate && (data.endDate as Date) < (data.startDate as Date)) errors.endDate = 'End date must be after start date.'
  if (def.key === 'stays' && data.checkIn && data.checkOut && (data.checkOut as Date) < (data.checkIn as Date)) errors.checkOut = 'Check-out must be after check-in.'
  if (def.key === 'calendar' && data.start && data.end && (data.end as Date) < (data.start as Date)) errors.end = 'End must be after start.'
  if (def.key === 'events' && Array.isArray(data.palette)) {
    const bad = (data.palette as string[]).find((c) => !/^#[0-9a-f]{3,8}$/i.test(c))
    if (bad) errors.palette = `“${bad}” is not a hex colour.`
  }
  return errors
}
