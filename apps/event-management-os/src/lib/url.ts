export type SP = Record<string, string | string[] | undefined>

export function sp(params: SP, key: string): string | undefined {
  const v = params[key]
  return Array.isArray(v) ? v[0] : v
}

/** Returns `path?query` with updates applied (null/'' removes the key). */
export function hrefWith(path: string, current: SP, updates: Record<string, string | number | null | undefined>) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(current)) {
    const val = Array.isArray(v) ? v[0] : v
    if (val !== undefined && val !== '') q.set(k, val)
  }
  for (const [k, v] of Object.entries(updates)) {
    if (v === null || v === undefined || v === '') q.delete(k)
    else q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `${path}?${s}` : path
}
