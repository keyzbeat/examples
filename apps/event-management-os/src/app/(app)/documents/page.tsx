import Link from 'next/link'
import { FileText, FileImage, FileSpreadsheet, File as FileIcon, Download } from 'lucide-react'
import { requirePage } from '@/lib/auth/context'
import { prisma } from '@/lib/prisma'
import { loadRelationOptions } from '@/lib/resources/server'
import { sp, type SP, hrefWith } from '@/lib/url'
import { DOCUMENT_CATEGORY } from '@/lib/options'
import { formatDate } from '@/lib/dates'
import { fullName } from '@/lib/utils'
import { AppHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Table, THead, Th, Tr, Td, Pagination } from '@/components/ui/table'
import { OptBadge, Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ListToolbar } from '@/components/resource/list-toolbar'
import { UploadSheet, PreviewButton, DocActions } from '@/components/documents/doc-ui'
import type { Prisma } from '@prisma/client'

export const metadata = { title: 'Documents' }

const size = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`)
const icon = (m: string) => (m.startsWith('image/') ? FileImage : m.includes('sheet') || m.includes('csv') || m.includes('excel') ? FileSpreadsheet : m === 'application/pdf' || m.startsWith('text/') ? FileText : FileIcon)

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requirePage('documents')
  const params = await searchParams
  const page = Math.max(1, Number(sp(params, 'page') ?? 1))
  const q = sp(params, 'q')
  const where: Prisma.DocumentWhereInput = { organizationId: ctx.org.id, deletedAt: null, next: null }
  for (const k of ['category', 'projectId', 'clientId', 'supplierId', 'partnerId', 'eventId'] as const) {
    const v = sp(params, k)
    if (v) (where as Record<string, unknown>)[k] = v
  }
  if (sp(params, 'shared') === 'true') where.visibleToClient = true
  if (q) where.name = { contains: q, mode: 'insensitive' }
  if (ctx.assignedOnly) where.OR = [{ project: { OR: [{ managerId: ctx.user.id }, { members: { some: { userId: ctx.user.id } } }] } }, { uploadedById: ctx.user.id }]
  const [docs, total, options] = await Promise.all([
    prisma.document.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 25, take: 25, include: { project: { select: { id: true, name: true } }, client: { select: { id: true, firstName: true, lastName: true } }, supplier: { select: { id: true, companyName: true } }, event: { select: { id: true, name: true } }, uploadedBy: { select: { name: true } }, previous: { include: { previous: true } } } }),
    prisma.document.count({ where }),
    loadRelationOptions(ctx, ['client', 'project', 'supplier', 'partner', 'event']),
  ])
  const canWrite = ctx.can('documents', 'write')
  const filters = [
    { name: 'category', label: 'Category', options: DOCUMENT_CATEGORY },
    { name: 'projectId', label: 'Project', options: options.project ?? [] },
    { name: 'clientId', label: 'Client', options: options.client ?? [] },
    { name: 'supplierId', label: 'Supplier', options: options.supplier ?? [] },
    { name: 'shared', label: 'Portal', options: [{ value: 'true', label: 'Shared with client' }] },
  ]
  const defaults = { projectId: sp(params, 'projectId'), clientId: sp(params, 'clientId'), supplierId: sp(params, 'supplierId'), partnerId: sp(params, 'partnerId'), eventId: sp(params, 'eventId'), category: sp(params, 'category') }
  return (
    <>
      <AppHeader icon={<FileText />} title="Documents" description="Contracts, quotes, moodboards, briefs, photos and confirmations — private storage with versions and client sharing" actions={canWrite && <UploadSheet options={options} defaults={defaults} />} />
      <Card>
        <ListToolbar filters={filters} placeholder="Search file name…" />
        {docs.length === 0 ? <EmptyState icon={<FileText />} title="No documents" description="Upload a file and link it to a client, project, event or supplier." /> : (
          <>
            <Table>
              <THead><Th>Name</Th><Th>Category</Th><Th>Linked to</Th><Th>Version</Th><Th>Size</Th><Th>Uploaded</Th><Th>Portal</Th><Th className="w-32" /></THead>
              <tbody>
                {docs.map((d) => {
                  const I = icon(d.mimeType)
                  const links = [d.project && { href: `/projects/${d.project.id}`, l: d.project.name }, d.event && { href: `/events/${d.event.id}`, l: d.event.name }, d.client && { href: `/clients/${d.client.id}`, l: fullName(d.client) }, d.supplier && { href: `/suppliers/${d.supplier.id}`, l: d.supplier.companyName }].filter(Boolean) as { href: string; l: string }[]
                  return (
                    <Tr key={d.id}>
                      <Td className="max-w-[300px]">
                        <a href={`/api/documents/${d.id}`} className="flex items-center gap-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-beige text-ink/60"><I className="size-4" /></span>
                          <span className="truncate font-medium hover:text-coral-dark">{d.name}</span>
                        </a>
                      </Td>
                      <Td><OptBadge options={DOCUMENT_CATEGORY} value={d.category} dot={false} /></Td>
                      <Td className="max-w-[240px]">{links.length ? links.map((x) => <Link key={x.href} href={x.href} className="block truncate text-xs text-muted hover:text-coral-dark">{x.l}</Link>) : <span className="text-muted">—</span>}</Td>
                      <Td>
                        <span className="tabular">v{d.version}</span>
                        {d.previous && <span className="block text-[11px] text-muted"><a className="hover:text-coral-dark" href={`/api/documents/${d.previous.id}`}>v{d.previous.version}</a>{d.previous.previous && <> · <a className="hover:text-coral-dark" href={`/api/documents/${d.previous.previous.id}`}>v{d.previous.previous.version}</a></>}</span>}
                      </Td>
                      <Td className="tabular text-muted">{size(d.size)}</Td>
                      <Td className="whitespace-nowrap text-muted">{formatDate(d.createdAt)}<span className="block text-xs">{d.uploadedBy?.name}</span></Td>
                      <Td>{d.visibleToClient ? <Badge tone="green">Shared</Badge> : <span className="text-xs text-muted">Internal</span>}</Td>
                      <Td>
                        <div className="flex justify-end">
                          <PreviewButton id={d.id} name={d.name} mime={d.mimeType} />
                          <a href={`/api/documents/${d.id}`} className="rounded p-1.5 text-muted hover:bg-lightgray hover:text-ink" title="Download"><Download className="size-3.5" /></a>
                          {canWrite && <UploadSheet options={options} previous={{ id: d.id, name: d.name }} trigger="icon" />}
                          <DocActions id={d.id} visible={d.visibleToClient} canWrite={canWrite} canDelete={ctx.can('documents', 'delete')} />
                        </div>
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
            <Pagination path="/documents" params={params} page={page} pageSize={25} total={total} />
          </>
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">Files are stored outside the public folder and served only through a permission-checked endpoint. <Link className="underline" href={hrefWith('/documents', {}, { shared: 'true' })}>Show what clients can see</Link>.</p>
    </>
  )
}
