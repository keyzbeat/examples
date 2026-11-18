/**
 * Demo seed — ALL DATA BELOW IS FICTITIOUS (names, companies, emails, phone numbers).
 * Every business record is flagged `isDemo = true` and can be purged from Administration.
 * Dates are generated relative to "today" so the dashboard always looks alive.
 *
 * Run: pnpm db:seed   (wipes the demo organization and recreates it)
 */
import { PrismaClient, type Prisma, type ProjectType, type Priority, type Supplier, type Service, type Project } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { DEFAULT_ROLES } from '../src/lib/permissions'
import { SUPPLIER_CATEGORIES } from '../src/lib/options'
import { normalizeName } from '../src/lib/utils'
import { DEFAULT_CHECKLISTS } from '../src/lib/automations'

const prisma = new PrismaClient()
const DAY = 86_400_000
const today = new Date()
today.setHours(0, 0, 0, 0)
const d = (days: number, hours = 0, minutes = 0) => new Date(today.getTime() + days * DAY + hours * 3_600_000 + minutes * 60_000)
const eur = (n: number) => Math.round(n * 100)

let seed = 42
const rnd = () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)]!

const counters: Record<string, number> = {}
const ref = (prefix: string, yearly = false) => {
  const key = yearly ? `${prefix}:${today.getFullYear()}` : prefix
  counters[key] = (counters[key] ?? 0) + 1
  const n = String(counters[key]).padStart(4, '0')
  return yearly ? `${prefix}-${today.getFullYear()}-${n}` : `${prefix}-${n}`
}

async function main() {
  const existing = await prisma.organization.findUnique({ where: { slug: 'demo' } })
  if (existing) await prisma.organization.delete({ where: { id: existing.id } })

  const org = await prisma.organization.create({ data: { name: 'Demo Agency (fictitious)', slug: 'demo', currency: 'EUR', taxRate: 20 } })
  const O = org.id

  // ── Roles & users ──
  const roles: Record<string, string> = {}
  for (const r of DEFAULT_ROLES) {
    const role = await prisma.role.create({ data: { organizationId: O, key: r.key, name: r.name, description: r.description, permissions: r.permissions, isSystem: true } })
    roles[r.key] = role.id
  }
  const hash = await bcrypt.hash('demo1234', 10)
  const mkUser = (email: string, name: string, role: string, title: string, color: string) =>
    prisma.user.create({ data: { organizationId: O, email, name, title, roleId: roles[role]!, passwordHash: hash, color } })
  const admin = await mkUser('admin@demo.events', 'Alex Morgan', 'admin', 'Managing Director', '#F07F73')
  const direction = await mkUser('direction@demo.events', 'Claire Dubois', 'management', 'Head of Operations', '#8B7CF6')
  const sales = await mkUser('sales@demo.events', 'Sam Rivera', 'sales', 'Sales Manager', '#3BA3D9')
  const sales2 = await mkUser('sales2@demo.events', 'Inès Laurent', 'sales', 'Account Executive', '#2FB59A')
  const pm = await mkUser('pm@demo.events', 'Jordan Blake', 'project_manager', 'Senior Event Manager', '#E3A33B')
  const pm2 = await mkUser('pm2@demo.events', 'Léa Martin', 'project_manager', 'Wedding Planner', '#D9608A')
  const team = await mkUser('team@demo.events', 'Noah Bennett', 'team_member', 'Event Coordinator', '#5B8DEF')
  const staff = [admin, direction, sales, sales2, pm, pm2, team]
  const pms = [pm, pm2]
  const sellers = [sales, sales2]

  // ── Supplier categories ──
  const cats: Record<string, string> = {}
  for (const name of SUPPLIER_CATEGORIES) {
    const c = await prisma.category.create({ data: { organizationId: O, kind: 'SUPPLIER', name, slug: name.toLowerCase().replace(/\s+/g, '-') } })
    cats[name] = c.id
  }

  // ── Clients ──
  const clientSeed: [string, string, string | null, string, string, 'VIP' | 'ACTIVE' | 'INACTIVE', string][] = [
    ['Sophie', 'Laurent', null, 'Paris', 'France', 'VIP', 'fr'],
    ['James', 'Whitmore', null, 'London', 'United Kingdom', 'ACTIVE', 'en'],
    ['Amira', 'Haddad', null, 'Dubai', 'UAE', 'VIP', 'en'],
    ['Lucas', 'Moreau', 'Nordlight Tech (fictitious)', 'Lyon', 'France', 'ACTIVE', 'fr'],
    ['Elena', 'Rossi', null, 'Milan', 'Italy', 'ACTIVE', 'it'],
    ['Daniel', 'Okafor', 'Helix Capital (fictitious)', 'Geneva', 'Switzerland', 'VIP', 'en'],
    ['Chloé', 'Bernard', null, 'Nice', 'France', 'ACTIVE', 'fr'],
    ['Marcus', 'Lindqvist', null, 'Stockholm', 'Sweden', 'ACTIVE', 'en'],
    ['Yasmine', 'Benali', null, 'Marrakech', 'Morocco', 'ACTIVE', 'fr'],
    ['Olivia', 'Grant', 'Grant & Partners (fictitious)', 'New York', 'USA', 'ACTIVE', 'en'],
    ['Thomas', 'Keller', null, 'Munich', 'Germany', 'INACTIVE', 'de'],
    ['Isabella', 'Costa', null, 'Lisbon', 'Portugal', 'ACTIVE', 'pt'],
    ['Hugo', 'Petit', 'Maison Aurore (fictitious)', 'Bordeaux', 'France', 'ACTIVE', 'fr'],
    ['Nadia', 'Farouk', null, 'Cairo', 'Egypt', 'ACTIVE', 'en'],
    ['Victor', 'Lemaire', null, 'Brussels', 'Belgium', 'ACTIVE', 'fr'],
    ['Grace', 'Kim', 'Lumen Studios (fictitious)', 'Los Angeles', 'USA', 'VIP', 'en'],
  ]
  const clients = []
  for (const [i, [firstName, lastName, company, city, country, status, language]] of clientSeed.entries()) {
    const email = `${firstName}.${lastName}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '@example.com'
    clients.push(
      await prisma.client.create({
        data: {
          organizationId: O,
          ref: ref('CLI'),
          type: company ? 'COMPANY' : 'INDIVIDUAL',
          status,
          firstName,
          lastName,
          company,
          email,
          emailNormalized: email,
          phone: `+33 6 00 00 ${String(10 + i).padStart(2, '0')} ${String(20 + i).padStart(2, '0')}`,
          whatsapp: `+33 6 00 00 ${String(10 + i).padStart(2, '0')} ${String(20 + i).padStart(2, '0')}`,
          city,
          country,
          language,
          ownerId: pick(sellers).id,
          preferences: pick(['Prefers champagne over wine. Allergic to shellfish.', 'Loves minimalist, natural decor. Vegetarian.', 'Always books suites with sea view.', 'Prefers WhatsApp communication, evenings only.', null]),
          notes: 'Fictitious demo client.',
          isDemo: true,
          createdAt: d(-120 + i * 6),
        },
      }),
    )
  }

  // ── Suppliers (one record each, multi-category) ──
  const supplierSeed: [string, string[], string, number, 'ACTIVE' | 'PREFERRED' | 'ON_TRIAL' | 'SUSPENDED'][] = [
    ['Château des Lys (fictitious)', ['Venues', 'Catering'], 'Provence', 5, 'PREFERRED'],
    ['Villa Azzurra (fictitious)', ['Villas', 'Venues'], 'Saint-Tropez', 5, 'PREFERRED'],
    ['Maison Fleurie (fictitious)', ['Florists', 'Decoration'], 'Paris', 5, 'PREFERRED'],
    ['Lumière Studio (fictitious)', ['Photography', 'Videography'], 'Paris', 4, 'ACTIVE'],
    ['Saveurs & Co Traiteur (fictitious)', ['Catering'], 'Lyon', 4, 'ACTIVE'],
    ['Nuit Blanche Sound (fictitious)', ['Sound', 'Lighting', 'Equipment Rental'], 'Marseille', 4, 'ACTIVE'],
    ['Riviera Chauffeurs (fictitious)', ['Transportation'], 'Nice', 5, 'PREFERRED'],
    ['Atelier Mobilier (fictitious)', ['Furniture', 'Equipment Rental'], 'Paris', 3, 'ACTIVE'],
    ['Hôtel Belvédère (fictitious)', ['Hotels', 'Restaurants', 'Venues'], 'Cannes', 4, 'ACTIVE'],
    ['Glow Beauty Collective (fictitious)', ['Beauty', 'Wellness'], 'Paris', 4, 'ACTIVE'],
    ['Blue Horizon Yachts (fictitious)', ['Activities', 'Transportation'], 'Monaco', 5, 'ACTIVE'],
    ['Jazz Lounge Quartet (fictitious)', ['Entertainment'], 'Paris', 4, 'ACTIVE'],
    ['Le Petit Bistrot (fictitious)', ['Restaurants'], 'Nice', 3, 'ON_TRIAL'],
    ['Spa Sérénité (fictitious)', ['Wellness'], 'Courchevel', 5, 'ACTIVE'],
    ['Pixel Drone Films (fictitious)', ['Videography'], 'Lyon', 2, 'SUSPENDED'],
    ['Desert Experiences (fictitious)', ['Activities'], 'Marrakech', 4, 'ACTIVE'],
    ['Riad Jasmin (fictitious)', ['Hotels', 'Villas'], 'Marrakech', 5, 'ACTIVE'],
    ['Éclat Lighting Design (fictitious)', ['Lighting', 'Decoration'], 'Paris', 4, 'ACTIVE'],
    ['Sweet Atelier Pâtisserie (fictitious)', ['Catering'], 'Paris', 5, 'ACTIVE'],
    ['Alpine Heli Transfers (fictitious)', ['Transportation', 'Activities'], 'Courchevel', 4, 'ACTIVE'],
  ]
  const suppliers: Supplier[] = []
  for (const [i, [companyName, categories, city, rating, status]] of supplierSeed.entries()) {
    const s = await prisma.supplier.create({
      data: {
        organizationId: O,
        ref: ref('SUP'),
        companyName,
        nameNormalized: normalizeName(companyName),
        city,
        coverageArea: pick(['France', 'Côte d’Azur', 'Europe', 'Regional', 'International']),
        email: `contact@supplier${i + 1}.example.com`,
        phone: `+33 4 00 00 ${String(30 + i).padStart(2, '0')} 00`,
        whatsapp: `+33 6 00 01 ${String(30 + i).padStart(2, '0')} 00`,
        instagram: `@${companyName.split(' (')[0]!.toLowerCase().replace(/[^a-z]/g, '')}`,
        website: `https://supplier${i + 1}.example.com`,
        servicesOffered: categories.join(', '),
        pricing: pick(['From €1,200 / day', 'Quote on request', 'From €85 per guest', 'Packages from €3,500']),
        conditions: '30% deposit, balance 7 days before service.',
        availability: pick(['Weekends booked 6 months ahead', 'Good availability', 'Closed in August']),
        status,
        rating,
        favorite: status === 'PREFERRED',
        notes: status === 'SUSPENDED' ? 'Suspended after late delivery on two projects (fictitious).' : null,
        isDemo: true,
        categories: { connect: categories.map((c) => ({ id: cats[c]! })) },
        contacts: { create: [{ name: pick(['Marie', 'Paul', 'Julie', 'Marco', 'Sara']) + ' ' + pick(['Durand', 'Ricci', 'Lopez', 'Weber']), role: 'Sales', email: `sales@supplier${i + 1}.example.com`, isPrimary: true }] },
      },
    })
    suppliers.push(s)
  }
  const sup = (name: string) => suppliers.find((s) => s.companyName.startsWith(name))!

  // ── Partners ──
  const partnerSeed: [string, string, string, number][] = [
    ['Grand Hôtel Riviera (fictitious)', 'Hotel', 'REFERRAL', 10],
    ['Voyages Prestige (fictitious)', 'Travel agency', 'STRATEGIC', 8],
    ['Atelier Mariage Paris (fictitious)', 'Wedding planner', 'REFERRAL', 12],
    ['Maison Joaillerie (fictitious)', 'Luxury brand', 'CO_MARKETING', 0],
    ['Côte Estates (fictitious)', 'Real estate', 'AFFILIATE', 5],
    ['Nomad Corporate Travel (fictitious)', 'Corporate', 'RESELLER', 7],
  ]
  const partners = []
  for (const [i, [companyName, category, partnershipType, commissionRate]] of partnerSeed.entries()) {
    partners.push(
      await prisma.partner.create({
        data: {
          organizationId: O,
          ref: ref('PAR'),
          companyName,
          nameNormalized: normalizeName(companyName),
          category,
          partnershipType,
          commissionRate,
          city: pick(['Paris', 'Nice', 'Cannes', 'Monaco', 'Geneva']),
          country: 'France',
          contactName: pick(['Camille Roux', 'Antoine Girard', 'Laura Chen', 'Mehdi Alami']),
          email: `partner${i + 1}@example.com`,
          phone: `+33 1 00 00 ${String(40 + i)} 00`,
          website: `https://partner${i + 1}.example.com`,
          conditions: commissionRate ? `${commissionRate}% commission on net amount, paid at event completion.` : 'Visibility exchange, no commission.',
          status: i === 4 ? 'PROSPECT' : 'ACTIVE',
          isDemo: true,
        },
      }),
    )
  }

  // ── Services catalog ──
  const serviceSeed: [string, string, number, number, string, string | null][] = [
    ['Full wedding planning', 'Planning fee', 0, 8500, 'package', null],
    ['Event coordination (day-of)', 'Planning fee', 0, 1800, 'day', null],
    ['Gourmet dinner menu', 'Catering', 85, 135, 'person', 'Saveurs'],
    ['Champagne reception', 'Catering', 22, 38, 'person', 'Saveurs'],
    ['Wedding cake (3 tiers)', 'Catering', 450, 780, 'unit', 'Sweet Atelier'],
    ['Floral centerpiece', 'Decoration', 65, 120, 'unit', 'Maison Fleurie'],
    ['Ceremony floral arch', 'Decoration', 900, 1650, 'unit', 'Maison Fleurie'],
    ['Lounge furniture set', 'Furniture', 380, 690, 'unit', 'Atelier Mobilier'],
    ['Ambient lighting package', 'Lighting', 1200, 2100, 'package', 'Éclat'],
    ['DJ & sound system', 'Sound', 1100, 1900, 'package', 'Nuit Blanche'],
    ['Jazz quartet (3h)', 'Entertainment', 1400, 2300, 'package', 'Jazz Lounge'],
    ['Photography — full day', 'Photography', 1600, 2800, 'day', 'Lumière'],
    ['Videography — highlight film', 'Videography', 1800, 3200, 'package', 'Lumière'],
    ['Luxury sedan with chauffeur', 'Transportation', 70, 120, 'hour', 'Riviera'],
    ['Airport transfer (Van)', 'Transportation', 95, 160, 'unit', 'Riviera'],
    ['Private yacht day', 'Experience', 4200, 6500, 'day', 'Blue Horizon'],
    ['Spa day for two', 'Experience', 320, 520, 'package', 'Spa Sérénité'],
    ['Desert sunset dinner', 'Experience', 180, 320, 'person', 'Desert'],
    ['Villa rental — per night', 'Accommodation', 2200, 3100, 'night', 'Villa Azzurra'],
    ['Event staff (waiter)', 'Staffing', 28, 45, 'hour', null],
  ]
  const services: Service[] = []
  for (const [name, category, cost, price, unit, supplierName] of serviceSeed) {
    services.push(
      await prisma.service.create({
        data: { organizationId: O, ref: ref('SRV'), name, category, cost: eur(cost), price: eur(price), unit, taxRate: 20, supplierId: supplierName ? sup(supplierName).id : null, description: `${name} — fictitious catalog item.`, isDemo: true },
      }),
    )
  }
  const svc = (name: string) => services.find((s) => s.name === name)!

  // ── Projects ──
  const projectSeed: { name: string; client: number; type: ProjectType; status: Prisma.ProjectCreateInput['status']; start: number; budget: number; location: string; manager: typeof pm; priority: Priority }[] = [
    { name: 'Laurent Wedding — Château des Lys', client: 0, type: 'WEDDING', status: 'IN_PROGRESS', start: 24, budget: 85000, location: 'Provence', manager: pm2, priority: 'HIGH' },
    { name: 'Nordlight Annual Summit', client: 3, type: 'CORPORATE_EVENT', status: 'CONFIRMED', start: 11, budget: 120000, location: 'Lyon', manager: pm, priority: 'URGENT' },
    { name: 'Haddad 40th Birthday — Yacht Party', client: 2, type: 'BIRTHDAY', status: 'PLANNING', start: 38, budget: 45000, location: 'Monaco', manager: pm, priority: 'HIGH' },
    { name: 'Whitmore Family Riviera Stay', client: 1, type: 'TRAVEL', status: 'CONFIRMED', start: 6, budget: 32000, location: 'Saint-Tropez', manager: pm2, priority: 'MEDIUM' },
    { name: 'Rossi Engagement Dinner', client: 4, type: 'PRIVATE_EVENT', status: 'IN_PROGRESS', start: 4, budget: 14000, location: 'Nice', manager: pm2, priority: 'HIGH' },
    { name: 'Helix Capital Investor Retreat', client: 5, type: 'CORPORATE_EVENT', status: 'PLANNING', start: 62, budget: 95000, location: 'Courchevel', manager: pm, priority: 'MEDIUM' },
    { name: 'Benali Marrakech Wedding', client: 8, type: 'WEDDING', status: 'PLANNING', start: 120, budget: 110000, location: 'Marrakech', manager: pm2, priority: 'MEDIUM' },
    { name: 'Lumen Studios Launch Party', client: 15, type: 'CORPORATE_EVENT', status: 'COMPLETED', start: -21, budget: 60000, location: 'Cannes', manager: pm, priority: 'MEDIUM' },
    { name: 'Grant & Partners Concierge Retainer', client: 9, type: 'CONCIERGE', status: 'IN_PROGRESS', start: -30, budget: 18000, location: 'Paris', manager: pm, priority: 'LOW' },
    { name: 'Costa Anniversary Weekend', client: 11, type: 'PRIVATE_EVENT', status: 'COMPLETED', start: -45, budget: 9000, location: 'Lisbon', manager: pm2, priority: 'LOW' },
  ]
  const projects: Project[] = []
  for (const p of projectSeed) {
    const project = await prisma.project.create({
      data: {
        organizationId: O,
        ref: ref('PRJ'),
        name: p.name,
        clientId: clients[p.client]!.id,
        managerId: p.manager.id,
        type: p.type,
        status: p.status,
        priority: p.priority,
        startDate: d(p.start),
        endDate: d(p.start + (p.type === 'TRAVEL' ? 7 : p.type === 'CONCIERGE' ? 180 : 1)),
        location: p.location,
        budget: eur(p.budget),
        description: `Fictitious demo project for ${clientSeed[p.client]![0]} ${clientSeed[p.client]![1]}.`,
        isDemo: true,
        createdAt: d(Math.min(-10, p.start - 90)),
        members: { create: [{ userId: team.id, role: 'Coordinator' }] },
      },
    })
    projects.push(project)
    // checklist tasks
    const items = DEFAULT_CHECKLISTS[p.type]
    for (const [i, it] of items.entries()) {
      const due = it.offsetDays >= 0 ? d(Math.min(p.start, -12 + it.offsetDays)) : d(p.start + it.offsetDays)
      const done = p.status === 'COMPLETED' || due < d(-2)
      await prisma.task.create({
        data: {
          organizationId: O,
          ref: ref('TSK'),
          title: it.title,
          projectId: project.id,
          clientId: project.clientId,
          assigneeId: i % 3 === 2 ? team.id : p.manager.id,
          priority: it.priority ?? 'MEDIUM',
          status: done ? 'COMPLETED' : due < d(0) ? pick(['IN_PROGRESS', 'TODO', 'WAITING'] as const) : pick(['TODO', 'TODO', 'IN_PROGRESS'] as const),
          completedAt: done ? due : null,
          dueDate: due,
          position: i,
          source: 'automation:project-checklist',
          isDemo: true,
        },
      })
    }
    const counts = await prisma.task.groupBy({ by: ['status'], where: { projectId: project.id }, _count: true })
    const total = counts.reduce((a, c) => a + c._count, 0)
    const done = counts.find((c) => c.status === 'COMPLETED')?._count ?? 0
    await prisma.project.update({ where: { id: project.id }, data: { progress: Math.round((done / total) * 100) } })
    for (const s of [sup('Château'), sup('Maison Fleurie'), sup('Lumière'), sup('Riviera')].slice(0, 2 + (projects.length % 3))) {
      await prisma.projectSupplier.create({ data: { projectId: project.id, supplierId: s.id, status: pick(['PROPOSED', 'BOOKED', 'CONFIRMED']) } })
    }
  }

  // ── Extra standalone tasks ──
  const looseTasks: [string, number, Priority, typeof pm][] = [
    ['Call back Amira about yacht options', 0, 'HIGH', sales],
    ['Prepare Q3 supplier performance review', 3, 'MEDIUM', direction],
    ['Update wedding package pricing', -2, 'HIGH', admin],
    ['Send thank-you gift to Lumen Studios', -1, 'LOW', pm],
    ['Confirm florist delivery window', 1, 'URGENT', pm2],
    ['Collect dietary list from Nordlight HR', 2, 'HIGH', team],
    ['Review transport rider for summit', 0, 'MEDIUM', team],
  ]
  for (const [title, due, priority, user] of looseTasks) {
    await prisma.task.create({ data: { organizationId: O, ref: ref('TSK'), title, assigneeId: user.id, createdById: admin.id, priority, dueDate: d(due, 17), status: due < 0 ? 'IN_PROGRESS' : 'TODO', isDemo: true } })
  }

  // ── Events ──
  const eventSeed: { name: string; project: number; type: ProjectType; guests: number; venue: string; theme: string; palette: string[]; status: Prisma.EventCreateInput['status'] }[] = [
    { name: 'Laurent Wedding — Ceremony & Reception', project: 0, type: 'WEDDING', guests: 140, venue: 'Château des Lys (fictitious)', theme: 'Provençal garden romance', palette: ['#F5F1ED', '#F07F73', '#A3B18A', '#FFFFFF'], status: 'CONFIRMED' },
    { name: 'Nordlight Summit — Day 1', project: 1, type: 'CORPORATE_EVENT', guests: 320, venue: 'Lyon Convention Hall (fictitious)', theme: 'Northern lights — innovation', palette: ['#0F172A', '#38BDF8', '#A78BFA', '#FFFFFF'], status: 'IN_PRODUCTION' },
    { name: 'Haddad 40th — Yacht Party', project: 2, type: 'BIRTHDAY', guests: 60, venue: 'Blue Horizon Yacht (fictitious)', theme: 'Golden riviera nights', palette: ['#111111', '#C8A951', '#FFFFFF'], status: 'PLANNING' },
    { name: 'Rossi Engagement Dinner', project: 4, type: 'PRIVATE_EVENT', guests: 36, venue: 'Hôtel Belvédère rooftop (fictitious)', theme: 'Italian summer table', palette: ['#FCE9E6', '#E9C46A', '#2A9D8F'], status: 'CONFIRMED' },
    { name: 'Helix Retreat — Welcome Evening', project: 5, type: 'CORPORATE_EVENT', guests: 45, venue: 'Alpine Lodge (fictitious)', theme: 'Cozy alpine luxury', palette: ['#3F3D38', '#F5F1ED', '#B85650'], status: 'PLANNING' },
    { name: 'Lumen Studios Launch Party', project: 7, type: 'CORPORATE_EVENT', guests: 250, venue: 'Hôtel Belvédère (fictitious)', theme: 'Neon cinema', palette: ['#0B0B0F', '#F07F73', '#7C3AED'], status: 'COMPLETED' },
  ]
  const events = []
  for (const e of eventSeed) {
    const project = projects[e.project]!
    const ev = await prisma.event.create({
      data: {
        organizationId: O,
        ref: ref('EVT'),
        name: e.name,
        type: e.type,
        clientId: project.clientId,
        projectId: project.id,
        date: project.startDate,
        startTime: '16:00',
        endTime: '01:00',
        venue: e.venue,
        location: project.location,
        guestCount: e.guests,
        theme: e.theme,
        palette: e.palette,
        concept: 'Fictitious concept: warm welcome, curated dinner, live music and a surprise finale.',
        budget: Math.round((project.budget ?? 0) * 0.7),
        status: e.status,
        logistics: 'Load-in via service entrance. Parking for 6 supplier vans.',
        isDemo: true,
        members: { create: [{ userId: project.managerId!, role: 'Lead' }, { userId: team.id, role: 'Coordinator' }] },
        timeline: {
          create: [
            { time: '09:00', title: 'Venue access & setup begins', category: 'SETUP' },
            { time: '11:00', title: 'Furniture & florals delivery', category: 'DELIVERY' },
            { time: '13:00', title: 'Catering team arrival', category: 'STAFF' },
            { time: '14:30', title: 'Sound & lighting checks', category: 'TECH' },
            { time: '16:00', title: 'Guest arrival & welcome drinks', category: 'GUESTS' },
            { time: '17:00', title: 'Ceremony / opening speech', category: 'PROGRAM' },
            { time: '20:00', title: 'Dinner service', category: 'PROGRAM' },
            { time: '22:30', title: 'Party & entertainment', category: 'PROGRAM' },
            { time: '01:00', title: 'Breakdown & load-out', category: 'BREAKDOWN' },
          ],
        },
        services: {
          create: [
            { serviceId: svc('Gourmet dinner menu').id, quantity: e.guests, unitCost: svc('Gourmet dinner menu').cost, unitPrice: svc('Gourmet dinner menu').price },
            { serviceId: svc('Floral centerpiece').id, quantity: Math.ceil(e.guests / 10), unitCost: svc('Floral centerpiece').cost, unitPrice: svc('Floral centerpiece').price },
            { serviceId: svc('DJ & sound system').id, quantity: 1, unitCost: svc('DJ & sound system').cost, unitPrice: svc('DJ & sound system').price },
            { serviceId: svc('Photography — full day').id, quantity: 1, unitCost: svc('Photography — full day').cost, unitPrice: svc('Photography — full day').price },
          ],
        },
      },
    })
    events.push(ev)
    const guestNames = ['Anna Weber', 'Pierre Lambert', 'Mia Johansson', 'Karim Saidi', 'Laura Bianchi', 'Ethan Clarke', 'Zoé Fontaine', 'Omar Haddad', 'Sofia Navarro', 'Ben Taylor', 'Julia Novak', 'Louis Garnier']
    for (const [i, name] of guestNames.entries()) {
      await prisma.guest.create({ data: { eventId: ev.id, name: `${name} (fictitious)`, email: `guest${i + 1}@example.com`, rsvp: pick(['ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'PENDING', 'DECLINED', 'MAYBE'] as const), dietary: pick([null, null, 'Vegetarian', 'Gluten-free', 'Vegan', 'No shellfish']), table: `Table ${1 + (i % 4)}`, plusOnes: i % 3 === 0 ? 1 : 0 } })
    }
  }

  // ── Stays & reservations ──
  const stay = await prisma.stay.create({
    data: {
      organizationId: O,
      ref: ref('STY'),
      title: 'Whitmore Family — Riviera Week',
      clientId: clients[1]!.id,
      projectId: projects[3]!.id,
      destination: 'Saint-Tropez, France',
      checkIn: d(6),
      checkOut: d(13),
      travelers: 5,
      accommodation: 'Villa Azzurra (fictitious) — 5 bedrooms, sea view',
      transfers: 'Nice airport ⇄ villa by private van. Daily chauffeur on request.',
      budget: eur(32000),
      status: 'CONFIRMED',
      shareToken: 'demo-itinerary-' + Math.random().toString(36).slice(2, 12),
      isDemo: true,
    },
  })
  const resv: [number, string, string, string, string | null, 'CONFIRMED' | 'PENDING' | 'REQUESTED'][] = [
    [6, '14:30', 'TRANSFER', 'Airport pick-up — Nice Côte d’Azur', 'Riviera', 'CONFIRMED'],
    [6, '16:30', 'ACCOMMODATION', 'Check-in Villa Azzurra', 'Villa Azzurra', 'CONFIRMED'],
    [7, '20:00', 'RESTAURANT', 'Dinner at Le Petit Bistrot', 'Le Petit Bistrot', 'CONFIRMED'],
    [8, '10:00', 'EXPERIENCE', 'Private yacht day to Porquerolles', 'Blue Horizon', 'PENDING'],
    [10, '11:00', 'EXPERIENCE', 'Spa day for two', 'Spa Sérénité', 'REQUESTED'],
    [13, '10:00', 'TRANSFER', 'Airport drop-off', 'Riviera', 'CONFIRMED'],
  ]
  for (const [day, time, type, title, s, status] of resv) {
    await prisma.reservation.create({ data: { organizationId: O, stayId: stay.id, date: d(day), time, type, title, supplierId: s ? sup(s).id : null, status, confirmation: status === 'CONFIRMED' ? `CNF-${Math.floor(rnd() * 90000 + 10000)}` : null, cost: eur(200 + rnd() * 3000), price: eur(400 + rnd() * 4000) } })
  }
  const stay2 = await prisma.stay.create({ data: { organizationId: O, ref: ref('STY'), title: 'Benali — Marrakech scouting trip', clientId: clients[8]!.id, projectId: projects[6]!.id, destination: 'Marrakech, Morocco', checkIn: d(30), checkOut: d(33), travelers: 2, accommodation: 'Riad Jasmin (fictitious)', budget: eur(6500), status: 'PROPOSED', isDemo: true } })
  await prisma.reservation.create({ data: { organizationId: O, stayId: stay2.id, date: d(31), time: '18:00', type: 'EXPERIENCE', title: 'Desert sunset dinner', supplierId: sup('Desert').id, status: 'REQUESTED' } })
  await prisma.stay.create({ data: { organizationId: O, ref: ref('STY'), title: 'Okafor — Courchevel ski week', clientId: clients[5]!.id, destination: 'Courchevel, France', checkIn: d(70), checkOut: d(77), travelers: 4, accommodation: 'Chalet to be confirmed', budget: eur(48000), status: 'DRAFT', isDemo: true } })

  // ── Concierge ──
  const conc: [string, string, number, Priority, string | null, number, number, 'NEW' | 'IN_PROGRESS' | 'WAITING_SUPPLIER' | 'CONFIRMED' | 'COMPLETED'][] = [
    ['Table for 6 at a rooftop restaurant, Saturday 9pm', 'Restaurant reservations', 9, 'HIGH', 'Hôtel Belvédère', 2, 0, 'IN_PROGRESS'],
    ['Airport transfer CDG → Hotel, 3 guests', 'Airport transfers', 9, 'MEDIUM', 'Riviera', 1, 160, 'CONFIRMED'],
    ['Private chef for villa dinner', 'Villa services', 1, 'HIGH', 'Saveurs', 7, 1800, 'WAITING_SUPPLIER'],
    ['Helicopter transfer to Courchevel', 'Transportation', 5, 'URGENT', 'Alpine Heli', 3, 4200, 'NEW'],
    ['Personal shopper — Avenue Montaigne', 'Shopping', 2, 'LOW', null, 12, 600, 'NEW'],
    ['Couples massage at the villa', 'Wellness', 1, 'MEDIUM', 'Spa Sérénité', 8, 520, 'IN_PROGRESS'],
    ['Sunset yacht aperitivo', 'Experiences', 2, 'MEDIUM', 'Blue Horizon', 15, 3200, 'NEW'],
    ['Birthday flowers delivery', 'Special requests', 0, 'LOW', 'Maison Fleurie', -3, 180, 'COMPLETED'],
  ]
  for (const [title, category, c, priority, s, days, price, status] of conc) {
    await prisma.conciergeRequest.create({
      data: { organizationId: O, ref: ref('CON'), title, category, clientId: clients[c]!.id, projectId: c === 9 ? projects[8]!.id : null, priority, supplierId: s ? sup(s).id : null, assignedToId: pick([pm, team, pm2]).id, requestedDate: d(days, 20), deadline: d(Math.max(days - 1, -3), 12), cost: price ? eur(price * 0.7) : null, price: price ? eur(price) : null, status, confirmation: status === 'CONFIRMED' || status === 'COMPLETED' ? 'CNF-' + Math.floor(rnd() * 90000 + 10000) : null, isDemo: true },
    })
  }

  // ── Leads (pipeline) ──
  const leadSeed: [string, string, string | null, string, string, number, number, Prisma.LeadCreateInput['stage'], Priority][] = [
    ['Emma', 'Collins', null, 'Wedding', 'Instagram', 65000, 0, 'NEW', 'HIGH'],
    ['Raphaël', 'Garnier', null, 'Birthday', 'Website', 12000, 1, 'NEW', 'MEDIUM'],
    ['Priya', 'Nair', 'Orbis Pharma (fictitious)', 'Corporate event', 'Referral', 80000, 0, 'QUALIFICATION', 'HIGH'],
    ['Lina', 'Moretti', null, 'Wedding', 'Wedding fair', 90000, 1, 'QUALIFICATION', 'MEDIUM'],
    ['Oscar', 'Nilsson', null, 'Villa stay', 'Partner', 28000, 0, 'CONTACTED', 'MEDIUM'],
    ['Camille', 'Faure', null, 'Private event', 'Google', 15000, 1, 'CONTACTED', 'LOW'],
    ['Ahmed', 'Rahman', 'Gulfstar Holdings (fictitious)', 'Corporate event', 'Partner', 150000, 0, 'MEETING', 'URGENT'],
    ['Charlotte', 'Webb', null, 'Wedding', 'Referral', 72000, 1, 'MEETING', 'HIGH'],
    ['Diego', 'Ramírez', null, 'Travel', 'Instagram', 22000, 0, 'PROPOSAL', 'MEDIUM'],
    ['Hannah', 'Schmidt', 'Brightwave GmbH (fictitious)', 'Corporate event', 'Website', 54000, 1, 'PROPOSAL', 'HIGH'],
    ['Lucie', 'Roy', null, 'Wedding', 'Repeat client', 48000, 0, 'NEGOTIATION', 'HIGH'],
    ['Mateo', 'Silva', null, 'Concierge', 'WhatsApp', 9000, 1, 'NEGOTIATION', 'MEDIUM'],
    ['Sophie', 'Laurent', null, 'Wedding', 'Referral', 85000, 0, 'WON', 'HIGH'],
    ['Kenji', 'Watanabe', null, 'Private event', 'Website', 11000, 1, 'LOST', 'LOW'],
    ['Eva', 'Novak', null, 'Birthday', 'Instagram', 7000, 0, 'ARCHIVED', 'LOW'],
  ]
  for (const [i, [firstName, lastName, company, service, source, budget, seller, stage, priority]] of leadSeed.entries()) {
    const email = `${firstName}.${lastName}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '@example.com'
    const lead = await prisma.lead.create({
      data: {
        organizationId: O,
        ref: ref('LEAD'),
        firstName,
        lastName,
        company,
        email,
        phone: `+33 7 00 00 ${String(10 + i).padStart(2, '0')} 00`,
        whatsapp: `+33 7 00 00 ${String(10 + i).padStart(2, '0')} 00`,
        city: pick(['Paris', 'London', 'Geneva', 'Nice', 'Dubai', 'Milan']),
        country: pick(['France', 'United Kingdom', 'Switzerland', 'UAE', 'Italy']),
        source,
        serviceRequested: service,
        estimatedBudget: eur(budget),
        eventDate: d(60 + i * 12),
        assignedToId: sellers[seller]!.id,
        priority,
        stage,
        position: i,
        nextFollowUp: ['WON', 'LOST', 'ARCHIVED'].includes(stage!) ? null : d(i % 4 === 0 ? -1 : (i % 5) - 1, 10 + (i % 6)),
        notes: 'Fictitious lead created for the demo.',
        lostReason: stage === 'LOST' ? 'Budget too low for requested scope' : null,
        clientId: stage === 'WON' ? clients[0]!.id : null,
        projectId: stage === 'WON' ? projects[0]!.id : null,
        isDemo: true,
        createdAt: d(-40 + i * 2),
        interactions: {
          create: [
            { organizationId: O, type: 'NOTE', summary: `Inbound request via ${source}.`, occurredAt: d(-40 + i * 2), userId: sellers[seller]!.id },
            ...(['NEW', 'QUALIFICATION'].includes(stage!) ? [] : [{ organizationId: O, type: 'CALL' as const, summary: 'Discovery call — budget and date confirmed.', occurredAt: d(-30 + i * 2), userId: sellers[seller]!.id }]),
          ],
        },
      },
    })
    if (stage === 'NEW') await prisma.task.create({ data: { organizationId: O, ref: ref('TSK'), title: `Qualify lead ${firstName} ${lastName}`, leadId: lead.id, assigneeId: sellers[seller]!.id, priority: 'HIGH', dueDate: d(1), source: 'automation:new-lead', isDemo: true } })
  }

  // ── Quotes & invoices & payments ──
  const mkQuote = async (projectIdx: number, status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED', issue: number, items: [string, number][], discountPct = 0) => {
    const project = projects[projectIdx]!
    return prisma.quotation.create({
      data: {
        organizationId: O,
        ref: ref('Q', true),
        title: project.name,
        clientId: project.clientId!,
        projectId: project.id,
        issueDate: d(issue),
        expiryDate: d(issue + 30),
        status,
        discountPct,
        approvedAt: status === 'APPROVED' ? d(issue + 5) : null,
        terms: '30% deposit on signature, balance 15 days before the event. Quote valid 30 days.',
        isDemo: true,
        items: { create: items.map(([n, q], i) => ({ serviceId: svc(n).id, description: n, quantity: q, unitPrice: svc(n).price, unitCost: svc(n).cost, taxRate: 20, position: i })) },
      },
      include: { items: true },
    })
  }
  const q1 = await mkQuote(0, 'APPROVED', -60, [['Full wedding planning', 1], ['Gourmet dinner menu', 140], ['Champagne reception', 140], ['Ceremony floral arch', 1], ['Floral centerpiece', 14], ['Photography — full day', 1], ['Videography — highlight film', 1], ['Jazz quartet (3h)', 1]], 5)
  const q2 = await mkQuote(1, 'APPROVED', -45, [['Event coordination (day-of)', 2], ['Gourmet dinner menu', 320], ['Ambient lighting package', 2], ['DJ & sound system', 1], ['Event staff (waiter)', 120]])
  await mkQuote(2, 'SENT', -6, [['Private yacht day', 1], ['Champagne reception', 60], ['DJ & sound system', 1], ['Photography — full day', 1]])
  await mkQuote(5, 'DRAFT', -1, [['Event coordination (day-of)', 3], ['Gourmet dinner menu', 45], ['Spa day for two', 10]])
  const q5 = await mkQuote(4, 'APPROVED', -20, [['Gourmet dinner menu', 36], ['Floral centerpiece', 6], ['Jazz quartet (3h)', 1]])
  await mkQuote(6, 'SENT', -3, [['Full wedding planning', 1], ['Desert sunset dinner', 180]])
  const q7 = await mkQuote(7, 'APPROVED', -90, [['Event coordination (day-of)', 1], ['Gourmet dinner menu', 250], ['Ambient lighting package', 1], ['DJ & sound system', 1]])

  const totalOf = (items: { quantity: number; unitPrice: number; taxRate: number }[], disc = 0) => Math.round(items.reduce((a, it) => a + it.quantity * it.unitPrice * (1 - disc / 100) * (1 + it.taxRate / 100), 0))
  const mkInvoice = async (q: Awaited<ReturnType<typeof mkQuote>>, label: string, share: number, issue: number, dueIn: number, paid: 'PAID' | 'PENDING' | 'LATE') => {
    const amount = Math.round(totalOf(q.items, q.discountPct) * share)
    const net = Math.round(amount / 1.2)
    const inv = await prisma.invoice.create({
      data: {
        organizationId: O,
        ref: ref('INV', true),
        clientId: q.clientId,
        projectId: q.projectId,
        quotationId: q.id,
        issueDate: d(issue),
        dueDate: d(issue + dueIn),
        status: paid === 'PAID' ? 'PAID' : paid === 'LATE' ? 'OVERDUE' : 'SENT',
        terms: 'Payment by bank transfer within 15 days.',
        isDemo: true,
        items: { create: [{ description: `${label} — ${q.title}`, quantity: 1, unitPrice: net, taxRate: 20 }] },
      },
    })
    await prisma.payment.create({ data: { organizationId: O, direction: 'INCOMING', kind: label.startsWith('Deposit') ? 'DEPOSIT' : 'BALANCE', invoiceId: inv.id, projectId: q.projectId, amount: Math.round(net * 1.2), dueDate: d(issue + dueIn), paidAt: paid === 'PAID' ? d(issue + Math.max(1, dueIn - 3)) : null, status: paid === 'PAID' ? 'PAID' : 'PENDING', method: 'TRANSFER', reference: inv.ref, isDemo: true } })
    return inv
  }
  await mkInvoice(q1, 'Deposit 30%', 0.3, -55, 15, 'PAID')
  await mkInvoice(q1, 'Balance 70%', 0.7, -2, 15, 'PENDING')
  await mkInvoice(q2, 'Deposit 30%', 0.3, -40, 15, 'PAID')
  await mkInvoice(q2, 'Balance 70%', 0.7, -18, 14, 'LATE')
  await mkInvoice(q5, 'Deposit 50%', 0.5, -18, 10, 'PAID')
  await mkInvoice(q7, 'Deposit 30%', 0.3, -85, 15, 'PAID')
  await mkInvoice(q7, 'Balance 70%', 0.7, -35, 15, 'PAID')

  // supplier payments
  const supPays: [string, number, number, number, 'PAID' | 'PENDING'][] = [
    ['Château', 0, 12000, -20, 'PAID'],
    ['Château', 0, 18000, 10, 'PENDING'],
    ['Maison Fleurie', 0, 3200, 2, 'PENDING'],
    ['Saveurs', 1, 22000, -5, 'PAID'],
    ['Nuit Blanche', 1, 4200, 1, 'PENDING'],
    ['Hôtel Belvédère', 7, 15000, -40, 'PAID'],
    ['Villa Azzurra', 3, 15400, -10, 'PAID'],
    ['Riviera', 3, 1200, 5, 'PENDING'],
  ]
  for (const [s, p, amount, due, status] of supPays) {
    await prisma.payment.create({ data: { organizationId: O, direction: 'OUTGOING', kind: 'PAYMENT', supplierId: sup(s).id, projectId: projects[p]!.id, amount: eur(amount), dueDate: d(due), paidAt: status === 'PAID' ? d(due) : null, status, method: 'TRANSFER', isDemo: true } })
  }
  // historic revenue (completed projects in previous months) for charts
  for (let m = 1; m <= 5; m++) {
    const date = new Date(today.getFullYear(), today.getMonth() - m, 12)
    await prisma.payment.create({ data: { organizationId: O, direction: 'INCOMING', kind: 'PAYMENT', projectId: projects[8]!.id, amount: eur(14000 + rnd() * 26000), dueDate: date, paidAt: date, status: 'PAID', method: 'TRANSFER', reference: 'Historic (fictitious)', isDemo: true } })
    await prisma.payment.create({ data: { organizationId: O, direction: 'OUTGOING', kind: 'PAYMENT', projectId: projects[8]!.id, supplierId: pick(suppliers).id, amount: eur(7000 + rnd() * 14000), dueDate: date, paidAt: date, status: 'PAID', method: 'TRANSFER', isDemo: true } })
  }
  await prisma.commission.create({ data: { organizationId: O, partnerId: partners[0]!.id, projectId: projects[3]!.id, rate: 10, amount: eur(3200), status: 'PENDING' } })
  await prisma.commission.create({ data: { organizationId: O, partnerId: partners[2]!.id, projectId: projects[0]!.id, rate: 12, amount: eur(5400), status: 'PENDING' } })
  await prisma.commission.create({ data: { organizationId: O, partnerId: partners[1]!.id, projectId: projects[7]!.id, rate: 8, amount: eur(2900), status: 'PAID' } })

  // ── Calendar ──
  const cal: [string, 'MEETING' | 'DEADLINE' | 'DELIVERY' | 'FOLLOW_UP', number, number, typeof pm, number | null][] = [
    ['Tasting session — Laurent wedding', 'MEETING', 1, 11, pm2, 0],
    ['Nordlight production meeting', 'MEETING', 0, 15, pm, 1],
    ['Weekly team stand-up', 'MEETING', 0, 9, admin, null],
    ['Florist final quote deadline', 'DEADLINE', 3, 18, pm2, 0],
    ['Stage & LED delivery', 'DELIVERY', 10, 8, pm, 1],
    ['Follow-up call — Gulfstar', 'FOLLOW_UP', 2, 10, sales, null],
    ['Venue visit — Courchevel', 'MEETING', 5, 14, pm, 5],
    ['Client presentation — Haddad', 'MEETING', 4, 16, pm, 2],
    ['Monthly finance review', 'MEETING', 7, 10, direction, null],
    ['Supplier contracts deadline', 'DEADLINE', -1, 18, pm, 1],
  ]
  for (const [title, type, day, hour, owner, p] of cal) {
    await prisma.calendarEvent.create({ data: { organizationId: O, title, type, start: d(day, hour), end: d(day, hour + 1), ownerId: owner.id, projectId: p !== null ? projects[p]!.id : null, location: type === 'MEETING' ? pick(['Office', 'Video call', 'On site']) : null } })
  }

  // ── Client portal account & collaboration ──
  await prisma.user.create({ data: { organizationId: O, email: 'client@demo.events', name: 'Sophie Laurent', roleId: roles.client!, clientId: clients[0]!.id, passwordHash: hash, color: '#B85650', locale: 'en' } })
  await prisma.approval.createMany({
    data: [
      { organizationId: O, projectId: projects[0]!.id, title: 'Decoration concept — garden romance', category: 'CONCEPT', description: 'Pastel florals, linen tablecloths, candle-lit garden path.', status: 'APPROVED', decidedAt: d(-20), clientComment: 'Love it!' },
      { organizationId: O, projectId: projects[0]!.id, title: 'Moodboard v2', category: 'MOODBOARD', description: 'Updated with the coral accent palette.', status: 'PENDING' },
      { organizationId: O, projectId: projects[0]!.id, title: 'Reception timeline', category: 'TIMELINE', description: 'Ceremony at 17:00, dinner 20:00, party 22:30.', status: 'PENDING' },
    ],
  })
  await prisma.message.createMany({
    data: [
      { organizationId: O, projectId: projects[0]!.id, authorId: pm2.id, body: 'Hello Sophie! The updated moodboard is ready for your review in the portal.', createdAt: d(-2, 10) },
      { organizationId: O, projectId: projects[0]!.id, authorId: pm2.id, body: 'We also shared the draft reception timeline. Let us know if the timings work for your families.', createdAt: d(-1, 15) },
    ],
  })

  // ── Documents (small generated files in private storage) ──
  const storageDir = process.env.STORAGE_DIR ?? './storage'
  const docs: [string, string, string, number | null, boolean][] = [
    ['Laurent — Moodboard v2.svg', 'MOODBOARD', 'image/svg+xml', 0, true],
    ['Laurent — Wedding brief.txt', 'BRIEF', 'text/plain', 0, true],
    ['Nordlight — Supplier contract.txt', 'CONTRACT', 'text/plain', 1, false],
    ['Château des Lys — Price list.txt', 'SUPPLIER', 'text/plain', null, false],
    ['Lumen — Event recap.txt', 'PRESENTATION', 'text/plain', 7, false],
  ]
  await mkdir(path.join(storageDir, O), { recursive: true })
  for (const [name, category, mime, p, visible] of docs) {
    const key = `${O}/${Math.random().toString(36).slice(2)}-${name.replace(/[^a-z0-9.]+/gi, '_')}`
    const content =
      mime === 'image/svg+xml'
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#FAF9F7"/><rect x="40" y="40" width="340" height="420" rx="16" fill="#FCE9E6"/><rect x="410" y="40" width="350" height="200" rx="16" fill="#F07F73"/><rect x="410" y="260" width="165" height="200" rx="16" fill="#A3B18A"/><rect x="595" y="260" width="165" height="200" rx="16" fill="#F5F1ED"/><text x="60" y="90" font-family="sans-serif" font-size="26" fill="#252525">Moodboard v2 (fictitious)</text></svg>`
        : `${name}\n\nFictitious demo document generated by the seed script.\n`
    await writeFile(path.join(storageDir, key), content)
    await prisma.document.create({ data: { organizationId: O, name, category, mimeType: mime, size: Buffer.byteLength(content), storageKey: key, projectId: p !== null ? projects[p]!.id : null, clientId: p !== null ? projects[p]!.clientId : null, supplierId: name.startsWith('Château') ? sup('Château').id : null, visibleToClient: visible, uploadedById: pm2.id } })
  }

  // ── Notifications & activity ──
  const acts: [string, string, string, string, number][] = [
    ['created', 'leads', 'New lead Emma Collins — Wedding (Instagram)', '/leads', -0.1],
    ['approved', 'quotes', `Quote ${q5.ref} approved by client`, `/quotes/${q5.id}`, -0.4],
    ['completed', 'tasks', 'Task “Book photographer & videographer” completed', '/tasks', -0.8],
    ['paid', 'payments', 'Deposit received — Rossi Engagement Dinner', '/finance', -1.2],
    ['updated', 'projects', 'Nordlight Annual Summit moved to Confirmed', `/projects/${projects[1]!.id}`, -1.6],
    ['created', 'suppliers', 'Supplier Sweet Atelier Pâtisserie added', '/suppliers', -2.5],
    ['approved', 'approval', 'Client approved “Decoration concept — garden romance”', `/projects/${projects[0]!.id}`, -3],
  ]
  for (const [action, entityType, summary, link, days] of acts) {
    await prisma.activityLog.create({ data: { organizationId: O, userId: pick(staff).id, action, entityType, entityId: 'demo', summary, link, createdAt: new Date(Date.now() + days * DAY) } })
  }
  for (const u of [admin, pm, pm2, sales]) {
    await prisma.notification.createMany({
      data: [
        { organizationId: O, userId: u.id, type: 'APPROVAL', title: `Quote ${q5.ref} approved`, body: 'Rossi Engagement Dinner', link: `/quotes/${q5.id}`, createdAt: d(0, -3) },
        { organizationId: O, userId: u.id, type: 'FOLLOW_UP', title: 'Follow-up due: Ahmed Rahman', body: 'Corporate event — €150k', link: '/leads', createdAt: d(0, -5) },
        { organizationId: O, userId: u.id, type: 'PAYMENT', title: 'Client payment overdue — Nordlight balance', link: '/finance', createdAt: d(-1) },
      ],
    })
  }

  for (const [key, value] of Object.entries(counters)) await prisma.counter.create({ data: { organizationId: O, key: key === 'CLI' ? 'client' : key === 'LEAD' ? 'lead' : key === 'PRJ' ? 'project' : key === 'EVT' ? 'event' : key === 'STY' ? 'stay' : key === 'CON' ? 'concierge' : key === 'PAR' ? 'partner' : key === 'SUP' ? 'supplier' : key === 'SRV' ? 'service' : key === 'TSK' ? 'task' : key.startsWith('Q:') ? key.replace('Q:', 'quote:') : key.replace('INV:', 'invoice:'), value } })

  console.log('✔ Demo organization seeded (fictitious data). Sign in with admin@demo.events / demo1234')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
