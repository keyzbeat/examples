'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { ForbiddenError, requireAction } from '@/lib/auth/context'
import { parseCsv } from '@/lib/csv'
import { getResource } from '@/lib/resources/registry'
import { saveResource } from './resources'

export interface ImportResult {
  ok: boolean
  message?: string
  created?: number
  skipped?: { row: number; reason: string }[]
}

const IMPORTABLE = ['leads', 'clients', 'suppliers', 'partners', 'services']

/**
 * CSV import. Headers are matched against field names or labels (case-insensitive).
 * Each row goes through the same validation, duplicate detection and automations as the UI form.
 */
export async function importCsv(resource: string, _prev: ImportResult, form: FormData): Promise<ImportResult> {
  try {
    if (!IMPORTABLE.includes(resource)) throw new ForbiddenError('Import not available for this module.')
    const def = getResource(resource)
    const ctx = await requireAction(def.permission, 'write')
    const file = form.get('file')
    if (!(file instanceof File) || file.size === 0) return { ok: false, message: 'Choose a CSV file.' }
    if (file.size > 5 * 1024 * 1024) return { ok: false, message: 'File too large (5 MB max).' }
    const rows = parseCsv(await file.text())
    if (rows.length < 2) return { ok: false, message: 'The file has no data rows.' }
    const header = rows[0]!.map((h) => h.trim().toLowerCase())
    const map = header.map((h) => def.fields.find((f) => f.name.toLowerCase() === h || f.label.toLowerCase() === h)?.name ?? null)
    if (!map.some(Boolean)) return { ok: false, message: `No recognised columns. Expected e.g.: ${def.fields.slice(0, 6).map((f) => f.label).join(', ')}` }
    const categories = resource === 'suppliers' ? await prisma.category.findMany({ where: { organizationId: ctx.org.id, kind: 'SUPPLIER' } }) : []
    let created = 0
    const skipped: ImportResult['skipped'] = []
    for (const [i, row] of rows.slice(1, 1001).entries()) {
      const fd = new FormData()
      for (const f of def.fields) if (f.defaultValue !== undefined && typeof f.defaultValue !== 'object') fd.set(f.name, String(f.defaultValue))
      row.forEach((value, col) => {
        const name = map[col]
        if (!name) return
        const field = def.fields.find((f) => f.name === name)!
        const v = value.trim()
        if (field.type === 'multiselect' && name === 'categories') {
          for (const part of v.split(/[|,;]/).map((s) => s.trim().toLowerCase()).filter(Boolean)) {
            const c = categories.find((c) => c.name.toLowerCase() === part || c.slug === part)
            if (c) fd.append('categories', c.id)
          }
        } else if (field.type === 'select' && field.options) {
          const opt = field.options.find((o) => o.value.toLowerCase() === v.toLowerCase() || o.label.toLowerCase() === v.toLowerCase())
          if (opt) fd.set(name, opt.value)
        } else if (field.type !== 'relation') fd.set(name, v)
      })
      const res = await saveResource(resource, null, { ok: true }, fd)
      if (res.ok) created++
      else skipped.push({ row: i + 2, reason: Object.values(res.errors ?? {})[0] ?? res.message ?? 'Invalid row' })
    }
    revalidatePath(def.basePath)
    return { ok: true, created, skipped, message: `${created} imported, ${skipped.length} skipped.` }
  } catch (e) {
    return { ok: false, message: e instanceof ForbiddenError ? e.message : 'Import failed.' }
  }
}
