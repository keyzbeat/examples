import type { Resource } from '@/lib/permissions'

export type IconName =
  | 'dashboard'
  | 'crm'
  | 'clients'
  | 'projects'
  | 'events'
  | 'stays'
  | 'concierge'
  | 'partners'
  | 'suppliers'
  | 'services'
  | 'calendar'
  | 'tasks'
  | 'documents'
  | 'quotes'
  | 'finance'
  | 'reports'
  | 'portal'
  | 'admin'
  | 'settings'

export interface NavItem {
  label: string
  href: string
  icon: IconName
  permission?: Resource
  children?: { label: string; href: string; permission?: Resource }[]
}
export interface NavGroup {
  label?: string
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  { items: [{ label: 'Dashboard', href: '/', icon: 'dashboard', permission: 'dashboard' }] },
  {
    label: 'Sales',
    items: [
      { label: 'CRM & Sales', href: '/leads', icon: 'crm', permission: 'leads', children: [{ label: 'Pipeline', href: '/leads?view=kanban' }, { label: 'All leads', href: '/leads' }] },
      { label: 'Clients', href: '/clients', icon: 'clients', permission: 'clients' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Projects', href: '/projects', icon: 'projects', permission: 'projects' },
      { label: 'Events', href: '/events', icon: 'events', permission: 'events' },
      { label: 'Stays & Travel', href: '/stays', icon: 'stays', permission: 'stays' },
      { label: 'Concierge', href: '/concierge', icon: 'concierge', permission: 'concierge' },
      { label: 'Calendar', href: '/calendar', icon: 'calendar', permission: 'calendar' },
      { label: 'Tasks & Follow-ups', href: '/tasks', icon: 'tasks', permission: 'tasks' },
    ],
  },
  {
    label: 'Network',
    items: [
      { label: 'Partners', href: '/partners', icon: 'partners', permission: 'partners' },
      { label: 'Suppliers', href: '/suppliers', icon: 'suppliers', permission: 'suppliers' },
      { label: 'Services Catalog', href: '/services', icon: 'services', permission: 'services' },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'Quotes & Invoices', href: '/quotes', icon: 'quotes', permission: 'quotes', children: [{ label: 'Quotes', href: '/quotes', permission: 'quotes' }, { label: 'Invoices', href: '/invoices', permission: 'invoices' }] },
      { label: 'Finance', href: '/finance', icon: 'finance', permission: 'finance', children: [{ label: 'Overview', href: '/finance' }, { label: 'Payments', href: '/finance/payments' }] },
      { label: 'Documents', href: '/documents', icon: 'documents', permission: 'documents' },
      { label: 'Reports & Analytics', href: '/reports', icon: 'reports', permission: 'reports' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Client Portal', href: '/portal-access', icon: 'portal', permission: 'clients' },
      { label: 'Administration', href: '/admin/users', icon: 'admin', permission: 'admin', children: [{ label: 'Users', href: '/admin/users' }, { label: 'Roles & permissions', href: '/admin/roles' }, { label: 'Audit log', href: '/admin/audit' }] },
    ],
  },
]

/** Breadcrumb labels for top-level segments. */
export const SEGMENT_LABELS: Record<string, string> = {
  leads: 'CRM & Sales',
  clients: 'Clients',
  projects: 'Projects',
  events: 'Events',
  stays: 'Stays & Travel',
  concierge: 'Concierge',
  partners: 'Partners',
  suppliers: 'Suppliers',
  services: 'Services Catalog',
  calendar: 'Calendar',
  tasks: 'Tasks & Follow-ups',
  documents: 'Documents',
  quotes: 'Quotes',
  invoices: 'Invoices',
  finance: 'Finance',
  payments: 'Payments',
  reports: 'Reports & Analytics',
  'portal-access': 'Client Portal',
  admin: 'Administration',
  users: 'Users',
  roles: 'Roles & permissions',
  audit: 'Audit log',
  settings: 'Settings',
  notifications: 'Notifications',
}
