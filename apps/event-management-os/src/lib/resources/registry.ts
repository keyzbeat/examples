/**
 * Resource registry — one declaration per business entity drives:
 * forms (fields), validation & persistence (resources/server.ts), list search/filters and CSV export.
 * Plain data: importable from client components.
 */
import * as O from '@/lib/options'
import type { Resource } from '@/lib/permissions'
import type { Field } from './fields'

export type ResourceKey =
  | 'clients'
  | 'leads'
  | 'projects'
  | 'events'
  | 'stays'
  | 'concierge'
  | 'partners'
  | 'suppliers'
  | 'services'
  | 'tasks'
  | 'calendar'
  | 'quotes'
  | 'invoices'
  | 'payments'
  | 'reservations'

export interface Filter {
  name: string
  label: string
  options?: O.Opt[]
  relation?: Field['relation']
  dynamicOptions?: Field['dynamicOptions']
  /** array column (Postgres `has`) / many-to-many relation */
  mode?: 'equals' | 'has' | 'some'
}

export interface ResourceDef {
  key: ResourceKey
  model: string // prisma delegate name
  permission: Resource
  label: string
  singular: string
  basePath: string
  refKey?: 'client' | 'lead' | 'project' | 'event' | 'stay' | 'concierge' | 'partner' | 'supplier' | 'service' | 'task' | 'quote' | 'invoice'
  fields: Field[]
  searchFields: string[]
  filters: Filter[]
  defaultSort: { field: string; dir: 'asc' | 'desc' }
  sortable: string[]
  softDelete: boolean
  titleOf: (r: Record<string, unknown>) => string
}

const name = (r: Record<string, unknown>) => [r.firstName, r.lastName].filter(Boolean).join(' ')

export const RESOURCES: Record<ResourceKey, ResourceDef> = {
  clients: {
    key: 'clients',
    model: 'client',
    permission: 'clients',
    label: 'Clients',
    singular: 'Client',
    basePath: '/clients',
    refKey: 'client',
    softDelete: true,
    titleOf: (r) => name(r) || String(r.company ?? ''),
    fields: [
      { name: 'type', label: 'Type', type: 'select', options: O.CLIENT_TYPE, defaultValue: 'INDIVIDUAL', section: 'Identity' },
      { name: 'status', label: 'Status', type: 'select', options: O.CLIENT_STATUS, defaultValue: 'ACTIVE', section: 'Identity' },
      { name: 'firstName', label: 'First name', type: 'text', required: true, section: 'Identity' },
      { name: 'lastName', label: 'Last name', type: 'text', required: true, section: 'Identity' },
      { name: 'company', label: 'Company', type: 'text', section: 'Identity', wide: true },
      { name: 'email', label: 'Email', type: 'email', section: 'Contact', help: 'Used for duplicate detection.' },
      { name: 'phone', label: 'Phone', type: 'tel', section: 'Contact' },
      { name: 'whatsapp', label: 'WhatsApp', type: 'tel', section: 'Contact' },
      { name: 'language', label: 'Language', type: 'select', options: O.LANGUAGES, defaultValue: 'en', section: 'Contact' },
      { name: 'address', label: 'Address', type: 'text', section: 'Contact', wide: true },
      { name: 'city', label: 'City', type: 'text', section: 'Contact' },
      { name: 'country', label: 'Country', type: 'text', section: 'Contact' },
      { name: 'ownerId', label: 'Account owner', type: 'relation', relation: 'user', section: 'Management' },
      { name: 'preferences', label: 'Preferences', type: 'textarea', section: 'Management', wide: true, placeholder: 'Tastes, allergies, favourite places, VIP habits…' },
      { name: 'notes', label: 'Internal notes', type: 'textarea', section: 'Management', wide: true },
    ],
    searchFields: ['firstName', 'lastName', 'company', 'email', 'phone', 'city', 'ref'],
    filters: [
      { name: 'status', label: 'Status', options: O.CLIENT_STATUS },
      { name: 'type', label: 'Type', options: O.CLIENT_TYPE },
      { name: 'ownerId', label: 'Owner', relation: 'user' },
    ],
    defaultSort: { field: 'createdAt', dir: 'desc' },
    sortable: ['ref', 'lastName', 'company', 'city', 'createdAt'],
  },

  leads: {
    key: 'leads',
    model: 'lead',
    permission: 'leads',
    label: 'Leads',
    singular: 'Lead',
    basePath: '/leads',
    refKey: 'lead',
    softDelete: true,
    titleOf: name,
    fields: [
      { name: 'firstName', label: 'First name', type: 'text', required: true, section: 'Prospect' },
      { name: 'lastName', label: 'Last name', type: 'text', required: true, section: 'Prospect' },
      { name: 'company', label: 'Company', type: 'text', section: 'Prospect' },
      { name: 'email', label: 'Email', type: 'email', section: 'Prospect' },
      { name: 'phone', label: 'Phone', type: 'tel', section: 'Prospect' },
      { name: 'whatsapp', label: 'WhatsApp', type: 'tel', section: 'Prospect' },
      { name: 'city', label: 'City', type: 'text', section: 'Prospect' },
      { name: 'country', label: 'Country', type: 'text', section: 'Prospect' },
      { name: 'serviceRequested', label: 'Service requested', type: 'select', options: O.SERVICE_REQUESTED, section: 'Opportunity' },
      { name: 'source', label: 'Lead source', type: 'select', options: O.LEAD_SOURCE, section: 'Opportunity' },
      { name: 'estimatedBudget', label: 'Estimated budget', type: 'money', section: 'Opportunity' },
      { name: 'eventDate', label: 'Desired date', type: 'date', section: 'Opportunity' },
      { name: 'stage', label: 'Pipeline stage', type: 'select', options: O.LEAD_STAGE, defaultValue: 'NEW', section: 'Pipeline' },
      { name: 'priority', label: 'Priority', type: 'select', options: O.PRIORITY, defaultValue: 'MEDIUM', section: 'Pipeline' },
      { name: 'assignedToId', label: 'Assigned salesperson', type: 'relation', relation: 'user', section: 'Pipeline' },
      { name: 'nextFollowUp', label: 'Next follow-up', type: 'datetime', section: 'Pipeline' },
      { name: 'notes', label: 'Notes', type: 'textarea', section: 'Pipeline', wide: true },
    ],
    searchFields: ['firstName', 'lastName', 'company', 'email', 'phone', 'ref', 'city'],
    filters: [
      { name: 'stage', label: 'Stage', options: O.LEAD_STAGE },
      { name: 'priority', label: 'Priority', options: O.PRIORITY },
      { name: 'source', label: 'Source', options: O.LEAD_SOURCE },
      { name: 'assignedToId', label: 'Salesperson', relation: 'user' },
    ],
    defaultSort: { field: 'createdAt', dir: 'desc' },
    sortable: ['ref', 'lastName', 'estimatedBudget', 'nextFollowUp', 'createdAt', 'stage'],
  },

  projects: {
    key: 'projects',
    model: 'project',
    permission: 'projects',
    label: 'Projects',
    singular: 'Project',
    basePath: '/projects',
    refKey: 'project',
    softDelete: true,
    titleOf: (r) => String(r.name),
    fields: [
      { name: 'name', label: 'Project name', type: 'text', required: true, wide: true, section: 'General' },
      { name: 'type', label: 'Project type', type: 'select', options: O.PROJECT_TYPE, defaultValue: 'CUSTOM', section: 'General' },
      { name: 'clientId', label: 'Client', type: 'relation', relation: 'client', section: 'General' },
      { name: 'managerId', label: 'Project manager', type: 'relation', relation: 'user', section: 'General' },
      { name: 'status', label: 'Status', type: 'select', options: O.PROJECT_STATUS, defaultValue: 'PLANNING', section: 'General' },
      { name: 'priority', label: 'Priority', type: 'select', options: O.PRIORITY, defaultValue: 'MEDIUM', section: 'General' },
      { name: 'startDate', label: 'Start date', type: 'date', section: 'Planning' },
      { name: 'endDate', label: 'End date', type: 'date', section: 'Planning' },
      { name: 'location', label: 'Location', type: 'text', section: 'Planning' },
      { name: 'budget', label: 'Budget', type: 'money', section: 'Planning' },
      { name: 'progress', label: 'Progress (%)', type: 'number', min: 0, max: 100, section: 'Planning', help: 'Auto-computed from tasks when left at 0.' },
      { name: 'description', label: 'Description', type: 'textarea', wide: true, section: 'Planning' },
      { name: 'applyChecklist', label: 'Generate the default checklist for this project type', type: 'boolean', defaultValue: true, createOnly: true, section: 'Planning', wide: true },
    ],
    searchFields: ['name', 'ref', 'location', 'description'],
    filters: [
      { name: 'status', label: 'Status', options: O.PROJECT_STATUS },
      { name: 'type', label: 'Type', options: O.PROJECT_TYPE },
      { name: 'managerId', label: 'Manager', relation: 'user' },
      { name: 'clientId', label: 'Client', relation: 'client' },
    ],
    defaultSort: { field: 'startDate', dir: 'asc' },
    sortable: ['ref', 'name', 'startDate', 'budget', 'progress', 'status', 'createdAt'],
  },

  events: {
    key: 'events',
    model: 'event',
    permission: 'events',
    label: 'Events',
    singular: 'Event',
    basePath: '/events',
    refKey: 'event',
    softDelete: true,
    titleOf: (r) => String(r.name),
    fields: [
      { name: 'name', label: 'Event name', type: 'text', required: true, wide: true, section: 'Event' },
      { name: 'type', label: 'Event type', type: 'select', options: O.PROJECT_TYPE, defaultValue: 'PRIVATE_EVENT', section: 'Event' },
      { name: 'status', label: 'Status', type: 'select', options: O.EVENT_STATUS, defaultValue: 'PLANNING', section: 'Event' },
      { name: 'clientId', label: 'Client', type: 'relation', relation: 'client', section: 'Event' },
      { name: 'projectId', label: 'Project', type: 'relation', relation: 'project', section: 'Event' },
      { name: 'date', label: 'Date', type: 'date', section: 'When & where' },
      { name: 'startTime', label: 'Start time', type: 'time', section: 'When & where' },
      { name: 'endTime', label: 'End time', type: 'time', section: 'When & where' },
      { name: 'guestCount', label: 'Guest count', type: 'number', min: 0, section: 'When & where' },
      { name: 'venue', label: 'Venue', type: 'text', section: 'When & where' },
      { name: 'location', label: 'Location / city', type: 'text', section: 'When & where' },
      { name: 'budget', label: 'Budget', type: 'money', section: 'When & where' },
      { name: 'theme', label: 'Theme', type: 'text', section: 'Concept & design' },
      { name: 'palette', label: 'Color palette (hex, comma separated)', type: 'tags', section: 'Concept & design', placeholder: '#F5F1ED, #F07F73, #2F3A2F' },
      { name: 'concept', label: 'Concept', type: 'textarea', wide: true, section: 'Concept & design' },
      { name: 'logistics', label: 'Logistics notes', type: 'textarea', wide: true, section: 'Concept & design' },
    ],
    searchFields: ['name', 'ref', 'location', 'venue', 'theme'],
    filters: [
      { name: 'status', label: 'Status', options: O.EVENT_STATUS },
      { name: 'type', label: 'Type', options: O.PROJECT_TYPE },
      { name: 'clientId', label: 'Client', relation: 'client' },
    ],
    defaultSort: { field: 'date', dir: 'asc' },
    sortable: ['ref', 'name', 'date', 'guestCount', 'budget', 'status'],
  },

  stays: {
    key: 'stays',
    model: 'stay',
    permission: 'stays',
    label: 'Stays & Travel',
    singular: 'Stay',
    basePath: '/stays',
    refKey: 'stay',
    softDelete: true,
    titleOf: (r) => String(r.title),
    fields: [
      { name: 'title', label: 'Stay title', type: 'text', required: true, wide: true, section: 'Stay' },
      { name: 'clientId', label: 'Client', type: 'relation', relation: 'client', section: 'Stay' },
      { name: 'projectId', label: 'Project', type: 'relation', relation: 'project', section: 'Stay' },
      { name: 'destination', label: 'Destination', type: 'text', required: true, section: 'Stay' },
      { name: 'status', label: 'Status', type: 'select', options: O.STAY_STATUS, defaultValue: 'DRAFT', section: 'Stay' },
      { name: 'checkIn', label: 'Check-in', type: 'date', section: 'Dates & travellers' },
      { name: 'checkOut', label: 'Check-out', type: 'date', section: 'Dates & travellers' },
      { name: 'travelers', label: 'Travellers', type: 'number', min: 1, defaultValue: 2, section: 'Dates & travellers' },
      { name: 'budget', label: 'Budget', type: 'money', section: 'Dates & travellers' },
      { name: 'accommodation', label: 'Accommodation', type: 'text', wide: true, section: 'Logistics' },
      { name: 'transfers', label: 'Transfers', type: 'textarea', wide: true, section: 'Logistics' },
      { name: 'notes', label: 'Notes', type: 'textarea', wide: true, section: 'Logistics' },
    ],
    searchFields: ['title', 'destination', 'ref', 'accommodation'],
    filters: [
      { name: 'status', label: 'Status', options: O.STAY_STATUS },
      { name: 'clientId', label: 'Client', relation: 'client' },
    ],
    defaultSort: { field: 'checkIn', dir: 'asc' },
    sortable: ['ref', 'title', 'destination', 'checkIn', 'travelers', 'budget'],
  },

  concierge: {
    key: 'concierge',
    model: 'conciergeRequest',
    permission: 'concierge',
    label: 'Concierge',
    singular: 'Request',
    basePath: '/concierge',
    refKey: 'concierge',
    softDelete: true,
    titleOf: (r) => String(r.title),
    fields: [
      { name: 'title', label: 'Request', type: 'text', required: true, wide: true, section: 'Request' },
      { name: 'category', label: 'Category', type: 'select', options: O.CONCIERGE_CATEGORY, required: true, section: 'Request' },
      { name: 'priority', label: 'Priority', type: 'select', options: O.PRIORITY, defaultValue: 'MEDIUM', section: 'Request' },
      { name: 'clientId', label: 'Client', type: 'relation', relation: 'client', section: 'Request' },
      { name: 'projectId', label: 'Project', type: 'relation', relation: 'project', section: 'Request' },
      { name: 'description', label: 'Description', type: 'textarea', wide: true, section: 'Request' },
      { name: 'assignedToId', label: 'Assigned agent', type: 'relation', relation: 'user', section: 'Fulfilment' },
      { name: 'supplierId', label: 'Supplier', type: 'relation', relation: 'supplier', section: 'Fulfilment', help: 'Suspended suppliers cannot be selected.' },
      { name: 'requestedDate', label: 'Requested for', type: 'datetime', section: 'Fulfilment' },
      { name: 'deadline', label: 'Deadline', type: 'datetime', section: 'Fulfilment' },
      { name: 'status', label: 'Status', type: 'select', options: O.CONCIERGE_STATUS, defaultValue: 'NEW', section: 'Fulfilment' },
      { name: 'confirmation', label: 'Confirmation #', type: 'text', section: 'Fulfilment' },
      { name: 'cost', label: 'Cost', type: 'money', section: 'Pricing' },
      { name: 'price', label: 'Selling price', type: 'money', section: 'Pricing' },
      { name: 'notes', label: 'Notes', type: 'textarea', wide: true, section: 'Pricing' },
    ],
    searchFields: ['title', 'ref', 'description', 'confirmation'],
    filters: [
      { name: 'status', label: 'Status', options: O.CONCIERGE_STATUS },
      { name: 'category', label: 'Category', options: O.CONCIERGE_CATEGORY },
      { name: 'priority', label: 'Priority', options: O.PRIORITY },
      { name: 'assignedToId', label: 'Agent', relation: 'user' },
    ],
    defaultSort: { field: 'deadline', dir: 'asc' },
    sortable: ['ref', 'title', 'requestedDate', 'deadline', 'price', 'status'],
  },

  partners: {
    key: 'partners',
    model: 'partner',
    permission: 'partners',
    label: 'Partners',
    singular: 'Partner',
    basePath: '/partners',
    refKey: 'partner',
    softDelete: true,
    titleOf: (r) => String(r.companyName),
    fields: [
      { name: 'companyName', label: 'Company name', type: 'text', required: true, wide: true, section: 'Company' },
      { name: 'category', label: 'Category', type: 'select', options: O.PARTNER_CATEGORY, required: true, section: 'Company' },
      { name: 'partnershipType', label: 'Partnership type', type: 'select', options: O.PARTNERSHIP_TYPE, section: 'Company' },
      { name: 'status', label: 'Status', type: 'select', options: O.PARTNER_STATUS, defaultValue: 'ACTIVE', section: 'Company' },
      { name: 'city', label: 'City', type: 'text', section: 'Company' },
      { name: 'country', label: 'Country', type: 'text', section: 'Company' },
      { name: 'contactName', label: 'Main contact', type: 'text', section: 'Contact' },
      { name: 'email', label: 'Email', type: 'email', section: 'Contact' },
      { name: 'phone', label: 'Phone', type: 'tel', section: 'Contact' },
      { name: 'whatsapp', label: 'WhatsApp', type: 'tel', section: 'Contact' },
      { name: 'website', label: 'Website', type: 'url', section: 'Contact' },
      { name: 'instagram', label: 'Social media', type: 'text', section: 'Contact', placeholder: '@handle' },
      { name: 'commissionRate', label: 'Commission (%)', type: 'percent', section: 'Agreement' },
      { name: 'conditions', label: 'Commercial conditions', type: 'textarea', wide: true, section: 'Agreement' },
      { name: 'notes', label: 'Notes', type: 'textarea', wide: true, section: 'Agreement' },
    ],
    searchFields: ['companyName', 'ref', 'contactName', 'email', 'city'],
    filters: [
      { name: 'status', label: 'Status', options: O.PARTNER_STATUS },
      { name: 'category', label: 'Category', options: O.PARTNER_CATEGORY },
      { name: 'partnershipType', label: 'Type', options: O.PARTNERSHIP_TYPE },
    ],
    defaultSort: { field: 'companyName', dir: 'asc' },
    sortable: ['ref', 'companyName', 'category', 'city', 'commissionRate', 'createdAt'],
  },

  suppliers: {
    key: 'suppliers',
    model: 'supplier',
    permission: 'suppliers',
    label: 'Suppliers',
    singular: 'Supplier',
    basePath: '/suppliers',
    refKey: 'supplier',
    softDelete: true,
    titleOf: (r) => String(r.companyName),
    fields: [
      { name: 'companyName', label: 'Company name', type: 'text', required: true, wide: true, section: 'Company', help: 'One record per supplier — add every category it covers below.' },
      { name: 'categories', label: 'Categories', type: 'multiselect', dynamicOptions: 'supplierCategories', required: true, wide: true, section: 'Company' },
      { name: 'status', label: 'Status', type: 'select', options: O.SUPPLIER_STATUS, defaultValue: 'ACTIVE', section: 'Company' },
      { name: 'rating', label: 'Internal rating', type: 'rating', section: 'Company' },
      { name: 'city', label: 'City', type: 'text', section: 'Company' },
      { name: 'coverageArea', label: 'Coverage area', type: 'text', section: 'Company' },
      { name: 'servicesOffered', label: 'Services offered', type: 'textarea', wide: true, section: 'Company' },
      { name: 'email', label: 'Email', type: 'email', section: 'Contact' },
      { name: 'phone', label: 'Phone', type: 'tel', section: 'Contact' },
      { name: 'whatsapp', label: 'WhatsApp', type: 'tel', section: 'Contact' },
      { name: 'instagram', label: 'Instagram', type: 'text', section: 'Contact', placeholder: '@handle' },
      { name: 'website', label: 'Website', type: 'url', section: 'Contact' },
      { name: 'pricing', label: 'Pricing', type: 'textarea', section: 'Commercial', wide: true },
      { name: 'conditions', label: 'Commercial conditions', type: 'textarea', section: 'Commercial', wide: true },
      { name: 'availability', label: 'Availability', type: 'text', section: 'Commercial', wide: true },
      { name: 'favorite', label: 'Mark as favourite', type: 'boolean', section: 'Commercial' },
      { name: 'notes', label: 'Notes', type: 'textarea', section: 'Commercial', wide: true },
    ],
    searchFields: ['companyName', 'ref', 'email', 'city', 'servicesOffered', 'coverageArea'],
    filters: [
      { name: 'categories', label: 'Category', dynamicOptions: 'supplierCategories', mode: 'some' },
      { name: 'status', label: 'Status', options: O.SUPPLIER_STATUS },
      { name: 'favorite', label: 'Favourites', options: [{ value: 'true', label: 'Favourites only' }] },
    ],
    defaultSort: { field: 'companyName', dir: 'asc' },
    sortable: ['ref', 'companyName', 'city', 'rating', 'createdAt'],
  },

  services: {
    key: 'services',
    model: 'service',
    permission: 'services',
    label: 'Services Catalog',
    singular: 'Service',
    basePath: '/services',
    refKey: 'service',
    softDelete: true,
    titleOf: (r) => String(r.name),
    fields: [
      { name: 'name', label: 'Service name', type: 'text', required: true, wide: true, section: 'Service' },
      { name: 'category', label: 'Category', type: 'select', options: O.SERVICE_CATEGORY, required: true, section: 'Service' },
      { name: 'status', label: 'Status', type: 'select', options: O.SERVICE_STATUS, defaultValue: 'ACTIVE', section: 'Service' },
      { name: 'supplierId', label: 'Supplier', type: 'relation', relation: 'supplier', section: 'Service' },
      { name: 'unit', label: 'Unit', type: 'select', options: O.SERVICE_UNIT, defaultValue: 'unit', section: 'Service' },
      { name: 'description', label: 'Description', type: 'textarea', wide: true, section: 'Service' },
      { name: 'cost', label: 'Purchase cost', type: 'money', required: true, section: 'Pricing' },
      { name: 'price', label: 'Selling price', type: 'money', required: true, section: 'Pricing' },
      { name: 'defaultQuantity', label: 'Default quantity', type: 'number', min: 1, defaultValue: 1, section: 'Pricing' },
      { name: 'taxRate', label: 'Tax (%)', type: 'percent', defaultValue: 20, section: 'Pricing' },
      { name: 'imageUrl', label: 'Photo URL', type: 'url', section: 'Pricing', wide: true },
      { name: 'conditions', label: 'Conditions', type: 'textarea', wide: true, section: 'Pricing' },
    ],
    searchFields: ['name', 'ref', 'description', 'category'],
    filters: [
      { name: 'category', label: 'Category', options: O.SERVICE_CATEGORY },
      { name: 'status', label: 'Status', options: O.SERVICE_STATUS },
      { name: 'supplierId', label: 'Supplier', relation: 'supplier' },
    ],
    defaultSort: { field: 'name', dir: 'asc' },
    sortable: ['ref', 'name', 'category', 'cost', 'price'],
  },

  tasks: {
    key: 'tasks',
    model: 'task',
    permission: 'tasks',
    label: 'Tasks & Follow-ups',
    singular: 'Task',
    basePath: '/tasks',
    refKey: 'task',
    softDelete: true,
    titleOf: (r) => String(r.title),
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, wide: true, section: 'Task' },
      { name: 'description', label: 'Description', type: 'textarea', wide: true, section: 'Task' },
      { name: 'status', label: 'Status', type: 'select', options: O.TASK_STATUS, defaultValue: 'TODO', section: 'Task' },
      { name: 'priority', label: 'Priority', type: 'select', options: O.PRIORITY, defaultValue: 'MEDIUM', section: 'Task' },
      { name: 'assigneeId', label: 'Assigned to', type: 'relation', relation: 'user', section: 'Task' },
      { name: 'dueDate', label: 'Deadline', type: 'datetime', section: 'Task' },
      { name: 'projectId', label: 'Related project', type: 'relation', relation: 'project', section: 'Links' },
      { name: 'clientId', label: 'Related client', type: 'relation', relation: 'client', section: 'Links' },
      { name: 'eventId', label: 'Related event', type: 'relation', relation: 'event', section: 'Links' },
      { name: 'leadId', label: 'Related lead', type: 'relation', relation: 'lead', section: 'Links' },
    ],
    searchFields: ['title', 'ref', 'description'],
    filters: [
      { name: 'status', label: 'Status', options: O.TASK_STATUS },
      { name: 'priority', label: 'Priority', options: O.PRIORITY },
      { name: 'assigneeId', label: 'Assignee', relation: 'user' },
      { name: 'projectId', label: 'Project', relation: 'project' },
    ],
    defaultSort: { field: 'dueDate', dir: 'asc' },
    sortable: ['ref', 'title', 'dueDate', 'priority', 'status', 'createdAt'],
  },

  calendar: {
    key: 'calendar',
    model: 'calendarEvent',
    permission: 'calendar',
    label: 'Calendar',
    singular: 'Calendar item',
    basePath: '/calendar',
    softDelete: false,
    titleOf: (r) => String(r.title),
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, wide: true },
      { name: 'type', label: 'Type', type: 'select', options: O.CALENDAR_TYPE.filter((t) => t.value !== 'TASK'), defaultValue: 'MEETING' },
      { name: 'ownerId', label: 'Owner', type: 'relation', relation: 'user' },
      { name: 'start', label: 'Starts', type: 'datetime', required: true },
      { name: 'end', label: 'Ends', type: 'datetime' },
      { name: 'allDay', label: 'All day', type: 'boolean' },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'projectId', label: 'Related project', type: 'relation', relation: 'project' },
      { name: 'clientId', label: 'Related client', type: 'relation', relation: 'client' },
      { name: 'description', label: 'Description', type: 'textarea', wide: true },
    ],
    searchFields: ['title', 'location', 'description'],
    filters: [{ name: 'type', label: 'Type', options: O.CALENDAR_TYPE }],
    defaultSort: { field: 'start', dir: 'asc' },
    sortable: ['start', 'title'],
  },

  quotes: {
    key: 'quotes',
    model: 'quotation',
    permission: 'quotes',
    label: 'Quotes',
    singular: 'Quote',
    basePath: '/quotes',
    refKey: 'quote',
    softDelete: true,
    titleOf: (r) => String(r.title ?? r.ref),
    fields: [
      { name: 'title', label: 'Title', type: 'text', wide: true, placeholder: 'e.g. Wedding reception — full production' },
      { name: 'clientId', label: 'Client', type: 'relation', relation: 'client', required: true },
      { name: 'projectId', label: 'Project', type: 'relation', relation: 'project' },
      { name: 'issueDate', label: 'Issue date', type: 'date', required: true },
      { name: 'expiryDate', label: 'Expiration date', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: O.QUOTE_STATUS, defaultValue: 'DRAFT' },
      { name: 'discountPct', label: 'Global discount (%)', type: 'percent', defaultValue: 0 },
      { name: 'terms', label: 'Terms & conditions', type: 'textarea', wide: true, defaultValue: '30% deposit on signature, balance 15 days before the event. Quote valid 30 days.' },
      { name: 'notes', label: 'Notes (printed)', type: 'textarea', wide: true },
    ],
    searchFields: ['ref', 'title'],
    filters: [
      { name: 'status', label: 'Status', options: O.QUOTE_STATUS },
      { name: 'clientId', label: 'Client', relation: 'client' },
    ],
    defaultSort: { field: 'issueDate', dir: 'desc' },
    sortable: ['ref', 'issueDate', 'expiryDate', 'status'],
  },

  invoices: {
    key: 'invoices',
    model: 'invoice',
    permission: 'invoices',
    label: 'Invoices',
    singular: 'Invoice',
    basePath: '/invoices',
    refKey: 'invoice',
    softDelete: true,
    titleOf: (r) => String(r.ref),
    fields: [
      { name: 'clientId', label: 'Client', type: 'relation', relation: 'client', required: true },
      { name: 'projectId', label: 'Related project', type: 'relation', relation: 'project' },
      { name: 'issueDate', label: 'Issue date', type: 'date', required: true },
      { name: 'dueDate', label: 'Due date', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: O.INVOICE_STATUS, defaultValue: 'DRAFT' },
      { name: 'terms', label: 'Payment terms', type: 'textarea', wide: true, defaultValue: 'Payment by bank transfer within 15 days.' },
      { name: 'notes', label: 'Notes (printed)', type: 'textarea', wide: true },
    ],
    searchFields: ['ref'],
    filters: [
      { name: 'status', label: 'Status', options: O.INVOICE_STATUS },
      { name: 'clientId', label: 'Client', relation: 'client' },
    ],
    defaultSort: { field: 'issueDate', dir: 'desc' },
    sortable: ['ref', 'issueDate', 'dueDate', 'status'],
  },

  payments: {
    key: 'payments',
    model: 'payment',
    permission: 'finance',
    label: 'Payments',
    singular: 'Payment',
    basePath: '/finance/payments',
    softDelete: false,
    titleOf: (r) => String(r.reference ?? 'Payment'),
    fields: [
      { name: 'direction', label: 'Direction', type: 'select', options: O.PAYMENT_DIRECTION, defaultValue: 'INCOMING', required: true },
      { name: 'kind', label: 'Kind', type: 'select', options: O.PAYMENT_KIND, defaultValue: 'PAYMENT' },
      { name: 'amount', label: 'Amount', type: 'money', required: true },
      { name: 'status', label: 'Status', type: 'select', options: O.PAYMENT_STATUS, defaultValue: 'PENDING' },
      { name: 'dueDate', label: 'Due date', type: 'date' },
      { name: 'paidAt', label: 'Paid on', type: 'date' },
      { name: 'method', label: 'Method', type: 'select', options: O.PAYMENT_METHOD },
      { name: 'reference', label: 'Reference', type: 'text' },
      { name: 'projectId', label: 'Project', type: 'relation', relation: 'project' },
      { name: 'supplierId', label: 'Supplier (outgoing)', type: 'relation', relation: 'supplier' },
      { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    searchFields: ['reference', 'notes'],
    filters: [
      { name: 'status', label: 'Status', options: O.PAYMENT_STATUS },
      { name: 'direction', label: 'Direction', options: O.PAYMENT_DIRECTION },
    ],
    defaultSort: { field: 'dueDate', dir: 'asc' },
    sortable: ['amount', 'dueDate', 'paidAt', 'status'],
  },

  reservations: {
    key: 'reservations',
    model: 'reservation',
    permission: 'stays',
    label: 'Reservations',
    singular: 'Reservation',
    basePath: '/stays',
    softDelete: false,
    titleOf: (r) => String(r.title),
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, wide: true },
      { name: 'type', label: 'Type', type: 'select', options: O.RESERVATION_TYPE, defaultValue: 'ACTIVITY' },
      { name: 'status', label: 'Status', type: 'select', options: O.RESERVATION_STATUS, defaultValue: 'REQUESTED' },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'time', label: 'Time', type: 'time' },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'supplierId', label: 'Supplier', type: 'relation', relation: 'supplier' },
      { name: 'confirmation', label: 'Confirmation #', type: 'text' },
      { name: 'cost', label: 'Cost', type: 'money' },
      { name: 'price', label: 'Selling price', type: 'money' },
      { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
    searchFields: ['title', 'location'],
    filters: [],
    defaultSort: { field: 'date', dir: 'asc' },
    sortable: ['date'],
  },
}

export function getResource(key: string): ResourceDef {
  const def = RESOURCES[key as ResourceKey]
  if (!def) throw new Error(`Unknown resource: ${key}`)
  return def
}
