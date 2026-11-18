'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { ForbiddenError, requireAction } from '@/lib/auth/context'
import { logActivity } from '@/lib/activity'
import { ALLOWED_MIME, MAX_UPLOAD, putFile } from '@/lib/storage'
import { DOCUMENT_CATEGORY } from '@/lib/options'
import type { FormState } from './resources'

const LINKS = ['clientId', 'projectId', 'eventId', 'supplierId', 'partnerId'] as const
const LINK_MODEL = { clientId: 'client', projectId: 'project', eventId: 'event', supplierId: 'supplier', partnerId: 'partner' } as const

/** Uploads one or several files (or a new version of an existing document). */
export async function uploadDocuments(_prev: FormState, form: FormData): Promise<FormState> {
  try {
    const ctx = await requireAction('documents', 'write')
    const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0)
    if (!files.length) return { ok: false, message: 'Choose at least one file.' }
    const category = String(form.get('category') || 'OTHER')
    if (!DOCUMENT_CATEGORY.some((c) => c.value === category)) return { ok: false, message: 'Invalid category.' }
    const previousId = String(form.get('previousId') || '') || null
    const links: Record<string, string | null> = {}
    for (const k of LINKS) {
      const v = String(form.get(k) || '') || null
      if (v) {
        const found = await (prisma as unknown as Record<string, { findFirst: (a: unknown) => Promise<unknown> }>)[LINK_MODEL[k]]!.findFirst({ where: { id: v, organizationId: ctx.org.id } })
        if (!found) throw new ForbiddenError('Linked record not found.')
      }
      links[k] = v
    }
    let previous = null
    if (previousId) {
      previous = await prisma.document.findFirst({ where: { id: previousId, organizationId: ctx.org.id, deletedAt: null }, include: { next: true } })
      if (!previous) throw new ForbiddenError('Document not found.')
      if (previous.next) return { ok: false, message: 'A newer version already exists.' }
      if (files.length > 1) return { ok: false, message: 'Upload a single file for a new version.' }
    }
    for (const file of files) {
      if (file.size > MAX_UPLOAD) return { ok: false, message: `${file.name} is larger than 10 MB.` }
      if (!ALLOWED_MIME.test(file.type)) return { ok: false, message: `${file.name}: file type not allowed.` }
    }
    for (const file of files) {
      const key = await putFile(ctx.org.id, file.name, Buffer.from(await file.arrayBuffer()))
      const doc = await prisma.document.create({
        data: {
          organizationId: ctx.org.id,
          name: previous ? previous.name : file.name,
          category: previous ? previous.category : category,
          mimeType: file.type,
          size: file.size,
          storageKey: key,
          version: previous ? previous.version + 1 : 1,
          previousId: previous?.id ?? null,
          visibleToClient: previous ? previous.visibleToClient : form.get('visibleToClient') === 'on',
          uploadedById: ctx.user.id,
          ...(previous ? { clientId: previous.clientId, projectId: previous.projectId, eventId: previous.eventId, supplierId: previous.supplierId, partnerId: previous.partnerId } : links),
        },
      })
      await logActivity({ organizationId: ctx.org.id, userId: ctx.user.id, action: 'created', entityType: 'documents', entityId: doc.id, summary: previous ? `New version v${doc.version} of ${doc.name}` : `Uploaded ${doc.name}`, link: '/documents' })
    }
    revalidatePath('/', 'layout')
    return { ok: true, message: previous ? 'New version uploaded.' : `${files.length} file${files.length > 1 ? 's' : ''} uploaded.` }
  } catch (e) {
    return { ok: false, message: e instanceof ForbiddenError ? e.message : 'Upload failed.' }
  }
}

export async function toggleClientVisibility(id: string): Promise<FormState> {
  try {
    const ctx = await requireAction('documents', 'write')
    const d = await prisma.document.findFirst({ where: { id, organizationId: ctx.org.id } })
    if (!d) throw new ForbiddenError('Not found.')
    await prisma.document.update({ where: { id }, data: { visibleToClient: !d.visibleToClient } })
    revalidatePath('/documents')
    return { ok: true, message: d.visibleToClient ? 'Hidden from client portal.' : 'Shared in client portal.' }
  } catch (e) {
    return { ok: false, message: e instanceof ForbiddenError ? e.message : 'Failed.' }
  }
}

export async function archiveDocument(id: string): Promise<FormState> {
  try {
    const ctx = await requireAction('documents', 'delete')
    const d = await prisma.document.findFirst({ where: { id, organizationId: ctx.org.id } })
    if (!d) throw new ForbiddenError('Not found.')
    await prisma.document.update({ where: { id }, data: { deletedAt: new Date() } })
    await logActivity({ organizationId: ctx.org.id, userId: ctx.user.id, action: 'deleted', entityType: 'documents', entityId: id, summary: `Archived document ${d.name}` })
    revalidatePath('/documents')
    return { ok: true, message: 'Document archived.' }
  } catch (e) {
    return { ok: false, message: e instanceof ForbiddenError ? e.message : 'Failed.' }
  }
}
