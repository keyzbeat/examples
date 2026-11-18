import { getCtx } from '@/lib/auth/context'
import { prisma } from '@/lib/prisma'
import { getFile } from '@/lib/storage'

/** Permission-checked file download / inline preview. Portal clients only get documents shared with them. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getCtx()
  if (!ctx) return new Response('Unauthorized', { status: 401 })
  const base = { id, organizationId: ctx.org.id, deletedAt: null }
  const where = ctx.user.clientId
    ? { ...base, visibleToClient: true, OR: [{ clientId: ctx.user.clientId }, { project: { clientId: ctx.user.clientId } }] }
    : ctx.can('documents')
      ? base
      : null
  if (!where) return new Response('Forbidden', { status: 403 })
  const doc = await prisma.document.findFirst({ where })
  if (!doc) return new Response('Not found', { status: 404 })
  const data = await getFile(doc.storageKey).catch(() => null)
  if (!data) return new Response('File missing', { status: 410 })
  const inline = new URL(req.url).searchParams.has('inline')
  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': doc.mimeType,
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(doc.name)}"`,
      // PDFs need the browser viewer; everything else (notably SVG) is rendered sandboxed and script-free.
      ...(doc.mimeType === 'application/pdf' ? {} : { 'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox" }),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=300',
    },
  })
}
