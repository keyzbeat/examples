import { describe, expect, it } from 'vitest'
import { normalizeName, normalizeEmail } from '@/lib/utils'
import { parseCsv, toCsv } from '@/lib/csv'
import { guessProjectType } from '@/lib/automations'

describe('duplicate detection', () => {
  it('normalizes company names (accents, legal forms, punctuation)', () => {
    expect(normalizeName('Château des Lys SARL')).toBe(normalizeName('chateau des lys'))
    expect(normalizeName('Saveurs & Co.')).toBe(normalizeName('Saveurs and Co'))
  })
  it('normalizes emails', () => {
    expect(normalizeEmail('  John@Example.COM ')).toBe('john@example.com')
    expect(normalizeEmail('')).toBeNull()
  })
})

describe('csv', () => {
  it('round-trips quoted fields and detects ; delimiter', () => {
    const csv = toCsv([['Name', 'Notes'], ['A, B', 'He said "hi"']])
    expect(parseCsv(csv)).toEqual([['Name', 'Notes'], ['A, B', 'He said "hi"']])
    expect(parseCsv('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']])
  })
})

describe('automations', () => {
  it('guesses the project type from the requested service', () => {
    expect(guessProjectType('Wedding')).toBe('WEDDING')
    expect(guessProjectType('Villa stay')).toBe('TRAVEL')
    expect(guessProjectType('Corporate event')).toBe('CORPORATE_EVENT')
    expect(guessProjectType(null)).toBe('CUSTOM')
  })
})
