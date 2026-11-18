'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Download, Eye, EyeOff, History, Trash2, Upload } from 'lucide-react'
import { archiveDocument, toggleClientVisibility, uploadDocuments } from '@/app/actions/documents'
import type { FormState } from '@/app/actions/resources'
import type { RelationOptions } from '@/lib/resources/fields'
import { DOCUMENT_CATEGORY } from '@/lib/options'
import { Button } from '@/components/ui/button'
import { FieldShell, Select } from '@/components/ui/inputs'
import { Sheet } from '@/components/ui/sheet'
import { Combobox } from '@/components/resource/resource-form'

export function UploadSheet({ options, defaults, previous, trigger }: { options: RelationOptions; defaults?: Record<string, string | undefined>; previous?: { id: string; name: string }; trigger?: 'icon' }) {
  const [open, setOpen] = React.useState(false)
  const [state, formAction, pending] = React.useActionState(uploadDocuments, { ok: false } as FormState)
  const router = useRouter()
  const handled = React.useRef(state)
  React.useEffect(() => {
    if (state === handled.current) return
    handled.current = state
    if (state.ok) { toast.success(state.message); setOpen(false); router.refresh() } else if (state.message) toast.error(state.message)
  }, [state, router])
  return (
    <>
      {trigger === 'icon' ? (
        <button onClick={() => setOpen(true)} className="rounded p-1.5 text-muted hover:bg-lightgray hover:text-ink" title="Upload new version"><History className="size-3.5" /></button>
      ) : (
        <Button variant="primary" onClick={() => setOpen(true)}><Upload /> Upload</Button>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title={previous ? `New version of ${previous.name}` : 'Upload documents'} description="Max 10 MB per file · PDF, images, Office, CSV, ZIP. Stored privately.">
        <form action={formAction} className="space-y-4">
          {previous && <input type="hidden" name="previousId" value={previous.id} />}
          <FieldShell label="Files" required>
            <input name="files" type="file" multiple={!previous} required className="block w-full rounded-lg border border-dashed border-line-strong bg-offwhite p-4 text-sm file:mr-3 file:rounded-lg file:border file:border-line file:bg-white file:px-3 file:py-1.5" />
          </FieldShell>
          {!previous && (
            <>
              <FieldShell label="Category">
                <Select name="category" defaultValue={defaults?.category ?? 'OTHER'}>{DOCUMENT_CATEGORY.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select>
              </FieldShell>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FieldShell label="Client"><Combobox name="clientId" options={options.client ?? []} defaultValue={defaults?.clientId} /></FieldShell>
                <FieldShell label="Project"><Combobox name="projectId" options={options.project ?? []} defaultValue={defaults?.projectId} /></FieldShell>
                <FieldShell label="Event"><Combobox name="eventId" options={options.event ?? []} defaultValue={defaults?.eventId} /></FieldShell>
                <FieldShell label="Supplier"><Combobox name="supplierId" options={(options.supplier ?? []).map((o) => ({ ...o, disabled: false }))} defaultValue={defaults?.supplierId} /></FieldShell>
                <FieldShell label="Partner"><Combobox name="partnerId" options={options.partner ?? []} defaultValue={defaults?.partnerId} /></FieldShell>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visibleToClient" className="size-4 accent-[#F07F73]" /> Share with the client in the portal</label>
            </>
          )}
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={pending}>Upload</Button>
          </div>
        </form>
      </Sheet>
    </>
  )
}

export function PreviewButton({ id, name, mime }: { id: string; name: string; mime: string }) {
  const [open, setOpen] = React.useState(false)
  const previewable = mime.startsWith('image/') || mime === 'application/pdf' || mime.startsWith('text/')
  if (!previewable) return null
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded p-1.5 text-muted hover:bg-lightgray hover:text-ink" title="Preview"><Eye className="size-3.5" /></button>
      <Sheet open={open} onClose={() => setOpen(false)} title={name} width="max-w-3xl" footer={<div className="flex justify-end"><a href={`/api/documents/${id}`} className="inline-flex items-center gap-1.5 text-sm text-coral-dark hover:underline"><Download className="size-4" /> Download</a></div>}>
        {mime.startsWith('image/') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/documents/${id}?inline=1`} alt={name} className="mx-auto max-h-[75vh] rounded-lg border border-line" />
        ) : (
          <iframe src={`/api/documents/${id}?inline=1`} title={name} className="h-[75vh] w-full rounded-lg border border-line bg-white" />
        )}
      </Sheet>
    </>
  )
}

export function DocActions({ id, visible, canWrite, canDelete }: { id: string; visible: boolean; canWrite: boolean; canDelete: boolean }) {
  const [, start] = React.useTransition()
  const router = useRouter()
  const run = (fn: () => Promise<FormState>) => start(async () => { const r = await fn(); r.ok ? toast.success(r.message) : toast.error(r.message); router.refresh() })
  return (
    <>
      {canWrite && <button onClick={() => run(() => toggleClientVisibility(id))} className="rounded p-1.5 text-muted hover:bg-lightgray hover:text-ink" title={visible ? 'Hide from client' : 'Share with client'}>{visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5 text-coral" />}</button>}
      {canDelete && <button onClick={() => window.confirm('Archive this document?') && run(() => archiveDocument(id))} className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-red-600" title="Archive"><Trash2 className="size-3.5" /></button>}
    </>
  )
}
