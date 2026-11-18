import { NextResponse } from 'next/server'
import { getCtx } from '@/lib/auth/context'
import { globalSearch } from '@/lib/search/global'

export async function GET(req: Request) {
  const ctx = await getCtx()
  if (!ctx || ctx.user.clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const q = new URL(req.url).searchParams.get('q') ?? ''
  const results = await globalSearch(ctx, q)
  return NextResponse.json({ results })
}
