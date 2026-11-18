'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCtx } from '@/lib/auth/context'
import { SESSION_COOKIE } from '@/lib/auth/session'

export async function setLocale(locale: string) {
  if (!['en', 'fr'].includes(locale)) return
  const jar = await cookies()
  jar.set('emos_locale', locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  const ctx = await getCtx()
  if (ctx) await prisma.user.update({ where: { id: ctx.user.id }, data: { locale } })
  revalidatePath('/', 'layout')
}

export async function setSidebarCollapsed(collapsed: boolean) {
  const jar = await cookies()
  jar.set('emos_sidebar', collapsed ? '1' : '0', { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
}

export async function markNotificationRead(id: string) {
  const ctx = await getCtx()
  if (!ctx) return
  await prisma.notification.updateMany({ where: { id, userId: ctx.user.id }, data: { readAt: new Date() } })
  revalidatePath('/', 'layout')
}

export async function markAllNotificationsRead() {
  const ctx = await getCtx()
  if (!ctx) return
  await prisma.notification.updateMany({ where: { userId: ctx.user.id, readAt: null }, data: { readAt: new Date() } })
  revalidatePath('/', 'layout')
}

export async function signOut() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  redirect('/login')
}
