/**
 * Permission model: "<resource>:<action>" strings stored on Role.permissions.
 *  - "*" grants everything.
 *  - "<resource>:*" grants every action on a resource.
 *  - "scope:assigned" restricts projects / events / tasks to records the user is assigned to.
 * Checks are always performed server-side (see lib/auth/context.ts).
 */

export const RESOURCES = [
  'dashboard',
  'leads',
  'clients',
  'projects',
  'events',
  'stays',
  'concierge',
  'partners',
  'suppliers',
  'services',
  'calendar',
  'tasks',
  'documents',
  'quotes',
  'invoices',
  'finance',
  'reports',
  'admin',
  'settings',
] as const
export type Resource = (typeof RESOURCES)[number]

export const ACTIONS = ['read', 'write', 'delete'] as const
export type Action = (typeof ACTIONS)[number]

export type Permission = `${Resource}:${Action}` | `${Resource}:*` | '*' | 'scope:assigned' | 'portal:access'

export function can(permissions: readonly string[], resource: Resource, action: Action = 'read') {
  if (permissions.includes('*')) return true
  if (permissions.includes(`${resource}:*`)) return true
  if (permissions.includes(`${resource}:${action}`)) return true
  // write implies read
  if (action === 'read' && permissions.includes(`${resource}:write`)) return true
  return false
}

export function isAssignedScope(permissions: readonly string[]) {
  return !permissions.includes('*') && permissions.includes('scope:assigned')
}

const all = (r: Resource) => `${r}:*`
const read = (r: Resource) => `${r}:read`
const write = (r: Resource) => `${r}:write`

export const DEFAULT_ROLES: { key: string; name: string; description: string; permissions: string[] }[] = [
  { key: 'admin', name: 'Administrator', description: 'Full access, settings, users and permissions.', permissions: ['*'] },
  {
    key: 'management',
    name: 'Management',
    description: 'Global dashboard, finance, approvals and reports.',
    permissions: [
      ...RESOURCES.filter((r) => r !== 'admin' && r !== 'settings').map(read),
      all('finance'),
      all('reports'),
      all('quotes'),
      all('invoices'),
      write('projects'),
      write('documents'),
      write('tasks'),
      write('calendar'),
    ],
  },
  {
    key: 'sales',
    name: 'Sales',
    description: 'Leads, CRM, clients, quotes and follow-ups.',
    permissions: [
      read('dashboard'),
      all('leads'),
      all('clients'),
      all('quotes'),
      write('tasks'),
      write('calendar'),
      write('documents'),
      read('projects'),
      read('events'),
      read('services'),
      read('partners'),
      read('suppliers'),
    ],
  },
  {
    key: 'project_manager',
    name: 'Project Manager',
    description: 'Projects, events, suppliers, tasks and planning.',
    permissions: [
      read('dashboard'),
      all('projects'),
      all('events'),
      all('stays'),
      all('concierge'),
      all('suppliers'),
      all('services'),
      all('tasks'),
      all('calendar'),
      all('documents'),
      read('partners'),
      read('clients'),
      read('quotes'),
      read('invoices'),
    ],
  },
  {
    key: 'team_member',
    name: 'Team Member',
    description: 'Assigned projects, tasks and calendar.',
    permissions: [
      read('dashboard'),
      read('projects'),
      read('events'),
      write('tasks'),
      write('calendar'),
      read('documents'),
      'scope:assigned',
    ],
  },
  { key: 'client', name: 'Client', description: 'Client portal only.', permissions: ['portal:access'] },
]
