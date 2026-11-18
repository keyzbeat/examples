import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Building2, CalendarClock, ListChecks, Mail, MapPin, MessageCircle, Phone, History } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { getRecord } from '@/lib/resources/server'
import { prepareForm } from '@/lib/resources/page'
import { RESOURCES } from '@/lib/resources/registry'
import { prisma } from '@/lib/prisma'
import { LEAD_STAGE, PRIORITY } from '@/lib/options'
import { formatMoney } from '@/lib/money'
import { formatDate, formatDateTime } from '@/lib/dates'
import { fullName } from '@/lib/utils'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { OptBadge } from '@/components/ui/badge'
import { UserChip } from '@/components/ui/avatar'
import { DetailHeader, InfoGrid } from '@/components/resource/detail'
import { ResourceSheet, DeleteButton } from '@/components/resource/resource-sheet'
import { Crumb } from '@/components/shell/shell-context'
import { InteractionComposer } from '@/components/crm/interactions'
import { InteractionHistory } from '@/components/crm/history'
import { LeadConvertButtons, StageStepper } from '@/components/crm/lead-actions'
import { TaskListMini } from '@/components/tasks/task-list-mini'
import type { Lead } from '@prisma/client'

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage('leads')
  const { id } = await params
  const lead = await getRecord<Lead & { assignedTo: { name: string; color: string } | null; client: { id: string; ref: string; firstName: string; lastName: string } | null; project: { id: string; name: string; ref: string } | null }>(ctx, RESOURCES.leads, id, {
    assignedTo: { select: { name: true, color: true } },
    client: { select: { id: true, ref: true, firstName: true, lastName: true } },
    project: { select: { id: true, name: true, ref: true } },
  })
  if (!lead) notFound()
  const [interactions, tasks, form, taskForm] = await Promise.all([
    prisma.interaction.findMany({ where: { leadId: id }, orderBy: { occurredAt: 'desc' }, include: { user: { select: { name: true } } } }),
    prisma.task.findMany({ where: { leadId: id, deletedAt: null }, orderBy: [{ status: 'asc' }, { dueDate: 'asc' }], include: { assignee: { select: { name: true, color: true } } } }),
    prepareForm(ctx, 'leads', lead as unknown as Record<string, unknown>),
    prepareForm(ctx, 'tasks', null, { leadId: id, assigneeId: lead.assignedToId ?? ctx.user.id, title: `Follow up with ${lead.firstName}` }),
  ])
  const canWrite = ctx.can('leads', 'write')
  const cur = ctx.org.currency
  const overdue = lead.nextFollowUp && lead.nextFollowUp < new Date() && !['WON', 'LOST', 'ARCHIVED'].includes(lead.stage)

  return (
    <>
      <Crumb label={fullName(lead)} />
      <DetailHeader
        refLabel={lead.ref}
        title={fullName(lead)}
        badges={
          <>
            <OptBadge options={LEAD_STAGE} value={lead.stage} />
            <OptBadge options={PRIORITY} value={lead.priority} dot={false} />
            {lead.isDemo && <span className="text-[11px] text-muted">Demo data</span>}
          </>
        }
        meta={
          <>
            {lead.company && <span className="inline-flex items-center gap-1"><Building2 /> {lead.company}</span>}
            {(lead.city || lead.country) && <span className="inline-flex items-center gap-1"><MapPin /> {[lead.city, lead.country].filter(Boolean).join(', ')}</span>}
            {lead.nextFollowUp && <span className={`inline-flex items-center gap-1 ${overdue ? 'font-medium text-red-600' : ''}`}><CalendarClock /> Follow-up {formatDateTime(lead.nextFollowUp)}</span>}
          </>
        }
        actions={
          canWrite && (
            <>
              <LeadConvertButtons id={lead.id} hasClient={!!lead.clientId} hasProject={!!lead.projectId} />
              <ResourceSheet {...form} title="Edit lead" triggerLabel="Edit" triggerVariant="secondary" icon="edit" />
              {ctx.can('leads', 'delete') && <DeleteButton resource="leads" id={lead.id} redirectTo="/leads" size="icon-sm" />}
            </>
          )
        }
      />
      <div className="mb-4">
        <StageStepper id={lead.id} stage={lead.stage} canWrite={canWrite} />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader title="Opportunity" />
            <CardBody>
              <InfoGrid
                cols={3}
                items={[
                  { label: 'Service requested', value: lead.serviceRequested },
                  { label: 'Estimated budget', value: formatMoney(lead.estimatedBudget, cur) },
                  { label: 'Desired date', value: formatDate(lead.eventDate) },
                  { label: 'Lead source', value: lead.source },
                  { label: 'Salesperson', value: <UserChip user={lead.assignedTo} /> },
                  { label: 'Created', value: formatDate(lead.createdAt) },
                  { label: 'Notes', value: lead.notes, wide: true },
                  ...(lead.lostReason ? [{ label: 'Lost reason', value: lead.lostReason, wide: true }] : []),
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Communication history" icon={<History />} description="Notes, calls, emails, WhatsApp and meetings" />
            <CardBody className="space-y-5">
              {canWrite && <InteractionComposer target="lead" id={lead.id} />}
              <InteractionHistory items={interactions} />
            </CardBody>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Contact" />
            <CardBody>
              <ul className="space-y-2.5 text-[13px]">
                {lead.email && <li className="flex items-center gap-2"><Mail className="size-4 text-muted" /><a className="hover:text-coral-dark" href={`mailto:${lead.email}`}>{lead.email}</a></li>}
                {lead.phone && <li className="flex items-center gap-2"><Phone className="size-4 text-muted" /><a className="hover:text-coral-dark" href={`tel:${lead.phone}`}>{lead.phone}</a></li>}
                {lead.whatsapp && <li className="flex items-center gap-2"><MessageCircle className="size-4 text-muted" /><a className="hover:text-coral-dark" target="_blank" rel="noreferrer" href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`}>WhatsApp {lead.whatsapp}</a></li>}
                {!lead.email && !lead.phone && !lead.whatsapp && <li className="text-muted">No contact details.</li>}
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Conversion" />
            <CardBody>
              <InfoGrid
                cols={1}
                items={[
                  { label: 'Client', value: lead.client ? <Link className="text-coral-dark hover:underline" href={`/clients/${lead.client.id}`}>{fullName(lead.client)} · {lead.client.ref}</Link> : 'Not converted yet' },
                  { label: 'Project', value: lead.project ? <Link className="text-coral-dark hover:underline" href={`/projects/${lead.project.id}`}>{lead.project.name} · {lead.project.ref}</Link> : 'Created automatically when the deal is won' },
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Tasks & follow-ups" icon={<ListChecks />} action={ctx.can('tasks', 'write') && <ResourceSheet {...taskForm} parents={{ leadId: lead.id }} navigateOnCreate={false} title="New follow-up task" triggerLabel="Add" triggerSize="sm" triggerVariant="secondary" />} />
            <TaskListMini tasks={tasks} />
          </Card>
        </div>
      </div>
    </>
  )
}
