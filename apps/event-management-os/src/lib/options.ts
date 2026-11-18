/** Shared option lists (labels + badge tones). Safe for client and server. */

export type Tone = 'coral' | 'green' | 'amber' | 'blue' | 'violet' | 'gray' | 'red' | 'teal'
export interface Opt {
  value: string
  label: string
  tone?: Tone
}

const o = (value: string, label: string, tone?: Tone): Opt => ({ value, label, tone })

export const PRIORITY: Opt[] = [o('LOW', 'Low', 'gray'), o('MEDIUM', 'Medium', 'blue'), o('HIGH', 'High', 'amber'), o('URGENT', 'Urgent', 'red')]

export const LEAD_STAGE: Opt[] = [
  o('NEW', 'New lead', 'blue'),
  o('QUALIFICATION', 'Qualification', 'violet'),
  o('CONTACTED', 'Contacted', 'teal'),
  o('MEETING', 'Meeting scheduled', 'amber'),
  o('PROPOSAL', 'Proposal sent', 'coral'),
  o('NEGOTIATION', 'Negotiation', 'amber'),
  o('WON', 'Won', 'green'),
  o('LOST', 'Lost', 'red'),
  o('ARCHIVED', 'Archived', 'gray'),
]

export const LEAD_SOURCE: Opt[] = ['Website', 'Instagram', 'Referral', 'Partner', 'Wedding fair', 'Google', 'WhatsApp', 'Repeat client', 'Other'].map((s) => o(s, s))

export const SERVICE_REQUESTED: Opt[] = ['Wedding', 'Birthday', 'Private event', 'Corporate event', 'Villa stay', 'Travel', 'Concierge', 'Other'].map((s) => o(s, s))

export const CLIENT_TYPE: Opt[] = [o('INDIVIDUAL', 'Individual', 'blue'), o('COMPANY', 'Company', 'violet')]
export const CLIENT_STATUS: Opt[] = [o('ACTIVE', 'Active', 'green'), o('VIP', 'VIP', 'coral'), o('INACTIVE', 'Inactive', 'gray')]

export const LANGUAGES: Opt[] = [o('en', 'English'), o('fr', 'Français'), o('es', 'Español'), o('it', 'Italiano'), o('de', 'Deutsch'), o('ar', 'العربية'), o('pt', 'Português')]

export const PROJECT_TYPE: Opt[] = [
  o('WEDDING', 'Wedding', 'coral'),
  o('BIRTHDAY', 'Birthday', 'amber'),
  o('PRIVATE_EVENT', 'Private event', 'violet'),
  o('CORPORATE_EVENT', 'Corporate event', 'blue'),
  o('TRAVEL', 'Travel', 'teal'),
  o('CONCIERGE', 'Concierge', 'green'),
  o('INTERNAL', 'Internal', 'gray'),
  o('CUSTOM', 'Custom', 'gray'),
]

export const PROJECT_STATUS: Opt[] = [
  o('DRAFT', 'Draft', 'gray'),
  o('PLANNING', 'Planning', 'blue'),
  o('CONFIRMED', 'Confirmed', 'violet'),
  o('IN_PROGRESS', 'In progress', 'amber'),
  o('ON_HOLD', 'On hold', 'gray'),
  o('COMPLETED', 'Completed', 'green'),
  o('CANCELLED', 'Cancelled', 'red'),
]

export const EVENT_STATUS: Opt[] = [
  o('INQUIRY', 'Inquiry', 'gray'),
  o('PLANNING', 'Planning', 'blue'),
  o('CONFIRMED', 'Confirmed', 'violet'),
  o('IN_PRODUCTION', 'In production', 'amber'),
  o('COMPLETED', 'Completed', 'green'),
  o('CANCELLED', 'Cancelled', 'red'),
]

export const TIMELINE_CATEGORY: Opt[] = [
  o('SETUP', 'Setup', 'gray'),
  o('DELIVERY', 'Delivery', 'teal'),
  o('STAFF', 'Staff arrival', 'blue'),
  o('TECH', 'Technical check', 'violet'),
  o('GUESTS', 'Guest arrival', 'coral'),
  o('PROGRAM', 'Program', 'amber'),
  o('BREAKDOWN', 'Breakdown', 'gray'),
]

export const RSVP: Opt[] = [o('PENDING', 'Pending', 'gray'), o('ACCEPTED', 'Accepted', 'green'), o('DECLINED', 'Declined', 'red'), o('MAYBE', 'Maybe', 'amber')]

export const STAY_STATUS: Opt[] = [
  o('DRAFT', 'Draft', 'gray'),
  o('PROPOSED', 'Proposed', 'blue'),
  o('CONFIRMED', 'Confirmed', 'violet'),
  o('IN_PROGRESS', 'In progress', 'amber'),
  o('COMPLETED', 'Completed', 'green'),
  o('CANCELLED', 'Cancelled', 'red'),
]

export const RESERVATION_TYPE: Opt[] = [
  o('ACCOMMODATION', 'Accommodation', 'violet'),
  o('TRANSFER', 'Transfer', 'blue'),
  o('ACTIVITY', 'Activity', 'teal'),
  o('RESTAURANT', 'Restaurant', 'coral'),
  o('EXPERIENCE', 'Experience', 'amber'),
  o('OTHER', 'Other', 'gray'),
]
export const RESERVATION_STATUS: Opt[] = [o('REQUESTED', 'Requested', 'gray'), o('PENDING', 'Pending', 'amber'), o('CONFIRMED', 'Confirmed', 'green'), o('CANCELLED', 'Cancelled', 'red')]

export const CONCIERGE_CATEGORY: Opt[] = [
  'Restaurant reservations',
  'Transportation',
  'Airport transfers',
  'Villa services',
  'Activities',
  'Experiences',
  'Wellness',
  'Shopping',
  'Private services',
  'Special requests',
].map((s) => o(s, s))

export const CONCIERGE_STATUS: Opt[] = [
  o('NEW', 'New', 'blue'),
  o('IN_PROGRESS', 'In progress', 'amber'),
  o('WAITING_SUPPLIER', 'Waiting supplier', 'violet'),
  o('CONFIRMED', 'Confirmed', 'teal'),
  o('COMPLETED', 'Completed', 'green'),
  o('CANCELLED', 'Cancelled', 'red'),
]

export const PARTNER_CATEGORY: Opt[] = ['Hotel', 'Travel agency', 'Wedding planner', 'Venue', 'Luxury brand', 'Corporate', 'Influencer', 'Real estate', 'Other'].map((s) => o(s, s))
export const PARTNERSHIP_TYPE: Opt[] = [o('REFERRAL', 'Referral'), o('STRATEGIC', 'Strategic'), o('CO_MARKETING', 'Co-marketing'), o('RESELLER', 'Reseller'), o('AFFILIATE', 'Affiliate')]
export const PARTNER_STATUS: Opt[] = [o('PROSPECT', 'Prospect', 'blue'), o('ACTIVE', 'Active', 'green'), o('PAUSED', 'Paused', 'amber'), o('ARCHIVED', 'Archived', 'gray')]

export const SUPPLIER_CATEGORIES = [
  'Venues',
  'Hotels',
  'Villas',
  'Restaurants',
  'Catering',
  'Decoration',
  'Florists',
  'Photography',
  'Videography',
  'Entertainment',
  'Sound',
  'Lighting',
  'Furniture',
  'Equipment Rental',
  'Transportation',
  'Beauty',
  'Wellness',
  'Activities',
]
export const SUPPLIER_STATUS: Opt[] = [
  o('ACTIVE', 'Active', 'green'),
  o('PREFERRED', 'Preferred', 'coral'),
  o('ON_TRIAL', 'On trial', 'blue'),
  o('SUSPENDED', 'Suspended', 'red'),
  o('ARCHIVED', 'Archived', 'gray'),
]

export const SERVICE_CATEGORY: Opt[] = ['Catering', 'Decoration', 'Furniture', 'Lighting', 'Sound', 'Photography', 'Videography', 'Entertainment', 'Transportation', 'Venue', 'Accommodation', 'Experience', 'Staffing', 'Planning fee', 'Other'].map((s) => o(s, s))
export const SERVICE_UNIT: Opt[] = ['unit', 'person', 'hour', 'day', 'night', 'package', 'km'].map((s) => o(s, s))
export const SERVICE_STATUS: Opt[] = [o('ACTIVE', 'Active', 'green'), o('DRAFT', 'Draft', 'gray'), o('ARCHIVED', 'Archived', 'gray')]

export const TASK_STATUS: Opt[] = [
  o('TODO', 'To do', 'gray'),
  o('IN_PROGRESS', 'In progress', 'blue'),
  o('WAITING', 'Waiting', 'amber'),
  o('BLOCKED', 'Blocked', 'red'),
  o('COMPLETED', 'Completed', 'green'),
  o('CANCELLED', 'Cancelled', 'gray'),
]

export const CALENDAR_TYPE: Opt[] = [
  o('MEETING', 'Meeting', 'blue'),
  o('EVENT', 'Event', 'coral'),
  o('TASK', 'Task', 'gray'),
  o('FOLLOW_UP', 'Follow-up', 'violet'),
  o('RESERVATION', 'Reservation', 'teal'),
  o('DEADLINE', 'Deadline', 'red'),
  o('DELIVERY', 'Delivery', 'amber'),
]

export const QUOTE_STATUS: Opt[] = [o('DRAFT', 'Draft', 'gray'), o('SENT', 'Sent', 'blue'), o('APPROVED', 'Approved', 'green'), o('REJECTED', 'Rejected', 'red'), o('EXPIRED', 'Expired', 'amber')]
export const INVOICE_STATUS: Opt[] = [
  o('DRAFT', 'Draft', 'gray'),
  o('SENT', 'Sent', 'blue'),
  o('PARTIALLY_PAID', 'Partially paid', 'amber'),
  o('PAID', 'Paid', 'green'),
  o('OVERDUE', 'Overdue', 'red'),
  o('CANCELLED', 'Cancelled', 'gray'),
]
export const PAYMENT_STATUS: Opt[] = [o('PENDING', 'Pending', 'amber'), o('PAID', 'Paid', 'green'), o('CANCELLED', 'Cancelled', 'gray')]
export const PAYMENT_DIRECTION: Opt[] = [o('INCOMING', 'Client → Agency', 'green'), o('OUTGOING', 'Agency → Supplier', 'violet')]
export const PAYMENT_KIND: Opt[] = [o('DEPOSIT', 'Deposit'), o('BALANCE', 'Balance'), o('PAYMENT', 'Payment'), o('REFUND', 'Refund')]
export const PAYMENT_METHOD: Opt[] = [o('TRANSFER', 'Bank transfer'), o('CARD', 'Card'), o('CASH', 'Cash'), o('CHEQUE', 'Cheque')]

export const DOCUMENT_CATEGORY: Opt[] = [
  o('CONTRACT', 'Contract', 'violet'),
  o('QUOTE', 'Quote', 'blue'),
  o('INVOICE', 'Invoice', 'green'),
  o('MOODBOARD', 'Moodboard', 'coral'),
  o('BRIEF', 'Brief', 'amber'),
  o('PHOTO', 'Photo', 'teal'),
  o('PRESENTATION', 'Presentation', 'blue'),
  o('SUPPLIER', 'Supplier document', 'gray'),
  o('CLIENT', 'Client document', 'gray'),
  o('CONFIRMATION', 'Confirmation', 'green'),
  o('OTHER', 'Other', 'gray'),
]

export const APPROVAL_STATUS: Opt[] = [o('PENDING', 'Pending', 'amber'), o('APPROVED', 'Approved', 'green'), o('REJECTED', 'Rejected', 'red')]
export const APPROVAL_CATEGORY: Opt[] = ['CONCEPT', 'MOODBOARD', 'PROPOSAL', 'QUOTE', 'TIMELINE', 'GENERAL'].map((s) => o(s, s[0] + s.slice(1).toLowerCase()))

export function findOpt(list: Opt[], value?: string | null) {
  return list.find((x) => x.value === value)
}
export function labelOf(list: Opt[], value?: string | null) {
  return findOpt(list, value)?.label ?? value ?? '—'
}
