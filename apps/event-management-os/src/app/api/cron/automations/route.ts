import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runScheduledAutomations } from '@/lib/automations'

/**
 * Scheduled automations for every organization.
 * Call with `Authorization: Bearer $CRON_SECRET` (e.g. Vercel Cron every 15 minutes).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgs = await prisma.organization.findMany({ select: { id: true } })
  const results: Record<string, unknown> = {}
  for (const o of orgs) results[o.id] = await runScheduledAutomations(o.id)
  return NextResponse.json({ ok: true, results })
}
