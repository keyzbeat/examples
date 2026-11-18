import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Normalizes a company / person name for duplicate detection. */
export function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(sarl|sas|sa|ltd|llc|inc|gmbh|srl|eurl|the)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function normalizeEmail(value?: string | null) {
  const v = value?.trim().toLowerCase()
  return v ? v : null
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export function humanize(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((w, i) => (i === 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ')
}

export function fullName(p: { firstName?: string | null; lastName?: string | null }) {
  return [p.firstName, p.lastName].filter(Boolean).join(' ')
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}
