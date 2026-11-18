# Event Management OS

Event Management OS is a web application for agencies that run events, weddings, private celebrations, tailor-made stays and concierge services. It covers CRM, clients, projects, events, stays, concierge, partners, suppliers, the services catalog, calendar, tasks, quotes and invoices, finance, documents, reports, a client portal and administration. All modules share one relational PostgreSQL database.

> All data created by the seed script is fictitious and flagged `isDemo = true`. You can purge it from **Administration → Audit log → Purge demo data**.

**Stack:** Next.js 15 (App Router, Server Components and Server Actions), React 19, TypeScript, Tailwind CSS 4, Lucide icons, PostgreSQL, Prisma 6, `jose` (signed session cookies), `bcryptjs`, `zod`, `@react-pdf/renderer`, Vitest and Playwright.

---

## 1. Quick start

```bash
cd apps/event-management-os
cp .env.example .env          # set DATABASE_URL and AUTH_SECRET (32+ chars)
pnpm install
pnpm db:deploy                # apply migrations (or `pnpm db:migrate` in development)
pnpm db:seed                  # optional: fictitious demo organization
pnpm dev                      # http://localhost:3000
```

Demo accounts (password `demo1234`):

| Role | Email |
|---|---|
| Administrator | admin@demo.events |
| Management | direction@demo.events |
| Sales | sales@demo.events |
| Project Manager | pm@demo.events |
| Team Member (assigned work only) | team@demo.events |
| Client (portal only) | client@demo.events |

### Test on a phone (same Wi-Fi as your computer)

```bash
pnpm build
COOKIE_SECURE=false SHOW_DEMO_ACCOUNTS=true pnpm start:lan   # listens on 0.0.0.0:3000
```
Find your computer's local IP (macOS: `ipconfig getifaddr en0`, Windows: `ipconfig`) and open `http://<IP>:3000` in Safari on the iPhone. `COOKIE_SECURE=false` is needed because the LAN URL is plain http; never use it on a public deployment.

**Standalone demo:** `docs/event-management-os-demo.html` is a single-file, offline, browser-only demo (data in localStorage) of the main flows — it is a simplified prototype, not the full app.

**Offline preview:** open `docs/event-management-os-apercu.html` in any browser for screenshots of every module (desktop + iPhone, fictitious data).

## 2. Architecture

```
prisma/schema.prisma        relational model (≈40 tables), migrations, seed
src/middleware.ts           session check; portal users can't reach the back office
src/lib/
  auth/                     JWT session cookie + per-request context (requirePage / requireAction)
  permissions.ts            "<module>:<read|write|delete>" permissions, default roles, assigned-only scope
  resources/                ★ generic resource engine:
    registry.ts               one declaration per entity (fields, filters, search, sort)
    server.ts                 validation, tenant isolation, duplicate prevention, scoped queries
    page.ts / values.ts       list + form loaders
  automations.ts            event-driven + scheduled workflow rules
  activity.ts               activity log + audit log (before/after JSON) + notifications
  pdf/                      quote, invoice and itinerary PDF templates
  storage.ts                private file storage (swap for S3/Blob in production)
src/app/(app)/…             back-office modules
src/app/portal/             client portal (separate layout, mobile-first)
src/app/share/…             public, token-gated itinerary
src/app/api/…               export CSV, search, documents, PDFs, cron
src/components/             design system (ui/), shell, generic list/form/board components
```

**How the main mechanisms work**

* **Generic CRUD.** `saveResource`, `deleteResource` and `quickUpdate` in `src/app/actions/resources.ts` serve every module. Each call validates its fields and checks permissions on the server. It also confirms that every referenced id (client, project, supplier…) belongs to the caller's organization, writes the audit trail and triggers the automations.
* **Tenant isolation.** Every business row has an `organizationId`, and every query goes through `scopeWhere(ctx, def)`. Team members also get the `scope:assigned` filter on projects, events, tasks and calendar items.
* **Soft delete.** Records are archived through `deletedAt`, and the audit log keeps their last state.
* **Duplicate prevention.** Clients are unique per normalized email. Partners and suppliers are unique per normalized name, which ignores accents, legal suffixes and punctuation. A supplier has a single record carrying many categories (many-to-many).
* **Money.** Amounts are stored as integer cents. Totals are calculated in one tested function (`computeTotals`).

## 3. Status by phase

Legend: ✅ operational · 🟡 partly done or prepared · ⛔ not implemented yet

### Phase 1: Design system, shell and dashboard
* ✅ Premium sidebar (groups, submenus, active indicator, collapse saved in a cookie, mobile drawer).
* ✅ Topbar:
  * breadcrumbs that show record names;
  * ⌘K global search;
  * quick-create menu;
  * notifications with mark-as-read;
  * profile menu;
  * EN/FR language selector.
* 🟡 i18n covers the navigation, the shell and the dashboard labels. Module content is still in English.
* ✅ Dashboard computed live from the database:
  * 8 KPIs;
  * active projects;
  * my tasks (checkable);
  * 7-day agenda (meetings, deadlines, follow-ups, reservations, events);
  * upcoming events, recent activity, quick actions and a pipeline snapshot.
* ✅ The dashboard adapts to the user's role: finance KPIs only show with finance permission.

### Phase 2: CRM and clients
* ✅ Leads:
  * full CRUD;
  * table, drag-and-drop Kanban and follow-up agenda views;
  * filters, sort, pagination and search;
  * stage stepper;
  * communication history (note, call, email, WhatsApp, meeting);
  * follow-up tasks;
  * conversion to a client (with deduplication) and to a project (deal won).
* ✅ CSV import (validated and deduplicated) and CSV export (opens in Excel).
* ✅ Client 360° profile: projects, events, stays, concierge, quotes, invoices and payments, documents, communication, portal access.
* ✅ List filters are kept when you open a record and come back (URL + sessionStorage).

### Phase 3: Partners, suppliers and catalog
* ✅ Partners are a separate module: CRUD, commissions, documents and collaboration history.
* ✅ Suppliers:
  * multi-category records;
  * contacts;
  * rating and favourites;
  * side-by-side comparison of 2 to 4 suppliers;
  * duplicate detection;
  * CSV import and export;
  * performance indicators (projects, reliability, spend);
  * project assignment.
* ✅ Suspended suppliers cannot be selected anywhere: projects, services, quotes, reservations, concierge and payments.
* ✅ Services catalog with cost, price, margin and tax. Services can be added to projects, events, quotes and invoices, and their prices are snapshotted when added.

### Phase 4: Operations
* ✅ Projects:
  * tabs: overview, tasks (list, board and timeline), services and budget, suppliers, events and stays, documents, finance, client portal, activity;
  * team management;
  * reusable checklist templates: "Save as template" sets the default checklist for that project type.
* ✅ Events:
  * concept and design (theme, colour palette, moodboard images);
  * services and budget with margins;
  * run-of-show timeline;
  * guests (RSVP, dietary needs, seating view, plus-ones);
  * logistics and bookings;
  * team.
* ✅ Stays:
  * reservations and day-by-day itinerary;
  * itinerary PDF;
  * secure share link that can be rotated or revoked and never shows costs or suppliers.
* ✅ Concierge: requests with category, priority, agent, supplier, deadline, cost and price, plus a status board.
* ✅ Tasks:
  * views: my tasks, today, this week, overdue, all, Kanban and calendar;
  * subtasks and comments;
  * project progress is recomputed automatically from tasks.
* ✅ Calendar:
  * day, week, month and list views;
  * drag-and-drop rescheduling of meetings, tasks and follow-ups;
  * quick create;
  * filters by team member and item type.
* 🟡 The calendar data model is ready for Google Calendar sync (`externalProvider` and `externalId` columns). The sync itself is ⛔ not implemented.

### Phase 5: Finance and documents
* ✅ Quotes:
  * automatic yearly references (Q-2026-0001);
  * line editor with catalog, discounts, tax and margin;
  * statuses (draft, sent, approved, rejected);
  * approved quotes are locked; duplicate one to change it;
  * conversion to a deposit (30 %) or full invoice;
  * premium PDF.
* ✅ Invoices:
  * line editor;
  * payment recording;
  * status recalculated automatically (sent, partially paid, paid, overdue);
  * remaining balance;
  * PDF.
* ✅ Finance:
  * revenue, expenses and profit (cash basis);
  * receivables;
  * backlog;
  * gross margin;
  * client and supplier payments due;
  * commissions;
  * 30-day cash forecast;
  * payments register.
* ✅ Documents:
  * multi-file upload into private storage;
  * preview (images, PDF, text) and download through a permission-checked endpoint;
  * version history;
  * links to client, project, event, supplier or partner;
  * per-document "share with client" toggle.
* ✅ Reports: 12-month revenue vs expenses, pipeline by stage, lead sources, projects by type, top clients, top suppliers, plus CSV exports. Charts include tooltips and a table view.

### Phase 6: Portals and automations
* ✅ Authentication:
  * signed HTTP-only session cookie;
  * bcrypt password hashes;
  * basic brute-force throttle (per server instance);
  * password change in Settings.
* ✅ Roles and permissions:
  * editable permission matrix per role, plus custom roles;
  * enforced on the server in pages, server actions, API routes, exports, PDFs and file downloads.
* ✅ Client portal (`/portal`):
  * project overview and pending approvals;
  * concept and moodboard;
  * proposal, which the client can approve;
  * timeline (client-facing steps only);
  * guest management;
  * shared documents and client upload;
  * invoices and payments with PDFs;
  * messages.
* ✅ The portal never shows costs, margins, supplier details or internal notes. Staff create and revoke portal accounts under **Client Portal**.
* ✅ Automations (see Settings):
  * new lead → qualification task;
  * follow-up due → notification;
  * deal won → client, project and checklist;
  * new project → default checklist;
  * quote approved → project confirmed and manager notified;
  * payment due → reminder;
  * upcoming event → confirmation checklist;
  * overdue task → alert;
  * suspended supplier → selection blocked;
  * client approval → activity log and notification.
* 🟡 Notifications are in-app only. ⛔ Email, WhatsApp and push delivery are not implemented.

### Phase 7: Finalization
* ✅ Unit tests (Vitest) and an end-to-end smoke test (Playwright). The production build passes.
* ✅ Responsive layout: desktop, tablet and phone (mobile drawer, scrollable tables, mobile-first portal).
* ⛔ Not done yet:
  * full EN/FR translation of module content;
  * an ESLint config for this app (`next lint` is not configured);
  * load and performance testing;
  * multi-organization sign-up and billing (the data model is multi-tenant, but the seed creates one organization);
  * rate limiting shared across instances.

## 4. Testing

```bash
pnpm test        # Vitest: money/tax totals, permissions, duplicate normalization, CSV, automations helpers
pnpm test:e2e    # Playwright smoke test against a running, freshly seeded app (BASE_URL=http://localhost:3000)
pnpm type-check
pnpm build
```

The end-to-end smoke test checks:
1. Creating a lead generates its qualification task automatically.
2. "Deal won" creates the project and its default checklist.
3. A duplicate client email is rejected.
4. A duplicate supplier name is rejected.
5. Approving a quote, then creating a 30 % deposit invoice, works.
6. Global search finds records.
7. A portal client can approve an item.
8. A portal client cannot reach the back office or its APIs (403).
9. A team member is blocked from Finance.

Re-run `pnpm db:seed` before each end-to-end run.

**Manual test path.** Sign in as admin and:
1. Drag a lead to **Won** on `/leads?view=kanban` and open the project it creates.
2. Add catalog services under **Services & budget**.
3. Create a quote from the project's **Quotes & payments** tab, add lines, approve it, create a deposit invoice and record a payment.
4. Download the PDFs.
5. Sign in as `client@demo.events` to see the portal.

## 5. Deployment (Vercel + managed PostgreSQL)

1. Create a PostgreSQL database (Neon, Supabase, RDS…) and set `DATABASE_URL`.
2. Set `AUTH_SECRET` (`openssl rand -base64 48`) and `CRON_SECRET`.
3. Build command: `pnpm build`. Run `pnpm db:deploy` as a release step.
4. `vercel.json` schedules `/api/cron/automations` every 15 minutes.
5. **File storage:** `src/lib/storage.ts` writes to the local disk, which serverless functions do not keep. Before production, swap it for S3, GCS or Vercel Blob. The interface is only `putFile`, `getFile` and `removeFile`.
6. Never run `pnpm db:seed` against a real organization's database. It deletes and recreates the `demo` organization.

## 6. Security notes

* Every mutation is a server action that calls `requireAction(module, action)`. Every page calls `requirePage(module)`.
* Relations submitted in forms are re-checked against the caller's organization.
* Uploaded files are stored outside `public/`, limited by MIME allow-list and size, and served with `nosniff`. Non-PDF files are also served under a sandboxed CSP.
* Share links use a 24-byte random token and can be revoked.
* The audit log records the before and after state of every write.
