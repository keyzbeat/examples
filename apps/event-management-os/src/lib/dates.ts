export const DAY = 86_400_000

export function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
export function endOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}
export function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * DAY)
}
export function startOfWeek(d = new Date()) {
  const x = startOfDay(d)
  const day = (x.getDay() + 6) % 7 // Monday = 0
  return addDays(x, -day)
}
export function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
export function endOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}
export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
export function toDateInput(d?: Date | string | null) {
  if (!d) return ''
  const x = new Date(d)
  const off = x.getTimezoneOffset()
  return new Date(x.getTime() - off * 60000).toISOString().slice(0, 10)
}
export function toDateTimeInput(d?: Date | string | null) {
  if (!d) return ''
  const x = new Date(d)
  const off = x.getTimezoneOffset()
  return new Date(x.getTime() - off * 60000).toISOString().slice(0, 16)
}
export function formatDate(d?: Date | string | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-GB', opts).format(new Date(d))
}
export function formatDateTime(d?: Date | string | null) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}
export function relativeTime(d: Date | string, now = new Date()) {
  const diff = new Date(d).getTime() - now.getTime()
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (abs < 60_000) return 'just now'
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute')
  if (abs < DAY) return rtf.format(Math.round(diff / 3_600_000), 'hour')
  if (abs < 30 * DAY) return rtf.format(Math.round(diff / DAY), 'day')
  return formatDate(d)
}
export function daysUntil(d: Date | string, now = new Date()) {
  return Math.round((startOfDay(new Date(d)).getTime() - startOfDay(now).getTime()) / DAY)
}
