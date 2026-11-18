import Link from 'next/link'
import { CalendarDays, MapPin, Download, CheckCircle2, MessageSquare, FileText, Wallet, Users, Clock, Palette, Mail, Phone } from 'lucide-react'
import { requirePortal } from '@/lib/auth/context'
import { prisma } from '@/lib/prisma'
import { sp, type SP } from '@/lib/url'
import { APPROVAL_STATUS, INVOICE_STATUS, PROJECT_STATUS, QUOTE_STATUS, TIMELINE_CATEGORY, findOpt } from '@/lib/options'
import { computeTotals, formatMoney } from '@/lib/money'
import { daysUntil, formatDate, formatDateTime } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { OptBadge, Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { GuestList } from '@/components/events/guest-list'
import { ApprovalDecision, ApproveQuoteButton, PortalMessageForm, PortalUpload } from '@/components/portal/portal-ui'

/**
 * Client portal. Every query is filtered by the signed-in client's id, and only client-safe
 * fields are selected (no costs, margins, supplier details or internal notes).
 */
export default async function PortalPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requirePortal()
  const params = await searchParams
  const clientId = ctx.user.clientId
  const projects = await prisma.project.findMany({
    where: { organizationId: ctx.org.id, clientId, deletedAt: null, status: { not: 'CANCELLED' } },
    orderBy: { startDate: 'asc' },
    select: { id: true, name: true, startDate: true, location: true, status: true, progress: true, manager: { select: { name: true, email: true, color: true, title: true } } },
  })
  if (!projects.length) return <Card><EmptyState title="Welcome!" description="Your planner will share your project here soon." /></Card>
  const project = projects.find((p) => p.id === sp(params, 'project')) ?? projects[0]!
  const tab = sp(params, 'tab') ?? 'overview'
  const [approvals, events, quotes, invoices, documents, messages] = await Promise.all([
    prisma.approval.findMany({ where: { projectId: project.id }, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }] }),
    prisma.event.findMany({ where: { projectId: project.id, clientId, deletedAt: null }, orderBy: { date: 'asc' }, select: { id: true, name: true, date: true, startTime: true, venue: true, location: true, theme: true, concept: true, palette: true, guestCount: true, timeline: { select: { id: true, time: true, title: true, category: true } }, guests: true } }),
    prisma.quotation.findMany({ where: { projectId: project.id, clientId, deletedAt: null, status: { in: ['SENT', 'APPROVED'] } }, select: { id: true, ref: true, title: true, status: true, expiryDate: true, discountPct: true, items: { select: { description: true, quantity: true, unitPrice: true, discountPct: true, taxRate: true } } } }),
    prisma.invoice.findMany({ where: { projectId: project.id, clientId, deletedAt: null, status: { notIn: ['DRAFT', 'CANCELLED'] } }, select: { id: true, ref: true, status: true, dueDate: true, items: { select: { quantity: true, unitPrice: true, discountPct: true, taxRate: true } }, payments: { where: { direction: 'INCOMING' }, select: { amount: true, status: true, dueDate: true, paidAt: true, kind: true } } } }),
    prisma.document.findMany({ where: { organizationId: ctx.org.id, deletedAt: null, next: null, visibleToClient: true, OR: [{ projectId: project.id }, { clientId, projectId: null }] }, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, category: true, mimeType: true, createdAt: true } }),
    prisma.message.findMany({ where: { projectId: project.id }, orderBy: { createdAt: 'asc' }, select: { id: true, body: true, fromClient: true, createdAt: true, author: { select: { name: true, color: true } } } }),
  ])
  const pending = approvals.filter((a) => a.status === 'PENDING')
  const event = events[0]
  const cur = ctx.org.currency
  const invoiceRows = invoices.map((i) => {
    const total = computeTotals(i.items).total
    const paid = i.payments.filter((p) => p.status === 'PAID').reduce((a, p) => a + p.amount, 0)
    return { ...i, total, paid, balance: total - paid }
  })
  const balance = invoiceRows.reduce((a, i) => a + i.balance, 0)
  const days = project.startDate ? daysUntil(project.startDate) : null
  const moodboards = documents.filter((d) => d.category === 'MOODBOARD' && d.mimeType.startsWith('image/'))
  const tabs = [
    { k: 'overview', l: 'Overview' },
    { k: 'approvals', l: 'Approvals', n: pending.length },
    { k: 'concept', l: 'Concept' },
    { k: 'proposal', l: 'Proposal' },
    { k: 'timeline', l: 'Timeline' },
    { k: 'guests', l: 'Guests' },
    { k: 'documents', l: 'Documents' },
    { k: 'payments', l: 'Payments' },
    { k: 'messages', l: 'Messages' },
  ]
  const href = (t: string) => `/portal?project=${project.id}${t === 'overview' ? '' : `&tab=${t}`}`
  return (
    <>
      {projects.length > 1 && (
        <div className="scrollbar-thin mb-4 flex gap-2 overflow-x-auto">
          {projects.map((p) => <Link key={p.id} href={`/portal?project=${p.id}`} className={cn('rounded-full border px-3 py-1 text-xs whitespace-nowrap', p.id === project.id ? 'border-coral bg-coral-light text-coral-dark' : 'border-line bg-white text-muted')}>{p.name}</Link>)}
        </div>
      )}
      <div className="mb-5 overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
        <div className="bg-[radial-gradient(circle_at_20%_0%,#FCE9E6,transparent_60%)] px-5 pt-5 pb-4">
          <p className="text-xs font-medium text-coral-dark">Hello {ctx.user.name.split(' ')[0]} 👋</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{project.name}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
            {project.startDate && <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> {formatDate(project.startDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>}
            {(event?.venue || project.location) && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {event?.venue ?? project.location}</span>}
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line border-t border-line text-center">
          <div className="p-3"><p className="tabular text-lg font-semibold">{days !== null && days >= 0 ? days : '—'}</p><p className="text-[11px] text-muted">days to go</p></div>
          <div className="p-3"><p className="tabular text-lg font-semibold">{pending.length}</p><p className="text-[11px] text-muted">pending approvals</p></div>
          <div className="p-3"><p className="tabular text-lg font-semibold">{formatMoney(balance, cur, { compact: true })}</p><p className="text-[11px] text-muted">balance due</p></div>
        </div>
      </div>
      <nav className="scrollbar-thin -mx-4 mb-4 flex gap-1 overflow-x-auto px-4">
        {tabs.map((t) => (
          <Link key={t.k} href={href(t.k)} className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium', tab === t.k ? 'bg-ink text-white' : 'bg-white text-muted ring-1 ring-line')}>
            {t.l}
            {!!t.n && <span className="rounded-full bg-coral px-1.5 text-[10px] text-white">{t.n}</span>}
          </Link>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Project status" action={<OptBadge options={PROJECT_STATUS} value={project.status} />} />
            <CardBody>
              <div className="mb-1 flex justify-between text-xs text-muted"><span>Preparation progress</span><span>{project.progress}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-lightgray"><div className="h-full rounded-full bg-coral" style={{ width: `${project.progress}%` }} /></div>
            </CardBody>
          </Card>
          {pending.length > 0 && (
            <Card>
              <CardHeader title="Waiting for your approval" icon={<CheckCircle2 />} action={<Link href={href('approvals')} className="text-xs text-coral-dark">Review</Link>} />
              <ul className="divide-y divide-line">{pending.map((a) => <li key={a.id} className="px-4 py-2.5 text-[13px]">{a.title}</li>)}</ul>
            </Card>
          )}
          {project.manager && (
            <Card>
              <CardHeader title="Your contact person" />
              <CardBody className="flex items-center gap-3">
                <Avatar name={project.manager.name} color={project.manager.color} size="lg" />
                <div className="text-[13px]">
                  <p className="font-medium">{project.manager.name}</p>
                  <p className="text-muted">{project.manager.title}</p>
                  <p className="mt-1 flex flex-wrap gap-3"><a className="inline-flex items-center gap-1 text-coral-dark" href={`mailto:${project.manager.email}`}><Mail className="size-3.5" /> Email</a><Link className="inline-flex items-center gap-1 text-coral-dark" href={href('messages')}><MessageSquare className="size-3.5" /> Message</Link></p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {tab === 'approvals' && (
        <div className="space-y-3">
          {approvals.length === 0 && <Card><EmptyState title="Nothing to approve" /></Card>}
          {approvals.map((a) => (
            <Card key={a.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-[11px] font-medium tracking-wide text-muted uppercase">{a.category.toLowerCase()}</p><p className="mt-0.5 font-medium">{a.title}</p></div>
                  <OptBadge options={APPROVAL_STATUS} value={a.status} />
                </div>
                {a.description && <p className="mt-2 text-[13px] text-ink/80">{a.description}</p>}
                {a.status === 'PENDING' ? <ApprovalDecision id={a.id} /> : a.clientComment && <p className="mt-2 rounded-lg bg-beige px-3 py-2 text-xs">Your comment: “{a.clientComment}”</p>}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {tab === 'concept' && (
        <div className="space-y-4">
          {events.length === 0 && <Card><EmptyState icon={<Palette />} title="Concept coming soon" /></Card>}
          {events.map((e) => (
            <Card key={e.id}>
              <CardHeader title={e.name} description={e.theme ?? undefined} icon={<Palette />} />
              <CardBody className="space-y-4">
                {e.concept && <p className="text-[13px] leading-relaxed">{e.concept}</p>}
                {e.palette.length > 0 && <div className="flex gap-2">{e.palette.map((c) => <span key={c} className="h-12 flex-1 rounded-lg ring-1 ring-line" style={{ background: c }} title={c} />)}</div>}
              </CardBody>
            </Card>
          ))}
          {moodboards.length > 0 && (
            <Card>
              <CardHeader title="Moodboard" />
              <CardBody className="grid grid-cols-2 gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {moodboards.map((d) => <a key={d.id} href={`/api/documents/${d.id}`}><img src={`/api/documents/${d.id}?inline=1`} alt={d.name} className="aspect-[4/3] w-full rounded-lg border border-line object-cover" /></a>)}
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {tab === 'proposal' && (
        <div className="space-y-3">
          {quotes.length === 0 && <Card><EmptyState title="No proposal shared yet" /></Card>}
          {quotes.map((q) => {
            const t = computeTotals(q.items, q.discountPct)
            return (
              <Card key={q.id}>
                <CardHeader title={q.title ?? q.ref} description={`${q.ref} · valid until ${formatDate(q.expiryDate)}`} action={<OptBadge options={QUOTE_STATUS} value={q.status} />} />
                <ul className="divide-y divide-line">{q.items.map((it, i) => <li key={i} className="flex justify-between gap-3 px-4 py-2 text-[13px]"><span>{it.description} <span className="text-muted">× {it.quantity}</span></span><span className="tabular">{formatMoney(Math.round(it.quantity * it.unitPrice * (1 - it.discountPct / 100)), cur)}</span></li>)}</ul>
                <div className="flex flex-col gap-3 border-t border-line p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-[13px]"><span className="text-muted">Total incl. tax </span><span className="text-lg font-semibold">{formatMoney(t.total, cur)}</span></div>
                  <div className="flex gap-2"><a href={`/api/pdf/quote/${q.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm"><Download className="size-4" /> PDF</a>{q.status === 'SENT' && <ApproveQuoteButton id={q.id} />}</div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {tab === 'timeline' && (
        <div className="space-y-4">
          {events.length === 0 && <Card><EmptyState icon={<Clock />} title="Timeline coming soon" /></Card>}
          {events.map((e) => (
            <Card key={e.id}>
              <CardHeader title={e.name} description={formatDate(e.date, { weekday: 'long', day: 'numeric', month: 'long' })} icon={<Clock />} />
              <ol className="p-4">
                {e.timeline.filter((t) => ['GUESTS', 'PROGRAM'].includes(t.category)).sort((a, b) => a.time.localeCompare(b.time)).map((t) => (
                  <li key={t.id} className="flex gap-3 border-l-2 border-coral/40 pb-3 pl-3 last:pb-0">
                    <span className="tabular w-11 shrink-0 font-semibold">{t.time}</span>
                    <span className="text-[13px]">{t.title} <Badge tone={findOpt(TIMELINE_CATEGORY, t.category)?.tone} className="ml-1">{findOpt(TIMELINE_CATEGORY, t.category)?.label}</Badge></span>
                  </li>
                ))}
              </ol>
            </Card>
          ))}
        </div>
      )}

      {tab === 'guests' && (
        <div className="space-y-4">
          {events.length === 0 && <Card><EmptyState icon={<Users />} title="No event yet" /></Card>}
          {events.map((e) => (
            <Card key={e.id}>
              <CardHeader title={`Guests — ${e.name}`} icon={<Users />} />
              <GuestList eventId={e.id} guests={e.guests} canWrite mobile />
            </Card>
          ))}
        </div>
      )}

      {tab === 'documents' && (
        <Card>
          <CardHeader title="Shared documents" icon={<FileText />} />
          <ul className="divide-y divide-line">
            {documents.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">No documents shared yet.</li>}
            {documents.map((d) => <li key={d.id} className="flex items-center justify-between px-4 py-3 text-[13px]"><span>{d.name}<span className="block text-xs text-muted">{formatDate(d.createdAt)}</span></span><a className="inline-flex items-center gap-1 text-coral-dark" href={`/api/documents/${d.id}`}><Download className="size-4" /> Download</a></li>)}
          </ul>
          <PortalUpload projectId={project.id} />
        </Card>
      )}

      {tab === 'payments' && (
        <div className="space-y-3">
          {invoiceRows.length === 0 && <Card><EmptyState icon={<Wallet />} title="No invoices yet" /></Card>}
          {invoiceRows.map((i) => (
            <Card key={i.id}>
              <CardHeader title={i.ref} description={`Due ${formatDate(i.dueDate)}`} action={<OptBadge options={INVOICE_STATUS} value={i.status} />} />
              <CardBody className="space-y-1.5 text-[13px]">
                <div className="flex justify-between"><span className="text-muted">Total</span><span className="tabular">{formatMoney(i.total, cur)}</span></div>
                <div className="flex justify-between"><span className="text-muted">Paid</span><span className="tabular text-emerald-700">{formatMoney(i.paid, cur)}</span></div>
                <div className="flex justify-between border-t border-line pt-1.5 font-semibold"><span>Balance</span><span className="tabular">{formatMoney(i.balance, cur)}</span></div>
                <a href={`/api/pdf/invoice/${i.id}`} className="mt-2 inline-flex items-center gap-1 text-coral-dark"><Download className="size-4" /> Download invoice</a>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {tab === 'messages' && (
        <Card>
          <CardHeader title="Messages" icon={<MessageSquare />} />
          <div className="space-y-3 p-4">
            {messages.length === 0 && <p className="py-6 text-center text-sm text-muted">Start the conversation with your planner.</p>}
            {messages.map((m) => (
              <div key={m.id} className={cn('flex gap-2', m.fromClient && 'flex-row-reverse')}>
                <Avatar name={m.author.name} color={m.author.color} size="sm" />
                <div className={cn('max-w-[80%] rounded-2xl px-3 py-2 text-[13px]', m.fromClient ? 'bg-coral-light/70' : 'bg-beige')}>
                  <p className="whitespace-pre-line">{m.body}</p>
                  <p className="mt-0.5 text-[10.5px] text-muted">{m.author.name} · {formatDateTime(m.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
          <PortalMessageForm projectId={project.id} />
        </Card>
      )}
      <p className="mt-8 flex items-center justify-center gap-1 text-xs text-muted"><Phone className="size-3" /> {ctx.org.name}</p>
    </>
  )
}
