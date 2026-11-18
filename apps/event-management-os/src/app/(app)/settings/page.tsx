import { Settings, Zap } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prisma } from '@/lib/prisma'
import { AppHeader } from '@/components/ui/page-header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OrgForm, ProfileForm, PasswordForm, RunAutomations } from '@/components/admin/admin-ui'

export const metadata = { title: 'Settings' }

const AUTOMATIONS = [
  ['New lead → qualification task', 'On create', true],
  ['Follow-up due → notification', 'Scheduled', true],
  ['Deal won → client + project creation', 'On stage change', true],
  ['New project → default checklist (editable template)', 'On create', true],
  ['Quote approved → project confirmed + manager notified', 'On approval', true],
  ['Payment due (≤ 3 days / late) → reminder', 'Scheduled', true],
  ['Upcoming event (≤ 14 days) → confirmation checklist', 'Scheduled', true],
  ['Overdue task → alert to assignee', 'Scheduled', true],
  ['Suspended supplier → selection restriction', 'Validation', true],
  ['Client approval → activity log + notification', 'Portal', true],
] as const

export default async function SettingsPage() {
  const ctx = await requirePage()
  const [user, templates] = await Promise.all([prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id } }), prisma.projectTemplate.findMany({ where: { organizationId: ctx.org.id } })])
  const canOrg = ctx.can('settings', 'write')
  return (
    <>
      <AppHeader icon={<Settings />} title="Settings" description="Your profile, security, organization and automations" />
      <div className="space-y-4">
        <Card><CardHeader title="Profile" /><ProfileForm user={user} /></Card>
        <Card><CardHeader title="Password" /><PasswordForm /></Card>
        {canOrg && <Card><CardHeader title="Organization" description="Branding name, currency and default tax used on quotes & invoices" /><OrgForm org={ctx.org} /></Card>}
        <Card>
          <CardHeader title="Automations" icon={<Zap />} description="Event-driven rules run instantly; scheduled rules run via /api/cron/automations (and at most every 10 minutes when the dashboard loads)" action={canOrg && <RunAutomations />} />
          <ul className="divide-y divide-line">
            {AUTOMATIONS.map(([name, trigger, on]) => (
              <li key={name} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
                <span>{name}</span>
                <span className="flex items-center gap-2"><span className="text-xs text-muted">{trigger}</span>{on && <Badge tone="green" dot>Active</Badge>}</span>
              </li>
            ))}
          </ul>
          <CardBody className="border-t border-line text-xs text-muted">
            Checklist templates: {templates.length ? templates.map((t) => t.name).join(', ') : 'built-in defaults (save any project’s tasks as a template from its Tasks tab).'}
          </CardBody>
        </Card>
      </div>
    </>
  )
}
