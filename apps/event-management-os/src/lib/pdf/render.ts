import 'server-only'
import { renderToBuffer } from '@react-pdf/renderer'
import type { ReactElement } from 'react'

export async function pdfResponse(doc: ReactElement, filename: string, inline = false) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buf = await renderToBuffer(doc as any)
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename.replace(/[^a-z0-9._-]+/gi, '_')}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
