import { NextResponse } from 'next/server'
import { getCtx } from '@/lib/auth/context'
import { RESOURCES, type ResourceKey } from '@/lib/resources/registry'
import { buildListQuery, delegate, loadRelationOptions, relationKindsOf } from '@/lib/resources/server'
import { prisma } from '@/lib/prisma'
import { toCsv } from '@/lib/csv'
import { toDateInput } from '@/lib/dates'

/** CSV / Excel-compatible export of any list, honouring the current search & filters and permissions. */
export async function GET(req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params
  const def = RESOURCES[resource as ResourceKey]
  if (!def) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 })
  const ctx = await getCtx()
  if (!ctx || ctx.user.clientId || !ctx.can(def.permission, 'read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const url = new URL(req.url)
  const filters: Record<string, string | undefined> = {}
  for (const f of def.filters) filters[f.name] = url.searchParams.get(f.name) ?? undefined
  const q = buildListQuery(ctx, def, { q: url.searchParams.get('q') ?? undefined, sort: url.searchParams.get('sort') ?? undefined, filters, pageSize: 100 })
  const include = def.key === 'suppliers' ? { categories: true } : undefined
  const rows: Record<string, unknown>[] = await delegate(prisma, def).findMany({ where: q.where, orderBy: q.orderBy, take: 5000, include })
  const options = await loadRelationOptions(ctx, relationKindsOf(def))
  const fields = def.fields.filter((f) => !f.createOnly)
  const header = [...(def.refKey ? ['Reference'] : []), ...fields.map((f) => f.label), 'Created at']
  const body = rows.map((r) => [
    ...(def.refKey ? [r.ref as string] : []),
    ...fields.map((f) => {
      const v = r[f.name]
      if (v === null || v === undefined) return ''
      if (f.type === 'money') return ((v as number) / 100).toFixed(2)
      if (f.type === 'date' || f.type === 'datetime') return toDateInput(v as Date)
      if (f.type === 'relation' && f.relation) return options[f.relation]?.find((o) => o.value === v)?.label ?? ''
      if (f.type === 'multiselect') return (v as { name: string }[]).map((c) => c.name).join(' | ')
      if (f.type === 'select') return f.options?.find((o) => o.value === v)?.label ?? String(v)
      if (Array.isArray(v)) return v.join(' | ')
      return String(v)
    }),
    toDateInput(r.createdAt as Date),
  ])
  const csv = toCsv([header, ...body])
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${def.key}-${toDateInput(new Date())}.csv"`,
    },
  })
}
