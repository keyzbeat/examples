import { describe, expect, it } from 'vitest'
import { can, isAssignedScope, DEFAULT_ROLES } from '@/lib/permissions'

const role = (k: string) => DEFAULT_ROLES.find((r) => r.key === k)!.permissions

describe('permissions', () => {
  it('admin wildcard grants everything', () => {
    expect(can(['*'], 'admin', 'delete')).toBe(true)
  })
  it('write implies read, not delete', () => {
    expect(can(['tasks:write'], 'tasks', 'read')).toBe(true)
    expect(can(['tasks:write'], 'tasks', 'delete')).toBe(false)
  })
  it('sales cannot see finance or admin', () => {
    expect(can(role('sales'), 'finance')).toBe(false)
    expect(can(role('sales'), 'admin')).toBe(false)
    expect(can(role('sales'), 'leads', 'delete')).toBe(true)
  })
  it('team member is scoped to assigned work', () => {
    expect(isAssignedScope(role('team_member'))).toBe(true)
    expect(can(role('team_member'), 'projects', 'write')).toBe(false)
  })
  it('client role has no back-office permission', () => {
    for (const r of ['dashboard', 'clients', 'documents', 'finance'] as const) expect(can(role('client'), r)).toBe(false)
  })
})
